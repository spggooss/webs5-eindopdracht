import amqp, {ChannelWrapper} from 'amqp-connection-manager';
import * as dotenv from 'dotenv';
import {rejects} from "node:assert";
import {ConfirmChannel, ConsumeMessage} from "amqplib";
import connectToDatabase from "./database/mongooseConnection";
import ClockTarget from "./models/clockTarget";
import {DateTime} from "luxon";
dotenv.config();

connectToDatabase();

interface StartContestMessage {
   targetId: number;
   date: string;
}

enum ContestStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    ENDED = 'ended'
}

interface ContestTask{
    targetId: number;
    date: Date;
    status: ContestStatus;
}

const rabbitMQUrl = process.env.RABBITMQ_URL;

if (rabbitMQUrl === undefined) {
    throw new Error('RABBITMQ_URL is not set');
}

const runningContests = new Map<number, ContestTask>();
const timerExchange = 'timerQueue';
const contestEndedExchange = 'contestEndedQueue';
const outputTopicKey = 'contest.end';

let timerChannel: ChannelWrapper, contestEndedChannel: ChannelWrapper, connection;  //global variables

const inputTopicKeys: string[] = ['target.new'];


async function connectQueue() {
    try {
        connection = amqp.connect(rabbitMQUrl, {heartbeatIntervalInSeconds: 5});
        timerChannel = connection.createChannel({
            setup: async function (channel: ConfirmChannel) {
                // `channel` here is a regular amqplib `ConfirmChannel`.
                // Note that `this` here is the channelWrapper instance.
                return channel.assertQueue(timerExchange, {durable: true});
            },
        })

        contestEndedChannel = connection.createChannel({
            setup: async function (channel: ConfirmChannel) {
                // `channel` here is a regular amqplib `ConfirmChannel`.
                // Note that `this` here is the channelWrapper instance.
                return channel.assertQueue(contestEndedExchange, {durable: true});
            },
        })

        console.log('Connected to RabbitMQ');

        inputTopicKeys.forEach(function (key) {
            timerChannel.addSetup(function (channel: ConfirmChannel) {
                channel.bindQueue(timerExchange, timerExchange, key);
            });
        });

        await timerChannel.consume(timerExchange, onMessage, {
            noAck: true
        });

    } catch (error: any) {
        await rejects(error);
    }
}

const onMessage = async (msg: ConsumeMessage) => {
    console.log('Received message');
    if (msg === null) {
        return;
    }
    console.log(`Received message: ${msg.content.toString()}`);
    const queueMessage: StartContestMessage = JSON.parse(msg.content.toString());
    switch (msg.fields.routingKey) {
        case 'target.new':
            const endTime = DateTime.fromISO(queueMessage.date).toJSDate();
            let contest: ContestTask = {
                targetId: queueMessage.targetId,
                date: endTime,
                status: ContestStatus.INACTIVE
            }

            await ClockTarget.create(contest).then(() => {
                runningContests.set(contest.targetId, contest);
               startContest(contest.targetId)
            });
            break;
    }

}

function scheduleTask(startTime: Date, task: () => void) {
    const currentTime = new Date().getTime(); // Current time in milliseconds
    const scheduledTime = startTime.getTime() // Scheduled time today
    const delay = scheduledTime - currentTime; // Delay until scheduled time
    console.log(`Current time: ${delay}`);
    if (delay > 0) {
        setTimeout(task, delay); // Execute task after delay
    }
}

const startContest = (targetId: number) => {
    let contest = runningContests.get(targetId);
    if (contest === undefined) {
        console.log(`Contest ${targetId} not found`);
        return;
    }
    contest.status = ContestStatus.ACTIVE;
    ClockTarget.findOneAndUpdate({targetId: targetId}, {status: contest.status}).then(() => {
        if (contest) {
            runningContests.set(targetId, contest);
            scheduleTask(contest.date, () => endContest(targetId));
        }
    });


}

const endContest = async (targetId: number) => {
    let contest = runningContests.get(targetId);
    if (contest === undefined) {
        console.log(`Contest ${targetId} not found`);
        return;
    }
    contest.status = ContestStatus.ENDED;
    console.log(contest)
    ClockTarget.findOneAndUpdate({targetId: targetId}, {status: contest.status}).then(async () => {
        console.log(`Contest ${targetId} has ended`);
        runningContests.delete(targetId);
        await contestEndedChannel.publish(contestEndedExchange, outputTopicKey, Buffer.from(JSON.stringify({targetId: targetId})));
    });
}
connectQueue().then(r => console.log('connected to queue')).catch(e => console.log(e));

async function startup(){
    const currentTime = new Date();
    await ClockTarget.find({date: {$gte: currentTime}, status: { $in: [ContestStatus.ACTIVE, ContestStatus.INACTIVE]}}).then((contests) => {
        contests.forEach(async (contest) => {
            let contestTask: ContestTask = {
                targetId: contest.targetId,
                date: contest.date,
                status: ContestStatus.ACTIVE
            }
            await ClockTarget.findOneAndUpdate({targetId: contest.targetId}, {status: contestTask.status});
            runningContests.set(contestTask.targetId, contestTask);
            startContest(contest.targetId)
        });
    });

    ClockTarget.findOneAndUpdate({date: {$lt: currentTime}, status: {$ne: ContestStatus.ENDED}}, {status: ContestStatus.ENDED}).then(async (contest) => {
        if(contest) {
            console.log(`Contest ${contest.targetId} has ended in the past`);
            await contestEndedChannel.publish(contestEndedExchange, outputTopicKey, Buffer.from(JSON.stringify({targetId: contest.targetId})));
        }
    });
}

startup().then(() => console.log('Startup complete')).catch(e => console.log(e));

