/**
 * Profile Page JavaScript
 * Shared post/comment/follow functions used by profile.html
 * (Extracted from feed.js to avoid duplicate variable declarations)
 */

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

// ─── Follow / Unfollow ────────────────────────────────────────
async function followUser(userId, btn) {
  if (!currentUser) { window.location.href = '/login.html'; return; }
  const isFollowing = btn.classList.contains('following');

  // Disable button while request is in flight
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

// ─── Format Post Content (hashtags, mentions) ─────────────────
function formatPostContent(content) {
  if (!content) return '';
  return escapeHtml(content)
    .replace(/#(\w+)/g, '<a href="/explore.html?tag=$1" style="color:var(--accent-primary);font-weight:600;">#$1</a>')
    .replace(/@(\w+)/g, '<a href="/profile.html?username=$1" style="color:var(--accent-primary);font-weight:600;">@$1</a>');
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
            <div class="dropdown-item" onclick="openEditPostModal('${escapeHtml(post.id)}', \`${escapeHtml(post.content).replace(/`/g, '\\`')}\`)">
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

    ${post.image ? (post.image.match(/\\.(mp4|webm|ogg)$/i) ? `<video src="${escapeHtml(post.image)}" class="post-video" controls preload="metadata" style="max-height: 500px; width: 100%; object-fit: contain; background: #000; border-radius: 8px; margin-top: 10px;"></video>` : `<img src="${escapeHtml(post.image)}" class="post-image" alt="Post image" loading="lazy" onerror="this.style.display='none'" />`) : ''}

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

// ─── Toggle Like ──────────────────────────────────────────────
async function toggleLike(postId, btn) {
  if (!currentUser) { window.location.href = '/login.html'; return; }
  const isLiked = btn.classList.contains('liked');
  const countEl = document.getElementById(`like-count-${postId}`);
  let count = parseInt(countEl.textContent.replace(/[KM+]/g, '')) || 0;

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
      btn.classList.toggle('liked');
      icon.className = isLiked ? 'fas fa-heart' : 'far fa-heart';
      countEl.textContent = formatNumber(isLiked ? count + 1 : Math.max(0, count - 1));
    }
  } catch {
    btn.classList.toggle('liked');
  }
}

// ─── Toggle Save ──────────────────────────────────────────────
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
  if (section.classList.contains('show')) { section.classList.remove('show'); return; }
  section.classList.add('show');
  const listEl = document.getElementById(`comments-list-${postId}`);
  if (listEl && listEl.childElementCount === 0) await loadComments(postId);
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
    if (data.comments.length === 0) { listEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;padding:8px;">No comments yet. Be the first!</p>'; return; }
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
      listEl.appendChild(createCommentElement(data.comment, postId));
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
      document.getElementById(`comment-text-${commentId}`).textContent = newText;
      showToast('Comment updated', 'success');
    } else {
      showToast(data.message || 'Update failed', 'error');
    }
  } catch { showToast('Network error', 'error'); }
}

// ─── Delete Comment ───────────────────────────────────────────
function deleteComment(commentId, postId) {
  showConfirm('Delete this comment?', async () => {
    try {
      const { ok, data } = await apiFetch(`/api/comments/${commentId}`, { method: 'DELETE' });
      if (ok && data.success) {
        const el = document.getElementById(`comment-${commentId}`);
        if (el) { el.style.animation = 'fadeOut .3s forwards'; setTimeout(() => el.remove(), 300); }
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
