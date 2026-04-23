if (!localStorage.getItem("token")) {
    window.location.href = "home.html";
}

const API = "https://mood-tracker-11bv.onrender.com";

const SYMPTOM_LABELS = {
    mania: "Elevated mood",
    depression: "Low / empty",
    racing_thoughts: "Racing thoughts",
    intrusive_thoughts: "Intrusive thoughts",
    irritability: "Irritability",
    social_withdrawal: "Social withdrawal",
    psychosis: "Disconnected from reality",
};

function delta(current, previous, higher_is_better = true) {
    if (previous == null) return "";
    const diff = (current - previous).toFixed(1);
    const up = diff > 0;
    const good = higher_is_better ? up : !up;
    const arrow = up ? "↑" : "↓";
    const cls = good ? "delta-good" : "delta-bad";
    return `<span class="${cls}">${arrow} ${Math.abs(diff)}</span>`;
}

document.getElementById("summary-content").innerHTML = `
    <div class="skeleton-card">
        <div class="skeleton skeleton-line skeleton-line--short" style="height:20px"></div>
        <div class="skeleton skeleton-line skeleton-line--full"></div>
        <div class="skeleton skeleton-line skeleton-line--med"></div>
        <div class="skeleton skeleton-line skeleton-line--full"></div>
    </div>
    <div class="skeleton-card">
        <div class="skeleton skeleton-line skeleton-line--med"></div>
        <div class="skeleton skeleton-line skeleton-line--full"></div>
        <div class="skeleton skeleton-line skeleton-line--short"></div>
    </div>`;

fetch(`${API}/analytics/monthly-summary`, {
    headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
})
.then(r => r.json())
.then(data => {
    const el = document.getElementById("summary-content");

    if (data.error === "no_data" || data.error === "not_enough_data") {
        el.innerHTML = `<p style="text-align:center; opacity:0.6">Log at least 3 check-ins this month to see your summary.</p>`;
        return;
    }

    document.getElementById("summary-title").textContent = data.month;

    const t = data.this_month;
    const l = data.last_month;

    const symptoms = Object.entries(t.symptom_counts)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `
            <div class="symptom-row">
                <span class="symptom-label">${SYMPTOM_LABELS[k] || k}</span>
                <span class="symptom-count">${v} day${v !== 1 ? "s" : ""}</span>
            </div>
        `).join("");

    el.innerHTML = `
        ${data.ai_summary ? `
        <div class="summary-ai-card">
            <p class="summary-ai-text">${data.ai_summary}</p>
        </div>` : ""}

        <div class="summary-stats-grid">
            <div class="summary-stat-card">
                <span class="summary-stat-label">Avg Mood</span>
                <span class="summary-stat-value">${t.avg_mood}<span class="summary-stat-unit">/10</span></span>
                <span class="summary-stat-delta">${delta(t.avg_mood, l?.avg_mood)}</span>
            </div>
            <div class="summary-stat-card">
                <span class="summary-stat-label">Avg Sleep</span>
                <span class="summary-stat-value">${t.avg_sleep}<span class="summary-stat-unit">hrs</span></span>
                <span class="summary-stat-delta">${delta(t.avg_sleep, l?.avg_sleep)}</span>
            </div>
            <div class="summary-stat-card">
                <span class="summary-stat-label">Avg Energy</span>
                <span class="summary-stat-value">${t.avg_energy}<span class="summary-stat-unit">/10</span></span>
                <span class="summary-stat-delta">${delta(t.avg_energy, l?.avg_energy)}</span>
            </div>
            <div class="summary-stat-card">
                <span class="summary-stat-label">Check-ins</span>
                <span class="summary-stat-value">${t.entry_count}</span>
                <span class="summary-stat-delta">${delta(t.entry_count, l?.entry_count)}</span>
            </div>
            <div class="summary-stat-card">
                <span class="summary-stat-label">Most Common State</span>
                <span class="summary-stat-value summary-stat-state">${t.most_common_state}</span>
            </div>
        </div>

        ${symptoms ? `
        <div class="summary-section">
            <h2>Symptom Days</h2>
            <div class="symptom-list">${symptoms}</div>
        </div>` : `
        <div class="summary-section">
            <h2>Symptom Days</h2>
            <p style="opacity:0.5">No symptoms flagged this month.</p>
        </div>`}

        ${l ? `<p class="summary-comparison-note">Compared to ${l.avg_mood}/10 mood and ${l.avg_sleep}h sleep last month.</p>` : ""}
    `;
})
.catch(() => {
    document.getElementById("summary-content").innerHTML =
        `<p style="text-align:center; opacity:0.5">Couldn't load your summary. Try again.</p>`;
});
