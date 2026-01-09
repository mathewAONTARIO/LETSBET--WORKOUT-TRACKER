const express = require('express');
const router = express.Router();

const exerciseController = require('../controllers/exerciseController');
const { requireLogin } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

// ✅ list/search
router.get('/', requireLogin, exerciseController.list);

// ✅ create (admin only)
router.get('/new', requireLogin, requireAdmin, exerciseController.showNew);
router.post('/new', requireLogin, requireAdmin, exerciseController.create);

// ✅ edit (admin only)
router.get('/:id/edit', requireLogin, requireAdmin, exerciseController.showEdit);
router.post('/:id/edit', requireLogin, requireAdmin, exerciseController.update);

// ✅ delete (admin only)
router.post('/:id/delete', requireLogin, requireAdmin, exerciseController.remove);

module.exports = router;