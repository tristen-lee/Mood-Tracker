Chart.defaults.font.size = 14;
Chart.defaults.font.family = "Quicksand";

const C = {
    pink:      "#E16F7C",
    green:     "#87BBA2",
    text:      "#F5F0F0",
    pinkFill:  "rgba(225, 111, 124, 0.2)",
    greenFill: "rgba(135, 187, 162, 0.2)",
    grid:      "rgba(255, 255, 255, 0.06)",
};

const STATE_COLORS = {
    "Manic":     "#9b59b6",
    "Hypomanic": "#5cb85c",
    "Stable":    "#5bc0de",
    "Depressed": "#f0ad4e",
    "Suicidal":  "#d9534f",
};

function makeChart(id, type, data, options) {
    return new Chart(document.getElementById(id), { type, data, options });
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
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

async function loadAnalytics() {
    try {
        const [recentRes, avgRes, streakRes, byDateRes, byDayRes, distRes, scatterRes, sleepRes] = await Promise.all([
            fetch("https://mood-tracker-11bv.onrender.com/analytics", { headers: { "Authorization": "Bearer " + localStorage.getItem("token") } }),
            fetch("https://mood-tracker-11bv.onrender.com/analytics/average", { headers: { "Authorization": "Bearer " + localStorage.getItem("token") } }),
            fetch("https://mood-tracker-11bv.onrender.com/analytics/streak", { headers: { "Authorization": "Bearer " + localStorage.getItem("token") } }),
            fetch("https://mood-tracker-11bv.onrender.com/analytics/by-date?days=30", { headers: { "Authorization": "Bearer " + localStorage.getItem("token") } }),
            fetch("https://mood-tracker-11bv.onrender.com/analytics/by-day", { headers: { "Authorization": "Bearer " + localStorage.getItem("token") } }),
            fetch("https://mood-tracker-11bv.onrender.com/analytics/mood-distribution", { headers: { "Authorization": "Bearer " + localStorage.getItem("token") } }),
            fetch("https://mood-tracker-11bv.onrender.com/analytics/sleep-vs-mood", { headers: { "Authorization": "Bearer " + localStorage.getItem("token") } }),
            fetch("https://mood-tracker-11bv.onrender.com/analytics/sleep-over-time", { headers: { "Authorization": "Bearer " + localStorage.getItem("token") } }),
        ]);

        const recent  = await recentRes.json();
        const avg     = await avgRes.json();
        const streak  = await streakRes.json();
        const byDate  = await byDateRes.json();
        const byDay   = await byDayRes.json();
        const dist    = await distRes.json();
        const scatter = await scatterRes.json();
        const sleep   = await sleepRes.json();

        if (recent.message) {
            document.getElementById("mood-state").innerHTML = "<p>No entries yet. Go check in!</p>";
            return;
        }

        // Stat cards
        document.getElementById("mood-state").innerHTML = `
            <div class="analytics-card">
                <h2>Current Mood State</h2>
                <p class="big-stat">${recent.mood_state}</p>
                <p class="sub-stat">Score: ${recent.score}</p>
            </div>`;

        document.getElementById("average-score").innerHTML = `
            <div class="analytics-card">
                <h2>All-Time Average</h2>
                <p class="big-stat">${avg.mood_state}</p>
                <p class="sub-stat">Score: ${avg.average_score}</p>
            </div>`;

        document.getElementById("streak").innerHTML = `
            <div class="analytics-card">
                <h2>Check-In Streak</h2>
                <p class="big-stat">${streak.streak} ${streak.streak === 1 ? "day" : "days"}</p>
            </div>`;

        // Inject chart wrappers
        document.getElementById("chart").innerHTML =
            wrap("c-mood") + wrap("c-day") + wrap("c-dist") + wrap("c-scatter") + wrap("c-sleep");

        // 1. Mood over time
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
        }, { ...baseOptions("Mood Over Time"), scales: { x: { ticks: { color: C.text }, grid: { color: C.grid } }, y: { min: 1, max: 10, ticks: { color: C.text }, grid: { color: C.grid } } } });

        // 2. By day of week
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

        // 3. Mood state distribution
        makeChart("c-dist", "bar", {
            labels: dist.map(d => d.state),
            datasets: [{
                label: "Days",
                data: dist.map(d => d.count),
                backgroundColor: dist.map(d => STATE_COLORS[d.state] || C.green),
                borderRadius: 6,
            }],
        }, baseOptions("How Have You Been Feeling?"));

        // 4. Sleep vs mood scatter
        makeChart("c-scatter", "scatter", {
            datasets: [{
                label: "Sleep vs Mood",
                data: scatter.map(d => ({ x: d.sleep, y: d.score })),
                backgroundColor: C.pink,
                pointRadius: 6,
            }],
        }, {
            ...baseOptions("Does Sleep Affect Your Mood?"),
            scales: {
                x: { title: { display: true, text: "Hours of Sleep", color: C.text }, ticks: { color: C.text }, grid: { color: C.grid } },
                y: { title: { display: true, text: "Mood Score", color: C.text }, ticks: { color: C.text }, grid: { color: C.grid } },
            },
        });

        // 5. Sleep over time
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
        }, { ...baseOptions("Your Sleep Over Time"), scales: { x: { ticks: { color: C.text }, grid: { color: C.grid } }, y: { min: 0, max: 24, ticks: { color: C.text }, grid: { color: C.grid } } } });

    } catch (err) {
        document.getElementById("mood-state").innerHTML = "<p>Can't reach the server. Is it running?</p>";
        console.error(err);
    }
}

loadAnalytics();
