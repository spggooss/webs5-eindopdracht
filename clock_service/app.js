import express from 'express';
import http from 'http';
import amqp from 'amqplib';
import bodyParser from 'body-parser';
process.env.APIGATEWAYPORT;


const app = express();
const expressServer = http.createServer(app);

app.use(bodyParser.json());

// Maak een RabbitMQ-verbinding
const rabbitMQUrl = 'amqp://localhost'; // Pas aan indien nodig
const startedContests = new Map();
let rabbitMQChannel = null;
const exchange = 'contestQueue';
const keys = ['contest.end', 'contest.registration', 'contest.scores.individual', 'contest.scores.all'];



await amqp.connect('amqp://localhost', function(error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function(error1, channel) {
        if (error1) {
            throw error1;
        }

        channel.assertExchange(exchange, 'topic', {
            durable: false
        });

        channel.assertQueue('', {
            exclusive: true
        }, function(error2, q) {
            if (error2) {
                throw error2;
            }
            console.log(' [*] Waiting for logs. To exit press CTRL+C');

            keys.forEach(function(key) {
                channel.bindQueue(q.queue, exchange, key);
            });

            channel.consume(q.queue, function(msg) {
                console.log(" [x] %s:'%s'", msg.fields.routingKey, msg.content.toString());
            }, {
                noAck: true
            });
        });
    });
});

app.post('/startContest', (req, res) => {
    const { contestId } = req.body;
    startedContests.set(contestId, Date.now());
    res.status(200).send('Wedstrijd gestart.');
});



expressServer.listen(4000, () => {
    console.log('Server luistert op poort 4000.');
});