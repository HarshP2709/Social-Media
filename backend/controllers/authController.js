/**
 * Authentication Controller
 * Uses Supabase Auth for identity management.
 * public.users profile is created automatically via the DB trigger.
 */

const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { supabase, supabaseAdmin } = require('../config/supabase');

/* ─────────────────────────────────────────────────────────────────
   REGISTER
   POST /api/register
   Flow:
     1. Validate input
     2. Check username uniqueness (public.users)
     3. supabase.auth.signUp()  ← creates auth.users row
     4. DB trigger auto-inserts into public.users
     5. Patch the profile with name / username / bcrypt password
     6. Set session and return user object
───────────────────────────────────────────────────────────────── */
const register = async (req, res) => {
  try {
    // 1. Validate
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const { name, username, email, password } = req.body;
    const cleanEmail    = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();
    const cleanName     = name.trim();

    // 2. Check username availability
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Username already taken'
      });
    }

    // 3. Create auth account via Admin API (bypasses email confirmation)
    //    The Admin API creates a confirmed user immediately.
    //    Pass name + username in user_metadata so the DB trigger can use them.
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email:          cleanEmail,
      password,
      email_confirm:  true,           // ← confirm immediately, no email required
      user_metadata: {
        name:     cleanName,
        username: cleanUsername
      }
    });

    if (authError) {
      console.error('Supabase auth.signUp error:', authError);

      // Translate common Supabase auth errors to friendly messages
      const msg = authError.message || '';
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }
      if (msg.includes('invalid') && msg.includes('email')) {
        return res.status(400).json({ success: false, message: 'Invalid email address' });
      }
      if (msg.includes('Password')) {
        return res.status(400).json({ success: false, message: msg });
      }
      return res.status(500).json({ success: false, message: 'Could not create account. Please try again.' });
    }

    if (!authData?.user?.id) {
      return res.status(500).json({ success: false, message: 'Account creation failed – no user returned.' });
    }

    const authUserId = authData.user.id;

    // 4. The DB trigger has already inserted a skeleton row into public.users.
    //    Give it a moment to complete (triggers are synchronous in PG,
    //    but the Supabase client may return before the transaction fully commits
    //    on some edge-function environments).
    await new Promise(r => setTimeout(r, 300));

    // 5. Patch the profile row with full name, username and bcrypt hash
    //    (bcrypt hash kept for the custom session-login flow below)
    const saltRounds   = 10;
    const hashedPwd    = await bcrypt.hash(password, saltRounds);

    const { data: profile, error: patchError } = await supabaseAdmin
      .from('users')
      .update({
        name:     cleanName,
        username: cleanUsername,
        email:    cleanEmail,
        password: hashedPwd,
        updated_at: new Date().toISOString()
      })
      .eq('id', authUserId)
      .select('id, name, username, email, profile_image, created_at')
      .single();

    if (patchError || !profile) {
      console.error('Profile patch error:', patchError);
      // The auth user was created but the profile patch failed.
      // Clean up the orphaned auth user so they can try again.
      await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => {});
      return res.status(500).json({
        success: false,
        message: 'Account created but profile setup failed. Please try again.'
      });
    }

    // 6. Set session
    req.session.userId   = profile.id;
    req.session.username = profile.username;

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      user: {
        id:            profile.id,
        name:          profile.name,
        username:      profile.username,
        email:         profile.email,
        profile_image: profile.profile_image
      }
    });

  } catch (err) {
    console.error('Register controller error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ─────────────────────────────────────────────────────────────────
   LOGIN
   POST /api/login
   Flow:
     1. Find user in public.users by email
     2. Compare bcrypt password stored in public.users
     3. Set session
───────────────────────────────────────────────────────────────── */
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Fetch user including hashed password
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, name, username, email, password, profile_image, cover_image, bio')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('Login DB error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Compare password
    if (!user.password) {
      // Edge case: user registered via OAuth or trigger without a password hash
      return res.status(401).json({ success: false, message: 'Please reset your password to log in.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Set session
    req.session.userId   = user.id;
    req.session.username = user.username;

    return res.status(200).json({
      success: true,
      message: 'Login successful!',
      user: {
        id:            user.id,
        name:          user.name,
        username:      user.username,
        email:         user.email,
        profile_image: user.profile_image,
        cover_image:   user.cover_image,
        bio:           user.bio
      }
    });

  } catch (err) {
    console.error('Login controller error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ─────────────────────────────────────────────────────────────────
   LOGOUT  –  POST /api/logout
───────────────────────────────────────────────────────────────── */
const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Could not log out. Please try again.' });
      }
      res.clearCookie('connect.sid');
      return res.status(200).json({ success: true, message: 'Logged out successfully' });
    });
  } catch (err) {
    console.error('Logout controller error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ─────────────────────────────────────────────────────────────────
   GET ME  –  GET /api/me
───────────────────────────────────────────────────────────────── */
const getMe = async (req, res) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, name, username, email, profile_image, cover_image, bio, website, location, created_at')
      .eq('id', req.session.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const [{ count: followersCount }, { count: followingCount }, { count: postsCount }] =
      await Promise.all([
        supabaseAdmin.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
        supabaseAdmin.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id',  user.id),
        supabaseAdmin.from('posts')    .select('*', { count: 'exact', head: true }).eq('user_id',      user.id)
      ]);

    return res.status(200).json({
      success: true,
      user: {
        ...user,
        followers_count: followersCount || 0,
        following_count: followingCount || 0,
        posts_count:     postsCount     || 0
      }
    });

  } catch (err) {
    console.error('GetMe controller error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { register, login, logout, getMe };
