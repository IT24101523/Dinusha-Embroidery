'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Phone,
  CreditCard,
  Building,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Factory,
} from 'lucide-react';
import {
  fetchEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  DbEmployee,
} from '@/actions/employees';

const ROLES = [
  'Embroidery Machine Operator',
  'Machine Helper',
  'Production Supervisor',
  'Embroidery Technician',
  'Quality Controller (QC)',
  'Sample & Pattern Maker',
  'Trimmer & Finisher',
  'Storekeeper / Dispatch',
];

export default function EmployeeRegistrationPage() {
  const [employees, setEmployees] = useState<DbEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form Fields
  const [formEpf, setFormEpf] = useState<number>(1);
  const [formName, setFormName] = useState('');
  const [formNic, setFormNic] = useState('');
  const [formRole, setFormRole] = useState(ROLES[0]);
  const [formPhone, setFormPhone] = useState('');
  const [formEmergencyPhone, setFormEmergencyPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formDob, setFormDob] = useState('');
  const [formGender, setFormGender] = useState('Male');
  const [formBasicSalary, setFormBasicSalary] = useState<number>(37000);
  const [formIsActive, setFormIsActive] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchEmployees();
      setEmployees(data);
      // Auto-suggest next EPF number
      if (data.length > 0) {
        const maxEpf = Math.max(...data.map((e) => e.epf_no || 0));
        setFormEpf(maxEpf + 1);
      } else {
        setFormEpf(1);
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormError('');
    if (employees.length > 0) {
      const maxEpf = Math.max(...employees.map((e) => e.epf_no || 0));
      setFormEpf(maxEpf + 1);
    } else {
      setFormEpf(1);
    }
    setFormName('');
    setFormNic('');
    setFormRole(ROLES[0]);
    setFormPhone('');
    setFormEmergencyPhone('');
    setFormAddress('');
    setFormDob('');
    setFormGender('Male');
    setFormBasicSalary(37000);
    setFormIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (emp: DbEmployee) => {
    setEditingId(emp.id);
    setFormError('');
    setFormEpf(emp.epf_no);
    setFormName(emp.full_name);
    setFormNic(emp.nic);
    setFormRole(emp.role);
    setFormPhone(emp.phone || '');
    setFormEmergencyPhone(emp.emergency_phone || '');
    setFormAddress(emp.address || '');
    setFormDob(emp.dob || '');
    setFormGender(emp.gender || 'Male');
    setFormBasicSalary(Number(emp.basic_salary) || 0);
    setFormIsActive(emp.is_active);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim() || !formNic.trim()) {
      setFormError('Full Name and NIC are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateEmployee(editingId, {
          epf_no: formEpf,
          full_name: formName.trim(),
          nic: formNic.trim(),
          role: formRole,
          phone: formPhone.trim() || null,
          emergency_phone: formEmergencyPhone.trim() || null,
          address: formAddress.trim() || null,
          dob: formDob || null,
          gender: formGender,
          basic_salary: formBasicSalary,
          is_active: formIsActive,
        });
      } else {
        await createEmployee({
          epf_no: formEpf,
          full_name: formName.trim(),
          nic: formNic.trim(),
          role: formRole,
          phone: formPhone.trim() || null,
          emergency_phone: formEmergencyPhone.trim() || null,
          address: formAddress.trim() || null,
          dob: formDob || null,
          gender: formGender,
          basic_salary: formBasicSalary,
          is_active: formIsActive,
        });
      }
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove employee "${name}"?`)) return;
    try {
      await deleteEmployee(id);
      await loadData();
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    }
  };

  // Filtered employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.epf_no.toString().includes(searchQuery) ||
      emp.nic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.phone && emp.phone.includes(searchQuery));

    const matchesRole = selectedRole === 'ALL' || emp.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const totalCount = employees.length;
  const operatorCount = employees.filter((e) =>
    e.role.toLowerCase().includes('operator')
  ).length;
  const helperCount = employees.filter((e) =>
    e.role.toLowerCase().includes('helper')
  ).length;
  const activeCount = employees.filter((e) => e.is_active).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-persian-50 text-persian-700 flex items-center justify-center font-bold shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base uppercase text-slate-800 tracking-tight">
                Employee Registration & Staff Roster
              </h3>
              <span className="text-[10px] bg-persian-100 text-persian-800 font-extrabold px-2.5 py-0.5 rounded-full">
                {activeCount} Active
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Register factory staff, operators & helpers for production assignment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <Link
            href="/production"
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
          >
            <Factory className="w-4 h-4 text-persian-700" />
            <span>Go to Production Planning</span>
          </Link>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-persian-800 hover:bg-persian-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-persian-800/20 transition-all hover:scale-102"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            <span>Register New Employee</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
            Total Registered
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-800">{totalCount}</span>
            <span className="text-[11px] text-slate-500 font-semibold">Staff members</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-persian-600 tracking-wider block">
            Machine Operators
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-persian-700">{operatorCount}</span>
            <span className="text-[11px] text-persian-600 font-semibold">Tajima/Barudan</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-amber-600 tracking-wider block">
            Machine Helpers
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-600">{helperCount}</span>
            <span className="text-[11px] text-amber-700 font-semibold">Framing / Trimming</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-emerald-600 tracking-wider block">
            Active Duty Status
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-600">{activeCount}</span>
            <span className="text-[11px] text-emerald-700 font-semibold">Available for Shifts</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by EPF No, Name, NIC, or Phone..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-persian-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-bold text-slate-500 shrink-0">Role Filter:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:border-persian-500"
            >
              <option value="ALL">All Roles ({employees.length})</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r} ({employees.filter((e) => e.role === r).length})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Employee List Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-persian-600" />
            <span>Loading employee records from database...</span>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No employees found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || selectedRole !== 'ALL'
                ? 'Try clearing your search query or role filter.'
                : 'Click "Register New Employee" to register your first factory staff member.'}
            </p>
            {!searchQuery && selectedRole === 'ALL' && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 bg-persian-800 text-white font-bold text-xs px-4 py-2 rounded-xl mt-2"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register Employee</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">EPF No</th>
                  <th className="py-3.5 px-4">Full Name</th>
                  <th className="py-3.5 px-4">Role / Designation</th>
                  <th className="py-3.5 px-4">NIC Number</th>
                  <th className="py-3.5 px-4">Contact Phone</th>
                  <th className="py-3.5 px-4">Basic Salary</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredEmployees.map((emp) => {
                  const isOperator = emp.role.toLowerCase().includes('operator');
                  const isHelper = emp.role.toLowerCase().includes('helper');
                  const isSupervisor = emp.role.toLowerCase().includes('supervisor');

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-persian-800">
                        #{emp.epf_no.toString().padStart(3, '0')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{emp.full_name}</div>
                        {emp.address && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">
                            {emp.address}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${
                            isOperator
                              ? 'bg-persian-50 text-persian-700 border border-persian-200'
                              : isHelper
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : isSupervisor
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {emp.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {emp.nic}
                      </td>
                      <td className="py-3 px-4 text-[11px]">
                        {emp.phone ? (
                          <span className="flex items-center gap-1.5 text-slate-800 font-semibold">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {emp.phone}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not set</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        LKR {Number(emp.basic_salary).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        {emp.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(emp)}
                            className="p-1.5 text-slate-500 hover:text-persian-700 hover:bg-persian-50 rounded-lg transition-colors"
                            title="Edit Employee"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(emp.id, emp.full_name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Employee"
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
        )}
      </div>

      {/* Modal: Register / Edit Employee */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-persian-50 text-persian-700 flex items-center justify-center font-bold">
                  {editingId ? <Edit2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase text-slate-900">
                    {editingId ? 'Edit Employee Details' : 'Register New Employee'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Saves directly to factory staff registry
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    EPF Number *
                  </label>
                  <input
                    type="number"
                    value={formEpf}
                    onChange={(e) => setFormEpf(parseInt(e.target.value) || 0)}
                    required
                    min={1}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold outline-none focus:border-persian-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    NIC Number *
                  </label>
                  <input
                    type="text"
                    value={formNic}
                    onChange={(e) => setFormNic(e.target.value)}
                    required
                    placeholder="e.g. 199423401234 or 942340123V"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono outline-none focus:border-persian-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  placeholder="e.g. K. A. Nimal Perera"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-persian-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Designation / Role *
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-persian-500"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Basic Salary (LKR)
                  </label>
                  <input
                    type="number"
                    value={formBasicSalary}
                    onChange={(e) => setFormBasicSalary(parseFloat(e.target.value) || 0)}
                    min={0}
                    step={500}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold outline-none focus:border-persian-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. 077 123 4567"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-persian-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Emergency Phone
                  </label>
                  <input
                    type="tel"
                    value={formEmergencyPhone}
                    onChange={(e) => setFormEmergencyPhone(e.target.value)}
                    placeholder="e.g. 071 987 6543"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-persian-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Residential Address
                </label>
                <textarea
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  rows={2}
                  placeholder="e.g. No. 45, Temple Road, Weliweriya"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:border-persian-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-center">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formDob}
                    onChange={(e) => setFormDob(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-persian-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-persian-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Duty Status
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-4 h-4 text-persian-600 rounded"
                    />
                    <span className="text-xs font-bold text-slate-800">Active Staff</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold p-3 rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-persian-800 hover:bg-persian-700 text-white font-bold p-3 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-persian-800/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'Saving...'
                    : editingId
                    ? 'Update Employee'
                    : 'Register Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
