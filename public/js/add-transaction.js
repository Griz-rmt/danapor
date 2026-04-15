// ===========================
// Danapor — Add Transaction Logic
// ===========================

let selectedType = 'income';
let selectedMoneyType = 'digital';
let selectedCategory = 'Lainnya';

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupUserMenu();
  setupToggles();
  setupCategoryGrid();
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
    dateInput.value = `${year}-${month}-${day}`;
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

  if (selectedMoneyType === 'digital') {
    sourceLabel.textContent = 'Sumber Digital';
    sourceSelect.innerHTML = `
      <option value="">Pilih sumber...</option>
      <option value="GoPay">GoPay</option>
      <option value="OVO">OVO</option>
      <option value="DANA">DANA</option>
      <option value="ShopeePay">ShopeePay</option>
      <option value="Bank Transfer">Bank Transfer</option>
      <option value="Lainnya">Lainnya</option>
    `;
  } else {
    sourceLabel.textContent = 'Sumber Cash';
    sourceSelect.innerHTML = `
      <option value="">Pilih sumber...</option>
      <option value="Dompet">Dompet</option>
      <option value="Celengan">Celengan</option>
      <option value="Amplop">Amplop</option>
      <option value="Lainnya">Lainnya</option>
    `;
  }
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
