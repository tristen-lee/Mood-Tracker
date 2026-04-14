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

