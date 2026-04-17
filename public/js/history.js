// ===========================
// Danapor — History Logic
// ===========================

let allTransactions = [];

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupUserMenu();
  setupSorting();
  setupFilters();
});

function setupFilters() {
  const dateFilter = document.getElementById('date-filter');
  const monthFilter = document.getElementById('month-filter');

  if (dateFilter) {
    dateFilter.addEventListener('change', () => {
      if (dateFilter.value) {
        monthFilter.value = ''; // Clear month if date is selected
      }
      sortAndRender();
    });
  }

  if (monthFilter) {
    monthFilter.addEventListener('change', () => {
      if (monthFilter.value) {
        dateFilter.value = ''; // Clear date if month is selected
      }
      sortAndRender();
    });
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
    loadHistory();
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
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
      } catch (err) {}
    });
  }
}

async function loadHistory() {
  try {
    const res = await fetch('/api/transactions');
    if (res.ok) {
      allTransactions = await res.json();
      sortAndRender();
    } else {
      showErrorState();
    }
  } catch (err) {
    console.error('History load error:', err);
    showErrorState();
  }
}

function setupSorting() {
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      sortAndRender();
    });
  }
}

function sortAndRender() {
  const sortValue = document.getElementById('sort-select') ? document.getElementById('sort-select').value : 'newest';
  const dateValue = document.getElementById('date-filter') ? document.getElementById('date-filter').value : '';
  const monthValue = document.getElementById('month-filter') ? document.getElementById('month-filter').value : '';
  
  let filtered = [...allTransactions];

  // Apply Filters
  if (dateValue) {
    filtered = filtered.filter(tx => tx.date.startsWith(dateValue));
  } else if (monthValue) {
    const [year, month] = monthValue.split('-');
    filtered = filtered.filter(tx => {
      const txDate = new Date(tx.date);
      const txYear = String(txDate.getFullYear());
      const txMonth = String(txDate.getMonth() + 1).padStart(2, '0');
      return txYear === year && txMonth === month;
    });
  }
  
  // Apply Sorting
  switch(sortValue) {
    case 'newest':
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.created_at) - new Date(a.created_at));
      break;
    case 'oldest':
      filtered.sort((a, b) => new Date(a.date) - new Date(b.date) || new Date(a.created_at) - new Date(b.created_at));
      break;
    case 'highest':
      filtered.sort((a, b) => b.amount - a.amount);
      break;
    case 'lowest':
      filtered.sort((a, b) => a.amount - b.amount);
      break;
  }
  
  renderTransactions(filtered);
}

function formatRupiah(amount) {
  const abs = Math.abs(amount);
  return 'Rp ' + abs.toLocaleString('id-ID');
}

const categoryIcons = {
  // Expense
  'Makanan': 'restaurant',
  'Transport': 'commute',
  'Belanja': 'shopping_cart',
  'Tagihan': 'receipt_long',
  'Hiburan': 'sports_esports',
  'Kesehatan': 'health_and_safety',
  'Pendidikan': 'school',
  // Income
  'Gaji': 'work',
  'Uang Sangu': 'payments',
  'Transfer Bank': 'account_balance',
  'E-Walet': 'account_balance_wallet',
  'Cash': 'savings',
  // Common
  'Lainnya': 'more_horiz'
};

function renderTransactions(transactions) {
  const list = document.getElementById('transaction-list');
  if (!list) return;

  if (!transactions || transactions.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="material-symbols-outlined">receipt_long</span>
        <p>Belum ada transaksi sama sekali.</p>
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
          <div class="tx-amount ${typeClass}">${sign}${formatRupiah(tx.amount)}</div>
          <div class="tx-date">${dateStr}</div>
        </div>
        <button class="tx-delete" onclick="deleteTransaction('${tx.id}')" title="Hapus">
          <span class="material-symbols-outlined" style="font-size:1.1rem;">close</span>
        </button>
      </div>
    `;
  }).join('');
}

function showErrorState() {
  const list = document.getElementById('transaction-list');
  if (list) {
    list.innerHTML = `
      <div class="empty-state" style="color: var(--color-expense);">
        <span class="material-symbols-outlined">error</span>
        <p>Gagal memuat histori transaksi.</p>
      </div>
    `;
  }
}

async function deleteTransaction(id) {
  if (!confirm('Hapus transaksi ini?')) return;

  try {
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Transaksi berhasil dihapus', 'success');
      loadHistory();
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
  
  if (!toast) return;

  toast.className = 'toast ' + type;
  toastIcon.textContent = type === 'success' ? 'check_circle' : 'error';
  toastMessage.textContent = message;

  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
