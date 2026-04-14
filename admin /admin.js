const API = "http://localhost:5000/api";

// =====================
// 🔐 SECURITY CHECK
// =====================
const user = JSON.parse(localStorage.getItem("user"));
let token = localStorage.getItem("token");
let refreshToken = localStorage.getItem("refreshToken");

if (!user || user.role !== "admin" || !token) {
    alert("Unauthorized Access");
    window.location.href = "/admin/login.html";
}

// =====================
// 🔐 AUTO LOGOUT (IDLE)
// =====================
let idleTimer;

function resetTimer() {
    clearTimeout(idleTimer);

    idleTimer = setTimeout(() => {
        alert("Session expired (Idle logout)");
        logout();
    }, 10 * 60 * 1000); // 10 min
}

document.addEventListener("click", resetTimer);
document.addEventListener("keypress", resetTimer);
resetTimer();

// =====================
// 🔐 REFRESH TOKEN SYSTEM
// =====================
async function refreshAccessToken() {
    try {
        const res = await fetch(API + "/refresh-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken })
        });

        const data = await res.json();

        if (data.accessToken) {
            token = data.accessToken;
            localStorage.setItem("token", token);
        } else {
            logout();
        }

    } catch (err) {
        logout();
    }
}

// auto refresh every 9 min
setInterval(refreshAccessToken, 9 * 60 * 1000);

// =====================
// 🔐 LOGOUT
// =====================
function logout() {
    localStorage.clear();
    window.location.href = "/admin/login.html";
}

// =====================
// 🔐 HEADERS
// =====================
function getHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
    };
}

// =====================
// 🔥 UPDATE ODDS
// =====================
async function updateOdds() {
    const matchId = document.getElementById("mid").value;
    const back = document.getElementById("back").value;
    const lay = document.getElementById("lay").value;

    const res = await fetch(API + "/odds", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ matchId, back, lay })
    });

    const data = await res.json();
    alert(data.message || "Odds Updated");
}

// =====================
// 💰 CREDIT USER
// =====================
async function creditUser() {
    const userId = document.getElementById("userId").value;
    const amount = document.getElementById("amount").value;

    const res = await fetch(API + "/admin/credit", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ userId, amount })
    });

    const data = await res.json();
    alert(data.message || "User Credited");
}

// =====================
// 💸 LOAD WITHDRAWALS
// =====================
async function loadWithdrawals() {
    const res = await fetch(API + "/admin/withdrawals", {
        headers: getHeaders()
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
// ✔ APPROVE
// =====================
async function approve(id) {
    await fetch(API + "/admin/withdrawal/" + id + "/approve", {
        method: "POST",
        headers: getHeaders()
    });

    alert("Approved");
    loadWithdrawals();
}

// =====================
// ❌ REJECT
// =====================
async function reject(id) {
    await fetch(API + "/admin/withdrawal/" + id + "/reject", {
        method: "POST",
        headers: getHeaders()
    });

    alert("Rejected");
    loadWithdrawals();
}
