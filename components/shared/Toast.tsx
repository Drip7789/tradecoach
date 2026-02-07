'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

// Global toast state
let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

const notifyListeners = () => {
  toastListeners.forEach(listener => listener([...toasts]));
};

export const toast = {
  show: (type: ToastType, title: string, message?: string) => {
    const id = Date.now().toString();
    toasts = [...toasts, { id, type, title, message }];
    notifyListeners();
    
    // Auto dismiss after 4 seconds
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id);
      notifyListeners();
    }, 4000);
  },
  success: (title: string, message?: string) => toast.show('success', title, message),
  error: (title: string, message?: string) => toast.show('error', title, message),
  warning: (title: string, message?: string) => toast.show('warning', title, message),
  info: (title: string, message?: string) => toast.show('info', title, message),
};

export function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => setCurrentToasts(newToasts);
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);

  const dismiss = (id: string) => {
    toasts = toasts.filter(t => t.id !== id);
    notifyListeners();
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-indigo-400" />;
    }
  };

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case 'success': return 'border-l-emerald-500';
      case 'error': return 'border-l-red-500';
      case 'warning': return 'border-l-amber-500';
      default: return 'border-l-indigo-500';
    }
  };

  if (currentToasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-3 max-w-sm w-full pointer-events-none">
      {currentToasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto glass-card border-l-4 ${getBorderColor(t.type)} p-4 animate-slide-in`}
          style={{
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          <div className="flex items-start gap-3">
            {getIcon(t.type)}
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium">{t.title}</p>
              {t.message && <p className="text-slate-400 text-sm mt-1">{t.message}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

