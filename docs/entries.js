async function deleteEntry(date) {
    if (!confirm(`Delete entry for ${date}?`)) return;

    try {
        const res = await fetch(`https://mood-tracker-11bv.onrender.com/entries?date=${encodeURIComponent(date)}`, {
            method: "DELETE",
            headers: { "Authorization": "Bearer " + localStorage.getItem("token") },
        });
        if (res.ok) {
            loadEntries();
        } else {
            const err = await res.json();
            alert(err.detail);
        }
    } catch {
        alert("Can't reach the server.");
    }
}

async function loadEntries() {
    const container = document.getElementById("entries-list");

    try {
        const response = await fetch("https://mood-tracker-11bv.onrender.com/entries", { headers: { "Authorization": "Bearer " + localStorage.getItem("token") } });
        const entries = await response.json();

        if (entries.length === 0) {
            container.innerHTML = "<p>No entries yet. Go check in!</p>";
            return;
        }

        entries.reverse();

        container.innerHTML = entries.map(entry => {
            const date = new Date(entry.timestamp).toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric"
            });
            const deleteDate = new Date(entry.timestamp).toLocaleDateString("en-US", {
                month: "2-digit", day: "2-digit", year: "numeric"
            });

            const flags = [
                entry.mania && "Elevated",
                entry.psychosis && "Disconnected",
                entry.depression && "Low",
                entry.intrusive_thoughts && "Intrusive thoughts",
                entry.racing_thoughts && "Racing thoughts",
                entry.irritability && "Irritable",
                entry.social_withdrawal && "Withdrawn",
            ].filter(Boolean);

            return `
                <div class="entry-card">
                    <div class="entry-header">
                        <h2>${date}</h2>
                        <button class="delete-btn" onclick="deleteEntry('${deleteDate}')">Delete</button>
                    </div>
                    <p>Mood: ${entry.mood_score}/10 &nbsp;|&nbsp; Sleep: ${entry.sleep}h &nbsp;|&nbsp; Energy: ${entry.energy_level}/10</p>
                    ${flags.length ? `<p class="entry-flags">${flags.join(" · ")}</p>` : ""}
                    ${entry.notes ? `<p class="entry-notes">${entry.notes}</p>` : ""}
                </div>
            `;
        }).join("");

    } catch {
        container.innerHTML = "<p>Can't reach the server. Is it running?</p>";
    }
}

loadEntries();
