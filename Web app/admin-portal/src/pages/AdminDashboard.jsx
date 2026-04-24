import React from 'react';

const AdminDashboard = () => {
  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>System Overview</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <h3>Total Users</h3>
          <p>1,203</p>
        </div>
        <div className="card">
          <h3>System Status</h3>
          <p style={{ color: 'var(--success)' }}>Operational</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
