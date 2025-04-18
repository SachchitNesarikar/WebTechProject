document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");
    const resetForm = document.getElementById("resetForm");
    const logoutButton = document.getElementById("logout");

    // Base URL for Backend API
    const BASE_URL = "http://127.0.0.1:3000/api/user"; // Ensure correct port

    // ✅ Login Function
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            try {
                const response = await fetch(`${BASE_URL}/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    alert(data.message || "Login failed!");
                } else {
                    localStorage.setItem("token", data.token); // Store token
                    window.location.href = "home.html"; // Redirect to home page
                }
            } catch (error) {
                console.error("Login Error:", error);
                alert("An error occurred while logging in.");
            }
        });
    }

    // ✅ Signup Function
    if (signupForm) {
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("signup-email").value;
            const password = document.getElementById("signup-password").value;
            const confirmPassword = document.getElementById("confirm-password").value;

            if (password !== confirmPassword) {
                alert("Passwords do not match!");
                return;
            }

            try {
                const response = await fetch(`${BASE_URL}/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    alert(data.message || "Signup failed!");
                } else {
                    alert("Signup successful! Please login.");
                    window.location.href = "login.html";
                }
            } catch (error) {
                console.error("Signup Error:", error);
                alert("An error occurred while signing up.");
            }
        });
    }

    // ✅ Password Reset Function
    if (resetForm) {
        resetForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("reset-email").value;

            try {
                const response = await fetch(`${BASE_URL}/reset-password`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();

                if (!response.ok) {
                    alert(data.message || "Failed to send reset link!");
                } else {
                    alert("Reset password link sent to your email.");
                }
            } catch (error) {
                console.error("Reset Error:", error);
                alert("An error occurred while sending the reset link.");
            }
        });
    }

    // ✅ Logout Function
    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            localStorage.removeItem("token"); // Remove stored token
            window.location.href = "login.html"; // Redirect to login page
        });
    }
});

function togglePasswordVisibility(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    
    if (input && button) {
        button.addEventListener("click", () => {
            if (input.type === "password") {
                input.type = "text";
                button.textContent = "🔒"; // Change icon when password is visible
            } else {
                input.type = "password";
                button.textContent = "👁"; // Change icon when password is hidden
            }
        });
    }
}

// Apply toggle function for login & signup forms
togglePasswordVisibility("password", "togglePassword");
togglePasswordVisibility("signup-password", "toggleSignupPassword");
togglePasswordVisibility("confirm-password", "toggleConfirmPassword");
