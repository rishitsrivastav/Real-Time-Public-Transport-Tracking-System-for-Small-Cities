const nodemailer = require('nodemailer');

// Reusable mail sender
// Expects: { to, subject, text }
async function sendEmail({ to, subject, text }) {
  // Read and sanitize credentials (remove spaces/NBSP)
  const user = (process.env.MAIL_USER || '').trim(); // Gmail address
  const pass = (process.env.MAIL_PASS || '')
    .replace(/\u00A0/g, '') // NBSP characters
    .replace(/\s+/g, '') // any whitespace
    .trim();

  if (!user || !pass) {
    throw new Error('Email credentials (MAIL_USER/MAIL_PASS) are not configured');
  }

  // Use explicit Gmail SMTP settings
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  const info = await transporter.sendMail({ from: user, to, subject, text });
  return info;
}

module.exports = { sendEmail };