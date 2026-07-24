import React, { useState, useEffect, useRef } from 'react';
import { Shield, CheckCircle, XCircle, Activity, RotateCcw, Play, Zap, Smartphone, ShieldCheck } from 'lucide-react';
import '../styles/simulation.css';

export default function RateLimitSimulation() {
  const [stats, setStats] = useState({ sent: 0, allowed: 0, dropped: 0 });
  const [windowStats, setWindowStats] = useState({ received: 0, allowed: 0, dropped: 0 });
  
  // Interactive Controls
  const [limit, setLimit] = useState(5);
  const [rate, setRate] = useState(0); // 0 means auto-traffic is paused, giving manual control
  const limitRef = useRef(limit);
  const rateRef = useRef(rate);
  const windowSecs = 5;

  const [particles, setParticles] = useState([]);
  const [nodePulses, setNodePulses] = useState({ allowed: false, dropped: false });
  const [systemMessage, setSystemMessage] = useState("Waiting for manual or auto traffic...");
  const requestHistory = useRef([]);
  const particleIdCounter = useRef(0);
  const unmounted = useRef(false);

  // Sync refs for the interval
  useEffect(() => {
    limitRef.current = limit;
    rateRef.current = rate;
  }, [limit, rate]);

  // Interval to smoothly update the sliding window counts every 100ms
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      requestHistory.current = requestHistory.current.filter(req => now - req.time < 5000);
      
      let received = requestHistory.current.length;
      let allowed = requestHistory.current.filter(req => req.status === 'allowed').length;
      let dropped = requestHistory.current.filter(req => req.status === 'dropped').length;
      
      setWindowStats({ received, allowed, dropped });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const fireRequest = () => {
    const now = Date.now();
    const id = particleIdCounter.current++;
    
    setStats(s => ({ ...s, sent: s.sent + 1 }));
    setParticles(p => [...p, { id, stage: 'incoming', createdAt: now }]);
    
    setTimeout(() => {
      if (unmounted.current) return;
      const evalTime = Date.now();
      const allowedInWindow = requestHistory.current.filter(req => req.status === 'allowed' && evalTime - req.time < windowSecs * 1000);
      
      let status = 'dropped';
      if (allowedInWindow.length < limitRef.current) {
        status = 'allowed';
        setStats(s => ({ ...s, allowed: s.allowed + 1 }));
        setSystemMessage("Under the limit, forwarding request");
      } else {
        status = 'dropped';
        setStats(s => ({ ...s, dropped: s.dropped + 1 }));
        setSystemMessage("Rate limit exceeded, dropping request");
      }
      
      requestHistory.current.push({ time: evalTime, status });
      setParticles(p => p.map(x => x.id === id ? { ...x, stage: 'outgoing', status } : x));
      
      setTimeout(() => {
        if (unmounted.current) return;
        setParticles(p => p.filter(x => x.id !== id));
        
        setNodePulses(prev => ({ ...prev, [status]: true }));
        setTimeout(() => {
          if (unmounted.current) return;
          setNodePulses(prev => ({ ...prev, [status]: false }));
        }, 800);
      }, 800);
    }, 800);
  };

  useEffect(() => {
    unmounted.current = false;
    let timeout;

    const generateAutoRequest = () => {
      if (unmounted.current) return;

      if (rateRef.current > 0) {
        fireRequest();
        const delay = 1000 / rateRef.current;
        timeout = setTimeout(generateAutoRequest, delay * 0.5 + Math.random() * delay);
      } else {
        // Check again shortly if rate was 0
        timeout = setTimeout(generateAutoRequest, 500);
      }
    };

    generateAutoRequest();

    return () => {
      unmounted.current = true;
      clearTimeout(timeout);
    };
  }, []);

  const simulateBurst = () => {
    let count = 0;
    const interval = setInterval(() => {
      if (unmounted.current || count >= 10) {
        clearInterval(interval);
        return;
      }
      fireRequest();
      count++;
    }, 50);
  };

  const handleReset = () => {
    setStats({ sent: 0, allowed: 0, dropped: 0 });
    setParticles([]);
    setNodePulses({ allowed: false, dropped: false });
    setSystemMessage("Simulation reset.");
    requestHistory.current = [];
  };

  return (
    <div className="sim-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', width: '100%' }}>
      
      {/* Flow Simulation Area */}
      <div className="sim-container">
        
      {/* The Flow Area */}
      <div className="sim-flow-area" style={{ position: 'relative', width: '100%', height: '500px', flexShrink: 0 }}>
        
        <svg className="sim-svg" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        {/* Background paths */}
        <path d="M 200 250 L 425 250" className="sim-path-bg" />
        <path d="M 575 250 C 650 250 650 150 800 150" className="sim-path-bg" />
        <path d="M 575 250 C 650 250 650 350 800 350" className="sim-path-bg" />

        {/* Particles */}
        {particles.map(p => {
          if (p.stage === 'incoming') {
            return (
              <path key={p.id} d="M 200 250 L 425 250" className="sim-particle sim-particle-incoming" />
            );
          } else {
            const d = p.status === 'allowed' 
              ? "M 575 250 C 650 250 650 150 800 150"
              : "M 575 250 C 650 250 650 350 800 350";
            const colorClass = p.status === 'allowed' ? 'sim-particle-allowed' : 'sim-particle-dropped';
            // Use p.id + '-out' as key so React remounts the element and restarts the CSS animation
            return (
              <path key={p.id + '-out'} d={d} className={`sim-particle ${colorClass}`} />
            );
          }
        })}
      </svg>

      {/* Client Node */}
      <div className="sim-node-group" style={{ left: '17.5%', top: '53.5%' }}>
        <div className="sim-squircle sim-icon-client-circle">
          <Smartphone size={22} color="#60a5fa" />
        </div>
        <div className="sim-node-title" style={{ marginTop: '8px' }}>CLIENTS</div>
      </div>

      {/* Gateway Node */}
      <div className="sim-gateway-group" style={{ left: '50%', top: '45%' }}>
        <div className="sim-gateway-title" style={{ marginBottom: '16px', fontSize: '22px' }}>
          <span style={{ fontFamily: 'cursive', color: '#1FACA9', fontWeight: 'bold' }}>Lymit</span> Gateway
        </div>
        
        <div className="sim-gateway-ring">
          <div className="sim-shield-squircle">
            <img src="/logo.svg?v=2" alt="Lymit Logo" width={58} height={58} />
          </div>
        </div>
      </div>

      {/* API Node */}
      <div className={`sim-node-card sim-api ${nodePulses.allowed ? 'pulse-active' : ''}`} style={{ left: '80%', top: '30%' }}>
        <CheckCircle size={20} className="sim-green-text sim-card-icon" />
        <div className="sim-card-title sim-green-text">API server</div>
        <div className="sim-card-sub">200 OK</div>
      </div>

      {/* Dropped Node */}
      <div className={`sim-node-card sim-dropped ${nodePulses.dropped ? 'pulse-active' : ''}`} style={{ left: '80%', top: '70%' }}>
        <XCircle size={20} className="sim-red-text sim-card-icon" />
        <div className="sim-card-title sim-red-text">Dropped</div>
        <div className="sim-card-sub">429 too many requests</div>
      </div>
      
      </div> {/* End of sim-flow-area */}

      {/* Bottom Dashboard Panels (Side-by-side in center) */}
      <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', alignItems: 'stretch', padding: '0 32px 32px 32px', marginTop: '24px', zIndex: 20 }}>
        
        {/* Performance Metrics Card */}
        <fieldset className="sim-fieldset sim-metrics-panel">
          <legend>Performance Metrics</legend>
          <div className="metrics-sub">
            CURRENT 5S WINDOW: Recv: {windowStats.received}, Pass: {windowStats.allowed}, Drop: {windowStats.dropped}
          </div>
          
          <div className="metrics-columns">
            <div className="metric-col">
              <div className="metric-header">ALLOWED</div>
              <div className="metric-val sim-green-text">{stats.allowed}</div>
              <div className="metric-footer">ALLOWED<br/>REQUESTS</div>
            </div>
            <div className="metric-divider"></div>
            <div className="metric-col">
              <div className="metric-header">DENIED</div>
              <div className="metric-val sim-red-text">{stats.dropped}<span className="metric-sup">429</span></div>
              <div className="metric-footer">DENIED<br/>REQUESTS</div>
            </div>
            <div className="metric-divider"></div>
            <div className="metric-col">
              <div className="metric-header">LATENCY</div>
              <div className="metric-val">0.4<span className="metric-sup" style={{color:'rgba(255,255,255,0.5)'}}>ms</span></div>
              <div className="metric-footer">AVG LATENCY</div>
            </div>
          </div>

          <div className="metrics-reset-row" onClick={handleReset}>
            <RotateCcw size={14} /> Reset Metrics
          </div>
        </fieldset>

        {/* Gateway Settings & Controls Column */}
        <div style={{ width: '340px', display: 'flex', flexDirection: 'column' }}>
          
          {/* Gateway Settings */}
          <fieldset className="sim-fieldset" style={{ margin: 0, marginBottom: '12px' }}>
            <legend>Gateway Settings</legend>
            
            <div className="sim-setting-row">
              <div className="sim-setting-label">
                <Activity size={14}/> AUTO
              </div>
              <div className="sim-setting-control">
                <input type="range" min="0" max="20" value={rate} onChange={e => setRate(Number(e.target.value))} className="sim-slider" />
                <span className="sim-setting-val">{rate === 0 ? 'PAUSED' : `${rate}req/s`}</span>
              </div>
            </div>

            <div className="sim-setting-row" style={{ marginTop: '16px' }}>
              <div className="sim-setting-label">
                <Shield size={14}/> LIMIT
              </div>
              <div className="sim-setting-control">
                <input type="range" min="1" max="50" value={limit} onChange={e => setLimit(Number(e.target.value))} className="sim-slider sim-slider-purple" />
                <span className="sim-setting-val">{limit}req/{windowSecs}s</span>
              </div>
            </div>
          </fieldset>

          {/* Simulation Controls */}
          <fieldset className="sim-fieldset" style={{ margin: 0, marginBottom: '12px' }}>
            <legend>Simulation Controls</legend>
            <div className="sim-btn-group">
              <button className="sim-btn" onClick={fireRequest}><Play size={12}/> Send</button>
              <button className="sim-btn" onClick={simulateBurst}><Zap size={12}/> Burst</button>
              <button className="sim-btn" onClick={handleReset}><RotateCcw size={12}/> Reset Simulation</button>
            </div>
          </fieldset>

          {/* Algorithm Badge */}
          <div className="sim-algo-badge" style={{ marginTop: 'auto' }}>
            Algorithm: {limit}req/{windowSecs}s Sliding Window
          </div>
        </div>

      </div>

    </div>
      {/* End of sim-container */}

    </div>
  );
}
