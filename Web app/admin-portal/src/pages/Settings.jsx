import React from 'react';

const Settings = () => {
  return (
    <div>
      <h2 style={{ marginBottom: '2rem' }}>Admin Settings</h2>
      
      <div className="card" style={{ maxWidth: '600px' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>System Configuration</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '600' }}>Enable AI Notifications</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Process database changes in background</div>
            </div>
            <label className="switch">
              <input type="checkbox" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '600' }}>Dark Mode Default</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Force dark mode for all users</div>
            </div>
            <label className="switch">
              <input type="checkbox" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>

           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '600' }}>Maintenance Mode</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Disable access for non-admins</div>
            </div>
            <label className="switch">
              <input type="checkbox" />
              <span className="slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
