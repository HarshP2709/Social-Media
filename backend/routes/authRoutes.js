/**
 * Authentication Routes
 * POST /api/register
 * POST /api/login
 * POST /api/logout
 * GET  /api/me
 */

const express = require('express');
const router = express.Router();
const { register, login, logout, getMe } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validation');

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, getMe);

module.exports = router;
