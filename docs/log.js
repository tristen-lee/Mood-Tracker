const API = "https://mood-tracker-11bv.onrender.com";
const token = localStorage.getItem("token");
if (!token) window.location.href = "home.html";

const TOTAL_STEPS = 6;

const state = {
    mood_score:         5,
    sleep:              7,
    felt_rested:        null,
    energy_level:       5,
    mania:              false,
    racing_thoughts:    false,
    irritability:       false,
    anxiety:            false,
    depression:         false,
    intrusive_thoughts: false,
    social_withdrawal:  false,
    psychosis:          false,
    notes:              "",
    medications_taken:  [],
};

const STATE_MESSAGES = {
    "Stable":    { label: "Feeling Stable 🪨",    msg: "A solid day. Keep building." },
    "Hypomanic": { label: "Hypomanic ⬆️",          msg: "Energy's elevated. Keep an eye on your sleep tonight." },
    "Manic":     { label: "Manic ⚡",              msg: "Things are high right now. Consider reaching out to someone you trust." },
    "Mixed":     { label: "Mixed State 🌀",        msg: "One of the harder ones. You don't have to navigate it alone." },
    "Depressed": { label: "Feeling Low 💙",        msg: "Be gentle with yourself today. You still showed up." },
    "Severe":    { label: "Rough Day 🖤",           msg: "Please reach out to someone you trust. You matter." },
};

const successMessages = [
    "You showed up today. That matters.",
    "Entry logged. You're doing the work.",
    "Another day tracked. Keep going.",
    "Logged. Small steps add up.",
    "Done. Be proud of yourself.",
    "That's one more day of data for you.",
    "Checked in. That took courage.",
    "Logged. Take care of yourself today.",
    "You came back. That's everything.",
    "Entry saved. Be kind to yourself today.",
];

let currentStep = 0;

//--- Progress dots ---
function buildProgress() {
    const bar = document.getElementById("step-progress");
    bar.innerHTML = Array.from({ length: TOTAL_STEPS }, (_, i) =>
        `<span class="step-dot${i === 0 ? " active" : ""}"></span>`
    ).join("");
}

function updateProgress(step) {
    document.querySelectorAll(".step-dot").forEach((dot, i) => {
        dot.className = "step-dot" + (i === step ? " active" : i < step ? " done" : "");
    });
}

//--- Step navigation ---
function goToStep(n) {
    document.getElementById(`step-${currentStep}`).classList.remove("active");
    document.getElementById(`step-${n}`).classList.add("active");
    currentStep = n;
    updateProgress(n);
    document.getElementById("btn-back").style.display = n === 0 ? "none" : "";
    document.getElementById("btn-next").textContent = n === TOTAL_STEPS - 1 ? "All done ✓" : "Next →";
}

document.getElementById("btn-back").addEventListener("click", () => {
    if (currentStep > 0) goToStep(currentStep - 1);
});

document.getElementById("btn-next").addEventListener("click", () => {
    if (currentStep < TOTAL_STEPS - 1) {
        goToStep(currentStep + 1);
    } else {
        submit();
    }
});

//--- Sliders ---
const moodSlider   = document.getElementById("mood-slider");
const sleepSlider  = document.getElementById("sleep-slider");
const energySlider = document.getElementById("energy-slider");

moodSlider.addEventListener("input", () => {
    state.mood_score = parseInt(moodSlider.value);
    document.getElementById("mood-val").textContent = moodSlider.value;
});

sleepSlider.addEventListener("input", () => {
    state.sleep = parseInt(sleepSlider.value);
    document.getElementById("sleep-val").textContent = sleepSlider.value;
});

energySlider.addEventListener("input", () => {
    state.energy_level = parseInt(energySlider.value);
    document.getElementById("energy-val").textContent = energySlider.value;
});

//--- Felt rested toggle ---
document.querySelectorAll(".rested-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".rested-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        state.felt_rested = btn.dataset.val === "true";
    });
});

//--- Symptom pills ---
document.querySelectorAll(".symptom-pill").forEach(pill => {
    pill.addEventListener("click", () => {
        const field = pill.dataset.field;
        state[field] = !state[field];
        pill.classList.toggle("selected", state[field]);
    });
});

//--- Medications ---
async function loadMeds() {
    const res = await fetch(`${API}/medications`, {
        headers: { "Authorization": "Bearer " + token }
    });
    const meds = await res.json();
    const section = document.getElementById("med-section");

    if (!meds.length) {
        section.innerHTML = `<p class="step-sub" style="margin-bottom:0.5rem">No medications set up. <a href="settings.html">Add them in Settings.</a></p>`;
        return;
    }

    section.innerHTML = `
        <p class="step-sub" style="margin-bottom:0.75rem">Medications taken today</p>
        <div class="symptom-grid">
            ${meds.map(m => `<button class="symptom-pill" data-med-id="${m.id}">${m.name}</button>`).join("")}
        </div>
    `;

    section.querySelectorAll(".symptom-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            const id = parseInt(pill.dataset.medId);
            pill.classList.toggle("selected");
            if (pill.classList.contains("selected")) {
                state.medications_taken.push(id);
            } else {
                state.medications_taken = state.medications_taken.filter(x => x !== id);
            }
        });
    });
}

//--- Notes ---
document.getElementById("notes-input").addEventListener("input", e => {
    state.notes = e.target.value;
});

//--- Submit ---
async function submit() {
    const btn = document.getElementById("btn-next");
    btn.disabled = true;
    btn.textContent = "Saving...";

    try {
        const res = await fetch(`${API}/entries`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(state),
        });

        if (res.ok) {
            const data = await res.json();

            if (data.milestone) {
                localStorage.setItem("pendingMilestone", JSON.stringify(data.milestone));
            }

            if (data.new_achievements && data.new_achievements.length > 0) {
                localStorage.setItem("pendingAchievements", JSON.stringify(data.new_achievements));
            }

            showSuccess(data.mood_state);
        } else {
            const err = await res.json();
            btn.disabled = false;
            btn.textContent = "All done ✓";
            showError(err.detail || "Something went wrong.");
        }
    } catch {
        btn.disabled = false;
        btn.textContent = "All done ✓";
        showError("Can't reach the server. Try again.");
    }
}

function showSuccess(moodState) {
    const info = STATE_MESSAGES[moodState] || { label: moodState, msg: "" };
    const msg  = successMessages[Math.floor(Math.random() * successMessages.length)];
    document.getElementById("success-state").textContent = info.label;
    document.getElementById("success-text").textContent  = info.msg || msg;
    document.getElementById("success-popup").classList.remove("hidden");
    setTimeout(() => { window.location.href = "dashboard.html"; }, 3000);
}

function showError(text) {
    const existing = document.getElementById("error-msg");
    if (existing) existing.remove();
    const el = document.createElement("p");
    el.id = "error-msg";
    el.className = "error";
    el.textContent = text;
    document.querySelector(".step-nav").before(el);
    setTimeout(() => el.remove(), 3500);
}

//--- Init ---
buildProgress();
loadMeds();
