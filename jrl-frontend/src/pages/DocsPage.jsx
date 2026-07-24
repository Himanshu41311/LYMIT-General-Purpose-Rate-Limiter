import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, LayoutDashboard, User, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/docs.css';

export default function DocsPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('introduction');

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['introduction', 'problem', 'architecture', 'redis-contract', 'algorithms', 'quick-start'];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= 300) {
            setActiveSection(section);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  return (
    <div className="docs-page page-enter">
      {/* Mesh Background */}
      <div className="mesh-bg" style={{ opacity: 0.5 }}></div>

      {/* Header */}
      <header className="global-header scrolled" style={{ position: 'sticky', top: 0 }}>
        <div className="header-left">
          <Link className="brand-logo" to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <img src="/logo.svg" alt="Lymit Logo" width={38} height={38} />
            <span style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-cyan)', fontSize: '28px', fontWeight: 'bold' }}>Lymit</span>
          </Link>
        </div>
        
        <nav className="nav-pill">
          <Link to="/">Home</Link>
          <Link to="/docs" className="active">Docs</Link>
        </nav>

        <div className="header-right">
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

      <div className="docs-container">
        {/* Sidebar */}
        <aside className="docs-sidebar">
          <div className="sidebar-title">Documentation</div>
          <a href="#introduction" onClick={(e) => scrollTo(e, 'introduction')} className={`sidebar-link ${activeSection === 'introduction' ? 'active' : ''}`}>Introduction</a>
          <a href="#problem" onClick={(e) => scrollTo(e, 'problem')} className={`sidebar-link ${activeSection === 'problem' ? 'active' : ''}`}>The Problem</a>
          <a href="#architecture" onClick={(e) => scrollTo(e, 'architecture')} className={`sidebar-link ${activeSection === 'architecture' ? 'active' : ''}`}>Architecture</a>
          <a href="#redis-contract" onClick={(e) => scrollTo(e, 'redis-contract')} className={`sidebar-link ${activeSection === 'redis-contract' ? 'active' : ''}`}>The Redis Contract</a>
          
          <div className="sidebar-title" style={{ marginTop: '24px' }}>Core Concepts</div>
          <a href="#algorithms" onClick={(e) => scrollTo(e, 'algorithms')} className={`sidebar-link ${activeSection === 'algorithms' ? 'active' : ''}`}>Algorithms</a>
          
          <div className="sidebar-title" style={{ marginTop: '24px' }}>Guides</div>
          <a href="#quick-start" onClick={(e) => scrollTo(e, 'quick-start')} className={`sidebar-link ${activeSection === 'quick-start' ? 'active' : ''}`}>Quick Start</a>
        </aside>

        {/* Main Content */}
        <main className="docs-content">
          <section id="introduction" className="docs-section">
            <h1>Lymit Documentation</h1>
            <p>
              <strong>Lymit</strong> is a high-performance, Redis-backed rate limiter you drop in front of any backend API. 
              Register a route pointing at your real backend, attach one or more policies to it, and traffic through 
              <code>/r/&#123;routeId&#125;</code> gets allowed or denied before it ever reaches your backend — the backend itself is never aware Lymit exists.
            </p>
            <div className="docs-callout">
              <p><strong>Note:</strong> Lymit evaluates policies atomically via Redis Lua scripts, meaning zero race conditions and sub-millisecond overhead.</p>
            </div>
          </section>

          <section id="problem" className="docs-section">
            <h2>The Problem</h2>
            <p>
              Traditionally, implementing rate limiting meant injecting SDKs into your backend code, setting up local caching layers, 
              or making synchronous database trips for every single API request. 
            </p>
            <ul>
              <li><strong>SDK Bloat:</strong> Tying your application logic to a specific rate-limiting library.</li>
              <li><strong>Latency:</strong> Checking limits against a database adds unacceptable delay to API responses.</li>
              <li><strong>Race Conditions:</strong> Concurrent requests often bypass limits if counters aren't updated atomically.</li>
              <li><strong>Decentralization:</strong> Hard to manage policies across different microservices dynamically.</li>
            </ul>
            <p>
              Lymit solves this by completely decoupling rate limiting from your application code. It acts as an intelligent, independent reverse proxy.
            </p>
          </section>

          <section id="architecture" className="docs-section">
            <h2>Architecture</h2>
            <p>
              Lymit is built on a decoupled architecture. The management dashboard and the proxy engine are completely separate, communicating only through <strong>Redis</strong>.
            </p>

            <div className="arch-graphic">
              <div className="arch-node">Lymit Dashboard (UI / Admin API)</div>
              <div className="arch-arrow">↓ writes config to ↓</div>
              <div className="arch-node highlight">Shared Redis Cluster</div>
              <div className="arch-arrow">↑ reads config continuously ↑</div>
              <div className="arch-node">Lymit Proxy Engine (Traffic)</div>
              <div className="arch-arrow">↓ forwards allowed requests to ↓</div>
              <div className="arch-node">Your Target Backend</div>
            </div>

            <p>
              Because the Proxy Engine never touches PostgreSQL or an Admin database, it scales infinitely. It reads configurations straight from Redis, evaluating live traffic effortlessly.
            </p>
          </section>

          <section id="redis-contract" className="docs-section">
            <h2>The Redis Contract</h2>
            <p>
              The proxy engine and the admin API communicate via a strict Redis key contract.
            </p>
            <div className="docs-code-block">
              <pre><code>
// Route configuration key (route:&#123;routeId&#125;)
&#123;
  "routeId": "11f29850-9bea-478c-8f99-2fb071a425d0",
  "customerId": "729de98e-9edf-...",
  "targetUrl": "https://api.example.com/v1",
  "active": true
&#125;
              </code></pre>
            </div>
            <p>
              Actual rate-limit counters live under a dynamic key pattern: <code>rl:&#123;routeId&#125;:&#123;policyId&#125;:&#123;scope&#125;:&#123;identifier&#125;</code>,
              written exclusively by the proxy's Lua scripts at request time to ensure atomic updates.
            </p>
          </section>

          <section id="algorithms" className="docs-section">
            <h2>Supported Algorithms</h2>
            <table className="docs-table">
              <thead>
                <tr>
                  <th>Algorithm</th>
                  <th>How it works</th>
                  <th>Tradeoff</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Fixed window</strong></td>
                  <td>A counter resets every N seconds.</td>
                  <td>Cheapest, but allows up to 2x the limit right at a window boundary.</td>
                </tr>
                <tr>
                  <td><strong>Sliding window</strong></td>
                  <td>A Redis sorted set tracks exact request timestamps.</td>
                  <td>Highly accurate, but costs one sorted-set entry per allowed request.</td>
                </tr>
                <tr>
                  <td><strong>Token bucket</strong></td>
                  <td>A bucket refills continuously; each request spends one token.</td>
                  <td>Lets short bursts through immediately, then throttles to a steady rate.</td>
                </tr>
                <tr>
                  <td><strong>Leaky bucket</strong></td>
                  <td>Fills by 1 per accepted request and drains continuously.</td>
                  <td>Smooths bursts into a steady outflow rather than letting them through at once.</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section id="quick-start" className="docs-section">
            <h2>Quick Start Guide</h2>
            <p>Protecting an API with Lymit takes seconds.</p>
            
            <h3>1. Create a Route</h3>
            <p>Register your target API in the Lymit Dashboard.</p>

            <h3>2. Attach a Policy</h3>
            <p>Choose an algorithm, scope, and limit. For example, a Token Bucket policy limiting an <code>API_KEY</code> scope to 100 requests per minute.</p>
            
            <div className="docs-code-block">
              <pre><code>
&#123;
  "scope": "API_KEY",
  "identifierSource": "HEADER",
  "identifierValue": "X-Api-Key",
  "algorithm": "TOKEN_BUCKET",
  "algorithmConfig": "&#123;\"limit\":100,\"windowSize\":1,\"windowUnit\":\"MINUTE\"&#125;"
&#125;
              </code></pre>
            </div>

            <h3>3. Proxy your traffic</h3>
            <p>Instead of hitting your backend directly, send the request to Lymit:</p>
            <div className="docs-code-block">
              <pre><code>
curl https://proxy.lymit.io/r/&#123;routeId&#125; \
  -H "X-Api-Key: abc1234"
              </code></pre>
            </div>
            <p>If the limit is exceeded, Lymit instantly returns a <code>429 Too Many Requests</code> with a <code>Retry-After</code> header.</p>
          </section>

        </main>
      </div>
    </div>
  );
}
