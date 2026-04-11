const API = "http://localhost:3000/api";

let user = JSON.parse(localStorage.getItem("user"));
let logoutTimer;

// 🔐 LOGIN
async function login() {
  let email = document.getElementById("email").value;
  let password = document.getElementById("pass").value;

  try {
    let r = await fetch(API + "/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    let d = await r.json();

    if (!d.user) {
      alert("Login failed");
      return;
    }

    user = d.user;

    localStorage.setItem("token", d.token);
    localStorage.setItem("user", JSON.stringify(d.user));
    localStorage.setItem("role", d.user.role);

    document.getElementById("bal").innerText = user.balance;

    loadMatches();   // 🔥 FIX
    resetTimer();    // 🔥 AUTO LOGOUT START

  } catch {
    alert("Server not responding");
  }
}

// 🏏 MATCHES
async function loadMatches() {
  try {
    let div = document.getElementById("matches");
    div.innerHTML = "Loading...";

    let r = await fetch(API + "/matches");
    let data = await r.json();

    div.innerHTML = "";

    data.forEach(m => {
      div.innerHTML += `
        <div>
          <b>${m.team1} vs ${m.team2}</b><br>
          BACK: ${m.odds.back}
          <button onclick="bet('${m.id}', ${m.odds.back})" ${!user ? "disabled" : ""}>
            Bet
          </button>
        </div>
      `;
    });

  } catch {
    document.getElementById("matches").innerHTML = "Error loading matches";
  }
}

// 💰 BET
async function bet(id, odds) {
  if (!user) {
    alert("Login first");
    return;
  }

  let amt = prompt("Enter Amount");
  if (!amt) return;

  const token = localStorage.getItem("token");

  let res = await fetch(API + "/bet", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({
      matchId: id,
      amount: amt,
      odds
    })
  });

  if (!res.ok) {
    alert("Bet failed");
    return;
  }

  alert("Bet placed!");
}

// 🎯 ODDS (ADMIN ONLY)
async function updateOdds() {
  let role = localStorage.getItem("role");

  if (role !== "admin") {
    alert("Only admin can change odds");
    return;
  }

  let matchId = document.getElementById("mid").value;
  let back = document.getElementById("back").value;
  let lay = document.getElementById("lay").value;

  const token = localStorage.getItem("token");

  await fetch(API + "/odds", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({ matchId, back, lay })
  });

  alert("Updated!");
}

// 🔥 AUTO LOGOUT SYSTEM

function resetTimer() {
  clearTimeout(logoutTimer);

  logoutTimer = setTimeout(() => {
    logout();
  }, 10 * 60 * 1000); // 10 min
}

function logout() {
  user = null;

  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");

  alert("Session expired! Please login again.");
  location.reload();
}

// activity tracking
document.addEventListener("click", resetTimer);
document.addEventListener("keypress", resetTimer);
document.addEventListener("mousemove", resetTimer);

// 🔄 AUTO START
loadMatches();
setInterval(loadMatches, 5000);
