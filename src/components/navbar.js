import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/navbar.css";
import MyImage from "../images/dosebuddy.png";
import avatar from "../images/avatar.png";

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <div className="topnav">
      {/* Logo */}
      <img
        src={MyImage}
        alt="DoseBuddy Logo"
        className="nav-logo"
        style={{ cursor: "pointer" }}
        onClick={() => navigate("/")}
      />

      {/* Science Nav Item */}
      <div className="nav-item">
        <a href="#science">Science</a>

        <div className="dropdown-panel">
          <h4>Science Topics</h4>
          <p>Learn about our research, experiments, and case studies.</p>
          <ul>
            <li onClick={() => navigate("#design")}>Design</li>
            <li onClick={() => navigate("#develop")}>Develop</li>
            <li onClick={() => navigate("#support")}>Support</li>
          </ul>
        </div>
      </div>

      {/* About Our App Nav Item */}
      <div className="nav-item">
        <a href="#about">About Our App</a>

        <div className="dropdown-panel">
          <h4>About DoseBuddy</h4>
          <p>Discover features, benefits, and why users love our app.</p>
          <ul>
            <li onClick={() => navigate("#features")}>Features</li>
            <li onClick={() => navigate("#benefits")}>Benefits</li>
            <li onClick={() => navigate("#testimonials")}>Testimonials</li>
          </ul>
        </div>
      </div>

      <div className="nav-item">
        <a href="#about">News</a>

        <div className="dropdown-panel">
          <h4>IMPORTANT UPDATES & ANNOUNCEMENTS</h4>
          <p>Discover features, benefits, and why users love our app.</p>
          <ul>
            <li onClick={() => navigate("#features")}>Features</li>
            <li onClick={() => navigate("#benefits")}>UPDATES</li>
            <li onClick={() => navigate("#testimonials")}>Testimonials</li>
          </ul>
        </div>
      </div>

      <div className="nav-item">
        <a href="#science">Latest Updates</a>

        <div className="dropdown-panel">
          <h4>Science Topics</h4>
          <p>Learn about our research, experiments, and case studies.</p>
          <ul>
            <li onClick={() => navigate("#design")}>Yet to be considered</li>
            <li onClick={() => navigate("#develop")}>Yet to be developed</li>
            <li onClick={() => navigate("#support")}>Support</li>
          </ul>
        </div>
      </div>

      {/* Login link */}

      {/* Avatar */}
      <div className="avatar-container" onClick={() => navigate("/login")}>
        <span className="login-text">Click to login</span>
        <img src={avatar} alt="Avatar" className="avatar" />
      </div>
    </div>
  );
}
