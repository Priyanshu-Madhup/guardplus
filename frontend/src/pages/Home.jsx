import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CheckCircle, Clock, Users, ArrowRight } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  const features = ['Instant Pass', 'QR Verified', 'Secure Entry', 'Digital Record'];

  const infoCards = [
    { icon: CheckCircle, label: 'Verified', sub: 'Entry system' },
    { icon: Clock,       label: 'Real-time', sub: 'Tracking'    },
    { icon: Shield,      label: 'Secure',    sub: 'Campus wide'  },
  ];

  return (
    <div className="home-hero">
      <div className="home-hero-content">
        {/* Animated shield */}
        <div className="home-shield">
          <Shield size={48} />
        </div>

        {/* Heading */}
        <h1 className="home-title">GuardPlus</h1>
        <p className="home-tagline">Digital Visitor Pass System</p>
        <p className="home-subtitle">
          Welcome! Register your visit to receive a digital pass instantly.
          Fast, secure, and completely paperless.
        </p>

        {/* Feature pills */}
        <div className="home-features">
          {features.map((f) => (
            <span key={f} className="home-feature">
              <span className="home-feature-dot" />
              {f}
            </span>
          ))}
        </div>

        {/* CTA */}
        <button
          className="btn btn-primary btn-lg"
          onClick={() => navigate('/register')}
          style={{ padding: '1rem 2.75rem', fontSize: '1.05rem' }}
        >
          <Users size={20} />
          Register Visitor
          <ArrowRight size={18} />
        </button>

        {/* Info cards */}
        <div className="home-cards">
          {infoCards.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="home-info-card">
              <Icon size={22} color="#16a34a" style={{ margin: '0 auto 0.375rem', display: 'block' }} />
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827' }}>{label}</p>
              <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
