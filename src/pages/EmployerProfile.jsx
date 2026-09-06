import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, MapPin } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const EmployerProfile = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ phone: '', location: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      const userId = localStorage.getItem('userId');
      if (!userId) return navigate('/');
      try {
        const res = await fetch(`http://localhost:3000/api/employer/${userId}/profile`);
        if (res.ok) {
          const data = await res.json();
          setProfile({ phone: data.phone || '', location: data.location || '' });
        }
      } catch (err) {
        console.error('Error fetching employer profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    const userId = localStorage.getItem('userId');
    try {
      const res = await fetch(`http://localhost:3000/api/employer/${userId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      if (res.ok) {
        showToast('Profile updated successfully!', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'Update failed', 'error');
      }
    } catch (err) {
      showToast('Network error while updating profile', 'error');
    }
  };

  if (loading) return <div className="app-layout"><Sidebar role="employer" /><div className="main-content flex-center" style={{ color: 'var(--text-muted)' }}>Loading...</div></div>;

  return (
    <div className="app-layout">
      <Sidebar role="employer" />
      <div className="main-content">
        <header style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <User size={36} color="var(--accent-gold)" /> My Profile
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your account details and location.</p>
        </header>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ padding: '40px', maxWidth: '800px' }}>
          <form onSubmit={handleUpdate}>
            <div className="input-group">
              <label className="input-label">Phone Number</label>
              <input
                type="tel"
                className="input-field"
                value={profile.phone}
                onChange={e => setProfile({ ...profile, phone: e.target.value })}
                required
              />
            </div>
            <div className="input-group" style={{ marginBottom: '32px' }}>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} color="var(--accent-gold)" /> Location
              </label>
              <input
                type="text"
                className="input-field"
                value={profile.location}
                onChange={e => setProfile({ ...profile, location: e.target.value })}
                required
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-premium"
              type="submit"
            >
              Save Profile Changes
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default EmployerProfile;
