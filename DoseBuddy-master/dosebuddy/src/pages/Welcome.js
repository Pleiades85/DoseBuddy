import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/welcome.css";
import MyImage from "../images/YYveR301.svg";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="welcome-container">
      <img src={MyImage} alt="Welcome" className="welcome-image" />
      <h1 className="welcome-title">Welcome to DoseBuddy</h1>
      <p className="welcome-subtitle">
        Your Trusted Partner in Medical Management!
      </p>
      <p className="welcome-subtitle2">Let's Get Started!</p>

      <div className="Welcome-Page">
        <div className="welcome-buttons">
          <button onClick={() => navigate("/login")} className="auth-button">
            Login
          </button>

          <button onClick={() => navigate("/signup")} className="auth-button">
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}
