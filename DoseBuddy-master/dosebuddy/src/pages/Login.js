//Login.js
import React, { useState } from "react";
import { useNavigate } from "react-router";
import "../styles/Auth.css"; // shared styling for login/signup

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    // basic validation:
    if (!email || !password) {
            alert("Name must be filled out");
            return;
        }

        //basic authentication logic here
        alert(`Logged in with ${email}`);
        navigate("/dashboard"); // example redirect (optional)
        }
    

  return (
    <div className="auth-container">
      <h1 className="auth-title">DoseBuddy Login</h1>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="auth-input"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="auth-input"
      />
      <button className="auth-button" onClick={handleLogin}>
        Login
      </button>
      <p className="auth-link">
        Don’t have an account?{" "}
        <span onClick={() => navigate("/signup")}>Sign up</span>
      </p>
    </div>
  );
};