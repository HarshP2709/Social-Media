/**
 * Follow Controller
 * Handles follow/unfollow functionality and follower/following lists
 */

const { supabaseAdmin } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

/**
 * Follow a user
 * POST /api/follow
 */
const followUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const followerId = req.session.userId;

    if (!userId) return res.status(400).json({ success: false, message: 'User ID is required' });
    if (userId === followerId) return res.status(400).json({ success: false, message: 'You cannot follow yourself' });

    // Check if user exists
    const { data: userToFollow } = await supabaseAdmin.from('users').select('id').eq('id', userId).single();
    if (!userToFollow) return res.status(404).json({ success: false, message: 'User not found' });

    // Check if already following
    const { data: existing } = await supabaseAdmin
      .from('followers').select('id').eq('follower_id', followerId).eq('following_id', userId).single();

    if (existing) return res.status(409).json({ success: false, message: 'Already following this user' });

    const { error } = await supabaseAdmin.from('followers').insert([{
      id: uuidv4(),
      follower_id: followerId,
      following_id: userId
    }]);

    if (error) throw error;

    // Notify the followed user
    await supabaseAdmin.from('notifications').insert([{
      id: uuidv4(),
      sender_id: followerId,
      receiver_id: userId,
      type: 'follow',
      reference_id: followerId,
      is_read: false
    }]);

    const { count: followersCount } = await supabaseAdmin
      .from('followers').select('*', { count: 'exact', head: true }).eq('following_id', userId);

    return res.status(201).json({
      success: true,
      message: 'User followed',
      is_following: true,
      followers_count: followersCount || 0
    });
  } catch (err) {
    console.error('followUser error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Unfollow a user
 * DELETE /api/follow
 */
const unfollowUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const followerId = req.session.userId;

    if (!userId) return res.status(400).json({ success: false, message: 'User ID is required' });

    const { error } = await supabaseAdmin
      .from('followers')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', userId);

    if (error) throw error;

    const { count: followersCount } = await supabaseAdmin
      .from('followers').select('*', { count: 'exact', head: true }).eq('following_id', userId);

    return res.status(200).json({
      success: true,
      message: 'User unfollowed',
      is_following: false,
      followers_count: followersCount || 0
    });
  } catch (err) {
    console.error('unfollowUser error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Get followers of a user
 * GET /api/followers/:id
 */
const getFollowers = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { data, error, count } = await supabaseAdmin
      .from('followers')
      .select(`
        id, created_at,
        users!followers_follower_id_fkey (id, name, username, profile_image, bio)
      `, { count: 'exact' })
      .eq('following_id', id)
      .range(offset, offset + parseInt(limit) - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const followers = (data || []).map(f => f.users);

    return res.status(200).json({
      success: true,
      followers,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count }
    });
  } catch (err) {
    console.error('getFollowers error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Get users that a user is following
 * GET /api/following/:id
 */
const getFollowing = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { data, error, count } = await supabaseAdmin
      .from('followers')
      .select(`
        id, created_at,
        users!followers_following_id_fkey (id, name, username, profile_image, bio)
      `, { count: 'exact' })
      .eq('follower_id', id)
      .range(offset, offset + parseInt(limit) - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const following = (data || []).map(f => f.users);

    return res.status(200).json({
      success: true,
      following,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count }
    });
  } catch (err) {
    console.error('getFollowing error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { followUser, unfollowUser, getFollowers, getFollowing };
