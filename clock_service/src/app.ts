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
   contestId: number;
   startDate: Date;
   endDate: Date;
}

enum ContestStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    ENDED = 'ended'
}

interface ContestTask{
    contestId: number;
    startDate: Date;
    endDate: Date;
    status: ContestStatus;
}

const rabbitMQUrl = process.env.RABBITMQ_URL;

if (rabbitMQUrl === undefined) {
    throw new Error('RABBITMQ_URL is not set');
}

const runningContests = new Map<number, ContestTask>();
const exchange = 'contestQueue';
const outputTopicKey = 'contest.end';

let channel: ChannelWrapper, connection;  //global variables

const inputTopicKeys: string[] = ['contest.start'];


async function connectQueue() {
    try {
        connection = amqp.connect(rabbitMQUrl, {heartbeatIntervalInSeconds: 5});
        channel = connection.createChannel({
            setup: function (channel: ConfirmChannel) {
                // `channel` here is a regular amqplib `ConfirmChannel`.
                // Note that `this` here is the channelWrapper instance.
                return channel.assertQueue(exchange, {durable: true});
            },
        })

        console.log('Connected to RabbitMQ');

        inputTopicKeys.forEach(function (key) {
            channel.addSetup(function (channel: ConfirmChannel) {
                channel.bindQueue(exchange, exchange, key);
            });
        });

        await channel.consume(exchange, onMessage, {
            noAck: true
        });

    } catch (error: any) {
        await rejects(error);
    }
}

const onMessage = async (msg: ConsumeMessage) => {
    if (msg === null) {
        return;
    }

    const queueMessage: StartContestMessage = JSON.parse(msg.content.toString());
    switch (msg.fields.routingKey) {
        case 'contest.start':
            let contest: ContestTask = {
                contestId: queueMessage.contestId,
                startDate: queueMessage.startDate,
                endDate: queueMessage.endDate,
                status: ContestStatus.INACTIVE
            }

            await ClockTarget.create(contest).then(() => {
                runningContests.set(contest.contestId, contest);
               startContest(contest.contestId)
            });
            break;
    }

}

function scheduleTask(startTime: Date, task: () => void) {
    const currentTime = new Date().getTime(); // Current time in milliseconds
    const scheduledTime = startTime.getTime() // Scheduled time today
    const delay = scheduledTime - currentTime; // Delay until scheduled time
    if (delay > 0) {
        setTimeout(task, delay); // Execute task after delay
    }
}

const startContest = (contestId: number) => {
    let contest = runningContests.get(contestId);
    if (contest === undefined) {
        console.log(`Contest ${contestId} not found`);
        return;
    }
    contest.status = ContestStatus.ACTIVE;
    ClockTarget.findOneAndUpdate({contestId: contestId}, {status: contest.status}).then(() => {
        if (contest) {
            runningContests.set(contestId, contest);
            scheduleTask(contest.endDate, () => endContest(contestId));
        }
    });


}

const endContest = async (contestId: number) => {
    let contest = runningContests.get(contestId);
    if (contest === undefined) {
        console.log(`Contest ${contestId} not found`);
        return;
    }
    contest.status = ContestStatus.ENDED;
    await ClockTarget.findOneAndUpdate({contestId: contestId}, {status: contest.status}).then(async () => {
        console.log(`Contest ${contestId} has ended`);
        runningContests.delete(contestId);
        await channel.publish(exchange, outputTopicKey, Buffer.from(JSON.stringify({contestId: contestId})));
    });
}
connectQueue().then(r => console.log('connected to queue')).catch(e => console.log(e));

async function startup(){
    const currentDate = DateTime.now();
    await ClockTarget.find({startDate: {$gte: currentDate.startOf('day'), $lte: currentDate.endOf('day')}}).then((contests) => {
        contests.forEach((contest) => {
            let contestTask: ContestTask = {
                contestId: contest.contestId,
                startDate: contest.startDate,
                endDate: contest.endDate,
                status:ContestStatus.ACTIVE
            }
            runningContests.set(contestTask.contestId, contestTask);
            startContest(contest.contestId)
        });
    });
}

startup().then(() => console.log('Startup complete')).catch(e => console.log(e));

