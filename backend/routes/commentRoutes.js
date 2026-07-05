/**
 * Comment Routes
 * GET    /api/comments/:postId
 * POST   /api/comments
 * PUT    /api/comments/:id
 * DELETE /api/comments/:id
 */

const express = require('express');
const router = express.Router();
const { getComments, addComment, updateComment, deleteComment } = require('../controllers/commentController');
const { requireAuth, optionalAuth } = require('../middleware/auth');

router.get('/:postId', optionalAuth, getComments);
router.post('/', requireAuth, addComment);
router.put('/:id', requireAuth, updateComment);
router.delete('/:id', requireAuth, deleteComment);

module.exports = router;
