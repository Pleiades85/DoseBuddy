import React, { useState } from "react";
import { useNavigate } from "react-router";
import "../styles/Auth.css";
import Navbar from "../components/navbar.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    // reset errors
    setEmailError("");
    setPasswordError("");

    let valid = true;

    // required checks
    if (!email) {
      setEmailError("Email is required.");
      valid = false;
    }

    if (!password) {
      setPasswordError("Password is required.");
      valid = false;
    }

    // simple email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      setEmailError("Please enter a valid email.");
      valid = false;
    }

    // password length check
    if (password && password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      valid = false;
    }

    if (!valid) return;

    // hard-coded login
      if (email === "steventesting@example.com" && password === "PASSWORD") {
        alert("Admin login successful!");
        navigate("/dashboard"); // goes to Admin Dashboard
      } else if (email === "client@example.com" && password === "CLIENTPASS") {
        alert("Client login successful!");
        navigate("/client-dashboard"); // goes to Client Dashboard
      } else {
        setPasswordError("Invalid email or password.");
      }
  };

  return (
    <div>
      <Navbar />
      <div className="auth-page">
        <div className="background-left"></div>
        <div className="background-right"></div>

        <div className="auth-container">
          <h1 className="auth-title">Login</h1>

          {/* EMAIL INPUT */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`auth-input ${emailError ? "input-error" : ""}`}
          />
          {emailError && <p className="error-text">{emailError}</p>}

          {/* PASSWORD INPUT */}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`auth-input ${passwordError ? "input-error" : ""}`}
          />
          {passwordError && <p className="error-text">{passwordError}</p>}

          <button className="auth-button" onClick={handleLogin}>
            Login
          </button>

          <p className="auth-link">
            Don’t have an account?{" "}
            <span onClick={() => navigate("/signup")}>Sign up</span>
          </p>
        </div>
      </div>
    </div>
  );
}
