const CONFIG = {
  API: "https://cricketbet-pro-lry0.onrender.com/api",
  IDLE_TIMEOUT: 10 * 60 * 1000,
  POLL_INTERVAL: 10000
};

const state = {
  user: null,
  token: null,
  isAuthenticated: false,
  matches: [],
  balance: 0
};

const utils = {
  sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  validateAmount(amount, balance) {
    const num = parseFloat(amount);
    return num > 0 && num <= balance;
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

    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

const api = {
  async request(url, options = {}) {
    const res = await fetch(CONFIG.API + url, {
      ...options,
      headers: {
        ...utils.getAuthHeaders(),
        ...options.headers
      }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Request failed');
    }

    return res.json();
  },

  login(email, password) {
    return fetch(CONFIG.API + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }).then(r => r.json());
  },

  signup(name, email, password) {
    return fetch(CONFIG.API + '/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    }).then(r => r.json());
  }
};

const auth = {
  async login(email, password) {
    try {
      const data = await api.login(email, password);

      if (!data.token) {
        alert(data.error || "Login Failed");
        return;
      }

      state.user = data.user;
      state.token = data.token;
      state.isAuthenticated = true;
      state.balance = data.user.balance;

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      alert("Login Successful");

      ui.update();
      loadMatches();

    } catch (err) {
      alert(err.message);
    }
  }
};

const ui = {
  update() {
    document.getElementById('balanceSection')?.classList.toggle('hidden', !state.isAuthenticated);
    document.getElementById('loginSection')?.classList.toggle('hidden', state.isAuthenticated);
    document.getElementById('logoutBtn')?.classList.toggle('hidden', !state.isAuthenticated);
  }
};

// 🔥 LOGOUT FIX ADDED
function logout() {
  utils.clearAuth();
  ui.update();
  window.location.reload();
}

// 🔥 MATCHES FIXED (MAIN ISSUE FIXED HERE)
async function loadMatches() {
  try {
    const res = await fetch(CONFIG.API + '/matches', {
      headers: state.token ? utils.getAuthHeaders() : {}
    });

    const data = await res.json();

    console.log("MATCHES API:", data);

    state.matches = Array.isArray(data) ? data : [];
    renderMatches();

  } catch (e) {
    console.log("MATCH ERROR:", e.message);
  }
}

function renderMatches() {
  const div = document.getElementById('matches');

  div.innerHTML = state.matches.map(m => `
    <div class="match-card">
      <b>${m.team1} vs ${m.team2}</b>
      <div>Odds: ${m.finalOdds?.back || m.marketOdds?.back}</div>

      <button onclick="placeBet('${m._id}', ${m.finalOdds?.back || 1.9})">
        Bet
      </button>
    </div>
  `).join('');
}

async function placeBet(matchId, odds) {
  const amount = prompt("Enter amount");

  if (!amount || isNaN(amount)) return;

  if (Number(amount) > state.balance) {
    alert("Insufficient balance");
    return;
  }

  try {
    await api.request('/bet', {
      method: 'POST',
      body: JSON.stringify({ matchId, amount: Number(amount), odds })
    });

    state.balance -= Number(amount);
    document.getElementById('bal').innerText = "₹" + state.balance;

    alert("Bet placed");
    loadMatches();

  } catch (e) {
    alert("Bet failed");
  }
}

async function updateOdds() {
  const matchId = document.getElementById('mid').value;
  const back = document.getElementById('back').value;
  const lay = document.getElementById('lay').value;

  await api.request('/odds', {
    method: 'POST',
    body: JSON.stringify({ matchId, back, lay })
  });

  alert("Odds updated");
  loadMatches();
}

window.placeBet = placeBet;
window.updateOdds = updateOdds;
window.logout = logout;

// 🔥 CONNECT BUTTONS (IMPORTANT FIX)
document.getElementById("logoutBtn")?.addEventListener("click", logout);

// LOGIN FORM
document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  auth.login(
    document.getElementById("email").value,
    document.getElementById("password").value
  );
});

// SIGNUP FORM
document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;

  const data = await api.signup(name, email, password);

  if (data.error) {
    alert(data.error);
    return;
  }

  alert("Signup Successful 🎉");
  showLogin();
});

// TOGGLE
function showSignup() {
  document.getElementById("loginSection").classList.add("hidden");
  document.getElementById("signupSection").classList.remove("hidden");
}

function showLogin() {
  document.getElementById("signupSection").classList.add("hidden");
  document.getElementById("loginSection").classList.remove("hidden");
}

window.showSignup = showSignup;
window.showLogin = showLogin;

// AUTO LOGIN
window.onload = () => {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");

  if (token && user) {
    state.token = token;
    state.user = JSON.parse(user);
    state.isAuthenticated = true;
    state.balance = state.user.balance;

    ui.update();
  }

  loadMatches();
};
