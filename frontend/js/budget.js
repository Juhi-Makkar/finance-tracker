/* ============================================
   FINTRACK — BUDGET MANAGER (budget.js)
   Real-time sync with transactions
   ============================================ */

let budgets = [];
let editingId = null;
let budgetChart = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  checkAuth();
  document.getElementById('budgetMonth').textContent =
    new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  await loadBudgets();
});

// === REAL-TIME SYNC LISTENERS ===

// Reload when page regains focus
window.addEventListener('focus', loadBudgets);

// Reload when tab becomes visible
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) loadBudgets();
});

// === AUTH CHECKS ===

function checkAuth() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token');
  if (!user || !token) {
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('sidebarAvatar').textContent =
    ((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase() || 'U';
  document.getElementById('sidebarName').textContent =
    `${user.firstName || ''} ${user.lastName || ''}`.trim();
  document.getElementById('sidebarEmail').textContent = user.email || '';
}

// === BUDGET LOADING ===

async function loadBudgets() {
  console.log('Budget: Loading budgets from API...');
  try {
    budgets = await Budgets.getAll();
    console.log('Budget: Loaded', budgets.length, 'budgets');
    render();
  } catch (err) {
    console.error('Budget: Load error:', err);
    alert('Could not load budgets. Make sure backend and MongoDB are running.');
    budgets = [];
    render();
  }
}

// === HELPERS ===

function formatCurrency(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

function getSpent(budget) {
  return Number(budget.spent || 0);
}

function getLimit(budget) {
  return Number(budget.limit || 0);
}

// === RENDERING ===

function render() {
  let totalBudget = 0;
  let totalSpent = 0;
  let overCount = 0;
  const list = document.getElementById('budgetList');

  if (!budgets.length) {
    list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">
      <i class="fas fa-wallet" style="font-size:40px;opacity:0.3;display:block;margin-bottom:12px"></i>
      <p>No budgets yet. Click "Add Budget" to get started!</p>
    </div>`;
    updateSummary(0, 0, 0, 0);
    renderChart();
    return;
  }

  list.innerHTML = budgets.map(b => {
    const id = b._id;
    const spent = getSpent(b);
    const limit = getLimit(b);
    const pct = limit ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
    const over = spent > limit;
    const warn = pct >= 80 && !over;

    totalBudget += limit;
    totalSpent += spent;
    if (over) overCount++;

    const color = over ? '#ef4444' : warn ? '#fbbf24' : '#22c55e';
    const statusClass = over ? 'status-over' : warn ? 'status-warn' : 'status-ok';
    const statusText = over ? '⚠️ Over Budget' : warn ? '⚠️ Near Limit' : '✅ On Track';

    return `
      <div class="budget-item">
        <div class="budget-top">
          <div class="budget-left">
            <div class="b-icon" style="background:rgba(99,102,241,0.1);font-size:20px">${b.icon || '💰'}</div>
            <div>
              <div class="b-name">${b.category}</div>
              <div class="b-cat">Monthly Budget</div>
            </div>
          </div>
          <div class="budget-right">
            <div class="b-spent" style="color:${color}">${formatCurrency(spent)}</div>
            <div class="b-limit">of ${formatCurrency(limit)}</div>
          </div>
        </div>
        <div class="prog-bar"><div class="prog-fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="budget-footer">
          <span class="b-pct">${pct}% used • ${formatCurrency(Math.max(limit - spent, 0))} left</span>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="b-status ${statusClass}">${statusText}</span>
            <button class="btn-edit-b" onclick="addSpent('${id}')" title="Add spent"><i class="fas fa-plus"></i></button>
            <button class="btn-edit-b" onclick="editBudget('${id}')" title="Edit budget"><i class="fas fa-pen"></i></button>
          </div>
        </div>
      </div>`;
  }).join('');

  updateSummary(totalBudget, totalSpent, totalBudget - totalSpent, overCount);
  renderChart();
}

function updateSummary(total, spent, remaining, over) {
  document.getElementById('sumTotal').textContent = formatCurrency(total);
  document.getElementById('sumSpent').textContent = formatCurrency(spent);
  document.getElementById('sumRemaining').textContent = formatCurrency(Math.max(remaining, 0));
  document.getElementById('sumOver').textContent = over;
}

function renderChart() {
  if (budgetChart) budgetChart.destroy();

  const labels = budgets.map(b => b.category);
  const spent = budgets.map(b => getSpent(b));
  const remaining = budgets.map(b => Math.max(getLimit(b) - getSpent(b), 0));

  const chartCanvas = document.getElementById('budgetChart');
  if (!chartCanvas) return;

  budgetChart = new Chart(chartCanvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Spent', data: spent, backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 4 },
        { label: 'Remaining', data: remaining, backgroundColor: 'rgba(34,197,94,0.3)', borderRadius: 4 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#94a3b8', font: { size: 10 } } } },
      scales: {
        x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.04)' } }
      }
    }
  });
}

// === MODAL MANAGEMENT ===

function openModal(id = null) {
  editingId = id;
  document.getElementById('modalTitle').textContent = id ? 'Edit Budget' : 'Add Budget';
  document.getElementById('deleteBtn').style.display = id ? 'block' : 'none';

  if (id) {
    const b = budgets.find(item => item._id === id);
    document.getElementById('mCat').value = b.category;
    document.getElementById('mLimit').value = b.limit;
    document.getElementById('mIcon').value = b.icon || '💰';
  } else {
    document.getElementById('mCat').value = 'Food';
    document.getElementById('mLimit').value = '';
    document.getElementById('mIcon').selectedIndex = 0;
  }

  document.getElementById('modalOverlay').classList.add('show');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
  editingId = null;
}

document.getElementById('modalOverlay')?.addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// === BUDGET CRUD ===

async function saveBudget() {
  const category = document.getElementById('mCat').value;
  const limit = Number(document.getElementById('mLimit').value);
  const icon = document.getElementById('mIcon').value;

  if (!limit || limit <= 0) {
    alert('Please enter a valid amount.');
    return;
  }

  try {
    if (editingId) {
      await Budgets.update(editingId, { category, limit, icon });
    } else {
      if (budgets.find(b => b.category === category)) {
        alert('Budget for this category already exists!');
        return;
      }
      await Budgets.add({ category, limit, icon, spent: 0 });
    }
    closeModal();
    await loadBudgets();
  } catch (err) {
    console.error('Save error:', err);
    alert(err.message || 'Could not save budget.');
  }
}

async function deleteBudget() {
  if (!editingId || !confirm('Delete this budget?')) return;

  try {
    await Budgets.delete(editingId);
    closeModal();
    await loadBudgets();
  } catch (err) {
    console.error('Delete error:', err);
    alert(err.message || 'Could not delete budget.');
  }
}

function editBudget(id) {
  openModal(id);
}

async function quickAdd() {
  const category = document.getElementById('quickCat').value;
  const limit = Number(document.getElementById('quickLimit').value);

  if (!limit || limit <= 0) {
    alert('Enter a valid amount.');
    return;
  }

  if (budgets.find(b => b.category === category)) {
    alert('Budget for this category already exists!');
    return;
  }

  try {
    await Budgets.add({ category, limit, icon: '💰', spent: 0 });
    document.getElementById('quickLimit').value = '';
    await loadBudgets();
  } catch (err) {
    console.error('Quick add error:', err);
    alert(err.message || 'Could not add budget.');
  }
}

async function addSpent(id) {
  const budget = budgets.find(b => b._id === id || b.id === id);
  if (!budget) return;

  const amount = Number(prompt(`Enter spent amount for ${budget.category} (current spent ₹${formatCurrency(getSpent(budget)).slice(1)}):`));
  if (!amount || amount <= 0) {
    return;
  }

  try {
    const updatedSpent = getSpent(budget) + amount;
    await Budgets.update(id, { spent: updatedSpent });
    await loadBudgets();
  } catch (err) {
    console.error('Add spent error:', err);
    alert(err.message || 'Could not update budget spend.');
  }
}

// === NAVIGATION ===

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}
