/**
 * Feed Page JavaScript
 * Handles infinite scroll, post creation, likes, comments
 */

let currentUser = null;
let currentPage = 1;
let isLoading = false;
let hasMore = true;
const POSTS_PER_PAGE = 10;

// ─── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await loadCurrentUser();
  if (!currentUser) {
    window.location.href = '/login.html';
    return;
  }
  renderUserSidebar();
  loadFeed(true);
  loadSuggestedUsers();
  loadNotificationCount();
  initInfiniteScroll();
  initCreatePost();
  initSearch();
  initBackToTop();
  initThemeToggle();
  updateMobileNav('feed');

  // Close create post modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('createPostModal');
      if (modal && modal.classList.contains('show')) closeCreatePostModal();
    }
  });
});

// ─── Load Current User ────────────────────────────────────────
async function loadCurrentUser() {
  try {
    const { ok, data } = await apiFetch('/api/me');
    if (ok && data.success) {
      currentUser = data.user;
      return true;
    }
  } catch { }
  return false;
}

// ─── Render User Sidebar ──────────────────────────────────────
function renderUserSidebar() {
  const card = document.getElementById('sidebarUserCard');
  if (!card || !currentUser) return;

  const avatarSrc = currentUser.profile_image
    ? `<img src="${escapeHtml(currentUser.profile_image)}" alt="${escapeHtml(currentUser.name)}" class="user-avatar" />`
    : `<div class="avatar-placeholder" style="width:56px;height:56px;font-size:1.3rem;margin-bottom:12px;">${getInitials(currentUser.name)}</div>`;

  card.innerHTML = `
    <a href="/profile.html?id=${currentUser.id}">
      ${avatarSrc}
    </a>
    <a href="/profile.html?id=${currentUser.id}" class="user-name">${escapeHtml(currentUser.name)}</a>
    <div class="user-username">@${escapeHtml(currentUser.username)}</div>
    <div class="sidebar-user-stats">
      <div class="stat-item" onclick="window.location.href='/profile.html?id=${currentUser.id}&tab=posts'">
        <span class="stat-value">${formatNumber(currentUser.posts_count || 0)}</span>
        <span class="stat-label">Posts</span>
      </div>
      <div class="stat-item" onclick="window.location.href='/profile.html?id=${currentUser.id}&tab=followers'">
        <span class="stat-value">${formatNumber(currentUser.followers_count || 0)}</span>
        <span class="stat-label">Followers</span>
      </div>
      <div class="stat-item" onclick="window.location.href='/profile.html?id=${currentUser.id}&tab=following'">
        <span class="stat-value">${formatNumber(currentUser.following_count || 0)}</span>
        <span class="stat-label">Following</span>
      </div>
    </div>
  `;

  // Set header avatar
  const headerAvatar = document.getElementById('headerAvatar');
  if (headerAvatar) {
    if (currentUser.profile_image) {
      headerAvatar.src = currentUser.profile_image;
      headerAvatar.style.display = 'block';
    } else {
      headerAvatar.style.display = 'none';
      const wrap = headerAvatar.parentElement;
      if (wrap && !wrap.querySelector('.avatar-placeholder')) {
        const ph = document.createElement('div');
        ph.className = 'avatar-placeholder';
        ph.style.cssText = 'width:36px;height:36px;font-size:0.9rem;cursor:pointer;';
        ph.textContent = getInitials(currentUser.name);
        ph.onclick = () => window.location.href = `/profile.html?id=${currentUser.id}`;
        wrap.appendChild(ph);
      }
    }
  }

  // Profile completion
  const fields = ['bio', 'website', 'location', 'profile_image'];
  const filled = fields.filter(f => currentUser[f]).length;
  const pct = Math.round((filled / fields.length) * 100);
  const completion = document.getElementById('profileCompletion');
  if (completion) {
    document.getElementById('completionFill').style.width = pct + '%';
    document.getElementById('completionPct').textContent = pct + '%';
    document.getElementById('completionText').textContent = pct < 100 ? 'Complete your profile to attract more followers!' : 'Profile is complete! 🎉';
  }
}

// ─── Load Feed ────────────────────────────────────────────────
async function loadFeed(reset = false) {
  if (isLoading) return;
  if (!hasMore && !reset) return;

  if (reset) {
    currentPage = 1;
    hasMore = true;
    const feed = document.getElementById('feedContainer');
    if (feed) feed.innerHTML = skeletonPost().repeat(3);
  }

  isLoading = true;
  setFeedLoading(true);

  try {
    const { ok, data } = await apiFetch(`/api/posts?page=${currentPage}&limit=${POSTS_PER_PAGE}`);
    if (!ok || !data.success) throw new Error('Failed to load posts');

    const feed = document.getElementById('feedContainer');
    if (reset) feed.innerHTML = '';

    if (data.posts.length === 0 && reset) {
      feed.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-newspaper"></i>
          <h3>Your feed is empty</h3>
          <p>Follow some people or create your first post!</p>
          <a href="/explore.html" class="btn btn-primary">Explore Posts</a>
        </div>`;
      return;
    }

    data.posts.forEach(post => {
      const postEl = createPostElement(post);
      feed.appendChild(postEl);
    });

    hasMore = data.pagination.hasMore;
    currentPage++;

  } catch (err) {
    console.error('Feed error:', err);
    const feed = document.getElementById('feedContainer');
    if (feed && reset) {
      feed.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Could not load posts</h3><p>${escapeHtml(err.message)}</p><button class="btn btn-primary" onclick="loadFeed(true)">Try Again</button></div>`;
    }
  } finally {
    isLoading = false;
    setFeedLoading(false);
  }
}

function setFeedLoading(show) {
  const loader = document.getElementById('feedLoader');
  if (loader) loader.style.display = show ? 'flex' : 'none';
}

// ─── Create Post Element ──────────────────────────────────────
function createPostElement(post) {
  const div = document.createElement('div');
  div.className = 'post-card fade-in';
  div.id = `post-${post.id}`;

  const author = post.users || {};
  const isOwner = currentUser && post.user_id === currentUser.id;
  const avatarHtml = author.profile_image
    ? `<img src="${escapeHtml(author.profile_image)}" alt="${escapeHtml(author.name || '')}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--border-color);" loading="lazy" onerror="this.src=''" />`
    : `<div class="avatar-placeholder" style="width:44px;height:44px;font-size:1rem;">${getInitials(author.name)}</div>`;

  div.innerHTML = `
    <div class="post-header">
      <div class="post-author">
        <a href="/profile.html?id=${escapeHtml(post.user_id)}" style="display:flex;align-items:center;">${avatarHtml}</a>
        <div>
          <div class="post-author-name">
            <a href="/profile.html?id=${escapeHtml(post.user_id)}">${escapeHtml(author.name || 'Unknown')}</a>
          </div>
          <div class="post-author-meta">@${escapeHtml(author.username || '')} · ${timeAgo(post.created_at)}</div>
        </div>
      </div>
      ${isOwner ? `
        <div class="dropdown">
          <button class="post-menu-btn" onclick="toggleDropdown(this)"><i class="fas fa-ellipsis-h"></i></button>
          <div class="dropdown-menu">
            <div class="dropdown-item" onclick="openEditPostModal('${escapeHtml(post.id)}', \`${escapeHtml(post.content).replace(/`/g,'\\`')}\`)">
              <i class="fas fa-edit"></i> Edit Post
            </div>
            <div class="dropdown-item danger" onclick="deletePost('${escapeHtml(post.id)}')">
              <i class="fas fa-trash"></i> Delete Post
            </div>
            <div class="dropdown-item" onclick="copyToClipboard(window.location.origin+'/feed.html#post-${escapeHtml(post.id)}')">
              <i class="fas fa-link"></i> Copy Link
            </div>
          </div>
        </div>
      ` : `
        <button class="post-menu-btn" onclick="copyToClipboard(window.location.origin+'/feed.html#post-${escapeHtml(post.id)}')"><i class="fas fa-share-alt"></i></button>
      `}
    </div>

    <div class="post-content">${formatPostContent(post.content)}</div>

    ${post.image ? `<img src="${escapeHtml(post.image)}" class="post-image" alt="Post image" loading="lazy" onerror="this.style.display='none'" />` : ''}

    <div class="post-actions">
      <button class="action-btn like-btn ${post.user_liked ? 'liked' : ''}" id="like-btn-${post.id}" onclick="toggleLike('${post.id}', this)">
        <i class="${post.user_liked ? 'fas' : 'far'} fa-heart"></i>
        <span id="like-count-${post.id}">${formatNumber(post.likes_count || 0)}</span>
      </button>
      <button class="action-btn comment-btn" onclick="toggleComments('${post.id}', this)">
        <i class="far fa-comment"></i>
        <span id="comment-count-${post.id}">${formatNumber(post.comments_count || 0)}</span>
      </button>
      <button class="action-btn share-btn" onclick="copyToClipboard(window.location.origin+'/feed.html#post-${post.id}')">
        <i class="fas fa-share-alt"></i> Share
      </button>
      <button class="action-btn save-btn" id="save-btn-${post.id}" onclick="toggleSave(this)">
        <i class="far fa-bookmark"></i>
      </button>
    </div>

    <div class="comments-section" id="comments-${post.id}">
      <div class="comments-inner">
        <div class="comment-input-row">
          ${currentUser && currentUser.profile_image
            ? `<img src="${escapeHtml(currentUser.profile_image)}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" />`
            : `<div class="avatar-placeholder" style="width:32px;height:32px;font-size:0.75rem;">${getInitials(currentUser?.name)}</div>`
          }
          <div class="comment-input-wrap">
            <textarea class="comment-input" id="comment-input-${post.id}" placeholder="Write a comment..." rows="1" oninput="autoResize(this)"></textarea>
            <button class="comment-send-btn" onclick="submitComment('${post.id}')"><i class="fas fa-paper-plane"></i></button>
          </div>
        </div>
        <div id="comments-list-${post.id}"></div>
        <div id="comments-loading-${post.id}" style="display:none;" class="spinner-center"><div class="spinner"></div></div>
      </div>
    </div>
  `;
  return div;
}

// ─── Format Post Content (hashtags, mentions) ─────────────────
function formatPostContent(content) {
  if (!content) return '';
  return escapeHtml(content)
    .replace(/#(\w+)/g, '<a href="/explore.html?tag=$1" style="color:var(--accent-primary);font-weight:600;">#$1</a>')
    .replace(/@(\w+)/g, '<a href="/profile.html?username=$1" style="color:var(--accent-primary);font-weight:600;">@$1</a>');
}

// ─── Toggle Like ──────────────────────────────────────────────
async function toggleLike(postId, btn) {
  if (!currentUser) { window.location.href = '/login.html'; return; }
  const isLiked = btn.classList.contains('liked');
  const countEl = document.getElementById(`like-count-${postId}`);
  let count = parseInt(countEl.textContent.replace(/[KM+]/g, '')) || 0;

  // Optimistic update
  btn.classList.toggle('liked');
  const icon = btn.querySelector('i');
  if (isLiked) {
    icon.className = 'far fa-heart';
    count = Math.max(0, count - 1);
  } else {
    icon.className = 'fas fa-heart';
    count++;
  }
  countEl.textContent = formatNumber(count);

  try {
    const { ok, data } = await apiFetch('/api/like', {
      method: isLiked ? 'DELETE' : 'POST',
      body: JSON.stringify({ postId })
    });
    if (ok && data.success) {
      countEl.textContent = formatNumber(data.likes_count);
    } else {
      // Revert
      btn.classList.toggle('liked');
      icon.className = isLiked ? 'fas fa-heart' : 'far fa-heart';
      countEl.textContent = formatNumber(isLiked ? count + 1 : Math.max(0, count - 1));
    }
  } catch {
    // Revert on error
    btn.classList.toggle('liked');
  }
}

// ─── Toggle Save (UI only) ────────────────────────────────────
function toggleSave(btn) {
  btn.classList.toggle('saved');
  const icon = btn.querySelector('i');
  if (btn.classList.contains('saved')) {
    icon.className = 'fas fa-bookmark';
    showToast('Post saved!', 'success', 1500);
  } else {
    icon.className = 'far fa-bookmark';
    showToast('Post unsaved', 'info', 1500);
  }
}

// ─── Toggle Comments ──────────────────────────────────────────
async function toggleComments(postId, btn) {
  const section = document.getElementById(`comments-${postId}`);
  if (!section) return;

  if (section.classList.contains('show')) {
    section.classList.remove('show');
    return;
  }
  section.classList.add('show');

  const listEl = document.getElementById(`comments-list-${postId}`);
  if (listEl && listEl.childElementCount === 0) {
    await loadComments(postId);
  }
}

// ─── Load Comments ────────────────────────────────────────────
async function loadComments(postId) {
  const listEl = document.getElementById(`comments-list-${postId}`);
  const loadingEl = document.getElementById(`comments-loading-${postId}`);
  if (!listEl) return;

  loadingEl.style.display = 'flex';
  try {
    const { ok, data } = await apiFetch(`/api/comments/${postId}`);
    loadingEl.style.display = 'none';
    if (!ok || !data.success) { listEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;padding:8px;">Could not load comments.</p>'; return; }

    if (data.comments.length === 0) {
      listEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;padding:8px;">No comments yet. Be the first!</p>';
      return;
    }
    listEl.innerHTML = '';
    data.comments.forEach(c => listEl.appendChild(createCommentElement(c, postId)));
  } catch {
    loadingEl.style.display = 'none';
    listEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;padding:8px;">Could not load comments.</p>';
  }
}

// ─── Create Comment Element ───────────────────────────────────
function createCommentElement(c, postId) {
  const div = document.createElement('div');
  div.className = 'comment-item';
  div.id = `comment-${c.id}`;
  const author = c.users || {};
  const isOwner = currentUser && c.user_id === currentUser.id;

  const avatarHtml = author.profile_image
    ? `<img src="${escapeHtml(author.profile_image)}" alt="${escapeHtml(author.name || '')}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" />`
    : `<div class="avatar-placeholder" style="width:32px;height:32px;font-size:0.75rem;">${getInitials(author.name)}</div>`;

  div.innerHTML = `
    <a href="/profile.html?id=${escapeHtml(c.user_id)}">${avatarHtml}</a>
    <div class="comment-bubble">
      <div class="comment-author"><a href="/profile.html?id=${escapeHtml(c.user_id)}">${escapeHtml(author.name || 'Unknown')}</a></div>
      <div class="comment-text" id="comment-text-${c.id}">${escapeHtml(c.comment)}</div>
      <div class="comment-meta">
        <span>${timeAgo(c.created_at)}</span>
        ${isOwner ? `
          <button class="comment-meta-btn" onclick="editComment('${c.id}', '${postId}')"><i class="fas fa-edit"></i> Edit</button>
          <button class="comment-meta-btn delete" onclick="deleteComment('${c.id}', '${postId}')"><i class="fas fa-trash"></i> Delete</button>
        ` : ''}
      </div>
    </div>
  `;
  return div;
}

// ─── Submit Comment ───────────────────────────────────────────
async function submitComment(postId) {
  if (!currentUser) { window.location.href = '/login.html'; return; }
  const input = document.getElementById(`comment-input-${postId}`);
  const text = input.value.trim();
  if (!text) { showToast('Please enter a comment', 'warning'); return; }
  if (text.length > 300) { showToast('Comment too long (max 300 chars)', 'warning'); return; }

  input.value = '';
  autoResize(input);

  try {
    const { ok, data } = await apiFetch('/api/comments', {
      method: 'POST',
      body: JSON.stringify({ postId, comment: text })
    });
    if (ok && data.success) {
      const listEl = document.getElementById(`comments-list-${postId}`);
      const noComments = listEl.querySelector('p');
      if (noComments) noComments.remove();
      const commentEl = createCommentElement(data.comment, postId);
      listEl.appendChild(commentEl);
      // Update count
      const countEl = document.getElementById(`comment-count-${postId}`);
      if (countEl) countEl.textContent = formatNumber(data.comments_count);
    } else {
      showToast(data.message || 'Failed to post comment', 'error');
      input.value = text;
    }
  } catch {
    showToast('Network error', 'error');
    input.value = text;
  }
}

// ─── Edit Comment ─────────────────────────────────────────────
function editComment(commentId, postId) {
  const textEl = document.getElementById(`comment-text-${commentId}`);
  const currentText = textEl.textContent;

  textEl.innerHTML = `
    <div style="display:flex;gap:8px;margin-top:4px;">
      <textarea style="flex:1;padding:6px 10px;border:1.5px solid var(--accent-primary);border-radius:8px;background:var(--bg-input);color:var(--text-primary);font-size:0.875rem;resize:none;" id="edit-input-${commentId}" rows="2">${escapeHtml(currentText)}</textarea>
      <div style="display:flex;flex-direction:column;gap:4px;">
        <button class="btn btn-primary btn-sm" onclick="saveEditComment('${commentId}', '${postId}')">Save</button>
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('comment-text-${commentId}').textContent='${escapeHtml(currentText).replace(/'/g, "\\'")}'"">Cancel</button>
      </div>
    </div>
  `;
}

async function saveEditComment(commentId, postId) {
  const input = document.getElementById(`edit-input-${commentId}`);
  const newText = input.value.trim();
  if (!newText) { showToast('Comment cannot be empty', 'warning'); return; }

  try {
    const { ok, data } = await apiFetch(`/api/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ comment: newText })
    });
    if (ok && data.success) {
      const textEl = document.getElementById(`comment-text-${commentId}`);
      textEl.textContent = newText;
      showToast('Comment updated', 'success');
    } else {
      showToast(data.message || 'Update failed', 'error');
    }
  } catch {
    showToast('Network error', 'error');
  }
}

// ─── Delete Comment ───────────────────────────────────────────
function deleteComment(commentId, postId) {
  showConfirm('Delete this comment?', async () => {
    try {
      const { ok, data } = await apiFetch(`/api/comments/${commentId}`, { method: 'DELETE' });
      if (ok && data.success) {
        const el = document.getElementById(`comment-${commentId}`);
        if (el) el.style.animation = 'fadeOut .3s forwards', setTimeout(() => el.remove(), 300);
        showToast('Comment deleted', 'success');
      } else {
        showToast(data.message || 'Failed to delete', 'error');
      }
    } catch { showToast('Network error', 'error'); }
  }, 'Delete Comment');
}

// ─── Delete Post ──────────────────────────────────────────────
function deletePost(postId) {
  showConfirm('This post will be permanently deleted.', async () => {
    try {
      const { ok, data } = await apiFetch(`/api/posts/${postId}`, { method: 'DELETE' });
      if (ok && data.success) {
        const el = document.getElementById(`post-${postId}`);
        if (el) { el.style.opacity = '0'; el.style.transform = 'scale(0.95)'; el.style.transition = 'all .3s'; setTimeout(() => el.remove(), 300); }
        showToast('Post deleted', 'success');
      } else {
        showToast(data.message || 'Failed to delete post', 'error');
      }
    } catch { showToast('Network error', 'error'); }
  }, 'Delete Post');
}

// ─── Edit Post Modal ──────────────────────────────────────────
function openEditPostModal(postId, content) {
  const existing = document.getElementById('editPostModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'editPostModal';
  modal.className = 'modal-overlay show';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>Edit Post</h3>
        <button class="modal-close" onclick="document.getElementById('editPostModal').remove()"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <textarea class="form-input" id="editPostContent" rows="4" maxlength="500" style="resize:none;">${escapeHtml(content)}</textarea>
          <div style="text-align:right;font-size:0.78rem;color:var(--text-muted);margin-top:4px;">
            <span id="editCharCount">${content.length}</span>/500
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;">
          <button class="btn btn-secondary" onclick="document.getElementById('editPostModal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="saveEditPost('${postId}')"><i class="fas fa-save"></i> Save</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  const textarea = document.getElementById('editPostContent');
  textarea.addEventListener('input', () => {
    document.getElementById('editCharCount').textContent = textarea.value.length;
  });
}

async function saveEditPost(postId) {
  const content = document.getElementById('editPostContent').value.trim();
  if (!content) { showToast('Post cannot be empty', 'warning'); return; }

  try {
    const { ok, data } = await apiFetch(`/api/posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify({ content })
    });
    if (ok && data.success) {
      const postEl = document.getElementById(`post-${postId}`);
      if (postEl) {
        const contentEl = postEl.querySelector('.post-content');
        if (contentEl) contentEl.innerHTML = formatPostContent(content);
      }
      document.getElementById('editPostModal').remove();
      showToast('Post updated successfully', 'success');
    } else {
      showToast(data.message || 'Update failed', 'error');
    }
  } catch { showToast('Network error', 'error'); }
}

// ─── Create Post ──────────────────────────────────────────────
// ─── Create Post Modal (FAB) ──────────────────────────────────
function openCreatePostModal() {
  const modal = document.getElementById('createPostModal');
  modal.classList.add('show');

  // Set avatar in modal
  const avatarEl = document.getElementById('modalPostAvatar');
  if (currentUser) {
    avatarEl.innerHTML = currentUser.profile_image
      ? `<img src="${escapeHtml(currentUser.profile_image)}" alt="${escapeHtml(currentUser.name)}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0;" />`
      : `<div class="avatar-placeholder" style="width:44px;height:44px;font-size:1rem;flex-shrink:0;">${getInitials(currentUser.name)}</div>`;
  }

  // Focus textarea after transition
  setTimeout(() => document.getElementById('modalPostContent').focus(), 100);

  // Close on backdrop click
  modal.onclick = (e) => { if (e.target === modal) closeCreatePostModal(); };
}

function closeCreatePostModal() {
  const modal = document.getElementById('createPostModal');
  modal.classList.remove('show');
  // Reset state
  document.getElementById('modalPostContent').value = '';
  document.getElementById('modalCharCount').textContent = '0';
  document.getElementById('modalPostBtn').disabled = true;
  clearModalImage();
}

function updateModalCharCount(textarea) {
  const len = textarea.value.length;
  document.getElementById('modalCharCount').textContent = len;
  document.getElementById('modalPostBtn').disabled = len === 0 || len > 500;
}

function previewModalImage(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    document.getElementById('modalPreviewImg').src = ev.target.result;
    document.getElementById('modalImagePreview').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function clearModalImage() {
  const input = document.getElementById('modalImageInput');
  if (input) input.value = '';
  const preview = document.getElementById('modalImagePreview');
  if (preview) preview.style.display = 'none';
  const img = document.getElementById('modalPreviewImg');
  if (img) img.src = '';
}

async function submitModalPost() {
  const textarea = document.getElementById('modalPostContent');
  const content = textarea.value.trim();
  if (!content) { showToast('Write something first!', 'warning'); return; }

  const btn = document.getElementById('modalPostBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';

  const formData = new FormData();
  formData.append('content', content);
  const imageInput = document.getElementById('modalImageInput');
  if (imageInput && imageInput.files[0]) formData.append('image', imageInput.files[0]);

  try {
    const { ok, data } = await apiFetch('/api/posts', {
      method: 'POST',
      body: formData,
      headers: {}
    });
    if (ok && data.success) {
      closeCreatePostModal();
      const feed = document.getElementById('feedContainer');
      if (feed) {
        const emptyState = feed.querySelector('.empty-state');
        if (emptyState) emptyState.remove();
        feed.insertBefore(createPostElement(data.post), feed.firstChild);
      }
      showToast('Post shared successfully!', 'success');
    } else {
      showToast(data.message || 'Failed to create post', 'error');
    }
  } catch { showToast('Network error', 'error'); }
  finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Post';
  }
}

// ─── Create Post (inline form) ────────────────────────────────
function initCreatePost() {
  const textarea = document.getElementById('createPostContent');
  const charCount = document.getElementById('charCount');
  const submitBtn = document.getElementById('createPostBtn');
  const imageInput = document.getElementById('postImageInput');
  const imagePreview = document.getElementById('postImagePreview');
  const previewImg = document.getElementById('previewImgEl');

  if (!textarea) return;

  textarea.addEventListener('input', () => {
    autoResize(textarea);
    const len = textarea.value.length;
    charCount.textContent = len;
    charCount.className = 'char-counter' + (len > 450 ? ' danger' : len > 400 ? ' warning' : '');
    submitBtn.disabled = len === 0 || len > 500;
  });

  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      previewImg.src = ev.target.result;
      imagePreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('removeImageBtn').addEventListener('click', () => {
    imageInput.value = '';
    imagePreview.style.display = 'none';
    previewImg.src = '';
  });

  document.getElementById('createPostForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = textarea.value.trim();
    if (!content) { showToast('Write something first!', 'warning'); return; }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';

    const formData = new FormData();
    formData.append('content', content);
    if (imageInput.files[0]) formData.append('image', imageInput.files[0]);

    try {
      const { ok, data } = await apiFetch('/api/posts', {
        method: 'POST',
        body: formData,
        headers: {}
      });
      if (ok && data.success) {
        textarea.value = '';
        autoResize(textarea);
        charCount.textContent = '0';
        imageInput.value = '';
        imagePreview.style.display = 'none';
        previewImg.src = '';

        const feed = document.getElementById('feedContainer');
        const emptyState = feed.querySelector('.empty-state');
        if (emptyState) emptyState.remove();

        const postEl = createPostElement(data.post);
        feed.insertBefore(postEl, feed.firstChild);
        showToast('Post shared successfully!', 'success');
      } else {
        showToast(data.message || 'Failed to create post', 'error');
      }
    } catch { showToast('Network error', 'error'); }
    finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Post';
    }
  });
}

// ─── Suggested Users ──────────────────────────────────────────
async function loadSuggestedUsers() {
  const container = document.getElementById('suggestedUsers');
  if (!container) return;

  try {
    const { ok, data } = await apiFetch('/api/users/suggested');

    if (!ok || !data.success) {
      container.innerHTML = '<div style="padding:12px 16px;font-size:0.82rem;color:var(--text-muted);">Could not load suggestions.</div>';
      return;
    }

    if (!data.users || data.users.length === 0) {
      container.innerHTML = '<div style="padding:12px 16px;font-size:0.82rem;color:var(--text-muted);">You\'re following everyone! <a href="/explore.html" style="color:var(--accent-primary);">Explore more →</a></div>';
      return;
    }

    container.innerHTML = '';
    data.users.forEach(user => {
      const el = document.createElement('div');
      el.className = 'suggested-user';
      const avatarHtml = user.profile_image
        ? `<img src="${escapeHtml(user.profile_image)}" alt="${escapeHtml(user.name)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" />`
        : `<div class="avatar-placeholder" style="width:40px;height:40px;font-size:0.95rem;">${getInitials(user.name)}</div>`;
      el.innerHTML = `
        <a href="/profile.html?id=${user.id}">${avatarHtml}</a>
        <div class="suggested-user-info">
          <a href="/profile.html?id=${user.id}" class="suggested-user-name">${escapeHtml(user.name)}</a>
          <div class="suggested-user-bio">@${escapeHtml(user.username)}</div>
        </div>
        <button class="btn btn-outline btn-sm btn-round follow-btn" id="sugg-follow-${user.id}" onclick="followUser('${user.id}', this)">Follow</button>
      `;
      container.appendChild(el);
    });
  } catch {
    container.innerHTML = '<div style="padding:12px 16px;font-size:0.82rem;color:var(--text-muted);">Could not load suggestions.</div>';
  }
}

async function followUser(userId, btn) {
  if (!currentUser) { window.location.href = '/login.html'; return; }
  const isFollowing = btn.classList.contains('following');

  btn.disabled = true;
  const originalText = btn.textContent;

  try {
    const { ok, data } = await apiFetch('/api/follow', {
      method: isFollowing ? 'DELETE' : 'POST',
      body: JSON.stringify({ userId })
    });
    if (ok && data.success) {
      btn.classList.toggle('following', !isFollowing);
      btn.innerHTML = isFollowing
        ? 'Follow'
        : '<i class="fas fa-user-check"></i> Following';
      showToast(isFollowing ? 'Unfollowed' : 'Following!', 'success', 1500);
    } else {
      showToast(data.message || 'Could not follow user', 'error');
      btn.textContent = originalText;
    }
  } catch {
    showToast('Network error. Please try again.', 'error');
    btn.textContent = originalText;
  } finally {
    btn.disabled = false;
  }
}

// ─── Notification Count ───────────────────────────────────────
async function loadNotificationCount() {
  const badge = document.getElementById('notificationBadge');
  if (!badge) return;
  try {
    const { ok, data } = await apiFetch('/api/notifications');
    if (ok && data.success && data.unread_count > 0) {
      badge.textContent = data.unread_count > 9 ? '9+' : data.unread_count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  } catch { }
}

// ─── Open Notifications Panel ────────────────────────────────
async function openNotifications(btn) {
  const panel = document.getElementById('notificationPanel');
  const isOpen = panel.classList.contains('show');

  // Close all other dropdowns
  document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));

  if (isOpen) return;

  panel.classList.add('show');

  // Reset badge
  const badge = document.getElementById('notificationBadge');

  // Fetch & render
  const list = document.getElementById('notificationList');
  list.innerHTML = '<div class="spinner-center" style="padding:32px;"><div class="spinner"></div></div>';

  try {
    const { ok, data } = await apiFetch('/api/notifications');
    if (!ok || !data.success) {
      list.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-muted);font-size:0.875rem;">Could not load notifications.</div>';
      return;
    }

    if (!data.notifications || data.notifications.length === 0) {
      list.innerHTML = '<div class="notif-empty"><i class="fas fa-bell-slash"></i><div>No notifications yet</div></div>';
      return;
    }

    list.innerHTML = '';
    data.notifications.forEach(n => list.appendChild(createNotifElement(n)));

    // Clear badge since user opened the panel
    if (badge) { badge.textContent = '0'; badge.style.display = 'none'; }

    // Mark all read silently in background
    apiFetch('/api/notifications/read', { method: 'PUT' }).catch(() => {});

  } catch {
    list.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-muted);font-size:0.875rem;">Could not load notifications.</div>';
  }
}

function createNotifElement(n) {
  const el = document.createElement('div');
  el.className = 'notification-item' + (n.is_read ? '' : ' unread');

  const sender = n.sender || {};
  const avatarHtml = sender.profile_image
    ? `<img src="${escapeHtml(sender.profile_image)}" alt="${escapeHtml(sender.name || '')}" />`
    : `<div class="avatar-placeholder" style="width:40px;height:40px;font-size:0.9rem;flex-shrink:0;">${getInitials(sender.name)}</div>`;

  const iconMap = { like: 'fa-heart', comment: 'fa-comment', follow: 'fa-user-plus' };
  const icon = iconMap[n.type] || 'fa-bell';

  const textMap = {
    like:    `<strong>${escapeHtml(sender.name || 'Someone')}</strong> liked your post`,
    comment: `<strong>${escapeHtml(sender.name || 'Someone')}</strong> commented on your post`,
    follow:  `<strong>${escapeHtml(sender.name || 'Someone')}</strong> started following you`
  };
  const text = textMap[n.type] || `<strong>${escapeHtml(sender.name || 'Someone')}</strong> interacted with you`;

  el.innerHTML = `
    <div class="notification-icon ${n.type}"><i class="fas ${icon}"></i></div>
    <a href="/profile.html?id=${escapeHtml(sender.id || '')}" style="flex-shrink:0;">${avatarHtml}</a>
    <div class="notification-content">
      <div>${text}</div>
      <div class="notification-time">${timeAgo(n.created_at)}</div>
    </div>
  `;

  // Click navigates to relevant post or profile
  el.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    if (n.type === 'follow') {
      window.location.href = `/profile.html?id=${sender.id}`;
    } else if (n.reference_id) {
      window.location.href = `/feed.html#post-${n.reference_id}`;
    }
  });

  return el;
}

async function markAllNotificationsRead() {
  try {
    await apiFetch('/api/notifications/read', { method: 'PUT' });
    // Mark all items visually as read
    document.querySelectorAll('#notificationList .notification-item.unread')
      .forEach(el => el.classList.remove('unread'));
    const badge = document.getElementById('notificationBadge');
    if (badge) { badge.textContent = '0'; badge.style.display = 'none'; }
    showToast('All notifications marked as read', 'success', 2000);
  } catch {
    showToast('Could not mark as read', 'error');
  }
}

// ─── Infinite Scroll ──────────────────────────────────────────
function initInfiniteScroll() {
  const sentinel = document.getElementById('infiniteScrollSentinel');
  if (!sentinel) return;

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasMore && !isLoading) {
      loadFeed(false);
    }
  }, { rootMargin: '200px' });

  observer.observe(sentinel);
}

// ─── Search ───────────────────────────────────────────────────
function initSearch() {
  const searchInput = document.getElementById('headerSearch');
  const suggestions = document.getElementById('searchSuggestions');
  if (!searchInput || !suggestions) return;

  const doSearch = debounce(async (q) => {
    if (!q || q.length < 2) { suggestions.classList.remove('show'); return; }
    try {
      const { ok, data } = await apiFetch(`/api/search/users?q=${encodeURIComponent(q)}&limit=5`);
      if (!ok || !data.success || !data.users.length) { suggestions.classList.remove('show'); return; }
      suggestions.innerHTML = data.users.map(u => `
        <div class="suggestion-item" onclick="window.location.href='/profile.html?id=${u.id}'">
          ${u.profile_image ? `<img src="${escapeHtml(u.profile_image)}" alt="${escapeHtml(u.name)}" />` : `<div class="avatar-placeholder" style="width:36px;height:36px;font-size:0.85rem;">${getInitials(u.name)}</div>`}
          <div>
            <div class="suggestion-name">${escapeHtml(u.name)}</div>
            <div class="suggestion-username">@${escapeHtml(u.username)}</div>
          </div>
        </div>
      `).join('');
      suggestions.classList.add('show');
    } catch { }
  }, 300);

  searchInput.addEventListener('input', (e) => doSearch(e.target.value));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      suggestions.classList.remove('show');
      window.location.href = `/explore.html?q=${encodeURIComponent(searchInput.value)}`;
    }
    if (e.key === 'Escape') suggestions.classList.remove('show');
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.header-search')) suggestions.classList.remove('show'); });
}

// ─── Theme Toggle ─────────────────────────────────────────────
function initThemeToggle() {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;
  const updateIcon = (theme) => {
    btn.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    btn.title = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
  };
  updateIcon(document.documentElement.getAttribute('data-theme'));
  btn.addEventListener('click', () => {
    const next = toggleTheme();
    updateIcon(next);
  });
}

// ─── Toggle Dropdown ──────────────────────────────────────────
function toggleDropdown(btn) {
  const menu = btn.nextElementSibling;
  document.querySelectorAll('.dropdown-menu.show').forEach(m => { if (m !== menu) m.classList.remove('show'); });
  menu.classList.toggle('show');
}

// ─── Logout ───────────────────────────────────────────────────
async function logout() {
  try {
    await apiFetch('/api/logout', { method: 'POST' });
  } catch { }
  window.location.href = '/login.html';
}

// ─── Mobile Nav highlight ─────────────────────────────────────
function updateMobileNav(page) {
  document.querySelectorAll('.mobile-nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
}
