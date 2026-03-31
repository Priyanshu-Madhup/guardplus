import React from 'react';
import { Shield, Clock, User, MapPin, UserCheck } from 'lucide-react';

import { formatTime, formatDate } from '../mockData';

const PassCard = ({ visitor }) => {
  const {
    id,
    name,
    purpose,
    department,
    entryTime,
    personToMeet,
    guard,
    visitorPhoto,
    guardPhoto,
  } = visitor;

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const guardName = guard || 'Guard on Duty';
  const guardInitials = guardName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);



  const PhotoBox = ({ src, alt, fallback }) => (
    <div className="pass-photo-box">
      {src ? (
        <img src={src} alt={alt} />
      ) : (
        <span>{fallback}</span>
      )}
    </div>
  );

  return (
    <div className="pass-card">
      {/* Header */}
      <div className="pass-header">
        <div className="pass-logo-row">
          <Shield size={22} />
          <span className="pass-logo-text">GuardPlus</span>
        </div>
        <p className="pass-subtitle">VISITOR PASS</p>
        <div className="pass-header-wave" />
      </div>

      {/* Body */}
      <div className="pass-body">
        {/* Photos */}
        <div className="pass-photos">
          <div className="pass-photo-container">
            <PhotoBox src={visitorPhoto} alt={name} fallback={initials} />
            <p className="pass-photo-label">Visitor</p>
          </div>
          <div style={{ color: '#d1fae5', alignSelf: 'center' }}>
            <UserCheck size={22} color="#16a34a" />
          </div>
          <div className="pass-photo-container">
            <PhotoBox src={guardPhoto} alt={guardName} fallback={guardInitials} />
            <p className="pass-photo-label">Guard</p>
          </div>
        </div>

        {/* Visitor name */}
        <h2 className="pass-visitor-name">{name}</h2>
        <p className="pass-visitor-id">Pass ID: {id}</p>

        {/* Info grid */}
        <div className="pass-info-grid">
          <div className="pass-info-item">
            <p className="pass-info-label">
              <User size={9} /> Purpose
            </p>
            <p className="pass-info-value">{purpose}</p>
          </div>
          <div className="pass-info-item">
            <p className="pass-info-label">
              <MapPin size={9} /> Department
            </p>
            <p className="pass-info-value">{department}</p>
          </div>
          <div className="pass-info-item">
            <p className="pass-info-label">
              <Clock size={9} /> Entry Time
            </p>
            <p className="pass-info-value">{formatTime(entryTime)}</p>
          </div>
          <div className="pass-info-item">
            <p className="pass-info-label">
              <UserCheck size={9} /> Meeting
            </p>
            <p className="pass-info-value">{personToMeet || '—'}</p>
          </div>
        </div>

        {/* Status */}
        <div className="pass-status-bar">
          <span className="pulse-dot" />
          Active Pass &nbsp;•&nbsp; {formatDate(entryTime)}
        </div>



        <p
          style={{
            textAlign: 'center',
            fontSize: '0.78rem',
            color: '#9ca3af',
          }}
        >
          Authorized by: <strong style={{ color: '#6b7280' }}>{guardName}</strong>
        </p>
      </div>
    </div>
  );
};

export default PassCard;
