import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Briefcase, CreditCard, Upload } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const WorkerProfile = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    location: '',
    skills: '',
    experience: '',
    national_id: ''
  });

  const [idPhotoUrl, setIdPhotoUrl] = useState('');
  const [passportPhotoUrl, setPassportPhotoUrl] = useState('');
  const [idPhotoFile, setIdPhotoFile] = useState(null);
  const [passportPhotoFile, setPassportPhotoFile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const userId = localStorage.getItem('userId');
      if (!userId) return navigate('/');

      try {
        const response = await fetch(`http://localhost:3000/api/worker/${userId}/profile`);
        if (response.ok) {
          const data = await response.json();
          setProfile({
            full_name: data.full_name || '',
            phone: data.phone || '',
            location: data.location || '',
            skills: data.skills || '',
            experience: data.experience || '',
            national_id: data.national_id || ''
          });
          if (data.id_photo_url) setIdPhotoUrl(data.id_photo_url);
          if (data.passport_photo_url) setPassportPhotoUrl(data.passport_photo_url);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleFileChange = (e, setFileFn, setPreviewUrlFn) => {
    const file = e.target.files[0];
    if (file) {
      setFileFn(file);
      setPreviewUrlFn(URL.createObjectURL(file));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const userId = localStorage.getItem('userId');
    
    if (!profile.full_name.trim()) return showToast('Full name is required.', 'error');
    if (!profile.phone.trim()) return showToast('Phone number is required.', 'error');

    const formData = new FormData();
    formData.append('full_name', profile.full_name.trim());
    formData.append('phone', profile.phone.trim());
    formData.append('location', profile.location.trim());
    formData.append('skills', profile.skills.trim());
    formData.append('experience', String(profile.experience).trim());
    formData.append('national_id', profile.national_id.trim());

    if (idPhotoFile) formData.append('idPhoto', idPhotoFile);
    if (passportPhotoFile) formData.append('passportPhoto', passportPhotoFile);

    try {
      const response = await fetch(`http://localhost:3000/api/worker/${userId}/profile`, {
        method: 'PUT',
        body: formData
      });
      
      if (response.ok) {
        showToast('Profile updated successfully!', 'success');
      } else {
        const data = await response.json();
        showToast(data.error || 'Update failed', 'error');
      }
    } catch (err) {
      showToast('Network error while updating profile', 'error');
    }
  };

  if (loading) return <div className="app-layout"><Sidebar role="worker" /><div className="main-content flex-center">Loading...</div></div>;

  return (
    <div className="app-layout">
      <Sidebar role="worker" />
      <div className="main-content">
        <header style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <User size={36} color="var(--accent-emerald)" /> My Profile
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your professional details, identity, and public presentation.</p>
        </header>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ padding: '40px', maxWidth: '800px' }}>
          <form onSubmit={handleUpdate} encType="multipart/form-data">
            
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input type="text" className="input-field" value={profile.full_name} onChange={e => setProfile({...profile, full_name: e.target.value})} required />
            </div>
            
            <div className="input-group">
              <label className="input-label">Phone Number</label>
              <input type="tel" className="input-field" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} required />
            </div>

            <div className="input-group">
              <label className="input-label">Location</label>
              <input type="text" className="input-field" placeholder="City, State or District" value={profile.location} onChange={e => setProfile({...profile, location: e.target.value})} />
            </div>

            <h3 style={{ marginTop: '32px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={20} color="var(--accent-gold)" /> Professional Details
            </h3>
            
            <div className="input-group">
              <label className="input-label">Skills (Comma separated)</label>
              <input type="text" className="input-field" value={profile.skills} onChange={e => setProfile({...profile, skills: e.target.value})} />
            </div>

            <div className="input-group">
              <label className="input-label">Years of Experience</label>
              <input type="number" className="input-field" value={profile.experience} onChange={e => setProfile({...profile, experience: e.target.value})} />
            </div>

            <h3 style={{ marginTop: '32px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={20} color="var(--accent-emerald)" /> Identity Verification
            </h3>

            <div className="input-group">
              <label className="input-label">National ID Number</label>
              <input type="text" className="input-field" value={profile.national_id} onChange={e => setProfile({...profile, national_id: e.target.value})} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="input-group">
                <label className="input-label">National ID Photo</label>
                <div style={{ border: '1px dashed var(--border-color)', borderRadius: '12px', padding: '16px', textAlign: 'center', position: 'relative' }}>
                  {idPhotoUrl ? (
                    <img src={idPhotoUrl} alt="ID Preview" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }} />
                  ) : (
                    <div style={{ padding: '30px 0', color: 'var(--text-muted)' }}><Upload size={24} style={{ margin: '0 auto' }}/></div>
                  )}
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setIdPhotoFile, setIdPhotoUrl)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Click to upload new ID photo</div>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Passport / Profile Photo</label>
                <div style={{ border: '1px dashed var(--border-color)', borderRadius: '12px', padding: '16px', textAlign: 'center', position: 'relative' }}>
                  {passportPhotoUrl ? (
                    <img src={passportPhotoUrl} alt="Passport Preview" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }} />
                  ) : (
                    <div style={{ padding: '30px 0', color: 'var(--text-muted)' }}><Upload size={24} style={{ margin: '0 auto' }}/></div>
                  )}
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setPassportPhotoFile, setPassportPhotoUrl)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Click to upload new passport photo</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '40px' }}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-premium" style={{ background: 'linear-gradient(135deg, var(--accent-emerald) 0%, #047857 100%)', color: '#fff', width: '100%' }} type="submit">
                Save Profile Changes
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default WorkerProfile;

