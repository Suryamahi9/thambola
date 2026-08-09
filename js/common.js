// ===== Shared: theme, nav, footer, toast =====

// ---- Theme ----
const themeToggleBtn = () => document.querySelector('.theme-toggle');
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeToggleBtn()) {
        themeToggleBtn().textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem('tambola-theme', current);
    applyTheme(current);
}

// ---- Nav / Footer injection ----
const navLinks = [
    { href: 'index.html', label: 'Home', active: 'index.html' },
    { href: 'game.html', label: 'Play Game', active: 'game.html' },
    { href: 'tickets.html', label: 'Tickets', active: 'tickets.html' },
    { href: 'rules.html', label: 'Rules', active: 'rules.html' }
];

function getPageName() {
    return (location.pathname.split('/').pop() || 'index.html');
}

function renderNav() {
    const current = getPageName();
    const links = navLinks.map(l =>
        `<a href="${l.href}" class="${l.active === current ? 'active' : ''}">${l.label}</a>`
    ).join('');
    const nav = document.querySelector('.navbar .container');
    if (!nav) return;
    nav.innerHTML = `
        <a href="index.html" class="brand">
            <span class="brand-badge">🎯</span>
            <span>Tambola</span>
        </a>
        <div class="nav-links">
            ${links}
            <button class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle dark mode">🌙</button>
            <a href="game.html" class="nav-cta">▶ Start Game</a>
        </div>`;
}

function renderFooter() {
    const footer = document.querySelector('footer');
    if (!footer) return;
    footer.innerHTML = `
        <div class="footer-inner">
            <p>🎯 Tambola Number Generator — Free Housie/Bingo Caller</p>
            <div class="footer-links">
                <a href="rules.html">Rules</a>
                <a href="tickets.html">Tickets</a>
                <a href="game.html">Play</a>
            </div>
            <p style="opacity:0.7;">Runs in your browser · No signup · No ads</p>
        </div>`;
}

// ---- Toast ----
function showToast(message, duration = 2600) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
    applyTheme(localStorage.getItem('tambola-theme') || 'light');
    renderNav();
    renderFooter();
});
