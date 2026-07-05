/**
 * Post Controller
 * Handles creating, reading, updating, and deleting posts
 */

const { validationResult } = require('express-validator');
const { supabaseAdmin } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all posts (feed)
 * GET /api/posts
 */
const getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, userId } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabaseAdmin
      .from('posts')
      .select(`
        id, content, image, created_at, updated_at,
        user_id,
        users!posts_user_id_fkey (id, name, username, profile_image)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: posts, error, count } = await query;
    if (error) throw error;

    // Enrich posts with like/comment counts and user like status
    const enrichedPosts = await Promise.all(posts.map(async (post) => {
      const [{ count: likesCount }, { count: commentsCount }] = await Promise.all([
        supabaseAdmin.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
        supabaseAdmin.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id)
      ]);

      let userLiked = false;
      if (req.session.userId) {
        const { data: likeRecord } = await supabaseAdmin
          .from('likes')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', req.session.userId)
          .single();
        userLiked = !!likeRecord;
      }

      return {
        ...post,
        likes_count: likesCount || 0,
        comments_count: commentsCount || 0,
        user_liked: userLiked
      };
    }));

    return res.status(200).json({
      success: true,
      posts: enrichedPosts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        hasMore: offset + parseInt(limit) < count
      }
    });
  } catch (err) {
    console.error('getPosts error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Get single post by ID
 * GET /api/posts/:id
 */
const getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .select(`
        id, content, image, created_at, updated_at, user_id,
        users!posts_user_id_fkey (id, name, username, profile_image)
      `)
      .eq('id', id)
      .single();

    if (error || !post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const [{ count: likesCount }, { count: commentsCount }] = await Promise.all([
      supabaseAdmin.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', id),
      supabaseAdmin.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', id)
    ]);

    let userLiked = false;
    if (req.session.userId) {
      const { data: likeRecord } = await supabaseAdmin
        .from('likes').select('id').eq('post_id', id).eq('user_id', req.session.userId).single();
      userLiked = !!likeRecord;
    }

    return res.status(200).json({
      success: true,
      post: { ...post, likes_count: likesCount || 0, comments_count: commentsCount || 0, user_liked: userLiked }
    });
  } catch (err) {
    console.error('getPostById error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Create a new post
 * POST /api/posts
 */
const createPost = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { content } = req.body;
    const userId = req.session.userId;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Post content is required' });
    }

    if (content.length > 500) {
      return res.status(400).json({ success: false, message: 'Post content exceeds 500 characters' });
    }

    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/posts/${req.file.filename}`;
    }

    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .insert([{
        id: uuidv4(),
        user_id: userId,
        content: content.trim(),
        image: imagePath
      }])
      .select(`
        id, content, image, created_at, updated_at, user_id,
        users!posts_user_id_fkey (id, name, username, profile_image)
      `)
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post: { ...post, likes_count: 0, comments_count: 0, user_liked: false }
    });
  } catch (err) {
    console.error('createPost error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Update a post
 * PUT /api/posts/:id
 */
const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    // Check ownership
    const { data: existingPost } = await supabaseAdmin
      .from('posts').select('user_id, image').eq('id', id).single();

    if (!existingPost) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (existingPost.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { content } = req.body;
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Post content is required' });
    }

    const updateData = {
      content: content.trim(),
      updated_at: new Date().toISOString()
    };

    if (req.file) {
      updateData.image = `/uploads/posts/${req.file.filename}`;
    }

    const { data: updatedPost, error } = await supabaseAdmin
      .from('posts')
      .update(updateData)
      .eq('id', id)
      .select(`
        id, content, image, created_at, updated_at, user_id,
        users!posts_user_id_fkey (id, name, username, profile_image)
      `)
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'Post updated successfully',
      post: updatedPost
    });
  } catch (err) {
    console.error('updatePost error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Delete a post
 * DELETE /api/posts/:id
 */
const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    const { data: existingPost } = await supabaseAdmin
      .from('posts').select('user_id').eq('id', id).single();

    if (!existingPost) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (existingPost.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { error } = await supabaseAdmin.from('posts').delete().eq('id', id);
    if (error) throw error;

    return res.status(200).json({ success: true, message: 'Post deleted successfully' });
  } catch (err) {
    console.error('deletePost error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { getPosts, getPostById, createPost, updatePost, deletePost };
