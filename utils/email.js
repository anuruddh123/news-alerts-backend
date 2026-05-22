const nodemailer = require('nodemailer');

const isGmail =
  process.env.EMAIL_SERVICE === 'gmail' ||
  process.env.EMAIL_HOST?.includes('gmail.com') ||
  process.env.EMAIL_USER?.includes('@gmail.com');
const transporter = nodemailer.createTransport({
  service: isGmail ? 'gmail' : process.env.EMAIL_SERVICE,
  host: isGmail ? undefined : process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || (isGmail ? 465 : 587)),
  secure: process.env.EMAIL_SECURE === 'true' || (isGmail && Number(process.env.EMAIL_PORT || 465) === 465),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

transporter.verify().then(() => {
  console.log('✅ Email transporter verified. SMTP credentials are valid.');
}).catch((error) => {
  console.error('❌ Email transporter verification failed:', error?.message || error);
});

const sendEmail = async (options) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email credentials are not configured.');
  }
  const message = {
    from: `${process.env.EMAIL_FROM_NAME || 'News Alerts'} <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
    text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
  };
  try {
    const info = await transporter.sendMail(message);
    console.log('Email sent:', info.messageId, 'to', options.email);
  } catch (error) {
    console.error('Nodemailer sendMail failed:', {
      email: options.email,
      subject: options.subject,
      error: error.message,
      code: error.code,
      response: error.response,
    });
    throw error;
  }
};

const sendWelcomeEmail = async (email, name) => {
  try {
    const html = `
      <div style="font-family:Arial,sans-serif;color:#333;">
        <h2>Welcome, ${name}!</h2>
        <p>Thanks for signing up for News Alerts. Customize your categories and alerts in your dashboard.</p>
        <p>Stay informed with the latest breaking news.</p>
      </div>
    `;
    await sendEmail({ email, subject: 'Welcome to News Alerts', html });
  } catch (error) {
    console.error('Welcome email failed:', error.message);
  }
};

module.exports = { sendEmail, sendWelcomeEmail };
