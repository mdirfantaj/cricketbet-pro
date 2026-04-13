// config.js - Environment-aware
const CONFIG = {
  API: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  IDLE_TIMEOUT: 10 * 60 * 1000,
  POLL_INTERVAL: 10000
};

// state.js - Centralized state
const state = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  matches: [],
  balance: 0
};

// utils.js - Shared utilities
const utils = {
  sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
  
  validateAmount(amount, balance) {
    const num = parseFloat(amount);
    return num > 0 && num <= balance && !isNaN(num);
  },
  
  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.token}`
    };
  },
  
  clearAuth() {
    state.user = null;
    state.token = null;
    state.isAuthenticated = false;
    state.balance = 0;
    localStorage.clear();
  }
};

// api.js - Centralized API layer
const api = {
  async authenticatedRequest(url, options = {}) {
    if (!state.isAuthenticated) throw new Error('Not authenticated');
    
    const response = await fetch(`${CONFIG.API}${url}`, {
      ...options,
      headers: {
        ...utils.getAuthHeaders(),
        ...options.headers
      }
    });
    
    if (response.status === 401) {
      utils.clearAuth();
      window.location.href = '/login';
      throw new Error('Session expired');
    }
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    return response.json();
  },
  
  async login(email, password) {
    const response = await fetch(`${CONFIG.API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Login failed');
    }
    
    const data = await response.json();
    return data;
  }
};

// auth.js - Authentication manager
const auth = {
  async login(email, password) {
    try {
      state.isLoading = true;
      const data = await api.login(email, password);
      
      if (!data.user || !data.token) {
        throw new Error('Invalid credentials');
      }
      
      state.user = data.user;
      state.token = data.token;
      state.isAuthenticated = true;
      state.balance = data.user.balance;
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      ui.updateUI();
      loadMatches();
      resetIdleTimer();
      
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      state.isLoading = false;
    }
  },
  
  logout() {
    utils.clearAuth();
    showNotification('Session expired. Please login again.', 'warning');
    ui.updateUI();
    window.location.reload();
  }
};

// ui.js - UI management
const ui = {
  updateUI() {
    document.getElementById('bal')?.classList.toggle('hidden', !state.isAuthenticated);
    document.getElementById('login-form')?.classList.toggle('hidden', state.isAuthenticated);
    
    // Disable all bet buttons if not authenticated
    document.querySelectorAll('.bet-btn').forEach(btn => {
      btn.disabled = !state.isAuthenticated;
      btn.textContent = state.isAuthenticated ? 'Bet' : 'Login Required';
    });
  },
  
  setLoading(elementId, loading) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.classList.toggle('loading', loading);
    el.disabled = loading;
  }
};

// main.js - Core app logic
async function loadMatches() {
  if (!state.isAuthenticated) return;
  
  try {
    ui.setLoading('matches', true);
    const data = await api.authenticatedRequest('/matches');
    state.matches = data;
    renderMatches();
  } catch (error) {
    showNotification(error.message, 'error');
    document.getElementById('matches').innerHTML = '<div class="error">Failed to load matches</div>';
  } finally {
    ui.setLoading('matches', false);
  }
}

function renderMatches() {
  const div = document.getElementById('matches');
  if (!div) return;
  
  div.innerHTML = state.matches.map(m => `
    <div class="match-card">
      <b>${utils.sanitizeHTML(m.team1)} vs ${utils.sanitizeHTML(m.team2)}</b>
      <div>BACK: ${m.odds.back}</div>
      <button class="bet-btn" onclick="placeBet('${m.id}', ${m.odds.back})"
              ${!state.isAuthenticated ? 'disabled' : ''}>
        Bet
      </button>
    </div>
  `).join('');
  
  ui.updateUI();
}

async function placeBet(matchId, odds) {
  if (!state.isAuthenticated) {
    showNotification('Please login first', 'warning');
    return;
  }
  
  const amount = window.prompt('Enter bet amount:');
  if (!amount) return;
  
  if (!utils.validateAmount(amount, state.balance)) {
    showNotification('Invalid amount or insufficient balance', 'error');
    return;
  }
  
  try {
    ui.setLoading('bet-btn', true);
    await api.authenticatedRequest('/bet', {
      method: 'POST',
      body: JSON.stringify({ matchId, amount: parseFloat(amount), odds })
    });
    
    showNotification('Bet placed successfully!');
    loadMatches(); // Refresh balance & matches
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

async function updateOdds() {
  if (!state.isAuthenticated || state.user.role !== 'admin') {
    showNotification('Admin access required', 'error');
    return;
  }
  
  const matchId = document.getElementById('mid')?.value;
  const back = parseFloat(document.getElementById('back')?.value);
  const lay = parseFloat(document.getElementById('lay')?.value);
  
  if (!matchId || isNaN(back) || isNaN(lay)) {
    showNotification('Invalid input', 'error');
    return;
  }
  
  try {
    await api.authenticatedRequest('/odds', {
      method: 'POST',
      body: JSON.stringify({ matchId, back, lay })
    });
    showNotification('Odds updated!');
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

// Idle timeout system
let idleTimer;
function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(auth.logout, CONFIG.IDLE_TIMEOUT);
}

function setupEventListeners() {
  ['click', 'keypress', 'mousemove'].forEach(event => {
    document.addEventListener(event, resetIdleTimer, { passive: true });
  });
}

// Notifications (replace alert())
function showNotification(message, type = 'info') {
  // Use toast library in production (e.g., sonner, react-hot-toast)
  const notification = document.createElement('div');
  notification.className = `notification notification--${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => notification.remove(), 4000);
}

// Initialize
function init() {
  const savedToken = localStorage.getItem('token');
  const savedUser = localStorage.getItem('user');
  
  if (savedToken && savedUser) {
    state.token = savedToken;
    state.user = JSON.parse(savedUser);
    state.isAuthenticated = true;
    state.balance = state.user.balance;
    ui.updateUI();
    loadMatches();
    setupEventListeners();
    resetIdleTimer();
  } else {
    ui.updateUI();
  }
  
  // Better polling - only when authenticated + error backoff
  setInterval(() => state.isAuthenticated && loadMatches(), CONFIG.POLL_INTERVAL);
}

// Global exports for onclick handlers
window.placeBet = placeBet;
window.updateOdds = updateOdds;
window.login = (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('pass').value;
  auth.login(email, password);
};

// Start app
init();
