import * as sgMail from '@sendgrid/mail';
import * as amqp from "amqplib";
import {MailDataRequired} from "@sendgrid/mail/src/mail";
import {Message} from "amqplib";

// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const fromMail: string = process.env.FROM_MAIL;

const exchange: string = 'contestQueue';
const rabbitMQUrl: string = process.env.RABBITMQ_URL;

const topicKeys: string[] = ['contest.end', 'contest.registration'];


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




amqp.connect(rabbitMQUrl, async function (error0: any, connection: any) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function (error1: any, channel: any) {
        if (error1) {
            throw error1;
        }

        channel.assertExchange(exchange, 'topic', {
            durable: false
        });

        channel.assertQueue('', {
            exclusive: true
        }, function (error2: any, q: any) {
            if (error2) {
                throw error2;
            }
            topicKeys.forEach(function (key) {
                channel.bindQueue(q.queue, exchange, key);
            });

            channel.consume(q.queue, function (msg: Message) {
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

                    case 'contest.registration':
                        const registrationMessage = queueMessage as RegistrationMessage;
                        const registrationHtml = `<h1>Registration successful</h1><br><p>Contest ID: ${registrationMessage.contestId}</p>`;
                        emailMsgs.push({
                            to: registrationMessage.email,
                            from: fromMail,
                            subject: 'Registration successful',
                            html: registrationHtml
                        });
                        break;
                }

                if (emailMsgs.length > 0) {
                    // Send all emails
                    Promise.all(emailMsgs.map(emailMsg => sgMail.send(emailMsg)))
                        .then(() => console.log('Emails sent'))
                        .catch(error => console.error(error));
                }
            }, {
                noAck: true
            });
        });
    });
}).then(r => {
    console.log('Connected to RabbitMQ')
}).catch(e => {
        console.error(e);
    }
);


