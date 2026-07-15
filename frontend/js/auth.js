// API Base URL
// Public pages served through the backend use the same HTTPS origin. Local
// API Base URL
const API_BASE_URL = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:5000/api/auth'
  : 'https://finance-tracker-3l07.onrender.com/api/auth';

// =====================
// SIGNUP FUNCTIONALITY
// =====================

async function handleSignup(event) {
  event.preventDefault();
  
  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const currency = document.getElementById('currency').value;
  const terms = document.getElementById('terms').checked;

  // Validation
  if (!firstName || !lastName || !email || !password) {
    showError('Please fill all required fields.');
    return;
  }

  if (password.length < 6) {
    showError('Password must be at least 6 characters.');
    return;
  }

  if (password !== confirmPassword) {
    showError('Passwords do not match.');
    return;
  }

  if (!terms) {
    showError('Please accept the Terms of Service.');
    return;
  }

  setLoading(true, 'signupBtn');
  try {
    const res = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email, phone, password, currency })
    });

    const data = await res.json();

    if (res.ok) {
      showSuccess('✓ Account created! Please check your email to verify your account.');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    } else {
      showError(data.message || 'Registration failed. Please try again.');
    }
  } catch (err) {
    console.error('Signup error:', err);
    showError('Cannot connect to server. Make sure the backend is running.');
  } finally {
    setLoading(false, 'signupBtn');
  }
}

// =====================
// LOGIN FUNCTIONALITY
// =====================

async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    showError('Please enter email and password.');
    return;
  }

  setLoading(true, 'loginBtn');
  try {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok) {
      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      showSuccess('✓ Login successful! Redirecting to dashboard...');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1500);
    } else {
      showError(data.message || 'Login failed. Please try again.');
    }
  } catch (err) {
    console.error('Login error:', err);
    showError('Cannot connect to server. Make sure the backend is running.');
  } finally {
    setLoading(false, 'loginBtn');
  }
}

// =====================
// PASSWORD RESET
// =====================

async function handleForgotPassword(event) {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();

  if (!email) {
    showError('Please enter your email address.');
    return;
  }

  setLoading(true, 'submitBtn');
  try {
    const res = await fetch(`${API_BASE_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await res.json();

    if (res.ok) {
      showSuccess('✓ OTP sent to your email! Check your inbox.');
      // Show OTP input fields
      document.getElementById('otpSection').style.display = 'block';
      document.getElementById('email').disabled = true;
      document.getElementById('submitBtn').style.display = 'none';
    } else {
      showError(data.message || 'Failed to send reset email.');
    }
  } catch (err) {
    console.error('Forgot password error:', err);
    showError('Cannot connect to server. Please try again later.');
  } finally {
    setLoading(false, 'submitBtn');
  }
}

async function handleVerifyOTP(event) {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const otp = document.getElementById('otp').value.trim();

  if (!otp || otp.length !== 6) {
    showError('Please enter a valid 6-digit OTP.');
    return;
  }

  setLoading(true, 'verifyOtpBtn');
  try {
    const res = await fetch(`${API_BASE_URL}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });

    const data = await res.json();

    if (res.ok) {
      showSuccess('✓ OTP verified! Now set your new password.');
      document.getElementById('otpSection').style.display = 'none';
      document.getElementById('resetSection').style.display = 'block';
    } else {
      showError(data.message || 'Invalid or expired OTP.');
    }
  } catch (err) {
    console.error('OTP verification error:', err);
    showError('Cannot connect to server. Please try again later.');
  } finally {
    setLoading(false, 'verifyOtpBtn');
  }
}

async function handleResetPassword(event) {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const otp = document.getElementById('otp').value.trim();
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmNewPassword').value;

  if (newPassword.length < 6) {
    showError('Password must be at least 6 characters.');
    return;
  }

  if (newPassword !== confirmPassword) {
    showError('Passwords do not match.');
    return;
  }

  setLoading(true, 'resetBtn');
  try {
    const res = await fetch(`${API_BASE_URL}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword })
    });

    const data = await res.json();

    if (res.ok) {
      showSuccess('✓ Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    } else {
      showError(data.message || 'Password reset failed. Please try again.');
    }
  } catch (err) {
    console.error('Reset password error:', err);
    showError('Cannot connect to server. Please try again later.');
  } finally {
    setLoading(false, 'resetBtn');
  }
}

// =====================
// UI HELPER FUNCTIONS
// =====================

function showError(message) {
  const errorMsg = document.getElementById('errorMsg');
  if (errorMsg) {
    document.getElementById('errorText').textContent = message;
    errorMsg.classList.add('show');
    errorMsg.style.display = 'flex';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorMsg.classList.remove('show');
      errorMsg.style.display = 'none';
    }, 5000);
  } else {
    alert(message);
  }
}

function showSuccess(message = '') {
  const successMsg = document.getElementById('successMsg');
  if (successMsg) {
    if (message) {
      const successText = successMsg.querySelector('span');
      if (successText) successText.textContent = message;
    }
    successMsg.classList.add('show');
    successMsg.style.display = 'flex';
  }
}

function setLoading(isLoading, buttonId = null) {
  if (buttonId) {
    const btn = document.getElementById(buttonId);
    if (btn) {
      btn.disabled = isLoading;
      const spinner = btn.querySelector('.spinner');
      const btnText = btn.querySelector('span');
      if (spinner) spinner.style.display = isLoading ? 'block' : 'none';
      if (btnText) btnText.style.opacity = isLoading ? '0.7' : '1';
    }
  }
}

function togglePassword(fieldId, iconId) {
  const input = document.getElementById(fieldId);
  const icon = document.getElementById(iconId);
  
  if (!input || !icon) return;
  
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

function checkStrength(password) {
  const strength = {
    0: { label: '', color: '#ef4444' },
    1: { label: 'Weak', color: '#ef4444' },
    2: { label: 'Fair', color: '#f97316' },
    3: { label: 'Good', color: '#eab308' },
    4: { label: 'Strong', color: '#22c55e' }
  };

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*]/.test(password)) score++;

  for (let i = 1; i <= 4; i++) {
    const segment = document.getElementById(`s${i}`);
    if (segment) {
      segment.style.background = i <= score ? strength[score].color : '#334155';
    }
  }

  const label = document.getElementById('strengthLabel');
  if (label) {
    label.textContent = strength[score].label;
    label.style.color = strength[score].color;
  }
}

// Get token from URL
function getTokenFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}

// Get email from URL
function getEmailFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('email');
}

// Logout function
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

// Get stored user
function getStoredUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

// Get stored token
function getToken() {
  return localStorage.getItem('token');
}

// Check if user is authenticated
function isAuthenticated() {
  return !!getToken();
}
