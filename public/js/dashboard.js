// ===========================
// Danapor — Dashboard Logic
// ===========================

let barChart = null;
let donutChart = null;

let amountsHidden = localStorage.getItem('amountsHidden') === 'true';

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupUserMenu();
  setupAmountToggle();
});

// ===========================
// Sembunyikan / tampilkan nominal
// ===========================
function setupAmountToggle() {
  const btn = document.getElementById('toggle-amounts');
  if (!btn) return;
  btn.addEventListener('click', () => {
    amountsHidden = !amountsHidden;
    localStorage.setItem('amountsHidden', amountsHidden);
    applyAmountVisibility();
  });
  applyAmountVisibility();
}

// Set nilai nominal asli ke sebuah elemen. Nilai asli disimpan di data-real,
// lalu ditampilkan atau disamarkan sesuai status. Ini SATU-SATUNYA tempat
// yang menulis data-real, jadi titik penyamaran tidak akan pernah tersimpan.
function setAmount(el, realText) {
  if (!el) return;
  el.dataset.real = realText;
  el.textContent = amountsHidden ? 'Rp ••••••' : realText;
}

// Terapkan status sembunyi/tampil ke semua nominal berdasarkan data-real.
// Fungsi ini TIDAK pernah menulis data-real dari textContent.
function applyAmountVisibility() {
  const btn = document.getElementById('toggle-amounts');
  const icon = document.getElementById('eye-icon');

  document.querySelectorAll('.amount-value').forEach(el => {
    // Kalau belum punya nilai asli tersimpan, pakai teks saat ini sebagai asal
    // HANYA jika sedang tampil (bukan titik).
    if (el.dataset.real === undefined && !amountsHidden) {
      el.dataset.real = el.textContent;
    }
    const real = el.dataset.real !== undefined ? el.dataset.real : el.textContent;
    el.textContent = amountsHidden ? 'Rp ••••••' : real;
  });

  if (icon) icon.textContent = amountsHidden ? 'visibility_off' : 'visibility';
  if (btn) {
    const label = amountsHidden ? 'Tampilkan nominal' : 'Sembunyikan nominal';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
  }
}

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) {
      window.location.href = '/';
      return;
    }
    const user = await res.json();
    setupUserInfo(user);
    loadDashboard();
  } catch (err) {
    window.location.href = '/';
  }
}

function setupUserInfo(user) {
  const avatar = document.getElementById('user-avatar');
  const dropdownName = document.getElementById('dropdown-name');

  if (avatar && user.name) {
    avatar.textContent = user.name.charAt(0).toUpperCase();
  }
  if (dropdownName) {
    dropdownName.textContent = user.name;
  }
}

function setupUserMenu() {
  const avatar = document.getElementById('user-avatar');
  const dropdown = document.getElementById('user-dropdown');
  const logoutBtn = document.getElementById('logout-btn');

  if (avatar && dropdown) {
    avatar.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    document.addEventListener('click', () => {
      dropdown.classList.remove('open');
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  } catch (err) {
    window.location.href = '/';
  }
}

async function loadDashboard() {
  try {
    const [summaryRes, chartRes, txRes] = await Promise.all([
      fetch('/api/transactions/summary'),
      fetch('/api/transactions/chart-data'),
      fetch('/api/transactions')
    ]);

    if (summaryRes.ok) {
      const summary = await summaryRes.json();
      renderSummary(summary);
    }

    if (chartRes.ok) {
      const chartData = await chartRes.json();
      renderBarChart(chartData.monthly);
      renderDonutChart(chartData.categories);
    }

    if (txRes.ok) {
      const transactions = await txRes.json();
      renderTransactions(transactions.slice(0, 5));
    }

  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

function formatRupiah(amount) {
  const abs = Math.abs(amount);
  return 'Rp ' + abs.toLocaleString('id-ID');
}

function renderSummary(summary) {
  setAmount(document.getElementById('total-balance'), formatRupiah(summary.totalBalance));
  setAmount(document.getElementById('monthly-income'), '+' + formatRupiah(summary.monthlyIncome));
  setAmount(document.getElementById('monthly-expense'), '-' + formatRupiah(summary.monthlyExpense));
  setAmount(document.getElementById('digital-balance'), formatRupiah(summary.digitalBalance));
  setAmount(document.getElementById('cash-balance'), formatRupiah(summary.cashBalance));
}

function renderBarChart(monthly) {
  const ctx = document.getElementById('bar-chart');
  if (!ctx) return;

  if (barChart) barChart.destroy();

  const labels = monthly.map(m => m.label);
  const incomeData = monthly.map(m => m.income);
  const expenseData = monthly.map(m => m.expense);

  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Pemasukan',
          data: incomeData,
          backgroundColor: 'rgba(52, 211, 153, 0.7)',
          borderColor: 'rgba(52, 211, 153, 1)',
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: 'Pengeluaran',
          data: expenseData,
          backgroundColor: 'rgba(248, 113, 113, 0.7)',
          borderColor: 'rgba(248, 113, 113, 1)',
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          callbacks: {
            label: function (context) {
              return context.dataset.label + ': ' + formatRupiah(context.parsed.y);
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#64748b',
            font: { size: 11, family: 'DM Sans' }
          }
        },
        y: {
          grid: {
            color: 'rgba(255,255,255,0.05)',
            drawBorder: false
          },
          ticks: {
            color: '#64748b',
            font: { size: 11, family: 'DM Sans' },
            callback: function (value) {
              if (value >= 1000000) return 'Rp ' + (value / 1000000).toFixed(1) + 'jt';
              if (value >= 1000) return 'Rp ' + (value / 1000).toFixed(0) + 'rb';
              return 'Rp ' + value;
            }
          }
        }
      }
    }
  });
}

function renderDonutChart(categories) {
  const ctx = document.getElementById('donut-chart');
  if (!ctx) return;

  if (donutChart) donutChart.destroy();

  if (!categories || categories.length === 0) {
    // Show empty state
    donutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Belum ada data'],
        datasets: [{
          data: [1],
          backgroundColor: ['rgba(255,255,255,0.05)'],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        }
      }
    });
    return;
  }

  const colors = [
    'rgba(99, 102, 241, 0.8)',
    'rgba(45, 212, 191, 0.8)',
    'rgba(248, 113, 113, 0.8)',
    'rgba(251, 191, 36, 0.8)',
    'rgba(139, 92, 246, 0.8)',
    'rgba(52, 211, 153, 0.8)',
    'rgba(236, 72, 153, 0.8)',
    'rgba(96, 165, 250, 0.8)',
    'rgba(167, 139, 250, 0.8)',
  ];

  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: categories.map(c => c.category),
      datasets: [{
        data: categories.map(c => c.total),
        backgroundColor: colors.slice(0, categories.length),
        borderWidth: 0,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#94a3b8',
            font: { size: 11, family: 'DM Sans' },
            padding: 12,
            usePointStyle: true,
            pointStyleWidth: 10,
          }
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          callbacks: {
            label: function (context) {
              return context.label + ': ' + formatRupiah(context.parsed);
            }
          }
        }
      }
    }
  });
}

const categoryIcons = {
  'Makanan': 'restaurant',
  'Transport': 'commute',
  'Belanja': 'shopping_cart',
  'Tagihan': 'receipt_long',
  'Hiburan': 'sports_esports',
  'Kesehatan': 'health_and_safety',
  'Pendidikan': 'school',
  'Gaji': 'work',
  'Lainnya': 'more_horiz'
};

function renderTransactions(transactions) {
  const list = document.getElementById('transaction-list');
  if (!list) return;

  if (!transactions || transactions.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="material-symbols-outlined">receipt_long</span>
        <p>Belum ada transaksi. Mulai catat keuangan Anda!</p>
      </div>
    `;
    return;
  }

  list.innerHTML = transactions.map(tx => {
    const isIncome = tx.type === 'income';
    const icon = categoryIcons[tx.category] || 'more_horiz';
    const sign = isIncome ? '+' : '-';
    const typeClass = isIncome ? 'income' : 'expense';
    const moneyLabel = tx.money_type === 'cash' ? 'Cash' : 'Digital';
    const sourceLabel = tx.source ? ` • ${tx.source}` : '';
    const dateObj = new Date(tx.date);
    let dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    if (tx.date.includes('T')) {
      const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
      dateStr += ` • ${timeStr}`;
    }

    return `
      <div class="transaction-item animate-slide-up" data-id="${tx.id}">
        <div class="tx-icon ${typeClass}">
          <span class="material-symbols-outlined">${icon}</span>
        </div>
        <div class="tx-details">
          <div class="tx-name">${tx.description || tx.category}</div>
          <div class="tx-meta">${moneyLabel}${sourceLabel} • ${tx.category}</div>
        </div>
        <div class="tx-right">
          <div class="tx-amount amount-value ${typeClass}" data-real="${sign}${formatRupiah(tx.amount)}">${sign}${formatRupiah(tx.amount)}</div>
          <div class="tx-date">${dateStr}</div>
        </div>
        <button class="tx-delete" onclick="deleteTransaction('${tx.id}')" title="Hapus">
          <span class="material-symbols-outlined" style="font-size:1.1rem;">close</span>
        </button>
      </div>
    `;
  }).join('');

  applyAmountVisibility();
}

async function deleteTransaction(id) {
  if (!confirm('Hapus transaksi ini?')) return;

  try {
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Transaksi berhasil dihapus', 'success');
      loadDashboard();
    } else {
      showToast('Gagal menghapus transaksi', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan', 'error');
  }
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastIcon = document.getElementById('toast-icon');
  const toastMessage = document.getElementById('toast-message');

  toast.className = 'toast ' + type;
  toastIcon.textContent = type === 'success' ? 'check_circle' : 'error';
  toastMessage.textContent = message;

  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
