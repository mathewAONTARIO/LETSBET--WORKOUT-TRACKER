const nodemailer = require('nodemailer');

function makeTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

async function sendMail({ to, subject, html, text }) {
  const transport = makeTransport();
  if (!transport) {
    console.log('[MAIL DEV FALLBACK]', { to, subject });
    return;
  }

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  await transport.sendMail({ from, to, subject, html, text });
}

module.exports = { sendMail };