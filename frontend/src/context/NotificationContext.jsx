import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

const POLL_INTERVAL = 15000; // 15 seconds

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const intervalRef = useRef(null);

  const userId = localStorage.getItem('userId');

  const fetchNotifications = useCallback(async () => {
    const id = localStorage.getItem('userId');
    if (!id) return;
    try {
      const res = await fetch(`http://localhost:3000/api/notifications/${id}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {
      // silently fail — don't interrupt the UI for a poll failure
    }
  }, []);

  // Start polling when userId exists
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }

    fetchNotifications(); // immediate first fetch

    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [userId, fetchNotifications]);

  const markRead = useCallback(async (id) => {
    try {
      await fetch(`http://localhost:3000/api/notifications/${id}/read`, { method: 'PUT' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
    } catch {
      // ignore
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const id = localStorage.getItem('userId');
    if (!id) return;
    try {
      await fetch(`http://localhost:3000/api/notifications/${id}/read-all`, { method: 'PUT' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch {
      // ignore
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, refetch: fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};
