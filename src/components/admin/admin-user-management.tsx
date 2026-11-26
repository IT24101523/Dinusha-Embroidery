'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ErpUserAccountEntity,
  ErpAuditLogEntity,
  ErpApprovalRequestEntity,
  ApprovalRequestKind,
  ApprovalRequestStatus,
  fetchAdminUsersAndLogsAction,
  createErpUserAction,
  updateErpUserAction,
  toggleErpUserActiveAction,
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
  Eye,
  EyeOff,
  Sparkles,
  UserCheck,
  UserX,
  AtSign,
  X,
  ShieldCheck,
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

const ROLE_BADGE_STYLES: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-amber-100 text-amber-900 border-amber-300',
  CEO: 'bg-purple-100 text-purple-900 border-purple-300',
  FACTORY_MANAGER: 'bg-blue-100 text-blue-900 border-blue-200',
  HR_NEEDLE_MANAGER: 'bg-teal-100 text-teal-900 border-teal-200',
  PRODUCTION_MANAGER: 'bg-indigo-100 text-indigo-900 border-indigo-200',
  QUALITY_MANAGER: 'bg-emerald-100 text-emerald-900 border-emerald-200',
};

const MODULE_LABEL_MAP = new Map<ErpModuleId, string>(
  ALL_ERP_MODULES.map((m) => [m.id, m.label])
);

function suggestUsernameFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s._-]/g, '')
    .replace(/\s+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 28);
}

function generateStrongPassword(): string {
  const words = ['Dinusha', 'Emb', 'Factory', 'Needle', 'Quality', 'Stitch'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${word}@${num}`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

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

  // User Directory Filters & Safe Delete
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);

  // User Create / Edit Modal (<dialog>)
  const userModalRef = useRef<HTMLDialogElement | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingAuthUserId, setEditingAuthUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('PRODUCTION_MANAGER');
  const [password, setPassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [allowedModules, setAllowedModules] = useState<ErpModuleId[]>(
    ROLE_DEFAULT_MODULES.PRODUCTION_MANAGER
  );

  // Password Reset Modal (<dialog>)
  const resetModalRef = useRef<HTMLDialogElement | null>(null);
  const [resetTarget, setResetTarget] = useState<ErpUserAccountEntity | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

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
    setEditingAuthUserId(null);
    setFullName('');
    setUsername('');
    setUsernameTouched(false);
    setEmail('');
    setRole('PRODUCTION_MANAGER');
    setPassword('');
    setShowCreatePassword(false);
    setIsActive(true);
    setAllowedModules(ROLE_DEFAULT_MODULES.PRODUCTION_MANAGER);
  };

  const openCreateUserModal = () => {
    resetForm();
    setFeedback(null);
    setIsUserModalOpen(true);
    if (userModalRef.current && !userModalRef.current.open) {
      userModalRef.current.showModal();
    }
  };

  const closeUserModal = () => {
    if (userModalRef.current && userModalRef.current.open) {
      userModalRef.current.close();
    }
    setIsUserModalOpen(false);
    resetForm();
  };

  const openResetPasswordModal = (u: ErpUserAccountEntity) => {
    setResetTarget(u);
    setResetNewPassword('');
    setShowResetPassword(false);
    if (resetModalRef.current && !resetModalRef.current.open) {
      resetModalRef.current.showModal();
    }
  };

  const closeResetPasswordModal = () => {
    if (resetModalRef.current && resetModalRef.current.open) {
      resetModalRef.current.close();
    }
    setResetTarget(null);
    setResetNewPassword('');
    setShowResetPassword(false);
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
    setEditingAuthUserId(u.authUserId);
    setFullName(u.fullName);
    setUsername(u.username);
    setUsernameTouched(true);
    setEmail(u.hasRealEmail ? u.email : '');
    setRole(u.role);
    setPassword('');
    setIsActive(u.isActive);
    setAllowedModules(u.allowedModules);
    setFeedback(null);
    setIsUserModalOpen(true);
    if (userModalRef.current && !userModalRef.current.open) {
      userModalRef.current.showModal();
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);

    if (editingUserId) {
      const res = await updateErpUserAction({
        id: editingUserId,
        authUserId: editingAuthUserId || undefined,
        fullName,
        username,
        email,
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
      setFeedback({
        type: 'ok',
        msg: `Updated access & credentials for ${res.user.fullName} (@${res.user.username}).`,
      });
      closeUserModal();
      loadData();
      return;
    }

    const res = await createErpUserAction({
      fullName,
      username,
      email: email.trim() || undefined,
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
      msg: `Created user ${res.user.fullName} (Login Username: @${res.user.username}) with ${res.user.allowedModules.length} permitted section(s).`,
    });
    closeUserModal();
    loadData();
  };

  const handleQuickToggleActive = async (u: ErpUserAccountEntity) => {
    setFeedback(null);
    setSubmitting(true);
    const nextActive = !u.isActive;
    const res = await toggleErpUserActiveAction({
      id: u.id,
      authUserId: u.authUserId,
      isActive: nextActive,
    });
    setSubmitting(false);
    if (!res.success) {
      setFeedback({ type: 'err', msg: res.error || 'Failed to update account status.' });
      return;
    }
    setUsers((prev) =>
      prev.map((item) => (item.id === u.id ? { ...item, isActive: nextActive } : item))
    );
    setFeedback({
      type: 'ok',
      msg: `${nextActive ? 'Enabled' : 'Disabled'} account for ${u.fullName} (@${u.username}).`,
    });
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
    setFeedback({
      type: 'ok',
      msg: `Password directly updated for ${resetTarget.fullName} (@${resetTarget.username}).`,
    });
    closeResetPasswordModal();
    loadData();
  };

  const handleSendResetEmail = async (u: ErpUserAccountEntity) => {
    if (!u.hasRealEmail) {
      setFeedback({
        type: 'err',
        msg: `${u.fullName} (@${u.username}) has no real work email linked. Use Direct Password Reset instead.`,
      });
      return;
    }
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
    closeResetPasswordModal();
    loadData();
  };

  const handleDeleteUser = async (u: ErpUserAccountEntity) => {
    setSubmitting(true);
    const res = await deleteErpUserAction({
      id: u.id,
      authUserId: u.authUserId,
      email: u.email,
    });
    setSubmitting(false);
    if (!res.success) {
      setFeedback({ type: 'err', msg: res.error || 'Failed to delete user.' });
      return;
    }
    setUsers((prev) => prev.filter((item) => item.id !== u.id));
    setConfirmDeleteUserId(null);
    if (editingUserId === u.id) closeUserModal();
    setFeedback({ type: 'ok', msg: `Deleted user ${u.fullName} (@${u.username}).` });
    loadData();
  };

  const activeUsersCount = useMemo(() => users.filter((u) => u.isActive).length, [users]);
  const disabledUsersCount = useMemo(() => users.filter((u) => !u.isActive).length, [users]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (userRoleFilter !== 'ALL' && u.role !== userRoleFilter) return false;
      if (userStatusFilter === 'ACTIVE' && !u.isActive) return false;
      if (userStatusFilter === 'DISABLED' && u.isActive) return false;
      if (q) {
        const hay = `${u.fullName} ${u.username} ${u.email} ${ROLE_LABELS[u.role]}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, userSearch, userRoleFilter, userStatusFilter]);

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
      {/* Command Banner + 4-Card KPI Strip */}
      <div className="bg-persian-800 text-white rounded-2xl p-5 shadow-md border border-persian-900 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-extrabold tracking-tight uppercase">
                  Super Admin Access Control
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Username + Password Auth
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Create username/password logins, manage module access, approve requests &amp; monitor audit logs
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
                  : 'bg-persian-900/60 text-blue-100 hover:bg-persian-700 border border-persian-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>User Accounts ({users.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('requests')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                subTab === 'requests'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : pendingRequestsCount > 0
                    ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40 hover:bg-amber-500/35'
                    : 'bg-persian-900/60 text-blue-100 hover:bg-persian-700 border border-persian-700'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Approvals ({requests.length})</span>
              {pendingRequestsCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-600 text-white">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSubTab('audit')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                subTab === 'audit'
                  ? 'bg-white text-persian-900 shadow-sm'
                  : 'bg-persian-900/60 text-blue-100 hover:bg-persian-700 border border-persian-700'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Logs ({logs.length})</span>
            </button>
            <button
              type="button"
              onClick={loadData}
              aria-label="Refresh admin data"
              className="p-2 rounded-xl bg-persian-900/60 hover:bg-persian-700 border border-persian-700 text-white cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4-Card KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          <div className="bg-persian-900/60 border border-persian-700/70 rounded-xl px-3.5 py-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-200/80">
              Total ERP Accounts
            </div>
            <div className="text-lg font-mono font-black text-white mt-0.5">{users.length}</div>
          </div>
          <div className="bg-persian-900/60 border border-persian-700/70 rounded-xl px-3.5 py-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-200/80">
              Active Users
            </div>
            <div className="text-lg font-mono font-black text-emerald-300 mt-0.5">
              {activeUsersCount}
            </div>
          </div>
          <div className="bg-persian-900/60 border border-persian-700/70 rounded-xl px-3.5 py-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-200/80">
              Suspended / Disabled
            </div>
            <div
              className={`text-lg font-mono font-black mt-0.5 ${
                disabledUsersCount > 0 ? 'text-rose-300' : 'text-slate-300'
              }`}
            >
              {disabledUsersCount}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSubTab('requests')}
            className={`text-left rounded-xl px-3.5 py-2.5 border transition cursor-pointer ${
              pendingRequestsCount > 0
                ? 'bg-amber-500/20 border-amber-400/50 hover:bg-amber-500/30'
                : 'bg-persian-900/60 border-persian-700/70 hover:bg-persian-900'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-200/80">
              Pending Approvals
            </div>
            <div className="text-lg font-mono font-black text-amber-300 mt-0.5">
              {pendingRequestsCount}
            </div>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role={feedback.type === 'err' ? 'alert' : 'status'}
          className={`rounded-xl px-4 py-3 text-xs font-bold flex items-center justify-between gap-2 border ${
            feedback.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.msg}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Dismiss message"
            className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ===================================================================
          SUB-TAB 1: STRUCTURED FULL-WIDTH USER DIRECTORY + MODAL WORKSPACE
          =================================================================== */}
      {subTab === 'users' && (
        <div className="space-y-4">
          {/* Search, Filter & Primary CTA Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by name, @username, or email..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-persian-500"
                />
              </div>

              <select
                aria-label="Filter by role"
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value as 'ALL' | UserRole)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-persian-500 cursor-pointer"
              >
                <option value="ALL">All Roles</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(
                  [
                    { id: 'ALL', label: `All (${users.length})` },
                    { id: 'ACTIVE', label: `Active (${activeUsersCount})` },
                    { id: 'DISABLED', label: `Disabled (${disabledUsersCount})` },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setUserStatusFilter(st.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      userStatusFilter === st.id
                        ? 'bg-white text-persian-800 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={openCreateUserModal}
              className="px-4 py-2.5 rounded-xl bg-persian-800 hover:bg-persian-600 text-white text-xs font-extrabold flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-amber-300" />
              <span>Create New User</span>
            </button>
          </div>

          {/* Full-Width User Directory Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Registered ERP User Accounts ({filteredUsers.length} of {users.length})
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">
                Users can sign in using their <strong>@username</strong> (or work email) &amp; password
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">User &amp; Login Username</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Permitted ERP Modules</th>
                    <th className="py-3 px-4">Status &amp; Last Login</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 font-semibold">
                        Loading user accounts...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 font-semibold">
                        No user accounts match the current search / filter.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelf = u.authUserId === currentUserId;
                      const isConfirmDel = confirmDeleteUserId === u.id;
                      const visibleMods = u.allowedModules.slice(0, 3);
                      const remainingModsCount = Math.max(0, u.allowedModules.length - visibleMods.length);

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                  u.isActive
                                    ? 'bg-persian-800 text-white'
                                    : 'bg-slate-200 text-slate-500'
                                }`}
                              >
                                {getInitials(u.fullName)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-extrabold text-slate-900 text-xs">
                                    {u.fullName}
                                  </span>
                                  {isSelf && (
                                    <span className="px-1.5 py-0.2 rounded bg-persian-100 text-persian-800 text-[9px] font-black uppercase">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 font-mono font-bold text-[11px]">
                                    @{u.username}
                                  </span>
                                  {u.hasRealEmail ? (
                                    <span className="text-[11px] text-slate-500">{u.email}</span>
                                  ) : (
                                    <span className="text-[10px] font-semibold text-slate-400">
                                      Username-only login
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border ${
                                ROLE_BADGE_STYLES[u.role]
                              }`}
                            >
                              {ROLE_LABELS[u.role]}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap items-center gap-1 max-w-xs">
                              {u.role === 'SUPER_ADMIN' ? (
                                <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-extrabold">
                                  Full ERP Access ({u.allowedModules.length} Modules)
                                </span>
                              ) : (
                                <>
                                  {visibleMods.map((modId) => (
                                    <span
                                      key={modId}
                                      className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold"
                                    >
                                      {MODULE_LABEL_MAP.get(modId) || modId}
                                    </span>
                                  ))}
                                  {remainingModsCount > 0 && (
                                    <span
                                      title={u.allowedModules
                                        .map((m) => MODULE_LABEL_MAP.get(m) || m)
                                        .join(', ')}
                                      className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-extrabold"
                                    >
                                      +{remainingModsCount} more
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <span
                                className={`inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  u.isActive
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}
                              >
                                {u.isActive ? (
                                  <>
                                    <UserCheck className="w-3 h-3" /> Active
                                  </>
                                ) : (
                                  <>
                                    <UserX className="w-3 h-3" /> Disabled
                                  </>
                                )}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {u.lastLoginAt
                                  ? `Last: ${new Date(u.lastLoginAt).toLocaleDateString()}`
                                  : 'Never signed in'}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleEditUser(u)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-persian-800 text-slate-700 hover:text-white font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openResetPasswordModal(u)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-500 text-amber-800 hover:text-white border border-amber-200 font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                              >
                                <KeyRound className="w-3 h-3" />
                                <span>Password</span>
                              </button>
                              {!isSelf && (
                                <button
                                  type="button"
                                  disabled={submitting}
                                  onClick={() => handleQuickToggleActive(u)}
                                  title={u.isActive ? 'Disable Account' : 'Enable Account'}
                                  className={`px-2 py-1.5 rounded-lg border text-[11px] font-bold transition cursor-pointer disabled:opacity-50 ${
                                    u.isActive
                                      ? 'bg-white border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white'
                                  }`}
                                >
                                  {u.isActive ? 'Disable' : 'Enable'}
                                </button>
                              )}
                              {!isSelf &&
                                (isConfirmDel ? (
                                  <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-300 rounded-lg px-2 py-1">
                                    <span className="text-[10px] font-extrabold text-rose-800">
                                      Delete?
                                    </span>
                                    <button
                                      type="button"
                                      disabled={submitting}
                                      onClick={() => handleDeleteUser(u)}
                                      className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                                    >
                                      Yes
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteUserId(null)}
                                      className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteUserId(u.id)}
                                    aria-label={`Delete ${u.fullName}`}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
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

      {/* ===================================================================
          MODAL 1: CREATE / EDIT USER ACCOUNT & MODULE PERMISSIONS
          =================================================================== */}
      <dialog
        ref={userModalRef}
        onCancel={(e) => {
          e.preventDefault();
          closeUserModal();
        }}
        className="m-auto rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl p-0 overflow-hidden bg-white text-slate-900"
      >
        {isUserModalOpen && (
          <form onSubmit={handleUserSubmit}>
            <div className="bg-persian-800 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                  {editingUserId ? (
                    <Pencil className="w-4 h-4 text-amber-300" />
                  ) : (
                    <PlusCircle className="w-4 h-4 text-emerald-300" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold">
                    {editingUserId ? 'Edit User Account & Access' : 'Create New ERP User Account'}
                  </h3>
                  <p className="text-[11px] text-blue-200">
                    Set login username, password, role, and permitted ERP modules
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeUserModal}
                aria-label="Close modal"
                className="w-7 h-7 rounded-lg bg-persian-900/60 text-blue-200 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Section 1: Identity & Login Credentials */}
              <div className="space-y-3">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-persian-800 text-white text-[10px] flex items-center justify-center">
                    1
                  </span>
                  Account Identity &amp; Login Credentials
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFullName(val);
                        if (!editingUserId && !usernameTouched) {
                          setUsername(suggestUsernameFromName(val));
                        }
                      }}
                      placeholder="e.g. Nimal Perera"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold outline-none focus:border-persian-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Login Username *
                    </label>
                    <div className="relative">
                      <AtSign className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        minLength={3}
                        maxLength={32}
                        value={username}
                        onChange={(e) => {
                          setUsernameTouched(true);
                          setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''));
                        }}
                        placeholder="e.g. nimal.qc"
                        className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-persian-900 outline-none focus:border-persian-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {!editingUserId ? (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">
                          Initial Password *
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setPassword(generateStrongPassword());
                            setShowCreatePassword(true);
                          }}
                          className="text-[10px] font-extrabold text-persian-600 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" /> Generate
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showCreatePassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold outline-none focus:border-persian-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCreatePassword((p) => !p)}
                          aria-label={showCreatePassword ? 'Hide password' : 'Show password'}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          {showCreatePassword ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Account Status
                      </label>
                      <select
                        value={isActive ? 'active' : 'disabled'}
                        onChange={(e) => setIsActive(e.target.value === 'active')}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold outline-none cursor-pointer"
                      >
                        <option value="active">Active (Login Allowed)</option>
                        <option value="disabled">Disabled (Login Blocked)</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Work Email <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Optional — leave blank for username-only"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold outline-none focus:border-persian-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Role & Permissions */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-persian-800 text-white text-[10px] flex items-center justify-center">
                    2
                  </span>
                  Role &amp; Module Access Permissions
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assigned Role *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-extrabold outline-none focus:border-persian-500 cursor-pointer"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-persian-600" />
                      Permitted ERP Sections ({allowedModules.length} / {ALL_ERP_MODULES.length})
                    </span>
                    {role !== 'SUPER_ADMIN' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setAllowedModules(ALL_ERP_MODULES.map((m) => m.id))
                          }
                          className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:bg-persian-50 text-[10px] font-bold text-slate-700 cursor-pointer"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setAllowedModules(ROLE_DEFAULT_MODULES[role])}
                          className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:bg-persian-50 text-[10px] font-bold text-persian-700 cursor-pointer"
                        >
                          Role Default
                        </button>
                        <button
                          type="button"
                          onClick={() => setAllowedModules(['dashboard'])}
                          className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:bg-rose-50 text-[10px] font-bold text-slate-500 cursor-pointer"
                        >
                          Minimal
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {ALL_ERP_MODULES.map((mod) => {
                      const checked = allowedModules.includes(mod.id);
                      return (
                        <label
                          key={mod.id}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                            checked
                              ? 'bg-white border-persian-400 text-slate-900 font-bold shadow-2xs'
                              : 'bg-slate-100/70 border-transparent text-slate-500 hover:bg-white'
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
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeUserModal}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-persian-800 hover:bg-persian-600 text-white text-xs font-extrabold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submitting
                    ? 'Saving...'
                    : editingUserId
                      ? 'Save Changes'
                      : 'Create User Account'}
                </button>
              </div>
            </div>
          </form>
        )}
      </dialog>

      {/* ===================================================================
          MODAL 2: RESET USER PASSWORD (DIRECT + OPTIONAL EMAIL OTP)
          =================================================================== */}
      <dialog
        ref={resetModalRef}
        onCancel={(e) => {
          e.preventDefault();
          closeResetPasswordModal();
        }}
        className="m-auto rounded-2xl border border-amber-300 shadow-2xl w-full max-w-md p-0 overflow-hidden bg-white text-slate-900"
      >
        {resetTarget && (
          <form onSubmit={handleDirectPasswordReset}>
            <div className="bg-amber-600 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-5 h-5 text-amber-100" />
                <div>
                  <h3 className="text-sm font-extrabold">Reset User Password</h3>
                  <p className="text-[11px] text-amber-100">
                    {resetTarget.fullName} (@{resetTarget.username})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeResetPasswordModal}
                aria-label="Close modal"
                className="w-7 h-7 rounded-lg bg-amber-700/70 text-amber-100 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">New Password *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetNewPassword(generateStrongPassword());
                      setShowResetPassword(true);
                    }}
                    className="text-[10px] font-extrabold text-persian-600 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Generate Password
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoFocus
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-mono font-bold outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword((p) => !p)}
                    aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showResetPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {resetTarget.hasRealEmail && (
                <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-sky-900 font-semibold truncate">
                    Or send 6-digit OTP to <strong>{resetTarget.email}</strong>
                  </div>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSendResetEmail(resetTarget)}
                    className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Mail className="w-3 h-3" /> Send Email
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeResetPasswordModal}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Set New Password'}
                </button>
              </div>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
