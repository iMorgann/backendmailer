require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/send_email', async (req, res) => {
    const {
        smtp_server,
        smtp_port,
        smtp_username,
        smtp_password,
        from_email,
        from_name,
        recipients, // List of recipients
        subject,
        body,
        body_type,
        reply_to,
        priority,
        interval, // Time interval in seconds
    } = req.body;

    if (!recipients || !recipients.trim()) {
        return res.status(400).json({ success: false, error: 'No recipients defined' });
    }

    const secure = smtp_port === 465;
    const transporter = nodemailer.createTransport({
        host: smtp_server,
        port: parseInt(smtp_port, 10),
        secure,
        auth: {
            user: smtp_username,
            pass: smtp_password,
        },
    });

    const recipientList = recipients.split(',').map((email) => email.trim()).filter((email) => email);
    if (recipientList.length === 0) {
        return res.status(400).json({ success: false, error: 'Recipient list is empty after processing.' });
    }

    const results = [];
    for (let i = 0; i < recipientList.length; i++) {
        const recipient = recipientList[i];
        const mailOptions = {
            from: `"${from_name}" <${from_email}>`,
            to: recipient,
            subject,
            [body_type]: body,
            replyTo: reply_to,
            headers: {
                'X-Priority': priority,
            },
        };

        try {
            const info = await transporter.sendMail(mailOptions);
            results.push({ index: i + 1, total: recipientList.length, recipient, status: 'OK', messageId: info.messageId });
        } catch (error) {
            results.push({ index: i + 1, total: recipientList.length, recipient, status: 'FAILED', error: error.message });
        }

        // Delay if interval is specified
        if (interval && i < recipientList.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, interval * 1000));
        }
    }

    res.status(200).json({ success: true, results });
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
