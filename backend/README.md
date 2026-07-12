# 🌐 PulseFeed – Full Stack Social Media Platform

<div align="center">

![PulseFeed Banner](https://via.placeholder.com/1200x400/6c63ff/ffffff?text=PulseFeed+Social+Media+Platform)

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express)](https://expressjs.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

**A production-ready, internship-quality Full Stack Social Media Platform**

[Live Demo](#) · [Report Bug](#) · [Request Feature](#)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Screenshots](#screenshots)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Supabase Setup](#supabase-setup)
- [Running the Project](#running-the-project)
- [API Documentation](#api-documentation)
- [Future Enhancements](#future-enhancements)
- [Deployment Guide](#deployment-guide)
- [License](#license)
- [Author](#author)

---

## 🚀 Overview

**PulseFeed** is a modern, full-stack social media platform built as an internship-level project. It delivers a complete social media experience with user authentication, post creation, real-time-like interactions, follow systems, notifications, search, and a fully responsive UI — without any frontend frameworks.

Built with:
- **Pure HTML5, CSS3, Vanilla JavaScript (ES6+)**
- **Node.js + Express.js (MVC Architecture)**
- **Supabase PostgreSQL** as the database
- **Glassmorphism + Modern Design System**

---

## ✨ Features

### 🔐 Authentication
- [x] Register with name, username, email, password
- [x] Secure login with bcrypt password hashing
- [x] Session management with express-session
- [x] Protected routes — redirect to login if not authenticated
- [x] Input validation with express-validator
- [x] Email & username uniqueness enforcement
- [x] Password strength meter
- [x] Logout

### 👤 User Profile
- [x] View profile page (your own and others')
- [x] Profile picture upload
- [x] Cover image support
- [x] Editable: name, bio, website, location
- [x] Followers / Following counts
- [x] Post count
- [x] Join date
- [x] Profile completion indicator

### 📝 Posts
- [x] Create posts (text + optional image)
- [x] Edit and delete own posts
- [x] Character counter (500 limit)
- [x] Image upload and preview
- [x] Infinite scroll feed
- [x] Hashtag and mention formatting
- [x] Time-ago timestamps
- [x] Copy post link

### 💬 Comments
- [x] Add comments to posts
- [x] Edit own comments (inline)
- [x] Delete own comments
- [x] Live comment count update
- [x] Auto-resizing textarea

### ❤️ Likes
- [x] Like / unlike posts
- [x] Optimistic UI update
- [x] Live like counter
- [x] Duplicate like prevention (database constraint)

### 👥 Follow System
- [x] Follow / unfollow users
- [x] Followers list
- [x] Following list
- [x] Suggested users widget
- [x] Follow notification

### 🔍 Search & Explore
- [x] Search users (by name/username)
- [x] Search posts (by content)
- [x] Live search suggestions in header
- [x] Explore page with user grid
- [x] Trending tags widget

### 🔔 Notifications
- [x] Like notification
- [x] Comment notification
- [x] Follow notification
- [x] Unread notification badge
- [x] Mark all as read

### 🎨 UI/UX Features
- [x] Dark Mode / Light Mode with persistence
- [x] Glassmorphism design
- [x] Skeleton loading screens
- [x] Toast notification system
- [x] Confirm delete modals
- [x] Dropdown menus
- [x] Back to top button
- [x] Floating Action Button (mobile)
- [x] Responsive layout (Desktop / Tablet / Mobile)
- [x] Mobile bottom navigation
- [x] Smooth animations and transitions
- [x] Custom scrollbar
- [x] Image lazy loading
- [x] Empty state pages
- [x] 404 error page
- [x] Font size preference

---

## 📸 Screenshots

| Landing Page | Feed | Profile |
|---|---|---|
| ![Landing](https://via.placeholder.com/360x220/6c63ff/fff?text=Landing) | ![Feed](https://via.placeholder.com/360x220/6c63ff/fff?text=Feed) | ![Profile](https://via.placeholder.com/360x220/6c63ff/fff?text=Profile) |

| Explore | Settings | Mobile |
|---|---|---|
| ![Explore](https://via.placeholder.com/360x220/6c63ff/fff?text=Explore) | ![Settings](https://via.placeholder.com/360x220/6c63ff/fff?text=Settings) | ![Mobile](https://via.placeholder.com/360x220/6c63ff/fff?text=Mobile) |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| Backend | Node.js, Express.js |
| Architecture | MVC (Models, Views, Controllers) |
| Database | Supabase PostgreSQL |
| Auth | express-session, bcryptjs |
| Security | helmet, cors, express-validator, cookie-parser |
| File Uploads | multer |
| Environment | dotenv |

---

## 📁 Folder Structure

```
social-media-platform/
├── backend/
│   ├── config/
│   │   ├── supabase.js          # Supabase client setup
│   │   └── multer.js            # File upload config
│   ├── controllers/
│   │   ├── authController.js    # Register, login, logout
│   │   ├── userController.js    # User CRUD
│   │   ├── postController.js    # Post CRUD
│   │   ├── commentController.js # Comment CRUD
│   │   ├── likeController.js    # Like/Unlike
│   │   ├── followController.js  # Follow/Unfollow
│   │   ├── searchController.js  # Search
│   │   └── notificationController.js
│   ├── middleware/
│   │   ├── auth.js              # requireAuth, optionalAuth
│   │   ├── validation.js        # express-validator rules
│   │   └── errorHandler.js      # Global error handler
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── postRoutes.js
│   │   ├── commentRoutes.js
│   │   ├── likeRoutes.js
│   │   ├── followRoutes.js
│   │   ├── searchRoutes.js
│   │   └── notificationRoutes.js
│   ├── uploads/
│   │   ├── profiles/            # Profile images
│   │   └── posts/               # Post images
│   ├── server.js                # Entry point
│   ├── schema.sql               # Database schema + seed data
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── css/
    │   └── style.css            # Complete design system
    ├── js/
    │   ├── utils.js             # Shared utilities
    │   └── feed.js              # Feed page logic
    ├── index.html               # Landing page
    ├── login.html               # Login page
    ├── register.html            # Registration page
    ├── feed.html                # Main feed
    ├── profile.html             # User profile
    ├── explore.html             # Explore/Search page
    ├── settings.html            # Account settings
    └── 404.html                 # Error page
```

---

## 🚦 Getting Started

### Prerequisites

- Node.js v18 or higher
- npm v9 or higher
- A free [Supabase](https://supabase.com) account

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/social-media-platform.git
cd social-media-platform

# 2. Install backend dependencies
cd backend
npm install

# 3. Create environment file
cp .env.example .env
```

---

## ⚙️ Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server
PORT=5000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Session
SESSION_SECRET=your-very-long-random-secret-key-here

# CORS
CLIENT_URL=http://localhost:5000

# File Upload
MAX_FILE_SIZE=5242880
```

---

## 🗄️ Supabase Setup

### 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up
2. Click **New Project**
3. Choose your organization, name, and database password
4. Select your region and click **Create new project**

### 2. Get Your API Keys
1. In your project dashboard, go to **Settings → API**
2. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_ANON_KEY`
   - **service_role/secret key** → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Import the Database Schema
1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `backend/schema.sql`
4. Paste it into the editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see: `Schema created successfully! Users: 5, Posts: 7, Followers: 6`

### 4. Verify Tables
Go to **Table Editor** to verify these tables were created:
- `users`
- `posts`
- `comments`
- `likes`
- `followers`
- `notifications`

---

## ▶️ Running the Project

```bash
# Development mode (with auto-restart)
cd backend
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

**Default seed accounts (password: `Password123`):**
| Name | Username | Email |
|------|----------|-------|
| Alex Johnson | alexjohnson | alex@example.com |
| Sarah Williams | sarahwilliams | sarah@example.com |
| Michael Chen | michaelchen | michael@example.com |

---

## 📡 API Documentation

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/register` | Create new account | No |
| POST | `/api/login` | Login with email/password | No |
| POST | `/api/logout` | Log out | Yes |
| GET | `/api/me` | Get current user | Yes |

### Users

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/users` | Get all users (paginated) | Yes |
| GET | `/api/users/suggested` | Get suggested users | Yes |
| GET | `/api/users/:id` | Get user by ID | Optional |
| PUT | `/api/users/:id` | Update profile | Yes (own) |
| PUT | `/api/users/:id/password` | Change password | Yes (own) |

### Posts

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/posts` | Get feed (paginated) | Optional |
| GET | `/api/posts/:id` | Get single post | Optional |
| POST | `/api/posts` | Create post | Yes |
| PUT | `/api/posts/:id` | Edit post | Yes (own) |
| DELETE | `/api/posts/:id` | Delete post | Yes (own) |

### Comments

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/comments/:postId` | Get comments for post | Optional |
| POST | `/api/comments` | Add comment | Yes |
| PUT | `/api/comments/:id` | Edit comment | Yes (own) |
| DELETE | `/api/comments/:id` | Delete comment | Yes (own) |

### Likes

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/like` | Like a post | Yes |
| DELETE | `/api/like` | Unlike a post | Yes |

### Follow

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/follow` | Follow a user | Yes |
| DELETE | `/api/follow` | Unfollow a user | Yes |
| GET | `/api/follow/followers/:id` | Get user's followers | No |
| GET | `/api/follow/following/:id` | Get user's following | No |

### Search

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/search/users?q=query` | Search users | Optional |
| GET | `/api/search/posts?q=query` | Search posts | Optional |

### Notifications

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/notifications` | Get notifications | Yes |
| PUT | `/api/notifications/read` | Mark all as read | Yes |

---

## 🔮 Future Enhancements

- [ ] Real-time messaging (WebSockets)
- [ ] Stories feature
- [ ] Video post support
- [ ] Post scheduling
- [ ] Advanced analytics dashboard
- [ ] Two-factor authentication (2FA)
- [ ] OAuth (Google, GitHub login)
- [ ] Email verification
- [ ] Push notifications (Web Push API)
- [ ] Bookmark/Save posts (persisted)
- [ ] Post tagging
- [ ] Polls in posts
- [ ] Live streaming
- [ ] Progressive Web App (PWA)

---

## 🚀 Deployment Guide

### Deploy to Railway

1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add environment variables in Railway dashboard
4. Set `NODE_ENV=production`
5. Deploy!

### Deploy to Render

1. Go to [render.com](https://render.com) → New Web Service
2. Connect your GitHub repo
3. Set **Root Directory** to `backend`
4. Set **Build Command**: `npm install`
5. Set **Start Command**: `npm start`
6. Add all environment variables
7. Deploy!

### Deploy to Heroku

```bash
# Login and create app
heroku login
heroku create your-socialsphere-app

# Set environment variables
heroku config:set SUPABASE_URL=your_url
heroku config:set SUPABASE_ANON_KEY=your_key
heroku config:set SUPABASE_SERVICE_ROLE_KEY=your_service_key
heroku config:set SESSION_SECRET=your_secret
heroku config:set NODE_ENV=production

# Deploy
git push heroku main
```

### Important for Production

- Set `SESSION_SECRET` to a long, random string
- Set `NODE_ENV=production`
- Set `CLIENT_URL` to your frontend domain
- Set `secure: true` for cookies (HTTPS required)
- Use a CDN for static file serving

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## 👨‍💻 Author

**Social Media Platform**
- Built as a Full Stack Internship Project
- Technologies: Node.js, Express.js, Supabase PostgreSQL, Vanilla JS
- Design: Modern Glassmorphism Social Media UI

---

<div align="center">
  Made with ❤️ by a passionate full-stack developer
  <br />
  <strong>Star ⭐ this repo if you found it helpful!</strong>
</div>
