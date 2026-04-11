const API = "http://localhost:3000/api";
let user = null;

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
    localStorage.setItem("token", d.token); // ✔ FIXED
    document.getElementById("bal").innerText = user.balance;

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

  const token = localStorage.getItem("token"); // ✔ FIXED

  await fetch(API + "/bet", {
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

  alert("Bet placed!");
}

// 🎯 ODDS
async function updateOdds() {
  let matchId = document.getElementById("mid").value;
  let back = document.getElementById("back").value;
  let lay = document.getElementById("lay").value;

  const token = localStorage.getItem("token"); // ✔ FIXED

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

// 🔄 AUTO REFRESH
loadMatches();
setInterval(loadMatches, 5000);
