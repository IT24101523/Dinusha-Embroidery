'use client';

import React, { useState, useEffect, useRef } from 'react';
import { EmployeeEntity } from '@/modules/payroll/domain/entities';
import { deleteEmployeeAction } from '@/actions/employees';
import { AlertTriangle, X, Trash2, Loader2 } from 'lucide-react';

interface DeleteEmployeeModalProps {
  employee: EmployeeEntity;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DELETION_REASONS = [
  'Resigned',
  'Terminated / Dismissed',
  'Left without notice / Deserted',
  'End of Contract',
  'Retirement',
  'Medical Reasons',
  'Registration Error',
  'Other',
];

export function DeleteEmployeeModal({
  employee,
  isOpen,
  onClose,
  onSuccess,
}: DeleteEmployeeModalProps) {
  const [reason, setReason] = useState<string>(DELETION_REASONS[0]);
  const [notes, setNotes] = useState<string>('');
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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

  const handleConfirmDelete = async () => {
    if (!reason) {
      setErrorMsg('Please select a valid reason for removal.');
      return;
    }
    if (!confirmed) {
      setErrorMsg('Please check the confirmation box to proceed.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const res = await deleteEmployeeAction(employee.id, reason, notes);
    setLoading(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to remove employee.');
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="delete-modal-title"
      onClose={onClose}
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-2xl border border-rose-200/90 bg-white p-0 shadow-2xl text-slate-900"
    >
      <div className="flex flex-col overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white p-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm border border-white/25 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="delete-modal-title" className="text-base font-bold text-white">
                Confirm Employee Removal
              </h3>
              <p className="text-xs text-rose-100 mt-0.5">
                Audit-logged deactivation from active factory payroll records
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close removal dialog"
            className="p-1.5 rounded-lg text-rose-100 hover:bg-white/15 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-sm text-slate-800">
          {/* Employee Profile Card */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {employee.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={employee.photoUrl}
                    alt={employee.fullName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center font-extrabold text-sm shrink-0">
                    {(employee.initials || employee.fullName || '?').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800">
                    EPF #{employee.epfNo}
                  </span>
                  <h4 className="text-base font-extrabold text-slate-900 truncate mt-0.5">
                    {employee.fullName}
                  </h4>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 shrink-0">
                {employee.role}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2.5 border-t border-slate-200/80 font-mono">
              <div>NIC: {employee.nic}</div>
              <div>Basic: LKR {employee.basicSalary.toLocaleString()}</div>
              {employee.joinedDate && <div>Joined: {employee.joinedDate}</div>}
              <div>Phone: {employee.phone || '-'}</div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Reason Selection */}
          <div className="space-y-1.5">
            <label
              htmlFor="removal-reason-select"
              className="block text-xs font-bold text-slate-700"
            >
              Reason for Removal *
            </label>
            <select
              id="removal-reason-select"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-medium border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500 bg-white"
            >
              {DELETION_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label
              htmlFor="removal-notes-input"
              className="block text-xs font-bold text-slate-700"
            >
              Additional Details / Reference Notes
            </label>
            <textarea
              id="removal-notes-input"
              rows={2}
              placeholder="e.g. Resignation letter submitted on 2026-10-15; handover completed."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500 bg-white"
            />
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50/70 border border-rose-200 cursor-pointer hover:bg-rose-50 transition">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 mt-0.5 text-rose-600 rounded-sm focus:ring-rose-500"
            />
            <span className="text-xs font-medium text-rose-950 leading-relaxed">
              I have verified all personal file records and confirm the removal of{' '}
              <strong>{employee.fullName}</strong>.
            </span>
          </label>
        </div>

        {/* Action Buttons — autoFocus on safe Cancel button per dialog accessibility */}
        <div className="bg-slate-50 border-t border-slate-200/80 px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={!confirmed || loading}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Confirm & Remove Employee
          </button>
        </div>
      </div>
    </dialog>
  );
}
