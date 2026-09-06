import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Briefcase } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const WorkerProfile = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    location: '',
    skills: '',
    experience: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const userId = localStorage.getItem('userId');
      if (!userId) return navigate('/');

      try {
        const response = await fetch(`http://localhost:3000/api/worker/${userId}/profile`);
        if (response.ok) {
          const data = await response.json();
          setProfile({
            full_name: data.full_name || '',
            phone: data.phone || '',
            location: data.location || '',
            skills: data.skills || '',
            experience: data.experience || ''
          });
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
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
      const response = await fetch(`http://localhost:3000/api/worker/${userId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      if (response.ok) {
        showToast('Profile updated successfully!', 'success');
      } else {
        const data = await response.json();
        showToast(data.error || 'Update failed', 'error');
      }
    } catch (err) {
      showToast('Network error while updating profile', 'error');
    }
  };

  if (loading) return <div className="app-layout"><Sidebar role="worker" /><div className="main-content flex-center">Loading...</div></div>;

  return (
    <div className="app-layout">
      <Sidebar role="worker" />
      <div className="main-content">
        <header style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <User size={36} color="var(--accent-emerald)" /> My Profile
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your professional details and public presentation.</p>
        </header>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ padding: '40px', maxWidth: '800px' }}>
          <form onSubmit={handleUpdate}>
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input type="text" className="input-field" value={profile.full_name} onChange={e => setProfile({...profile, full_name: e.target.value})} required />
            </div>
            
            <div className="input-group">
              <label className="input-label">Phone Number</label>
              <input type="tel" className="input-field" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} required />
            </div>

            <div className="input-group">
              <label className="input-label">Location</label>
              <input type="text" className="input-field" placeholder="City, State or District" value={profile.location} onChange={e => setProfile({...profile, location: e.target.value})} />
            </div>

            <h3 style={{ marginTop: '32px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Briefcase size={20} color="var(--accent-gold)" /> Professional Details</h3>
            
            <div className="input-group">
              <label className="input-label">Skills (Comma separated)</label>
              <input type="text" className="input-field" value={profile.skills} onChange={e => setProfile({...profile, skills: e.target.value})} />
            </div>

            <div className="input-group">
              <label className="input-label">Years of Experience</label>
              <input type="number" className="input-field" value={profile.experience} onChange={e => setProfile({...profile, experience: e.target.value})} />
            </div>

            <div style={{ marginTop: '40px' }}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-premium" style={{ background: 'linear-gradient(135deg, var(--accent-emerald) 0%, #047857 100%)', color: '#fff' }} type="submit">
                Save Profile Changes
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default WorkerProfile;
