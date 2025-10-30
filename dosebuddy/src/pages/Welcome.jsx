import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/welcome.css";
import MyImage from "../images/logo.png";
import ScrollToTop from "../features/ScrollUp";

export default function Welcome() {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate("/login");
  };

  const handleSignup = () => {
    navigate("/signup");
  };

  return (
    <div className="welcome-container">
      <header className="welcome-header">
        <div className="header-content">
          <div className="logo">
            <a href="#home" className="logo-link">
              <img src={MyImage} alt="Dose Buddy" className="logo-image" />
            </a>
          </div>

          <nav className="navigation">
            <div className="nav-links">
              <a href="#home">Home</a>
              <a href="#about">About</a>
              <a href="#services">Services</a>
              <a href="#contact">Contact</a>
            </div>
          </nav>
          <div className="auth-buttons">
            <button className="login-btn" onClick={handleLogin}>
              Login
            </button>
            <button className="signup-btn" onClick={handleSignup}>
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="welcome-main">
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">
              <b>Welcome To Dose Buddy!</b>
            </h1>
            <p className="hero-subtitle">
              Manage your medications effortlessly with Dose Buddy. Stay on track with reminders, your health, and access vital information all in one place!
            </p>
            <div className="hero-buttons">
              <button className="cta-button primary" onClick={handleSignup}>
                Get Started
              </button>
              <button className="cta-button secondary">
                Learn More
              </button>
            </div>
          </div>

          <div className="hero-image">
            {/* <img src={myimage} alt="Welcome" className="hero-img" /> */}
            <div className="image-placeholder">
              Image Here (phone mockup with app screenshot)
            </div>
          </div>
        </section>

        {/* How Dose Buddy Helps You Section */}
        <div className="tasks">
          <h2 className="tasks-title">How Dose Buddy Helps You</h2>
          <div className="tasks-list">
            <div className="task-item">
              <h3>Medication Identification</h3>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
            </div>
            
            <div className="task-item">
              <h3>Dose Reminders</h3>
              <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
            </div>
            
            <div className="task-item">
              <h3>Safety Checks</h3>
              <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
            </div>
            
            <div className="task-item">
              <h3>Health Tracking</h3>
              <p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.</p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section className="features-section">
          <div className="container">
            <h2 className="section-title">Features</h2>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">📸</div>
                <h3>Scan & Identify</h3>
                <p>
                  Recognize thousands of medications from a simple photo scan
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">💊</div>
                <h3>Health Records</h3>
                <p>Keep all your medication information organized in one place</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">🤗</div>
                <h3>Usability</h3>
                <p>Simple, intuitive design that anyone can navigate effortlessly</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="welcome-footer">
        <div className="container">
          <p>&copy; 2025 DoseBuddy | All Rights Reserved</p>
        </div>
      </footer>

      <ScrollToTop />
    </div>
  );
}