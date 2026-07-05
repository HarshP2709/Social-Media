/**
 * Notification Controller
 * Handles fetching and marking notifications as read
 */

const { supabaseAdmin } = require('../config/supabase');

/**
 * Get notifications for current user
 * GET /api/notifications
 */
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { data: notifications, error, count } = await supabaseAdmin
      .from('notifications')
      .select(`
        id, type, reference_id, is_read, created_at,
        sender:users!notifications_sender_id_fkey (id, name, username, profile_image)
      `, { count: 'exact' })
      .eq('receiver_id', req.session.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    // Count unread
    const { count: unreadCount } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', req.session.userId)
      .eq('is_read', false);

    return res.status(200).json({
      success: true,
      notifications: notifications || [],
      unread_count: unreadCount || 0,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count }
    });
  } catch (err) {
    console.error('getNotifications error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Mark all notifications as read
 * PUT /api/notifications/read
 */
const markAllRead = async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('receiver_id', req.session.userId)
      .eq('is_read', false);

    if (error) throw error;

    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('markAllRead error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { getNotifications, markAllRead };
