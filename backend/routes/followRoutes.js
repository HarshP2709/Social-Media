/**
 * Follow Routes
 * POST   /api/follow
 * DELETE /api/follow
 * GET    /api/followers/:id
 * GET    /api/following/:id
 */

const express = require('express');
const router = express.Router();
const { followUser, unfollowUser, getFollowers, getFollowing } = require('../controllers/followController');
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, followUser);
router.delete('/', requireAuth, unfollowUser);
router.get('/followers/:id', getFollowers);
router.get('/following/:id', getFollowing);

module.exports = router;
