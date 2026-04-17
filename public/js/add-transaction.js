const CATEGORIES = {
  income: [
    { id: 'Gaji', icon: 'work', label: 'Gaji' },
    { id: 'Uang Sangu', icon: 'payments', label: 'Uang Sangu' },
    { id: 'Transfer Bank', icon: 'account_balance', label: 'Transfer Bank' },
    { id: 'E-Walet', icon: 'account_balance_wallet', label: 'E-Walet' },
    { id: 'Cash', icon: 'savings', label: 'Cash' },
    { id: 'Lainnya', icon: 'more_horiz', label: 'Lainnya' }
  ],
  expense: [
    { id: 'Makanan', icon: 'restaurant', label: 'Makanan' },
    { id: 'Transport', icon: 'commute', label: 'Transport' },
    { id: 'Belanja', icon: 'shopping_cart', label: 'Belanja' },
    { id: 'Kesehatan', icon: 'health_and_safety', label: 'Kesehatan' },
    { id: 'Hiburan', icon: 'sports_esports', label: 'Hiburan' },
    { id: 'Tagihan', icon: 'receipt_long', label: 'Tagihan' },
    { id: 'Pendidikan', icon: 'school', label: 'Pendidikan' },
    { id: 'Lainnya', icon: 'more_horiz', label: 'Lainnya' }
  ]
};

const MONEY_SOURCES = {
  cash: ['Dompet', 'Celengan', 'Kantong', 'Amplop', 'Lainnya'],
  digital: ['QRIS', 'Bank', 'Dana', 'GoPay', 'OVO', 'ShopeePay', 'Jago', 'Lainnya']
};

let selectedType = 'income';
let selectedMoneyType = 'digital';
let selectedCategory = '';

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupUserMenu();
  setupToggles();
  renderCategories();
  updateSourceField();
  setupForm();
  setTodayDate();
});

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) {
      window.location.href = '/';
      return;
    }
    const user = await res.json();
    setupUserInfo(user);
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
      } catch (err) {
        window.location.href = '/';
      }
    });
  }
}

function setTodayDate() {
  const dateInput = document.getElementById('date');
  if (dateInput) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}

function setupToggles() {
  // Type toggle (income/expense)
  const typeToggle = document.getElementById('type-toggle');
  if (typeToggle) {
    const buttons = typeToggle.querySelectorAll('.toggle-option');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => {
          b.classList.remove('active', 'active-income', 'active-expense');
        });
        selectedType = btn.dataset.value;
        const activeClass = selectedType === 'income' ? 'active-income' : 'active-expense';
        btn.classList.add(activeClass);
        
        // Update labels and categories when type changes
        updateSourceField();
        renderCategories();
      });
    });
  }

  // Money type toggle (cash/digital)
  const moneyToggle = document.getElementById('money-type-toggle');
  if (moneyToggle) {
    const buttons = moneyToggle.querySelectorAll('.toggle-option');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedMoneyType = btn.dataset.value;
        updateSourceField();
      });
    });
  }
}

function updateSourceField() {
  const sourceGroup = document.getElementById('source-group');
  const sourceLabel = document.getElementById('source-label');
  const sourceSelect = document.getElementById('source');

  if (!sourceGroup || !sourceLabel || !sourceSelect) return;

  const isIncome = selectedType === 'income';
  const prefix = isIncome ? 'Penyimpanan' : 'Sumber';
  const typeLabel = selectedMoneyType === 'digital' ? 'Digital' : 'Cash';
  
  sourceLabel.textContent = `${prefix} ${typeLabel}`;

  const options = MONEY_SOURCES[selectedMoneyType];
  sourceSelect.innerHTML = `
    <option value="">Pilih ${prefix.toLowerCase()}...</option>
    ${options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
  `;
}

function renderCategories() {
  const categoryGrid = document.getElementById('category-grid');
  if (!categoryGrid) return;

  const categories = CATEGORIES[selectedType];
  
  categoryGrid.innerHTML = categories.map((cat, index) => `
    <div class="category-item ${index === categories.length - 1 ? 'active' : ''}" data-category="${cat.id}">
      <span class="material-symbols-outlined">${cat.icon}</span>
      <span class="cat-label">${cat.label}</span>
    </div>
  `).join('');

  // Set default selected category to the last one (Lainnya)
  selectedCategory = categories[categories.length - 1].id;

  // Re-attach listeners
  setupCategoryGrid();
}

function setupCategoryGrid() {
  const categoryGrid = document.getElementById('category-grid');
  if (!categoryGrid) return;

  const items = categoryGrid.querySelectorAll('.category-item');
  items.forEach(item => {
    item.addEventListener('click', () => {
      items.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      selectedCategory = item.dataset.category;
    });
  });
}

function setupForm() {
  const form = document.getElementById('transaction-form');
  const amountInput = document.getElementById('amount');

  if (amountInput) {
    amountInput.addEventListener('input', function(e) {
      // Hapus semua karakter yang bukan angka
      let value = this.value.replace(/\D/g, '');
      
      if (value) {
        // Format dengan pemisah ribuan satuan Indonesia (.)
        this.value = parseInt(value, 10).toLocaleString('id-ID');
      } else {
        this.value = '';
      }
    });
  }

  if (!form) return;

  form.addEventListener('submit', handleSubmit);
}

async function handleSubmit(e) {
  e.preventDefault();

  const amountStr = document.getElementById('amount').value;
  // Hilangkan titik sebelum konversi ke angka
  const amountVal = amountStr.replace(/\./g, '');
  const amount = parseFloat(amountVal);

  const date = document.getElementById('date').value;
  const source = document.getElementById('source').value;
  const description = document.getElementById('description').value.trim();
  const submitBtn = document.getElementById('submit-btn');
  const btnText = document.getElementById('btn-text');

  if (!amount || isNaN(amount) || amount <= 0) {
    showToast('Masukkan jumlah yang valid', 'error');
    return;
  }

  if (!date) {
    showToast('Pilih tanggal transaksi', 'error');
    return;
  }

  // Loading state
  submitBtn.disabled = true;
  btnText.textContent = 'Menyimpan...';

  try {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: selectedType,
        amount: amount,
        money_type: selectedMoneyType,
        source,
        category: selectedCategory,
        description,
        date
      })
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Gagal menyimpan transaksi', 'error');
      submitBtn.disabled = false;
      btnText.textContent = 'Simpan Transaksi';
      return;
    }

    showToast('Transaksi berhasil disimpan!', 'success');

    // Reset form
    document.getElementById('amount').value = '';
    document.getElementById('description').value = '';
    document.getElementById('source').selectedIndex = 0;

    submitBtn.disabled = false;
    btnText.textContent = 'Simpan Transaksi';

    // Redirect after short delay
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1500);

  } catch (err) {
    showToast('Gagal menghubungi server', 'error');
    submitBtn.disabled = false;
    btnText.textContent = 'Simpan Transaksi';
  }
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastIcon = document.getElementById('toast-icon');
  const toastMessage = document.getElementById('toast-message');

  if (!toast || !toastIcon || !toastMessage) return;

  toast.className = 'toast ' + type;
  toastIcon.textContent = type === 'success' ? 'check_circle' : 'error';
  toastMessage.textContent = message;

  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
