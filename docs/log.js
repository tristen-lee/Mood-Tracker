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
    document.getElementById("success-mood").textContent = moodState ? `Today: ${moodState}` : "";
    popup.classList.add("visible");
    setTimeout(() => popup.classList.remove("visible"), 4000);
}

function showError(text) {
    const msg = document.getElementById("form-message");
    msg.textContent = text;
    msg.className = "error";
    setTimeout(() => { msg.textContent = ""; msg.className = ""; }, 3000);
}

document.getElementById("log-form").addEventListener("submit", async function (e) {
    e.preventDefault();

    const form = e.target;

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
    };

    try {
        const response = await fetch("https://mood-tracker-11bv.onrender.com/entries", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + localStorage.getItem("token") },
            body: JSON.stringify(entry),
        });

        if (response.ok) {
            const data = await response.json();
            showSuccess(data.mood_state);
            form.reset();
        } else {
            const err = await response.json();
            showError("Something went wrong: " + err.detail);
        }
    } catch {
        showError("Can't reach the server. Is it running?");
    }
});
