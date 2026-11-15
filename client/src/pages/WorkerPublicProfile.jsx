import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import {
  User, Phone, Mail, Briefcase, Clock, Star,
  ShieldCheck, ChevronLeft, FileText, CreditCard, Send, X
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL } from '../config/api';

const WorkerPublicProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [applications, setApplications] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const fetchWorker = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/worker/${id}/full-profile`);
        if (res.ok) {
          const data = await res.json();
          setWorker(data);
        } else {
          navigate('/employer-dashboard');
        }
      } catch (err) {
        console.error('Error fetching worker profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWorker();

    // Fetch employer's applications for this worker
    const employerId = localStorage.getItem('userId');
    if (employerId) {
      fetch(`${API_BASE_URL}/api/employer/${employerId}/applications`)
        .then(res => res.json())
        .then(data => {
          const workerApps = data.filter(app => app.worker_id === parseInt(id));
          setApplications(workerApps);
        })
        .catch(err => console.error('Error fetching applications:', err));
    }
  }, [id, navigate]);

  const handleRequest = async () => {
    const employerId = localStorage.getItem('userId');
    if (!employerId) return showToast(t('err_login_required_employer'), 'error');
    setRequesting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employerId, workerId: id })
      });
      const data = await res.json();
      if (res.ok) {
        setRequested(true);
        showToast(t('direct_request_sent'), 'success');
      } else {
        showToast(data.error || t('err_send_request'), 'error');
      }
    } catch (err) {
      showToast(t('err_network_request'), 'error');
    } finally {
      setRequesting(false);
    }
  };

  const handleUpdateApplicationStatus = async (applicationId, status) => {
    setUpdatingStatus(applicationId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/applications/${applicationId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(t('application_updated').replace('{status}', t(status)), 'success');
        // Refresh applications
        const employerId = localStorage.getItem('userId');
        const resApps = await fetch(`${API_BASE_URL}/api/employer/${employerId}/applications`);
        const dataApps = await resApps.json();
        const workerApps = dataApps.filter(app => app.worker_id === parseInt(id));
        setApplications(workerApps);
      } else {
        showToast(data.error || t('err_status_update'), 'error');
      }
    } catch (err) {
      showToast(t('err_network_status'), 'error');
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar role="employer" />
        <div className="main-content flex-center">
          <p style={{ color: 'var(--text-muted)' }}>{t('loading_profile')}</p>
        </div>
      </div>
    );
  }

  if (!worker) return null;

  const skills = worker.skills ? worker.skills.split(',').map(s => s.trim()) : [];
  const isHired = worker.status === 'hired';

  return (
    <div className="app-layout">
      <Sidebar role="employer" />
      <div className="main-content" style={{ padding: '40px 48px' }}>

        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: -4 }}
          onClick={() => navigate('/employer-dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '32px', fontWeight: 500 }}
        >
          <ChevronLeft size={20} /> {t('back_to_workers')}
        </motion.button>

        <div className="responsive-profile-grid">

          {/* Left: Identity Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Hero card */}
            <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', marginBottom: '24px' }}>
              {/* Avatar */}
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: '20px' }}>
                {worker.passport_photo_url ? (
                  <img
                    src={worker.passport_photo_url}
                    alt={worker.full_name}
                    style={{ width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-gold)', cursor: 'pointer' }}
                    onClick={() => setSelectedImage(worker.passport_photo_url)}
                  />
                ) : (
                  <div style={{ width: '110px', height: '110px', borderRadius: '50%', background: 'var(--bg-elevated)', border: '3px solid var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                    <User size={48} color="var(--text-muted)" />
                  </div>
                )}
                {worker.status === 'completed' && (
                  <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'var(--accent-emerald)', borderRadius: '50%', padding: '4px', display: 'flex' }}>
                    <ShieldCheck size={14} color="#fff" />
                  </div>
                )}
              </div>

              <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '4px' }}>{worker.full_name}</h2>
              <div style={{ color: 'var(--accent-gold)', fontWeight: 500, marginBottom: '16px' }}>
                {skills[0] || t('professional')}
              </div>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                {[
                  { label: t('experience'), value: t('yrs_fmt').replace('{n}', worker.experience || 0), icon: <Clock size={16} color="var(--accent-gold)" /> },
                  { label: t('jobs_done'), value: worker.completed_jobs, icon: <Briefcase size={16} color="var(--accent-emerald)" /> },
                  { label: t('profile_views'), value: worker.profile_views || 0, icon: <User size={16} color="var(--accent-gold)" /> },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--bg-elevated)', borderRadius: '10px', padding: '14px 8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>{s.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: '1.3rem' }}>{s.value}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Rating */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '24px' }}>
                {[1,2,3,4,5].map(i => (
                  <Star key={i} size={18} color={worker.rating > 0 ? 'var(--accent-gold)' : 'var(--text-muted)'} fill={worker.rating > 0 && i <= Math.round(worker.rating) ? "var(--accent-gold)" : "none"} />
                ))}
                <span style={{ marginLeft: '8px', fontWeight: 600 }}>{worker.rating > 0 ? worker.rating : t('no_ratings')}</span>
                {worker.rating_count > 0 && (
                  <span style={{ marginLeft: '4px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>({worker.rating_count})</span>
                )}
              </div>

              {/* Request Button */}
              <motion.button
                whileHover={!requested && !isHired ? { scale: 1.03 } : {}}
                whileTap={!requested && !isHired ? { scale: 0.97 } : {}}
                onClick={!requested && !isHired ? handleRequest : undefined}
                className="btn-premium"
                disabled={isHired}
                title={isHired ? t('worker_currently_hired') : undefined}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '1rem',
                  background: requested
                    ? 'rgba(16,185,129,0.15)'
                    : isHired
                    ? 'var(--bg-elevated)'
                    : 'linear-gradient(135deg, var(--accent-gold) 0%, #b8952b 100%)',
                  color: requested ? 'var(--accent-emerald)' : isHired ? 'var(--text-muted)' : '#000',
                  cursor: requested || isHired ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                {requested ? (
                  <><ShieldCheck size={18} /> {t('request_sent')}</>
                ) : isHired ? (
                  <><Briefcase size={18} /> {t('worker_currently_hired')}</>
                ) : requesting ? (
                  t('sending')
                ) : (
                  <><Send size={18} /> {t('request_this_worker')}</>
                )}
              </motion.button>
            </div>

            {/* Contact info */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h4 style={{ marginBottom: '16px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('contact_info')}</h4>
              {isHired ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', background: 'var(--bg-elevated)', borderRadius: '8px' }}><Briefcase size={16} color="var(--accent-gold)" /></div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('contact_private_hired')}</div>
                </div>
              ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', background: 'var(--bg-elevated)', borderRadius: '8px' }}><Mail size={16} color="var(--accent-gold)" /></div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('email')}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{worker.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', background: 'var(--bg-elevated)', borderRadius: '8px' }}><Phone size={16} color="var(--accent-emerald)" /></div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('phone_short')}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{worker.phone || 'N/A'}</div>
                  </div>
                </div>
              </div>
              )}
            </div>

            {/* Applications from this worker */}
            {applications.length > 0 && (
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h4 style={{ marginBottom: '16px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {t('applications_to_your_jobs')}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {applications.map(app => (
                    <div key={app.application_id} style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>{app.job_title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('status')}: {t(app.status)}</div>
                      </div>
                      {app.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleUpdateApplicationStatus(app.application_id, 'rejected')}
                            disabled={updatingStatus === app.application_id}
                            className="btn-outline"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', borderColor: '#ef4444', color: '#ef4444', opacity: updatingStatus === app.application_id ? 0.6 : 1 }}
                          >
                            {updatingStatus === app.application_id ? t('processing') : t('reject')}
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleUpdateApplicationStatus(app.application_id, 'accepted')}
                            disabled={updatingStatus === app.application_id}
                            className="btn-premium"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'linear-gradient(135deg, var(--accent-gold) 0%, #b8860b 100%)', color: '#000', opacity: updatingStatus === app.application_id ? 0.6 : 1 }}
                          >
                            {updatingStatus === app.application_id ? t('processing') : t('accept')}
                          </motion.button>
                        </div>
                      ) : (
                        <span style={{ padding: '4px 12px', background: app.status === 'accepted' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: app.status === 'accepted' ? 'var(--accent-emerald)' : '#ef4444', borderRadius: '8px', fontWeight: 500, fontSize: '0.85rem', textTransform: 'capitalize' }}>
                          {app.status}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Right: Detailed Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Skills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-panel"
              style={{ padding: '28px' }}
            >
              <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Briefcase size={20} color="var(--accent-gold)" /> {t('skills_expertise')}
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {skills.length > 0 ? skills.map(skill => (
                  <span key={skill} style={{
                    padding: '8px 18px',
                    background: 'rgba(212,175,55,0.08)',
                    border: '1px solid rgba(212,175,55,0.25)',
                    borderRadius: '20px',
                    fontWeight: 500,
                    color: 'var(--accent-gold)',
                    fontSize: '0.9rem'
                  }}>
                    {skill}
                  </span>
                )) : <p style={{ color: 'var(--text-muted)' }}>{t('no_skills_listed')}</p>}
              </div>
            </motion.div>

            {/* Recommendation */}
            {worker.recommendation && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-panel"
                style={{ padding: '28px' }}
              >
                <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={20} color="var(--accent-emerald)" /> {t('recommendation')}
                </h3>
                <div style={{
                  background: 'var(--bg-elevated)',
                  borderRadius: '12px',
                  padding: '20px 24px',
                  borderLeft: '3px solid var(--accent-emerald)',
                  lineHeight: 1.8,
                  color: 'var(--text-muted)',
                  fontSize: '0.95rem',
                  fontStyle: 'italic'
                }}>
                  "{worker.recommendation}"
                </div>
              </motion.div>
            )}

            {/* Identity Documents */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-panel"
              style={{ padding: '28px' }}
            >
              <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CreditCard size={20} color="var(--accent-gold)" /> {t('identity_documents')}
              </h3>

              {/* National ID Number */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                  {t('national_id_number')}
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '16px 20px',
                  background: 'var(--bg-elevated)',
                  borderRadius: '10px',
                  border: '1px solid rgba(212,175,55,0.2)'
                }}>
                  <div style={{ padding: '10px', background: 'rgba(212,175,55,0.1)', borderRadius: '8px' }}>
                    <CreditCard size={20} color="var(--accent-gold)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '2px', fontFamily: 'monospace' }}>
                      {worker.national_id || '—'}
                    </div>
                    {worker.national_id && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <ShieldCheck size={12} /> {t('verified')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ID Photo & Passport Photo side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* National ID Photo */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                    {t('national_id_photo')}
                  </div>
                  {worker.id_photo_url ? (
                    <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <img
                        src={worker.id_photo_url}
                        alt={t('national_id_photo')}
                        style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                        onClick={() => setSelectedImage(worker.id_photo_url)}
                        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      />
                      <div style={{ display: 'none', height: '160px', background: 'var(--bg-elevated)', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
                        <CreditCard size={28} color="var(--text-muted)" />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('preview_unavailable')}</span>
                      </div>
                      <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(16,185,129,0.9)', borderRadius: '20px', padding: '3px 10px', fontSize: '0.7rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ShieldCheck size={11} /> {t('verified')}
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: '160px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
                      <CreditCard size={28} color="var(--text-muted)" />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('not_submitted')}</span>
                    </div>
                  )}
                </div>

                {/* Passport Photo */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                    {t('passport_photo')}
                  </div>
                  {worker.passport_photo_url ? (
                    <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <img
                        src={worker.passport_photo_url}
                        alt={t('passport')}
                        style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                        onClick={() => setSelectedImage(worker.passport_photo_url)}
                        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      />
                      <div style={{ display: 'none', height: '160px', background: 'var(--bg-elevated)', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
                        <User size={28} color="var(--text-muted)" />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('preview_unavailable')}</span>
                      </div>
                      <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(16,185,129,0.9)', borderRadius: '20px', padding: '3px 10px', fontSize: '0.7rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ShieldCheck size={11} /> {t('verified')}
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: '160px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
                      <User size={28} color="var(--text-muted)" />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('not_submitted')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Verification Status Summary */}
              <div style={{ marginTop: '20px', padding: '14px 18px', background: worker.national_id && worker.id_photo_url && worker.passport_photo_url ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)', borderRadius: '10px', border: `1px solid ${worker.national_id && worker.id_photo_url && worker.passport_photo_url ? 'rgba(16,185,129,0.2)' : 'var(--border-color)'}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ShieldCheck size={20} color={worker.national_id && worker.id_photo_url && worker.passport_photo_url ? 'var(--accent-emerald)' : 'var(--text-muted)'} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {worker.national_id && worker.id_photo_url && worker.passport_photo_url ? t('fully_verified') : t('partial_verification')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {[`${t('id_number')} ${worker.national_id ? '✓' : '✗'}`, `${t('id_photo')} ${worker.id_photo_url ? '✓' : '✗'}`, `${t('passport')} ${worker.passport_photo_url ? '✓' : '✗'}`].join('  ·  ')}
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
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
              alt={t('full_size_view')}
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
      </div>
    </div>
  );
};

export default WorkerPublicProfile;
