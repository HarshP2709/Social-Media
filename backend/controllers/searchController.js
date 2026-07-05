/**
 * Search Controller
 * Handles searching for users and posts
 */

const { supabaseAdmin } = require('../config/supabase');

/**
 * Search users
 * GET /api/search/users?q=query
 */
const searchUsers = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const searchTerm = q.trim().toLowerCase();
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const currentUserId = req.session.userId;

    const { data: users, error, count } = await supabaseAdmin
      .from('users')
      .select('id, name, username, profile_image, bio', { count: 'exact' })
      .or(`username.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
      .neq('id', currentUserId || '')
      .range(offset, offset + parseInt(limit) - 1)
      .order('username', { ascending: true });

    if (error) throw error;

    // Attach is_following for each result
    const { data: following } = currentUserId
      ? await supabaseAdmin.from('followers').select('following_id').eq('follower_id', currentUserId)
      : { data: [] };

    const followingSet = new Set((following || []).map(f => f.following_id));

    return res.status(200).json({
      success: true,
      users: (users || []).map(u => ({ ...u, is_following: followingSet.has(u.id) })),
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count }
    });
  } catch (err) {
    console.error('searchUsers error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Search posts
 * GET /api/search/posts?q=query
 */
const searchPosts = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const searchTerm = q.trim().toLowerCase();
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { data: posts, error, count } = await supabaseAdmin
      .from('posts')
      .select(`
        id, content, image, created_at, user_id,
        users!posts_user_id_fkey (id, name, username, profile_image)
      `, { count: 'exact' })
      .ilike('content', `%${searchTerm}%`)
      .range(offset, offset + parseInt(limit) - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      posts: posts || [],
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count }
    });
  } catch (err) {
    console.error('searchPosts error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { searchUsers, searchPosts };
