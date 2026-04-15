const API = "https://mood-tracker-11bv.onrender.com";

const successMessages = [
    "You showed up today. That matters.",
    "Entry logged. You're doing the work.",
    "Another day tracked. Keep going.",
    "Logged! Small steps add up.",
    "Done. You should be proud of yourself.",
    "That's one more day of data for you.",
    "Checked in. That took courage.",
    "Logged and noted. Take care of yourself today.",
    "You came back. That's everything.",
    "Entry saved. Be kind to yourself today.",
];

function showSuccess(moodState) {
    const msg = successMessages[Math.floor(Math.random() * successMessages.length)];
    const popup = document.getElementById("success-popup");
    document.getElementById("success-text").textContent = msg;
    document.getElementById("success-mood").textContent = moodState || "";
    popup.classList.remove("hidden");
    setTimeout(() => {
        window.location.href = "dashboard.html";
    }, 2800);
}

function showError(text) {
    const msg = document.getElementById("form-message");
    msg.textContent = text;
    msg.className = "error";
    setTimeout(() => { msg.textContent = ""; msg.className = ""; }, 3000);
}

async function loadMeds() {
    try {
        const res = await fetch(`${API}/medications`, {
            headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
        });
        const meds = await res.json();
        const container = document.getElementById("med-checkboxes");
        if (!meds.length) {
            container.innerHTML = `<p class="med-section-label" style="opacity:0.5">No medications set up. <a href="settings.html">Add them in Settings.</a></p>`;
            return;
        }
        container.innerHTML = `
            <p class="med-section-label">Medications taken today</p>
            ${meds.map(m => `
                <div class="checkbox-row">
                    <label>${m.name}</label>
                    <input type="checkbox" class="med-checkbox" data-id="${m.id}">
                </div>
            `).join("")}
        `;
    } catch {}
}

loadMeds();

document.getElementById("log-form").addEventListener("submit", async function (e) {
    e.preventDefault();

    const form = e.target;
    const medIds = [...document.querySelectorAll(".med-checkbox:checked")].map(el => parseInt(el.dataset.id));

    const entry = {
        mood_score: parseInt(form.mood_score.value),
        sleep: parseInt(form.sleep.value),
        energy_level: parseInt(form.energy_level.value),
        mania: form.mania.checked,
        psychosis: form.psychosis.checked,
        depression: form.depression.checked,
        intrusive_thoughts: form.intrusive_thoughts.checked,
        racing_thoughts: form.racing_thoughts.checked,
        irritability: form.irritability.checked,
        social_withdrawal: form.social_withdrawal.checked,
        notes: form.notes.value,
        medications_taken: medIds,
    };

    try {
        const response = await fetch(`${API}/entries`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + localStorage.getItem("token") },
            body: JSON.stringify(entry),
        });

        if (response.ok) {
            const data = await response.json();
            showSuccess(data.mood_state);
            form.reset();
            document.getElementById("mood-val").textContent = "5";
            document.getElementById("sleep-val").textContent = "7";
            document.getElementById("energy-val").textContent = "5";
            loadMeds();
        } else {
            const err = await response.json();
            showError("Something went wrong: " + err.detail);
        }
    } catch {
        showError("Can't reach the server. Is it running?");
    }
});
