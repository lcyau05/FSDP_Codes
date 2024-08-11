require('dotenv').config();
const nodemailer = require('nodemailer');

// Configure your email transport
const transporter = nodemailer.createTransport({
    service: "Gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});

// Function to send email
async function sendEmail({ to, subject, body, isHtml = false, attachments = [] }) {
    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM, // Sender address
            to, // List of receivers
            subject, // Subject line
            //html: body, // Plain text body
            [isHtml ? 'html' : 'text']: body, // Choose 'text' or 'html' based on isHtml flag
            // html: '<b>Hello world?</b>' // HTML body (optional)
            attachments // Attachments array
        });

        console.log('Message sent: %s', info.messageId);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

module.exports = {
    sendEmail
};