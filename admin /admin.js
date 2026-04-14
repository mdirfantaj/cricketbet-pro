const API = "http://localhost:5000/api";

const token = localStorage.getItem("token");

const headers = {
  "Content-Type": "application/json",
  "Authorization": "Bearer " + token
};

// =====================
// 🔥 UPDATE ODDS
// =====================
async function updateOdds() {
  const matchId = document.getElementById("matchId").value;
  const back = document.getElementById("back").value;
  const lay = document.getElementById("lay").value;

  const res = await fetch(API + "/odds", {
    method: "POST",
    headers,
    body: JSON.stringify({ matchId, back, lay })
  });

  const data = await res.json();
  alert(data.message || "Odds Updated");
}

// =====================
// 🔥 CREDIT USER
// =====================
async function creditUser() {
  const userId = document.getElementById("userId").value;
  const amount = document.getElementById("amount").value;

  const res = await fetch(API + "/admin/credit", {
    method: "POST",
    headers,
    body: JSON.stringify({ userId, amount })
  });

  const data = await res.json();
  alert(data.message || "User Credited");
}

// =====================
// 🔥 LOAD WITHDRAWALS
// =====================
async function loadWithdrawals() {
  const res = await fetch(API + "/admin/withdrawals", {
    headers
  });

  const data = await res.json();

  const div = document.getElementById("withdrawals");

  div.innerHTML = data.map(w => `
    <div class="card">
      <p><b>User:</b> ${w.userId}</p>
      <p><b>Amount:</b> ₹${w.amount}</p>

      <button onclick="approve('${w._id}')">Approve</button>
      <button onclick="reject('${w._id}')">Reject</button>
    </div>
  `).join("");
}

// =====================
// 🔥 APPROVE WITHDRAWAL
// =====================
async function approve(id) {
  await fetch(API + "/admin/withdrawal/" + id + "/approve", {
    method: "POST",
    headers
  });

  alert("Approved");
  loadWithdrawals();
}

// =====================
// 🔥 REJECT WITHDRAWAL
// =====================
async function reject(id) {
  await fetch(API + "/admin/withdrawal/" + id + "/reject", {
    method: "POST",
    headers
  });

  alert("Rejected");
  loadWithdrawals();
}
