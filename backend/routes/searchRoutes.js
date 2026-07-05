/**
 * Search Routes
 * GET /api/search/users?q=query
 * GET /api/search/posts?q=query
 */

const express = require('express');
const router = express.Router();
const { searchUsers, searchPosts } = require('../controllers/searchController');
const { optionalAuth } = require('../middleware/auth');

router.get('/users', optionalAuth, searchUsers);
router.get('/posts', optionalAuth, searchPosts);

module.exports = router;
