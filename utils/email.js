const nodemailer = require('nodemailer');

// ✅ SIMPLE & STABLE GMAIL TRANSPORTER
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },

  // ✅ Prevent long hanging on Render
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

// ✅ VERIFY SMTP
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Verification Failed:', error.message);
  } else {
    console.log('✅ SMTP Server Ready');
  }
});

// ✅ GENERIC EMAIL FUNCTION
const sendEmail = async (options) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email credentials missing');
  }

  const message = {
    from: `${process.env.EMAIL_FROM_NAME || 'News Alerts'} <${
      process.env.EMAIL_FROM || process.env.EMAIL_USER
    }>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
    text:
      options.text ||
      options.html.replace(/<[^>]*>?/gm, ''),
  };

  try {
    const info = await transporter.sendMail(message);

    console.log('✅ Email Sent:', info.messageId);

    return info;
  } catch (error) {
    console.error('❌ EMAIL SEND FAILED:', {
      email: options.email,
      error: error.message,
      code: error.code,
    });

    throw error;
  }
};

// ✅ WELCOME EMAIL
const sendWelcomeEmail = async (email, name) => {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Welcome, ${name}! 🎉</h2>

        <p>
          Thanks for joining <b>News Alerts</b>.
        </p>

        <p>
          You can now customize categories and receive breaking news alerts.
        </p>

        <p>
          Stay informed 🚀
        </p>
      </div>
    `;

    await sendEmail({
      email,
      subject: 'Welcome to News Alerts',
      html,
    });
  } catch (error) {
    console.error('❌ Welcome Email Failed:', error.message);
  }
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
};