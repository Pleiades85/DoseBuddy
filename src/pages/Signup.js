import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Auth.css";
import Navbar from "../components/navbar.js";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  const navigate = useNavigate();

  const handleSignup = () => {
    // error reset
    setEmailError("");
    setPasswordError("");
    setConfirmError("");

    let valid = true;

    // required
    if (!email) {
      setEmailError("Email is required.");
      valid = false;
    }
    if (!password) {
      setPasswordError("Password is required.");
      valid = false;
    }
    if (!confirmPassword) {
      setConfirmError("Please confirm your password.");
      valid = false;
    }

    // email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      setEmailError("Please enter a valid email.");
      valid = false;
    }

    // password strength measurement
    if (password && password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      valid = false;
    }

    // match check
    if (password && confirmPassword && password !== confirmPassword) {
      setConfirmError("Passwords do not match.");
      valid = false;
    }

    if (!valid) return;

    alert(`Account created for ${email}`);
    navigate("/");
  };

  return (
    <div>
      <Navbar />
      <div className="auth-page">
        <div className="background-left"></div>
        <div className="background-right"></div>

        <div className="auth-container">
          <h1 className="auth-title">Sign Up</h1>

          {/* email */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`auth-input ${emailError ? "input-error" : ""}`}
          />
          {emailError && <p className="error-text">{emailError}</p>}

          {/* password */}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`auth-input ${passwordError ? "input-error" : ""}`}
          />
          {passwordError && <p className="error-text">{passwordError}</p>}

          {/* confirmation */}
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`auth-input ${confirmError ? "input-error" : ""}`}
          />
          {confirmError && <p className="error-text">{confirmError}</p>}

          <button className="auth-button" onClick={handleSignup}>
            Sign Up
          </button>
          {/* basic validation */}
          <p className="auth-link">
            Already have an account?{" "}
            <span onClick={() => navigate("/Login")}>Login</span>
          </p>
        </div>
      </div>
    </div>
  );
}
