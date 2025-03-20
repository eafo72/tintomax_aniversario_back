const nodemailer = require("nodemailer");
require('dotenv').config()

let transporter = nodemailer.createTransport({
    host: process.env.MAILHOST,
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.MAIL, // generated ethereal user
        pass: process.env.PASSMAIL, // generated ethereal password
    },
});

// send mail with defined transport object
//let info = await transporter.sendMail(message);

module.exports = transporter;