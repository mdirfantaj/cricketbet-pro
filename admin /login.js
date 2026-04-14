const API = "http://localhost:5000/api";

async function loginAdmin() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const res = await fetch(API + "/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.error || "Login failed");
            return;
        }

        // 🔥 SECURITY CHECK (ONLY ADMIN ALLOWED)
        if (data.user.role !== "admin") {
            alert("Access denied: Not admin");
            return;
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        alert("Admin login success");

        // redirect to admin panel
        window.location.href = "/admin/index.html";

    } catch (err) {
        alert("Server error");
    }
}
