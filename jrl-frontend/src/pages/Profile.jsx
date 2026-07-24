import React, { useState } from 'react';
import { AppLayout } from '../components/AppLayout';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from '../lib/api';
import { User, LogOut, Check } from 'lucide-react';

export default function Profile() {
  const { user, signOut, setUser } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');
    setError('');
    
    try {
      const updatedUser = await updateProfile({ name });
      setUser(updatedUser);
      setMessage('Profile updated successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout 
      title="Profile" 
      subtitle="Manage your personal settings"
    >
      <div className="card glass-panel" style={{ maxWidth: '480px', padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <div className="avatar-dot" style={{ width: '64px', height: '64px', fontSize: '24px' }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize: '20px', margin: 0 }}>{user?.name}</h2>
            <p style={{ color: 'var(--text-secondary)' }}>{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSave}>
          {message && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: '6px', marginBottom: '24px' }}>
              <Check size={16} /> {message}
            </div>
          )}
          {error && (
            <div className="alert-danger" style={{ marginBottom: '24px', padding: '12px' }}>
              {error}
            </div>
          )}

          <div className="field">
            <label className="label">Name</label>
            <input 
              type="text" 
              className="input-field" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
            />
          </div>
          <div className="field">
            <label className="label">Email address</label>
            <input 
              type="email" 
              className="input-field" 
              value={user?.email || ''} 
              disabled 
            />
            <p className="hint">Email cannot be changed.</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-light)' }}>
            <button type="button" className="btn btn-ghost" onClick={signOut}>
              <LogOut size={16} /> Sign out
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving || name === user?.name}>
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
