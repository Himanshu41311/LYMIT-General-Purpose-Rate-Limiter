import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { Modal } from '../components/Modal';
import { 
  getRoute, updateRoute, deleteRoute, getRouteStatus,
  listPolicies, createPolicy, updatePolicy, deletePolicy
} from '../lib/api';
import { Settings, Plus, Trash2, Edit2, ArrowLeft, Activity, ShieldAlert, CheckCircle2 } from 'lucide-react';
import '../styles/route-details.css';

export default function RouteDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [route, setRoute] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit Route State
  const [routeName, setRouteName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [routeError, setRouteError] = useState('');

  // Policy Modal State
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState(null);
  const [policyError, setPolicyError] = useState('');
  
  const [scope, setScope] = useState('GLOBAL');
  const [identifierSource, setIdentifierSource] = useState('HEADER');
  const [identifierValue, setIdentifierValue] = useState('');
  const [algorithm, setAlgorithm] = useState('FIXED_WINDOW');
  const [limit, setLimit] = useState('');
  const [windowSize, setWindowSize] = useState('');
  const [windowUnit, setWindowUnit] = useState('MINUTE');
  const [policyActive, setPolicyActive] = useState(true);

  // Mock chart animation tick
  const [chartBars, setChartBars] = useState(Array(40).fill(0).map(() => Math.random() * 60 + 10));

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    // animate chart
    const interval = setInterval(() => {
      setChartBars(prev => {
        const next = [...prev.slice(1), Math.random() * 80 + 10];
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [routeData, policiesData] = await Promise.all([
        getRoute(id),
        listPolicies(id)
      ]);
      setRoute(routeData);
      setRouteName(routeData.name);
      setTargetUrl(routeData.targetUrl);
      setIsActive(routeData.active);
      setPolicies(policiesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRoute = async () => {
    setRouteError('');
    try {
      const updated = await updateRoute(id, { name: routeName, targetUrl, active: isActive });
      setRoute(updated);
    } catch (err) {
      setRouteError(err.message);
    }
  };

  const handleDeleteRoute = async () => {
    if (!window.confirm('Delete this route and all of its policies? This cannot be undone.')) return;
    try {
      await deleteRoute(id);
      navigate('/dashboard');
    } catch (err) {
      alert(err.message);
    }
  };

  const openPolicyModal = (policyId = null) => {
    setEditingPolicyId(policyId);
    setPolicyError('');
    
    if (policyId) {
      const p = policies.find(x => x.policyId === policyId);
      if (p) {
        setScope(p.scope);
        setIdentifierSource(p.identifierSource || 'HEADER');
        setIdentifierValue(p.identifierValue || '');
        setAlgorithm(p.algorithm);
        setPolicyActive(p.active);
        try {
          const cfg = JSON.parse(p.algorithmConfig);
          setLimit(cfg.limit || '');
          setWindowSize(cfg.windowSize || '');
          setWindowUnit(cfg.windowUnit || 'MINUTE');
        } catch {}
      }
    } else {
      setScope('GLOBAL');
      setIdentifierSource('HEADER');
      setIdentifierValue('');
      setAlgorithm('FIXED_WINDOW');
      setLimit('');
      setWindowSize('');
      setWindowUnit('MINUTE');
      setPolicyActive(true);
    }
    
    setIsPolicyModalOpen(true);
  };

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    setPolicyError('');
    
    if (!limit || !windowSize) {
      setPolicyError('Limit and window must be positive numbers.');
      return;
    }
    
    const algorithmConfig = JSON.stringify({ limit: Number(limit), windowSize: Number(windowSize), windowUnit });
    
    try {
      if (editingPolicyId) {
        await updatePolicy(id, editingPolicyId, {
          algorithm,
          algorithmConfig,
          active: policyActive
        });
      } else {
        const needsIdentifier = scope === 'USER' || scope === 'API_KEY';
        if (needsIdentifier && !identifierValue.trim()) {
          setPolicyError('Enter a header/param/cookie name to read the identity from.');
          return;
        }
        await createPolicy(id, {
          scope,
          identifierSource: needsIdentifier ? identifierSource : null,
          identifierValue: needsIdentifier ? identifierValue.trim() : null,
          algorithm,
          algorithmConfig
        });
      }
      setIsPolicyModalOpen(false);
      fetchData(); // refresh
    } catch (err) {
      setPolicyError(err.message);
    }
  };

  const handleDeletePolicy = async (policyId) => {
    if (!window.confirm('Delete this policy?')) return;
    try {
      await deletePolicy(id, policyId);
      setPolicies(policies.filter(p => p.policyId !== policyId));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <AppLayout><div className="flex-center full-height"><div className="loader"></div></div></AppLayout>;
  if (error) return <AppLayout><div className="alert-danger">{error}</div></AppLayout>;

  return (
    <AppLayout 
      title={
        <div className="route-header-area">
          <Link to="/dashboard" className="icon-btn"><ArrowLeft size={20} /></Link>
          <span className="text-gradient">{route.name}</span>
        </div>
      } 
      subtitle="Route configuration and traffic control policies"
    >
      <div className="glass-card traffic-chart-container">
        <div className="chart-header">
          <Activity size={16} className="text-gradient-primary" />
          <span>Live Traffic Simulator (Mock)</span>
        </div>
        {chartBars.map((h, i) => (
          <div 
            key={i} 
            className={`traffic-bar ${h > 75 ? 'blocked' : ''}`} 
            style={{ height: `${h}%` }}
          />
        ))}
      </div>

      <div className="route-details-grid">
        <div className="glass-card route-settings">
          <div className="status-line">
            {route.live ? (
              <><CheckCircle2 size={16} color="var(--success)" /> Live in Redis — Proxy will serve it</>
            ) : (
              <><ShieldAlert size={16} color="var(--warning)" /> Not live — Proxy will 404 this route</>
            )}
          </div>
          
          {routeError && <div className="alert-danger" style={{marginBottom: '16px', padding: '12px'}}>{routeError}</div>}
          
          <div className="field">
            <label className="label">Route Name</label>
            <input type="text" className="input-field" value={routeName} onChange={e => setRouteName(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Backend URL</label>
            <input type="url" className="input-field" value={targetUrl} onChange={e => setTargetUrl(e.target.value)} />
          </div>
          <div className="toggle-row field">
            <div>
              <span className="toggle-label">Active</span>
              <span className="sub">Paused routes return 404 — nothing gets proxied or limited.</span>
            </div>
            <label className="switch">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              <span className="track"></span>
            </label>
          </div>
          
          <div className="actions-row">
            <button className="btn btn-primary btn-sm" onClick={handleSaveRoute}>Save changes</button>
            <button className="btn btn-danger btn-sm" onClick={handleDeleteRoute}>Delete route</button>
          </div>
        </div>

        <div className="policies-section">
          <div className="policies-header">
            <div>
              <h2>Protection Policies</h2>
              <p className="sub">A request is denied if any active policy denies it.</p>
            </div>
            <button className="btn btn-primary" onClick={() => openPolicyModal()}>
              <Plus size={16} /> Add policy
            </button>
          </div>

          {policies.length === 0 ? (
            <div className="empty-state glass-card">
              <h3>No policies attached</h3>
              <p>Without a policy, requests to this route are refused with 403 Forbidden. Add one to allow traffic safely.</p>
              <button className="btn btn-ghost" onClick={() => openPolicyModal()} style={{marginTop: 16}}>
                Add Policy
              </button>
            </div>
          ) : (
            <div className="policy-list">
              {policies.map(p => {
                let config = {};
                try { config = JSON.parse(p.algorithmConfig); } catch {}
                const summary = `${config.limit ?? '?'} reqs / ${config.windowSize ?? '?'} ${(config.windowUnit || '').toLowerCase()}s`;
                const idLine = p.identifierSource ? ` via ${p.identifierSource.toLowerCase()} "${p.identifierValue || ''}"` : '';
                
                return (
                  <div className={`policy-card glass-card ${p.algorithm} ${p.active ? 'active-policy' : ''}`} key={p.policyId}>
                    <div className="policy-card-top">
                      <div className="policy-card-title">
                        {p.algorithm.replace('_', ' ')}
                        <span className="pill" style={{ marginLeft: 8 }}>{p.scope.replace('_', ' ')}</span>
                        {!p.active && <span className="pill" style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>Paused</span>}
                      </div>
                      <div className="policy-actions">
                        <button className="icon-btn" onClick={() => openPolicyModal(p.policyId)}>
                          <Edit2 size={16} />
                        </button>
                        <button className="icon-btn danger" onClick={() => handleDeletePolicy(p.policyId)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="policy-card-detail">
                      <div className="policy-detail-item">
                        <span className="policy-detail-label">Limit</span>
                        <span className="policy-detail-val">{summary}</span>
                      </div>
                      {p.identifierSource && (
                        <div className="policy-detail-item">
                          <span className="policy-detail-label">Identifier</span>
                          <span className="policy-detail-val">{idLine}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isPolicyModalOpen} onClose={() => setIsPolicyModalOpen(false)} title={editingPolicyId ? 'Edit policy' : 'Add policy'}>
        <form onSubmit={handleSavePolicy}>
          {policyError && <div className="alert-danger" style={{ marginBottom: '16px', padding: '12px' }}>{policyError}</div>}
          
          <div className={`field ${editingPolicyId ? 'locked-field' : ''}`}>
            <label className="label">Scope</label>
            <select className="input-field" value={scope} onChange={e => setScope(e.target.value)} disabled={!!editingPolicyId}>
              <option value="GLOBAL">Global — one counter for the whole route</option>
              <option value="IP">Per IP address</option>
              <option value="API_KEY">Per API key</option>
              <option value="USER">Per user identifier</option>
            </select>
          </div>

          {(scope === 'USER' || scope === 'API_KEY') && (
            <div className={`field-row ${editingPolicyId ? 'locked-field' : ''}`}>
              <div className="field">
                <label className="label">Read identity from</label>
                <select className="input-field" value={identifierSource} onChange={e => setIdentifierSource(e.target.value)} disabled={!!editingPolicyId}>
                  <option value="HEADER">Header</option>
                  <option value="QUERY_PARAM">Query parameter</option>
                  <option value="COOKIE">Cookie</option>
                </select>
              </div>
              <div className="field">
                <label className="label">Name</label>
                <input type="text" className="input-field" value={identifierValue} onChange={e => setIdentifierValue(e.target.value)} placeholder="X-Api-Key" disabled={!!editingPolicyId} />
              </div>
            </div>
          )}

          {editingPolicyId && (
            <p className="sub" style={{marginBottom: '16px'}}>Scope and identity source can't be changed after creation.</p>
          )}

          <div className="field" style={{marginTop: 16}}>
            <label className="label">Algorithm</label>
            <select className="input-field" value={algorithm} onChange={e => setAlgorithm(e.target.value)}>
              <option value="FIXED_WINDOW">Fixed window</option>
              <option value="SLIDING_WINDOW">Sliding window</option>
              <option value="TOKEN_BUCKET">Token bucket</option>
              <option value="LEAKY_BUCKET">Leaky bucket</option>
            </select>
          </div>

          <div className="field-row" style={{marginTop: 16}}>
            <div className="field">
              <label className="label">Limit</label>
              <input type="number" className="input-field" value={limit} onChange={e => setLimit(e.target.value)} min="1" required />
            </div>
            <div className="field">
              <label className="label">Per Window Size</label>
              <input type="number" className="input-field" value={windowSize} onChange={e => setWindowSize(e.target.value)} min="1" required />
            </div>
          </div>
          
          <div className="field" style={{marginTop: 16}}>
            <label className="label">Window unit</label>
            <select className="input-field" value={windowUnit} onChange={e => setWindowUnit(e.target.value)}>
              <option value="SECOND">Second(s)</option>
              <option value="MINUTE">Minute(s)</option>
              <option value="HOUR">Hour(s)</option>
              <option value="DAY">Day(s)</option>
            </select>
          </div>

          {editingPolicyId && (
            <div className="toggle-row field" style={{marginTop: '16px'}}>
              <span className="toggle-label">Active</span>
              <label className="switch">
                <input type="checkbox" checked={policyActive} onChange={e => setPolicyActive(e.target.checked)} />
                <span className="track"></span>
              </label>
            </div>
          )}

          <div className="modal-actions" style={{marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end'}}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsPolicyModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save policy</button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
