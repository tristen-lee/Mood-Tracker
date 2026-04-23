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

    const achData = await achRes.json();
    const achievements = achData.achievements;
    const me = await meRes.json();
    const streak = me.streak || 0;

    document.getElementById("crystal-balance").textContent = `🟣 ${me.crystals || 0} Crystals`;
    document.getElementById("streak-display").textContent = `🔥 ${streak}-day streak`;

    // Crystal achievements
    const crystalGrid = document.getElementById("crystal-grid");
    achievements.forEach(ach => {
        const card = document.createElement("div");
        card.className = `ach-card ${ach.earned ? "ach-card--earned" : "ach-card--locked"}`;
        card.innerHTML = `
            <div class="ach-emoji">${ach.emoji}</div>
            <div class="ach-name">${ach.name}</div>
            <div class="ach-desc">${ach.description}</div>
            ${ach.earned ? `<div class="ach-badge">✓ Earned</div>` : `<div class="ach-locked-label">Locked</div>`}
        `;
        if (ach.earned) {
            card.style.cursor = "pointer";
            card.addEventListener("click", () => showLore(ach));
        }
        crystalGrid.appendChild(card);
    });

    // Themes
    const earnedSet = new Set(achievements.filter(a => a.earned).map(a => a.id));
    renderThemes(earnedSet);

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

const THEMES = [
    { id: "dark",             name: "Dark",             emoji: "🌑", description: "Default dark mode.",                        unlocked: true },
    { id: "light",            name: "Light",            emoji: "☀️",  description: "Default light mode.",                       unlocked: true },
    { id: "raw-stone",        name: "Raw Stone",        emoji: "🪨", description: "Earn the Raw Stone crystal to unlock.",      unlocked: false, achievement: "raw_stone" },
    { id: "rose-quartz",      name: "Rose Quartz",      emoji: "🩷", description: "Earn the Rose Quartz crystal to unlock.",    unlocked: false, achievement: "rose_quartz" },
    { id: "amethyst",         name: "Amethyst",         emoji: "🟣", description: "Earn the Amethyst crystal to unlock.",       unlocked: false, achievement: "amethyst" },
    { id: "red-jasper",       name: "Red Jasper",       emoji: "🔴", description: "Earn the Red Jasper crystal to unlock.",     unlocked: false, achievement: "red_jasper" },
    { id: "rainbow-obsidian", name: "Rainbow Obsidian", emoji: "🌈", description: "Earn the Obsidian crystal to unlock.",       unlocked: false, achievement: "obsidian" },
    { id: "clear-quartz",     name: "Clear Quartz",     emoji: "🔷", description: "Log 100 check-ins to unlock.",               unlocked: false, achievement: "century" },
    { id: "owyhee-blue-opal", name: "Blue Opal",        emoji: "💙", description: "Unlocked — enjoy.",                          unlocked: true },
    { id: "oregon-sunstone",  name: "Sunstone",         emoji: "🌅", description: "Unlocked — enjoy.",                          unlocked: true },
    { id: "thunderegg",       name: "Thunderegg",       emoji: "🥚", description: "Unlocked — enjoy.",                          unlocked: true },
    { id: "sunset",           name: "Sunset",           emoji: "🌇", description: "Coming soon to the shop.",                   unlocked: false, comingSoon: true },
    { id: "ocean",            name: "Ocean",            emoji: "🌊", description: "Coming soon to the shop.",                   unlocked: false, comingSoon: true },
    { id: "forest",           name: "Forest",           emoji: "🌲", description: "Coming soon to the shop.",                   unlocked: false, comingSoon: true },
];

function renderThemes(earnedAchievements) {
    const current = localStorage.getItem("theme") || "system";
    const themesGrid = document.getElementById("themes-grid");

    THEMES.forEach(theme => {
        const isUnlocked = theme.unlocked || earnedAchievements.has(theme.achievement);
        const isActive = current === theme.id;

        const card = document.createElement("div");
        card.className = `ach-card ${isUnlocked ? "ach-card--earned" : "ach-card--locked"}`;
        card.innerHTML = `
            <div class="ach-emoji">${theme.emoji}</div>
            <div class="ach-name">${theme.name}</div>
            <div class="ach-desc">${theme.description}</div>
            ${isActive ? `<div class="ach-badge">✓ Active</div>` :
              isUnlocked ? `<button class="theme-apply-btn" data-theme="${theme.id}">Apply</button>` :
              theme.comingSoon ? `<div class="ach-locked-label">Coming soon</div>` :
              `<div class="ach-locked-label">Locked</div>`}
        `;
        themesGrid.appendChild(card);
    });

    themesGrid.addEventListener("click", e => {
        if (!e.target.classList.contains("theme-apply-btn")) return;
        const val = e.target.dataset.theme;
        localStorage.setItem("theme", val);
        document.documentElement.setAttribute("data-theme", val);
        themesGrid.innerHTML = "";
        renderThemes(earnedAchievements);
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
