import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Users, LogOut, Bell, Shield, X, Building2, ClipboardList } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, writeBatch, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import './Layout.css';

const Layout = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  useEffect(() => {
    let unsubscribe = () => {};

    const setupRealtimeListener = async () => {
      if (!auth.currentUser) return;
      
      const user = auth.currentUser;
      const q = query(
        collection(db, 'pharmacies', user.uid, 'notifications'),
        orderBy('createdAt', 'desc')
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setNotifications(notifs);
      }, (error) => {
        console.error("Error listening to notifications:", error);
      });
    };

    setupRealtimeListener();

    return () => unsubscribe();
  }, []);

  const handleClearNotifications = async () => {
    if (!auth.currentUser || notifications.length === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        const ref = doc(db, 'pharmacies', auth.currentUser.uid, 'notifications', n.id);
        batch.delete(ref);
      });
      await batch.commit();
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const handleMarkAllRead = async () => {
    if (!auth.currentUser) return;
    try {
      const unread = notifications.filter(n => !n.read);
      for (const n of unread) {
        const ref = doc(db, 'pharmacies', auth.currentUser.uid, 'notifications', n.id);
        await updateDoc(ref, { read: true });
      }
    } catch (error) {
      console.error('Error marking notifications read:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const userName = auth.currentUser?.email?.split('@')[0] || 'Pharmacy';

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="layout__sidebar">
        <div className="layout__brand">
          <div className="layout__brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L4 7V12C4 16.42 7.4 20.74 12 22C16.6 20.74 20 16.42 20 12V7L12 2Z" fill="currentColor" opacity="0.2"/>
              <path d="M12 2L4 7V12C4 16.42 7.4 20.74 12 22C16.6 20.74 20 16.42 20 12V7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
              <path d="M9 12H15M12 9V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="layout__brand-name">DoseBuddy</span>
        </div>

        <nav className="layout__nav">
          <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" end />
          <NavItem to="/inventory" icon={<Package size={20} />} label="Inventory" />
          <NavItem to="/patients" icon={<Users size={20} />} label="Patients" />
          <NavItem to="/orders" icon={<ClipboardList size={20} />} label="Orders" />
          <NavItem to="/pharmacy-profile" icon={<Building2 size={20} />} label="My Pharmacy" />
        </nav>

        <div className="layout__sidebar-footer">
          <div className="layout__trust-badge">
            <Shield size={14} />
            <span>Data Secured</span>
          </div>
          <button onClick={handleLogout} className="layout__logout-btn">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="layout__main">
        <header className="layout__header">
          <div className="layout__greeting">
            <span className="layout__greeting-text">Welcome back, <strong>{userName}</strong></span>
          </div>
          <div className="layout__header-actions">
            <div className="layout__notif-wrapper">
              <button 
                className="layout__notif-btn" 
                onClick={() => setShowNotifPanel(!showNotifPanel)}
              >
                <Bell size={20} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="layout__notif-badge">{notifications.filter(n => !n.read).length}</span>
                )}
              </button>

              {showNotifPanel && (
                <div className="layout__notif-panel">
                  <div className="layout__notif-panel-header">
                    <span>Notifications</span>
                    <button onClick={() => setShowNotifPanel(false)}><X size={16} /></button>
                  </div>
                  {notifications.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                      {notifications.some(n => !n.read) && (
                        <button
                          onClick={handleMarkAllRead}
                          style={{ flex: 1, padding: '6px 10px', fontSize: '12px', fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-light, #e8f5e8)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        >Mark all read</button>
                      )}
                      <button
                        onClick={handleClearNotifications}
                        style={{ flex: 1, padding: '6px 10px', fontSize: '12px', fontWeight: 600, color: '#EF4444', background: '#FEE2E2', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                      >Clear all</button>
                    </div>
                  )}
                  {notifications.length === 0 ? (
                    <div className="layout__notif-empty">No new notifications</div>
                  ) : (
                    <div className="layout__notif-list">
                      {notifications.slice(0, 8).map(n => {
                        const isShareRequest = n.type === 'share_request';
                        const isOrder = n.type === 'order' || n.type === 'new_order';
                        const icon = isShareRequest ? '👥' : isOrder ? '📦' : '🔔';
                        const targetPath = isShareRequest ? '/patients' : isOrder ? '/orders' : '/';

                        return (
                          <div key={n.id} 
                            className={`layout__notif-item ${!n.read ? 'layout__notif-item--unread' : ''}`}
                            style={{ cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'start', padding: '10px 12px', borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                            onClick={() => { 
                              navigate(targetPath); 
                              setShowNotifPanel(false); 
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--slate-50)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: n.read ? 400 : 600, color: 'var(--text-primary)' }}>{n.message}</p>
                              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                {n.createdAt?.seconds ? new Date(n.createdAt.seconds * 1000).toLocaleString() : 
                                  n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                              </span>
                            </div>
                            {!n.read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: 6 }}></span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="layout__content">
          <div className="container">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ to, icon, label, end }) => (
  <NavLink 
    to={to}
    end={end}
    className={({ isActive }) => `layout__nav-item ${isActive ? 'layout__nav-item--active' : ''}`}
  >
    {icon}
    <span>{label}</span>
  </NavLink>
);

export default Layout;
