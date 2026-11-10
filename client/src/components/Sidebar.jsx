import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Search, User, LogOut, Settings, Briefcase, PlusCircle, Menu, X, Bell } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import NotificationPanel from './NotificationPanel';
import LanguageSwitcher from './LanguageSwitcher';

const Sidebar = ({ role }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast, confirmAction } = useToast();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const { unreadCount } = useNotifications();

  const employerLinks = [
    { name: 'dashboard', path: '/employer-dashboard', icon: <Home size={20} /> },
    { name: 'find_workers', path: '/employer-dashboard', icon: <Search size={20} /> },
    { name: 'post_job', path: '/employer-post-job', icon: <PlusCircle size={20} /> },
    { name: 'my_profile', path: '/employer-profile', icon: <User size={20} /> },
    { name: 'settings', path: '/employer-settings', icon: <Settings size={20} /> },
  ];

  const workerLinks = [
    { name: 'dashboard', path: '/worker-dashboard', icon: <Home size={20} /> },
    { name: 'find_jobs', path: '/worker-find-jobs', icon: <Search size={20} /> },
    { name: 'my_profile', path: '/worker-profile', icon: <User size={20} /> },
    { name: 'settings', path: '/worker-settings', icon: <Settings size={20} /> },
  ];

  const links = role === 'employer' ? employerLinks : workerLinks;
  const activeAccent = role === 'employer' ? 'var(--accent-gold)' : 'var(--accent-emerald)';

  const handleLogout = async () => {
    setMenuOpen(false);
    const confirmed = await confirmAction({
      title: 'Confirm Logout',
      message: 'Are you sure you want to log out of your account?',
      confirmText: 'Yes, Log Out',
      cancelText: 'Cancel',
      type: 'warning'
    });

    if (confirmed) {
      localStorage.clear();
      showToast('Logged out successfully', 'info');
      navigate('/');
    }
  };

  return (
    <>
      {/* Mobile Top Header Bar */}
      <div className="mobile-top-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setMenuOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              padding: '8px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              cursor: 'pointer'
            }}
            aria-label="Open sidebar menu"
          >
            <Menu size={22} color={activeAccent} />
          </motion.button>

          <div style={{ fontWeight: 700, fontSize: '1.15rem' }}>
            Ishimo
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LanguageSwitcher />
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: activeAccent,
            textTransform: 'uppercase',
            padding: '3px 10px',
            background: 'var(--bg-elevated)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)'
          }}>
            {role}
          </span>
          {/* Notification Bell */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => setPanelOpen((o) => !o)}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              background: panelOpen ? 'var(--bg-elevated)' : 'var(--bg-elevated)',
              border: `1px solid ${panelOpen ? activeAccent : 'var(--border-color)'}`,
              borderRadius: '8px',
              color: 'var(--text-main)',
              cursor: 'pointer',
              transition: 'border-color 0.2s'
            }}
            aria-label="Notifications"
          >
            <Bell size={20} color={activeAccent} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                minWidth: '16px',
                height: '16px',
                borderRadius: '50%',
                background: '#ef4444',
                color: '#fff',
                fontSize: '0.6rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                padding: '0 3px',
                boxShadow: '0 0 0 2px var(--bg-card)'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </motion.button>

          {/* Notification Dropdown Panel */}
          <NotificationPanel
            isOpen={panelOpen}
            onClose={() => setPanelOpen(false)}
            accentColor={activeAccent}
          />
        </div>
      </div>

      {/* Mobile Slide-Over Drawer Menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(4px)',
                zIndex: 2000
              }}
            />

            {/* Slide Drawer Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                width: '280px',
                maxWidth: '85vw',
                background: 'var(--bg-card)',
                borderRight: '1px solid var(--border-color)',
                zIndex: 2001,
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 0 30px rgba(0,0,0,0.8)'
              }}
            >
              {/* Drawer Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                    Ishimo
                  </h2>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {role} Menu
                  </div>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  style={{
                    padding: '6px',
                    background: 'var(--bg-elevated)',
                    borderRadius: '8px',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer'
                  }}
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Links */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                {links.map((link) => {
                  const isActive = location.pathname === link.path;
                  return (
                    <motion.button
                      key={link.name}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setMenuOpen(false);
                        navigate(link.path);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '14px',
                        borderRadius: '10px',
                        color: isActive ? activeAccent : 'var(--text-main)',
                        background: isActive ? 'var(--bg-elevated)' : 'transparent',
                        border: isActive ? `1px solid ${role === 'employer' ? 'rgba(212,175,55,0.2)' : 'rgba(16,185,129,0.2)'}` : '1px solid transparent',
                        fontWeight: isActive ? 600 : 500,
                        textAlign: 'left',
                        width: '100%',
                        fontSize: '0.95rem',
                        cursor: 'pointer'
                      }}
                    >
                      {React.cloneElement(link.icon, { size: 20, color: isActive ? activeAccent : 'var(--text-muted)' })}
                      {t(link.name)}
                    </motion.button>
                  );
                })}
              </div>

              {/* User Identity & Logout Footer */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 4px', marginBottom: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: role === 'employer' ? 'rgba(212,175,55,0.15)' : 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {role === 'employer' ? <Briefcase size={18} color="var(--accent-gold)" /> : <User size={18} color="var(--accent-emerald)" />}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{role === 'employer' ? t('employer') + ' Account' : t('worker') + ' Account'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {localStorage.getItem('userId') || '—'}</div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px', borderRadius: '8px', color: '#ef4444',
                    background: 'rgba(239, 68, 68, 0.1)', fontWeight: 500,
                    textAlign: 'left', width: '100%', fontSize: '0.9rem', cursor: 'pointer'
                  }}
                >
                  <LogOut size={18} />
                  Logout Account
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="sidebar">
        <div style={{ marginBottom: '40px', padding: '0 12px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            Ishimo
          </h2>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {role} Portal
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {links.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <motion.button
                key={link.name}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(link.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  color: isActive ? activeAccent : 'var(--text-main)',
                  background: isActive ? 'var(--bg-elevated)' : 'transparent',
                  fontWeight: isActive ? 600 : 500,
                  textAlign: 'left',
                  width: '100%',
                  transition: 'var(--transition-smooth)'
                }}
              >
                {link.icon}
                {t(link.name)}
              </motion.button>
            );
          })}
        </div>

        {/* User avatar at the bottom */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', marginBottom: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: role === 'employer' ? 'rgba(212,175,55,0.15)' : 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {role === 'employer' ? <Briefcase size={16} color="var(--accent-gold)" /> : <User size={16} color="var(--accent-emerald)" />}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{role === 'employer' ? 'Employer' : 'Worker'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {localStorage.getItem('userId') || '—'}</div>
            </div>
          </div>
          <motion.button
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px', borderRadius: '8px', color: '#ef4444',
              background: 'transparent', fontWeight: 500,
              textAlign: 'left', width: '100%'
            }}
          >
            <LogOut size={20} />
            Logout
          </motion.button>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="mobile-bottom-nav">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <button
              key={link.name}
              onClick={() => navigate(link.path)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justify: 'center',
                gap: '3px',
                color: isActive ? activeAccent : 'var(--text-muted)',
                fontSize: '0.68rem',
                fontWeight: isActive ? 600 : 400,
                flex: 1,
                padding: '6px 0',
                background: 'none',
                border: 'none'
              }}
            >
              {React.cloneElement(link.icon, { size: 18, color: isActive ? activeAccent : 'var(--text-muted)' })}
              <span>{t(link.name)}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};

export default Sidebar;
