import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  onClose,
  duration = 4000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  let bg = 'bg-slate-900 text-white';
  let Icon = Info;

  if (type === 'success') {
    bg = 'bg-[#006D77] text-white border border-teal-400/40 shadow-lg';
    Icon = CheckCircle2;
  } else if (type === 'error') {
    bg = 'bg-rose-800 text-white border border-rose-600 shadow-lg';
    Icon = AlertCircle;
  } else if (type === 'warning') {
    bg = 'bg-amber-600 text-white border border-amber-400 shadow-lg';
    Icon = AlertCircle;
  }

  return (
    <div className="no-print toast-container fixed bottom-6 left-6 z-50 max-w-md w-full px-4 sm:px-0 pointer-events-auto animate-in slide-in-from-bottom-5 duration-200">
      <div className={`${bg} p-4 rounded-xl flex items-center justify-between gap-3 shadow-xl`}>
        <div className="flex items-center gap-2.5">
          <Icon className="w-5 h-5 shrink-0 text-[#D4AF37]" />
          <p className="text-xs sm:text-sm font-bold">{message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded-md transition-colors text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
