const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');

const APP_URL = (process.env.APP_URL || '').replace(/\/$/, '');
const MAIL_FROM = process.env.MAIL_FROM || 'LETSBETFit <letsbetfitapp@gmail.com>';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function verificationEmailTemplate({ name, verifyUrl }) {
  const safeName = escapeHtml(name || 'athlete');
  const safeUrl = escapeHtml(verifyUrl);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Verify your LETSBETFit email</title>
  </head>
  <body style="margin:0;padding:0;background:#0b1220;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#e5e7eb;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b1220;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#0f172a;border:1px solid rgba(148,163,184,.25);border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:18px 20px;background:rgba(2,6,23,.6);border-bottom:1px solid rgba(148,163,184,.18);">
                <div style="display:flex;align-items:center;gap:10px;">
                  <img src="${APP_URL}/img/logo/logo-email.png" width="32" height="32" style="display:block;border-radius:8px;" alt="LETSBETFit" />
                  <div style="line-height:1;">
                    <div style="font-weight:800;letter-spacing:.12em;font-size:12px;color:#f9fafb;">LETSBET<span style="color:#22c55e;">Fit</span></div>
                    <div style="font-size:12px;color:#94a3b8;margin-top:2px;">Verify your email</div>
                  </div>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:22px 20px 10px;">
                <div style="font-size:18px;font-weight:800;color:#f9fafb;margin-bottom:6px;">Welcome, ${safeName} 👋</div>
                <div style="font-size:14px;line-height:1.6;color:#cbd5f5;">
                  Please confirm your email address to activate your LETSBETFit account.
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 20px 18px;">
                <a href="${safeUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:999px;font-size:14px;">
                  Verify email
                </a>
              </td>
            </tr>

            <tr>
              <td style="padding:0 20px 18px;">
                <div style="font-size:12px;color:#94a3b8;line-height:1.6;">
                  If the button doesn’t work, copy and paste this link:
                  <div style="word-break:break-all;margin-top:6px;">
                    <a href="${safeUrl}" style="color:#93c5fd;text-decoration:none;">${safeUrl}</a>
                  </div>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 20px;background:rgba(2,6,23,.6);border-top:1px solid rgba(148,163,184,.18);">
                <div style="font-size:12px;color:#94a3b8;line-height:1.6;">
                  If you didn’t create this account, you can ignore this email.
                </div>
                <div style="font-size:12px;color:#64748b;margin-top:10px;letter-spacing:.10em;text-transform:uppercase;">
                  LETSBETFit
                </div>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendMail({ to, subject, html, text, userId, type = 'other', meta = {} }) {
  const toNorm = String(to || '').toLowerCase().trim();

  try {
    await transporter.sendMail({
      from: MAIL_FROM,
      to: toNorm,
      subject,
      html,
      text
    });

    await EmailLog.create({
      user: userId || undefined,
      to: toNorm,
      type,
      subject: subject || '',
      status: 'sent',
      meta
    });

    return true;
  } catch (err) {
    await EmailLog.create({
      user: userId || undefined,
      to: toNorm,
      type,
      subject: subject || '',
      status: 'failed',
      error: String(err && err.message ? err.message : err),
      meta
    });

    throw err;
  }
}

async function sendVerifyEmail({ to, name, token, userId }) {
  if (!APP_URL) throw new Error('APP_URL is missing');

  const verifyUrl = `${APP_URL}/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(to)}`;
  const html = verificationEmailTemplate({ name, verifyUrl });

  return sendMail({
    to,
    subject: 'Verify your LETSBETFit email',
    html,
    userId,
    type: 'verify'
  });
}

module.exports = { sendMail, sendVerifyEmail };