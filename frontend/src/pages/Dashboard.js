import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Activity, CheckCircle, Search,
  RefreshCw, LayoutDashboard, UserPlus,
} from 'lucide-react';
import VisitorCard from '../components/VisitorCard';
import { formatDate } from '../mockData';
import API_BASE from '../api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState([]);
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const pollIntervalRef = useRef(null);

  const loadVisitors = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE}/api/visitors`);
      if (!response.ok) {
        throw new Error(`Failed to fetch visitors: ${response.statusText}`);
      }
      const data = await response.json();
      setVisitors(data || []);
    } catch (err) {
      console.error('Error loading visitors:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load visitors on mount and set up auto-refresh
  useEffect(() => {
    loadVisitors();
    
    // Set up polling to refresh data every 5 seconds
    pollIntervalRef.current = setInterval(() => {
      loadVisitors();
    }, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [loadVisitors]);

  const handleCheckout = async (id) => {
    try {
      const exitTime = new Date().toISOString();
      
      const response = await fetch(`${API_BASE}/api/visitors/${id}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ exitTime }),
      });

      if (!response.ok) {
        throw new Error(`Failed to checkout visitor: ${response.statusText}`);
      }

      // Update local state immediately, then refresh from server
      setVisitors((prev) =>
        prev.map((v) => v.id === id ? { ...v, status: 'exited', exitTime } : v)
      );

      // Refresh data from server to ensure consistency
      await loadVisitors();
    } catch (err) {
      console.error('Error checking out visitor:', err);
      alert('Failed to checkout visitor. Please try again.');
    }
  };

  const filtered = visitors.filter((v) => {
    const matchesFilter = filter === 'all' || v.status === filter;
    const term          = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      v.name.toLowerCase().includes(term)       ||
      v.purpose.toLowerCase().includes(term)    ||
      v.department.toLowerCase().includes(term) ||
      (v.personToMeet || '').toLowerCase().includes(term);
    return matchesFilter && matchesSearch;
  });

  const activeCount  = visitors.filter((v) => v.status === 'active').length;
  const exitedCount  = visitors.filter((v) => v.status === 'exited').length;
  const todayCount   = visitors.filter((v) => {
    return new Date(v.entryTime).toDateString() === new Date().toDateString();
  }).length;

  const handleRefreshClick = async () => {
    // Reset interval and load immediately
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    setLoading(true);
    await loadVisitors();
    // Restart polling
    pollIntervalRef.current = setInterval(() => {
      loadVisitors();
    }, 5000);
  };

  if (error) {
    return (
      <div className="page-wrapper">
        <div
          style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', marginBottom: '1.5rem',
            flexWrap: 'wrap', gap: '0.75rem',
          }}
        >
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LayoutDashboard size={24} color="#16a34a" /> Security Dashboard
          </h1>
        </div>
        <div className="empty-state" style={{ marginTop: '2rem' }}>
          <div className="empty-state-icon">
            <Users size={28} />
          </div>
          <p className="empty-state-title">Error Loading Dashboard</p>
          <p style={{ fontSize: '0.875rem', color: '#dc2626' }}>{error}</p>
          <button className="btn btn-primary btn-sm" onClick={handleRefreshClick} style={{ marginTop: '1rem' }}>
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Page header */}
      <div
        style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', marginBottom: '1.5rem',
          flexWrap: 'wrap', gap: '0.75rem',
        }}
      >
        <div>
          <h1
            className="page-title"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <LayoutDashboard size={24} color="#16a34a" /> Security Dashboard
          </h1>
          <p className="page-desc">
            {formatDate(new Date().toISOString())} &nbsp;•&nbsp; Real-time visitor tracking
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleRefreshClick} disabled={loading}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/register')}>
            <UserPlus size={14} /> New Visitor
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon stat-icon-green">
            <Activity size={22} />
          </div>
          <div>
            <p className="stat-value">{activeCount}</p>
            <p className="stat-label">Active Visitors</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-gray">
            <CheckCircle size={22} />
          </div>
          <div>
            <p className="stat-value">{exitedCount}</p>
            <p className="stat-label">Exited</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">
            <Users size={22} />
          </div>
          <div>
            <p className="stat-value">{todayCount}</p>
            <p className="stat-label">Total Today</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="dashboard-controls">
        <div className="search-input-wrapper">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, purpose, department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-tabs">
          {[
            { key: 'all',    label: `All (${visitors.length})`  },
            { key: 'active', label: `Active (${activeCount})`   },
            { key: 'exited', label: `Exited (${exitedCount})`   },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`filter-tab ${filter === key ? 'active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Visitor grid */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Users size={28} />
          </div>
          <p className="empty-state-title">No visitors found</p>
          <p style={{ fontSize: '0.875rem' }}>
            {search
              ? 'Try a different search term or clear the filter.'
              : 'No visitors match the selected filter.'}
          </p>
        </div>
      ) : (
        <>
          {/* Active section */}
          {(filter === 'all' || filter === 'active') && filtered.some((v) => v.status === 'active') && (
            <>
              <div className="section-title">
                <span className="section-dot" style={{ background: '#22c55e' }} />
                Active Visitors ({filtered.filter((v) => v.status === 'active').length})
              </div>
              <div className="visitors-grid" style={{ marginBottom: '1.5rem' }}>
                {filtered
                  .filter((v) => v.status === 'active')
                  .map((v) => (
                    <VisitorCard key={v.id} visitor={v} onCheckout={handleCheckout} />
                  ))}
              </div>
            </>
          )}

          {/* Exited section */}
          {(filter === 'all' || filter === 'exited') && filtered.some((v) => v.status === 'exited') && (
            <>
              <div className="section-title">
                <span className="section-dot" style={{ background: '#9ca3af' }} />
                Exited Visitors ({filtered.filter((v) => v.status === 'exited').length})
              </div>
              <div className="visitors-grid">
                {filtered
                  .filter((v) => v.status === 'exited')
                  .map((v) => (
                    <VisitorCard key={v.id} visitor={v} />
                  ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
