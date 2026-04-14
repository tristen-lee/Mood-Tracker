const current = localStorage.getItem("theme") || "system";
document.querySelectorAll(".theme-btn").forEach(btn => {
    if (btn.dataset.value === current) btn.classList.add("active");
    btn.addEventListener("click", () => {
        localStorage.setItem("theme", btn.dataset.value);
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const isDark = btn.dataset.value === "dark" || (btn.dataset.value === "system" && prefersDark);
        document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
        document.querySelectorAll(".theme-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
    });
});
