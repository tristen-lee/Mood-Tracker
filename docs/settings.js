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
