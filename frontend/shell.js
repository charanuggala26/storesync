/* ================================================================
   StoreSync Premium — Shared Shell (navbar + sidebar + toasts +
   alert-drawer + dark-mode + auth guard)
   Include AFTER styles.css on every page.
================================================================ */

// ── Auth guard ───────────────────────────────────────────────
const _role = localStorage.getItem('role');
const _user = JSON.parse(localStorage.getItem('user') || '{}');
if (!_role) { location.href = 'login.html'; }

// ── Helpers ──────────────────────────────────────────────────
function getRole()     { return _role; }
function getUser()     { return _user; }
function isManager()   { return _role === 'manager'; }

function logout() {
  localStorage.clear();
  location.href = 'login.html';
}

// ── Dark mode ────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('ss_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.classList.toggle('dark', saved === 'dark');
    btn.querySelector('.theme-thumb').textContent = saved === 'dark' ? '🌙' : '☀️';
  }
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ss_theme', next);
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.classList.toggle('dark', next === 'dark');
    btn.querySelector('.theme-thumb').textContent = next === 'dark' ? '🌙' : '☀️';
  }
}

// ── Clock ────────────────────────────────────────────────────
function startClock() {
  const el = document.getElementById('liveClock');
  if (!el) return;
  const update = () => {
    const now = new Date();
    el.textContent = now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  };
  update(); setInterval(update, 1000);
}

// ── Sidebar toggle ───────────────────────────────────────────
function toggleSidebar() {
  const sb  = document.getElementById('sidebar');
  const main = document.getElementById('mainContent');
  if (!sb) return;
  if (window.innerWidth <= 768) {
    sb.classList.toggle('mobile-open');
  } else {
    sb.classList.toggle('collapsed');
    if (main) main.classList.toggle('sidebar-collapsed');
  }
}

// ── Alert drawer ─────────────────────────────────────────────
let alertDrawerOpen = false;
let allAlerts = [];

function toggleAlertDrawer() {
  alertDrawerOpen = !alertDrawerOpen;
  const d = document.getElementById('alertDrawer');
  if (d) d.classList.toggle('open', alertDrawerOpen);
}

async function loadAlerts() {
  try {
    const res = await fetch('/api/alerts');
    const data = await res.json();
    allAlerts = data;
    renderAlerts(data);
    const badge = document.getElementById('alertBadge');
    if (badge) {
      badge.textContent = data.length;
      badge.style.display = data.length ? '' : 'none';
      if (data.length) badge.classList.add('pop');
      setTimeout(() => badge && badge.classList.remove('pop'), 400);
    }
  } catch(e) { console.log(e); }
}

function renderAlerts(alerts) {
  const list = document.getElementById('alertList');
  if (!list) return;
  if (!alerts.length) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:14px;">✅ All good — no alerts</div>';
    return;
  }
  const icons = { out:'⛔', low:'⚠️', exp:'📅', expired:'🔴' };
  const dotCls = { out:'alert-dot-red', low:'alert-dot-orange', exp:'alert-dot-yellow', expired:'alert-dot-red' };
  const labels = { out:'Out of Stock', low:'Low Stock', exp:'Expiring Soon', expired:'Expired' };
  list.innerHTML = alerts.map(a => `
    <div class="alert-item">
      <div class="alert-dot ${dotCls[a.type]||'alert-dot-blue'}"></div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${icons[a.type]||'🔔'} ${a.msg}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${labels[a.type]||'Alert'}</div>
      </div>
    </div>
  `).join('');
}

// ── Toast ────────────────────────────────────────────────────
function showToast(title, msg, type='success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = {
    success: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
    error:   '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
    warning: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>',
    info:    '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
  };
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<div class="toast-icon">${icons[type]}</div><div class="toast-content"><div class="toast-title">${title}</div>${msg?`<div class="toast-msg">${msg}</div>`:''}</div>`;
  container.appendChild(t);
  setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 300); }, 3500);
}

// ── Ripple on buttons ────────────────────────────────────────
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn');
  if (!btn) return;
  const r = document.createElement('span');
  r.className = 'ripple';
  const rect = btn.getBoundingClientRect();
  const sz = Math.max(rect.width, rect.height);
  r.style.width = r.style.height = sz + 'px';
  r.style.left = (e.clientX - rect.left - sz/2) + 'px';
  r.style.top  = (e.clientY - rect.top  - sz/2) + 'px';
  btn.appendChild(r);
  setTimeout(() => r.remove(), 600);
});

// ── Build shared shell ───────────────────────────────────────
function buildShell(activePage) {
  const userObj = getUser();
  const initials = (userObj.name || userObj.username || 'U').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  // Inject navbar
  const navbar = document.getElementById('appNavbar');
  if (navbar) {
    navbar.className = 'ss-navbar';
    navbar.innerHTML = `
      <button class="ss-hamburger" onclick="toggleSidebar()">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
      <a href="${isManager()?'inventory.html':'billing.html'}" class="ss-brand">
        <div class="ss-brand-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-4L4 7m8 4v10M4 7v10l8 4"/></svg></div>
        StoreSync
      </a>
      <div class="navbar-search">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input type="text" placeholder="Search products, reports…" id="globalSearch">
      </div>
      <div class="navbar-actions">
        <div class="live-clock" id="liveClock"></div>
        <button class="theme-toggle" id="themeToggle" onclick="toggleTheme()" title="Toggle theme">
          <div class="theme-thumb">☀️</div>
        </button>
        <div class="icon-btn" onclick="toggleAlertDrawer()" title="Alerts" style="position:relative">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
          <span class="notif-badge" id="alertBadge" style="display:none">0</span>
        </div>
        <div class="user-avatar" title="${userObj.name||userObj.username||'User'} (${_role})">${initials}</div>
        <button class="btn btn-sm btn-secondary" onclick="logout()" style="padding:7px 12px">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          Logout
        </button>
      </div>
    `;
  }

  // Inject sidebar
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    const managerOnly = isManager();
    const navItems = [
      { id:'inventory',  label:'Inventory',     icon:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-4L4 7m8 4v10M4 7v10l8 4',      href:'inventory.html',  managerOnly:true },
      { id:'billing',    label:'Billing / POS',  icon:'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M13 11h.01M13 15h.01M9 15h.01M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z', href:'billing.html',   managerOnly:false },
      { id:'scanning',   label:'QR Scanning',    icon:'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z', href:'scanning.html', managerOnly:false },
      { id:'pos',        label:'Analytics',      icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', href:'pos.html', managerOnly:true },
      { id:'expiry',     label:'Expiry Center',  icon:'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',                           href:'expiry.html',    managerOnly:true,  badge:'!', badgeType:'red' },
    ];

    sidebar.className = 'ss-sidebar';
    sidebar.innerHTML = `
      <div class="sidebar-group">
        <div class="sidebar-group-label">Main</div>
        ${navItems.filter(n => managerOnly ? true : !n.managerOnly).map(n => `
          <a href="${n.href}" class="nav-item ${activePage===n.id?'active':''}">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${n.icon}"/></svg>
            ${n.label}
            ${n.badge?`<span class="nav-badge ${n.badgeType==='red'?'':'green'}" id="expiryNavBadge" style="display:none">!</span>`:''}
          </a>
        `).join('')}
      </div>
      <div class="sidebar-group" style="margin-top:auto;padding-top:20px;border-top:1px solid var(--border)">
        <div class="nav-item" style="cursor:default;opacity:.7">
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          ${userObj.name || userObj.username || 'User'}
          <span class="badge badge-${managerOnly?'purple':'blue'}" style="margin-left:auto;font-size:10px">${_role}</span>
        </div>
      </div>
    `;
  }

  // Inject alert drawer
  const body = document.body;
  const drawerEl = document.createElement('div');
  drawerEl.id = 'alertDrawer';
  drawerEl.className = 'alert-drawer';
  drawerEl.innerHTML = `
    <div class="alert-drawer-header">
      <div>
        <div style="font-size:16px;font-weight:700;color:var(--text-primary)">🔔 Alerts</div>
        <div style="font-size:12px;color:var(--text-muted)" id="alertTime">Last updated now</div>
      </div>
      <button class="modal-close" onclick="toggleAlertDrawer()">
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="alert-drawer-body">
      <div id="alertList"><div style="padding:20px;text-align:center;color:var(--text-muted);font-size:14px">Loading alerts…</div></div>
    </div>
  `;
  body.appendChild(drawerEl);

  // Toast container
  const tc = document.createElement('div');
  tc.id = 'toastContainer';
  tc.id = 'toastContainer';
  Object.assign(tc.style, { position:'fixed', top:'76px', right:'20px', zIndex:'9999', display:'flex', flexDirection:'column', gap:'10px', pointerEvents:'none' });
  body.appendChild(tc);

  // Init
  initTheme();
  startClock();
  loadAlerts();
  setInterval(loadAlerts, 30000);

  // Close drawer on outside click
  document.addEventListener('click', e => {
    if (alertDrawerOpen && !e.target.closest('#alertDrawer') && !e.target.closest('[onclick*="toggleAlertDrawer"]')) {
      alertDrawerOpen = false;
      document.getElementById('alertDrawer').classList.remove('open');
    }
  });
}

// Number counter animation
function animateCounter(el, target, prefix='', suffix='', duration=1200) {
  const start = 0;
  const startTime = performance.now();
  const update = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(start + (target - start) * eased);
    el.textContent = prefix + value.toLocaleString('en-IN') + suffix;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

// Fade-in observer
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target); } });
  }, { threshold: 0.1 });
  els.forEach(el => obs.observe(el));
}

document.addEventListener('DOMContentLoaded', initScrollReveal);