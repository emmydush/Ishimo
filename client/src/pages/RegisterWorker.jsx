import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { UserCheck } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import PasswordInput from '../components/PasswordInput';
import { isValidEmail, isValidPassword, isValidRwandaPhone } from '../utils/validation';
import { API_BASE_URL, networkErrorMessage } from '../config/api';

// Education options — stored values are the English strings validated by the
// server whitelist; labels are translated via LanguageContext.
const EDUCATION_OPTIONS = [
  { value: 'No Formal Education', key: 'edu_no_formal' },
  { value: 'Primary School', key: 'edu_primary' },
  { value: 'Secondary School (O-Level)', key: 'edu_olevel' },
  { value: 'Secondary School (A-Level)', key: 'edu_alevel' },
  { value: 'TVET / Vocational Certificate', key: 'edu_tvet' },
  { value: 'Diploma', key: 'edu_diploma' },
  { value: "Bachelor's Degree", key: 'edu_bachelor' },
  { value: "Master's Degree or Higher", key: 'edu_masters' },
];

const RegisterWorker = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    location: '',
    education: ''
  });
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleaned = {
      fullName: formData.fullName.trim(),
      email:    formData.email.trim().toLowerCase(),
      password: formData.password,
      phone:    formData.phone.trim(),
      location: formData.location.trim(),
      education: formData.education,
    };
    if (!cleaned.fullName) return showToast(t('err_full_name_required'), 'error');
    if (cleaned.fullName.length < 3) return showToast(t('err_full_name_min'), 'error');
    if (!cleaned.email)    return showToast(t('err_email_required'), 'error');
    if (!isValidEmail(cleaned.email)) return showToast(t('err_email_invalid'), 'error');
    if (!cleaned.password) return showToast(t('err_password_required'), 'error');
    if (!isValidPassword(cleaned.password)) return showToast(t('err_password_policy'), 'error');
    if (!cleaned.phone)    return showToast(t('err_phone_required'), 'error');
    if (!isValidRwandaPhone(cleaned.phone)) return showToast(t('err_phone_invalid'), 'error');
    if (!cleaned.location) return showToast(t('err_location_required'), 'error');
    if (cleaned.location.length < 3) return showToast(t('err_location_min'), 'error');
    if (!cleaned.education) return showToast(t('err_education_required'), 'error');
    if (!termsAccepted) return showToast(t('err_terms_required'), 'error');
    try {
      const response = await fetch(`${API_BASE_URL}/api/register/worker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...cleaned, termsAccepted: true })
      });
      
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('role', data.role);
        showToast(t('worker_account_created'), 'success');
        navigate('/worker-onboarding');
      } else {
        const known = {
          'Email already exists': t('err_email_exists'),
          'Server error': t('err_server_error'),
        };
        showToast(known[data.error] || data.error || t('registration_failed'), 'error');
      }
    } catch (err) {
      showToast(networkErrorMessage(err), 'error');
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', position: 'relative' }}>

      {/* Language switcher */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', zIndex: 2 }}>
        <LanguageSwitcher />
      </div>

      {/* Background elements */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, rgba(10, 10, 11, 0) 70%)', zIndex: 0 }} />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-panel"
        style={{ width: '100%', maxWidth: '480px', padding: '40px', zIndex: 1 }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="flex-center" style={{ width: '56px', height: '56px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '16px', margin: '0 auto 16px', color: 'var(--accent-emerald)' }}>
            <UserCheck size={28} />
          </div>
          <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>{t('worker_registration_title')}</h2>
          <p style={{ color: 'var(--text-muted)' }}>{t('worker_registration_subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">{t('full_name')}</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder={t('name_placeholder')} 
              required 
              value={formData.fullName}
              onChange={e => setFormData({...formData, fullName: e.target.value})}
            />
          </div>
          <div className="input-group">
            <label className="input-label">{t('email_address')}</label>
            <input 
              type="email" 
              className="input-field" 
              placeholder={t('email_example')} 
              required 
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div className="input-group">
            <label className="input-label">{t('phone')}</label>
            <input 
              type="tel" 
              className="input-field" 
              placeholder={t('phone_placeholder')}
              required 
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <div className="input-group">
            <label className="input-label">{t('your_location')}</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder={t('location_placeholder')}
              required 
              value={formData.location}
              onChange={e => setFormData({...formData, location: e.target.value})}
            />
          </div>
          <div className="input-group">
            <label className="input-label">{t('education_level')}</label>
            <select 
              className="input-field"
              required 
              value={formData.education}
              onChange={e => setFormData({...formData, education: e.target.value})}
            >
              <option value="" disabled>{t('select_education')}</option>
              {EDUCATION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{t(opt.key)}</option>
              ))}
            </select>
          </div>
          <div className="input-group" style={{ marginBottom: '32px' }}>
            <label className="input-label">{t('strong_password')}</label>
            <PasswordInput
              placeholder={t('password_placeholder')} 
              required 
              minLength={8}
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '24px' }}>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              required
              style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--accent-emerald)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {t('terms_accept_1')}{' '}
              <span
                style={{ color: 'var(--accent-emerald)', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => navigate('/terms')}
              >
                {t('terms_and_conditions')}
              </span>{' '}
              {t('terms_accept_2')}
            </span>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-premium" 
            style={{ width: '100%', fontSize: '1.1rem', background: 'linear-gradient(135deg, var(--accent-emerald) 0%, #047857 100%)', color: '#fff' }}
            type="submit"
          >
            {t('create_worker_account')}
          </motion.button>

          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {t('have_account')} <span style={{ color: 'var(--accent-emerald)', cursor: 'pointer' }} onClick={() => navigate('/login')}>{t('sign_in')}</span>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default RegisterWorker;
