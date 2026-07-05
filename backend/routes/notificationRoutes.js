/**
 * Notification Routes
 * GET /api/notifications
 * PUT /api/notifications/read
 */

const express = require('express');
const router = express.Router();
const { getNotifications, markAllRead } = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, getNotifications);
router.put('/read', requireAuth, markAllRead);

module.exports = router;
