const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const User = require('../models/User');
const { sendMail } = require('../utils/mailer');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function baseUrl(req) {
  const envUrl = String(process.env.APP_URL || '').replace(/\/$/, '');
  if (envUrl) return envUrl;
  return `${req.protocol}://${req.get('host')}`;
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

router.get('/login', (req, res) => {
  res.render('auth/login', { error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const normalizedEmail = String(email || '').toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) return res.render('auth/login', { error: 'Invalid email or password.' });

    const ok = await user.comparePassword(String(password || ''));
    if (!ok) return res.render('auth/login', { error: 'Invalid email or password.' });

    if (!user.emailVerified) {
      const allowDevLogin = process.env.NODE_ENV !== 'production' && !smtpConfigured();
      if (!allowDevLogin) {
        return res.render('auth/login', { error: 'Please verify your email before logging in.' });
      }
    }

    req.session.userId = user._id;
    return res.redirect('/workouts');
  } catch (err) {
    console.error('Login error:', err);
    return res.render('auth/login', { error: 'Something went wrong. Try again.' });
  }
});

router.get('/register', (req, res) => {
  res.render('auth/register', { error: null });
});

router.post('/register', async (req, res) => {
  const { email, displayName, password } = req.body;

  try {
    const normalizedEmail = String(email || '').toLowerCase().trim();
    const dn = String(displayName || '').trim();
    const pw = String(password || '');

    if (!normalizedEmail || !pw || pw.length < 6) {
      return res.render('auth/register', { error: 'Please enter a valid email and a password (6+ chars).' });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.render('auth/register', { error: 'An account with that email already exists.' });
    }

    const user = new User({
      email: normalizedEmail,
      displayName: dn,
      password: pw
    });

    const token = crypto.randomBytes(32).toString('hex');
    user.emailVerifyTokenHash = hashToken(token);
    user.emailVerifyTokenExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    const devNoSmtp = process.env.NODE_ENV !== 'production' && !smtpConfigured();
    if (devNoSmtp) {
      user.emailVerified = true;
      user.emailVerifyTokenHash = '';
      user.emailVerifyTokenExpires = undefined;
      await user.save();

      req.session.userId = user._id;
      return res.redirect('/workouts');
    }

    await user.save();

    const verifyLink = `${baseUrl(req)}/auth/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`;
    await sendMail({
      to: user.email,
      subject: 'Verify your LETSBETFit email',
      html: `<p>Verify your email to finish creating your account:</p><p><a href="${verifyLink}">Verify email</a></p><p>This link expires in 24 hours.</p>`
    });

    return res.render('auth/login', {
      error: 'Check your email to verify your account, then log in.'
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.render('auth/register', { error: 'Something went wrong. Try again.' });
  }
});

router.get('/verify-email', async (req, res) => {
  try {
    const token = String(req.query.token || '');
    const email = String(req.query.email || '').toLowerCase().trim();
    if (!token || !email) return res.status(400).send('Invalid verification link.');

    const tokenHash = hashToken(token);

    const user = await User.findOne({
      email,
      emailVerifyTokenHash: tokenHash,
      emailVerifyTokenExpires: { $gt: new Date() }
    });

    if (!user) return res.status(400).send('Verification link expired or invalid.');

    user.emailVerified = true;
    user.emailVerifyTokenHash = '';
    user.emailVerifyTokenExpires = undefined;
    await user.save();

    return res.redirect('/auth/login');
  } catch (err) {
    console.error('Verify email error:', err);
    return res.status(500).send('Something went wrong.');
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
      user.resetPasswordTokenHash = hashToken(token);
      user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 30);
      await user.save();

      const link = `${baseUrl(req)}/auth/reset?token=${token}&email=${encodeURIComponent(user.email)}`;
      await sendMail({
        to: user.email,
        subject: 'Reset your LETSBETFit password',
        html: `<p>Reset your password:</p><p><a href="${link}">Reset password</a></p><p>This link expires in 30 minutes.</p>`
      });
    }

    return res.render('auth/forgot', { error: null, sent: true });
  } catch (err) {
    console.error('Forgot error:', err);
    return res.render('auth/forgot', { error: 'Something went wrong. Try again.', sent: false });
  }
});

router.get('/reset', (req, res) => {
  res.render('auth/reset', {
    error: null,
    email: String(req.query.email || ''),
    token: String(req.query.token || '')
  });
});

router.post('/reset', async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const token = String(req.body.token || '');
    const password = String(req.body.password || '');

    if (!email || !token || password.length < 6) {
      return res.render('auth/reset', { error: 'Invalid request.', email, token });
    }

    const tokenHash = hashToken(token);

    const user = await User.findOne({
      email,
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) return res.render('auth/reset', { error: 'Reset link expired or invalid.', email, token });

    user.password = password;
    user.resetPasswordTokenHash = '';
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.redirect('/auth/login');
  } catch (err) {
    console.error('Reset error:', err);
    return res.render('auth/reset', {
      error: 'Something went wrong. Try again.',
      email: String(req.body.email || ''),
      token: String(req.body.token || '')
    });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/auth/login'));
});

module.exports = router;