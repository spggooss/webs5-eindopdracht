import sgMail from '@sendgrid/mail';
import amqp, {ChannelWrapper} from 'amqp-connection-manager';
import {MailDataRequired} from "@sendgrid/mail/src/mail";
import * as dotenv from 'dotenv';
import {rejects} from "node:assert";
import {ConfirmChannel, ConsumeMessage} from "amqplib";

dotenv.config();


if (!process.env.SENDGRID_API_KEY) {
    console.error('No SendGrid API key found');
    process.exit(1);
}


if (!process.env.FROM_MAIL) {
    console.error('No from mail found');
    process.exit(1);
}

if (!process.env.RABBITMQ_URL) {
    console.error('No RabbitMQ URL found');
    process.exit(1);
}

// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const fromMail: string = process.env.FROM_MAIL;

const exchange: string = 'emailQueue';
const rabbitMQUrl: string = process.env.RABBITMQ_URL;

const topicKeys: string[] = ['contest.end', 'user.registration'];


interface Score {
    name: string;
    score: number;
}

interface AllScoresMessage {
    scores: IndividualScoresMessage[];
    email: string;
}

interface IndividualScoresMessage {
    score: Score;
    name: string;
    email: string;
}

interface RegistrationMessage {
    email: string;
    password: string;
    contestId: string;
}

function generateScoresTable(scores: IndividualScoresMessage[]): string {
    let tableHTML: string = '<table border="1">';
    // Header row
    tableHTML += '<tr><th>Name</th><th>Score</th></tr>';

    // Loop through each score object
    scores.forEach((item: any) => {
        tableHTML += '<tr>';
        tableHTML += '<td>' + item.name + '</td>';
        tableHTML += '<td>' + item.score + '</td>';
        tableHTML += '</tr>';
    });

    tableHTML += '</table>';
    return tableHTML;
}

let channel: ChannelWrapper, connection;  //global variables
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

        topicKeys.forEach(function (key) {
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


const onMessage = (msg: ConsumeMessage) => {
    if (msg === null) {
        return;
    }

    const queueMessage: RegistrationMessage | AllScoresMessage = JSON.parse(msg.content.toString());
    let emailMsgs: MailDataRequired[] = [];
    switch (msg.fields.routingKey) {
        case 'contest.end':
            const allScoresMessage = queueMessage as AllScoresMessage;

            const contestEndHtml = `<h1>Contest has ended</h1><br><p>These are the scores:</p>`;
            emailMsgs.push({
                to: allScoresMessage.email,
                from: fromMail,
                subject: 'Total scores of the contest',
                html: `${contestEndHtml}${generateScoresTable(allScoresMessage.scores)}`
            });

            allScoresMessage.scores.forEach((item: IndividualScoresMessage) => {
                const individualHtml = `<h1>Your score</h1><br><p>Hi ${item.name}, your score is: ${item.score}</p>`;
                emailMsgs.push({
                    to: item.email,
                    from: fromMail,
                    subject: 'Competition Ended',
                    html: individualHtml
                });
            });
            break;

        case 'user.registration':
            const registrationMessage = queueMessage as RegistrationMessage;
            const registrationHtml = `<h1>Registration successful</h1><br><br><p>Password: ${registrationMessage.password}</p>`;
            emailMsgs.push({
                to: registrationMessage.email,
                from: fromMail,
                subject: 'Registration successful',
                html: registrationHtml
            });
            break;
    }

    if (emailMsgs.length > 0 && process.env.SEND_EMAILS === 'true') {
        // Send all emails
        Promise.all(emailMsgs.map(emailMsg => sgMail.send(emailMsg)))
            .then(() => console.log('Emails sent'))
            .catch(error => console.error(error));
    } else if (emailMsgs.length > 0 && process.env.SEND_EMAILS === 'false') {
        console.error('Emails not sent because it is disabled in the environment variable SEND_EMAILS');
        console.error(emailMsgs);
    } else {
        console.error('No emails to send');
    }
}

connectQueue().then(r => console.log('connected to queue')).catch(e => console.log(e));



