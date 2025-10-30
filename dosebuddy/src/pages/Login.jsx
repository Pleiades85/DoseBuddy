import React, { useState } from "react";
import { useNavigate } from "react-router";
import "../styles/Auth.css"; 
// import {socket} from './socket';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalTitle, setModalTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const showError = (title, message) => {
    setModalTitle(title);
    setModalMessage(message);
    setShowModal(true);
  };

  const showSuccess = (title, message) => {
    setModalTitle(title);
    setModalMessage(message);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    if (modalTitle === "Welcome Back!") {
      navigate("/dashboard");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Validation
    if (!email || !password) {
      showError("Missing Information", "Please enter both email and password.");
      setIsLoading(false);
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      showError("Invalid Email", "Please enter a valid email address.");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      showError("Invalid Password", "Invalid Password. Please Try Again");
      setIsLoading(false);
      return;
    }

    try {
      // Simulate API call - replace with actual authentication
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // TODO: Replace with actual authentication logic
      // const response = await yourAuthAPI.login(email, password);
      
      showSuccess("Welcome Back!", `Successfully logged in as ${email}`);
      
    } catch (error) {
      showError("Login Failed", "Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    showError("Forgot Password", "Please contact support at support@dosebuddy.com to reset your password.");
  };


  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Welcome Back to DoseBuddy</h1>
        <p className="auth-subtitle">Sign in to manage your medications</p>
        
        <form onSubmit={handleLogin} className="auth-form">
          <div className="input-group">
            <label htmlFor="email" className="input-label">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              disabled={isLoading}
            />
          </div>

          <div className="input-group">
            <label htmlFor="password" className="input-label">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              disabled={isLoading}
            />
          </div>

          <div className="auth-options">
            <button 
              type="button" 
              className="forgot-password" 
              onClick={handleForgotPassword}
              disabled={isLoading}
            >
              Forgot Password?
            </button>
          </div>

          <button 
            type="submit" 
            className={`auth-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="spinner"></div>
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>

          {/* <div className="demo-section">
            <button 
              type="button" 
              className="demo-button"
              onClick={handleDemoLogin}
              disabled={isLoading}
            >
              Try Demo Account
            </button>
          </div> */}
        </form>

        <p className="auth-link">
          Don't have an account?{" "}
          <span onClick={() => navigate("/Signup")} className="auth-link-action">
            Create Account
          </span>
        </p>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className={`modal-content ${modalTitle !== "Welcome Back!" ? "shake" : ""}`}>
            <div className={`modal-header ${modalTitle === "Welcome Back!" ? "success" : "error"}`}>
              <h2>{modalTitle}</h2>
            </div>
            <div className="modal-body">
              <p>{modalMessage}</p>
            </div>
            <div className="modal-footer">
              <button 
                className={`modal-button ${modalTitle === "Welcome Back!" ? "success-btn" : "error-btn"}`}
                onClick={closeModal}
              >
                {modalTitle === "Welcome Back!" ? "Continue to Dashboard" : "Try Again"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}