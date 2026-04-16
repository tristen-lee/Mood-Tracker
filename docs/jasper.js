if (!localStorage.getItem("token")) {
    window.location.href = "home.html";
}

const API = "https://mood-tracker-11bv.onrender.com";
const name = localStorage.getItem("name") || "friend";
const STORAGE_KEY = "jasper_history";

const greetings = [
    `Hey ${name}. What's going on?`,
    `Good to see you, ${name}. How are you holding up?`,
    `${name}. Pull up a chair. What's on your mind?`,
    `Hey — I've been thinking about you. How's it going?`,
    `${name}! What's up? Talk to me.`,
    `Good to have you here. How are you feeling right now?`,
    `Hey ${name}. No pressure — just checking in. What's up?`,
    `I'm here. What do you want to talk about?`,
    `${name}, how's today treating you?`,
    `Glad you stopped by. What's going on with you?`,
];

const messagesEl = document.getElementById("jasper-messages");
const form = document.getElementById("jasper-form");
const input = document.getElementById("jasper-input");
const sendBtn = document.getElementById("jasper-send-btn");

// history = [{role: "user"|"assistant", content: "..."}]
let history = [];

function renderBubble(text, role) {
    const row = document.createElement("div");
    row.className = `jasper-msg jasper-msg--${role === "assistant" ? "jasper" : "user"}`;
    const bubble = document.createElement("span");
    bubble.className = "jasper-bubble";
    bubble.textContent = text;
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addTyping() {
    const row = document.createElement("div");
    row.className = "jasper-msg jasper-msg--jasper jasper-typing-row";
    row.innerHTML = `<span class="jasper-bubble jasper-typing"><span></span><span></span><span></span></span>`;
    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return row;
}

function saveHistory() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function loadHistory() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            history = JSON.parse(saved);
            history.forEach(msg => renderBubble(msg.content, msg.role));
            return true;
        }
    } catch {
        history = [];
    }
    return false;
}

// On load: restore history or show greeting
const hadHistory = loadHistory();
if (!hadHistory) {
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    document.getElementById("jasper-greeting").textContent = greeting;
} else {
    document.getElementById("jasper-greeting").closest(".jasper-msg").remove();
}

input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 140) + "px";
});

input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        form.dispatchEvent(new Event("submit"));
    }
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    renderBubble(text, "user");
    input.value = "";
    input.style.height = "auto";
    sendBtn.disabled = true;
    const typing = addTyping();

    try {
        const res = await fetch(`${API}/jasper`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.getItem("token"),
            },
            body: JSON.stringify({ message: text, history }),
        });

        typing.remove();

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            renderBubble(err.detail || "Something went wrong. Try again.", "assistant");
            return;
        }

        const data = await res.json();
        history.push({ role: "user", content: text });
        history.push({ role: "assistant", content: data.response });
        saveHistory();
        renderBubble(data.response, "assistant");
    } catch {
        typing.remove();
        renderBubble("Couldn't reach Jasper right now. Check your connection.", "assistant");
    } finally {
        sendBtn.disabled = false;
        input.focus();
    }
});
