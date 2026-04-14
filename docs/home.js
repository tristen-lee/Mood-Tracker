const API = "https://mood-tracker-11bv.onrender.com";

if (localStorage.getItem("token")) {
    window.location.href = "dashboard.html";
}

function showTab(tab) {
    document.getElementById("login-form").classList.toggle("hidden", tab !== "login");
    document.getElementById("register-form").classList.toggle("hidden", tab !== "register");
    document.getElementById("tab-login").classList.toggle("active", tab === "login");
    document.getElementById("tab-register").classList.toggle("active", tab === "register");
}

document.getElementById("login-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    const msg = document.getElementById("login-message");

    try {
        const res = await fetch(`${API}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("name", data.name);
            window.location.href = "dashboard.html";
        } else {
            msg.textContent = data.detail;
            msg.style.color = "var(--heading)";
        }
    } catch {
        msg.textContent = "Can't reach the server.";
        msg.style.color = "var(--heading)";
    }
});

document.getElementById("register-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    const name = document.getElementById("register-name").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    const msg = document.getElementById("register-message");

    try {
        const res = await fetch(`${API}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("name", data.name);
            window.location.href = "dashboard.html";
        } else {
            msg.textContent = data.detail;
            msg.style.color = "var(--heading)";
        }
    } catch {
        msg.textContent = "Can't reach the server.";
        msg.style.color = "var(--heading)";
    }
});
