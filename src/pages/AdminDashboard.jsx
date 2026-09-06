import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Users, Briefcase, FileText, Bell, 
  LogOut, Trash2, CheckCircle, XCircle, LayoutDashboard,
  AlertTriangle, RefreshCw
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { showToast, confirmAction } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

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
    fetchData(activeTab);
  }, [activeTab, adminToken, navigate]);

  const fetchData = async (tab) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/admin/${tab === 'overview' ? 'stats' : tab}`, {
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
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/login');
  };

  const handleDelete = async (type, id) => {
    const confirmed = await confirmAction({
      title: `Delete ${type}`,
      message: `Are you sure you want to delete this ${type}? This action cannot be undone.`,
      confirmText: 'Yes, Delete',
      type: 'error'
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`http://localhost:3000/api/admin/${type}s/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': adminToken }
      });
      if (res.ok) {
        showToast(`${type} deleted successfully`, 'success');
        fetchData(activeTab);
      } else {
        showToast(`Failed to delete ${type}`, 'error');
      }
    } catch {
      showToast('Server error', 'error');
    }
  };

  const handleStatusUpdate = async (type, id, status) => {
    try {
      const res = await fetch(`http://localhost:3000/api/admin/${type}s/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        showToast('Status updated', 'success');
        fetchData(activeTab);
      } else {
        showToast('Failed to update status', 'error');
      }
    } catch {
      showToast('Server error', 'error');
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

    if (!data) return null;

    switch (activeTab) {
      case 'overview':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <StatCard title="Total Users" value={data.total_users} icon={<Users />} color="#3b82f6" />
            <StatCard title="Total Workers" value={data.total_workers} icon={<Briefcase />} color="var(--accent-emerald)" />
            <StatCard title="Total Employers" value={data.total_employers} icon={<Briefcase />} color="var(--accent-gold)" />
            <StatCard title="Active Jobs" value={data.open_jobs} icon={<FileText />} color="#a855f7" />
            <StatCard title="Pending Workers" value={data.pending_workers} icon={<AlertTriangle />} color="#f59e0b" />
            <StatCard title="Total Applications" value={data.total_applications} icon={<FileText />} color="#06b6d4" />
            <StatCard title="Notifications Sent" value={data.total_notifications} icon={<Bell />} color="#ef4444" />
          </div>
        );

      case 'users':
        return (
          <div className="glass-panel" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '16px' }}>ID</th>
                  <th style={{ padding: '16px' }}>Email</th>
                  <th style={{ padding: '16px' }}>Role</th>
                  <th style={{ padding: '16px' }}>Status</th>
                  <th style={{ padding: '16px' }}>Created At</th>
                  <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px' }}>{u.id}</td>
                    <td style={{ padding: '16px' }}>{u.email}</td>
                    <td style={{ padding: '16px', textTransform: 'capitalize' }}>
                      <Badge type={u.role === 'employer' ? 'gold' : 'emerald'}>{u.role}</Badge>
                    </td>
                    <td style={{ padding: '16px', textTransform: 'capitalize' }}>
                      <Badge type={u.status === 'active' ? 'emerald' : u.status === 'suspended' ? 'gold' : 'error'}>{u.status}</Badge>
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
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="blocked">Blocked</option>
                      </select>
                      <button onClick={() => handleDelete('user', u.id)} style={{ color: '#ef4444', padding: '8px' }}>
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
                  <th style={{ padding: '16px' }}>ID</th>
                  <th style={{ padding: '16px' }}>Name & Email</th>
                  <th style={{ padding: '16px' }}>Location</th>
                  <th style={{ padding: '16px' }}>Status</th>
                  <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
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
                      <Badge type={w.status === 'completed' ? 'emerald' : w.status === 'pending' ? 'gold' : 'error'}>
                        {w.status}
                      </Badge>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      {w.status === 'pending' && (
                        <button onClick={() => handleStatusUpdate('worker', w.id, 'completed')} style={{ color: 'var(--accent-emerald)', padding: '6px', background: 'rgba(16,185,129,0.1)', borderRadius: '6px' }}>
                          Approve
                        </button>
                      )}
                      {w.status !== 'suspended' && (
                        <button onClick={() => handleStatusUpdate('worker', w.id, 'suspended')} style={{ color: '#ef4444', padding: '6px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px' }}>
                          Suspend
                        </button>
                      )}
                      {w.status === 'suspended' && (
                        <button onClick={() => handleStatusUpdate('worker', w.id, 'completed')} style={{ color: 'var(--accent-emerald)', padding: '6px', background: 'rgba(16,185,129,0.1)', borderRadius: '6px' }}>
                          Unsuspend
                        </button>
                      )}
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
                  <th style={{ padding: '16px' }}>ID</th>
                  <th style={{ padding: '16px' }}>Email</th>
                  <th style={{ padding: '16px' }}>Phone</th>
                  <th style={{ padding: '16px' }}>Location</th>
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
                  <th style={{ padding: '16px' }}>ID</th>
                  <th style={{ padding: '16px' }}>Job Title</th>
                  <th style={{ padding: '16px' }}>Employer Email</th>
                  <th style={{ padding: '16px' }}>Applicants</th>
                  <th style={{ padding: '16px' }}>Status</th>
                  <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
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
                      <Badge type={j.status === 'open' ? 'emerald' : 'muted'}>{j.status}</Badge>
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
                  <th style={{ padding: '16px' }}>ID</th>
                  <th style={{ padding: '16px' }}>Job Title</th>
                  <th style={{ padding: '16px' }}>Worker</th>
                  <th style={{ padding: '16px' }}>Status</th>
                  <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
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
                        {a.status}
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
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="declined">Declined</option>
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
                  <th style={{ padding: '16px' }}>ID</th>
                  <th style={{ padding: '16px' }}>User Email</th>
                  <th style={{ padding: '16px' }}>Type</th>
                  <th style={{ padding: '16px' }}>Message</th>
                  <th style={{ padding: '16px' }}>Read</th>
                  <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map(n => (
                  <tr key={n.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px' }}>{n.id}</td>
                    <td style={{ padding: '16px' }}>{n.user_email}</td>
                    <td style={{ padding: '16px', textTransform: 'capitalize' }}>{n.type.replace('_', ' ')}</td>
                    <td style={{ padding: '16px', maxWidth: '300px' }}>{n.message}</td>
                    <td style={{ padding: '16px' }}>
                      {n.is_read ? <CheckCircle size={18} color="var(--accent-emerald)" /> : <span style={{ color: 'var(--text-muted)' }}>No</span>}
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
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Admin <span style={{ color: '#ef4444' }}>Panel</span></h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Superuser Access</div>
          </div>
        </div>

        <div style={{ padding: '20px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <SidebarItem icon={<LayoutDashboard />} label="Overview" active={activeTab === 'overview'} onClick={() => changeTab('overview')} />
          <SidebarItem icon={<Users />} label="Users" active={activeTab === 'users'} onClick={() => changeTab('users')} />
          <SidebarItem icon={<Briefcase />} label="Workers" active={activeTab === 'workers'} onClick={() => changeTab('workers')} />
          <SidebarItem icon={<Users />} label="Employers" active={activeTab === 'employers'} onClick={() => changeTab('employers')} />
          <SidebarItem icon={<FileText />} label="Jobs" active={activeTab === 'jobs'} onClick={() => changeTab('jobs')} />
          <SidebarItem icon={<CheckCircle />} label="Applications" active={activeTab === 'applications'} onClick={() => changeTab('applications')} />
          <SidebarItem icon={<Bell />} label="Notifications" active={activeTab === 'notifications'} onClick={() => changeTab('notifications')} />
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)' }}>
          <button 
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px', borderRadius: '8px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', fontWeight: 600 }}
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px', textTransform: 'capitalize' }}>
          {activeTab}
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
          Manage platform {activeTab} and monitor activity.
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
