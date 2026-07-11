/* ============================================
   FINTRACK — CENTRAL API (api.js)
   ALL data goes to MongoDB — no localStorage for user data
   ============================================ */

const API_BASE = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:5000/api'
  : 'https://finance-tracker-3l07.onrender.com/api'; 

function getToken() { return localStorage.getItem('token'); }
function getUser()  { return JSON.parse(localStorage.getItem('user') || 'null'); }

async function apiFetch(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` };
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

/* ── AUTH ── */
const Auth = {
  register:       (data) => apiFetch('/auth/register', 'POST', data),
  login:          (data) => apiFetch('/auth/login', 'POST', data),
  getMe:          ()     => apiFetch('/auth/me'),
  updateProfile:  (data) => apiFetch('/auth/me', 'PUT', data),
  changePassword: (data) => apiFetch('/auth/change-password', 'PUT', data),
  forgotPassword: (data) => apiFetch('/auth/forgot-password', 'POST', data),
  verifyOtp:      (data) => apiFetch('/auth/verify-otp', 'POST', data),
  resetPassword:  (data) => apiFetch('/auth/reset-password', 'POST', data),
};

/* ── TRANSACTIONS ── */
const Transactions = {
  getAll:   (params = {}) => apiFetch('/transactions?' + new URLSearchParams(params).toString()),
  add:      (data)        => apiFetch('/transactions', 'POST', data),
  update:   (id, data)    => apiFetch(`/transactions/${id}`, 'PUT', data),
  delete:   (id)          => apiFetch(`/transactions/${id}`, 'DELETE'),
  summary:  (params = {}) => apiFetch('/transactions/summary?' + new URLSearchParams(params).toString()),
};

/* ── GOALS ── */
const Goals = {
  getAll:     ()              => apiFetch('/goals'),
  add:        (data)          => apiFetch('/goals', 'POST', data),
  update:     (id, data)      => apiFetch(`/goals/${id}`, 'PUT', data),
  addSavings: (id, amount)    => apiFetch(`/goals/${id}/savings`, 'PUT', { amount }),
  delete:     (id)            => apiFetch(`/goals/${id}`, 'DELETE'),
};

/* ── BUDGETS ── */
const Budgets = {
  getAll: ()         => apiFetch('/budgets'),
  add:    (data)     => apiFetch('/budgets', 'POST', data),
  update: (id, data) => apiFetch(`/budgets/${id}`, 'PUT', data),
  delete: (id)       => apiFetch(`/budgets/${id}`, 'DELETE'),
};

/* ── RECURRING ── */
const Recurring = {
  getAll: ()          => apiFetch('/recurring'),
  add:    (data)      => apiFetch('/recurring', 'POST', data),
  update: (id, data)  => apiFetch(`/recurring/${id}`, 'PUT', data),
  delete: (id)        => apiFetch(`/recurring/${id}`, 'DELETE'),
};

/* ── REPORTS ── */
const Reports = {
  monthly:  (year)              => apiFetch(`/reports/monthly?year=${year}`),
  category: (month, year, type) => apiFetch(`/reports/category?month=${month}&year=${year}&type=${type}`),
};

/* ── HELPERS ── */
function formatCurrency(amount) {
  const user = getUser();
  const symbols = { INR:'₹', USD:'$', EUR:'€', GBP:'£' };
  const symbol = symbols[user?.currency || 'INR'] || '₹';
  return symbol + Number(amount).toLocaleString('en-IN', { minimumFractionDigits:0, maximumFractionDigits:2 });
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

function isLoggedIn() { return !!(getToken() && getUser()); }

function redirectIfNotLoggedIn() {
  if (!isLoggedIn()) window.location.href = 'login.html';
}

function logout() {
  // Only clear auth — NOT transactions/goals/budgets (they're in MongoDB now)
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}
