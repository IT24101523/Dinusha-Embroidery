"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Portal } from "./portal";
import { AlertCircle, CheckCircle2, HelpCircle, Info, X } from "lucide-react";

export type DialogVariant = "default" | "danger" | "warning" | "success" | "info";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
}

export interface AlertOptions {
  title: string;
  message: string;
  confirmText?: string;
  variant?: DialogVariant;
}

export interface ToastOptions {
  id: string;
  message: string;
  title?: string;
  variant?: DialogVariant;
}

interface DialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  showAlert: (options: AlertOptions) => Promise<void>;
  toast: (message: string, variant?: DialogVariant, title?: string) => void;
}

let globalDialog: DialogContextValue = {
  confirm: async () => false,
  showAlert: async () => {},
  toast: () => {},
};

export const dialog = {
  confirm: (options: ConfirmOptions) => globalDialog.confirm(options),
  showAlert: (options: AlertOptions) => globalDialog.showAlert(options),
  toast: (message: string, variant?: DialogVariant, title?: string) => globalDialog.toast(message, variant, title),
};

const DialogContext = createContext<DialogContextValue>(globalDialog);

export function useDialog() {
  return useContext(DialogContext);
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "confirm" | "alert";
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    variant: DialogVariant;
    resolve: (val: boolean) => void;
  } | null>(null);

  const [toasts, setToasts] = useState<ToastOptions[]>([]);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: "confirm",
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || "Confirm",
        cancelText: options.cancelText || "Cancel",
        variant: options.variant || "default",
        resolve,
      });
    });
  }, []);

  const showAlert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: "alert",
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || "OK",
        cancelText: "",
        variant: options.variant || "info",
        resolve: () => resolve(),
      });
    });
  }, []);

  const toast = useCallback((message: string, variant: DialogVariant = "info", title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, variant, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  globalDialog = { confirm, showAlert, toast };

  const handleClose = (choice: boolean) => {
    if (modalState) {
      modalState.resolve(choice);
      setModalState(null);
    }
  };

  const getVariantStyles = (variant: DialogVariant) => {
    switch (variant) {
      case "danger":
        return {
          icon: <AlertCircle className="w-6 h-6 text-rose-600" />,
          btn: "bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500",
          border: "border-rose-200",
          badge: "bg-rose-100 text-rose-700",
        };
      case "warning":
        return {
          icon: <HelpCircle className="w-6 h-6 text-amber-600" />,
          btn: "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500",
          border: "border-amber-200",
          badge: "bg-amber-100 text-amber-700",
        };
      case "success":
        return {
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
          btn: "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500",
          border: "border-emerald-200",
          badge: "bg-emerald-100 text-emerald-700",
        };
      case "info":
      default:
        return {
          icon: <Info className="w-6 h-6 text-persian-600" />,
          btn: "bg-persian-800 hover:bg-persian-700 text-white focus:ring-persian-500",
          border: "border-slate-200",
          badge: "bg-blue-100 text-persian-800",
        };
    }
  };

  return (
    <DialogContext.Provider value={{ confirm, showAlert, toast }}>
      {children}

      {/* Confirmation & Alert System Modal */}
      {modalState?.isOpen && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="shrink-0 p-5 border-b border-slate-100 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-100 shrink-0">
                  {getVariantStyles(modalState.variant).icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-slate-800 text-base leading-tight truncate">
                    {modalState.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-5 text-sm text-slate-600 leading-relaxed">
                {modalState.message}
              </div>

              <div className="shrink-0 p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
                {modalState.type === "confirm" && (
                  <button
                    type="button"
                    onClick={() => handleClose(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-sm"
                  >
                    {modalState.cancelText}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleClose(true)}
                  className={`px-5 py-2 rounded-xl text-xs font-extrabold shadow-sm transition-all ${getVariantStyles(modalState.variant).btn}`}
                >
                  {modalState.confirmText}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Toast Notification Container */}
      <Portal>
        <div className="fixed bottom-5 right-5 z-[99999] space-y-2 pointer-events-none max-w-sm w-full">
          {toasts.map((t) => {
            const styles = getVariantStyles(t.variant || "info");
            return (
              <div
                key={t.id}
                className="pointer-events-auto bg-white border border-slate-200 rounded-xl p-3.5 shadow-xl flex items-start gap-3 animate-in slide-in-from-bottom-3 duration-200"
              >
                <div className="shrink-0 mt-0.5">{styles.icon}</div>
                <div className="flex-1 min-w-0 text-xs">
                  {t.title && <div className="font-extrabold text-slate-800">{t.title}</div>}
                  <div className="text-slate-600 mt-0.5 font-medium">{t.message}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                  className="text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </Portal>
    </DialogContext.Provider>
  );
}
