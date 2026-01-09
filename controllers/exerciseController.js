const path = require('path');
const fsp = require('fs/promises');
const crypto = require('crypto');

const Exercise = require('../models/Exercise');

function splitLines(s) {
  return String(s || '')
    .split('\n')
    .map(x => x.trim())
    .filter(Boolean);
}

function splitComma(s) {
  return String(s || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
}

function safeFileName(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

async function downloadImageToPublic(url, exerciseName) {
  const publicDir = path.join(process.cwd(), 'public');
  const outDir = path.join(publicDir, 'img', 'exercises');
  await fsp.mkdir(outDir, { recursive: true });

  const base = safeFileName(exerciseName) || 'exercise';
  const rand = crypto.randomBytes(3).toString('hex');
  const filename = `${base}-${rand}.jpg`;
  const outPath = path.join(outDir, filename);

  const resp = await fetch(url, { redirect: 'follow' });
  if (!resp.ok) throw new Error(`Image fetch failed: ${resp.status}`);

  const ct = resp.headers.get('content-type') || '';
  if (!ct.startsWith('image/')) throw new Error(`Not an image content-type: ${ct}`);

  const arrayBuf = await resp.arrayBuffer();
  await fsp.writeFile(outPath, Buffer.from(arrayBuf));

  return `/img/exercises/${filename}`;
}

/* ---------------- LIST/SEARCH ---------------- */

exports.list = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();

    let filter = { isActive: true };
    if (q) {
      // escape regex
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter = { ...filter, nameLower: { $regex: esc } };
    }

    const exercises = await Exercise.find(filter).sort({ nameLower: 1 }).lean();

    res.render('exercises/index', {
      currentPath: '/exercises',
      exercises,
      q
    });
  } catch (err) {
    console.error('exercise list error:', err);
    res.render('exercises/index', {
      currentPath: '/exercises',
      exercises: [],
      q: ''
    });
  }
};

/* ---------------- CREATE ---------------- */

exports.showNew = (req, res) => {
  res.render('exercises/new', { currentPath: '/exercises' });
};

exports.create = async (req, res) => {
  try {
    const {
      name,
      category,
      muscles,
      instructions,
      tips,
      imageUrl,
      videoUrl,
      equipment,
      difficulty,
      autoImage
    } = req.body;

    const cleanName = String(name || '').trim();
    if (!cleanName) return res.redirect('/exercises/new?toast=error&type=error');

    let finalImageUrl = null;

    // ✅ If you paste a URL, we download it locally
    if (String(imageUrl || '').trim()) {
      finalImageUrl = await downloadImageToPublic(String(imageUrl).trim(), cleanName);
    } else if (autoImage === 'on') {
      // ✅ Auto image (no API key): Unsplash Source
      const query = encodeURIComponent(`${cleanName} exercise gym`);
      const unsplash = `https://source.unsplash.com/1200x800/?${query}`;
      finalImageUrl = await downloadImageToPublic(unsplash, cleanName);
    }

    await Exercise.create({
      name: cleanName,
      category: category || 'Other',
      muscles: splitComma(muscles),
      instructions: splitLines(instructions),
      tips: splitLines(tips),
      imageUrl: finalImageUrl,
      videoUrl: String(videoUrl || '').trim() || null,
      equipment: splitComma(equipment),
      difficulty: difficulty || 'Beginner',
      isActive: true
    });

    return res.redirect('/exercises?toast=saved&type=success');
  } catch (err) {
    console.error('exercise create error:', err);
    return res.redirect('/exercises/new?toast=error&type=error');
  }
};

/* ---------------- EDIT ---------------- */

exports.showEdit = async (req, res) => {
  try {
    const ex = await Exercise.findById(req.params.id);
    if (!ex) return res.redirect('/exercises');

    res.render('exercises/edit', {
      currentPath: '/exercises',
      ex
    });
  } catch (err) {
    console.error('exercise showEdit error:', err);
    res.redirect('/exercises');
  }
};

exports.update = async (req, res) => {
  try {
    const {
      name,
      category,
      muscles,
      instructions,
      tips,
      imageUrl,
      videoUrl,
      equipment,
      difficulty,
      autoImage
    } = req.body;

    const cleanName = String(name || '').trim();
    if (!cleanName) return res.redirect(`/exercises/${req.params.id}/edit?toast=error&type=error`);

    let finalImageUrl = null;

    // if user provided a URL/path, we respect it:
    // - if it starts with http, we download locally
    // - if it's a local path (/img/...) we store as-is
    const img = String(imageUrl || '').trim();
    if (img) {
      if (/^https?:\/\//i.test(img)) {
        finalImageUrl = await downloadImageToPublic(img, cleanName);
      } else {
        finalImageUrl = img;
      }
    } else if (autoImage === 'on') {
      const query = encodeURIComponent(`${cleanName} exercise gym`);
      const unsplash = `https://source.unsplash.com/1200x800/?${query}`;
      finalImageUrl = await downloadImageToPublic(unsplash, cleanName);
    } else {
      finalImageUrl = null;
    }

    await Exercise.findByIdAndUpdate(req.params.id, {
      name: cleanName,
      category: category || 'Other',
      muscles: splitComma(muscles),
      instructions: splitLines(instructions),
      tips: splitLines(tips),
      imageUrl: finalImageUrl,
      videoUrl: String(videoUrl || '').trim() || null,
      equipment: splitComma(equipment),
      difficulty: difficulty || 'Beginner'
    });

    res.redirect('/exercises?toast=updated&type=success');
  } catch (err) {
    console.error('exercise update error:', err);
    res.redirect(`/exercises/${req.params.id}/edit?toast=error&type=error`);
  }
};

/* ---------------- DELETE ---------------- */

exports.remove = async (req, res) => {
  try {
    await Exercise.findByIdAndUpdate(req.params.id, { isActive: false });
    res.redirect('/exercises?toast=deleted&type=success');
  } catch (err) {
    console.error('exercise remove error:', err);
    res.redirect('/exercises?toast=error&type=error');
  }
};