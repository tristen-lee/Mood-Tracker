Chart.defaults.font.size = 14;
Chart.defaults.font.family = "Quicksand";

const style = getComputedStyle(document.documentElement);
const C = {
    pink:      style.getPropertyValue("--heading").trim() || "#E16F7C",
    green:     style.getPropertyValue("--accent").trim() || "#87BBA2",
    text:      style.getPropertyValue("--text").trim() || "#F5F0F0",
    pinkFill:  "rgba(225, 111, 124, 0.2)",
    greenFill: "rgba(135, 187, 162, 0.2)",
    grid:      style.getPropertyValue("--nav-divider").trim() || "rgba(255,255,255,0.06)",
};

const STATE_COLORS = {
    "Manic":     "#9b59b6",
    "Hypomanic": "#a29bfe",
    "Mixed":     "#e17055",
    "Stable":    "#5bc0de",
    "Depressed": "#f0ad4e",
    "Severe":    "#d9534f",
};

const FILTERS = [
    { label: "7D",    days: 7 },
    { label: "14D",   days: 14 },
    { label: "1M",    days: 30 },
    { label: "3M",    days: 90 },
    { label: "6M",    days: 180 },
    { label: "1Y",    days: 365 },
    { label: "All",   days: 0 },
];

let currentDays = 30;
const charts = {};
const API = "https://mood-tracker-11bv.onrender.com";
const token = () => localStorage.getItem("token");

function makeChart(id, type, data, options) {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(document.getElementById(id), { type, data, options });
}

function baseOptions(title) {
    return {
        maintainAspectRatio: false,
        layout: { padding: 10 },
        plugins: {
            title: {
                display: true,
                text: title,
                color: C.text,
                font: { size: 16, family: "Montserrat Alternates", weight: "500" },
                padding: { bottom: 20 },
            },
            legend: {
                position: "bottom",
                labels: { color: C.text, boxWidth: 12, padding: 16 },
            },
        },
        scales: {
            x: { ticks: { color: C.text }, grid: { color: C.grid } },
            y: { ticks: { color: C.text }, grid: { color: C.grid } },
        },
    };
}

function wrap(id) {
    return `<div class="chart-wrapper"><canvas id="${id}"></canvas></div>`;
}

function formatDate(ts) {
    return new Date(ts + (ts.includes("T") ? "" : "Z")).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function renderFilterBar() {
    const bar = document.getElementById("filter-bar");
    bar.innerHTML = FILTERS.map(f => `
        <button class="filter-btn ${f.days === currentDays ? "filter-btn--active" : ""}" data-days="${f.days}">
            ${f.label}
        </button>
    `).join("");
    bar.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            currentDays = parseInt(btn.dataset.days);
            renderFilterBar();
            loadCharts();
        });
    });
}

function q(days) {
    return days > 0 ? `?days=${days}` : "";
}

function xTickLimit(days) {
    if (days <= 14)  return days;
    if (days <= 30)  return 10;
    if (days <= 90)  return 12;
    return 13;
}

function skeletonStatCard() {
    return `
        <div class="skeleton-card">
            <div class="skeleton skeleton-line skeleton-line--med"></div>
            <div class="skeleton skeleton-line skeleton-line--short" style="height:32px;margin-top:0.25rem"></div>
        </div>`;
}

async function loadAnalytics() {
    document.getElementById("mood-state").innerHTML    = skeletonStatCard();
    document.getElementById("average-score").innerHTML = skeletonStatCard();
    document.getElementById("streak").innerHTML        = skeletonStatCard();

    try {
        const [recentRes, avgRes, streakRes] = await Promise.all([
            fetch(`${API}/analytics`,         { headers: { Authorization: "Bearer " + token() } }),
            fetch(`${API}/analytics/average`, { headers: { Authorization: "Bearer " + token() } }),
            fetch(`${API}/analytics/streak`,  { headers: { Authorization: "Bearer " + token() } }),
        ]);

        const recent = await recentRes.json();
        const avg    = await avgRes.json();
        const streak = await streakRes.json();

        if (recent.message) {
            document.getElementById("mood-state").innerHTML = "<p>No entries yet. Go check in!</p>";
            return;
        }

        document.getElementById("mood-state").innerHTML = `
            <div class="analytics-card">
                <h2>Current Mood State</h2>
                <p class="big-stat">${recent.mood_state}</p>
            </div>`;

        document.getElementById("average-score").innerHTML = `
            <div class="analytics-card">
                <h2>All-Time Average</h2>
                <p class="big-stat">${avg.mood_state}</p>
            </div>`;

        document.getElementById("streak").innerHTML = `
            <div class="analytics-card">
                <h2>Check-In Streak</h2>
                <p class="big-stat">${streak.streak} ${streak.streak === 1 ? "day" : "days"}</p>
            </div>`;

        document.getElementById("chart").innerHTML =
            `<div id="filter-bar" class="filter-bar"></div>` +
            wrap("c-mood") + wrap("c-day") + wrap("c-dist") + wrap("c-scatter") + wrap("c-sleep");

        renderFilterBar();
        loadCharts();

    } catch (err) {
        document.getElementById("mood-state").innerHTML = "<p>Can't reach the server. Is it running?</p>";
        console.error(err);
    }
}

async function loadCharts() {
    const d = currentDays;
    const headers = { Authorization: "Bearer " + token() };

    const [byDateRes, byDayRes, distRes, scatterRes, sleepRes] = await Promise.all([
        fetch(`${API}/analytics/by-date${q(d)}`,           { headers }),
        fetch(`${API}/analytics/by-day${q(d)}`,            { headers }),
        fetch(`${API}/analytics/mood-distribution${q(d)}`, { headers }),
        fetch(`${API}/analytics/sleep-vs-mood${q(d)}`,     { headers }),
        fetch(`${API}/analytics/sleep-over-time${q(d)}`,   { headers }),
    ]);

    const byDate  = await byDateRes.json();
    const byDay   = await byDayRes.json();
    const dist    = await distRes.json();
    const scatter = await scatterRes.json();
    const sleep   = await sleepRes.json();

    makeChart("c-mood", "line", {
        labels: byDate.map(e => formatDate(e.timestamp)),
        datasets: [{
            label: "Mood Score",
            data: byDate.map(e => e.mood_score),
            borderColor: C.pink,
            backgroundColor: C.pinkFill,
            tension: 0.4,
            fill: true,
            pointRadius: 4,
        }],
    }, { ...baseOptions("Mood Over Time"), scales: { x: { ticks: { color: C.text, maxTicksLimit: xTickLimit(currentDays), maxRotation: 0 }, grid: { color: C.grid } }, y: { min: 1, max: 10, ticks: { color: C.text }, grid: { color: C.grid } } } });

    makeChart("c-day", "bar", {
        labels: byDay.map(d => d.day),
        datasets: [{
            label: "Avg Mood Score",
            data: byDay.map(d => d.average),
            backgroundColor: C.greenFill,
            borderColor: C.green,
            borderWidth: 2,
            borderRadius: 6,
        }],
    }, baseOptions("Average Mood by Day of the Week"));

    makeChart("c-dist", "bar", {
        labels: dist.map(d => d.state),
        datasets: [{
            label: "Days",
            data: dist.map(d => d.count),
            backgroundColor: dist.map(d => STATE_COLORS[d.state] || C.green),
            borderRadius: 6,
        }],
    }, baseOptions("How Have You Been Feeling?"));

    makeChart("c-scatter", "scatter", {
        datasets: [{
            label: "Sleep (hrs) vs Mood Score",
            data: scatter.map(d => ({ x: d.sleep, y: d.score })),
            backgroundColor: C.pink,
            pointRadius: 6,
        }],
    }, {
        ...baseOptions("Does Sleep Affect Your Mood?"),
        scales: {
            x: { ticks: { color: C.text }, grid: { color: C.grid } },
            y: { ticks: { color: C.text }, grid: { color: C.grid } },
        },
    });

    makeChart("c-sleep", "line", {
        labels: sleep.map(e => formatDate(e.timestamp)),
        datasets: [{
            label: "Hours Slept",
            data: sleep.map(e => e.sleep),
            borderColor: C.green,
            backgroundColor: C.greenFill,
            tension: 0.4,
            fill: true,
            pointRadius: 4,
        }],
    }, { ...baseOptions("Your Sleep Over Time"), scales: { x: { ticks: { color: C.text, maxTicksLimit: xTickLimit(currentDays), maxRotation: 0 }, grid: { color: C.grid } }, y: { min: 0, max: 24, ticks: { color: C.text }, grid: { color: C.grid } } } });
}

loadAnalytics();
