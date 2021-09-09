import nodemailer from "nodemailer"

export const transporter = nodemailer.createTransport({
    host: "cassiopeia.uberspace.de",
    auth: {
        user: "admin@trentapp.com",
        pass: process.env.ADMIN_EMAIL_PASSWORD
    }
});

// const options = {
//     from: "support@trentapp.com",
//     to: "simon.skade@trentapp.com",
//     subject: "test email nodemailer",
//     text: "blublublublublublublublublub"
// };

export const callbackSendMail = (err, info) => {
    if (err) {
        console.log("Failed to send email: ", err);
        return;
    }
    console.log("Sent email: ", info);
}

// transporter.sendMail(options, callbackSendMail)




