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
            <button class="med-delete" onclick="deleteMed(${m.id})">Remove</button>
        </div>
    `).join("");
}

async function deleteMed(id) {
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

// Theme
const current = localStorage.getItem("theme") || "system";
document.querySelectorAll(".theme-btn").forEach(btn => {
    if (btn.dataset.value === current) btn.classList.add("active");
    btn.addEventListener("click", () => {
        localStorage.setItem("theme", btn.dataset.value);
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const isDark = btn.dataset.value === "dark" || (btn.dataset.value === "system" && prefersDark);
        document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
        document.querySelectorAll(".theme-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
    });
});
