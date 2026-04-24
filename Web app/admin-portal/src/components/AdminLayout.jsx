import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings } from 'lucide-react';

const AdminLayout = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: '260px',
        backgroundColor: 'var(--surface)',
        padding: '2rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ marginBottom: '3rem', paddingLeft: '1rem' }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: '1.5rem', 
            background: 'linear-gradient(to right, var(--danger), var(--warning))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: '800'
          }}>
            Admin Portal
          </h1>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Overview" />
          <NavItem to="/settings" icon={<Settings size={20} />} label="Settings" />
        </nav>
      </aside>

      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div className="container animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ to, icon, label }) => (
  <NavLink 
    to={to} 
    style={({ isActive }) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem 1rem',
      borderRadius: 'var(--radius)',
      color: isActive ? 'white' : 'var(--text-muted)',
      backgroundColor: isActive ? 'var(--danger)' : 'transparent',
      fontWeight: isActive ? '600' : '500',
    })}
  >
    {icon}
    {label}
  </NavLink>
);

export default AdminLayout;
