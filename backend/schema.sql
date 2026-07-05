-- ============================================================
-- Social Media Platform - Supabase PostgreSQL Schema
-- Compatible with Supabase SQL Editor
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- DROP TABLES (for clean re-runs)
-- ============================================================
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS followers CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL,
    username    VARCHAR(50) UNIQUE NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    profile_image TEXT DEFAULT NULL,
    cover_image   TEXT DEFAULT NULL,
    bio         VARCHAR(160) DEFAULT NULL,
    website     VARCHAR(200) DEFAULT NULL,
    location    VARCHAR(100) DEFAULT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_created  ON users(created_at DESC);

-- ============================================================
-- POSTS TABLE
-- ============================================================
CREATE TABLE posts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL CHECK (char_length(content) <= 500),
    image       TEXT DEFAULT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for posts
CREATE INDEX idx_posts_user_id  ON posts(user_id);
CREATE INDEX idx_posts_created  ON posts(created_at DESC);

-- ============================================================
-- COMMENTS TABLE
-- ============================================================
CREATE TABLE comments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment     TEXT NOT NULL CHECK (char_length(comment) <= 300),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for comments
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_created ON comments(created_at ASC);

-- ============================================================
-- LIKES TABLE
-- ============================================================
CREATE TABLE likes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(post_id, user_id)  -- Prevent duplicate likes
);

-- Indexes for likes
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);

-- ============================================================
-- FOLLOWERS TABLE
-- ============================================================
CREATE TABLE followers (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(follower_id, following_id),           -- Prevent duplicate follows
    CHECK (follower_id <> following_id)           -- Prevent self-follows
);

-- Indexes for followers
CREATE INDEX idx_followers_follower_id  ON followers(follower_id);
CREATE INDEX idx_followers_following_id ON followers(following_id);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE notifications (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type         VARCHAR(50) NOT NULL CHECK (type IN ('like', 'comment', 'follow')),
    reference_id UUID DEFAULT NULL,
    is_read      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX idx_notifications_receiver_id ON notifications(receiver_id);
CREATE INDEX idx_notifications_is_read     ON notifications(is_read);
CREATE INDEX idx_notifications_created     ON notifications(created_at DESC);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to users
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Attach trigger to posts
CREATE TRIGGER trigger_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Attach trigger to comments
CREATE TRIGGER trigger_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- DISABLE ROW LEVEL SECURITY (For server-side access)
-- The backend uses the service role key which bypasses RLS.
-- Enable RLS only if you add frontend direct DB access.
-- ============================================================
ALTER TABLE users         DISABLE ROW LEVEL SECURITY;
ALTER TABLE posts         DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments      DISABLE ROW LEVEL SECURITY;
ALTER TABLE likes         DISABLE ROW LEVEL SECURITY;
ALTER TABLE followers     DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- SEED DATA - Sample Users
-- Passwords are bcrypt hashes of "Password123"
-- ============================================================

INSERT INTO users (id, name, username, email, password, bio, location, website) VALUES
(
    uuid_generate_v4(),
    'Alex Johnson',
    'alexjohnson',
    'alex@example.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj1vMkLNtTkC',
    'Software engineer & coffee enthusiast ☕ | Building cool things',
    'San Francisco, CA',
    'https://alexjohnson.dev'
),
(
    uuid_generate_v4(),
    'Sarah Williams',
    'sarahwilliams',
    'sarah@example.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj1vMkLNtTkC',
    'Designer & creator 🎨 | Passionate about beautiful interfaces',
    'New York, NY',
    'https://sarahdesigns.io'
),
(
    uuid_generate_v4(),
    'Michael Chen',
    'michaelchen',
    'michael@example.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj1vMkLNtTkC',
    'Full-stack developer 💻 | Open source contributor',
    'Seattle, WA',
    'https://github.com/michaelchen'
),
(
    uuid_generate_v4(),
    'Emma Davis',
    'emmadavis',
    'emma@example.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj1vMkLNtTkC',
    'Product Manager at TechCorp | Building products users love 🚀',
    'Austin, TX',
    'https://emmadavis.com'
),
(
    uuid_generate_v4(),
    'James Wilson',
    'jameswilson',
    'james@example.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj1vMkLNtTkC',
    'DevOps Engineer | Cloud & Kubernetes enthusiast ☁️',
    'Chicago, IL',
    NULL
);

-- ============================================================
-- SEED DATA - Sample Posts (using subquery for user IDs)
-- ============================================================

INSERT INTO posts (user_id, content) VALUES
(
    (SELECT id FROM users WHERE username = 'alexjohnson'),
    'Just shipped a new feature! The new infinite scroll on the feed is now live 🚀 What do you all think? #webdev #javascript'
),
(
    (SELECT id FROM users WHERE username = 'sarahwilliams'),
    'Working on some new UI designs today. Glassmorphism is still my favorite design trend ✨ #design #ux #ui'
),
(
    (SELECT id FROM users WHERE username = 'michaelchen'),
    'Supabase is absolutely amazing for rapid development. Just set up a full PostgreSQL backend in under 10 minutes! #supabase #postgresql #backend'
),
(
    (SELECT id FROM users WHERE username = 'emmadavis'),
    'Great product meeting today! We are launching something big next month. Stay tuned! 🎉 #product #startup'
),
(
    (SELECT id FROM users WHERE username = 'jameswilson'),
    'Kubernetes tip of the day: Always set resource limits on your containers to prevent resource starvation in your cluster 💡 #kubernetes #devops'
),
(
    (SELECT id FROM users WHERE username = 'alexjohnson'),
    'Beautiful morning for a run 🏃‍♂️ Sometimes stepping away from the keyboard is the best thing for your productivity.'
),
(
    (SELECT id FROM users WHERE username = 'sarahwilliams'),
    'Just finished my new portfolio redesign! Took inspiration from modern social media platforms. What do you think? #portfolio #design'
);

-- ============================================================
-- SEED DATA - Sample Followers
-- ============================================================

INSERT INTO followers (follower_id, following_id) VALUES
(
    (SELECT id FROM users WHERE username = 'alexjohnson'),
    (SELECT id FROM users WHERE username = 'sarahwilliams')
),
(
    (SELECT id FROM users WHERE username = 'alexjohnson'),
    (SELECT id FROM users WHERE username = 'michaelchen')
),
(
    (SELECT id FROM users WHERE username = 'sarahwilliams'),
    (SELECT id FROM users WHERE username = 'alexjohnson')
),
(
    (SELECT id FROM users WHERE username = 'michaelchen'),
    (SELECT id FROM users WHERE username = 'alexjohnson')
),
(
    (SELECT id FROM users WHERE username = 'emmadavis'),
    (SELECT id FROM users WHERE username = 'alexjohnson')
),
(
    (SELECT id FROM users WHERE username = 'jameswilson'),
    (SELECT id FROM users WHERE username = 'michaelchen')
);

-- ============================================================
-- SEED DATA - Sample Likes
-- ============================================================

INSERT INTO likes (post_id, user_id)
SELECT p.id, u.id
FROM posts p, users u
WHERE p.user_id != u.id
  AND u.username = 'sarahwilliams'
  AND p.user_id = (SELECT id FROM users WHERE username = 'alexjohnson')
LIMIT 2;

INSERT INTO likes (post_id, user_id)
SELECT p.id, u.id
FROM posts p, users u
WHERE p.user_id != u.id
  AND u.username = 'alexjohnson'
  AND p.user_id = (SELECT id FROM users WHERE username = 'sarahwilliams')
LIMIT 1;

-- ============================================================
-- SEED DATA - Sample Comments
-- ============================================================

INSERT INTO comments (post_id, user_id, comment)
SELECT
    (SELECT id FROM posts WHERE content LIKE '%infinite scroll%' LIMIT 1),
    (SELECT id FROM users WHERE username = 'sarahwilliams'),
    'This is awesome! The scroll is super smooth 👏';

INSERT INTO comments (post_id, user_id, comment)
SELECT
    (SELECT id FROM posts WHERE content LIKE '%infinite scroll%' LIMIT 1),
    (SELECT id FROM users WHERE username = 'michaelchen'),
    'Great work! How did you handle the intersection observer API?';

INSERT INTO comments (post_id, user_id, comment)
SELECT
    (SELECT id FROM posts WHERE content LIKE '%Supabase%' LIMIT 1),
    (SELECT id FROM users WHERE username = 'alexjohnson'),
    'Agreed! Supabase + Node.js is such a powerful combo 🔥';

-- ============================================================
-- VERIFICATION QUERIES (optional - run to verify data)
-- ============================================================
-- SELECT COUNT(*) FROM users;    -- Should return 5
-- SELECT COUNT(*) FROM posts;    -- Should return 7
-- SELECT COUNT(*) FROM followers; -- Should return 6
-- SELECT COUNT(*) FROM likes;    -- Should return some likes
-- SELECT COUNT(*) FROM comments; -- Should return 3

SELECT 'Schema created successfully! Users: ' || (SELECT COUNT(*) FROM users)::TEXT || 
       ', Posts: ' || (SELECT COUNT(*) FROM posts)::TEXT ||
       ', Followers: ' || (SELECT COUNT(*) FROM followers)::TEXT AS status;
