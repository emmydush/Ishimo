import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Search, MapPin, DollarSign, Briefcase, X, Phone, Mail, Calendar, Clock, CheckCircle, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

export default function WorkerFindJobs() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [applying, setApplying] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [appliedJobs, setAppliedJobs] = useState(new Set());

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/jobs');
        const data = await response.json();
        setJobs(data);
      } catch (err) {
        console.error('Error fetching jobs:', err);
        showToast('Failed to load jobs. Please check your connection.', 'error');
      } finally {
        setLoading(false);
      }
    };

    // Load previously applied jobs from localStorage
    const savedApplied = localStorage.getItem('appliedJobs');
    if (savedApplied) {
      setAppliedJobs(new Set(JSON.parse(savedApplied)));
    }

    fetchJobs();
  }, []);

  const handleApply = async (jobId) => {
    const workerId = localStorage.getItem('userId');
    if (!workerId) return showToast('You must be logged in as a worker to apply.', 'error');

    setApplying(jobId);
    try {
      const response = await fetch(`http://localhost:3000/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId })
      });
      const data = await response.json();
      if (response.ok) {
        const newApplied = new Set([...appliedJobs, jobId]);
        setAppliedJobs(newApplied);
        localStorage.setItem('appliedJobs', JSON.stringify([...newApplied]));
        showToast('Application submitted successfully! The employer will contact you.', 'success');
        // Close modal if open
        if (selectedJob?.id === jobId) setSelectedJob(null);
      } else {
        showToast(data.error || 'Failed to submit application', 'error');
      }
    } catch (err) {
      showToast('Network error while submitting application', 'error');
    } finally {
      setApplying(null);
    }
  };

  const filteredJobs = jobs.filter(j =>
    j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="app-layout">
      <Sidebar role="worker" />

      <div className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Briefcase size={28} color="var(--accent-emerald)" />
              Find Jobs
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              {loading ? 'Loading...' : `${filteredJobs.length} open position${filteredJobs.length !== 1 ? 's' : ''} available`}
            </p>
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search jobs, locations..."
              style={{ paddingLeft: '44px', width: '260px' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                background: 'var(--bg-elevated)', borderRadius: '12px', padding: '24px',
                border: '1px solid var(--border-color)', opacity: 0.5
              }}>
                <div style={{ height: '20px', background: 'var(--bg-card)', borderRadius: '6px', width: '60%', marginBottom: '12px' }} />
                <div style={{ height: '14px', background: 'var(--bg-card)', borderRadius: '6px', width: '40%', marginBottom: '8px' }} />
                <div style={{ height: '14px', background: 'var(--bg-card)', borderRadius: '6px', width: '80%' }} />
              </div>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              textAlign: 'center', padding: '60px 40px',
              background: 'var(--bg-elevated)', borderRadius: '16px',
              border: '1px solid var(--border-color)'
            }}
          >
            <Briefcase size={48} color="var(--text-muted)" style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
              {searchTerm ? `No jobs found for "${searchTerm}"` : 'No open job postings right now.'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{ marginTop: '12px', color: 'var(--accent-emerald)', fontSize: '0.9rem', cursor: 'pointer' }}
              >
                Clear search
              </button>
            )}
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredJobs.map((job, idx) => {
              const isApplied = appliedJobs.has(job.id);
              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  style={{
                    background: 'var(--bg-elevated)',
                    padding: '24px',
                    borderRadius: '14px',
                    border: isApplied
                      ? '1px solid rgba(16, 185, 129, 0.25)'
                      : '1px solid var(--border-color)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'border-color 0.3s'
                  }}
                >
                  {isApplied && (
                    <div style={{
                      position: 'absolute', top: '12px', right: '12px',
                      background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                      borderRadius: '20px', padding: '3px 10px',
                      fontSize: '0.72rem', color: 'var(--accent-emerald)', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                      <CheckCircle size={11} /> Applied
                    </div>
                  )}

                  <div style={{ marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px', paddingRight: isApplied ? '80px' : '0' }}>
                      {job.title}
                    </h3>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <MapPin size={14} color="var(--accent-emerald)" /> {job.location}
                      </span>
                      {job.salary_range && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <DollarSign size={14} color="var(--accent-gold)" /> {job.salary_range}
                        </span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={14} /> {formatDate(job.created_at)}
                      </span>
                    </div>
                  </div>

                  <p style={{
                    color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.6',
                    marginBottom: '18px',
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden'
                  }}>
                    {job.description}
                  </p>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedJob(job)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '9px 20px', borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 500,
                        background: 'var(--bg-card)', cursor: 'pointer',
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      <Eye size={15} /> View Details
                    </motion.button>

                    {!isApplied && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn-premium"
                        style={{ padding: '9px 22px', fontSize: '0.9rem' }}
                        onClick={() => handleApply(job.id)}
                        disabled={applying === job.id}
                      >
                        {applying === job.id ? 'Applying...' : 'Apply Now'}
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Job Detail Modal */}
      <AnimatePresence>
        {selectedJob && (
          <>
            {/* Full-screen flex container — handles centering without transform conflict */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.82)',
                backdropFilter: 'blur(8px)',
                zIndex: 5000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px'
              }}
              onClick={() => setSelectedJob(null)}
            >
            {/* Modal Panel — stops click propagation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 20 }}
              transition={{ type: 'spring', damping: 24, stiffness: 260 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '620px',
                maxHeight: '88vh',
                overflowY: 'auto',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '20px',
                boxShadow: '0 30px 80px rgba(0,0,0,0.9)',
              }}
            >
              {/* Modal Header */}
              <div style={{
                padding: '28px 28px 0',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '20px',
                position: 'sticky', top: 0,
                background: 'var(--bg-card)',
                zIndex: 1,
                borderRadius: '20px 20px 0 0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, paddingRight: '16px' }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                      borderRadius: '20px', padding: '3px 12px', marginBottom: '10px',
                      fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-emerald)' }} />
                      Open Position
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '10px', lineHeight: 1.2 }}>
                      {selectedJob.title}
                    </h2>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <MapPin size={14} color="var(--accent-emerald)" /> {selectedJob.location}
                      </span>
                      {selectedJob.salary_range && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <DollarSign size={14} color="var(--accent-gold)" /> {selectedJob.salary_range}
                        </span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Calendar size={14} /> Posted {formatDate(selectedJob.created_at)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedJob(null)}
                    style={{
                      padding: '8px', borderRadius: '10px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-muted)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', flexShrink: 0
                    }}
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '24px 28px' }}>
                {/* Job Description */}
                <div style={{ marginBottom: '28px' }}>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                    Job Description
                  </h3>
                  <p style={{
                    color: 'var(--text-main)', fontSize: '0.95rem',
                    lineHeight: '1.75', whiteSpace: 'pre-wrap'
                  }}>
                    {selectedJob.description}
                  </p>
                </div>

                {/* Contact Information */}
                <div style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '20px',
                  marginBottom: '24px'
                }}>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
                    Employer Contact
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {selectedJob.employer_phone && (
                      <a
                        href={`tel:${selectedJob.employer_phone}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '12px 16px',
                          background: 'rgba(16,185,129,0.08)',
                          border: '1px solid rgba(16,185,129,0.2)',
                          borderRadius: '10px',
                          color: 'var(--accent-emerald)',
                          textDecoration: 'none',
                          fontWeight: 500, fontSize: '0.95rem',
                          transition: 'var(--transition-smooth)'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.08)'}
                      >
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: 'rgba(16,185,129,0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <Phone size={17} color="var(--accent-emerald)" />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Phone Number</div>
                          <div>{selectedJob.employer_phone}</div>
                        </div>
                      </a>
                    )}

                    {selectedJob.employer_email && (
                      <a
                        href={`mailto:${selectedJob.employer_email}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '12px 16px',
                          background: 'rgba(212,175,55,0.08)',
                          border: '1px solid rgba(212,175,55,0.2)',
                          borderRadius: '10px',
                          color: 'var(--accent-gold)',
                          textDecoration: 'none',
                          fontWeight: 500, fontSize: '0.95rem',
                          transition: 'var(--transition-smooth)'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,175,55,0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(212,175,55,0.08)'}
                      >
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: 'rgba(212,175,55,0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <Mail size={17} color="var(--accent-gold)" />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Email Address</div>
                          <div>{selectedJob.employer_email}</div>
                        </div>
                      </a>
                    )}

                    {!selectedJob.employer_phone && !selectedJob.employer_email && (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '12px' }}>
                        Contact information not available.
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  {appliedJobs.has(selectedJob.id) ? (
                    <div style={{
                      flex: 1, padding: '14px', borderRadius: '10px',
                      background: 'rgba(16,185,129,0.1)',
                      border: '1px solid rgba(16,185,129,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      color: 'var(--accent-emerald)', fontWeight: 600, fontSize: '0.95rem'
                    }}>
                      <CheckCircle size={18} /> Application Submitted
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="btn-premium"
                      style={{ flex: 1, padding: '14px', fontSize: '0.95rem' }}
                      onClick={() => handleApply(selectedJob.id)}
                      disabled={applying === selectedJob.id}
                    >
                      {applying === selectedJob.id ? 'Submitting...' : 'Apply for This Job'}
                    </motion.button>
                  )}
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="btn-outline"
                    style={{ padding: '14px 20px', fontSize: '0.9rem' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
