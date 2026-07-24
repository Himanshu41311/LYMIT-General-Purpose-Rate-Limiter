import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/layout.css';

export const AppLayout = ({ title, subtitle, actions, children }) => {
  const { user } = useAuth();

  return (
    <div className="app-shell page-enter">
      <aside className="app-sidebar">
        <Link className="brand" to="/">
          <span className="brand-mark">Ly</span>
          <span className="brand-name">Lymit</span>
        </Link>
        <nav className="app-sidebar-nav">
          <NavLink 
            to="/dashboard" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} />
            <span>Routes</span>
          </NavLink>
          <NavLink 
            to="/profile" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <User size={18} />
            <span>Profile</span>
          </NavLink>
        </nav>
      </aside>

      <main className="app-main">
        <div className="app-header">
          <div>
            <h1 className="app-title">{title}</h1>
            <p className="app-subtitle">{subtitle}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link className="user-chip" to="/profile">
              <span className="avatar-dot">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
              {user?.name || 'User'}
            </Link>
            {actions}
          </div>
        </div>

        <div className="app-content">
          {children}
        </div>
      </main>
    </div>
  );
};
