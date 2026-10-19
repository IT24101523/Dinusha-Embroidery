'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { ConfirmDialog } from './confirm-dialog';
import { AlertDialog } from './alert-dialog';
import { ToastContainer, type ToastItem, type ToastVariant } from './toast-container';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'info' | 'warning' | 'danger';
}

interface AlertOptions {
  title: string;
  message: string;
  variant?: 'success' | 'info' | 'warning' | 'error';
}

interface DialogContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  showAlert: (options: AlertOptions) => Promise<void>;
  toast: (message: string, variant?: ToastVariant, title?: string) => void;
}

const DialogContext = createContext<DialogContextType | null>(null);

export function useDialog(): DialogContextType {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [confirmState, setConfirmState] = useState<ConfirmOptions & { open: boolean }>({
    open: false,
    title: '',
    message: '',
  });
  const confirmResolveRef = useRef<((value: boolean) => void) | null>(null);

  const [alertState, setAlertState] = useState<AlertOptions & { open: boolean }>({
    open: false,
    title: '',
    message: '',
  });
  const alertResolveRef = useRef<(() => void) | null>(null);

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmState({ ...options, open: true });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    confirmResolveRef.current?.(true);
    setConfirmState((prev) => ({ ...prev, open: false }));
  }, []);

  const handleConfirmCancel = useCallback(() => {
    confirmResolveRef.current?.(false);
    setConfirmState((prev) => ({ ...prev, open: false }));
  }, []);

  const showAlert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      alertResolveRef.current = resolve;
      setAlertState({ ...options, open: true });
    });
  }, []);

  const handleAlertClose = useCallback(() => {
    alertResolveRef.current?.();
    setAlertState((prev) => ({ ...prev, open: false }));
  }, []);

  const toast = useCallback((message: string, variant: ToastVariant = 'info', title?: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, variant, title }]);

    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 250);
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250);
  }, []);

  return (
    <DialogContext.Provider value={{ confirm, showAlert, toast }}>
      {children}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        variant={confirmState.variant}
        onConfirm={handleConfirm}
        onCancel={handleConfirmCancel}
      />
      <AlertDialog
        open={alertState.open}
        title={alertState.title}
        message={alertState.message}
        variant={alertState.variant}
        onClose={handleAlertClose}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </DialogContext.Provider>
  );
}
