import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import './Toast.css';

const ToastContext = createContext(null);

let toastId = 0;

const icons = {
  success: <CheckCircle size={18} />,
  error: <AlertCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, title, message, exiting: false }]);

    if (duration > 0) {
      setTimeout(() => dismissToast(id), duration);
    }
    return id;
  }, [dismissToast]);

  const toast = useMemo(() => ({
    success: (title, message) => addToast({ type: 'success', title, message }),
    error: (title, message) => addToast({ type: 'error', title, message }),
    warning: (title, message) => addToast({ type: 'warning', title, message }),
    info: (title, message) => addToast({ type: 'info', title, message }),
  }), [addToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="db-toast-container" role="alert" aria-live="polite">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`db-toast db-toast--${t.type} ${t.exiting ? 'db-toast--exit' : ''}`}
          >
            <span className="db-toast__icon">{icons[t.type]}</span>
            <div className="db-toast__content">
              {t.title && <div className="db-toast__title">{t.title}</div>}
              {t.message && <div className="db-toast__message">{t.message}</div>}
            </div>
            <button className="db-toast__close" onClick={() => dismissToast(t.id)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export default ToastContext;
