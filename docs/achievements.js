const API = "https://mood-tracker-11bv.onrender.com";
const token = localStorage.getItem("token");
if (!token) window.location.href = "home.html";

const CAIRN_BADGES = [
    { streak: 3,   emoji: "🪨",   name: "Pebble",       description: "3-day streak" },
    { streak: 7,   emoji: "🪨🪨", name: "Stone",         description: "7-day streak" },
    { streak: 14,  emoji: "🗿",   name: "Rock",          description: "14-day streak" },
    { streak: 30,  emoji: "⛰️",  name: "Boulder",       description: "30-day streak" },
    { streak: 60,  emoji: "🏔️",  name: "Cairn",         description: "60-day streak" },
    { streak: 100, emoji: "✨",   name: "Ancient Cairn", description: "100-day streak" },
];

async function load() {
    const [achRes, meRes] = await Promise.all([
        fetch(`${API}/achievements`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/me`,           { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    const achievements = await achRes.json();
    const me = await meRes.json();
    const streak = me.streak || 0;

    document.getElementById("crystal-balance").textContent = `🟣 ${me.crystals || 0} Amethyst`;
    document.getElementById("streak-display").textContent = `🔥 ${streak}-day streak`;

    // Crystal achievements
    const crystalGrid = document.getElementById("crystal-grid");
    achievements.forEach(ach => {
        const card = document.createElement("div");
        card.className = `ach-card ${ach.earned ? "ach-card--earned" : "ach-card--locked"}`;
        card.innerHTML = `
            <div class="ach-emoji">${ach.emoji}</div>
            <div class="ach-name">${ach.name}</div>
            <div class="ach-desc">${ach.earned ? ach.description : "Keep going to unlock this."}</div>
            ${ach.earned ? `<div class="ach-badge">✓ Earned</div>` : `<div class="ach-locked-label">Locked</div>`}
        `;
        if (ach.earned) {
            card.style.cursor = "pointer";
            card.addEventListener("click", () => showLore(ach));
        }
        crystalGrid.appendChild(card);
    });

    // Cairn badges
    const cairnGrid = document.getElementById("cairn-grid");
    CAIRN_BADGES.forEach(badge => {
        const earned = streak >= badge.streak;
        const card = document.createElement("div");
        card.className = `ach-card ${earned ? "ach-card--earned" : "ach-card--locked"}`;
        card.innerHTML = `
            <div class="ach-emoji">${badge.emoji}</div>
            <div class="ach-name">${badge.name}</div>
            <div class="ach-desc">${badge.description}</div>
            ${earned
                ? `<div class="ach-badge">✓ Earned</div>`
                : `<div class="ach-locked-label">Day ${badge.streak} streak</div>`
            }
        `;
        cairnGrid.appendChild(card);
    });
}

function showLore(ach) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
        <div class="milestone-box">
            <div class="milestone-emoji">${ach.emoji}</div>
            <p class="ach-quote">"${ach.quote}"</p>
            <h3>${ach.name}</h3>
            <p class="milestone-lore">${ach.lore}</p>
            <button class="onboarding-btn" onclick="this.closest('.modal-overlay').remove()">Close</button>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
}

load();
