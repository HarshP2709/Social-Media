/**
 * User Controller
 * Handles user profile management, search, and user data
 */

const { validationResult } = require('express-validator');
const { supabaseAdmin } = require('../config/supabase');
const path = require('path');
const fs = require('fs');

/**
 * Get all users
 * GET /api/users
 */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const currentUserId = req.session.userId;

    const { data: users, error, count } = await supabaseAdmin
      .from('users')
      .select('id, name, username, profile_image, bio, created_at', { count: 'exact' })
      .neq('id', currentUserId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch who the current user already follows so we can mark is_following
    const { data: following } = await supabaseAdmin
      .from('followers')
      .select('following_id')
      .eq('follower_id', currentUserId);

    const followingSet = new Set((following || []).map(f => f.following_id));

    const usersWithFollow = (users || []).map(u => ({
      ...u,
      is_following: followingSet.has(u.id)
    }));

    return res.status(200).json({
      success: true,
      users: usersWithFollow,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count
      }
    });
  } catch (err) {
    console.error('getAllUsers error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Get user by ID
 * GET /api/users/:id
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, name, username, email, profile_image, cover_image, bio, website, location, created_at')
      .eq('id', id)
      .single();

    if (error || !user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get counts
    const [{ count: followersCount }, { count: followingCount }, { count: postsCount }] = await Promise.all([
      supabaseAdmin.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', id),
      supabaseAdmin.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', id),
      supabaseAdmin.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', id)
    ]);

    // Check if current user follows this user
    let isFollowing = false;
    if (req.session.userId && req.session.userId !== id) {
      const { data: followRecord } = await supabaseAdmin
        .from('followers')
        .select('id')
        .eq('follower_id', req.session.userId)
        .eq('following_id', id)
        .single();
      isFollowing = !!followRecord;
    }

    return res.status(200).json({
      success: true,
      user: {
        ...user,
        followers_count: followersCount || 0,
        following_count: followingCount || 0,
        posts_count: postsCount || 0,
        is_following: isFollowing,
        is_own_profile: req.session.userId === id
      }
    });
  } catch (err) {
    console.error('getUserById error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Update user profile
 * PUT /api/users/:id
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Only allow users to update their own profile
    if (req.session.userId !== id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, bio, website, location } = req.body;
    const updateData = { updated_at: new Date().toISOString() };

    if (name !== undefined) updateData.name = name.trim();
    if (bio !== undefined) updateData.bio = bio.trim();
    if (website !== undefined) updateData.website = website.trim();
    if (location !== undefined) updateData.location = location.trim();

    // Handle profile image upload
    if (req.files && req.files.profile_image) {
      const file = req.files.profile_image[0];
      updateData.profile_image = `/uploads/profiles/${file.filename}`;
    } else if (req.file && req.uploadType === 'profile') {
      updateData.profile_image = `/uploads/profiles/${req.file.filename}`;
    }

    // Handle cover image upload
    if (req.files && req.files.cover_image) {
      const file = req.files.cover_image[0];
      updateData.cover_image = `/uploads/posts/${file.filename}`;
    }

    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, name, username, email, profile_image, cover_image, bio, website, location, created_at')
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (err) {
    console.error('updateUser error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Change user password
 * PUT /api/users/:id/password
 */
const changePassword = async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { id } = req.params;

    if (req.session.userId !== id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both passwords are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    // Get current password hash
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('password')
      .eq('id', id)
      .single();

    if (error || !user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await supabaseAdmin
      .from('users')
      .update({ password: hashedPassword, updated_at: new Date().toISOString() })
      .eq('id', id);

    return res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('changePassword error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Get suggested users
 * GET /api/users/suggested
 */
const getSuggestedUsers = async (req, res) => {
  try {
    const currentUserId = req.session.userId;

    // Get IDs of users already followed
    const { data: following } = await supabaseAdmin
      .from('followers')
      .select('following_id')
      .eq('follower_id', currentUserId);

    const followingIds = following ? following.map(f => f.following_id) : [];
    followingIds.push(currentUserId);

    // Build query — exclude self and already-followed users
    let query = supabaseAdmin
      .from('users')
      .select('id, name, username, profile_image, bio')
      .neq('id', currentUserId)
      .limit(5)
      .order('created_at', { ascending: false });

    // Only add the NOT IN filter when there are extra IDs (already-followed users)
    if (followingIds.length > 1) {
      query = query.not('id', 'in', `(${followingIds.join(',')})`);
    }

    const { data: users, error } = await query;

    if (error) throw error;

    return res.status(200).json({ success: true, users: users || [] });
  } catch (err) {
    console.error('getSuggestedUsers error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { getAllUsers, getUserById, updateUser, changePassword, getSuggestedUsers };
