const nodemailer = require("nodemailer");
require('dotenv').config()
/*
let transporter = nodemailer.createTransport({
    host: process.env.MAILHOST,
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.MAIL, // generated ethereal user
        pass: process.env.PASSMAIL, // generated ethereal password
    },
});
*/

const transporter = nodemailer.createTransport({
  host: 'email-smtp.us-east-2.amazonaws.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SES_USER,
    pass: process.env.SES_PASSWORD
  }
});
// send mail with defined transport object
//let info = await transporter.sendMail(message);

module.exports = transporter;