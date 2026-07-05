/**
 * Post Routes
 * GET    /api/posts
 * GET    /api/posts/:id
 * POST   /api/posts
 * PUT    /api/posts/:id
 * DELETE /api/posts/:id
 */

const express = require('express');
const router = express.Router();
const { getPosts, getPostById, createPost, updatePost, deletePost } = require('../controllers/postController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { createPostValidation } = require('../middleware/validation');
const upload = require('../config/multer');

router.get('/', optionalAuth, getPosts);
router.get('/:id', optionalAuth, getPostById);

router.post('/',
  requireAuth,
  upload.single('image'),
  createPostValidation,
  createPost
);

router.put('/:id',
  requireAuth,
  upload.single('image'),
  updatePost
);

router.delete('/:id', requireAuth, deletePost);

module.exports = router;
