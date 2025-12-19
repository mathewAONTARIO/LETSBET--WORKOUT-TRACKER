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
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Verify your LETSBETFit email</title>
</head>
<body style="margin:0;padding:0;background-color:#0b1220;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    Verify your email to activate your LETSBETFit account.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0b1220" style="background-color:#0b1220;padding:32px 12px;">
    <tr>
      <td align="center" valign="top">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background-color:#0f172a;border:1px solid #23304a;border-radius:16px;overflow:hidden;">
          <tr>
            <td bgcolor="#0b1220" style="background-color:#0b1220;padding:18px 20px;border-bottom:1px solid #23304a;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" style="padding-right:10px;">
                    <img src="${APP_URL}/img/logo/logo-email.png" width="32" height="32" alt="LETSBETFit" style="display:block;border-radius:8px;outline:none;border:0;text-decoration:none;" />
                  </td>
                  <td valign="middle">
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-weight:800;letter-spacing:.12em;font-size:12px;color:#f9fafb;">
                      LETSBET<span style="color:#22c55e;">Fit</span>
                    </div>
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#94a3b8;margin-top:2px;">
                      Verify your email
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 20px 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
              <div style="font-size:18px;font-weight:800;color:#f9fafb;margin-bottom:6px;">
                Welcome, ${safeName} 👋
              </div>
              <div style="font-size:14px;line-height:1.6;color:#cbd5f5;">
                Please confirm your email address to activate your LETSBETFit account.
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:14px 20px 18px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td bgcolor="#2563eb" style="background-color:#2563eb;border-radius:999px;">
                    <a href="${safeUrl}"
                       style="display:inline-block;padding:12px 18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">
                      Verify email
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 20px 18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
              <div style="font-size:12px;color:#94a3b8;line-height:1.6;">
                If the button doesn’t work, copy and paste this link:
                <div style="word-break:break-word;overflow-wrap:anywhere;margin-top:6px;">
                  <a href="${safeUrl}" style="color:#93c5fd;text-decoration:none;">${safeUrl}</a>
                </div>
              </div>
            </td>
          </tr>

          <tr>
            <td bgcolor="#0b1220" style="background-color:#0b1220;padding:14px 20px;border-top:1px solid #23304a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
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
  const text = `Welcome, ${name || 'athlete'}.\nVerify your email:\n${verifyUrl}\n\nIf you didn’t create this account, ignore this email.`;

  return sendMail({
    to,
    subject: 'Verify your LETSBETFit email',
    html,
    text,
    userId,
    type: 'verify'
  });
}

module.exports = { sendMail, sendVerifyEmail };