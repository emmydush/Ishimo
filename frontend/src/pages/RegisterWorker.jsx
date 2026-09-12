import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { UserCheck } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const RegisterWorker = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    location: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleaned = {
      fullName: formData.fullName.trim(),
      email:    formData.email.trim().toLowerCase(),
      password: formData.password,
      phone:    formData.phone.trim(),
      location: formData.location.trim(),
    };
    if (!cleaned.fullName) return showToast('Full name is required.', 'error');
    if (!cleaned.email)    return showToast('Email is required.', 'error');
    if (cleaned.password.length < 8) return showToast('Password must be at least 8 characters.', 'error');
    if (!cleaned.phone)    return showToast('Phone number is required.', 'error');
    try {
      const response = await fetch('http://localhost:3000/api/register/worker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleaned)
      });
      
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('role', data.role);
        showToast('Worker account registered! Please complete your profile.', 'success');
        navigate('/worker-onboarding');
      } else {
        showToast(data.error || 'Registration failed', 'error');
      }
    } catch (err) {
      showToast('Network error connecting to server', 'error');
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', position: 'relative' }}>
      
      {/* Background elements */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, rgba(10, 10, 11, 0) 70%)', zIndex: 0 }} />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-panel"
        style={{ width: '100%', maxWidth: '480px', padding: '40px', zIndex: 1 }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="flex-center" style={{ width: '56px', height: '56px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '16px', margin: '0 auto 16px', color: 'var(--accent-emerald)' }}>
            <UserCheck size={28} />
          </div>
          <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Worker Registration</h2>
          <p style={{ color: 'var(--text-muted)' }}>Join the elite network of household professionals.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="John Doe" 
              required 
              value={formData.fullName}
              onChange={e => setFormData({...formData, fullName: e.target.value})}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input 
              type="email" 
              className="input-field" 
              placeholder="you@example.com" 
              required 
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Phone Number</label>
            <input 
              type="tel" 
              className="input-field" 
              placeholder="+1 (555) 000-0000" 
              required 
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Your Location</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="City, State or District" 
              required 
              value={formData.location}
              onChange={e => setFormData({...formData, location: e.target.value})}
            />
          </div>
          <div className="input-group" style={{ marginBottom: '32px' }}>
            <label className="input-label">Strong Password</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="Must be at least 8 characters" 
              required 
              minLength={8}
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-premium" 
            style={{ width: '100%', fontSize: '1.1rem', background: 'linear-gradient(135deg, var(--accent-emerald) 0%, #047857 100%)', color: '#fff' }}
            type="submit"
          >
            Create Worker Account
          </motion.button>

          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Already have an account? <span style={{ color: 'var(--accent-emerald)', cursor: 'pointer' }} onClick={() => navigate('/login')}>Sign in</span>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default RegisterWorker;
