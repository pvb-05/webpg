const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

router.post("/send-mail", async (req, res) => {

    const { name, email, message } = req.body;

    try {
console.log("EMAIL =", process.env.EMAIL);
console.log("PASSWORD =", process.env.PASSWORD);
        const transporter = nodemailer.createTransport({

            service: "gmail",

            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD
            }
        });

        await transporter.sendMail({

            from: email,

            to: process.env.EMAIL,

            subject: "Liên hệ từ website",

            html: `
                <h2>Thông tin liên hệ</h2>

                <p><b>Tên:</b> ${name}</p>

                <p><b>Email:</b> ${email}</p>

                <p><b>Nội dung:</b> ${message}</p>
            `
        });

        res.json({
            success: true,
            message: "Gửi thành công!"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Gửi thất bại!"
        });
    }
});

module.exports = router;