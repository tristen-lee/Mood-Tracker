function showMessage(text, type) {
    const msg = document.getElementById("form-message");
    msg.textContent = text;
    msg.className = type;
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
            showMessage("Entry saved!", "success");
            form.reset();
        } else {
            const err = await response.json();
            showMessage("Something went wrong: " + err.detail, "error");
        }
    } catch {
        showMessage("Can't reach the server. Is it running?", "error");
    }
});
