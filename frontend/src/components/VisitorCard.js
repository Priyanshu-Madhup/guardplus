import React from 'react';
import { Clock, User, MapPin, Phone, Activity, CheckCircle, LogOut } from 'lucide-react';
import { formatTime } from '../mockData';

const VisitorCard = ({ visitor, onCheckout }) => {
  const { id, name, phone, purpose, department, entryTime, exitTime, status, visitorPhoto, personToMeet } = visitor;
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="visitor-card">
      <div className="visitor-avatar">
        {visitorPhoto ? <img src={visitorPhoto} alt={name} /> : <span>{initials}</span>}
      </div>

      <div className="visitor-info">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '0.5rem',
          }}
        >
          <span className="visitor-name">{name}</span>
          <span className={`badge ${status === 'active' ? 'badge-active' : 'badge-exited'}`}>
            {status === 'active' ? (
              <>
                <Activity size={10} /> Active
              </>
            ) : (
              <>
                <CheckCircle size={10} /> Exited
              </>
            )}
          </span>
        </div>

        <div className="visitor-meta">
          <span className="visitor-meta-item">
            <User size={11} /> {purpose}
          </span>
          <span className="visitor-meta-item">
            <MapPin size={11} /> {department}
          </span>
          <span className="visitor-meta-item">
            <Phone size={11} /> {phone}
          </span>
          <span className="visitor-meta-item">
            <Clock size={11} /> {formatTime(entryTime)}
            {exitTime && <> → {formatTime(exitTime)}</>}
          </span>
          {personToMeet && (
            <span className="visitor-meta-item" style={{ width: '100%' }}>
              <User size={11} /> Visiting: {personToMeet}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.72rem',
              color: '#9ca3af',
              fontFamily: 'monospace',
              background: '#f3f4f6',
              padding: '2px 6px',
              borderRadius: '4px',
            }}
          >
            {id}
          </span>
          {onCheckout && status === 'active' && (
            <button
              onClick={() => onCheckout(id)}
              className="btn btn-danger btn-sm"
              style={{ marginLeft: 'auto' }}
            >
              <LogOut size={13} /> Check Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisitorCard;
