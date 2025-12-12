import React, { useState } from "react";
import { Bar, Pie } from "react-chartjs-2";
import "../styles/dashboard.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const barData = {
    labels: ["Medicine A", "Medicine B", "Medicine C", "Medicine D"],
    datasets: [
      {
        label: "Inventory Count/Approx. Medicine Amounts",
        data: [1, 2, 3, 4],
        backgroundColor: "rgba(54, 162, 235, 0.6)",
      },
    ],
  };

  const pieData = {
    /*Sample labels*/
    labels: ["Patient #", "Pharmacies Locations", "Total Vaccine #", "Total-Sales"],
    datasets: [
      {
        data: [4, 3, 2, 1],
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
      },
    ],
  };

  return (
    <div className="dashboard-page">
      {/* Left vertical nav */}
      <div className="dashboard-sidebar">
        <h2>ADMIN</h2>
        <button
          className={activeTab === "dashboard" ? "active-tab" : ""}
          onClick={() => setActiveTab("dashboard")}
        >
          Dashboard
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
          <div className="chart-section">
            <h2>Your Dashboard</h2>

            {/* Bar Chart */}
            <div className="chart-box" style={{ height: "250px" }}>
              <h3>Medicinal Inventory</h3>
              <Bar
                data={barData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false, // allows it to fit the container height
                  plugins: {
                    legend: { position: "top" },
                    tooltip: { enabled: true },
                  },
                }}
              />
            </div>

            {/* Pie Chart */}
            <div className="chart-box" style={{ height: "250px" }}>
              <h3>Company Statistics</h3>
              <Pie
                data={pieData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "right" },
                    tooltip: { enabled: true },
                  },
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
