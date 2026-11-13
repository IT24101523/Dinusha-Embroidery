'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, KeyRound, X, AlertCircle, Loader2, Unlock } from 'lucide-react';

interface AdminUnlockModalProps {
  isOpen: boolean;
  employeeName: string;
  epfNo: number;
  month: string;
  netSalary?: number;
  loading?: boolean;
  errorMsg?: string | null;
  onClose: () => void;
  onConfirm: (adminPin: string, adminReason: string) => void | Promise<void>;
}

export function AdminUnlockModal({
  isOpen,
  employeeName,
  epfNo,
  month,
  netSalary,
  loading = false,
  errorMsg = null,
  onClose,
  onConfirm,
}: AdminUnlockModalProps) {
  const [adminPin, setAdminPin] = useState<string>('');
  const [adminReason, setAdminReason] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.setAttribute('closedby', 'any');

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }

    if (!('closedBy' in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const isOutside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        );
      };
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e)) {
          onClose();
        }
        pressedOutside = false;
      };
      dialog.addEventListener('pointerdown', onPointerDown);
      dialog.addEventListener('pointerup', onPointerUp);
      return () => {
        dialog.removeEventListener('pointerdown', onPointerDown);
        dialog.removeEventListener('pointerup', onPointerUp);
      };
    }
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!adminPin.trim()) {
      setLocalError('Please enter the Admin Authorization PIN.');
      return;
    }
    if (adminReason.trim().length < 3) {
      setLocalError('Please provide an authorization reason (at least 3 characters).');
      return;
    }
    onConfirm(adminPin.trim(), adminReason.trim());
  };

  const displayError = errorMsg || localError;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="admin-unlock-title"
      onClose={onClose}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-amber-200/90 bg-white p-0 shadow-2xl text-slate-900"
    >
      <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/35 text-amber-300 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="admin-unlock-title" className="text-base font-bold text-white">
                Admin Authorization Required
              </h3>
              <p className="text-xs text-amber-200/90 mt-0.5">
                Unlock paid &amp; locked salary record for modifications
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authorization dialog"
            className="p-1.5 rounded-lg text-slate-300 hover:bg-white/15 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-sm text-slate-800">
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800">
                EPF #{epfNo}
              </span>
              <span className="text-xs font-semibold text-slate-500">{month}</span>
            </div>
            <div className="font-extrabold text-slate-900 text-sm">{employeeName}</div>
            {typeof netSalary === 'number' && (
              <div className="text-xs font-mono text-emerald-700 font-bold">
                Paid Net Salary: LKR{' '}
                {netSalary.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            )}
          </div>

          {displayError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="admin-unlock-pin"
                className="block text-xs font-bold text-slate-700 flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                Admin Authorization PIN *
              </label>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                Default PIN: 1234
              </span>
            </div>
            <input
              id="admin-unlock-pin"
              type="password"
              inputMode="numeric"
              placeholder="Enter Admin PIN"
              value={adminPin}
              onChange={(e) => {
                setAdminPin(e.target.value);
                setLocalError(null);
              }}
              className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="admin-unlock-reason"
              className="block text-xs font-bold text-slate-700"
            >
              Reason for Reopening Paid Salary *
            </label>
            <textarea
              id="admin-unlock-reason"
              rows={2}
              placeholder="e.g. Missed 4 hours OT correction approved by Management"
              value={adminReason}
              onChange={(e) => {
                setAdminReason(e.target.value);
                setLocalError(null);
              }}
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200/80 px-5 py-3.5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
            Authorize &amp; Unlock Salary
          </button>
        </div>
      </form>
    </dialog>
  );
}

