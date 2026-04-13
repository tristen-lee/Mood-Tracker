const userName = localStorage.getItem("name");
if (!userName) {
    window.location.href = "home.html";
}

const randomGreeting = [
    `Hello, ${userName}. How are you doing today?`,
    `${userName}. Good to see you!`,
    `There you are, ${userName}.`,
    `Hey ${userName}, glad you're here.`,
    `Howdy ${userName}! Let's check in.`,
    `Good to have you back, ${userName}`,
    `You came back ${userName}. That matters!`,
    `No judgement here, just checking in.`,
    `Take a breath, and let's dive in.`,
    `Showing up is enough ${userName}.`,
    `I'm so proud of you, ${userName}.`,
    `Remember ${userName}: you are special.`,
    `Well, how has today been ${userName}?`,
    `I'm glad you are here and breathing.`,
    `How are you holding up?`,
];

const randNum= Math.floor(Math.random() * randomGreeting.length);

if (localStorage.getItem("hasVisited")) {
    document.getElementById("greeting").innerHTML = randomGreeting[randNum];
} else {
    document.getElementById("greeting").innerHTML = `Let's get started, ${userName}.`;
    localStorage.setItem("hasVisited", "true");
}

