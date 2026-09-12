import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Briefcase, CheckCircle, XCircle, Check, BellOff } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

const TYPE_META = {
  job_request: {
    icon: <Briefcase size={16} />,
    color: 'var(--accent-gold)',
    bg: 'rgba(212,175,55,0.12)',
    label: 'Job Request',
  },
  request_response: {
    icon: <CheckCircle size={16} />,
    color: 'var(--accent-emerald)',
    bg: 'rgba(16,185,129,0.12)',
    label: 'Response',
  },
  new_application: {
    icon: <Bell size={16} />,
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.12)',
    label: 'Application',
  },
};

const timeAgo = (dateStr) => {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const NotificationPanel = ({ isOpen, onClose, accentColor }) => {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: '64px',
            right: '12px',
            width: 'min(380px, calc(100vw - 24px))',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            zIndex: 5000,
            overflow: 'hidden',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 18px',
            borderBottom: '1px solid var(--border-color)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={18} color={accentColor} />
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>Notifications</span>
              {unreadCount > 0 && (
                <span style={{
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  borderRadius: '50%',
                  minWidth: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  color: accentColor,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '6px',
                }}
              >
                <Check size={13} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 24px',
                gap: '12px',
                color: 'var(--text-muted)',
              }}>
                <BellOff size={36} color="var(--text-muted)" strokeWidth={1.5} />
                <p style={{ fontSize: '0.9rem', textAlign: 'center', lineHeight: 1.5 }}>
                  You're all caught up!<br />No notifications yet.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const meta = TYPE_META[n.type] || TYPE_META.new_application;
                const unread = !n.is_read;
                return (
                  <motion.div
                    key={n.id}
                    whileHover={{ backgroundColor: 'var(--bg-elevated)' }}
                    onClick={() => { if (unread) markRead(n.id); }}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '14px 18px',
                      borderBottom: '1px solid var(--border-color)',
                      cursor: unread ? 'pointer' : 'default',
                      background: unread ? 'rgba(255,255,255,0.02)' : 'transparent',
                      transition: 'background 0.15s',
                      position: 'relative',
                    }}
                  >
                    {/* Unread dot */}
                    {unread && (
                      <span style={{
                        position: 'absolute',
                        top: '18px',
                        left: '6px',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#ef4444',
                      }} />
                    )}

                    {/* Type icon */}
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      background: meta.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: meta.color,
                      marginLeft: '6px',
                    }}>
                      {meta.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: meta.color,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '2px',
                      }}>
                        {meta.label}
                      </div>
                      <p style={{
                        fontSize: '0.85rem',
                        color: unread ? 'var(--text-main)' : 'var(--text-muted)',
                        lineHeight: 1.45,
                        fontWeight: unread ? 500 : 400,
                        margin: 0,
                      }}>
                        {n.message}
                      </p>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationPanel;
