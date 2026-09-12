import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, CheckCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const WorkerOnboarding = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    skills: '',
    experience: '',
    nationalId: '',
    recommendation: ''
  });
  const [idPhoto, setIdPhoto] = useState(null);
  const [passportPhoto, setPassportPhoto] = useState(null);
  const [additionalPhoto, setAdditionalPhoto] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 2) {
      let uploaded = 0;
      if (idPhoto) uploaded++;
      if (passportPhoto) uploaded++;
      if (additionalPhoto) uploaded++;
      if (uploaded < 2) {
        showToast('You must upload at least two photos.', 'error');
        return;
      }
    }
    if (step < 3) {
      setStep(step + 1);
    } else {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        showToast('Missing user ID. Please register again.', 'error');
        return;
      }

      const data = new FormData();
      data.append('userId', userId);
      data.append('skills', formData.skills);
      data.append('experience', formData.experience);
      data.append('nationalId', formData.nationalId);
      data.append('recommendation', formData.recommendation);
      if (idPhoto) data.append('idPhoto', idPhoto);
      if (passportPhoto) data.append('passportPhoto', passportPhoto);
      if (additionalPhoto) data.append('additionalPhoto', additionalPhoto);

      try {
        const response = await fetch('http://localhost:3000/api/worker/profile', {
          method: 'POST',
          body: data
        });
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          showToast('Server returned an unexpected response. Please try again.', 'error');
          return;
        }

        const result = await response.json();
        
        if (response.ok) {
          showToast('Profile onboarding completed successfully!', 'success');
          navigate('/worker-dashboard');
        } else {
          showToast(result.error || 'Failed to complete profile', 'error');
        }
      } catch (err) {
        showToast('Network error while completing profile', 'error');
      }
    }
  };

  const FileUploadInput = ({ label, fileState, onChange }) => {
    const inputRef = useRef(null);

    return (
      <div className="input-group">
        <label className="input-label">{label}</label>
        <div 
          onClick={() => inputRef.current.click()}
          style={{ 
            border: '2px dashed var(--border-color)', 
            borderRadius: '12px', 
            padding: '32px', 
            textAlign: 'center',
            cursor: 'pointer',
            background: 'var(--bg-elevated)',
            transition: 'var(--transition-smooth)'
          }}
          onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent-emerald)'}
          onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
        >
          {fileState ? (
            <div>
              <CheckCircle size={32} color="var(--accent-emerald)" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--accent-emerald)', fontWeight: 500 }}>{fileState.name}</p>
            </div>
          ) : (
            <div>
              <UploadCloud size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-main)', fontWeight: 500 }}>Click to upload</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>PNG, JPG, PDF up to 10MB</p>
            </div>
          )}
        </div>
        <input 
          type="file" 
          ref={inputRef} 
          style={{ display: 'none' }} 
          onChange={e => onChange(e.target.files[0])}
        />
      </div>
    );
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel"
        style={{ width: '100%', maxWidth: '600px', padding: '48px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Complete Your Profile</h2>
          <p style={{ color: 'var(--text-muted)' }}>You must complete these details to activate your account.</p>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '24px' }}>
            {[1, 2, 3].map(i => (
              <div 
                key={i} 
                style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', 
                  background: step >= i ? 'var(--accent-emerald)' : 'var(--bg-elevated)',
                  color: step >= i ? '#fff' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 600
                }}
              >
                {step > i ? <CheckCircle size={16} /> : i}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="input-group">
                <label className="input-label">What do you know to do? (Skills)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Nanny, Cooking, Cleaning, Security" 
                  required 
                  value={formData.skills}
                  onChange={e => setFormData({...formData, skills: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Years of Experience</label>
                <input 
                  type="number" 
                  className="input-field" 
                  placeholder="e.g. 5" 
                  required 
                  value={formData.experience}
                  onChange={e => setFormData({...formData, experience: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label className="input-label">National ID Number</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Enter your ID number" 
                  required 
                  value={formData.nationalId}
                  onChange={e => setFormData({...formData, nationalId: e.target.value})}
                />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <FileUploadInput label="Upload National ID Photo" fileState={idPhoto} onChange={setIdPhoto} />
              <div style={{ height: '24px' }} />
              <FileUploadInput label="Upload Passport Photo" fileState={passportPhoto} onChange={setPassportPhoto} />
              <div style={{ height: '24px' }} />
              <FileUploadInput label="Upload Additional Photo (Optional)" fileState={additionalPhoto} onChange={setAdditionalPhoto} />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="input-group">
                <label className="input-label">Recommendation Letter</label>
                <textarea 
                  className="input-field" 
                  style={{ minHeight: '120px', resize: 'vertical' }}
                  placeholder="Paste text or describe your recommendation..." 
                  required 
                  value={formData.recommendation}
                  onChange={e => setFormData({...formData, recommendation: e.target.value})}
                />
              </div>
            </motion.div>
          )}

          <div style={{ display: 'flex', gap: '16px', marginTop: '40px' }}>
            {step > 1 && (
              <button 
                type="button"
                className="btn-outline" 
                style={{ flex: 1 }}
                onClick={() => setStep(step - 1)}
              >
                Back
              </button>
            )}
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-premium" 
              style={{ flex: 2, background: 'linear-gradient(135deg, var(--accent-emerald) 0%, #047857 100%)', color: '#fff' }}
              type="submit"
            >
              {step === 3 ? 'Finish Registration' : 'Continue'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default WorkerOnboarding;
