'use client';

import React, { useState } from 'react';
import { EmployeeEntity } from '@/modules/payroll/domain/entities';
import { EmployeeFormData } from '@/modules/payroll/domain/validation';
import { saveEmployeeAction } from '@/actions/employees';
import { DeleteEmployeeModal } from './delete-employee-modal';
import {
  UserPlus,
  Pencil,
  Trash2,
  FileCheck,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface EmployeeCrudProps {
  initialEmployees: EmployeeEntity[];
  onEmployeesChange?: () => void;
}

const DEFAULT_FORM: EmployeeFormData = {
  epfNo: 0,
  initials: '',
  surname: '',
  fullName: '',
  dob: '',
  gender: 'Male',
  nic: '',
  address: '',
  phone: '',
  emergencyPhone: '',
  role: 'Embroidery Machine Operator',
  department: 'නිෂ්පාදන අංශය',
  grade: 'Grade A',
  bankName: 'BOC',
  accountNo: '',
  basicSalary: 30000,
  joinedDate: '',
  hasNicCopy: false,
  hasBirthCertificate: false,
  hasGramasewakaCert: false,
  hasPoliceReport: false,
  hasMedicalReport: false,
  hasAppointmentLetter: false,
  isActive: true,
};

const JOB_ROLES = [
  'Production Supervisor',
  'Embroidery Machine Operator',
  'Machine Helper',
  'Final quality Checker',
  'Checker',
  'Trimmer',
  'Maintenance Technician',
  'Packing Staff',
  'HR Assistant',
];

export function EmployeeCrud({ initialEmployees, onEmployeesChange }: EmployeeCrudProps) {
  const [employees, setEmployees] = useState<EmployeeEntity[]>(initialEmployees);
  const [formData, setFormData] = useState<EmployeeFormData>(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<EmployeeEntity | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setEditingId(null);
    setStatusMsg(null);
  };

  const handleEdit = (emp: EmployeeEntity) => {
    setEditingId(emp.id);
    setFormData({
      epfNo: emp.epfNo,
      initials: emp.initials || '',
      surname: emp.surname || '',
      fullName: emp.fullName,
      dob: emp.dob || '',
      gender: emp.gender || 'Male',
      nic: emp.nic,
      address: emp.address || '',
      phone: emp.phone || '',
      emergencyPhone: emp.emergencyPhone || '',
      role: emp.role,
      department: emp.department || 'නිෂ්පාදන අංශය',
      grade: emp.grade || 'Grade A',
      bankName: emp.bankName || 'BOC',
      accountNo: emp.accountNo || '',
      basicSalary: emp.basicSalary,
      joinedDate: emp.joinedDate || '',
      hasNicCopy: emp.hasNicCopy,
      hasBirthCertificate: emp.hasBirthCertificate,
      hasGramasewakaCert: emp.hasGramasewakaCert,
      hasPoliceReport: emp.hasPoliceReport,
      hasMedicalReport: emp.hasMedicalReport,
      hasAppointmentLetter: emp.hasAppointmentLetter,
      isActive: emp.isActive,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteSuccess = () => {
    if (!employeeToDelete) return;
    const removedName = employeeToDelete.fullName;
    setEmployees((prev) => prev.filter((e) => e.id !== employeeToDelete.id));
    setStatusMsg({ type: 'success', text: `Employee "${removedName}" has been removed with documented reason.` });
    if (editingId === employeeToDelete.id) resetForm();
    if (onEmployeesChange) onEmployeesChange();
    setEmployeeToDelete(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    const res = await saveEmployeeAction(formData, editingId || undefined);
    setLoading(false);

    if (res.success && res.employee) {
      const saved = res.employee;
      if (editingId) {
        setEmployees((prev) => prev.map((e) => (e.id === editingId ? saved : e)));
        setStatusMsg({ type: 'success', text: `Employee ${saved.fullName} updated successfully.` });
      } else {
        setEmployees((prev) => [...prev, saved].sort((a, b) => a.epfNo - b.epfNo));
        setStatusMsg({ type: 'success', text: `Employee ${saved.fullName} registered successfully.` });
      }
      resetForm();
      if (onEmployeesChange) onEmployeesChange();
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Failed to save employee.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">EMPLOYEE MASTER CRUD</h1>
            <p className="text-xs text-slate-500">
              Staff Management, Document Compliance Checklist & Joined Dates
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Total Employees: {employees.length}
          </span>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-lg text-sm flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Grid: Left Form (Image 1 replica + extra fields), Right Directory Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form: 5 cols */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 font-semibold text-slate-800 text-sm uppercase tracking-wider">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              {editingId ? 'Edit Employee Record' : 'Register / Edit Employee'}
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                Clear edit mode
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Initials & Surname */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initials (මුලකුරු) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. G.A.S.N."
                  value={formData.initials || ''}
                  onChange={(e) => {
                    const initials = e.target.value;
                    const surname = formData.surname || '';
                    const fullName = surname ? `${initials} ${surname}`.trim() : initials;
                    setFormData({ ...formData, initials, fullName });
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Surname (වාසගම) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kumara"
                  value={formData.surname || ''}
                  onChange={(e) => {
                    const surname = e.target.value;
                    const initials = formData.initials || '';
                    const fullName = initials ? `${initials} ${surname}`.trim() : surname;
                    setFormData({ ...formData, surname, fullName });
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. G.A.S.N. Kumara"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            {/* Date of Birth & Gender */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  value={formData.dob || ''}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gender *
                </label>
                <select
                  value={formData.gender || 'Male'}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* NIC & EPF No */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NIC Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 921450123V"
                  value={formData.nic}
                  onChange={(e) => setFormData({ ...formData, nic: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  EPF No *
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 17"
                  value={formData.epfNo || ''}
                  onChange={(e) => setFormData({ ...formData, epfNo: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Address *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Weliweriya, Gampaha"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            {/* Phone & Emergency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 0760958645"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Emergency Contact *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 0332258961"
                  value={formData.emergencyPhone || ''}
                  onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>

            {/* Job Role */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Job Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {JOB_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Basic Salary & Date of Joining ("wadata apu dawasa") */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Basic Salary (LKR) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step={500}
                  placeholder="37000"
                  value={formData.basicSalary || ''}
                  onChange={(e) => setFormData({ ...formData, basicSalary: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm font-semibold text-slate-900 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-indigo-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Date of Joining (වැඩට ආපු දවස)
                </label>
                <input
                  type="date"
                  value={formData.joinedDate || ''}
                  onChange={(e) => setFormData({ ...formData, joinedDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-indigo-200 bg-indigo-50/30 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Bank details for Payslip */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank (සේවක බැංකුව)
                </label>
                <input
                  type="text"
                  placeholder="e.g. BOC / Peoples / Commercial"
                  value={formData.bankName || ''}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account No (ගිණුම් අංකය)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 8452109823"
                  value={formData.accountNo || ''}
                  onChange={(e) => setFormData({ ...formData, accountNo: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>

            {/* Personal File Compliance Checklist (Tick boxes as requested) */}
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wide">
                <FileCheck className="w-4 h-4 text-amber-700" />
                Personal File Document Checklist (පුද්ගලික ලිපිගොනු පිරික්සුම)
              </div>
              <p className="text-[11px] text-amber-700">
                Tick each document verified and kept in the physical employee personal file:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-1.5 rounded-md bg-white border border-amber-200 cursor-pointer hover:bg-amber-50/50">
                  <input
                    type="checkbox"
                    checked={formData.hasNicCopy}
                    onChange={(e) => setFormData({ ...formData, hasNicCopy: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded-sm"
                  />
                  <span className="text-slate-800 font-medium">NIC / ID Copy</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded-md bg-white border border-amber-200 cursor-pointer hover:bg-amber-50/50">
                  <input
                    type="checkbox"
                    checked={formData.hasBirthCertificate}
                    onChange={(e) => setFormData({ ...formData, hasBirthCertificate: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded-sm"
                  />
                  <span className="text-slate-800 font-medium">Birth Certificate (උප්පැන්න)</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded-md bg-white border border-amber-200 cursor-pointer hover:bg-amber-50/50">
                  <input
                    type="checkbox"
                    checked={formData.hasGramasewakaCert}
                    onChange={(e) => setFormData({ ...formData, hasGramasewakaCert: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded-sm"
                  />
                  <span className="text-slate-800 font-medium">Grama Niladhari Cert</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded-md bg-white border border-amber-200 cursor-pointer hover:bg-amber-50/50">
                  <input
                    type="checkbox"
                    checked={formData.hasPoliceReport}
                    onChange={(e) => setFormData({ ...formData, hasPoliceReport: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded-sm"
                  />
                  <span className="text-slate-800 font-medium">Police Report</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded-md bg-white border border-amber-200 cursor-pointer hover:bg-amber-50/50">
                  <input
                    type="checkbox"
                    checked={formData.hasMedicalReport}
                    onChange={(e) => setFormData({ ...formData, hasMedicalReport: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded-sm"
                  />
                  <span className="text-slate-800 font-medium">Medical Certificate</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded-md bg-white border border-amber-200 cursor-pointer hover:bg-amber-50/50">
                  <input
                    type="checkbox"
                    checked={formData.hasAppointmentLetter}
                    onChange={(e) => setFormData({ ...formData, hasAppointmentLetter: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded-sm"
                  />
                  <span className="text-slate-800 font-medium">Appointment Letter</span>
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-slate-900 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editingId ? 'Update Employee' : 'Save Employee'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-sm hover:bg-slate-100 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Right Directory Table: 7 cols (Matches Image 1) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
              Registered Employee Directory
            </h2>
            <span className="text-xs text-slate-500">Sorted by EPF No</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">EPF</th>
                  <th className="py-2.5 px-3">NAME & NIC</th>
                  <th className="py-2.5 px-3">ROLE</th>
                  <th className="py-2.5 px-3">PHONE</th>
                  <th className="py-2.5 px-3">DOCS</th>
                  <th className="py-2.5 px-3 text-right">BASIC SALARY</th>
                  <th className="py-2.5 px-3 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => {
                  const docCount = [
                    emp.hasNicCopy,
                    emp.hasBirthCertificate,
                    emp.hasGramasewakaCert,
                    emp.hasPoliceReport,
                    emp.hasMedicalReport,
                    emp.hasAppointmentLetter,
                  ].filter(Boolean).length;

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition group">
                      <td className="py-3 px-3 font-bold text-slate-900">{emp.epfNo}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{emp.fullName}</div>
                        {(emp.surname || emp.initials) && (
                          <div className="text-[10px] text-slate-500">
                            {emp.surname && <span className="font-bold text-slate-700">{emp.surname}</span>}
                            {emp.surname && emp.initials && <span> </span>}
                            {emp.initials && <span className="tracking-wide text-slate-600">({emp.initials})</span>}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500">{emp.nic}</div>
                        {emp.joinedDate && (
                          <div className="text-[10px] text-indigo-600 font-mono">
                            Joined: {emp.joinedDate}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700">
                          {emp.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                        {emp.phone || '-'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-bold ${
                            docCount === 6
                              ? 'bg-emerald-100 text-emerald-800'
                              : docCount >= 3
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                          title={`${docCount}/6 Personal file documents verified`}
                        >
                          <FileCheck className="w-3 h-3" />
                          {docCount}/6
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        LKR {emp.basicSalary.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEdit(emp)}
                            className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 transition"
                            title="Edit Employee"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEmployeeToDelete(emp)}
                            className="p-1.5 rounded-md hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition"
                            title="Delete Employee (Reason Required)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Dedicated Deletion Confirmation Modal */}
      {employeeToDelete && (
        <DeleteEmployeeModal
          employee={employeeToDelete}
          isOpen={!!employeeToDelete}
          onClose={() => setEmployeeToDelete(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}
