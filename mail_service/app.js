const sgMail = require('@sendgrid/mail')
const amqp = require("amqplib");
sgMail.setApiKey(process.env.SENDGRID_API_KEY)
const fromMail = process.env.FROM_MAIL
const msg = {
    to: 'test@example.com', // Change to your recipient
    from: fromMail, // Change to your verified sender
    subject: 'Sending with SendGrid is Fun',
    text: 'and easy to do anywhere, even with Node.js',
    html: '<strong>and easy to do anywhere, even with Node.js</strong>',
}



async function setupRabbitMQ() {
    const connection = await amqp.connect(rabbitMQUrl);
    rabbitMQChannel = await connection.createChannel();

    // Declareer een wachtrij voor wedstrijdberichten
    await rabbitMQChannel.assertExchange(exchange, 'topic', {
        durable: false
    });

}

sgMail
    .send(msg)
    .then(() => {
        console.log('Email sent')
    })
    .catch((error) => {
        console.error(error)
    })