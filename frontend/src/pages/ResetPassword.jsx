import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { API_BASE_URL } from '../config/api';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(!!token);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      showToast('Invalid reset link', 'error');
    }
  }, [token, showToast]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      showToast('Invalid reset link', 'error');
      return;
    }

    if (formData.newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('${API_BASE_URL}/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: formData.newPassword }),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess(true);
        showToast(data.message, 'success');
      } else {
        showToast(data.error || 'Failed to reset password', 'error');
      }
    } catch {
      showToast('Cannot connect to the server', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '60%', height: '50%', background: 'radial-gradient(circle, rgba(239, 68, 68, 0.08) 0%, rgba(10, 10, 11, 0) 70%)', zIndex: 0 }} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="glass-panel"
          style={{ width: '100%', maxWidth: '480px', padding: '40px', zIndex: 1, textAlign: 'center' }}
        >
          <div className="flex-center" style={{ width: '64px', height: '64px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', margin: '0 auto 24px', color: '#ef4444' }}>
            <XCircle size={32} />
          </div>
          <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>Invalid Reset Link</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-outline"
            style={{ width: '100%', fontSize: '1.1rem' }}
            onClick={() => navigate('/forgot-password')}
          >
            Request New Link
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '60%', height: '50%', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, rgba(10, 10, 11, 0) 70%)', zIndex: 0 }} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="glass-panel"
          style={{ width: '100%', maxWidth: '480px', padding: '40px', zIndex: 1, textAlign: 'center' }}
        >
          <div className="flex-center" style={{ width: '64px', height: '64px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', margin: '0 auto 24px', color: 'var(--accent-emerald)' }}>
            <CheckCircle size={32} />
          </div>
          <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>Password Reset Successful</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
            Your password has been successfully reset. You can now log in with your new password.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-premium"
            style={{ width: '100%', fontSize: '1.1rem' }}
            onClick={() => navigate('/login')}
          >
            Go to Login
          </motion.button>
        </motion.div>
      </div>
    );
  }

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
        <div style={{ marginBottom: '24px' }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/login')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', fontSize: '0.9rem' }}
          >
            <ArrowLeft size={16} /> Back to Login
          </motion.button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="flex-center" style={{ width: '56px', height: '56px', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '16px', margin: '0 auto 16px', color: 'var(--accent-gold)' }}>
            <Lock size={28} />
          </div>
          <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Reset Password</h2>
          <p style={{ color: 'var(--text-muted)' }}>Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group" style={{ marginBottom: '20px' }}>
            <label className="input-label">New Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="Enter new password (min 8 characters)"
              required
              minLength={8}
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="input-group" style={{ marginBottom: '32px' }}>
            <label className="input-label">Confirm New Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="Confirm new password"
              required
              minLength={8}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              disabled={loading}
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-premium"
            style={{ width: '100%', fontSize: '1.1rem' }}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
