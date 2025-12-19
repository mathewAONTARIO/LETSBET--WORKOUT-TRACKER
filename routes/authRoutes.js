const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const User = require('../models/User');
const EmailLog = require('../models/EmailLog');
const { sendMail, sendVerifyEmail } = require('../utils/mailer');

const APP_URL = (process.env.APP_URL || '').replace(/\/$/, '');

function normalizeEmail(email) {
  return String(email || '').toLowerCase().trim();
}

function maskEmail(email) {
  const e = normalizeEmail(email);
  const [u, d] = e.split('@');
  if (!u || !d) return e;
  const head = u.slice(0, 2);
  return `${head}${'*'.repeat(Math.max(u.length - 2, 1))}@${d}`;
}

async function canSendVerification(email) {
  const last = await EmailLog.findOne({ email, type: 'verify' }).sort({ sentAt: -1 }).lean();
  if (!last) return true;
  return Date.now() - new Date(last.sentAt).getTime() > 60 * 1000;
}

async function logEmail({ userId, email, type, req }) {
  try {
    await EmailLog.create({
      user: userId || null,
      email,
      type,
      sentAt: new Date(),
      ip: (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim(),
      userAgent: String(req.headers['user-agent'] || '')
    });
  } catch (e) {}
}

router.get('/login', (req, res) => {
  res.render('auth/login', { error: null, info: null, email: '' });
});

router.post('/login', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.render('auth/login', { error: 'Invalid email or password.', info: null, email });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.render('auth/login', { error: 'Invalid email or password.', info: null, email });
    }

    if (!user.emailVerified) {
      return res.render('auth/login', {
        error: 'Email not verified. Please verify your email to log in.',
        info: 'You can resend the verification email below.',
        email
      });
    }

    req.session.userId = user._id;
    res.redirect('/workouts');
  } catch (err) {
    console.error(err);
    res.render('auth/login', { error: 'Something went wrong. Try again.', info: null, email });
  }
});

router.get('/register', (req, res) => {
  res.render('auth/register', { error: null });
});

router.post('/register', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const displayName = String(req.body.displayName || '').trim();
  const password = String(req.body.password || '');

  try {
    if (!email) return res.render('auth/register', { error: 'Email is required.' });
    if (!password || password.length < 6) {
      return res.render('auth/register', { error: 'Password must be at least 6 characters.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      if (!existing.emailVerified) {
        return res.render('auth/login', {
          error: 'That email already has an account but it’s not verified yet.',
          info: 'Resend the verification email below.',
          email
        });
      }
      return res.render('auth/register', { error: 'An account with that email already exists.' });
    }

    const user = new User({
      email,
      displayName,
      password
    });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    user.emailVerified = false;
    user.emailVerifyTokenHash = tokenHash;
    user.emailVerifyTokenExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await user.save();

    await sendVerifyEmail({
      to: user.email,
      name: user.displayName || user.email,
      token
    });

    await logEmail({ userId: user._id, email: user.email, type: 'verify', req });

    res.render('auth/login', {
      error: null,
      info: `Verification sent to ${maskEmail(user.email)}. Check inbox/spam, then log in.`,
      email: user.email
    });
  } catch (err) {
    console.error(err);
    res.render('auth/register', { error: 'Something went wrong. Try again.' });
  }
});

router.get('/verify-email', async (req, res) => {
  try {
    const token = String(req.query.token || '');
    const email = normalizeEmail(req.query.email);

    if (!token || !email) return res.status(400).send('Invalid verification link.');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      email,
      emailVerifyTokenHash: tokenHash,
      emailVerifyTokenExpires: { $gt: new Date() }
    });

    if (!user) return res.status(400).send('Verification link expired or invalid.');

    user.emailVerified = true;
    user.emailVerifyTokenHash = undefined;
    user.emailVerifyTokenExpires = undefined;

    await user.save();

    res.redirect('/auth/login');
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong.');
  }
});

router.get('/resend-verification', (req, res) => {
  res.render('auth/resend-verification', { error: null, info: null, email: normalizeEmail(req.query.email) });
});

router.post('/resend-verification', async (req, res) => {
  const email = normalizeEmail(req.body.email);

  try {
    if (!email) return res.render('auth/resend-verification', { error: 'Enter your email.', info: null, email });

    const user = await User.findOne({ email });
    if (!user) {
      return res.render('auth/resend-verification', {
        error: null,
        info: `If an account exists for ${maskEmail(email)}, we sent a verification email.`,
        email
      });
    }

    if (user.emailVerified) {
      return res.render('auth/login', {
        error: null,
        info: 'Your email is already verified. You can log in now.',
        email
      });
    }

    const ok = await canSendVerification(email);
    if (!ok) {
      return res.render('auth/resend-verification', {
        error: 'Wait 60 seconds before resending.',
        info: null,
        email
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    user.emailVerifyTokenHash = tokenHash;
    user.emailVerifyTokenExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);
    await user.save();

    await sendVerifyEmail({
      to: user.email,
      name: user.displayName || user.email,
      token
    });

    await logEmail({ userId: user._id, email: user.email, type: 'verify', req });

    return res.render('auth/login', {
      error: null,
      info: `Verification sent to ${maskEmail(user.email)}. Check inbox/spam, then log in.`,
      email: user.email
    });
  } catch (err) {
    console.error(err);
    return res.render('auth/resend-verification', { error: 'Something went wrong. Try again.', info: null, email });
  }
});

router.get('/forgot', (req, res) => {
  res.render('auth/forgot', { error: null, sent: false });
});

router.post('/forgot', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const user = await User.findOne({ email });

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      user.resetPasswordTokenHash = tokenHash;
      user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 30);

      await user.save();

      const link = `${APP_URL}/auth/reset?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;

      await sendMail({
        to: user.email,
        subject: 'Reset your LETSBETFit password',
        html: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Reset your LETSBETFit password</title>
  </head>
  <body style="margin:0;padding:0;background:#0b1220;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#e5e7eb;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b1220;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#0f172a;border:1px solid rgba(148,163,184,.25);border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:18px 20px;background:rgba(2,6,23,.6);border-bottom:1px solid rgba(148,163,184,.18);">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="width:34px;height:34px;border-radius:10px;background:#111827;border:1px solid rgba(148,163,184,.25);display:flex;align-items:center;justify-content:center;">
                    <span style="font-weight:800;letter-spacing:.08em;color:#22c55e;">LB</span>
                  </div>
                  <div style="line-height:1;">
                    <div style="font-weight:800;letter-spacing:.12em;font-size:12px;color:#f9fafb;">LETSBET<span style="color:#22c55e;">Fit</span></div>
                    <div style="font-size:12px;color:#94a3b8;margin-top:2px;">Reset your password</div>
                  </div>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:22px 20px 10px;">
                <div style="font-size:18px;font-weight:800;color:#f9fafb;margin-bottom:6px;">Reset your password</div>
                <div style="font-size:14px;line-height:1.6;color:#cbd5f5;">
                  Tap the button below to reset your password. This link expires in 30 minutes.
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 20px 18px;">
                <a href="${link}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 16px;border-radius:999px;font-size:14px;">
                  Reset password
                </a>
              </td>
            </tr>

            <tr>
              <td style="padding:0 20px 18px;">
                <div style="font-size:12px;color:#94a3b8;line-height:1.6;">
                  If the button doesn’t work, copy and paste this link:
                  <div style="word-break:break-all;margin-top:6px;">
                    <a href="${link}" style="color:#93c5fd;text-decoration:none;">${link}</a>
                  </div>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 20px;background:rgba(2,6,23,.6);border-top:1px solid rgba(148,163,184,.18);">
                <div style="font-size:12px;color:#94a3b8;line-height:1.6;">
                  If you didn’t request this, you can ignore this email.
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
</html>`
      });

      await logEmail({ userId: user._id, email: user.email, type: 'reset', req });
    }

    res.render('auth/forgot', { error: null, sent: true });
  } catch (err) {
    console.error(err);
    res.render('auth/forgot', { error: 'Something went wrong.', sent: false });
  }
});

router.get('/reset', (req, res) => {
  res.render('auth/reset', {
    error: null,
    email: req.query.email || '',
    token: req.query.token || ''
  });
});

router.post('/reset', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const token = String(req.body.token || '');
    const password = String(req.body.password || '');

    if (password.length < 6) {
      return res.render('auth/reset', { error: 'Password too short.', email, token });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      email,
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) return res.render('auth/reset', { error: 'Reset link expired or invalid.', email, token });

    user.password = password;
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.redirect('/auth/login');
  } catch (err) {
    console.error(err);
    res.render('auth/reset', {
      error: 'Something went wrong.',
      email: req.body.email,
      token: req.body.token
    });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/auth/login'));
});

module.exports = router;