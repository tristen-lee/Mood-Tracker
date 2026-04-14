const API = "https://mood-tracker-11bv.onrender.com";
let currentEditDate = null;

async function deleteEntry(date) {
    if (!confirm(`Delete entry for ${date}?`)) return;

    try {
        const res = await fetch(`${API}/entries?date=${encodeURIComponent(date)}`, {
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

function openEdit(date, entry) {
    currentEditDate = date;
    document.getElementById("edit-mood").value = entry.mood_score;
    document.getElementById("edit-mood-val").textContent = entry.mood_score;
    document.getElementById("edit-sleep").value = entry.sleep;
    document.getElementById("edit-sleep-val").textContent = entry.sleep;
    document.getElementById("edit-energy").value = entry.energy_level;
    document.getElementById("edit-energy-val").textContent = entry.energy_level;
    document.getElementById("edit-mania").checked = entry.mania;
    document.getElementById("edit-psychosis").checked = entry.psychosis;
    document.getElementById("edit-depression").checked = entry.depression;
    document.getElementById("edit-intrusive").checked = entry.intrusive_thoughts;
    document.getElementById("edit-racing").checked = entry.racing_thoughts;
    document.getElementById("edit-irritability").checked = entry.irritability;
    document.getElementById("edit-withdrawal").checked = entry.social_withdrawal;
    document.getElementById("edit-notes").value = entry.notes || "";
    document.getElementById("edit-modal").classList.remove("hidden");
}

function closeEdit() {
    document.getElementById("edit-modal").classList.add("hidden");
    currentEditDate = null;
}

document.getElementById("edit-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    const body = {
        mood_score: parseInt(document.getElementById("edit-mood").value),
        sleep: parseInt(document.getElementById("edit-sleep").value),
        energy_level: parseInt(document.getElementById("edit-energy").value),
        mania: document.getElementById("edit-mania").checked,
        psychosis: document.getElementById("edit-psychosis").checked,
        depression: document.getElementById("edit-depression").checked,
        intrusive_thoughts: document.getElementById("edit-intrusive").checked,
        racing_thoughts: document.getElementById("edit-racing").checked,
        irritability: document.getElementById("edit-irritability").checked,
        social_withdrawal: document.getElementById("edit-withdrawal").checked,
        notes: document.getElementById("edit-notes").value,
    };

    try {
        const res = await fetch(`${API}/entries?date=${encodeURIComponent(currentEditDate)}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.getItem("token"),
            },
            body: JSON.stringify(body),
        });
        if (res.ok) {
            closeEdit();
            loadEntries();
        } else {
            const err = await res.json();
            alert(err.detail);
        }
    } catch {
        alert("Can't reach the server.");
    }
});

async function loadEntries() {
    const container = document.getElementById("entries-list");

    try {
        const response = await fetch(`${API}/entries`, {
            headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
        });
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

            const entryJson = encodeURIComponent(JSON.stringify(entry));

            return `
                <div class="entry-card">
                    <div class="entry-header">
                        <h2>${date}</h2>
                        <div class="entry-actions">
                            <button class="edit-btn" onclick="openEdit('${deleteDate}', JSON.parse(decodeURIComponent('${entryJson}')))">Edit</button>
                            <button class="delete-btn" onclick="deleteEntry('${deleteDate}')">Delete</button>
                        </div>
                    </div>
                    <p>Mood: ${entry.mood_score}/10 &nbsp;|&nbsp; Sleep: ${entry.sleep}h &nbsp;|&nbsp; Energy: ${entry.energy_level}/10</p>
                    ${flags.length ? `<p class="entry-flags">${flags.join(" · ")}</p>` : ""}
                    ${entry.medications_taken && entry.medications_taken.length ? `<p class="entry-flags">💊 ${entry.medications_taken.join(" · ")}</p>` : ""}
                    ${entry.notes ? `<p class="entry-notes">${entry.notes}</p>` : ""}
                </div>
            `;
        }).join("");

    } catch {
        container.innerHTML = "<p>Can't reach the server. Is it running?</p>";
    }
}

loadEntries();
