import React, { useState } from "react";
import "../styles/dashboard.css"; // reuse same dashboard styles

export default function ClientDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");

  // sample weekly schedule (will be replaced with a proper patient database)
  const weeklySchedule = {
    Monday: [
      { time: "08:00 AM", medicine: "Medicine", color: "#FF6384" },
      { time: "12:00 PM", medicine: "Medicine", color: "#36A2EB" },
      { time: "06:00 PM", medicine: "Medicine", color: "#FFCE56" },
    ],
    Tuesday: [
      { time: "08:00 AM", medicine: "Medicine", color: "#FF6384" },
      { time: "12:00 PM", medicine: "Medicine", color: "#36A2EB" },
    ],
    Wednesday: [
      { time: "08:00 AM", medicine: "Medicine", color: "#FF6384" },
      { time: "06:00 PM", medicine: "Medicine", color: "#FFCE56" },
    ],
    Thursday: [
      { time: "08:00 AM", medicine: "Medicine", color: "#FF6384" },
      { time: "12:00 PM", medicine: "Medicine", color: "#36A2EB" },
      { time: "09:00 PM", medicine: "Medicine", color: "#4BC0C0" },
    ],
    Friday: [
      { time: "08:00 AM", medicine: "Medicine", color: "#FF6384" },
      { time: "06:00 PM", medicine: "Medicine", color: "#FFCE56" },
    ],
    Saturday: [
      { time: "09:00 AM", medicine: "Medicine", color: "#36A2EB" },
      { time: "06:00 PM", medicine: "Medicine", color: "#FFCE56" },
    ],
    Sunday: [
      { time: "08:00 AM", medicine: "Medicine", color: "#FF6384" },
      { time: "12:00 PM", medicine: "Medicine", color: "#36A2EB" },
      { time: "09:00 PM", medicine: "Medicine", color: "#4BC0C0" },
    ],
  };

  return (
    <div className="dashboard-page">
      {/* Left vertical nav */}
      <div className="dashboard-sidebar">
        <h2>Your DoseBuddy</h2>
        <button
          className={activeTab === "dashboard" ? "active-tab" : ""}
          onClick={() => setActiveTab("dashboard")}
        >
          Weekly Medicine Planner 
        </button>
        <button
          className={activeTab === "profile" ? "active-tab" : ""}
          onClick={() => setActiveTab("profile")}
        >
          Edit Profile
        </button>
      </div>

      {/* Main content */}
      <div className="dashboard-content">
        {activeTab === "dashboard" && (
          <div className="schedule-section">
            <h2>Weekly Medicine Planner</h2>
            <div className="week-schedule">
              {Object.entries(weeklySchedule).map(([day, meds]) => (
                <div key={day} className="day-column">
                  <h3>{day}</h3>
                  {meds.map((item, idx) => (
                    <div
                      key={idx}
                      className="pill-block"
                      style={{ backgroundColor: item.color }}
                    >
                      <span className="pill-time">{item.time}</span>
                      <span className="pill-name">{item.medicine}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="profile-section">
            <h2>Edit Profile</h2>
            <div className="profile-card">
              <div className="profile-picture">
                <img src="https://via.placeholder.com/120" alt="Profile" />
                <button>Change Photo</button>
              </div>

              <form className="profile-form">
                <label>
                  Name
                  <input type="text" placeholder="Your Name" />
                </label>
                <label>
                  Email
                  <input type="email" placeholder="Your Email" />
                </label>
                <label>
                  Current Password
                  <input type="password" placeholder="Current Password" />
                </label>
                <label>
                  New Password
                  <input type="password" placeholder="New Password" />
                </label>
                <button type="submit" className="save-button">
                  Save Changes
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
