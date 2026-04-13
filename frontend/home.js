const userName = localStorage.getItem("name")
if (userName) {
    window.location.href = "dashboard.html"
}

document.getElementById("save-name").addEventListener("click", function() {
    const userName = document.getElementById("name-input").value
    if (!userName.trim()) return
    localStorage.setItem("name", userName)
    window.location.href = "dashboard.html"
})
