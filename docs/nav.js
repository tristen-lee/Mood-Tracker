document.addEventListener("DOMContentLoaded", () => {
    const btn   = document.getElementById("hamburger-btn");
    const links = document.getElementById("nav-links");
    if (!btn || !links) return;

    btn.addEventListener("click", e => {
        e.stopPropagation();
        const open = links.classList.toggle("open");
        btn.textContent = open ? "✕" : "☰";
    });

    links.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", () => {
            links.classList.remove("open");
            btn.textContent = "☰";
        });
    });

    document.addEventListener("click", e => {
        if (!e.target.closest(".top-nav")) {
            links.classList.remove("open");
            btn.textContent = "☰";
        }
    });
});
