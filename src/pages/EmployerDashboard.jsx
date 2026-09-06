import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Search, Filter, MapPin, Star, ShieldCheck, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'workers'); // 'workers' or 'jobs'
  const [showBanner, setShowBanner] = useState(!!location.state?.newlyPosted);
  const [myJobs, setMyJobs] = useState([]);
  const [jobApplications, setJobApplications] = useState([]);

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
        const response = await fetch('http://localhost:3000/api/workers');
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
        const resJobs = await fetch(`http://localhost:3000/api/employer/${employerId}/jobs`);
        const dataJobs = await resJobs.json();
        setMyJobs(dataJobs);

        const resApps = await fetch(`http://localhost:3000/api/employer/${employerId}/applications`);
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
      const response = await fetch('http://localhost:3000/api/jobs/request', {
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
      const response = await fetch(`http://localhost:3000/api/applications/${applicationId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (response.ok) {
        showToast(`Application ${status} successfully!`, 'success');
        // Refresh applications
        const employerId = localStorage.getItem('userId');
        const resApps = await fetch(`http://localhost:3000/api/employer/${employerId}/applications`);
        const dataApps = await resApps.json();
        setJobApplications(dataApps);
      } else {
        showToast(data.error || 'Failed to update status', 'error');
      }
    } catch (err) {
      showToast('Network error while updating status', 'error');
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
            Post a Job
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
            Find Professionals
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
            My Job Postings
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
                  placeholder="Search roles or names..." 
                  style={{ paddingLeft: '44px', width: '100%' }}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                <Filter size={18} />
                Filter
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading top-tier professionals...</div>
            ) : filteredWorkers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No professionals found matching your search.</div>
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
                      <img 
                        src={worker.image} 
                        alt={worker.name} 
                        style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-gold)' }} 
                      />
                      <div>
                        <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {worker.name}
                          {worker.verified && <ShieldCheck size={18} color="var(--accent-gold)" />}
                        </h3>
                        <div style={{ color: 'var(--accent-gold)', fontWeight: 500, fontSize: '0.9rem', marginBottom: '4px' }}>{worker.role}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={14} /> {worker.location}
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
                          <Star size={14} color="var(--accent-gold)" fill="var(--accent-gold)" />
                          {worker.rating}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                      {worker.skills.map(skill => (
                        <span key={skill} style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn-outline"
                        style={{ flex: 1, padding: '11px' }}
                        onClick={() => navigate(`/worker/${worker.id}`)}
                      >
                        View Profile
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn-premium"
                        style={{ flex: 1, padding: '11px' }}
                        onClick={() => handleRequestWorker(worker.id)}
                      >
                        Request
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
    </div>
  );
};

export default EmployerDashboard;
