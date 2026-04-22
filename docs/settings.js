const API = "https://mood-tracker-11bv.onrender.com";
const token = () => localStorage.getItem("token");

// Name
const nameInput = document.getElementById("name-input");
nameInput.value = localStorage.getItem("name") || "";
document.getElementById("name-save").addEventListener("click", () => {
    const val = nameInput.value.trim();
    if (!val) return;
    localStorage.setItem("name", val);
    const msg = document.getElementById("name-message");
    msg.textContent = "Saved!";
    setTimeout(() => msg.textContent = "", 2000);
});

// Medications
async function loadMeds() {
    const res = await fetch(`${API}/medications`, {
        headers: { "Authorization": "Bearer " + token() }
    });
    const meds = await res.json();
    const list = document.getElementById("med-list");
    if (meds.length === 0) {
        list.innerHTML = "<p class='settings-hint'>No medications added yet.</p>";
        return;
    }
    list.innerHTML = meds.map(m => `
        <div class="med-item">
            <span>${m.name}</span>
            <button class="med-delete" onclick="deleteMed(${m.id}, '${m.name}')">Remove</button>
        </div>
    `).join("");
}

async function deleteMed(id, name) {
    if (!confirm(`Remove ${name}?`)) return;
    await fetch(`${API}/medications/${id}`, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + token() }
    });
    loadMeds();
}

document.getElementById("med-add").addEventListener("click", async () => {
    const val = document.getElementById("med-input").value.trim();
    if (!val) return;
    const res = await fetch(`${API}/medications`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token() },
        body: JSON.stringify({ name: val })
    });
    if (res.ok) {
        document.getElementById("med-input").value = "";
        loadMeds();
    } else {
        const msg = document.getElementById("med-message");
        msg.textContent = "Something went wrong.";
        setTimeout(() => msg.textContent = "", 2000);
    }
});

loadMeds();

// Account deletion
document.getElementById("delete-account-btn").addEventListener("click", async () => {
    const first = confirm("Are you sure you want to delete your account? All your entries, medications, and data will be permanently erased.");
    if (!first) return;
    const second = confirm("This cannot be undone. Delete everything?");
    if (!second) return;

    const res = await fetch(`${API}/account`, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + token() }
    });

    if (res.ok) {
        localStorage.clear();
        window.location.href = "home.html";
    } else {
        alert("Something went wrong. Try again.");
    }
});

// Notifications
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

const notifBtn = document.getElementById("notif-toggle-btn");
const notifStatus = document.getElementById("notif-status");

async function initNotifState() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        notifBtn.disabled = true;
        notifStatus.textContent = "Push notifications aren't supported in this browser.";
        return;
    }
    const perm = Notification.permission;
    if (perm === "granted") {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
            notifBtn.textContent = "Disable Notifications";
            notifStatus.textContent = "Notifications are on.";
        } else {
            notifBtn.textContent = "Enable Notifications";
            notifStatus.textContent = "";
        }
    } else if (perm === "denied") {
        notifBtn.disabled = true;
        notifStatus.textContent = "Notifications are blocked. Allow them in your browser settings.";
    }
}

notifBtn.addEventListener("click", async () => {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();

    if (sub) {
        await sub.unsubscribe();
        await fetch(`${API}/push/unsubscribe`, {
            method: "DELETE",
            headers: { "Authorization": "Bearer " + token() }
        });
        notifBtn.textContent = "Enable Notifications";
        notifStatus.textContent = "Notifications disabled.";
        return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
        notifStatus.textContent = "Permission denied.";
        return;
    }

    const keyRes = await fetch(`${API}/push/vapid-public-key`);
    const { publicKey } = await keyRes.json();
    const newSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
    const json = newSub.toJSON();
    await fetch(`${API}/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token() },
        body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth })
    });
    notifBtn.textContent = "Disable Notifications";
    notifStatus.textContent = "Notifications are on. You'll get a morning message and an evening reminder.";
});

initNotifState();

// Theme
const current = localStorage.getItem("theme") || "system";
document.querySelectorAll(".theme-btn").forEach(btn => {
    if (btn.dataset.value === current) btn.classList.add("active");
    btn.addEventListener("click", () => {
        const val = btn.dataset.value;
        localStorage.setItem("theme", val);
        let themeValue;
        if (val === "dark") {
            themeValue = "dark";
        } else if (val === "light") {
            themeValue = "light";
        } else if (val === "system") {
            themeValue = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        } else {
            themeValue = val;
        }
        document.documentElement.setAttribute("data-theme", themeValue);
        document.querySelectorAll(".theme-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
    });
});
