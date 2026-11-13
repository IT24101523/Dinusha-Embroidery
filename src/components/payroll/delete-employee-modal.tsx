'use client';

import React, { useState } from 'react';
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
  'Resigned (ඉල්ලා අස්වීම)',
  'Terminated / Dismissed (සේවයෙන් පහ කිරීම)',
  'Left without notice / Deserted (දැනුම්දීමකින් තොරව සේවය හැරයාම)',
  'End of Contract (ගිවිසුම අවසන් වීම)',
  'Retirement (විශ්‍රාම යාම)',
  'Medical Reasons (අසනීප තත්ත්ව මත)',
  'Registration Error (වැරදි ලියාපදිංචියක්)',
  'Other (වෙනත් හේතුවක්)',
];

export function DeleteEmployeeModal({ employee, isOpen, onClose, onSuccess }: DeleteEmployeeModalProps) {
  const [reason, setReason] = useState<string>(DELETION_REASONS[0]);
  const [notes, setNotes] = useState<string>('');
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-rose-50 border-b border-rose-100 p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-950">
                Confirm Employee Removal (සේවකයා ඉවත් කිරීම)
              </h3>
              <p className="text-xs text-rose-700">
                Are you sure you want to remove this employee from active records?
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-rose-700 hover:bg-rose-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-sm text-slate-800">
          {/* Employee Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-indigo-700 uppercase">EPF No: {employee.epfNo}</span>
                <h4 className="text-base font-extrabold text-slate-900">{employee.fullName}</h4>
              </div>
              <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-800">
                {employee.role}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1 border-t border-slate-200/60 font-mono">
              <div>NIC: {employee.nic}</div>
              <div>Basic: LKR {employee.basicSalary.toLocaleString()}</div>
              {employee.joinedDate && <div>Joined: {employee.joinedDate}</div>}
              <div>Phone: {employee.phone || '-'}</div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Reason Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Reason for Removal (ඉවත් කිරීමට හේතුව) *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-medium border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500 bg-white"
            >
              {DELETION_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Notes / Comments */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Additional Details / Reference Notes (අමතර සටහන්)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Resignation letter submitted on 2026-10-15; handover completed."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500 bg-white"
            />
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50/60 border border-rose-200 cursor-pointer hover:bg-rose-50">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 mt-0.5 text-rose-600 rounded-sm focus:ring-rose-500"
            />
            <span className="text-xs font-medium text-rose-950">
              I have verified all personal file records and confirm the removal of <strong>{employee.fullName}</strong>.
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
          >
            Cancel (අවලංගු කරන්න)
          </button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={!confirmed || loading}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Confirm & Remove Employee
          </button>
        </div>
      </div>
    </div>
  );
}
