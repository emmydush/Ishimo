import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      showToast('Please enter your email address', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (response.ok) {
        setSubmitted(true);
        showToast(data.message, 'success');
        
        // For development, show the token
        if (data.token) {
          console.log('Reset token:', data.token);
          console.log('Reset link:', `http://localhost:5173/reset-password?token=${data.token}`);
        }
      } else {
        showToast(data.error || 'Failed to send reset link', 'error');
      }
    } catch {
      showToast('Cannot connect to the server', 'error');
    } finally {
      setLoading(false);
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
            <Mail size={28} />
          </div>
          <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Forgot Password?</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            {submitted 
              ? 'Check your email for the reset link'
              : 'Enter your email address and we\'ll send you a link to reset your password'
            }
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit}>
            <div className="input-group" style={{ marginBottom: '24px' }}>
              <label className="input-label">Email Address</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              {loading ? 'Sending...' : 'Send Reset Link'}
            </motion.button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-outline"
              style={{ width: '100%', fontSize: '1.1rem' }}
              onClick={() => navigate('/login')}
            >
              Back to Login
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
