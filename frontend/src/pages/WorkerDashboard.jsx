import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { motion } from 'framer-motion';
import { Briefcase, Clock, Star, TrendingUp, CheckCircle, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

const WorkerDashboard = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'applications'
  const [applications, setApplications] = useState([]);

  const fetchDashboardData = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return navigate('/');

    try {
      const response = await fetch(`http://localhost:3000/api/worker/${userId}/dashboard`);
      const result = await response.json();
      if (response.ok) {
        setData(result);
      } else {
        showToast(result.error || 'Failed to load dashboard data', 'error');
      }
      
      const appRes = await fetch(`http://localhost:3000/api/worker/${userId}/applications`);
      if (appRes.ok) {
        const appData = await appRes.json();
        setApplications(appData);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const updateJobStatus = async (jobId, status) => {
    const workerId = localStorage.getItem('userId');
    try {
      const response = await fetch(`http://localhost:3000/api/jobs/${jobId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, workerId })
      });
      const result = await response.json();
      if (response.ok) {
        showToast(`Job request ${status} successfully!`, 'success');
        fetchDashboardData();
      } else {
        showToast(result.error || 'Failed to update status', 'error');
      }
    } catch (err) {
      showToast('Network error while updating status', 'error');
    }
  };

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar role="worker" />
        <div className="main-content flex-center">
          <p style={{ color: 'var(--text-muted)' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const workerName = data?.worker?.full_name || 'Worker';
  const isVerified = data?.worker?.status === 'completed';
  const profilePhotoUrl = data?.worker?.passport_photo_url;
  const jobs = data?.jobs || [];

  return (
    <div className="app-layout">
      <Sidebar role="worker" />
      
      <div className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {profilePhotoUrl ? (
                <img
                  src={profilePhotoUrl}
                  alt={workerName}
                  style={{ width: '88px', height: '88px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-emerald)' }}
                />
              ) : (
                <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', border: '3px solid var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={36} color="var(--accent-emerald)" />
                </div>
              )}
              {isVerified && (
                <div style={{ position: 'absolute', bottom: 2, right: 2, background: 'var(--accent-emerald)', borderRadius: '50%', padding: '4px', display: 'flex' }}>
                  <CheckCircle size={14} color="#fff" />
                </div>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <h1 style={{ fontSize: '2rem', lineHeight: 1.2 }}>{t('welcome_back')}, {workerName}</h1>
                {isVerified && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={14} /> {t('verified')} Professional
                  </div>
                )}
              </div>
              <p style={{ color: 'var(--text-muted)' }}>Here is an overview of your activity and requests.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-outline"
              onClick={() => navigate('/worker-find-jobs')}
            >
              {t('find_jobs_btn')}
            </motion.button>
            <button className="btn-premium" style={{ background: 'linear-gradient(135deg, var(--accent-emerald) 0%, #047857 100%)', color: '#fff' }}>
              {t('update_availability')}
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="responsive-grid-4" style={{ marginBottom: '40px' }}>
          {[
            { label: t('active_jobs'), value: jobs.filter(j => j.status === 'accepted').length, icon: <Briefcase size={24} color="var(--accent-emerald)" /> },
            { label: t('hours_logged'), value: '164', icon: <Clock size={24} color="var(--accent-gold)" /> },
            { label: t('average_rating'), value: '4.9', icon: <Star size={24} color="#f59e0b" /> },
            { label: t('profile_views'), value: '128', icon: <TrendingUp size={24} color="#3b82f6" /> },
          ].map((stat, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-panel" 
              style={{ padding: '24px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '12px' }}>
                  {stat.icon}
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '4px' }}>{stat.value}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--border-color)', marginBottom: '30px' }}>
          <button 
            onClick={() => setActiveTab('requests')}
            style={{ 
              padding: '10px 20px', 
              background: 'none', 
              border: 'none', 
              color: activeTab === 'requests' ? 'var(--accent-emerald)' : 'var(--text-muted)',
              borderBottom: activeTab === 'requests' ? '2px solid var(--accent-emerald)' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '1rem'
            }}
          >
            {t('direct_requests')}
          </button>
          <button 
            onClick={() => setActiveTab('applications')}
            style={{ 
              padding: '10px 20px', 
              background: 'none', 
              border: 'none', 
              color: activeTab === 'applications' ? 'var(--accent-emerald)' : 'var(--text-muted)',
              borderBottom: activeTab === 'applications' ? '2px solid var(--accent-emerald)' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '1rem'
            }}
          >
            {t('my_applications')}
          </button>
        </div>

        {activeTab === 'requests' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>{t('direct_requests')}</h2>
            {jobs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>{t('no_requests')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {jobs.map((job, idx) => (
                  <motion.div 
                    key={job.job_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + (idx * 0.1) }}
                    className="glass-panel"
                    style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: job.status === 'declined' ? 0.5 : 1 }}
                  >
                    <div>
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>Job Request #{job.job_id}</h3>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', gap: '16px' }}>
                        <span>Contact: {job.employer_email}</span>
                        <span>•</span>
                        <span>Location: {job.employer_location}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {new Date(job.created_at).toLocaleDateString()}
                      </div>
                      {job.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-outline" style={{ padding: '8px 16px' }} onClick={() => updateJobStatus(job.job_id, 'declined')}>Decline</button>
                          <button className="btn-premium" style={{ padding: '8px 16px', background: 'linear-gradient(135deg, var(--accent-emerald) 0%, #047857 100%)', color: '#fff' }} onClick={() => updateJobStatus(job.job_id, 'accepted')}>Accept</button>
                        </div>
                      ) : (
                        <div style={{ padding: '8px 16px', background: job.status === 'accepted' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: job.status === 'accepted' ? 'var(--accent-emerald)' : '#ef4444', borderRadius: '8px', fontWeight: 500, textTransform: 'capitalize' }}>
                          {job.status}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'applications' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>{t('my_applications')}</h2>
            {applications.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>{t('no_applications')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {applications.map((app, idx) => (
                  <motion.div 
                    key={app.application_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + (idx * 0.1) }}
                    className="glass-panel"
                    style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '4px', color: 'var(--text-primary)' }}>{app.job_title}</h3>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', gap: '16px' }}>
                        <span>Location: {app.job_location}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {new Date(app.created_at).toLocaleDateString()}
                      </div>
                      <div style={{ padding: '8px 16px', background: 'var(--bg-card)', color: 'var(--text-primary)', borderRadius: '8px', fontWeight: 500, border: '1px solid var(--border-color)', textTransform: 'capitalize' }}>
                        {app.status}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default WorkerDashboard;
