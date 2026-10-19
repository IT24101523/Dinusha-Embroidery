'use client';

import { Portal } from './portal';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, XCircle, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AlertDialogProps {
  open: boolean;
  title: string;
  message: string;
  variant?: 'success' | 'info' | 'warning' | 'error';
  onClose: () => void;
}

const variantConfig = {
  success: {
    icon: CheckCircle2,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  error: {
    icon: XCircle,
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
  },
};

export function AlertDialog({ open, title, message, variant = 'info', onClose }: AlertDialogProps) {
  if (!open) return null;

  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
          {/* Fixed Header */}
          <div className="flex items-center gap-3 p-6 pb-4 shrink-0">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', config.iconBg)}>
              <Icon className={cn('h-5 w-5', config.iconColor)} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
            <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
          </div>

          {/* Fixed Footer */}
          <div className="flex items-center justify-end p-6 pt-4 border-t border-slate-100 shrink-0">
            <Button variant="primary" onClick={onClose}>
              OK
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
