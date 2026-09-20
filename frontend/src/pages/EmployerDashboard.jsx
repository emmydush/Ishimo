import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Search, Filter, MapPin, Star, ShieldCheck, CheckCircle, X, Phone, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL } from '../config/api';

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'workers'); // 'workers' or 'jobs'
  const [showBanner, setShowBanner] = useState(!!location.state?.newlyPosted);
  const [myJobs, setMyJobs] = useState([]);
  const [jobApplications, setJobApplications] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingWorker, setRatingWorker] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
    if (location.state?.newlyPosted) {
      setShowBanner(true);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const response = await fetch('${API_BASE_URL}/api/workers');
        const data = await response.json();
        setWorkers(data);
      } catch (err) {
        console.error('Error fetching workers:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchMyJobs = async () => {
      const employerId = localStorage.getItem('userId');
      if (!employerId) return;
      try {
        const resJobs = await fetch(`${API_BASE_URL}/api/employer/${employerId}/jobs`);
        const dataJobs = await resJobs.json();
        setMyJobs(dataJobs);

        const resApps = await fetch(`${API_BASE_URL}/api/employer/${employerId}/applications`);
        const dataApps = await resApps.json();
        setJobApplications(dataApps);
      } catch (err) {
        console.error('Error fetching jobs:', err);
      }
    };

    fetchWorkers();
    fetchMyJobs();
  }, []);

  const handleRequestWorker = async (workerId) => {
    const employerId = localStorage.getItem('userId');
    if (!employerId) return showToast('You must be logged in as an employer.', 'error');

    try {
      const response = await fetch('${API_BASE_URL}/api/jobs/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employerId, workerId })
      });
      const data = await response.json();
      if (response.ok) {
        showToast('Job request sent successfully!', 'success');
      } else {
        showToast(data.error || 'Failed to send request', 'error');
      }
    } catch (err) {
      showToast('Network error while sending request', 'error');
    }
  };

  const handleUpdateApplicationStatus = async (applicationId, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/applications/${applicationId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (response.ok) {
        showToast(`Application ${status} successfully!`, 'success');
        // Refresh applications
        const employerId = localStorage.getItem('userId');
        const resApps = await fetch(`${API_BASE_URL}/api/employer/${employerId}/applications`);
        const dataApps = await resApps.json();
        setJobApplications(dataApps);
      } else {
        showToast(data.error || 'Failed to update status', 'error');
      }
    } catch (err) {
      showToast('Network error while updating status', 'error');
    }
  };

  const handleRateWorker = async () => {
    if (!ratingWorker || ratingValue === 0) {
      showToast('Please select a rating', 'error');
      return;
    }

    const employerId = localStorage.getItem('userId');
    if (!employerId) return showToast('You must be logged in', 'error');

    try {
      const response = await fetch(`${API_BASE_URL}/api/worker/${ratingWorker.worker_id}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employerId: parseInt(employerId),
          rating: ratingValue,
          comment: ratingComment
        })
      });
      const data = await response.json();
      if (response.ok) {
        showToast(data.message || 'Rating submitted successfully!', 'success');
        setShowRatingModal(false);
        setRatingValue(0);
        setRatingComment('');
        setRatingWorker(null);
        // Refresh workers to update ratings
        const resWorkers = await fetch('${API_BASE_URL}/api/workers');
        const dataWorkers = await resWorkers.json();
        setWorkers(dataWorkers);
      } else {
        showToast(data.error || 'Failed to submit rating', 'error');
      }
    } catch (err) {
      showToast('Network error while submitting rating', 'error');
    }
  };

  const filteredWorkers = workers.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    w.skills.join(' ').toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="app-layout">
      <Sidebar role="employer" />
      
      <div className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '6px' }}>Employer Dashboard</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Find elite talent or post a job to let them find you.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-premium"
            onClick={() => navigate('/employer-post-job')}
          >
            {t('post_job')}
          </motion.button>
        </header>

        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '16px 20px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: 'var(--accent-emerald)',
              borderRadius: '12px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              fontWeight: 500
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={20} />
              <span>Your job posting has been published successfully and is now live for workers!</span>
            </div>
            <button
              onClick={() => setShowBanner(false)}
              style={{ background: 'none', border: 'none', color: 'var(--accent-emerald)', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}
            >
              ✕
            </button>
          </motion.div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--border-color)', marginBottom: '30px' }}>
          <button 
            onClick={() => setActiveTab('workers')}
            style={{ 
              padding: '10px 20px', 
              background: 'none', 
              border: 'none', 
              color: activeTab === 'workers' ? 'var(--accent-gold)' : 'var(--text-muted)',
              borderBottom: activeTab === 'workers' ? '2px solid var(--accent-gold)' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '1rem'
            }}
          >
            {t('find_professionals')}
          </button>
          <button 
            onClick={() => setActiveTab('jobs')}
            style={{ 
              padding: '10px 20px', 
              background: 'none', 
              border: 'none', 
              color: activeTab === 'jobs' ? 'var(--accent-gold)' : 'var(--text-muted)',
              borderBottom: activeTab === 'jobs' ? '2px solid var(--accent-gold)' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '1rem'
            }}
          >
            {t('my_job_postings')}
          </button>
        </div>

        {activeTab === 'workers' && (
          <>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder={t('search_roles')}
                  style={{ paddingLeft: '44px', width: '100%' }}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                <Filter size={18} />
                {t('filter')}
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>{t('loading')}</div>
            ) : filteredWorkers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>{t('no_workers')}</div>
            ) : (
              <div className="grid-cards">
                {filteredWorkers.map((worker, idx) => (
                  <motion.div 
                    key={worker.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="worker-card"
                  >
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                      <div style={{ position: 'relative' }}>
                        <img 
                          src={worker.image} 
                          alt={worker.name} 
                          style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-gold)', cursor: 'pointer' }}
                          onClick={() => setSelectedImage(worker.image)}
                        />
                        {worker.availability === 'available' && (
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0.8 }}
                            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            style={{
                              position: 'absolute',
                              bottom: '4px',
                              right: '4px',
                              width: '16px',
                              height: '16px',
                              backgroundColor: '#10b981',
                              borderRadius: '50%',
                              border: '2px solid white',
                              boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)'
                            }}
                          />
                        )}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {worker.name}
                          {worker.verified && <ShieldCheck size={18} color="var(--accent-gold)" />}
                        </h3>
                        <div style={{ color: 'var(--accent-gold)', fontWeight: 500, fontSize: '0.9rem', marginBottom: '4px' }}>{worker.role}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={14} /> {worker.location}
                        </div>
                        <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: 500,
                            background: worker.availability === 'available' ? 'rgba(16, 185, 129, 0.15)' : 
                                       worker.availability === 'busy' ? 'rgba(245, 158, 11, 0.15)' : 
                                       worker.availability === 'unavailable' ? 'rgba(107, 114, 128, 0.15)' :
                                       'rgba(59, 130, 246, 0.15)',
                            color: worker.availability === 'available' ? '#10b981' : 
                                   worker.availability === 'busy' ? '#f59e0b' : 
                                   worker.availability === 'unavailable' ? '#6b7280' :
                                   '#3b82f6'
                          }}>
                            {worker.availability || 'Unknown'}
                          </span>
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: 500,
                            background: worker.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 
                                       worker.status === 'pending' ? 'rgba(168, 85, 247, 0.15)' : 
                                       worker.status === 'suspended' ? 'rgba(239, 68, 68, 0.15)' : 
                                       worker.status === 'active' ? 'rgba(34, 197, 94, 0.15)' :
                                       'rgba(107, 114, 128, 0.15)',
                            color: worker.status === 'completed' ? '#10b981' : 
                                   worker.status === 'pending' ? '#a855f7' : 
                                   worker.status === 'suspended' ? '#ef4444' : 
                                   worker.status === 'active' ? '#22c55e' :
                                   '#6b7280'
                          }}>
                            {worker.status || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Experience</div>
                        <div style={{ fontWeight: 600 }}>{worker.exp}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rating</div>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Star size={14} color={worker.rating > 0 ? 'var(--accent-gold)' : 'var(--text-muted)'} fill={worker.rating > 0 ? 'var(--accent-gold)' : 'none'} />
                          {worker.rating > 0 ? worker.rating : 'N/A'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Views</div>
                        <div style={{ fontWeight: 600 }}>{worker.profile_views || 0}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                      {worker.skills.map(skill => (
                        <span key={skill} style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* Contact Icons */}
                    {worker.phone && (
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                        <motion.a
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          href={`tel:${worker.phone}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            background: 'rgba(34, 197, 94, 0.1)',
                            color: '#22c55e',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            border: '1px solid rgba(34, 197, 94, 0.3)'
                          }}
                        >
                          <Phone size={16} />
                          Call
                        </motion.a>
                        <motion.a
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          href={`https://wa.me/${worker.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            background: 'rgba(37, 211, 102, 0.1)',
                            color: '#25D366',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            border: '1px solid rgba(37, 211, 102, 0.3)'
                          }}
                        >
                          <MessageCircle size={16} />
                          WhatsApp
                        </motion.a>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn-outline"
                        style={{ flex: 1, padding: '11px' }}
                        onClick={() => navigate(`/worker/${worker.id}`)}
                      >
                        {t('view_profile')}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn-premium"
                        style={{ flex: 1, padding: '11px' }}
                        onClick={() => handleRequestWorker(worker.id)}
                      >
                        {t('request')}
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'jobs' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>My Posted Jobs</h2>
            {myJobs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                You haven't posted any jobs yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {myJobs.map(job => (
                  <div key={job.id} style={{ background: 'var(--bg-elevated)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', marginBottom: '4px' }}>{job.title}</h3>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', gap: '16px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {job.location}</span>
                          <span>Salary: {job.salary_range || 'Not specified'}</span>
                        </div>
                      </div>
                      <span style={{ padding: '4px 12px', background: 'var(--accent-gold)', color: '#000', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {job.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.95rem' }}>
                      {job.description}
                    </p>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                      <h4 style={{ fontSize: '1rem', marginBottom: '12px' }}>Applications</h4>
                      {jobApplications.filter(app => app.job_title === job.title).length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No applications yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {jobApplications.filter(app => app.job_title === job.title).map(app => (
                            <div key={app.application_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                              <div>
                                <div style={{ fontWeight: 600 }}>{app.worker_name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status: {app.status}</div>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {app.status === 'pending' ? (
                                  <>
                                    <motion.button
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={() => handleUpdateApplicationStatus(app.application_id, 'rejected')}
                                      className="btn-outline"
                                      style={{ padding: '6px 12px', fontSize: '0.8rem', borderColor: '#ef4444', color: '#ef4444' }}
                                    >
                                      Reject
                                    </motion.button>
                                    <motion.button
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={() => handleUpdateApplicationStatus(app.application_id, 'hired')}
                                      className="btn-premium"
                                      style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'linear-gradient(135deg, var(--accent-gold) 0%, #b8860b 100%)', color: '#000' }}
                                    >
                                      Hire
                                    </motion.button>
                                  </>
                                ) : (
                                  <>
                                    <span style={{ padding: '4px 12px', background: (app.status === 'accepted' || app.status === 'hired') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: (app.status === 'accepted' || app.status === 'hired') ? 'var(--accent-emerald)' : '#ef4444', borderRadius: '8px', fontWeight: 500, fontSize: '0.85rem', textTransform: 'capitalize' }}>
                                      {app.status}
                                    </span>
                                    {(app.status === 'accepted' || app.status === 'hired') && (
                                      <>
                                        <motion.button
                                          whileHover={{ scale: 1.02 }}
                                          whileTap={{ scale: 0.98 }}
                                          onClick={() => {
                                            setRatingWorker(app);
                                            setShowRatingModal(true);
                                          }}
                                          className="btn-outline"
                                          style={{ padding: '6px 12px', fontSize: '0.8rem', marginLeft: '8px' }}
                                        >
                                          Rate
                                        </motion.button>
                                        <motion.button
                                          whileHover={{ scale: 1.02 }}
                                          whileTap={{ scale: 0.98 }}
                                          onClick={() => handleUpdateApplicationStatus(app.application_id, 'fired')}
                                          className="btn-outline"
                                          style={{ padding: '6px 12px', fontSize: '0.8rem', borderColor: '#ef4444', color: '#ef4444', marginLeft: '8px' }}
                                        >
                                          Fire
                                        </motion.button>
                                        <motion.button
                                          whileHover={{ scale: 1.02 }}
                                          whileTap={{ scale: 0.98 }}
                                          onClick={() => handleUpdateApplicationStatus(app.application_id, 'left')}
                                          className="btn-outline"
                                          style={{ padding: '6px 12px', fontSize: '0.8rem', marginLeft: '8px' }}
                                        >
                                          Left
                                        </motion.button>
                                      </>
                                    )}
                                  </>
                                )}
                                <button
                                  onClick={() => navigate(`/worker/${app.worker_id}`)}
                                  className="btn-outline"
                                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                >
                                  View Profile
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              padding: '12px',
              cursor: 'pointer',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={24} />
          </motion.button>
          <motion.img
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            src={selectedImage}
            alt="Full size view"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
          />
        </motion.div>
      )}

      {/* Rating Modal */}
      {showRatingModal && ratingWorker && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowRatingModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-elevated)',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}
          >
            <h3 style={{ marginBottom: '16px', fontSize: '1.3rem' }}>Rate Worker</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Rate your experience with <strong>{ratingWorker.worker_name}</strong>
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Rating</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    size={32}
                    color={star <= ratingValue ? 'var(--accent-gold)' : 'var(--text-muted)'}
                    fill={star <= ratingValue ? 'var(--accent-gold)' : 'none'}
                    style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                    onMouseEnter={() => setRatingValue(star)}
                    onClick={() => setRatingValue(star)}
                  />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Comment (optional)</label>
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Share your experience with this worker..."
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  resize: 'vertical',
                  minHeight: '80px',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setRatingValue(0);
                  setRatingComment('');
                  setRatingWorker(null);
                }}
                className="btn-outline"
                style={{ padding: '10px 20px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRateWorker}
                className="btn-premium"
                style={{ padding: '10px 20px', background: 'linear-gradient(135deg, var(--accent-gold) 0%, #b8860b 100%)', color: '#000' }}
              >
                Submit Rating
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default EmployerDashboard;
