import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const confirmAction = useCallback(({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning' }) => {
    return new Promise((resolve) => {
      setConfirmModal({
        title,
        message,
        confirmText,
        cancelText,
        type,
        onConfirm: () => {
          setConfirmModal(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmModal(null);
          resolve(false);
        }
      });
    });
  }, []);

  const getToastStyle = (type) => {
    switch (type) {
      case 'success':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: 'var(--accent-emerald)',
          icon: <CheckCircle size={20} color="var(--accent-emerald)" />
        };
      case 'error':
        return {
          bg: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#ef4444',
          icon: <AlertCircle size={20} color="#ef4444" />
        };
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          color: '#f59e0b',
          icon: <AlertTriangle size={20} color="#f59e0b" />
        };
      default:
        return {
          bg: 'rgba(212, 175, 55, 0.15)',
          border: '1px solid rgba(212, 175, 55, 0.4)',
          color: 'var(--accent-gold)',
          icon: <Info size={20} color="var(--accent-gold)" />
        };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, confirmAction }}>
      {children}

      {/* Floating Toasts Container */}
      <div style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '380px',
        width: 'calc(100% - 48px)',
        pointerEvents: 'none'
      }}>
        <AnimatePresence>
          {toasts.map((toast) => {
            const style = getToastStyle(toast.type);
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className="glass-panel"
                style={{
                  background: style.bg,
                  border: style.border,
                  padding: '14px 18px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: style.color,
                  fontWeight: 500,
                  fontSize: '0.92rem',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(16px)',
                  pointerEvents: 'auto'
                }}
              >
                {style.icon}
                <span style={{ flex: 1, color: 'var(--text-main)', lineHeight: 1.4 }}>{toast.message}</span>
                <button
                  onClick={() => removeToast(toast.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                >
                  <X size={16} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Styled Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={confirmModal.onCancel}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(6px)',
                zIndex: 10000
              }}
            />
            {/* Centering wrapper — keeps translate(-50%,-50%) away from Framer Motion */}
            <div
              style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10001,
                padding: '16px',
                pointerEvents: 'none'
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="glass-panel"
                style={{
                  padding: '32px',
                  maxWidth: '440px',
                  width: '100%',
                  borderRadius: '16px',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
                  textAlign: 'center',
                  pointerEvents: 'auto'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <div style={{ padding: '14px', borderRadius: '50%', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)' }}>
                    <AlertTriangle size={32} color="var(--accent-gold)" />
                  </div>
                </div>

                <h3 style={{ fontSize: '1.4rem', marginBottom: '10px', color: 'var(--text-main)' }}>{confirmModal.title}</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '28px', fontSize: '0.95rem', lineHeight: 1.5 }}>{confirmModal.message}</p>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    className="btn-outline"
                    onClick={confirmModal.onCancel}
                    style={{ flex: 1, padding: '12px' }}
                  >
                    {confirmModal.cancelText}
                  </button>
                  <button
                    className="btn-premium"
                    onClick={confirmModal.onConfirm}
                    style={{ flex: 1, padding: '12px' }}
                  >
                    {confirmModal.confirmText}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};
