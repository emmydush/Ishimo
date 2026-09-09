import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const Login = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (response.ok) {
        showToast('Signed in successfully!', 'success');

        if (data.role === 'admin') {
          localStorage.setItem('adminToken', data.token);
          navigate('/admin/dashboard');
        } else {
          localStorage.setItem('userId', data.userId);
          localStorage.setItem('role', data.role);
          
          if (data.role === 'employer') {
            navigate('/employer-dashboard');
          } else if (data.profileComplete) {
            navigate('/worker-dashboard');
          } else {
            navigate('/worker-onboarding');
          }
        }
      } else {
        showToast(data.error || 'Login failed', 'error');
      }
    } catch {
      showToast('Cannot connect to the server. Ensure backend is running.', 'error');
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '60%', height: '50%', background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, rgba(10, 10, 11, 0) 70%)', zIndex: 0 }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-panel"
        style={{ width: '100%', maxWidth: '480px', padding: '40px', zIndex: 1 }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="flex-center" style={{ width: '56px', height: '56px', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '16px', margin: '0 auto 16px', color: 'var(--accent-gold)' }}>
            <LogIn size={28} />
          </div>
          <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Welcome Back</h2>
          <p style={{ color: 'var(--text-muted)' }}>Sign in to your Ishimo account.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Email Address or Username</label>
            <input
              type="text"
              className="input-field"
              placeholder="you@example.com or admin"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="input-group" style={{ marginBottom: '12px' }}>
            <label className="input-label">Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="Enter your password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div style={{ textAlign: 'right', marginBottom: '24px' }}>
            <span
              style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', cursor: 'pointer' }}
              onClick={() => navigate('/forgot-password')}
            >
              Forgot password?
            </span>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-premium"
            style={{ width: '100%', fontSize: '1.1rem' }}
            type="submit"
          >
            Sign In
          </motion.button>

          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <span
              style={{ color: 'var(--accent-gold)', cursor: 'pointer' }}
              onClick={() => navigate('/')}
            >
              Go back home
            </span>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
