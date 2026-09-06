import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { motion } from 'framer-motion';
import { Settings, Shield, Bell } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const EmployerSettings = () => {
  const { showToast } = useToast();
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      return showToast("New passwords don't match", 'error');
    }
    const userId = localStorage.getItem('userId');
    try {
      const res = await fetch(`http://localhost:3000/api/employer/${userId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.new })
      });
      if (res.ok) {
        showToast('Password updated successfully!', 'success');
        setPasswords({ current: '', new: '', confirm: '' });
      } else {
        const data = await res.json();
        showToast(data.error || 'Update failed', 'error');
      }
    } catch (err) {
      showToast('Network error while updating password', 'error');
    }
  };

  return (
    <div className="app-layout">
      <Sidebar role="employer" />
      <div className="main-content">
        <header style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Settings size={36} color="var(--accent-gold)" /> Account Settings
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your security and notification preferences.</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-panel" style={{ padding: '32px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <Shield size={20} color="var(--accent-gold)" /> Security
            </h3>
            <form onSubmit={handlePasswordChange}>
              <div className="input-group">
                <label className="input-label">Current Password</label>
                <input type="password" className="input-field" required value={passwords.current} onChange={e => setPasswords({ ...passwords, current: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">New Password</label>
                <input type="password" className="input-field" required minLength={8} value={passwords.new} onChange={e => setPasswords({ ...passwords, new: e.target.value })} />
              </div>
              <div className="input-group" style={{ marginBottom: '24px' }}>
                <label className="input-label">Confirm New Password</label>
                <input type="password" className="input-field" required minLength={8} value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} />
              </div>
              <button className="btn-outline" type="submit" style={{ width: '100%' }}>Update Password</button>
            </form>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="glass-panel" style={{ padding: '32px', height: 'fit-content' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <Bell size={20} color="var(--accent-gold)" /> Notifications
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontWeight: 500 }}>Email Alerts</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Receive emails when a worker accepts your request</div>
              </div>
              <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px', accentColor: 'var(--accent-gold)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
              <div>
                <div style={{ fontWeight: 500 }}>SMS Alerts</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Get text messages for urgent updates</div>
              </div>
              <input type="checkbox" style={{ width: '20px', height: '20px', accentColor: 'var(--accent-gold)' }} />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default EmployerSettings;
