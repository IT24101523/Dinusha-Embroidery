"use client";

import React, { ReactNode } from "react";
import { Portal } from "./portal";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "5xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = "lg",
}: ModalProps) {
  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
  }[maxWidth];

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div
          role="dialog"
          aria-modal="true"
          className={`bg-white rounded-2xl border border-slate-200 shadow-2xl w-full ${maxWidthClasses} max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200`}
        >
          {/* Fixed Header (shrink-0) */}
          <div className="shrink-0 px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="w-10 h-10 rounded-xl bg-persian-50 text-persian-800 border border-persian-200 flex items-center justify-center shrink-0">
                  {icon}
                </div>
              )}
              <div>
                <h3 className="font-extrabold text-slate-800 text-base leading-tight">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body (flex-1 min-h-0 overflow-y-auto) */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
            {children}
          </div>

          {/* Fixed Footer (shrink-0) */}
          {footer && (
            <div className="shrink-0 px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
