import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { Modal } from '../components/Modal';
import { listRoutes, deleteRoute, getRouteStatus, createRoute } from '../lib/api';
import { Activity, Plus, Trash2, Settings, AlertCircle, TrendingUp, ShieldCheck, Zap } from 'lucide-react';
import '../styles/dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Route Form
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteUrl, setNewRouteUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const data = await listRoutes();
      setRoutes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!routes.length) return;
    
    const interval = setInterval(async () => {
      const updatedRoutes = [...routes];
      let changed = false;
      
      for (let i = 0; i < updatedRoutes.length; i++) {
        try {
          const status = await getRouteStatus(updatedRoutes[i].routeId);
          if (updatedRoutes[i].live !== status.live) {
            updatedRoutes[i].live = status.live;
            changed = true;
          }
        } catch {
          if (updatedRoutes[i].live !== false) {
            updatedRoutes[i].live = false;
            changed = true;
          }
        }
      }
      
      if (changed) setRoutes(updatedRoutes);
    }, 8000);
    
    return () => clearInterval(interval);
  }, [routes]);

  const handleDelete = async (e, routeId) => {
    e.stopPropagation(); // prevent card click
    if (!window.confirm('Delete this route and all of its policies? This cannot be undone.')) return;
    try {
      await deleteRoute(routeId);
      setRoutes(routes.filter(r => r.routeId !== routeId));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateRoute = async (e) => {
    e.preventDefault();
    setCreateError('');
    setIsCreating(true);
    try {
      await createRoute({ name: newRouteName, targetUrl: newRouteUrl });
      setIsModalOpen(false);
      setNewRouteName('');
      setNewRouteUrl('');
      fetchRoutes(); 
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRouteClick = (routeId) => {
    navigate(`/route/${routeId}`);
  };

  const actions = (
    <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
      <Plus size={16} /> New route
    </button>
  );

  return (
    <AppLayout 
      title="Traffic Dashboard" 
      subtitle="Monitor and control API rate limits across all your backend services."
      actions={actions}
    >
      {error && (
        <div className="alert-danger">
          <AlertCircle size={20} />
          <span>Couldn't load routes: {error}</span>
        </div>
      )}

      {/* Mock Analytics Section */}
      {!loading && !error && (
        <div className="dashboard-metrics">
          <div className="glass-card metric-card">
            <div className="metric-header">
              <div className="metric-icon-wrapper text-gradient-primary">
                <Activity size={18} />
              </div>
              Total Routes
            </div>
            <div className="metric-value">{routes.length}</div>
            <div className="metric-trend up">
              <TrendingUp size={14} /> +2 this week
            </div>
          </div>
          
          <div className="glass-card metric-card purple">
            <div className="metric-header">
              <div className="metric-icon-wrapper" style={{ color: 'var(--accent-purple)' }}>
                <ShieldCheck size={18} />
              </div>
              Requests Evaluated
            </div>
            <div className="metric-value">2.4m</div>
            <div className="metric-trend up">
              <TrendingUp size={14} /> +12.5% vs last week
            </div>
          </div>

          <div className="glass-card metric-card emerald">
            <div className="metric-header">
              <div className="metric-icon-wrapper" style={{ color: 'var(--accent-emerald)' }}>
                <Zap size={18} />
              </div>
              Avg Latency
            </div>
            <div className="metric-value">0.8ms</div>
            <div className="metric-trend neutral">
              Redis atomic evaluation
            </div>
          </div>
        </div>
      )}

      {loading && !error && (
        <div className="empty-state">
          <div className="loader"></div>
          <p>Loading your routes...</p>
        </div>
      )}

      {!loading && !error && routes.length === 0 && (
        <div className="empty-state glass-card">
          <Activity size={48} className="empty-icon text-gradient-primary" />
          <h3>No routes active</h3>
          <p>Create a route, point it at your backend, and attach a rate-limit policy to start protecting your API.</p>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ marginTop: '16px' }}>
            <Plus size={16} /> Create your first route
          </button>
        </div>
      )}

      {!loading && routes.length > 0 && (
        <>
          <div className="route-list-header">
            <h2>Active Routes</h2>
          </div>
          <div className="route-grid">
            {routes.map(r => (
              <div className="glass-card route-card" key={r.routeId} onClick={() => handleRouteClick(r.routeId)}>
                <div className="route-card-header">
                  <div>
                    <div className="route-name">{r.name}</div>
                    <div className="route-url">{r.targetUrl}</div>
                  </div>
                  <div className="route-status-badge">
                    <span className={`status-dot ${r.live ? 'live' : 'down'}`}></span>
                    {r.live ? 'Live' : 'Down'}
                  </div>
                </div>

                <div className="mock-sparkline">
                  <div className="spark-bar" style={{height: '30%'}}></div>
                  <div className="spark-bar" style={{height: '60%'}}></div>
                  <div className="spark-bar" style={{height: '80%'}}></div>
                  <div className="spark-bar" style={{height: '40%'}}></div>
                  <div className="spark-bar" style={{height: '90%'}}></div>
                  <div className="spark-bar" style={{height: '50%'}}></div>
                  <div className="spark-bar" style={{height: '70%'}}></div>
                  <div className="spark-bar" style={{height: '30%'}}></div>
                </div>

                <div className="route-card-footer">
                  <div className="route-stats-mini">
                    <div className="stat-mini">
                      <span className="stat-mini-label">Status</span>
                      <span className="stat-mini-val" style={{ color: r.active ? 'var(--success)' : 'var(--text-muted)' }}>
                        {r.active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="route-actions">
                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleRouteClick(r.routeId); }}>
                      <Settings size={16} />
                    </button>
                    <button className="icon-btn danger" onClick={(e) => handleDelete(e, r.routeId)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Route">
        <form onSubmit={handleCreateRoute}>
          {createError && <div className="alert-danger" style={{ marginBottom: '16px', padding: '12px' }}>{createError}</div>}
          <div className="field">
            <label className="label">Route Name</label>
            <input 
              type="text" 
              className="input-field" 
              required 
              placeholder="e.g. Payments API"
              value={newRouteName}
              onChange={e => setNewRouteName(e.target.value)}
            />
          </div>
          <div className="field" style={{ marginTop: '16px' }}>
            <label className="label">Target Backend URL</label>
            <input 
              type="url" 
              className="input-field" 
              required 
              placeholder="https://api.yourcompany.com/v1"
              value={newRouteUrl}
              onChange={e => setNewRouteUrl(e.target.value)}
            />
            <p className="label" style={{ fontSize: '12px', marginTop: '8px' }}>Traffic that passes the rate limit is forwarded here.</p>
          </div>
          <div className="modal-actions" style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create route'}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
