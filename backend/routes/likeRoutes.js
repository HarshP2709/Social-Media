/**
 * Like Routes
 * POST   /api/like
 * DELETE /api/like
 */

const express = require('express');
const router = express.Router();
const { likePost, unlikePost } = require('../controllers/likeController');
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, likePost);
router.delete('/', requireAuth, unlikePost);

module.exports = router;
