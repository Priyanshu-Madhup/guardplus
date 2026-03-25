import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, QrCode, UserPlus, Menu, X, ShieldCheck } from 'lucide-react';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const links = [
    { to: '/dashboard', label: 'Dashboard',       icon: LayoutDashboard },
    { to: '/guards',    label: 'Guard Station',   icon: ShieldCheck },
    { to: '/scan',      label: 'Scan QR',         icon: QrCode },
    { to: '/register',  label: 'Register Visitor', icon: UserPlus },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={() => setMenuOpen(false)}>
          <div className="navbar-logo-icon">
            <Shield size={20} />
          </div>
          <div>
            <span className="navbar-logo-text">GuardPlus</span>
            <span className="navbar-logo-sub">Visitor Management</span>
          </div>
        </Link>

        <ul className="navbar-links">
          {links.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link to={to} className={`navbar-link ${isActive(to) ? 'active' : ''}`}>
                <Icon size={16} />
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <button
          className="navbar-menu-btn"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile dropdown — absolutely positioned inside sticky navbar */}
      <div className={`navbar-mobile ${menuOpen ? 'open' : ''}`}>
        {links.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`navbar-link ${isActive(to) ? 'active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
