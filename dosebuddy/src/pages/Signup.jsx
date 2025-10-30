import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Auth.css";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    if (modalTitle === "Success!") {
      navigate("/");
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Validation checks
    if (!email || !password || !confirmPassword) {
      showError("Missing Information", "Please fill in all fields");
      setIsLoading(false);
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      showError("Invalid Email", "Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      showError("Weak Password", "Password must be at least 8 characters long");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      showError("Password Mismatch", "Passwords do not match. Please try again");
      setIsLoading(false);
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // TODO: Add actual signup logic
      showSuccess("Success!", `Account created successfully for ${email}`);
      
    } catch (error) {
      showError("Signup Failed", "There was an error creating your account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Join DoseBuddy</h1>
        <p className="auth-subtitle">Create your account to start managing medications safely</p>
        
        <form onSubmit={handleSignup} className="auth-form">
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
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              disabled={isLoading}
            />
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword" className="input-label">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="auth-input"
              disabled={isLoading}
            />
          </div>

          <button 
            type="submit" 
            className={`auth-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="spinner"></div>
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="auth-link">
          Already have an account?{" "}
          <span onClick={() => navigate("/Login")} className="auth-link-action">
            Sign In
          </span>
        </p>
      </div>

      {/* Pop-up Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className={`modal-content ${modalTitle !== "Success!" ? "shake" : ""}`}>
            <div className={`modal-header ${modalTitle === "Success!" ? "success" : "error"}`}>
              <h2>{modalTitle}</h2>
            </div>
            <div className="modal-body">
              <p>{modalMessage}</p>
            </div>
            <div className="modal-footer">
              <button 
                className={`modal-button ${modalTitle === "Success!" ? "success-btn" : "error-btn"}`}
                onClick={closeModal}
              >
                {modalTitle === "Success!" ? "Continue" : "Try Again"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}