/**
 * User Routes
 * GET  /api/users/suggested
 * GET  /api/users
 * GET  /api/users/:id
 * PUT  /api/users/:id
 * PUT  /api/users/:id/password
 */

const express = require('express');
const router = express.Router();
const { getAllUsers, getUserById, updateUser, changePassword, getSuggestedUsers } = require('../controllers/userController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { updateProfileValidation } = require('../middleware/validation');
const upload = require('../config/multer');

// Suggested users must come before :id route
router.get('/suggested', requireAuth, getSuggestedUsers);
router.get('/', requireAuth, getAllUsers);
router.get('/:id', optionalAuth, getUserById);

// Profile update with file uploads
router.put('/:id',
  requireAuth,
  (req, res, next) => { req.uploadType = 'profile'; next(); },
  upload.fields([
    { name: 'profile_image', maxCount: 1 },
    { name: 'cover_image', maxCount: 1 }
  ]),
  updateProfileValidation,
  updateUser
);

router.put('/:id/password', requireAuth, changePassword);

module.exports = router;
