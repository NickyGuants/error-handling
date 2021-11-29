const nodemailer = require('nodemailer');
require('dotenv').config()

const transport = nodemailer.createTransport(
    {
        service: 'gmail',
        secure: false,
       
      auth: {
        user: 'gnmutembei99@gmail.com',
        pass: process.env.EMAIL_PASSWORD
      },
    }

)
const sendEmail = async (message) => {
    return new Promise((resolve, reject) => {
        transport.sendMail(message, (err, info) => {
            if (err) {
                 return reject(err)
            }
            console.log(info.response)
            resolve(info.response);
         })
    })
}
module.exports = sendEmail;