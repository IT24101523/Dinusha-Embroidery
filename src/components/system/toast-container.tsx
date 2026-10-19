'use client';

import { Portal } from './portal';
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  title?: string;
  exiting?: boolean;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const variantConfig = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-emerald-50 border-emerald-200',
    iconColor: 'text-emerald-600',
    titleColor: 'text-emerald-800',
  },
  error: {
    icon: XCircle,
    bg: 'bg-rose-50 border-rose-200',
    iconColor: 'text-rose-600',
    titleColor: 'text-rose-800',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 border-amber-200',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-800',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-800',
  },
};

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <Portal>
      <div className="fixed top-4 right-4 z-[10000] flex flex-col gap-2 w-80">
        {toasts.map((toast) => {
          const config = variantConfig[toast.variant];
          const Icon = config.icon;

          return (
            <div
              key={toast.id}
              className={cn(
                'flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all',
                config.bg,
                toast.exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
              )}
            >
              <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', config.iconColor)} />
              <div className="flex-1 min-w-0">
                {toast.title && (
                  <p className={cn('text-sm font-bold', config.titleColor)}>{toast.title}</p>
                )}
                <p className="text-sm text-slate-700">{toast.message}</p>
              </div>
              <button
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </Portal>
  );
}
