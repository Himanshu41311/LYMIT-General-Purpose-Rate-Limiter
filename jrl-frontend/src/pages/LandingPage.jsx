import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, User, ArrowRight, Activity, ArrowUpRight, Zap, Target, LayoutDashboard, Star, CheckCircle, ArrowDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import RateLimitSimulation from '../components/RateLimitSimulation';
import '../styles/landing.css';

const GithubIcon = ({ size = 24, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

export default function LandingPage() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScrollEvent = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScrollEvent);
    return () => window.removeEventListener('scroll', handleScrollEvent);
  }, []);

  const handleNavClick = (e, target) => {
    if (window.location.pathname !== '/') return;
    e.preventDefault();
    if (target === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const element = document.querySelector(target);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="landing-page">
      
      {/* Mesh Background */}
      <div className="mesh-bg"></div>

      {/* Floating Navbar Layout */}
      <header className={`global-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="header-left">
          <Link className="brand-logo" to="/" onClick={(e) => handleNavClick(e, 'top')} style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <img src="/logo.svg" alt="Lymit Logo" width={38} height={38} />
            <span style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-cyan)', fontSize: '28px', fontWeight: 'bold' }}>Lymit</span>
          </Link>
          <a href="https://github.com/vkhs-10/JRL-General-Purpose-Rate-Limiter" target="_blank" rel="noreferrer" className="github-star-pill">
            <GithubIcon size={16} />
            <span style={{ fontWeight: 600 }}>Star on GitHub</span>
            <div className="github-divider"></div>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Star size={14} fill="#eab308" color="#eab308" /> 12
            </span>
          </a>
        </div>
        
        <nav className="nav-pill">
          <Link to="/" className="active" onClick={(e) => handleNavClick(e, 'top')}>Home</Link>
          <Link to="/docs">Docs</Link>
          <a href="#algorithms" onClick={(e) => handleNavClick(e, '#algorithms')}>Algorithms</a>
          <a href="#integration" onClick={(e) => handleNavClick(e, '#integration')}>Integration</a>
          <a href="#insights" onClick={(e) => handleNavClick(e, '#insights')}>Insights</a>
        </nav>

        <div className="header-right">
          <div className="protection-badge">
            Protection <ArrowUpRight size={14} /> 
            <span className="shield-icon"><Shield size={14} /></span>
          </div>
          {user ? (
            <Link className="create-account" to="/dashboard">
              <LayoutDashboard size={16} /> Dashboard
            </Link>
          ) : (
            <Link className="btn btn-primary" to="/signup">
              <User size={16} /> Create Account
            </Link>
          )}
        </div>
      </header>

      {/* Flow Demo Hero Section */}
      <section className="hero-section">
        <div className="hero-pill-tag">
          <Activity size={14} color="var(--accent-cyan)" /> 
          <span className="text-gradient">General Purpose Rate Limiter</span> 
          <ArrowRight size={14} />
        </div>

        <h1 className="hero-title">One-click API Defense.</h1>
        <p className="hero-subtitle">
          Dive into robust traffic control, where atomic Redis evaluations meet seamless application protection. Guard your infrastructure with zero latency.
        </p>

        <div className="hero-actions">
          {user ? (
            <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
          ) : (
            <>
              <Link to="/signin" className="btn btn-ghost">Sign In <ArrowUpRight size={16} /></Link>
              <Link to="/signup" className="btn btn-primary">Start Protecting Now</Link>
            </>
          )}
        </div>

        {/* Hero Bottom Elements */}
        <div className="hero-bottom-center">
          <div className="scroll-circle"><ArrowDown size={16} /></div>
          <span>Scroll to explore</span>
        </div>

      </section>

      {/* API Integration Section */}
      <section id="integration" className="api-integration-section">
        <div className="api-header">
          <h2>Seamless Integration</h2>
          <p>
            Lymit acts as an intelligent reverse proxy. Just point your traffic to us, and we route it to your backend with zero friction. It evaluates requests in microseconds using atomic Redis scripts.
          </p>
        </div>
        <div className="api-content">
          <div className="api-text">
            <div className="api-features">
              <div className="api-feature-item">
                <div className="api-feature-icon"><CheckCircle size={14} /></div>
                <span>No SDKs to install in your backend code</span>
              </div>
              <div className="api-feature-item">
                <div className="api-feature-icon"><CheckCircle size={14} /></div>
                <span>Sub-millisecond latency overhead</span>
              </div>
              <div className="api-feature-item">
                <div className="api-feature-icon"><CheckCircle size={14} /></div>
                <span>Supports sliding window, token bucket, and more</span>
              </div>
            </div>
          </div>
          
          <div className="api-code-block">
            <div className="code-header">
              <div className="code-dot red"></div>
              <div className="code-dot yellow"></div>
              <div className="code-dot green"></div>
            </div>
            <pre><code>
<span style={{ color: '#8b5cf6' }}>// 1. Create a route in Lymit dashboard</span><br/>
Name: User API<br/>
Target URL: https://api.yourdomain.com/v1<br/><br/>

<span style={{ color: '#8b5cf6' }}>// 2. Attach a Policy</span><br/>
Algorithm: Sliding Window<br/>
Limit: 100 reqs / 1 minute<br/>
Scope: Per IP Address<br/><br/>

<span style={{ color: '#10b981' }}>// 3. Point your traffic to Lymit. You're protected!</span><br/>
curl -H "X-Client-IP: 192.168.1.1" \<br/>
  https://proxy.lymit.io/r/your-route-id
            </code></pre>
          </div>
        </div>
      </section>

      {/* Simulation Section */}
      <section id="algorithms" className="simulation-section">
        <div className="simulation-header">
          <h2>Traffic Architecture</h2>
          <p>Watch how Lymit intelligently routes and evaluates requests in real-time.</p>
        </div>
        <RateLimitSimulation />
      </section>

      

      {/* Bento Box Insights Section */}
      <section id="insights" className="insights-section">
        <div className="insights-header">
          <h2>Marvellous Insights</h2>
          <p>Save your team's precious time. Lymit replaces the lengthy process of manual traffic shaping.</p>
        </div>

        <div className="bento-grid">
          {/* Main Large Card */}
          <div className="bento-card card-large">
            <div className="card-inner-top">
              <div className="metric">
                <span className="number">99.9%</span>
                <span className="label">Uptime SLA . WorldWide Edge</span>
              </div>
              <div className="globe-illustration">
                <div className="globe-ring"></div>
                <div className="globe-ring tilted"></div>
                <div className="globe-spot spot-1"></div>
                <div className="globe-spot spot-2"></div>
                <div className="globe-spot spot-3"></div>
              </div>
            </div>
            
            <div className="transaction-banner">
              <strong>Atomic Redis Tech</strong>
              <p>Innovative Redis scripts evaluate policies atomically to empower your API journey without race conditions.</p>
            </div>
          </div>

          {/* Tall Chart Card */}
          <div className="bento-card card-tall">
            <div className="chart-bars">
              <div className="chart-bar" style={{height: '40%', opacity: 0.5}}></div>
              <div className="chart-bar" style={{height: '70%', opacity: 0.7}}></div>
              <div className="chart-bar" style={{height: '90%', opacity: 1}}></div>
              <div className="chart-bar glow" style={{height: '100%'}}></div>
              <div className="chart-bar" style={{height: '60%', opacity: 0.6}}></div>
            </div>
            <div className="chart-caption">
              <strong>Traffic Shaping</strong>
              <p>Each request is safely evaluated and bounded to limit abuse.</p>
            </div>
          </div>

          {/* Bottom Left Small Cards */}
          <div className="bento-card card-small">
            <span className="accent-bar yellow"></span>
            <div className="card-content">
              <span className="sm-label">Requests Processed</span>
              <span className="sm-val">2.7m</span>
              <span className="sm-sub">+19% this month</span>
            </div>
          </div>

          <div className="bento-card card-small">
            <span className="accent-bar green"></span>
            <div className="card-content">
              <span className="sm-label">Threats Mitigated</span>
              <span className="sm-val">84k</span>
              <span className="sm-sub">Blocked instantly</span>
            </div>
          </div>

          {/* Bottom Right Wide Card */}
          <div className="bento-card card-wide">
            <div className="wide-text">
              <strong>Limitless Opportunities</strong>
              <p>Watch your traffic grow in a thriving ecosystem easily, without risking outages.</p>
            </div>
            <div className="mini-bar-chart">
              <div className="m-bar yellow" style={{height: '40%'}}></div>
              <div className="m-bar red" style={{height: '70%'}}></div>
              <div className="m-bar green" style={{height: '100%'}}></div>
              <div className="m-bar teal" style={{height: '60%'}}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="global-footer">
        <div className="footer-left">Support . Documentation</div>
        <div className="footer-center">© Designed with Lymit Studio . 2026</div>
        <div className="footer-right">
          <span className="social-icon">X</span>
          <span className="social-icon">in</span>
        </div>
      </footer>
    </div>
  );
}
