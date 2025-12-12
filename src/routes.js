// Routes.js
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Welcome from "./pages/Welcome";
import Dashboard from "./pages/Dashboard"; // Admin dashboard
import ClientDashboard from "./pages/ClientDashboard"; // Client dashboard

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} /> 
        <Route path="/client-dashboard" element={<ClientDashboard />} />{" "}
      </Routes>
    </Router>
  );
}
