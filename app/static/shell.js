// ── PAGE LOADER (top progress bar) ──
(function() {
  const bar = document.createElement('div');
  bar.id = 'page-loader';
  document.body.prepend(bar);

  const setWidth = w => { bar.style.width = w + '%'; };
  setWidth(25);
  requestAnimationFrame(() => setWidth(60));
  window.addEventListener('load', () => {
    setWidth(100);
    setTimeout(() => { bar.style.opacity = '0'; }, 250);
  });

  document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if(!a || a.target === '_blank' || a.hasAttribute('download')) return;
    if(e.metaKey || e.ctrlKey || e.shiftKey || e.defaultPrevented) return;
    const href = a.getAttribute('href');
    if(!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    bar.style.opacity = '1';
    setWidth(80);
  });
})();

// ── AUTH CHECK ──
const user = JSON.parse(localStorage.getItem('em_user') || 'null');
if (!user) { window.location.href = '/login'; }
else {
  const initial = (user.name || 'U')[0].toUpperCase();
  ['sb-avatar','chip-avatar'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.textContent = initial;
  });
  const nameEl = document.getElementById('sb-name');
  const chipEl = document.getElementById('chip-name');
  if(nameEl) nameEl.textContent = user.name || 'User';
  if(chipEl) chipEl.textContent = (user.name || 'User').split(' ').slice(-1)[0];
}

function logout() {
  localStorage.removeItem('em_user');
  window.location.href = '/login';
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ── THEME ──
function applyTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem('em_theme', theme);
  const btn = document.getElementById('theme-toggle');
  if(btn) {
    btn.textContent = theme === 'light' ? '☀️' : '🌙';
    btn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
  }
  if(typeof updateChartTheme === 'function') updateChartTheme(theme);
}
function toggleTheme() {
  applyTheme(document.body.dataset.theme === 'light' ? 'dark' : 'light');
}
document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
applyTheme(localStorage.getItem('em_theme') || 'dark');

// ── KEYBOARD SHORTCUTS (D / R) + HINT PANEL ──
function isTypingTarget(el) {
  const tag = (el.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || el.isContentEditable;
}

document.addEventListener('keydown', e => {
  if(e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
  if(e.key.toLowerCase() === 'd') { e.preventDefault(); toggleTheme(); }
  else if(e.key.toLowerCase() === 'r') {
    e.preventDefault();
    if(typeof pageRefresh === 'function') pageRefresh();
    else location.reload();
  }
});

function toggleShortcutsPanel() {
  document.getElementById('shortcuts-panel')?.classList.toggle('open');
}
function closeShortcutsPanel() {
  document.getElementById('shortcuts-panel')?.classList.remove('open');
}
document.getElementById('shortcuts-trigger')?.addEventListener('click', e => {
  e.stopPropagation();
  toggleShortcutsPanel();
});
document.addEventListener('click', e => {
  const panel = document.getElementById('shortcuts-panel');
  const trigger = document.getElementById('shortcuts-trigger');
  if(panel && panel.classList.contains('open') && !panel.contains(e.target) && e.target !== trigger) closeShortcutsPanel();
});
document.addEventListener('keydown', e => {
  if(e.key === 'Escape') closeShortcutsPanel();
});

// ── DISABLED ("Soon") NAV ITEMS ──
document.querySelectorAll('.nav-item.disabled').forEach(el => {
  el.addEventListener('click', e => e.preventDefault());
});

// ── USER DROPDOWN ──
function buildUserDropdown() {
  const chip = document.getElementById('user-chip');
  if(!chip || !user) return;

  chip.setAttribute('tabindex', '0');
  chip.setAttribute('role', 'button');
  chip.setAttribute('aria-haspopup', 'true');
  chip.setAttribute('aria-label', 'Account menu');

  const panel = document.createElement('div');
  panel.className = 'dropdown-panel user-dropdown';
  panel.id = 'user-dropdown';
  panel.innerHTML = `
    <div class="dd-head">
      <div class="dd-title">${user.name || 'User'}</div>
      <div class="dd-sub">${user.email || user.role || ''}</div>
    </div>
    <a href="/settings" class="dd-item">⚙️ Settings</a>
    <button class="dd-item dd-danger" id="ud-logout-btn">🚪 Logout</button>
  `;
  chip.appendChild(panel);

  chip.addEventListener('click', e => {
    e.stopPropagation();
    panel.classList.toggle('open');
  });
  chip.addEventListener('keydown', e => {
    if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); panel.classList.toggle('open'); }
  });
  document.addEventListener('click', e => {
    if(!chip.contains(e.target)) panel.classList.remove('open');
  });
  document.getElementById('ud-logout-btn').addEventListener('click', e => {
    e.stopPropagation();
    logout();
  });
}
buildUserDropdown();

// ── NOTIFICATION DROPDOWN ──
function renderNotifPanel(panel) {
  const alerts = JSON.parse(localStorage.getItem('em_alerts') || '[]').slice(0, 5);
  panel.innerHTML = `
    <div class="dd-head"><div class="dd-title">Notifications</div></div>
    <div class="nd-list">
      ${alerts.length === 0
        ? '<div class="nd-empty">✅ No notifications</div>'
        : alerts.map(a => `
          <div class="nd-item">
            <div class="nd-msg">${a.msg}</div>
            <div class="nd-time">${a.date || ''} ${a.time}</div>
          </div>`).join('')}
    </div>
    <a href="/alerts" class="dd-item dd-foot">View all alerts →</a>
  `;
}

function buildNotifDropdown() {
  const btn = document.getElementById('notif-btn');
  if(!btn) return;

  btn.setAttribute('aria-haspopup', 'true');
  btn.setAttribute('aria-label', 'Notifications');

  const panel = document.createElement('div');
  panel.className = 'dropdown-panel notif-dropdown';
  panel.id = 'notif-dropdown';
  btn.appendChild(panel);

  btn.addEventListener('click', e => {
    e.stopPropagation();
    renderNotifPanel(panel);
    panel.classList.toggle('open');
  });
  document.addEventListener('click', e => {
    if(!btn.contains(e.target)) panel.classList.remove('open');
  });
}
buildNotifDropdown();

// ── SIDEBAR VERSION FOOTER ──
(function() {
  const nav = document.querySelector('.sb-nav');
  if(!nav) return;
  const tag = document.createElement('div');
  tag.className = 'sb-version';
  tag.textContent = 'EnvMonitor v1.1.0';
  nav.parentElement.insertBefore(tag, document.getElementById('sb-user'));
})();
