(function () {
    const pref = localStorage.getItem("theme") || "system";
    if (pref === "dark" || pref === "light") {
        document.documentElement.setAttribute("data-theme", pref);
    } else if (pref === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
        document.documentElement.setAttribute("data-theme", pref);
    }
})();
