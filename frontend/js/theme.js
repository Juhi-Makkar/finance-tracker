/* ============================================
   FINTRACK — THEME SYSTEM (theme.js)
   Handles theme switching across all pages
   ============================================ */

const THEMES = ['glass', 'luxury', 'beige', 'trading'];
const DEFAULT_THEME = 'glass';



// Main function to apply a theme
function applyTheme(themeName, animate = true) {
  if (!THEMES.includes(themeName)) themeName = DEFAULT_THEME;

  const body = document.body;

  if (animate) {
    body.classList.add('theme-transitioning');
    setTimeout(() => body.classList.remove('theme-transitioning'), 500);
  }

  // Remove all theme classes
  THEMES.forEach(t => body.classList.remove(`theme-${t}`));

  // Add new theme class
  body.classList.add(`theme-${themeName}`);

  // Save to localStorage
  localStorage.setItem('fintrack-theme', themeName);

  // Update Chart.js colors if charts exist
  updateChartTheme(themeName);

  // Dispatch event so other components can react
  window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: themeName } }));

  return themeName;
}

// Get current theme
function getCurrentTheme() {
  return localStorage.getItem('fintrack-theme') || DEFAULT_THEME;
}

// Theme color palettes for Chart.js
const THEME_CHART_COLORS = {
  glass: {
    grid: 'rgba(255,255,255,0.05)',
    tick: '#94a3b8',
    legend: '#94a3b8',
  },
  luxury: {
    grid: 'rgba(212,175,55,0.08)',
    tick: '#999999',
    legend: '#999999',
  },
  beige: {
    grid: 'rgba(139,115,85,0.1)',
    tick: '#8B7355',
    legend: '#8B7355',
  },
  trading: {
    grid: 'rgba(255,255,255,0.04)',
    tick: '#787B86',
    legend: '#787B86',
  }
};

// Update Chart.js defaults when theme changes
function updateChartTheme(themeName) {
  if (typeof Chart === 'undefined') return;
  const colors = THEME_CHART_COLORS[themeName] || THEME_CHART_COLORS.glass;
  Chart.defaults.color = colors.tick;
  Chart.defaults.borderColor = colors.grid;
  Chart.defaults.plugins.legend.labels.color = colors.legend;
  Chart.defaults.scale = Chart.defaults.scale || {};
  Chart.defaults.scale.grid = { color: colors.grid };
  Chart.defaults.scale.ticks = { color: colors.tick };
}

// Apply theme instantly on page load (before anything renders)
(function applyThemeOnLoad() {
  const saved = localStorage.getItem('fintrack-theme') || DEFAULT_THEME;
  applyTheme(saved, false);
})();

// Font size system
function setFontSize(size) {
  const sizes = { small: '12px', medium: '14px', large: '16px' };
  document.documentElement.style.setProperty('--font-size', sizes[size] || '14px');
  localStorage.setItem('fintrack-fontsize', size);
}

// Border radius system
function setBorderRadius(style) {
  const radii = { compact: '6px', default: '16px', rounded: '24px' };
  const radiiSm = { compact: '4px', default: '10px', rounded: '16px' };
  const radiiLg = { compact: '10px', default: '20px', rounded: '28px' };
  document.documentElement.style.setProperty('--radius', radii[style] || '16px');
  document.documentElement.style.setProperty('--radius-sm', radiiSm[style] || '10px');
  document.documentElement.style.setProperty('--radius-lg', radiiLg[style] || '20px');
  localStorage.setItem('fintrack-radius', style);
}

// Animation toggle
function setAnimations(enabled) {
  if (!enabled) {
    const style = document.createElement('style');
    style.id = 'no-animations';
    style.textContent = '* { transition: none !important; animation: none !important; }';
    document.head.appendChild(style);
  } else {
    const el = document.getElementById('no-animations');
    if (el) el.remove();
  }
  localStorage.setItem('fintrack-animations', enabled);
}

// Load all saved preferences on startup
function loadPreferences() {
  const fontSize = localStorage.getItem('fintrack-fontsize') || 'medium';
  const radius = localStorage.getItem('fintrack-radius') || 'default';
  const animations = localStorage.getItem('fintrack-animations') !== 'false';
  setFontSize(fontSize);
  setBorderRadius(radius);
  if (!animations) setAnimations(false);
}

// Run on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  loadPreferences();
  updateChartTheme(getCurrentTheme());
});

/* ============================================
   APPEARANCE PAGE — Theme Studio Integration
   ============================================ */

// Called from appearance.html Apply buttons
function applyThemeFromUI(themeName) {
  applyTheme(themeName, true);

  // Update all UI in appearance page
  document.querySelectorAll('.theme-card').forEach(card => {
    card.classList.remove('active');
    const badge = card.querySelector('.theme-active-badge');
    const btn = card.querySelector('.btn-apply');
    if (badge) badge.remove();
    if (btn) btn.textContent = 'Apply Theme';
    card.style.borderColor = 'rgba(255,255,255,0.1)';
  });

  // Mark selected card as active
  const selected = document.querySelector(`[data-theme="${themeName}"]`);
  if (selected) {
    selected.classList.add('active');
    selected.style.borderColor = 'var(--accent)';
    const btn = selected.querySelector('.btn-apply');
    if (btn) btn.textContent = '✓ Applied';
    const badge = document.createElement('div');
    badge.className = 'theme-active-badge';
    badge.textContent = '✓ Active';
    selected.prepend(badge);
  }

  // Update active theme display card
  updateActiveThemeDisplay(themeName);
}

function updateActiveThemeDisplay(themeName) {
  const THEME_DATA = {
    glass:   { name:'Apple Glassmorphism',    desc:'Elegant frosted glass UI inspired by Apple Vision Pro', preview:'linear-gradient(135deg,rgba(99,102,241,0.4),rgba(34,211,238,0.2))' },
    luxury:  { name:'Black & Gold Luxury',    desc:'Premium banking experience with rich gold accents',      preview:'linear-gradient(135deg,#D4AF37,#1B1B1B)' },
    beige:   { name:'Beige + Cream Minimal',  desc:'Clean, calm and aesthetically pleasing minimal design',  preview:'linear-gradient(135deg,#e8e0d0,#d4c4a8)' },
    trading: { name:'TradingView Professional',desc:'Professional financial analytics dashboard look',        preview:'linear-gradient(135deg,#2962FF,#131722)' },
  };
  const t = THEME_DATA[themeName] || THEME_DATA.glass;
  const nameEl = document.getElementById('activeThemeName');
  const descEl = document.getElementById('activeThemeDesc');
  const prevEl = document.getElementById('activeThemePreview');
  if (nameEl) nameEl.textContent = t.name;
  if (descEl) descEl.textContent = t.desc;
  if (prevEl) prevEl.style.background = t.preview;
}