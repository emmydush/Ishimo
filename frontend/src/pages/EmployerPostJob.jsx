import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { ArrowLeft, Briefcase, MapPin, DollarSign, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '../context/ToastContext';

export default function EmployerPostJob() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    salaryRange: ''
  });

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const role = localStorage.getItem('role');
    if (!userId || role !== 'employer') {
      setError('Please log in as an employer to post a job.');
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const employerId = localStorage.getItem('userId');
    const role = localStorage.getItem('role');

    if (!employerId || role !== 'employer') {
      setError('Please log in as an employer first.');
      return;
    }

    if (!formData.title.trim()) {
      setError('Job Title is required.');
      return;
    }
    if (!formData.description.trim()) {
      setError('Job Description is required.');
      return;
    }
    if (!formData.location.trim()) {
      setError('Location is required.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('http://localhost:3000/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employerId,
          title: formData.title.trim(),
          description: formData.description.trim(),
          location: formData.location.trim(),
          salaryRange: formData.salaryRange.trim()
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('Job posted successfully!');
        showToast('Job posted successfully! Workers can now see your listing.', 'success');
        setTimeout(() => {
          navigate('/employer-dashboard', { state: { activeTab: 'jobs', newlyPosted: true } });
        }, 1400);
      } else {
        throw new Error(data.error || 'Failed to post job');
      }
    } catch (err) {
      const msg = err.message || 'Cannot connect to server. Ensure the backend is running.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar role="employer" />

      <div className="main-content">
        <header style={{ marginBottom: '32px' }}>
          <motion.button
            whileHover={{ x: -4 }}
            onClick={() => navigate('/employer-dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--text-muted)',
              marginBottom: '16px',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              fontSize: '0.95rem'
            }}
          >
            <ArrowLeft size={18} /> Back to Dashboard
          </motion.button>
          
          <h1 style={{ fontSize: '2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Briefcase size={28} color="var(--accent-gold)" /> Post a New Job
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Find the perfect verified worker for your household or business.</p>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel"
          style={{ padding: '40px', maxWidth: '720px' }}
        >
          {error && (
            <div style={{
              padding: '14px 18px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              borderRadius: '10px',
              marginBottom: '24px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div style={{
              padding: '14px 18px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: 'var(--accent-emerald)',
              borderRadius: '10px',
              marginBottom: '24px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <CheckCircle size={20} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Briefcase size={15} color="var(--accent-gold)" /> Job Title <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g. Full-time Nanny, Housekeeper, Caregiver"
              />
            </div>

            <div className="input-group">
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={15} color="var(--accent-gold)" /> Job Description <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                name="description"
                required
                rows="5"
                value={formData.description}
                onChange={handleChange}
                className="input-field"
                style={{ resize: 'vertical' }}
                placeholder="Describe responsibilities, working hours, and requirements..."
              />
            </div>

            <div className="input-group">
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={15} color="var(--accent-gold)" /> Location <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="location"
                required
                value={formData.location}
                onChange={handleChange}
                className="input-field"
                placeholder="City, Neighborhood (e.g. Kigali, Nyarutarama)"
              />
            </div>

            <div className="input-group" style={{ marginBottom: '32px' }}>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <DollarSign size={15} color="var(--accent-gold)" /> Salary Range (Optional)
              </label>
              <input
                type="text"
                name="salaryRange"
                value={formData.salaryRange}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g. 150,000 RWF / month or Negotiable"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-premium"
              style={{ width: '100%', padding: '14px', fontSize: '1.05rem' }}
              type="submit"
              disabled={loading || !!success}
            >
              {loading ? 'Posting Job...' : success ? 'Job Posted!' : 'Post Job Now'}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
