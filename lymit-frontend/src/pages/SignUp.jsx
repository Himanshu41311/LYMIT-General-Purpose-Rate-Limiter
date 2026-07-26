import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, AlertCircle, User, Mail, Lock } from 'lucide-react';
import '../styles/auth.css';

export default function SignUp() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await signUp({ name, email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page flex-center full-height">
      <div className="auth-split-wrapper reverse page-enter">
        
        <div className="auth-split-visual">
          <div className="auth-mesh-bg" style={{ top: '-10%', left: '-10%', width: '120%', height: '120%' }}></div>
          
          <Link className="brand-logo" to="/" style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <img src="/logo.svg" alt="Lymit Logo" width={38} height={38} />
            <span style={{ fontFamily: 'cursive', color: '#1FACA9', fontSize: '28px', fontWeight: 'bold' }}>Lymit</span>
          </Link>

          <div className="visual-content">
            <h1>Create your<br/>workspace</h1>
            <p>Join thousands scaling their API securely with Lymit.</p>
          </div>
          
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: '8px', opacity: 0.5 }}>
            <div className="chart-bar glow" style={{ width: '4px', height: '24px', background: '#1FACA9', borderRadius: '4px' }}></div>
            <div className="chart-bar" style={{ width: '4px', height: '16px', background: '#fff', borderRadius: '4px' }}></div>
            <div className="chart-bar" style={{ width: '4px', height: '32px', background: '#fff', borderRadius: '4px' }}></div>
          </div>
        </div>

        <div className="auth-split-form-container">
          <div className="auth-form-wrapper">
            <div className="auth-header text-center">
              <h2>Create an account</h2>
              <p>Start limiting your API traffic in minutes</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {error && (
                <div className="alert-danger">
                  <AlertCircle size={18} /> {error}
                </div>
              )}
              
              <div className="field">
                <label className="label">Full Name</label>
                <div className="input-group">
                  <User className="input-icon" size={18} />
                  <input 
                    type="text" 
                    className="input-field with-icon" 
                    required 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="field">
                <label className="label">Email address</label>
                <div className="input-group">
                  <Mail className="input-icon" size={18} />
                  <input 
                    type="email" 
                    className="input-field with-icon" 
                    required 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              
              <div className="field">
                <label className="label">Password</label>
                <div className="input-group">
                  <Lock className="input-icon" size={18} />
                  <input 
                    type="password" 
                    className="input-field with-icon" 
                    required 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    minLength={6}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block auth-submit" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'} <ArrowRight size={16} />
              </button>
            </form>

            <div className="auth-footer text-center">
              <p>Already have an account? <Link to="/signin" className="auth-link">Sign in</Link></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
