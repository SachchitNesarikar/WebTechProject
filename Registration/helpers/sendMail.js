require("dotenv").config(); // ✅ Load environment variables at the start
const nodemailer = require("nodemailer");

const sendMail = async (email, mailSubject, content) => {
    try {
        if (!process.env.SMTP_MAIL || !process.env.SMTP_PASSWORD) {
            throw new Error("SMTP credentials are missing. Check your .env file.");
        }

        console.log("📩 Sending email to:", email);
        
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false, // TLS recommended
            auth: {
                user: process.env.SMTP_MAIL,
                pass: process.env.SMTP_PASSWORD,
            },
        });

        const mailOptions = {
            from: `"No Reply" <${process.env.SMTP_MAIL}>`,
            to: email,
            subject: mailSubject,
            html: content,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Mail sent successfully:", info.response);

        return { success: true, message: "Email sent successfully", response: info.response };
    } catch (error) {
        console.error("❌ Error sending email:", error.message);
        return { success: false, message: error.message };
    }
};

module.exports = sendMail;
