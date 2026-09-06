import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const RegisterEmployer = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    location: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3000/api/register/employer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (response.ok) {
        // Save user session details
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('role', data.role);
        showToast('Employer account created successfully!', 'success');
        navigate('/employer-dashboard');
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
      <div style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(212, 175, 55, 0.1) 0%, rgba(10, 10, 11, 0) 70%)', zIndex: 0 }} />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-panel"
        style={{ width: '100%', maxWidth: '480px', padding: '40px', zIndex: 1 }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="flex-center" style={{ width: '56px', height: '56px', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '16px', margin: '0 auto 16px', color: 'var(--accent-gold)' }}>
            <Briefcase size={28} />
          </div>
          <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Employer Registration</h2>
          <p style={{ color: 'var(--text-muted)' }}>Find the perfect professional for your home.</p>
        </div>

        <form onSubmit={handleSubmit}>
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
            <label className="input-label">Password</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="Create a strong password" 
              required 
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
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
          <div className="input-group" style={{ marginBottom: '32px' }}>
            <label className="input-label">Your Location</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="City, State or Zip Code" 
              required 
              value={formData.location}
              onChange={e => setFormData({...formData, location: e.target.value})}
            />
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-premium" 
            style={{ width: '100%', fontSize: '1.1rem' }}
            type="submit"
          >
            Create Employer Account
          </motion.button>

          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Already have an account? <span style={{ color: 'var(--accent-gold)', cursor: 'pointer' }} onClick={() => navigate('/login')}>Sign in</span>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default RegisterEmployer;
