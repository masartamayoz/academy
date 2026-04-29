/**
 * navbar.js — Shared Navigation Component
 * أكاديمية مسار التميز
 * يُضاف في كل الصفحات: <script src="navbar.js"></script>
 */

(async function() {
  // Firebase check
  const PAGES = {
    'index.html':     'الرئيسية',
    'courses.html':   'الدروس',
    'about.html':     'من نحن',
    'contact.html':   'تواصل معنا',
    'dashboard.html': 'لوحة التحكم',
    'profile.html':   'ملفي الشخصي',
    'auth.html':      'تسجيل الدخول',
  };

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  // Inject shared topbar into pages that have header
  const header = document.querySelector('header');
  if (!header) return;

  // Add nav links to header if not already present
  const headerInner = header.querySelector('.header-inner');
  if (!headerInner) return;

  // Check if nav already exists
  if (header.querySelector('.shared-nav')) return;

  const nav = document.createElement('nav');
  nav.className = 'shared-nav';
  nav.style.cssText = 'display:flex;align-items:center;gap:4px';

  const links = [
    { href:'index.html',   icon:'fa-home',         label:'الرئيسية' },
    { href:'courses.html', icon:'fa-book-open',     label:'الدروس' },
    { href:'about.html',   icon:'fa-info-circle',   label:'من نحن' },
    { href:'contact.html', icon:'fa-envelope',      label:'تواصل معنا' },
  ];

  links.forEach(l => {
    const a = document.createElement('a');
    const isActive = currentPage === l.href;
    a.href = l.href;
    a.innerHTML = `<i class="fas ${l.icon}"></i> <span class="nav-label">${l.label}</span>`;
    a.style.cssText = `
      color:${isActive ? '#fbbf24' : 'rgba(255,255,255,.8)'};
      font-size:.82rem; font-weight:${isActive ? '700' : '500'};
      padding:6px 12px; border-radius:8px; display:flex; align-items:center; gap:6px;
      text-decoration:none; transition:all .2s;
      ${isActive ? 'background:rgba(255,255,255,.1);' : ''}
    `;
    a.onmouseover = () => { if (!isActive) { a.style.background='rgba(255,255,255,.08)'; a.style.color='white'; } };
    a.onmouseout  = () => { if (!isActive) { a.style.background=''; a.style.color='rgba(255,255,255,.8)'; } };
    nav.appendChild(a);
  });

  // Insert nav before the action buttons
  const actionDiv = headerInner.lastElementChild;
  headerInner.insertBefore(nav, actionDiv);

  // Mobile: hide labels on small screens
  const style = document.createElement('style');
  style.textContent = `
    @media(max-width:768px) {
      .shared-nav .nav-label { display:none; }
      .shared-nav a { padding:6px 8px; }
    }
    @media(max-width:480px) {
      .shared-nav { display:none !important; }
    }
  `;
  document.head.appendChild(style);

})();
