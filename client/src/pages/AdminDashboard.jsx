import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, Briefcase, FileText, Bell,
  LogOut, Trash2, CheckCircle, XCircle, LayoutDashboard,
  AlertTriangle, RefreshCw, Activity, Lock, Mail, ShieldCheck,
  Globe, Clock, Key, Zap, Settings as SettingsIcon
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import PasswordInput from '../components/PasswordInput';
import { API_BASE_URL } from '../config/api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { showToast, confirmAction } = useToast();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState({
    // Platform Settings
    site_name: 'Ishimo',
    site_description: 'Connecting elite workers with employers',
    maintenance_mode: 'false',
    maintenance_message: 'Site is under maintenance. Please check back later.',

    // Registration Settings
    allow_registration: 'true',
    max_workers_per_employer: '10',
    require_worker_verification: 'true',
    require_employer_verification: 'false',

    // Email/Notification Settings
    email_notifications_enabled: 'true',
    welcome_email_enabled: 'true',
    job_alert_email_enabled: 'true',
    admin_notification_email: 'admin@ishimo.com',

    // SMTP Configuration
    smtp_host: '',
    smtp_port: '587',
    smtp_secure: 'false',
    smtp_user: '',
    smtp_password: '',
    smtp_from_email: 'noreply@ishimo.com',
    smtp_from_name: 'Ishimo',

    // Content Moderation Settings
    auto_moderate_jobs: 'true',
    require_job_approval: 'false',
    profanity_filter_enabled: 'true',
    max_job_description_length: '5000',

    // API/Rate Limit Settings
    api_rate_limit_enabled: 'true',
    api_rate_limit_window: '15',
    api_rate_limit_max_requests: '100',

    // User Management Settings
    user_session_timeout: '30',
    password_min_length: '8',
    password_require_special_char: 'true',
    account_inactivity_days: '90',

    // Job Posting Settings
    max_active_jobs_per_employer: '20',
    job_expiry_days: '30',
    allow_job_editing: 'true',
    allow_job_deletion: 'true'
  });

  const changeTab = (tab) => {
    setLoading(true);
    setData(null);
    setActiveTab(tab);
  };

  const adminToken = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!adminToken) {
      navigate('/login');
      return;
    }
    if (activeTab === 'settings') {
      fetchSettings();
    } else {
      fetchData(activeTab);
    }
  }, [activeTab, adminToken, navigate]);

  const fetchData = async (tab) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/${tab === 'overview' ? 'stats' : tab}`, {
        headers: { 'x-admin-token': adminToken }
      });
      if (res.status === 403 || res.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/login');
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      showToast(t('err_load_data'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/settings`, {
        headers: { 'x-admin-token': adminToken }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      showToast(t('err_load_settings'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSetting = async (key, value) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/settings/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify({ value })
      });
      if (res.ok) {
        setSettings(prev => ({ ...prev, [key]: value }));
        showToast(t('setting_updated'), 'success');
      } else {
        showToast(t('err_update_setting'), 'error');
      }
    } catch (err) {
      showToast(t('err_server_error'), 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/login');
  };

  const handleDelete = async (type, id) => {
    const confirmed = await confirmAction({
      title: t('delete_entity').replace('{type}', t(type)),
      message: t('confirm_delete_message').replace('{type}', t(type)),
      confirmText: t('yes_delete'),
      type: 'error'
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/${type}s/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': adminToken }
      });
      if (res.ok) {
        showToast(t('deleted_success').replace('{type}', t(type)), 'success');
        fetchData(activeTab);
      } else {
        showToast(t('delete_failed').replace('{type}', t(type)), 'error');
      }
    } catch {
      showToast(t('err_server_error'), 'error');
    }
  };

  const handleStatusUpdate = async (type, id, status) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/${type}s/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        showToast(t('status_updated'), 'success');
        fetchData(activeTab);
      } else {
        showToast(t('err_status_update'), 'error');
      }
    } catch {
      showToast(t('err_server_error'), 'error');
    }
  };

  const handleAvailabilityUpdate = async (id, availability) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/workers/${id}/availability`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify({ availability })
      });
      if (res.ok) {
        showToast(t('availability_updated'), 'success');
        fetchData(activeTab);
      } else {
        showToast(t('err_update_availability'), 'error');
      }
    } catch {
      showToast(t('err_server_error'), 'error');
    }
  };

  const handleResetUserPassword = async (userId) => {
    const newPassword = prompt(t('password_prompt'));
    if (!newPassword) return;
    if (newPassword.length < 8) {
      return showToast(t('password_min_error'), 'error');
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify({ newPassword })
      });
      if (res.ok) {
        showToast(t('password_reset_success'), 'success');
      } else {
        showToast(t('err_reset_password'), 'error');
      }
    } catch {
      showToast(t('err_server_error'), 'error');
    }
  };

  const handleChangeAdminPassword = async (e) => {
    e.preventDefault();
    const newPassword = e.target.newPassword.value;
    if (!newPassword || newPassword.length < 8) {
      return showToast(t('password_min_error'), 'error');
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/settings/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify({ newPassword })
      });
      if (res.ok) {
        showToast(t('admin_password_changed'), 'success');
        e.target.reset();
      } else {
        showToast(t('err_change_admin_password'), 'error');
      }
    } catch {
      showToast(t('err_server_error'), 'error');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-center" style={{ height: '400px', color: 'var(--text-muted)' }}>
          <RefreshCw className="spin" size={32} />
        </div>
      );
    }

    if (!data && activeTab !== 'settings') return null;

    switch (activeTab) {
      case 'overview':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <StatCard title={t('stat_total_users')} value={data.total_users} icon={<Users />} color="#3b82f6" />
            <StatCard title={t('stat_total_workers')} value={data.total_workers} icon={<Briefcase />} color="var(--accent-emerald)" />
            <StatCard title={t('stat_total_employers')} value={data.total_employers} icon={<Briefcase />} color="var(--accent-gold)" />
            <StatCard title={t('active_jobs')} value={data.open_jobs} icon={<FileText />} color="#a855f7" />
            <StatCard title={t('stat_pending_workers')} value={data.pending_workers} icon={<AlertTriangle />} color="#f59e0b" />
            <StatCard title={t('stat_total_applications')} value={data.total_applications} icon={<FileText />} color="#06b6d4" />
            <StatCard title={t('stat_notifications_sent')} value={data.total_notifications} icon={<Bell />} color="#ef4444" />
          </div>
        );

      case 'users':
        return (
          <div className="glass-panel" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '16px' }}>{t('id')}</th>
                  <th style={{ padding: '16px' }}>{t('email')}</th>
                  <th style={{ padding: '16px' }}>{t('role')}</th>
                  <th style={{ padding: '16px' }}>{t('status')}</th>
                  <th style={{ padding: '16px' }}>{t('created_at')}</th>
                  <th style={{ padding: '16px', textAlign: 'right' }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px' }}>{u.id}</td>
                    <td style={{ padding: '16px' }}>{u.email}</td>
                    <td style={{ padding: '16px', textTransform: 'capitalize' }}>
                      <Badge type={u.role === 'employer' ? 'gold' : 'emerald'}>{t(u.role)}</Badge>
                    </td>
                    <td style={{ padding: '16px', textTransform: 'capitalize' }}>
                      <Badge type={u.status === 'active' ? 'emerald' : u.status === 'suspended' ? 'gold' : 'error'}>{t(u.status)}</Badge>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '16px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <select 
                        value={u.status} 
                        onChange={(e) => handleStatusUpdate('user', u.id, e.target.value)}
                        style={{
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-main)',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          outline: 'none'
                        }}
                      >
                        <option value="active">{t('active')}</option>
                        <option value="suspended">{t('suspended')}</option>
                        <option value="blocked">{t('blocked')}</option>
                      </select>
                      <button onClick={() => handleResetUserPassword(u.id)} style={{ color: 'var(--accent-emerald)', padding: '8px' }} title={t('reset_password')}>
                        <Lock size={18} />
                      </button>
                      <button onClick={() => handleDelete('user', u.id)} style={{ color: '#ef4444', padding: '8px' }} title={t('delete')}>
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'workers':
        return (
          <div className="glass-panel" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '16px' }}>{t('id')}</th>
                  <th style={{ padding: '16px' }}>{t('name_email')}</th>
                  <th style={{ padding: '16px' }}>{t('location')}</th>
                  <th style={{ padding: '16px' }}>{t('status')}</th>
                  <th style={{ padding: '16px' }}>{t('availability')}</th>
                  <th style={{ padding: '16px', textAlign: 'right' }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map(w => (
                  <tr key={w.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px' }}>{w.id}</td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 600 }}>{w.full_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{w.email}</div>
                    </td>
                    <td style={{ padding: '16px' }}>{w.location || '—'}</td>
                    <td style={{ padding: '16px' }}>
                      <Badge type={w.status === 'available' ? 'emerald' : w.status === 'hired' ? 'gold' : w.status === 'fired' ? 'error' : 'muted'}>
                        {t(w.status)}
                      </Badge>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <select 
                        value={w.availability || 'available'} 
                        onChange={(e) => handleAvailabilityUpdate(w.id, e.target.value)}
                        style={{
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-main)',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          outline: 'none',
                          fontSize: '0.85rem'
                        }}
                      >
                        <option value="available">{t('available')}</option>
                        <option value="busy">{t('busy')}</option>
                        <option value="unavailable">{t('unavailable')}</option>
                      </select>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <select
                        value={w.status || 'pending'}
                        onChange={(e) => handleStatusUpdate('worker', w.id, e.target.value)}
                        style={{
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-main)',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          outline: 'none',
                          fontSize: '0.85rem'
                        }}
                      >
                        <option value="pending">{t('pending')}</option>
                        <option value="completed">{t('completed')}</option>
                        <option value="hired">{t('hired')}</option>
                        <option value="fired">{t('fired')}</option>
                        <option value="suspended">{t('suspended')}</option>
                      </select>
                      <button onClick={() => handleResetUserPassword(w.id)} style={{ color: 'var(--text-main)', padding: '6px', background: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-color)' }} title={t('reset_password')}>
                        {t('reset_password')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'employers':
        return (
          <div className="glass-panel" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '16px' }}>{t('id')}</th>
                  <th style={{ padding: '16px' }}>{t('email')}</th>
                  <th style={{ padding: '16px' }}>{t('phone')}</th>
                  <th style={{ padding: '16px' }}>{t('location')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px' }}>{e.id}</td>
                    <td style={{ padding: '16px' }}>{e.email}</td>
                    <td style={{ padding: '16px' }}>{e.phone}</td>
                    <td style={{ padding: '16px' }}>{e.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'jobs':
        return (
          <div className="glass-panel" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '16px' }}>{t('id')}</th>
                  <th style={{ padding: '16px' }}>{t('job_title')}</th>
                  <th style={{ padding: '16px' }}>{t('employer_email')}</th>
                  <th style={{ padding: '16px' }}>{t('applicants')}</th>
                  <th style={{ padding: '16px' }}>{t('status')}</th>
                  <th style={{ padding: '16px', textAlign: 'right' }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map(j => (
                  <tr key={j.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px' }}>{j.id}</td>
                    <td style={{ padding: '16px', fontWeight: 600 }}>{j.title}</td>
                    <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{j.employer_email}</td>
                    <td style={{ padding: '16px' }}>{j.applicant_count}</td>
                    <td style={{ padding: '16px' }}>
                      <Badge type={j.status === 'open' ? 'emerald' : 'muted'}>{t(j.status)}</Badge>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button onClick={() => handleDelete('job', j.id)} style={{ color: '#ef4444', padding: '8px' }}>
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'applications':
        return (
          <div className="glass-panel" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '16px' }}>{t('id')}</th>
                  <th style={{ padding: '16px' }}>{t('job_title')}</th>
                  <th style={{ padding: '16px' }}>{t('worker')}</th>
                  <th style={{ padding: '16px' }}>{t('status')}</th>
                  <th style={{ padding: '16px', textAlign: 'right' }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px' }}>{a.id}</td>
                    <td style={{ padding: '16px', fontWeight: 600 }}>{a.job_title}</td>
                    <td style={{ padding: '16px' }}>
                      <div>{a.worker_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.worker_email}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <Badge type={a.status === 'accepted' ? 'emerald' : a.status === 'declined' ? 'error' : 'gold'}>
                        {t(a.status)}
                      </Badge>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <select 
                        value={a.status} 
                        onChange={(e) => handleStatusUpdate('application', a.id, e.target.value)}
                        style={{
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-main)',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          outline: 'none'
                        }}
                      >
                        <option value="pending">{t('pending')}</option>
                        <option value="accepted">{t('accepted')}</option>
                        <option value="declined">{t('declined')}</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'notifications':
        return (
          <div className="glass-panel" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '16px' }}>{t('id')}</th>
                  <th style={{ padding: '16px' }}>{t('user_email')}</th>
                  <th style={{ padding: '16px' }}>{t('type')}</th>
                  <th style={{ padding: '16px' }}>{t('message')}</th>
                  <th style={{ padding: '16px' }}>{t('read')}</th>
                  <th style={{ padding: '16px', textAlign: 'right' }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map(n => (
                  <tr key={n.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px' }}>{n.id}</td>
                    <td style={{ padding: '16px' }}>{n.user_email}</td>
                    <td style={{ padding: '16px', textTransform: 'capitalize' }}>{n.type === 'job_request' ? t('job_request_type') : n.type === 'request_response' ? t('response_type') : n.type === 'new_application' ? t('application_type') : n.type.replace('_', ' ')}</td>
                    <td style={{ padding: '16px', maxWidth: '300px' }}>{n.message}</td>
                    <td style={{ padding: '16px' }}>
                      {n.is_read ? <CheckCircle size={18} color="var(--accent-emerald)" /> : <span style={{ color: 'var(--text-muted)' }}>{t('no')}</span>}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button onClick={() => handleDelete('notification', n.id)} style={{ color: '#ef4444', padding: '8px' }}>
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'logs':
        return (
          <div className="glass-panel" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '16px' }}>{t('timestamp')}</th>
                  <th style={{ padding: '16px' }}>{t('user')}</th>
                  <th style={{ padding: '16px' }}>{t('action')}</th>
                  <th style={{ padding: '16px' }}>{t('entity')}</th>
                  <th style={{ padding: '16px' }}>{t('ip_details')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map(log => {
                  let actionColor = 'muted';
                  if (log.action === 'login' || log.action === 'register') actionColor = 'emerald';
                  else if (log.action.includes('update') || log.action.includes('change')) actionColor = 'gold';
                  else if (log.action.includes('create') || log.action === 'job_request') actionColor = 'gold';

                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 600 }}>{log.user_email || t('anonymous')}</div>
                        {log.user_id && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {log.user_id}</div>}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <Badge type={actionColor}>{log.action}</Badge>
                      </td>
                      <td style={{ padding: '16px', textTransform: 'capitalize' }}>{log.entity || '—'}</td>
                      <td style={{ padding: '16px' }}>
                        <div>{log.detail}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>IP: {log.ip || t('unknown')}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );

      case 'settings':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Platform Settings */}
            <div className="glass-panel" style={{ padding: '32px' }}>
              <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={20} style={{ color: 'var(--accent-emerald)' }} /> {t('platform_settings')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>{t('site_name')}</label>
                  <input
                    type="text"
                    className="input-field"
                    value={settings.site_name}
                    onChange={(e) => handleUpdateSetting('site_name', e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>{t('site_description')}</label>
                  <textarea
                    className="input-field"
                    value={settings.site_description}
                    onChange={(e) => handleUpdateSetting('site_description', e.target.value)}
                    rows={3}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <input
                    type="checkbox"
                    id="maintenance_mode"
                    checked={settings.maintenance_mode === 'true'}
                    onChange={(e) => handleUpdateSetting('maintenance_mode', e.target.checked.toString())}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="maintenance_mode" style={{ margin: 0, cursor: 'pointer' }}>
                    {t('maintenance_mode_label')}
                  </label>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>{t('maintenance_message')}</label>
                  <textarea
                    className="input-field"
                    value={settings.maintenance_message}
                    onChange={(e) => handleUpdateSetting('maintenance_message', e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Registration Settings */}
            <div className="glass-panel" style={{ padding: '32px' }}>
              <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} style={{ color: 'var(--accent-gold)' }} /> {t('registration_settings')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <input
                    type="checkbox"
                    id="allow_registration"
                    checked={settings.allow_registration === 'true'}
                    onChange={(e) => handleUpdateSetting('allow_registration', e.target.checked.toString())}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="allow_registration" style={{ margin: 0, cursor: 'pointer' }}>
                    {t('allow_registration_label')}
                  </label>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>{t('max_workers_per_employer')}</label>
                  <input
                    type="number"
                    className="input-field"
                    value={settings.max_workers_per_employer}
                    onChange={(e) => handleUpdateSetting('max_workers_per_employer', e.target.value)}
                    min="1"
                    max="100"
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <input
                    type="checkbox"
                    id="require_worker_verification"
                    checked={settings.require_worker_verification === 'true'}
                    onChange={(e) => handleUpdateSetting('require_worker_verification', e.target.checked.toString())}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="require_worker_verification" style={{ margin: 0, cursor: 'pointer' }}>
                    {t('require_worker_verification_label')}
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <input
                    type="checkbox"
                    id="require_employer_verification"
                    checked={settings.require_employer_verification === 'true'}
                    onChange={(e) => handleUpdateSetting('require_employer_verification', e.target.checked.toString())}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="require_employer_verification" style={{ margin: 0, cursor: 'pointer' }}>
                    {t('require_employer_verification_label')}
                  </label>
                </div>
              </div>
            </div>

            {/* Email/Notification Settings */}
            <div className="glass-panel" style={{ padding: '32px' }}>
              <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={20} style={{ color: '#3b82f6' }} /> {t('email_notification_settings')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <input
                    type="checkbox"
                    id="email_notifications_enabled"
                    checked={settings.email_notifications_enabled === 'true'}
                    onChange={(e) => handleUpdateSetting('email_notifications_enabled', e.target.checked.toString())}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="email_notifications_enabled" style={{ margin: 0, cursor: 'pointer' }}>
                    {t('enable_email_notifications')}
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <input
                    type="checkbox"
                    id="welcome_email_enabled"
                    checked={settings.welcome_email_enabled === 'true'}
                    onChange={(e) => handleUpdateSetting('welcome_email_enabled', e.target.checked.toString())}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="welcome_email_enabled" style={{ margin: 0, cursor: 'pointer' }}>
                    {t('welcome_email_label')}
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <input
                    type="checkbox"
                    id="job_alert_email_enabled"
                    checked={settings.job_alert_email_enabled === 'true'}
                    onChange={(e) => handleUpdateSetting('job_alert_email_enabled', e.target.checked.toString())}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="job_alert_email_enabled" style={{ margin: 0, cursor: 'pointer' }}>
                    {t('job_alert_email_label')}
                  </label>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>{t('admin_notification_email')}</label>
                  <input
                    type="email"
                    className="input-field"
                    value={settings.admin_notification_email}
                    onChange={(e) => handleUpdateSetting('admin_notification_email', e.target.value)}
                  />
                </div>

                {/* SMTP Configuration */}
                <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
                  <h4 style={{ marginBottom: '16px', fontSize: '1rem', color: 'var(--text-secondary)' }}>{t('smtp_configuration')}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>{t('smtp_host')}</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="smtp.gmail.com"
                        value={settings.smtp_host}
                        onChange={(e) => handleUpdateSetting('smtp_host', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>{t('smtp_port')}</label>
                      <input
                        type="number"
                        className="input-field"
                        placeholder="587"
                        value={settings.smtp_port}
                        onChange={(e) => handleUpdateSetting('smtp_port', e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>{t('smtp_username')}</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="your-email@gmail.com"
                      value={settings.smtp_user}
                      onChange={(e) => handleUpdateSetting('smtp_user', e.target.value)}
                    />
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>{t('smtp_password')}</label>
                    <PasswordInput
                      placeholder="Your SMTP password or app password"
                      value={settings.smtp_password}
                      onChange={(e) => handleUpdateSetting('smtp_password', e.target.value)}
                    />
                  </div>
                  <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                    <input
                      type="checkbox"
                      id="smtp_secure"
                      checked={settings.smtp_secure === 'true'}
                      onChange={(e) => handleUpdateSetting('smtp_secure', e.target.checked.toString())}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <label htmlFor="smtp_secure" style={{ margin: 0, cursor: 'pointer' }}>
                      {t('smtp_secure_label')}
                    </label>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>{t('from_email')}</label>
                      <input
                        type="email"
                        className="input-field"
                        placeholder="noreply@eliteconnect.com"
                        value={settings.smtp_from_email}
                        onChange={(e) => handleUpdateSetting('smtp_from_email', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>{t('from_name')}</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Ishimo"
                        value={settings.smtp_from_name}
                        onChange={(e) => handleUpdateSetting('smtp_from_name', e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                      <strong>{t('gmail_tip')}</strong> {t('gmail_tip_body')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Moderation Settings */}
            <div className="glass-panel" style={{ padding: '32px' }}>
              <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} style={{ color: '#a855f7' }} /> {t('content_moderation_settings')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <input
                    type="checkbox"
                    id="auto_moderate_jobs"
                    checked={settings.auto_moderate_jobs === 'true'}
                    onChange={(e) => handleUpdateSetting('auto_moderate_jobs', e.target.checked.toString())}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="auto_moderate_jobs" style={{ margin: 0, cursor: 'pointer' }}>
                    {t('auto_moderate_jobs_label')}
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <input
                    type="checkbox"
                    id="require_job_approval"
                    checked={settings.require_job_approval === 'true'}
                    onChange={(e) => handleUpdateSetting('require_job_approval', e.target.checked.toString())}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="require_job_approval" style={{ margin: 0, cursor: 'pointer' }}>
                    {t('require_job_approval_label')}
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <input
                    type="checkbox"
                    id="profanity_filter_enabled"
                    checked={settings.profanity_filter_enabled === 'true'}
                    onChange={(e) => handleUpdateSetting('profanity_filter_enabled', e.target.checked.toString())}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="profanity_filter_enabled" style={{ margin: 0, cursor: 'pointer' }}>
                    {t('profanity_filter_label')}
                  </label>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>{t('max_job_description_length')}</label>
                  <input
                    type="number"
                    className="input-field"
                    value={settings.max_job_description_length}
                    onChange={(e) => handleUpdateSetting('max_job_description_length', e.target.value)}
                    min="100"
                    max="10000"
                  />
                </div>
              </div>
            </div>

            {/* API/Rate Limit Settings */}
            <div className="glass-panel" style={{ padding: '32px' }}>
              <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={20} style={{ color: '#f59e0b' }} /> {t('api_rate_limit_settings')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <input
                    type="checkbox"
                    id="api_rate_limit_enabled"
                    checked={settings.api_rate_limit_enabled === 'true'}
                    onChange={(e) => handleUpdateSetting('api_rate_limit_enabled', e.target.checked.toString())}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="api_rate_limit_enabled" style={{ margin: 0, cursor: 'pointer' }}>
                    {t('enable_api_rate_limit')}
                  </label>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>{t('rate_limit_window')}</label>
                  <input
                    type="number"
                    className="input-field"
                    value={settings.api_rate_limit_window}
                    onChange={(e) => handleUpdateSetting('api_rate_limit_window', e.target.value)}
                    min="1"
                    max="3600"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>{t('max_requests_window')}</label>
                  <input
                    type="number"
                    className="input-field"
                    value={settings.api_rate_limit_max_requests}
                    onChange={(e) => handleUpdateSetting('api_rate_limit_max_requests', e.target.value)}
                    min="1"
                    max="1000"
                  />
                </div>
              </div>
            </div>

            {/* User Management Settings */}
            <div className="glass-panel" style={{ padding: '32px' }}>
              <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SettingsIcon size={20} style={{ color: '#06b6d4' }} /> {t('user_management_settings')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>{t('session_timeout')}</label>
                  <input
                    type="number"
                    className="input-field"
                    value={settings.user_session_timeout}
                    onChange={(e) => handleUpdateSetting('user_session_timeout', e.target.value)}
                    min="5"
                    max="1440"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>{t('password_min_length')}</label>
                  <input
                    type="number"
                    className="input-field"
                    value={settings.password_min_length}
                    onChange={(e) => handleUpdateSetting('password_min_length', e.target.value)}
                    min="4"
                    max="32"
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <input
                    type="checkbox"
                    id="password_require_special_char"
                    checked={settings.password_require_special_char === 'true'}
                    onChange={(e) => handleUpdateSetting('password_require_special_char', e.target.checked.toString())}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="password_require_special_char" style={{ margin: 0, cursor: 'pointer' }}>
                    {t('require_special_char_label')}
                  </label>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>{t('inactivity_days')}</label>
                  <input
                    type="number"
                    className="input-field"
                    value={settings.account_inactivity_days}
                    onChange={(e) => handleUpdateSetting('account_inactivity_days', e.target.value)}
                    min="30"
                    max="365"
                  />
                </div>
              </div>
            </div>

            {/* Job Posting Settings */}
            <div className="glass-panel" style={{ padding: '32px' }}>
              <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Briefcase size={20} style={{ color: '#10b981' }} /> {t('job_posting_settings')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>{t('max_active_jobs')}</label>
                  <input
                    type="number"
                    className="input-field"
                    value={settings.max_active_jobs_per_employer}
                    onChange={(e) => handleUpdateSetting('max_active_jobs_per_employer', e.target.value)}
                    min="1"
                    max="100"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>{t('job_expiry_days')}</label>
                  <input
                    type="number"
                    className="input-field"
                    value={settings.job_expiry_days}
                    onChange={(e) => handleUpdateSetting('job_expiry_days', e.target.value)}
                    min="1"
                    max="365"
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <input
                    type="checkbox"
                    id="allow_job_editing"
                    checked={settings.allow_job_editing === 'true'}
                    onChange={(e) => handleUpdateSetting('allow_job_editing', e.target.checked.toString())}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="allow_job_editing" style={{ margin: 0, cursor: 'pointer' }}>
                    {t('allow_job_editing_label')}
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <input
                    type="checkbox"
                    id="allow_job_deletion"
                    checked={settings.allow_job_deletion === 'true'}
                    onChange={(e) => handleUpdateSetting('allow_job_deletion', e.target.checked.toString())}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="allow_job_deletion" style={{ margin: 0, cursor: 'pointer' }}>
                    {t('allow_job_deletion_label')}
                  </label>
                </div>
              </div>
            </div>

            {/* Security Settings */}
            <div className="glass-panel" style={{ padding: '32px' }}>
              <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={20} style={{ color: '#ef4444' }} /> {t('security_settings')}
              </h3>
              <form onSubmit={handleChangeAdminPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>{t('new_admin_password')}</label>
                  <PasswordInput
                    name="newPassword"
                    placeholder={t('new_password_placeholder')}
                    required
                    minLength={8}
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="btn-premium"
                  style={{ alignSelf: 'flex-start', padding: '10px 24px' }}
                >
                  {t('change_password')}
                </motion.button>
              </form>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)' }}>
      
      {/* Sidebar */}
      <div style={{ width: '260px', background: 'var(--bg-card)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={24} color="#ef4444" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{t('admin')} <span style={{ color: '#ef4444' }}>{t('panel')}</span></h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('superuser_access')}</div>
          </div>
        </div>

        <div style={{ padding: '20px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <SidebarItem icon={<LayoutDashboard />} label={t('overview')} active={activeTab === 'overview'} onClick={() => changeTab('overview')} />
          <SidebarItem icon={<Users />} label={t('users')} active={activeTab === 'users'} onClick={() => changeTab('users')} />
          <SidebarItem icon={<Briefcase />} label={t('workers')} active={activeTab === 'workers'} onClick={() => changeTab('workers')} />
          <SidebarItem icon={<Users />} label={t('employers')} active={activeTab === 'employers'} onClick={() => changeTab('employers')} />
          <SidebarItem icon={<FileText />} label={t('jobs')} active={activeTab === 'jobs'} onClick={() => changeTab('jobs')} />
          <SidebarItem icon={<CheckCircle />} label={t('applications')} active={activeTab === 'applications'} onClick={() => changeTab('applications')} />
          <SidebarItem icon={<Bell />} label={t('notifications')} active={activeTab === 'notifications'} onClick={() => changeTab('notifications')} />
          <SidebarItem icon={<Activity />} label={t('activity_logs')} active={activeTab === 'logs'} onClick={() => changeTab('logs')} />
          <SidebarItem icon={<Lock />} label={t('settings')} active={activeTab === 'settings'} onClick={() => changeTab('settings')} />
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)' }}>
          <button 
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px', borderRadius: '8px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', fontWeight: 600 }}
          >
            <LogOut size={18} /> {t('logout')}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px', textTransform: 'capitalize' }}>
          {t(activeTab)}
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
          {t('manage_platform').replace('{tab}', t(activeTab))}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// Helper Components

const SidebarItem = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px',
      background: active ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
      color: active ? '#ef4444' : 'var(--text-main)',
      fontWeight: active ? 600 : 500,
      width: '100%', textAlign: 'left',
      transition: 'all 0.2s'
    }}
  >
    {React.cloneElement(icon, { size: 20 })}
    {label}
  </button>
);

const StatCard = ({ title, value, icon, color }) => (
  <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
    <div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>{title}</div>
      <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-main)' }}>{value}</div>
    </div>
    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>
      {React.cloneElement(icon, { size: 24 })}
    </div>
  </div>
);

const Badge = ({ children, type }) => {
  const colors = {
    gold: { bg: 'rgba(212,175,55,0.15)', text: 'var(--accent-gold)' },
    emerald: { bg: 'rgba(16,185,129,0.15)', text: 'var(--accent-emerald)' },
    error: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
    muted: { bg: 'rgba(255,255,255,0.1)', text: 'var(--text-muted)' }
  };
  const c = colors[type] || colors.muted;
  return (
    <span style={{ background: c.bg, color: c.text, padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {children}
    </span>
  );
};

export default AdminDashboard;
