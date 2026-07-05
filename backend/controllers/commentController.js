/**
 * Comment Controller
 * Handles creating, reading, updating, and deleting comments
 */

const { supabaseAdmin } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

/**
 * Get comments for a post
 * GET /api/comments/:postId
 */
const getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { data: comments, error, count } = await supabaseAdmin
      .from('comments')
      .select(`
        id, comment, created_at, updated_at, user_id, post_id,
        users!comments_user_id_fkey (id, name, username, profile_image)
      `, { count: 'exact' })
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      comments: comments || [],
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count }
    });
  } catch (err) {
    console.error('getComments error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Add a comment
 * POST /api/comments
 */
const addComment = async (req, res) => {
  try {
    const { postId, comment } = req.body;
    const userId = req.session.userId;

    if (!postId || !comment || comment.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Post ID and comment are required' });
    }

    if (comment.length > 300) {
      return res.status(400).json({ success: false, message: 'Comment exceeds 300 characters' });
    }

    // Verify post exists
    const { data: post } = await supabaseAdmin.from('posts').select('id, user_id').eq('id', postId).single();
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const { data: newComment, error } = await supabaseAdmin
      .from('comments')
      .insert([{ id: uuidv4(), post_id: postId, user_id: userId, comment: comment.trim() }])
      .select(`
        id, comment, created_at, updated_at, user_id, post_id,
        users!comments_user_id_fkey (id, name, username, profile_image)
      `)
      .single();

    if (error) throw error;

    // Create notification for post owner
    if (post.user_id !== userId) {
      await supabaseAdmin.from('notifications').insert([{
        id: uuidv4(),
        sender_id: userId,
        receiver_id: post.user_id,
        type: 'comment',
        reference_id: newComment.id,
        is_read: false
      }]);
    }

    // Get updated comment count
    const { count: commentsCount } = await supabaseAdmin
      .from('comments').select('*', { count: 'exact', head: true }).eq('post_id', postId);

    return res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment: newComment,
      comments_count: commentsCount || 0
    });
  } catch (err) {
    console.error('addComment error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Update a comment
 * PUT /api/comments/:id
 */
const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.session.userId;

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Comment cannot be empty' });
    }

    const { data: existing } = await supabaseAdmin.from('comments').select('user_id').eq('id', id).single();
    if (!existing) return res.status(404).json({ success: false, message: 'Comment not found' });
    if (existing.user_id !== userId) return res.status(403).json({ success: false, message: 'Unauthorized' });

    const { data: updated, error } = await supabaseAdmin
      .from('comments')
      .update({ comment: comment.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        id, comment, created_at, updated_at, user_id, post_id,
        users!comments_user_id_fkey (id, name, username, profile_image)
      `)
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, message: 'Comment updated', comment: updated });
  } catch (err) {
    console.error('updateComment error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Delete a comment
 * DELETE /api/comments/:id
 */
const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    const { data: existing } = await supabaseAdmin.from('comments').select('user_id').eq('id', id).single();
    if (!existing) return res.status(404).json({ success: false, message: 'Comment not found' });
    if (existing.user_id !== userId) return res.status(403).json({ success: false, message: 'Unauthorized' });

    const { error } = await supabaseAdmin.from('comments').delete().eq('id', id);
    if (error) throw error;

    return res.status(200).json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    console.error('deleteComment error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { getComments, addComment, updateComment, deleteComment };
