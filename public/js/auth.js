// ===========================
// Danapor — Auth Logic
// ===========================

document.addEventListener('DOMContentLoaded', () => {
  // Check if already logged in
  checkAuth();

  // Toggle password visibility
  const toggleBtn = document.getElementById('toggle-password');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const passwordInput = document.getElementById('password');
      const icon = toggleBtn.querySelector('.material-symbols-outlined');
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.textContent = 'visibility_off';
      } else {
        passwordInput.type = 'password';
        icon.textContent = 'visibility';
      }
    });
  }

  // Login Form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Register Form
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
});

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      // Already logged in, redirect to dashboard
      window.location.href = '/dashboard';
    }
  } catch (err) {
    // Not logged in, stay on page
  }
}

async function handleLogin(e) {
  e.preventDefault();
  hideError();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const submitBtn = document.getElementById('submit-btn');
  const btnText = document.getElementById('btn-text');

  if (!email || !password) {
    showError('Mohon isi email dan password');
    return;
  }

  // Loading state
  submitBtn.disabled = true;
  btnText.textContent = 'Memproses...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Login gagal');
      submitBtn.disabled = false;
      btnText.textContent = 'Masuk';
      return;
    }

    // Success — redirect to dashboard
    window.location.href = '/dashboard';

  } catch (err) {
    showError('Gagal menghubungi server');
    submitBtn.disabled = false;
    btnText.textContent = 'Masuk';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  hideError();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const submitBtn = document.getElementById('submit-btn');
  const btnText = document.getElementById('btn-text');

  if (!name || !email || !password || !confirmPassword) {
    showError('Mohon isi semua field');
    return;
  }

  if (password.length < 6) {
    showError('Password minimal 6 karakter');
    return;
  }

  if (password !== confirmPassword) {
    showError('Password dan konfirmasi tidak cocok');
    return;
  }

  // Loading state
  submitBtn.disabled = true;
  btnText.textContent = 'Mendaftar...';

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Registrasi gagal');
      submitBtn.disabled = false;
      btnText.textContent = 'Daftar';
      return;
    }

    // Success — redirect to dashboard
    window.location.href = '/dashboard';

  } catch (err) {
    showError('Gagal menghubungi server');
    submitBtn.disabled = false;
    btnText.textContent = 'Daftar';
  }
}

function showError(message) {
  const errorMsg = document.getElementById('error-msg');
  const errorText = document.getElementById('error-text');
  if (errorMsg && errorText) {
    errorText.textContent = message;
    errorMsg.classList.add('visible');
  }
}

function hideError() {
  const errorMsg = document.getElementById('error-msg');
  if (errorMsg) {
    errorMsg.classList.remove('visible');
  }
}
