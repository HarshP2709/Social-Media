/**
 * Like Controller
 * Handles liking and unliking posts
 */

const { supabaseAdmin } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

/**
 * Like a post
 * POST /api/like
 */
const likePost = async (req, res) => {
  try {
    const { postId } = req.body;
    const userId = req.session.userId;

    if (!postId) {
      return res.status(400).json({ success: false, message: 'Post ID is required' });
    }

    // Verify post exists
    const { data: post } = await supabaseAdmin.from('posts').select('id, user_id').eq('id', postId).single();
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    // Check if already liked
    const { data: existingLike } = await supabaseAdmin
      .from('likes').select('id').eq('post_id', postId).eq('user_id', userId).single();

    if (existingLike) {
      return res.status(409).json({ success: false, message: 'Already liked this post' });
    }

    // Add like
    const { error } = await supabaseAdmin
      .from('likes')
      .insert([{ id: uuidv4(), post_id: postId, user_id: userId }]);

    if (error) throw error;

    // Create notification for post owner
    if (post.user_id !== userId) {
      await supabaseAdmin.from('notifications').insert([{
        id: uuidv4(),
        sender_id: userId,
        receiver_id: post.user_id,
        type: 'like',
        reference_id: postId,
        is_read: false
      }]);
    }

    // Get updated count
    const { count: likesCount } = await supabaseAdmin
      .from('likes').select('*', { count: 'exact', head: true }).eq('post_id', postId);

    return res.status(201).json({
      success: true,
      message: 'Post liked',
      likes_count: likesCount || 0,
      user_liked: true
    });
  } catch (err) {
    console.error('likePost error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Unlike a post
 * DELETE /api/like
 */
const unlikePost = async (req, res) => {
  try {
    const { postId } = req.body;
    const userId = req.session.userId;

    if (!postId) {
      return res.status(400).json({ success: false, message: 'Post ID is required' });
    }

    const { error } = await supabaseAdmin
      .from('likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) throw error;

    const { count: likesCount } = await supabaseAdmin
      .from('likes').select('*', { count: 'exact', head: true }).eq('post_id', postId);

    return res.status(200).json({
      success: true,
      message: 'Post unliked',
      likes_count: likesCount || 0,
      user_liked: false
    });
  } catch (err) {
    console.error('unlikePost error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { likePost, unlikePost };
