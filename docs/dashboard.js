if (!localStorage.getItem("token")) {
    window.location.href = "home.html";
}

function logout() {
    localStorage.clear();
    window.location.href = "home.html";
}
const userName = localStorage.getItem("name");

const randomGreeting = [
    `Hello, ${userName}. How are you doing today?`,
    `${userName}. Good to see you!`,
    `There you are, ${userName}.`,
    `Hey ${userName}, glad you're here.`,
    `Howdy ${userName}! Let's check in.`,
    `Good to have you back, ${userName}`,
    `You came back ${userName}. That matters!`,
    `No judgement here, just checking in.`,
    `Take a breath, and let's dive in.`,
    `Showing up is enough ${userName}.`,
    `I'm so proud of you, ${userName}.`,
    `Remember ${userName}: you are special.`,
    `Well, how has today been ${userName}?`,
    `I'm glad you are here and breathing.`,
    `How are you holding up?`,
];

const randNum = Math.floor(Math.random() * randomGreeting.length);

const images = [
    "assets/woman_meditating.svg",
    "assets/Insomnia-rafiki.svg",
    "assets/Contemplating-rafiki.svg",
    "assets/mental-health-not-css.svg",
    "assets/blue-monday-not-css.svg",
    "assets/Healthy habit-pana.svg",
];
const randImg = Math.floor(Math.random() * images.length);
document.getElementById("dashboard-image").setAttribute("data", images[randImg]);

// What's New banner — achievements + themes
if (!localStorage.getItem("achievementsBannerSeen")) {
    document.getElementById("whats-new-banner").classList.remove("hidden");
}
function dismissBanner() {
    localStorage.setItem("achievementsBannerSeen", "true");
    document.getElementById("whats-new-banner").classList.add("hidden");
}

// Backfill achievements silently on login
fetch("https://mood-tracker-11bv.onrender.com/achievements", {
    headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
}).catch(() => {});

// Streak + crystals
fetch("https://mood-tracker-11bv.onrender.com/me", {
    headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
})
.then(r => r.json())
.then(data => {
    if (data.streak > 0 || data.crystals > 0) {
        const el = document.getElementById("streak-crystals");
        if (el) el.innerHTML = `🔥 ${data.streak}-day streak &nbsp;·&nbsp; ✨ ${data.crystals} crystals`;
    }
})
.catch(() => {});

// Achievement popup from previous check-in
const pendingAch = localStorage.getItem("pendingAchievements");
if (pendingAch) {
    localStorage.removeItem("pendingAchievements");
    JSON.parse(pendingAch).forEach((ach, i) => {
        setTimeout(() => {
            const overlay = document.createElement("div");
            overlay.className = "modal-overlay";
            overlay.innerHTML = `
                <div class="milestone-box">
                    <div class="milestone-emoji">${ach.emoji}</div>
                    <p class="ach-quote">"${ach.quote}"</p>
                    <h2>Achievement Unlocked</h2>
                    <h3>${ach.name}</h3>
                    <p class="milestone-lore">${ach.lore}</p>
                    <button class="onboarding-btn" onclick="this.closest('.modal-overlay').remove()">Nice!</button>
                </div>
            `;
            document.body.appendChild(overlay);
        }, i * 400);
    });
}

// Milestone popup from previous check-in
const pending = localStorage.getItem("pendingMilestone");
if (pending) {
    localStorage.removeItem("pendingMilestone");
    const m = JSON.parse(pending);
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
        <div class="milestone-box">
            <div class="milestone-emoji">${m.emoji}</div>
            <h2>${m.streak}-Day Streak</h2>
            <h3>${m.name}</h3>
            <p class="milestone-lore">${m.lore}</p>
            <p class="milestone-crystals">+${m.bonus} bonus crystals earned</p>
            <button class="onboarding-btn" onclick="this.closest('.modal-overlay').remove()">Nice!</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

fetch("https://mood-tracker-11bv.onrender.com/analytics/episode-risk", {
    headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
})
.then(r => r.json())
.then(data => {
    if (!data.risk || data.risk === "none") return;
    const colors = { mania: "#b084e8", depression: "#6aafd6", mixed: "#e06c75" };
    const el = document.getElementById("episode-warning");
    el.innerHTML = `<div class="warning-card" style="border-color:${colors[data.risk]}">${data.message}</div>`;
})
.catch(() => {});

if (!localStorage.getItem("medNudgeDismissed")) {
    fetch("https://mood-tracker-11bv.onrender.com/medications", {
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    })
    .then(r => r.json())
    .then(meds => {
        if (meds.length > 0) {
            localStorage.setItem("medNudgeDismissed", "true");
            return;
        }
        const el = document.getElementById("episode-warning");
        el.innerHTML = `
            <div class="warning-card nudge-card">
                <span>New: add your medications in <a href="settings.html">Settings</a> to track them with each check-in.</span>
                <button onclick="this.closest('.warning-card').remove(); localStorage.setItem('medNudgeDismissed','true')" class="nudge-dismiss">✕</button>
            </div>`;
    })
    .catch(() => {});
}

if (localStorage.getItem("hasVisited")) {
    document.getElementById("greeting").innerHTML = randomGreeting[randNum];
} else {
    document.getElementById("greeting").innerHTML = `Let's get started, ${userName}.`;
    localStorage.setItem("hasVisited", "true");
}

// What's New — show Jasper walkthrough once for existing users
if (!localStorage.getItem("jasperWalkthroughSeen")) {
    const overlay = document.getElementById("whats-new-overlay");
    const steps = overlay.querySelectorAll(".whats-new-step");
    const dots = overlay.querySelectorAll(".wn-dot");
    const nextBtn = document.getElementById("whats-new-next");
    const skipBtn = document.getElementById("whats-new-skip");
    let current = 0;

    overlay.classList.remove("hidden");

    function goToStep(n) {
        steps[current].classList.remove("active");
        dots[current].classList.remove("active");
        current = n;
        steps[current].classList.add("active");
        dots[current].classList.add("active");
        nextBtn.textContent = current === steps.length - 1 ? "Talk to Jasper →" : "Next";
    }

    nextBtn.addEventListener("click", () => {
        if (current < steps.length - 1) {
            goToStep(current + 1);
        } else {
            localStorage.setItem("jasperWalkthroughSeen", "true");
            window.location.href = "jasper.html";
        }
    });

    skipBtn.addEventListener("click", () => {
        localStorage.setItem("jasperWalkthroughSeen", "true");
        overlay.classList.add("hidden");
    });
}

