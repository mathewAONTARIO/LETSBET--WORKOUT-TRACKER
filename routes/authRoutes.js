const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const User = require('../models/User');
const { sendMail } = require('../utils/mailer');

const APP_URL = (process.env.APP_URL || '').replace(/\/$/, '');

/* =========================
   LOGIN
========================= */

router.get('/login', (req, res) => {
  res.render('auth/login', { error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.render('auth/login', { error: 'Invalid email or password.' });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.render('auth/login', { error: 'Invalid email or password.' });
    }

    if (!user.emailVerified) {
      return res.render('auth/login', {
        error: 'Please verify your email before logging in.'
      });
    }

    req.session.userId = user._id;
    res.redirect('/workouts');
  } catch (err) {
    console.error('Login error:', err);
    res.render('auth/login', { error: 'Something went wrong. Try again.' });
  }
});

/* =========================
   REGISTER
========================= */

router.get('/register', (req, res) => {
  res.render('auth/register', { error: null });
});

router.post('/register', async (req, res) => {
  const { email, displayName, password } = req.body;

  try {
    if (!email || !password || password.length < 6) {
      return res.render('auth/register', {
        error: 'Password must be at least 6 characters.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.render('auth/register', {
        error: 'An account with that email already exists.'
      });
    }

    const user = new User({
      email: normalizedEmail,
      displayName: (displayName || '').trim(),
      password
    });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    user.emailVerifyTokenHash = tokenHash;
    user.emailVerifyTokenExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await user.save();

    const verifyLink = `${APP_URL}/auth/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`;

    try {
      await sendMail({
        to: user.email,
        subject: 'Verify your LETSBETFit email',
        html: `
          <p>Welcome to LETSBETFit 👋</p>
          <p>Please verify your email to activate your account:</p>
          <p><a href="${verifyLink}">Verify email</a></p>
        `
      });
    } catch (mailErr) {
      console.error('Email send failed:', mailErr);
    }

    res.render('auth/login', {
      error: 'Check your email to verify your account, then log in.'
    });
  } catch (err) {
    console.error('Register error:', err);
    res.render('auth/register', { error: 'Something went wrong. Try again.' });
  }
});

/* =========================
   VERIFY EMAIL
========================= */

router.get('/verify-email', async (req, res) => {
  try {
    const token = String(req.query.token || '');
    const email = String(req.query.email || '').toLowerCase().trim();

    if (!token || !email) {
      return res.status(400).send('Invalid verification link.');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      email,
      emailVerifyTokenHash: tokenHash,
      emailVerifyTokenExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).send('Verification link expired or invalid.');
    }

    user.emailVerified = true;
    user.emailVerifyTokenHash = undefined;
    user.emailVerifyTokenExpires = undefined;

    await user.save();

    res.redirect('/auth/login');
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).send('Something went wrong.');
  }
});

/* =========================
   FORGOT PASSWORD
========================= */

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

      const link = `${APP_URL}/auth/reset?token=${token}&email=${encodeURIComponent(user.email)}`;

      try {
        await sendMail({
          to: user.email,
          subject: 'Reset your LETSBETFit password',
          html: `
            <p>Reset your password:</p>
            <p><a href="${link}">Reset password</a></p>
            <p>This link expires in 30 minutes.</p>
          `
        });
      } catch (mailErr) {
        console.error('Reset email failed:', mailErr);
      }
    }

    res.render('auth/forgot', { error: null, sent: true });
  } catch (err) {
    console.error('Forgot error:', err);
    res.render('auth/forgot', { error: 'Something went wrong.', sent: false });
  }
});

/* =========================
   RESET PASSWORD
========================= */

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

    if (!user) {
      return res.render('auth/reset', { error: 'Reset link expired or invalid.', email, token });
    }

    user.password = password;
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.redirect('/auth/login');
  } catch (err) {
    console.error('Reset error:', err);
    res.render('auth/reset', { error: 'Something went wrong.', email, token });
  }
});

/* =========================
   LOGOUT
========================= */

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
});

module.exports = router;