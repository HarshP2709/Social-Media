/**
 * Utility Functions - Shared across all pages
 * Social Media Platform
 */

// ─── API Base URL ──────────────────────────────────────────────
// Works whether the page is opened via:
//   • http://localhost:5000/register.html  (Express serves frontend)
//   • http://127.0.0.1:5500/frontend/register.html  (VS Code Live Server)
// In both cases every API call is forwarded to the Express backend.
const API_BASE = (() => {
  const { hostname, port } = window.location;
  // If already running on the Express port, use same origin (no prefix)
  if (port === '5000' || port === '') return '';
  // Otherwise (Live Server, etc.) point directly at Express
  return `http://${hostname}:5000`;
})();

// ─── Toast Notifications ─────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas ${icons[type] || icons.info}"></i>
    <span class="toast-text">${escapeHtml(message)}</span>
    <button class="toast-close" onclick="dismissToast(this.parentElement)"><i class="fas fa-times"></i></button>
  `;
  container.appendChild(toast);

  const timer = setTimeout(() => dismissToast(toast), duration);
  toast.dataset.timer = timer;
}

function dismissToast(toast) {
  if (!toast || !toast.parentElement) return;
  clearTimeout(parseInt(toast.dataset.timer));
  toast.classList.add('hide');
  setTimeout(() => toast.remove(), 300);
}

// ─── Time Ago ─────────────────────────────────────────────────
function timeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: diff > 31536000 ? 'numeric' : undefined });
}

// ─── Format Number ────────────────────────────────────────────
function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

// ─── Escape HTML ──────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── Get Avatar HTML ──────────────────────────────────────────
function getAvatarHtml(user, size = 44, extraClass = '') {
  if (!user) return `<div class="avatar-placeholder" style="width:${size}px;height:${size}px;font-size:${size * 0.4}px;">?</div>`;
  if (user.profile_image) {
    return `<img src="${escapeHtml(user.profile_image)}" alt="${escapeHtml(user.name)}" style="width:${size}px;height:${size}px;" class="${extraClass}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div class="avatar-placeholder" style="width:${size}px;height:${size}px;font-size:${size * 0.4}px;display:none;">${getInitials(user.name)}</div>`;
  }
  return `<div class="avatar-placeholder" style="width:${size}px;height:${size}px;font-size:${size * 0.4}px;" class="${extraClass}">${getInitials(user.name)}</div>`;
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

// ─── API Helper ────────────────────────────────────────────────
// Automatically prepends API_BASE so calls like apiFetch('/api/login')
// hit Express regardless of which port the HTML was opened from.
async function apiFetch(url, options = {}) {
  const fullUrl = API_BASE + url;
  const defaults = {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers }
  };
  if (options.body instanceof FormData) {
    delete defaults.headers['Content-Type'];
  }
  const res = await fetch(fullUrl, {
    ...defaults,
    ...options,
    headers: { ...defaults.headers, ...(options.headers || {}) }
  });
  const data = await res.json().catch(() => ({
    success: false,
    message: 'Invalid response from server'
  }));
  return { ok: res.ok, status: res.status, data };
}

// ─── Theme Manager ─────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  return saved;
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  return next;
}

// ─── Copy to Clipboard ────────────────────────────────────────
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success', 2000);
  } catch {
    showToast('Could not copy', 'error');
  }
}

// ─── Debounce ─────────────────────────────────────────────────
function debounce(fn, delay = 300) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ─── Confirm Modal ────────────────────────────────────────────
function showConfirm(message, onConfirm, title = 'Confirm Action') {
  const existing = document.getElementById('confirmModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'confirmModal';
  modal.className = 'modal-overlay show';
  modal.innerHTML = `
    <div class="modal" style="max-width:380px;">
      <div class="modal-header">
        <h3><i class="fas fa-exclamation-triangle" style="color:var(--danger);margin-right:8px;"></i>${escapeHtml(title)}</h3>
      </div>
      <div class="modal-body">
        <p style="margin-bottom:20px;color:var(--text-secondary);">${escapeHtml(message)}</p>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button class="btn btn-secondary" onclick="document.getElementById('confirmModal').remove()">Cancel</button>
          <button class="btn btn-danger" id="confirmYesBtn">Delete</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('confirmYesBtn').addEventListener('click', () => {
    modal.remove();
    onConfirm();
  });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// ─── Skeleton Post ────────────────────────────────────────────
function skeletonPost() {
  return `
    <div class="skeleton-post">
      <div class="skeleton-header">
        <div class="skeleton skeleton-avatar"></div>
        <div style="flex:1;">
          <div class="skeleton skeleton-text" style="width:35%;"></div>
          <div class="skeleton skeleton-text short" style="width:20%;"></div>
        </div>
      </div>
      <div class="skeleton skeleton-text" style="width:90%;margin-bottom:8px;"></div>
      <div class="skeleton skeleton-text" style="width:75%;"></div>
    </div>
  `;
}

// ─── Auto-resize textarea ─────────────────────────────────────
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

// ─── Back to top ──────────────────────────────────────────────
function initBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('show', window.scrollY > 400);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ─── Close dropdowns on outside click ────────────────────────
document.addEventListener('click', (e) => {
  if (!e.target.closest('.dropdown')) {
    document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
  }
});

// ─── Init theme on load ───────────────────────────────────────
initTheme();
