import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Users, Activity, LogOut, Calendar,
  Search, RefreshCw, Clock, MapPin, Phone, User,
  Building2, AlertCircle,
} from 'lucide-react';
import API_BASE from '../api';

const toLocalDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

// Returns YYYY-MM-DD in the user's LOCAL timezone
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Compare an ISO entryTime string against a YYYY-MM-DD local date
const matchesLocalDate = (entryTime, dateStr) => {
  if (!entryTime) return false;
  const d = new Date(entryTime);
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return local === dateStr;
};

const Guards = () => {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchVisitors = useCallback(async () => {
    setLoading(true);
    setError('');

    // Always read localStorage (catches data registered before MongoDB was set up)
    const stored = JSON.parse(localStorage.getItem('guardplus_visitors') || '[]');
    const localForDate = stored.filter((v) => matchesLocalDate(v.entryTime, selectedDate));

    try {
      const params = new URLSearchParams({ date: selectedDate });
      const res = await fetch(`${API_BASE}/api/visitors?${params}`);
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const dbData = await res.json();

      // Merge: MongoDB records take precedence; append localStorage records not in DB
      const merged = [
        ...dbData,
        ...localForDate.filter((ls) => !dbData.find((db) => db.id === ls.id)),
      ];
      setVisitors(merged);
    } catch {
      // Backend unreachable — show localStorage data only
      setVisitors(localForDate);
      if (localForDate.length === 0) {
        setError('Cannot reach the server. Showing cached data only (none found for this date).');
      }
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, [selectedDate]);

  // Reload when date changes
  useEffect(() => { fetchVisitors(); }, [fetchVisitors]);

  // Auto-refresh every 30 s
  useEffect(() => {
    const id = setInterval(fetchVisitors, 30000);
    return () => clearInterval(id);
  }, [fetchVisitors]);

  const displayed = visitors.filter((v) => {
    const matchStatus = statusFilter === 'all' || v.status === statusFilter;
    const term = search.trim().toLowerCase();
    const matchSearch =
      !term ||
      v.name?.toLowerCase().includes(term) ||
      v.purpose?.toLowerCase().includes(term) ||
      v.department?.toLowerCase().includes(term) ||
      v.personToMeet?.toLowerCase().includes(term) ||
      v.phone?.includes(term);
    return matchStatus && matchSearch;
  });

  const activeCount = visitors.filter((v) => v.status === 'active').length;
  const exitedCount = visitors.filter((v) => v.status === 'exited').length;

  const getInitials = (name = '') =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const isToday = selectedDate === todayStr();

  return (
    <div className="page-wrapper">
      {/* ── Page header ── */}
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={24} color="#16a34a" /> Guard Station
        </h1>
        <p className="page-desc">
          {isToday ? "Today's live visitor log — " : `Visitor log for ${selectedDate} — `}
          pulled directly from the database
        </p>
      </div>

      {/* ── Date picker + Refresh ── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem',
            flex: '1', minWidth: 160,
          }}
        >
          <Calendar size={15} color="#6b7280" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              border: 'none', outline: 'none', fontSize: '0.875rem',
              color: 'var(--text)', background: 'transparent', width: '100%', cursor: 'pointer',
            }}
          />
        </div>

        <button
          onClick={fetchVisitors}
          disabled={loading}
          className="btn btn-secondary btn-sm"
          style={{ whiteSpace: 'nowrap' }}
        >
          <RefreshCw
            size={14}
            style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }}
          />
          {loading ? 'Loading…' : 'Refresh'}
        </button>

        {lastUpdated && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className="dashboard-stats" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eff6ff' }}>
            <Users size={20} color="#3b82f6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{visitors.length}</div>
            <div className="stat-label">Total Visitors</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--primary-light)' }}>
            <Activity size={20} color="var(--primary)" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{activeCount}</div>
            <div className="stat-label">Currently Inside</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7' }}>
            <LogOut size={20} color="#d97706" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{exitedCount}</div>
            <div className="stat-label">Exited</div>
          </div>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      {/* ── Filters row ── */}
      <div
        style={{
          display: 'flex', gap: '0.75rem', marginBottom: '1rem',
          flexWrap: 'wrap', alignItems: 'center',
        }}
      >
        {/* Status tabs */}
        <div style={{ display: 'flex', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {[
            { key: 'all',    label: 'All',     count: visitors.length },
            { key: 'active', label: 'Active',  count: activeCount },
            { key: 'exited', label: 'Exited',  count: exitedCount },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              style={{
                padding: '0.45rem 0.9rem',
                border: 'none',
                borderRight: '1px solid var(--border)',
                background: statusFilter === key ? '#16a34a' : 'transparent',
                color: statusFilter === key ? 'white' : 'var(--text-secondary)',
                fontWeight: statusFilter === key ? 600 : 400,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {label}
              <span
                style={{
                  marginLeft: '0.35rem',
                  background: statusFilter === key ? 'rgba(255,255,255,0.25)' : '#f3f4f6',
                  color: statusFilter === key ? 'white' : 'var(--text-muted)',
                  borderRadius: 20,
                  padding: '1px 7px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                }}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '0.45rem 0.75rem',
            flex: 1, minWidth: 180,
          }}
        >
          <Search size={14} color="#9ca3af" />
          <input
            type="text"
            placeholder="Search name, purpose, department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: 'none', outline: 'none', fontSize: '0.8rem',
              color: 'var(--text)', background: 'transparent', width: '100%',
            }}
          />
        </div>
      </div>

      {/* ── Visitor list ── */}
      {loading && visitors.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <div className="spinner spinner-green" style={{ width: 32, height: 32, margin: '0 auto 1rem' }} />
          <p>Loading visitor data…</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
            <Users size={44} color="#d1d5db" style={{ marginBottom: '1rem' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              No visitors found
            </p>
            <p style={{ fontSize: '0.85rem' }}>
              {search ? 'Try a different search term.' : `No ${statusFilter !== 'all' ? statusFilter : ''} visitors recorded for this date.`}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {displayed.map((v) => (
            <VisitorRow key={v._id || v.id} visitor={v} getInitials={getInitials} toLocalDate={toLocalDate} />
          ))}
        </div>
      )}
    </div>
  );
};

const VisitorRow = ({ visitor: v, getInitials, toLocalDate }) => {
  const isActive = v.status === 'active';

  return (
    <div
      className="card"
      style={{
        borderLeft: `4px solid ${isActive ? '#16a34a' : '#d1d5db'}`,
        transition: 'box-shadow 0.2s',
      }}
    >
      <div
        className="card-body"
        style={{
          display: 'flex', gap: '1rem', alignItems: 'flex-start',
          flexWrap: 'wrap', padding: '0.875rem 1rem',
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: isActive ? '#dcfce7' : '#f3f4f6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '0.95rem',
            color: isActive ? '#15803d' : '#6b7280',
          }}
        >
          {getInitials(v.name)}
        </div>

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.975rem', color: 'var(--text)' }}>
              {v.name}
            </span>
            <span
              style={{
                fontSize: '0.7rem', fontWeight: 700, padding: '2px 10px',
                borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em',
                background: isActive ? '#dcfce7' : '#fef3c7',
                color: isActive ? '#15803d' : '#d97706',
              }}
            >
              {isActive ? 'Inside' : 'Exited'}
            </span>
            {v.id && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                {v.id}
              </span>
            )}
          </div>

          {/* Meta grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '0.25rem 1rem',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Phone size={12} /> {v.phone}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <MapPin size={12} /> {v.purpose}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Building2 size={12} /> {v.department}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <User size={12} /> Meets: {v.personToMeet}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Clock size={12} /> In: {toLocalDate(v.entryTime)}
            </span>
            {v.exitTime ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#d97706' }}>
                <LogOut size={12} /> Out: {toLocalDate(v.exitTime)}
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#16a34a', fontWeight: 600 }}>
                <Activity size={12} /> Still on campus
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Guards;
