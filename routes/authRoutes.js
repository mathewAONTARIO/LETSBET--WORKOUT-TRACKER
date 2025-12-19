const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const User = require('../models/User');
const { sendMail, sendVerifyEmail } = require('../utils/mailer');

const APP_URL = (process.env.APP_URL || '').replace(/\/$/, '');

router.get('/login', (req, res) => {
  res.render('auth/login', { error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) return res.render('auth/login', { error: 'Invalid email or password.' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.render('auth/login', { error: 'Invalid email or password.' });

    if (!user.emailVerified) {
      return res.render('auth/login', { error: 'Please verify your email before logging in.' });
    }

    req.session.userId = user._id;
    res.redirect('/workouts');
  } catch (err) {
    console.error(err);
    res.render('auth/login', { error: 'Something went wrong. Try again.' });
  }
});

router.get('/register', (req, res) => {
  res.render('auth/register', { error: null });
});

router.post('/register', async (req, res) => {
  const { email, displayName, password } = req.body;

  try {
    if (!email || !password || password.length < 6) {
      return res.render('auth/register', { error: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.render('auth/register', { error: 'An account with that email already exists.' });
    }

    const user = new User({
      email: normalizedEmail,
      displayName: (displayName || '').trim(),
      password
    });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    user.emailVerified = false;
    user.emailVerifyTokenHash = tokenHash;
    user.emailVerifyTokenExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    user.emailVerificationSentAt = new Date();
    user.emailVerificationSendCount = (user.emailVerificationSendCount || 0) + 1;

    await user.save();

    await sendVerifyEmail({
      to: user.email,
      name: user.displayName || user.email,
      token,
      userId: user._id
    });

    res.render('auth/login', { error: 'Check your email to verify your account, then log in.' });
  } catch (err) {
    console.error(err);
    res.render('auth/register', { error: 'Something went wrong. Try again.' });
  }
});

router.get('/verify-email', async (req, res) => {
  try {
    const token = String(req.query.token || '');
    const email = String(req.query.email || '').toLowerCase().trim();

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
  res.render('auth/resend-verification', { error: null, sent: false, message: null });
});

router.post('/resend-verification', async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const genericMsg = 'If that email exists, we sent a new verification link.';

    if (!email) {
      return res.render('auth/resend-verification', { error: 'Enter your email.', sent: false, message: null });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.render('auth/resend-verification', { error: null, sent: true, message: genericMsg });
    }

    if (user.emailVerified) {
      return res.render('auth/resend-verification', { error: null, sent: true, message: 'Your email is already verified. You can log in.' });
    }

    const last = user.emailVerificationSentAt ? new Date(user.emailVerificationSentAt).getTime() : 0;
    const now = Date.now();
    if (last && now - last < 60 * 1000) {
      return res.render('auth/resend-verification', {
        error: 'Wait 1 minute before requesting another email.',
        sent: false,
        message: null
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    user.emailVerifyTokenHash = tokenHash;
    user.emailVerifyTokenExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    user.emailVerificationSentAt = new Date();
    user.emailVerificationSendCount = (user.emailVerificationSendCount || 0) + 1;

    await user.save();

    await sendVerifyEmail({
      to: user.email,
      name: user.displayName || user.email,
      token,
      userId: user._id
    });

    return res.render('auth/resend-verification', { error: null, sent: true, message: genericMsg });
  } catch (err) {
    console.error(err);
    return res.render('auth/resend-verification', { error: 'Something went wrong. Try again.', sent: false, message: null });
  }
});

router.get('/forgot', (req, res) => {
  res.render('auth/forgot', { error: null, sent: false });
});

router.post('/forgot', async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
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
    const email = String(req.body.email || '').toLowerCase().trim();
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