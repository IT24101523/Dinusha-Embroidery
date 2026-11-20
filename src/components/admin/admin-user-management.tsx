'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ErpUserAccountEntity,
  ErpAuditLogEntity,
  ErpApprovalRequestEntity,
  ApprovalRequestKind,
  ApprovalRequestStatus,
  fetchAdminUsersAndLogsAction,
  createErpUserAction,
  updateErpUserAction,
  adminResetUserPasswordAction,
  deleteErpUserAction,
  resolveApprovalRequestAction,
} from '@/actions/admin-users';
import {
  ALL_ERP_MODULES,
  ROLE_DEFAULT_MODULES,
  ROLE_LABELS,
  type ErpModuleId,
} from '@/lib/rbac';
import type { UserRole } from '@/db/schema/users';
import {
  ShieldAlert,
  Users,
  History,
  PlusCircle,
  Pencil,
  Trash2,
  KeyRound,
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Lock,
  Unlock,
  ClipboardCheck,
  XCircle,
  Clock,
} from 'lucide-react';

export type AdminSubTab = 'users' | 'requests' | 'audit';

export const LOCAL_APPROVAL_REQUESTS_KEY = 'dinusha_admin_approval_requests_v1';

interface AdminUserManagementProps {
  currentUserId: string | null;
  externalSubTab?: AdminSubTab;
}

const ROLE_OPTIONS: UserRole[] = [
  'SUPER_ADMIN',
  'CEO',
  'FACTORY_MANAGER',
  'HR_NEEDLE_MANAGER',
  'PRODUCTION_MANAGER',
  'QUALITY_MANAGER',
];

export function AdminUserManagement({ currentUserId, externalSubTab }: AdminUserManagementProps) {
  const [subTab, setSubTab] = useState<AdminSubTab>(externalSubTab || 'users');

  useEffect(() => {
    if (externalSubTab) setSubTab(externalSubTab);
  }, [externalSubTab]);
  const [users, setUsers] = useState<ErpUserAccountEntity[]>([]);
  const [logs, setLogs] = useState<ErpAuditLogEntity[]>([]);
  const [requests, setRequests] = useState<ErpApprovalRequestEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Approval Requests filters
  const [reqStatusFilter, setReqStatusFilter] = useState<'ALL' | ApprovalRequestStatus>('ALL');
  const [reqKindFilter, setReqKindFilter] = useState<'ALL' | ApprovalRequestKind>('ALL');

  // User CRUD Form
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('PRODUCTION_MANAGER');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [allowedModules, setAllowedModules] = useState<ErpModuleId[]>(
    ROLE_DEFAULT_MODULES.PRODUCTION_MANAGER
  );

  // Password Reset Panel state
  const [resetTarget, setResetTarget] = useState<ErpUserAccountEntity | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');

  // Audit Log filters
  const [logSearch, setLogSearch] = useState('');
  const [logModuleFilter, setLogModuleFilter] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    const res = await fetchAdminUsersAndLogsAction();
    setLoading(false);

    let localList: ErpApprovalRequestEntity[] = [];
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(LOCAL_APPROVAL_REQUESTS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as ErpApprovalRequestEntity[];
          if (Array.isArray(parsed)) localList = parsed;
        }
      } catch {
        // ignore storage errors
      }
    }

    if (res.success) {
      setUsers(res.users || []);
      setLogs(res.logs || []);
      const serverReqs = res.requests || [];
      const mergedMap = new Map<string, ErpApprovalRequestEntity>();
      serverReqs.forEach((r) => mergedMap.set(r.id, r));
      localList.forEach((r) => {
        if (!mergedMap.has(r.id)) mergedMap.set(r.id, r);
      });
      const merged = Array.from(mergedMap.values()).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      );
      setRequests(merged);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(LOCAL_APPROVAL_REQUESTS_KEY, JSON.stringify(merged));
        } catch {
          // ignore
        }
      }
    } else {
      if (localList.length > 0) setRequests(localList);
      setFeedback({ type: 'err', msg: res.error || 'Failed to load admin data.' });
    }
  };

  const handleResolveRequest = async (
    reqItem: ErpApprovalRequestEntity,
    decision: 'APPROVED' | 'REJECTED'
  ) => {
    setFeedback(null);
    setSubmitting(true);

    let updatedReq: ErpApprovalRequestEntity = {
      ...reqItem,
      status: decision,
      resolvedAt: new Date().toISOString(),
      resolvedByName: 'Super Admin',
    };

    if (!reqItem.id.startsWith('local-req-')) {
      const res = await resolveApprovalRequestAction({
        requestId: reqItem.id,
        decision,
      });
      if (!res.success) {
        setSubmitting(false);
        setFeedback({
          type: 'err',
          msg: res.error || 'Failed to resolve approval request.',
        });
        return;
      }
      if (res.request) updatedReq = res.request;
    }

    // If this is an approved delete request for a local invoice, also remove it from localStorage invoices
    if (decision === 'APPROVED' && reqItem.requestKind === 'INVOICE_DELETE' && typeof window !== 'undefined') {
      try {
        const rawInv = window.localStorage.getItem('dinusha_billing_invoices_v3');
        if (rawInv) {
          const invList = JSON.parse(rawInv) as Array<{ id: string; invoiceNumber: string }>;
          if (Array.isArray(invList)) {
            const filtered = invList.filter(
              (inv) =>
                inv.id !== reqItem.invoiceId && inv.invoiceNumber !== reqItem.invoiceNumber
            );
            window.localStorage.setItem('dinusha_billing_invoices_v3', JSON.stringify(filtered));
          }
        }
      } catch {
        // ignore
      }
    }

    setRequests((prev) => {
      const next = prev.map((r) => (r.id === reqItem.id ? updatedReq : r));
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(LOCAL_APPROVAL_REQUESTS_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      return next;
    });

    setSubmitting(false);
    setFeedback({
      type: 'ok',
      msg:
        decision === 'APPROVED'
          ? `Approved request for "${reqItem.targetLabel}". ${
              reqItem.requestKind === 'PAYROLL_EDIT'
                ? 'Paid salary record has been unlocked for editing.'
                : reqItem.requestKind === 'INVOICE_DELETE'
                  ? 'Paid invoice has been deleted.'
                  : 'Paid invoice is now unlocked for updating.'
            }`
          : `Rejected request for "${reqItem.targetLabel}".`,
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setEditingUserId(null);
    setFullName('');
    setEmail('');
    setRole('PRODUCTION_MANAGER');
    setPassword('');
    setIsActive(true);
    setAllowedModules(ROLE_DEFAULT_MODULES.PRODUCTION_MANAGER);
  };

  const handleRoleChange = (nextRole: UserRole) => {
    setRole(nextRole);
    setAllowedModules(ROLE_DEFAULT_MODULES[nextRole]);
  };

  const toggleModule = (modId: ErpModuleId) => {
    if (role === 'SUPER_ADMIN') return; // Super Admin always has full access
    setAllowedModules((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const handleEditUser = (u: ErpUserAccountEntity) => {
    setEditingUserId(u.id);
    setFullName(u.fullName);
    setEmail(u.email);
    setRole(u.role);
    setPassword('');
    setIsActive(u.isActive);
    setAllowedModules(u.allowedModules);
    setFeedback(null);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);

    if (editingUserId) {
      const res = await updateErpUserAction({
        id: editingUserId,
        fullName,
        role,
        isActive,
        allowedModules,
      });
      setSubmitting(false);
      if (!res.success || !res.user) {
        setFeedback({ type: 'err', msg: res.error || 'Failed to update user.' });
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === editingUserId ? res.user! : u)));
      setFeedback({ type: 'ok', msg: `Updated access & profile for ${res.user.fullName}.` });
      resetForm();
      loadData();
      return;
    }

    const res = await createErpUserAction({
      fullName,
      email,
      role,
      password,
      allowedModules,
    });
    setSubmitting(false);
    if (!res.success || !res.user) {
      setFeedback({ type: 'err', msg: res.error || 'Failed to create user.' });
      return;
    }
    setUsers((prev) => [res.user!, ...prev]);
    setFeedback({
      type: 'ok',
      msg: `Created user ${res.user.fullName} (${res.user.email}) with ${res.user.allowedModules.length} permitted section(s).`,
    });
    resetForm();
    loadData();
  };

  const handleDirectPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setSubmitting(true);
    const res = await adminResetUserPasswordAction({
      authUserId: resetTarget.authUserId,
      email: resetTarget.email,
      mode: 'direct',
      newPassword: resetNewPassword,
    });
    setSubmitting(false);
    if (!res.success) {
      setFeedback({ type: 'err', msg: res.error || 'Password reset failed.' });
      return;
    }
    setFeedback({ type: 'ok', msg: `Password updated for ${resetTarget.email}.` });
    setResetTarget(null);
    setResetNewPassword('');
    loadData();
  };

  const handleSendResetEmail = async (u: ErpUserAccountEntity) => {
    setSubmitting(true);
    const res = await adminResetUserPasswordAction({
      authUserId: u.authUserId,
      email: u.email,
      mode: 'email',
    });
    setSubmitting(false);
    if (!res.success) {
      setFeedback({ type: 'err', msg: res.error || 'Failed to send reset email.' });
      return;
    }
    setFeedback({ type: 'ok', msg: `Password reset email sent to ${u.email}.` });
    loadData();
  };

  const handleDeleteUser = async (u: ErpUserAccountEntity) => {
    const res = await deleteErpUserAction({
      id: u.id,
      authUserId: u.authUserId,
      email: u.email,
    });
    if (!res.success) {
      setFeedback({ type: 'err', msg: res.error || 'Failed to delete user.' });
      return;
    }
    setUsers((prev) => prev.filter((item) => item.id !== u.id));
    if (editingUserId === u.id) resetForm();
    setFeedback({ type: 'ok', msg: `Deleted user ${u.email}.` });
    loadData();
  };

  const auditModules = useMemo(() => {
    const set = new Set(logs.map((l) => l.module).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    return logs.filter((l) => {
      if (logModuleFilter !== 'ALL' && l.module !== logModuleFilter) return false;
      if (!q) return true;
      return (
        l.actorName.toLowerCase().includes(q) ||
        l.actorEmail.toLowerCase().includes(q) ||
        l.module.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.summary.toLowerCase().includes(q)
      );
    });
  }, [logs, logSearch, logModuleFilter]);

  const pendingRequestsCount = useMemo(
    () => requests.filter((r) => r.status === 'PENDING').length,
    [requests]
  );

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (reqStatusFilter !== 'ALL' && r.status !== reqStatusFilter) return false;
      if (reqKindFilter !== 'ALL' && r.requestKind !== reqKindFilter) return false;
      return true;
    });
  }, [requests, reqStatusFilter, reqKindFilter]);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-persian-900 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">
              Super Admin Access Control &amp; Audit Trail
            </h2>
            <p className="text-xs text-blue-200 mt-0.5">
              Manage role-based user permissions, reset passwords, and inspect every ERP action
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('users')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              subTab === 'users'
                ? 'bg-white text-persian-900 shadow-sm'
                : 'bg-white/10 text-blue-100 hover:bg-white/20'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Access ({users.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('requests')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              subTab === 'requests'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : pendingRequestsCount > 0
                  ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40 hover:bg-amber-500/35'
                  : 'bg-white/10 text-blue-100 hover:bg-white/20'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Approval Requests ({requests.length})</span>
            {pendingRequestsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                {pendingRequestsCount} Pending
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSubTab('audit')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              subTab === 'audit'
                ? 'bg-white text-persian-900 shadow-sm'
                : 'bg-white/10 text-blue-100 hover:bg-white/20'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Logs ({logs.length})</span>
          </button>
          <button
            type="button"
            onClick={loadData}
            aria-label="Refresh admin data"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl px-4 py-3 text-xs font-bold flex items-center gap-2 border ${
            feedback.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* ===================================================================
          SUB-TAB 1: USER ACCOUNT & ROLE ACCESS CONTROL CRUD
          =================================================================== */}
      {subTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs h-fit space-y-4">
            <h3 className="text-sm font-extrabold uppercase text-slate-600 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-persian-600" />
              <span>{editingUserId ? 'Edit User & Permissions' : 'Create ERP User Account'}</span>
            </h3>

            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Nimal Perera"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-persian-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Actual Work Email *
                </label>
                <input
                  type="email"
                  required
                  disabled={Boolean(editingUserId)}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@company.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-persian-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role *</label>
                  <select
                    value={role}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white outline-none focus:border-persian-500 cursor-pointer"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>

                {!editingUserId ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Initial Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-persian-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Account Status
                    </label>
                    <select
                      value={isActive ? 'active' : 'disabled'}
                      onChange={(e) => setIsActive(e.target.value === 'active')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white outline-none cursor-pointer"
                    >
                      <option value="active">Active (Allowed)</option>
                      <option value="disabled">Disabled (Blocked)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Per-Module UI Access Control */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-persian-600" />
                    Visible ERP Sections (Hide Rest from UI)
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    {allowedModules.length} / {ALL_ERP_MODULES.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {ALL_ERP_MODULES.map((mod) => {
                    const checked = allowedModules.includes(mod.id);
                    return (
                      <label
                        key={mod.id}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          checked
                            ? 'bg-white border-persian-300 text-slate-900 font-bold'
                            : 'bg-slate-100/60 border-transparent text-slate-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={role === 'SUPER_ADMIN'}
                          onChange={() => toggleModule(mod.id)}
                          className="accent-persian-700 cursor-pointer"
                        />
                        <span className="truncate">{mod.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-persian-900 hover:bg-persian-800 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {editingUserId ? 'Update User & Permissions' : 'Create User Account'}
                </button>
                {editingUserId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Right User List + Direct Password Reset Panel */}
          <div className="lg:col-span-7 space-y-6">
            {resetTarget && (
              <form
                onSubmit={handleDirectPasswordReset}
                className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-end gap-3"
              >
                <div className="flex-1">
                  <p className="text-xs font-extrabold text-amber-900">
                    Direct Password Reset for {resetTarget.fullName} ({resetTarget.email})
                  </p>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                    className="mt-2 w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-sm outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Set Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResetTarget(null);
                      setResetNewPassword('');
                    }}
                    className="px-3 py-2 rounded-xl bg-white border border-amber-200 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <h3 className="text-sm font-extrabold uppercase text-slate-500 mb-4">
                Registered ERP Users ({users.length})
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">User</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">Access</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="p-3.5">
                          <p className="font-extrabold text-slate-900">{u.fullName}</p>
                          <p className="text-[11px] text-slate-500">{u.email}</p>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {ROLE_LABELS[u.role]}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-700">
                            {u.allowedModules.length} sections
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              u.isActive
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {u.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditUser(u)}
                            title="Edit Role & Access"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-persian-600 hover:bg-persian-50 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5 inline" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setResetTarget(u);
                              setResetNewPassword('');
                            }}
                            title="Direct Password Reset"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5 inline" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendResetEmail(u)}
                            title="Send Password Reset Email"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 cursor-pointer"
                          >
                            <Mail className="w-3.5 h-3.5 inline" />
                          </button>
                          {u.authUserId !== currentUserId && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              title="Delete User"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 inline" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          SUB-TAB 2: CENTRALIZED ADMIN APPROVAL REQUESTS (PAYROLL & INVOICES)
          =================================================================== */}
      {subTab === 'requests' && (
        <div className="space-y-5">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-xs">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">
                Pending Admin Approval
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {pendingRequestsCount}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Waiting for Super Admin / CEO authorization
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-indigo-200 p-4 shadow-xs">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700">
                Paid Payroll Edit Requests
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {requests.filter((r) => r.requestKind === 'PAYROLL_EDIT').length}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Requests to reopen &amp; edit PAID salary records
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-blue-200 p-4 shadow-xs">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700">
                Paid Invoice Update Requests
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {requests.filter((r) => r.requestKind === 'INVOICE_EDIT').length}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Requests to unlock &amp; edit PAID invoices
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-rose-200 p-4 shadow-xs">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700">
                Paid Invoice Delete Requests
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {requests.filter((r) => r.requestKind === 'INVOICE_DELETE').length}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Requests to permanently delete PAID invoices
              </p>
            </div>
          </div>

          {/* Filter & Action Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setReqStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    reqStatusFilter === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'All Statuses' : st}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'ALL', label: 'All Request Types' },
                  { id: 'PAYROLL_EDIT', label: 'Paid Payroll Edit' },
                  { id: 'INVOICE_EDIT', label: 'Paid Invoice Update' },
                  { id: 'INVOICE_DELETE', label: 'Paid Invoice Delete' },
                ] as const
              ).map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setReqKindFilter(k.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    reqKindFilter === k.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          {/* Requests Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div
              tabIndex={0}
              role="region"
              aria-label="Admin Approval Requests Table"
              className="overflow-x-auto"
            >
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white uppercase text-[11px] font-bold">
                  <tr>
                    <th className="p-3.5">Requested Date</th>
                    <th className="p-3.5">Request Type</th>
                    <th className="p-3.5">Target Record (Salary / Invoice)</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Reason for Request</th>
                    <th className="p-3.5">Requested By</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Admin Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 font-semibold">
                        No approval requests found matching the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((reqItem) => (
                      <tr key={reqItem.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 whitespace-nowrap font-mono text-[11px] text-slate-600">
                          {reqItem.createdAt
                            ? new Date(reqItem.createdAt).toLocaleString()
                            : '—'}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          {reqItem.requestKind === 'PAYROLL_EDIT' ? (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
                              PAID PAYROLL EDIT
                            </span>
                          ) : reqItem.requestKind === 'INVOICE_DELETE' ? (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                              PAID INVOICE DELETE
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                              PAID INVOICE UPDATE
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-extrabold text-slate-900">
                          {reqItem.targetLabel}
                        </td>
                        <td className="p-3.5 whitespace-nowrap font-mono font-black text-emerald-700">
                          {reqItem.amountLabel || '—'}
                        </td>
                        <td className="p-3.5 text-slate-700 max-w-xs">
                          <div className="font-semibold text-slate-800">{reqItem.reason}</div>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{reqItem.requestedByName}</div>
                          {reqItem.requestedByEmail && (
                            <div className="text-[10px] text-slate-500">
                              {reqItem.requestedByEmail}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          {reqItem.status === 'PENDING' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" /> PENDING
                            </span>
                          ) : reqItem.status === 'APPROVED' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> APPROVED
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> REJECTED
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          {reqItem.status === 'PENDING' ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => handleResolveRequest(reqItem, 'APPROVED')}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <Unlock className="w-3 h-3" />
                                {reqItem.requestKind === 'INVOICE_DELETE'
                                  ? 'Approve & Delete'
                                  : 'Approve & Unlock'}
                              </button>
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => handleResolveRequest(reqItem, 'REJECTED')}
                                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 font-bold text-[11px] transition cursor-pointer disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-500">
                              <span className="font-bold text-slate-700">
                                {reqItem.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                              </span>{' '}
                              {reqItem.resolvedByName ? `by ${reqItem.resolvedByName}` : ''}
                              {reqItem.resolvedAt && (
                                <div className="text-[10px] font-mono text-slate-400">
                                  {new Date(reqItem.resolvedAt).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          SUB-TAB 3: SYSTEM-WIDE AUDIT LOGS
          =================================================================== */}
      {subTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search by user, email, action, or summary..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-persian-500"
              />
            </div>

            <select
              value={logModuleFilter}
              onChange={(e) => setLogModuleFilter(e.target.value)}
              aria-label="Filter audit logs by section"
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white outline-none cursor-pointer"
            >
              {auditModules.map((m) => (
                <option key={m} value={m}>
                  {m === 'ALL' ? 'All Sections' : m}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[560px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Section</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Activity Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No audit logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-3.5 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <p className="font-bold text-slate-900">{log.actorName}</p>
                        {log.actorEmail && (
                          <p className="text-[10px] text-slate-500">{log.actorEmail}</p>
                        )}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {log.module}
                        </span>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-700">{log.summary}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
