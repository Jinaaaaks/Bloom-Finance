// ─── STATE ─────────────────────────────────────────────────────────────
let transactions = JSON.parse(localStorage.getItem('bf_tx')) || [];
let goals = JSON.parse(localStorage.getItem('bf_goals')) || [];
let selectedType = 'income';

// ─── UTILS ─────────────────────────────────────────────────────────────
function sanitize(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ─── DARK MODE ─────────────────────────────────────────────────────────
const darkToggle = document.getElementById('darkToggle');
darkToggle.addEventListener('change', () => {
  document.body.classList.toggle('dark');
  updateAllCharts();
});

// ─── TYPE SELECTOR ─────────────────────────────────────────────────────
function setType(t) {
  selectedType = t;
  document.getElementById('btn-income').className = 'type-btn' + (t==='income' ? ' active-income' : '');
  document.getElementById('btn-expense').className = 'type-btn' + (t==='expense' ? ' active-expense' : '');
}

// ─── ADD TRANSACTION ───────────────────────────────────────────────────
function addTransaction() {
  const desc = document.getElementById('tx-desc').value.trim();
  const amount = parseFloat(document.getElementById('tx-amount').value);
  const date = document.getElementById('tx-date').value;
  if (!desc || isNaN(amount) || amount <= 0 || !date) return;
  transactions.push({ id: Date.now(), desc, amount, date, type: selectedType });
  save();
  render();
  document.getElementById('tx-desc').value = '';
  document.getElementById('tx-amount').value = '';
  document.getElementById('tx-date').value = todayISO();
}

// ─── DELETE TRANSACTION ────────────────────────────────────────────────
function deleteTx(id) {
  transactions = transactions.filter(t => t.id !== id);
  save();
  render();
}

// ─── ADD GOAL ──────────────────────────────────────────────────────────
function addGoal() {
  const desc = document.getElementById('goal-desc').value.trim();
  const target = parseFloat(document.getElementById('goal-target').value);
  const date = document.getElementById('goal-date').value;
  if (!desc || isNaN(target) || target <= 0 || !date) return;
  goals.push({ id: Date.now(), desc, target, date, saved: 0 });
  save();
  renderGoals();
  document.getElementById('goal-desc').value = '';
  document.getElementById('goal-target').value = '';
  document.getElementById('goal-date').value = todayISO();
}

// ─── ADD SAVING TO GOAL ────────────────────────────────────────────────
function addSaving(id, btn) {
  const input = btn.previousElementSibling;
  const val = parseFloat(input.value);
  if (isNaN(val) || val <= 0) return;
  const g = goals.find(g => g.id === id);
  if (g) g.saved = Math.min(g.saved + val, g.target);
  input.value = '';
  save();
  renderGoals();
}

// ─── CLEAR ALL ─────────────────────────────────────────────────────────
function clearAll() {
  if (!confirm('Clear all transactions and goals?')) return;
  transactions = []; goals = [];
  localStorage.removeItem('bf_tx');
  localStorage.removeItem('bf_goals');
  render();
}

// ─── SAVE ──────────────────────────────────────────────────────────────
function save() {
  localStorage.setItem('bf_tx', JSON.stringify(transactions));
  localStorage.setItem('bf_goals', JSON.stringify(goals));
}

// ─── COMPUTED ─────────────────────────────────────────────────────────
function getStats() {
  const income = transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  return { income, expense, balance: income - expense };
}

function fmt(n) {
  return 'Rs' + Math.abs(n).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── RENDER BALANCE ────────────────────────────────────────────────────
function renderBalance() {
  const { income, expense, balance } = getStats();
  document.getElementById('balance-display').textContent =
    (balance < 0 ? '−' : '') + fmt(balance);
  document.getElementById('total-income').textContent = fmt(income);
  document.getElementById('total-expense').textContent = fmt(expense);
}

// ─── RENDER TRANSACTIONS ───────────────────────────────────────────────
function renderTxList() {
  const list = document.getElementById('tx-list');
  const sorted = [...transactions].sort((a,b) => b.date.localeCompare(a.date));
  if (!sorted.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🌸</div>No transactions yet</div>`;
    return;
  }
  list.innerHTML = sorted.map(t => `
    <div class="tx-item ${t.type}">
      <div class="tx-info">
        <strong>${sanitize(t.desc)}</strong>
        <small>${t.date}</small>
      </div>
      <div class="tx-right">
        <span class="tx-amount">${t.type === 'income' ? '+' : '−'}${fmt(t.amount)}</span>
        <button class="del-btn" onclick="deleteTx(${t.id})">✕</button>
      </div>
    </div>
  `).join('');
}

// ─── RENDER GOALS ──────────────────────────────────────────────────────
function renderGoals() {
  const list = document.getElementById('goals-list');
  if (!goals.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🌱</div>No goals yet</div>`;
    return;
  }
  list.innerHTML = goals.map(g => {
    const pct = Math.min((g.saved / g.target) * 100, 100);
    return `
      <div class="goal-item">
        <div class="goal-header">
          <span class="goal-name">${sanitize(g.desc)}</span>
          ${pct >= 100 ? '<span class="badge-reached">✓ Reached</span>' : ''}
        </div>
        <div class="goal-meta">Target: ${fmt(g.target)} · Due ${g.date}</div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="goal-footer">
          <span class="goal-pct">${pct.toFixed(1)}% · Saved ${fmt(g.saved)}</span>
          <div class="goal-add-row">
            <input type="number" placeholder="Add Rs" min="0"/>
            <button class="goal-add-btn" onclick="addSaving(${g.id}, this)">+</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ─── CHARTS ────────────────────────────────────────────────────────────
let donutChart, lineChart, barChart;

function chartColors() {
  const dark = document.body.classList.contains('dark');
  return {
    text: dark ? '#F0EAE4' : '#3D3530',
    textMid: dark ? '#B0A09A' : '#7A6A62',
    grid: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    peach: '#F0A58A',
    sage: '#A8B89A',
    sky: '#8AABC4',
    lavender: '#B5A8C8',
  };
}

function initDonut() {
  const ctx = document.getElementById('donutChart').getContext('2d');
  const c = chartColors();
  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Income', 'Expenses'],
      datasets: [{ data: [0, 0], backgroundColor: [c.sage, c.peach], borderWidth: 0, hoverOffset: 4 }]
    },
    options: {
      cutout: '68%',
      plugins: { legend: { display: false } },
      animation: { animateRotate: true, duration: 700 }
    }
  });
}

function updateDonut() {
  const { income, expense } = getStats();
  const c = chartColors();
  donutChart.data.datasets[0].data = [income || 0.01, expense || 0.01];
  donutChart.data.datasets[0].backgroundColor = [c.sage, c.peach];
  donutChart.update();
  const total = income + expense;
  document.getElementById('donut-ratio').textContent =
    total ? Math.round((income / total) * 100) + '%' : '—';
}

function initLine() {
  const ctx = document.getElementById('lineChart').getContext('2d');
  const c = chartColors();
  lineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Balance',
        data: [],
        borderColor: c.sky,
        backgroundColor: c.sky + '22',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: c.sky,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: c.grid }, ticks: { color: c.textMid, maxTicksLimit: 6, font: { size: 10 } } },
        y: { grid: { color: c.grid }, ticks: { color: c.textMid, font: { size: 10 } } }
      }
    }
  });
}

function updateLine() {
  const sorted = [...transactions].sort((a,b) => {
    const d = a.date.localeCompare(b.date);
    return d !== 0 ? d : a.id - b.id;
  });
  let running = 0;
  const labels = [], data = [];
  sorted.forEach(t => {
    running += t.type === 'income' ? t.amount : -t.amount;
    labels.push(t.date.slice(5));
    data.push(parseFloat(running.toFixed(2)));
  });
  lineChart.data.labels = labels;
  lineChart.data.datasets[0].data = data;
  const c = chartColors();
  lineChart.data.datasets[0].borderColor = c.sky;
  lineChart.data.datasets[0].backgroundColor = c.sky + '22';
  lineChart.data.datasets[0].pointBackgroundColor = c.sky;
  lineChart.options.scales.x.grid.color = c.grid;
  lineChart.options.scales.y.grid.color = c.grid;
  lineChart.options.scales.x.ticks.color = c.textMid;
  lineChart.options.scales.y.ticks.color = c.textMid;
  lineChart.update();
}

function initBar() {
  const ctx = document.getElementById('barChart').getContext('2d');
  const c = chartColors();
  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        { label: 'Income', data: [], backgroundColor: c.sage + 'CC', borderRadius: 6 },
        { label: 'Expenses', data: [], backgroundColor: c.peach + 'CC', borderRadius: 6 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: c.textMid, font: { size: 11 }, boxWidth: 12 }
        }
      },
      scales: {
        x: { grid: { color: c.grid }, ticks: { color: c.textMid, font: { size: 10 } } },
        y: { grid: { color: c.grid }, ticks: { color: c.textMid, font: { size: 10 } } }
      }
    }
  });
}

function updateBar() {
  const monthly = {};
  transactions.forEach(t => {
    const m = t.date.slice(0,7);
    if (!monthly[m]) monthly[m] = { income: 0, expense: 0 };
    monthly[m][t.type === 'income' ? 'income' : 'expense'] += t.amount;
  });
  const labels = Object.keys(monthly).sort();
  const c = chartColors();
  barChart.data.labels = labels;
  barChart.data.datasets[0].data = labels.map(l => monthly[l].income);
  barChart.data.datasets[1].data = labels.map(l => monthly[l].expense);
  barChart.data.datasets[0].backgroundColor = c.sage + 'CC';
  barChart.data.datasets[1].backgroundColor = c.peach + 'CC';
  barChart.options.scales.x.grid.color = c.grid;
  barChart.options.scales.y.grid.color = c.grid;
  barChart.options.scales.x.ticks.color = c.textMid;
  barChart.options.scales.y.ticks.color = c.textMid;
  barChart.options.plugins.legend.labels.color = c.textMid;
  barChart.update();
}

function updateAllCharts() {
  updateDonut(); updateLine(); updateBar();
}

// ─── MASTER RENDER ─────────────────────────────────────────────────────
function render() {
  renderBalance();
  renderTxList();
  renderGoals();
  updateAllCharts();
}

// ─── INIT ──────────────────────────────────────────────────────────────
initDonut(); initLine(); initBar();
// Set default date (using ISO string avoids timezone offset bugs with valueAsDate)
document.getElementById('tx-date').value = todayISO();
document.getElementById('goal-date').value = todayISO();
render();