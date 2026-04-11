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
    document.getElementById("bal").innerText = user.balance;

  } catch (err) {
    console.log("Login error:", err);
    alert("Server error");
  }
}

// 🏏 LOAD MATCHES
async function loadMatches() {
  try {
    let r = await fetch(API + "/matches");
    let data = await r.json();

    let div = document.getElementById("matches");
    div.innerHTML = "";

    data.forEach(m => {
      div.innerHTML += `
        <div>
          <b>${m.team1} vs ${m.team2}</b><br>
          BACK: ${m.odds.back}
          <button onclick="bet('${m.id}', ${m.odds.back})">Bet</button>
        </div>
      `;
    });

  } catch (err) {
    console.log("Match load error:", err);
  }
}

// 💰 BET
async function bet(id, odds) {
  if (!user) {
    alert("Please login first");
    return;
  }

  let amt = prompt("Enter Amount");

  if (!amt) return;

  await fetch(API + "/bet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: user.id,
      matchId: id,
      amount: amt,
      odds
    })
  });

  alert("Bet placed!");
}

// 🎯 UPDATE ODDS (ADMIN)
async function updateOdds() {
  let matchId = document.getElementById("mid").value;
  let back = document.getElementById("back").value;
  let lay = document.getElementById("lay").value;

  await fetch(API + "/odds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ matchId, back, lay })
  });

  alert("Odds updated!");
}

// 🔄 AUTO REFRESH MATCHES
loadMatches();
setInterval(loadMatches, 5000);
