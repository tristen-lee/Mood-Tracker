const userName = localStorage.getItem("name")
if (userName) {
    window.location.href = "dashboard.html"
}

document.getElementById("save-name").addEventListener("click", function() {
    const userName = document.getElementById("name-input").value
    localStorage.setItem("name", userName)
    window.location.href = "dashboard.html"
})

const userName = localStorage.getItem("name")
document.getElementById("greeting").innerHTML = "Welcome back, " + userName + "!"
