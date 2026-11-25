'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  EmployeeEntity,
  PayrollCalculationBreakdown,
  isNonEpfEmployee,
} from '@/modules/payroll/domain/entities';
import {
  MonthlySalaryInputData,
  monthlySalaryInputSchema,
} from '@/modules/payroll/domain/validation';
import {
  calculateSalaryForEmployee,
  calculateAttendanceAllowance,
  ANNUAL_LEAVE_QUOTA_DAYS,
} from '@/modules/payroll/domain/calculator';
import {
  saveMonthlySalaryAction,
  fetchSalaryRecordAction,
  fetchEmployeeAnnualLeaveByYearAction,
  updateSalaryPaymentStatusAction,
} from '@/actions/payroll';
import {
  submitApprovalRequestAction,
  fetchApprovalRequestsAction,
  type ErpApprovalRequestEntity,
} from '@/actions/admin-users';
import { LOCAL_APPROVAL_REQUESTS_KEY } from '@/components/admin/admin-user-management';
import { AdminUnlockModal } from './admin-unlock-modal';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  Clock,
  DollarSign,
  Gift,
  MinusCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
} from 'lucide-react';

function clampNumber(raw: string, min: number, max: number): number {
  if (raw.trim() === '') return min;
  const num = Number(raw);
  if (!Number.isFinite(num) || Number.isNaN(num)) return min;
  return Math.min(max, Math.max(min, num));
}

interface SalaryCalculatorProps {
  employees: EmployeeEntity[];
  selectedEmployeeId?: string;
}

export function SalaryCalculator({ employees, selectedEmployeeId }: SalaryCalculatorProps) {
  const [selectedId, setSelectedId] = useState<string>(
    selectedEmployeeId || employees[0]?.id || ''
  );
  const [staffTypeFilter, setStaffTypeFilter] = useState<'ALL' | 'EPF' | 'NON_EPF'>('ALL');
  const [month, setMonth] = useState<string>('October 2026');

  const visibleEmployees = useMemo(() => {
    if (staffTypeFilter === 'EPF') return employees.filter((e) => !isNonEpfEmployee(e));
    if (staffTypeFilter === 'NON_EPF') return employees.filter((e) => isNonEpfEmployee(e));
    return employees;
  }, [employees, staffTypeFilter]);

  // Input states
  const [otHours, setOtHours] = useState<number>(0);
  const [sotHours, setSotHours] = useState<number>(0);
  const [totAmt, setTotAmt] = useState<number>(0);
  const [poyaDayAmt, setPoyaDayAmt] = useState<number>(0);
  const [sundayAmt, setSundayAmt] = useState<number>(0);
  const [specialLeaveAmt, setSpecialLeaveAmt] = useState<number>(0);

  const [nightDays, setNightDays] = useState<number>(0);
  const [nightRate, setNightRate] = useState<number>(0);
  const [nightAllow, setNightAllow] = useState<number>(0);
  const [gradeAllow, setGradeAllow] = useState<number>(0);
  const [transAllow, setTransAllow] = useState<number>(3750);

  const [prodAllow, setProdAllow] = useState<number>(0);
  const [checkingAllow, setCheckingAllow] = useState<number>(0);

  const [annualLeaveDays, setAnnualLeaveDays] = useState<number>(0);
  const [yearLeaveByMonth, setYearLeaveByMonth] = useState<Record<string, number>>({});
  const [leaveLimitPopup, setLeaveLimitPopup] = useState<{
    attempted: number;
    maxAllowed: number;
    excess: number;
    usedOtherMonths: number;
    year: string;
  } | null>(null);
  const leaveLimitDialogRef = useRef<HTMLDialogElement | null>(null);

  const [lateHours, setLateHours] = useState<number>(0);
  const [unpaidDays, setUnpaidDays] = useState<number>(0);
  const [advance, setAdvance] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [recordStatus, setRecordStatus] = useState<'DRAFT' | 'APPROVED' | 'PAID' | null>(null);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [pendingUnlockRequests, setPendingUnlockRequests] = useState<Record<string, boolean>>({});
  const [shakeSaveBtn, setShakeSaveBtn] = useState(false);
  const [pendingUpdateData, setPendingUpdateData] = useState<MonthlySalaryInputData | null>(null);
  const confirmUpdateDialogRef = useRef<HTMLDialogElement | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const triggerErrorFeedback = (message: string) => {
    setStatusMsg({ type: 'error', text: message });
    setShakeSaveBtn(false);
    requestAnimationFrame(() => {
      setShakeSaveBtn(true);
    });
    setTimeout(() => setShakeSaveBtn(false), 450);
  };

  // Active employee
  const currentEmployee = useMemo(() => {
    const pool = visibleEmployees.length > 0 ? visibleEmployees : employees;
    return pool.find((e) => e.id === selectedId) || pool[0] || null;
  }, [visibleEmployees, employees, selectedId]);

  const isCurrentNonEpf = isNonEpfEmployee(currentEmployee);

  const currentIndex = useMemo(() => {
    const pool = visibleEmployees.length > 0 ? visibleEmployees : employees;
    if (!currentEmployee) return -1;
    return pool.findIndex((e) => e.id === currentEmployee.id);
  }, [visibleEmployees, employees, currentEmployee]);

  const handleCycleEmployee = (direction: -1 | 1) => {
    const pool = visibleEmployees.length > 0 ? visibleEmployees : employees;
    if (pool.length === 0 || currentIndex === -1) return;
    const nextIdx = (currentIndex + direction + pool.length) % pool.length;
    setSelectedId(pool[nextIdx].id);
  };

  const selectedYear = useMemo(() => {
    const m = month.match(/\b(20\d{2})\b/);
    return m ? m[1] : String(new Date().getFullYear());
  }, [month]);

  // Load existing salary record & annual leave ledger when employee or month changes
  useEffect(() => {
    if (!currentEmployee) return;

    let isMounted = true;
    async function loadExisting() {
      setStatusMsg(null);
      const [res, leaveRes] = await Promise.all([
        fetchSalaryRecordAction(currentEmployee!.id, month),
        fetchEmployeeAnnualLeaveByYearAction(currentEmployee!.id, selectedYear),
      ]);
      if (!isMounted) return;

      const leaveMap = leaveRes.success && leaveRes.leaveByMonth ? leaveRes.leaveByMonth : {};
      setYearLeaveByMonth(leaveMap);

      if (res.success && res.data) {
        const d = res.data;
        setOtHours(d.otHours);
        setSotHours(d.sotHours);
        setTotAmt(d.totAmt);
        setPoyaDayAmt(d.poyaDayAmt);
        setSundayAmt(d.sundayAmt);
        setSpecialLeaveAmt(d.specialLeaveAmt);

        setNightAllow(d.nightAllow);
        setNightDays(d.nightAllow > 0 ? 1 : 0);
        setNightRate(d.nightAllow > 0 ? d.nightAllow : 0);
        setGradeAllow(d.gradeAllow);
        setTransAllow(d.transAllow);

        setProdAllow(d.prodAllow);
        setCheckingAllow(d.checkingAllow);

        setAnnualLeaveDays(
          typeof d.annualLeaveDays === 'number' ? d.annualLeaveDays : leaveMap[month] || 0
        );
        setLateHours(d.lateHours);
        setUnpaidDays(d.unpaidDays);
        setAdvance(d.advance);
        setRecordStatus((d.status as 'DRAFT' | 'APPROVED' | 'PAID') || 'APPROVED');
      } else {
        // Reset to smart defaults for this employee
        setRecordStatus(null);
        setOtHours(0);
        setSotHours(0);
        setTotAmt(0);
        setPoyaDayAmt(0);
        setSundayAmt(0);
        setSpecialLeaveAmt(0);

        setNightDays(0);
        setNightRate(0);
        setNightAllow(0);
        setGradeAllow(currentEmployee!.role.includes('Supervisor') ? 35000 : 0);
        setTransAllow(3750);

        setProdAllow(currentEmployee!.role.includes('Supervisor') ? 20000 : 0);
        setCheckingAllow(0);

        setAnnualLeaveDays(leaveMap[month] || 0);
        setLateHours(0);
        setUnpaidDays(0);
        setAdvance(0);
      }
    }

    loadExisting();
    fetchApprovalRequestsAction()
      .then((res) => {
        if (!isMounted || !res.success || !res.requests) return;
        const map: Record<string, boolean> = {};
        res.requests.forEach((r) => {
          if (r.requestKind === 'PAYROLL_EDIT' && r.status === 'PENDING') {
            map[r.targetId] = true;
          }
        });
        setPendingUnlockRequests(map);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [currentEmployee, month, selectedYear]);

  const usedLeaveOtherMonths = useMemo(() => {
    const sum = Object.entries(yearLeaveByMonth)
      .filter(([m]) => m !== month)
      .reduce((acc, [, days]) => acc + (Number(days) || 0), 0);
    return Number(sum.toFixed(2));
  }, [yearLeaveByMonth, month]);

  const maxAnnualLeaveThisMonth = Math.max(
    0,
    Number((ANNUAL_LEAVE_QUOTA_DAYS - usedLeaveOtherMonths).toFixed(2))
  );
  const totalAnnualLeaveUsedThisYear = Number((usedLeaveOtherMonths + annualLeaveDays).toFixed(2));
  const remainingAnnualLeave = Math.max(
    0,
    Number((ANNUAL_LEAVE_QUOTA_DAYS - totalAnnualLeaveUsedThisYear).toFixed(2))
  );
  const annualLeavePct = Math.min(
    100,
    Math.round((totalAnnualLeaveUsedThisYear / ANNUAL_LEAVE_QUOTA_DAYS) * 100)
  );
  const totalLeaveAndAbsentDays = Number((unpaidDays + annualLeaveDays).toFixed(2));

  const handleAnnualLeaveChange = (rawVal: string | number) => {
    const str = String(rawVal).trim();
    if (str === '') {
      setAnnualLeaveDays(0);
      return;
    }
    const parsed = Number(str);
    if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed < 0) {
      setAnnualLeaveDays(0);
      return;
    }
    const attempted = Number(parsed.toFixed(2));
    if (usedLeaveOtherMonths + attempted > ANNUAL_LEAVE_QUOTA_DAYS) {
      const excess = Number(
        (usedLeaveOtherMonths + attempted - ANNUAL_LEAVE_QUOTA_DAYS).toFixed(2)
      );
      setAnnualLeaveDays(maxAnnualLeaveThisMonth);
      setLeaveLimitPopup({
        attempted,
        maxAllowed: maxAnnualLeaveThisMonth,
        excess,
        usedOtherMonths: usedLeaveOtherMonths,
        year: selectedYear,
      });
      return;
    }
    setAnnualLeaveDays(attempted);
  };

  useEffect(() => {
    const dialog = leaveLimitDialogRef.current;
    if (!dialog) return;
    dialog.setAttribute('closedby', 'any');
    if (leaveLimitPopup && !dialog.open) {
      dialog.showModal();
    } else if (!leaveLimitPopup && dialog.open) {
      dialog.close();
    }
  }, [leaveLimitPopup]);

  const isPaidLocked = recordStatus === 'PAID';
  const isExistingRecord = recordStatus !== null && recordStatus !== 'PAID';
  const isAllowanceLocked = unpaidDays > 6;
  const attAllow = isAllowanceLocked
    ? 0
    : calculateAttendanceAllowance(unpaidDays, annualLeaveDays, lateHours);
  const inputsDisabled = isAllowanceLocked || isPaidLocked;
  const unpaidHours = Number((unpaidDays * 8).toFixed(2));
  const unpaidThresholdPct = Math.min(100, Math.round((unpaidDays / 6) * 100));

  const formatLkr2 = (num: number) =>
    (num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Real-time calculation using pure domain engine
  const calculation: PayrollCalculationBreakdown | null = useMemo(() => {
    if (!currentEmployee) return null;

    const input: MonthlySalaryInputData = {
      employeeId: currentEmployee.id,
      month,
      basicSalary: currentEmployee.basicSalary,
      otHours,
      sotHours,
      totAmt,
      poyaDayAmt,
      sundayAmt,
      specialLeaveAmt,
      attAllow,
      nightAllow,
      gradeAllow,
      transAllow,
      prodAllow,
      checkingAllow,
      annualLeaveDays,
      lateHours,
      unpaidDays,
      advance,
    };

    return calculateSalaryForEmployee(currentEmployee, input);
  }, [
    currentEmployee,
    month,
    otHours,
    sotHours,
    totAmt,
    poyaDayAmt,
    sundayAmt,
    specialLeaveAmt,
    attAllow,
    nightAllow,
    gradeAllow,
    transAllow,
    prodAllow,
    checkingAllow,
    annualLeaveDays,
    lateHours,
    unpaidDays,
    advance,
  ]);

  const hasExcessDeductions = calculation ? calculation.totalDeductions > calculation.gross : false;
  const totalAdditions = calculation
    ? calculation.totalOt + calculation.totalAllowances + calculation.totalSpecialIncentives
    : 0;

  const validateSalaryInput = (): MonthlySalaryInputData | null => {
    if (!currentEmployee || !calculation) return null;

    if (isPaidLocked) {
      triggerErrorFeedback(
        'This salary is already Paid & Locked. Click Admin Unlock first to modify it.'
      );
      return null;
    }

    const inputData: MonthlySalaryInputData = {
      employeeId: currentEmployee.id,
      month,
      basicSalary: currentEmployee.basicSalary,
      otHours,
      sotHours,
      totAmt,
      poyaDayAmt,
      sundayAmt,
      specialLeaveAmt,
      attAllow,
      nightAllow,
      gradeAllow,
      transAllow,
      prodAllow,
      checkingAllow,
      annualLeaveDays,
      lateHours,
      unpaidDays,
      advance,
    };

    if (usedLeaveOtherMonths + annualLeaveDays > ANNUAL_LEAVE_QUOTA_DAYS) {
      const excess = Number(
        (usedLeaveOtherMonths + annualLeaveDays - ANNUAL_LEAVE_QUOTA_DAYS).toFixed(2)
      );
      setLeaveLimitPopup({
        attempted: annualLeaveDays,
        maxAllowed: maxAnnualLeaveThisMonth,
        excess,
        usedOtherMonths: usedLeaveOtherMonths,
        year: selectedYear,
      });
      return null;
    }

    const parsed = monthlySalaryInputSchema.safeParse(inputData);
    if (!parsed.success) {
      triggerErrorFeedback(
        parsed.error.issues[0]?.message || 'Invalid salary values. Please check your entries.'
      );
      return null;
    }

    if (calculation.totalDeductions > calculation.gross) {
      triggerErrorFeedback(
        `Deductions (LKR ${formatLkr2(calculation.totalDeductions)}) exceed Gross (LKR ${formatLkr2(calculation.gross)}). Reduce advance or absences.`
      );
      return null;
    }

    return parsed.data;
  };

  useEffect(() => {
    const dialog = confirmUpdateDialogRef.current;
    if (!dialog) return;

    dialog.setAttribute('closedby', 'any');

    if (pendingUpdateData && !dialog.open) {
      dialog.showModal();
    } else if (!pendingUpdateData && dialog.open) {
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
          setPendingUpdateData(null);
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
  }, [pendingUpdateData]);

  const executeSave = async (validated: MonthlySalaryInputData) => {
    if (!currentEmployee) return;
    setLoading(true);
    const res = await saveMonthlySalaryAction(validated);
    setLoading(false);

    if (res.success && res.breakdown) {
      setRecordStatus((res.breakdown.status as 'APPROVED' | 'PAID') || 'APPROVED');
      setYearLeaveByMonth((prev) => ({
        ...prev,
        [validated.month]: validated.annualLeaveDays || 0,
      }));
      setPendingUpdateData(null);
      setStatusMsg({
        type: 'success',
        text: 'Successful',
      });
    } else {
      setPendingUpdateData(null);
      triggerErrorFeedback(res.error || 'Failed to save salary record.');
    }
  };

  const handleSave = async () => {
    if (!currentEmployee || !calculation) return;
    setStatusMsg(null);

    const validated = validateSalaryInput();
    if (!validated) return;

    if (isExistingRecord) {
      setPendingUpdateData(validated);
      return;
    }

    await executeSave(validated);
  };

  const handleAdminUnlock = async (adminPin: string, adminReason: string) => {
    if (!currentEmployee) return;
    setUnlockError(null);
    setUnlockLoading(true);
    const res = await updateSalaryPaymentStatusAction({
      employeeId: currentEmployee.id,
      month,
      targetStatus: 'APPROVED',
      adminPin,
      adminReason,
    });
    setUnlockLoading(false);

    if (res.success && res.data) {
      setRecordStatus('APPROVED');
      setUnlockModalOpen(false);
      setStatusMsg({
        type: 'success',
        text: 'Successful — Unlocked',
      });
    } else {
      setUnlockError(res.error || 'Admin authorization failed.');
    }
  };

  const handleSendPayrollEditRequestToAdmin = async (reason: string) => {
    if (!currentEmployee) return;
    setUnlockError(null);
    setUnlockLoading(true);
    const targetId = `${currentEmployee.id}::${month}`;
    const targetLabel = `EPF #${currentEmployee.epfNo} - ${currentEmployee.fullName} (${month})`;
    const amountLabel = `LKR ${formatLkr2(calculation?.net || 0)}`;

    const res = await submitApprovalRequestAction({
      requestKind: 'PAYROLL_EDIT',
      targetId,
      targetLabel,
      amountLabel,
      reason,
      employeeId: currentEmployee.id,
      epfNo: currentEmployee.epfNo,
      employeeName: currentEmployee.fullName,
      month,
    });
    setUnlockLoading(false);

    if (res.success && res.request) {
      setPendingUnlockRequests((prev) => ({ ...prev, [targetId]: true }));
      if (typeof window !== 'undefined') {
        try {
          const raw = window.localStorage.getItem(LOCAL_APPROVAL_REQUESTS_KEY);
          const list = raw ? (JSON.parse(raw) as ErpApprovalRequestEntity[]) : [];
          window.localStorage.setItem(
            LOCAL_APPROVAL_REQUESTS_KEY,
            JSON.stringify([res.request, ...list.filter((r) => r.id !== res.request!.id)])
          );
        } catch {
          // ignore
        }
      }
      setUnlockModalOpen(false);
      setStatusMsg({
        type: 'success',
        text: 'Edit Request Sent to Admin Approval Tab',
      });
    } else {
      setUnlockError(res.error || 'Failed to send request to Admin.');
    }
  };

  if (!currentEmployee) {
    return (
      <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center shadow-xs">
        <p className="text-slate-600 font-medium">
          Please register employees first in the Employee Master CRUD tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Employee Command Hero & Selector Studio */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {currentEmployee.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentEmployee.photoUrl}
                alt={currentEmployee.fullName}
                className="w-10 h-10 rounded-xl object-cover border border-indigo-400/60 shrink-0 shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-indigo-500/30 text-indigo-100 border border-indigo-400/40 flex items-center justify-center text-sm font-black shrink-0 shadow-sm">
                {(currentEmployee.initials || currentEmployee.fullName || '?')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                {isCurrentNonEpf ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/30 border border-amber-400/50 text-amber-200">
                    NON-EPF (0% EPF/ETF)
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/30 border border-indigo-400/40 text-indigo-100">
                    EPF #{currentEmployee.epfNo}
                  </span>
                )}
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/10 text-slate-200">
                  {currentEmployee.role}
                </span>
                {!isCurrentNonEpf && (
                  <span className="text-[10px] font-mono text-slate-300">{currentEmployee.nic}</span>
                )}
              </div>
              <h3 className="text-base font-extrabold text-white tracking-tight truncate mt-0.5">
                {currentEmployee.fullName}
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Yearly Annual Leave Tracker Tile */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-lg px-3 py-1.5 text-[11px]">
              <CalendarDays className="w-4 h-4 text-amber-300 shrink-0" />
              <div>
                <span className="text-[9px] text-slate-300 block uppercase">
                  Annual Leave ({selectedYear})
                </span>
                <span
                  className={`font-mono font-extrabold ${
                    totalAnnualLeaveUsedThisYear >= ANNUAL_LEAVE_QUOTA_DAYS
                      ? 'text-rose-300'
                      : totalAnnualLeaveUsedThisYear >= 11
                        ? 'text-amber-300'
                        : 'text-emerald-300'
                  }`}
                >
                  {totalAnnualLeaveUsedThisYear} / {ANNUAL_LEAVE_QUOTA_DAYS}d{' '}
                  <span className="text-[10px] font-sans font-semibold text-slate-200">
                    (Left: {remainingAnnualLeave}d)
                  </span>
                </span>
              </div>
            </div>

            {/* Employer Statutory Preview Tiles */}
            <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-lg px-3 py-1.5 text-[11px]">
              <div>
                <span className="text-[9px] text-slate-300 block uppercase">Employer EPF 12%</span>
                <span className="font-mono font-bold text-indigo-200">
                  LKR {calculation?.epf12.toLocaleString() || '0'}
                </span>
              </div>
              <div className="w-px h-6 bg-white/15 mx-0.5" />
              <div>
                <span className="text-[9px] text-slate-300 block uppercase">Employer ETF 3%</span>
                <span className="font-mono font-bold text-emerald-300">
                  LKR {calculation?.etf3.toLocaleString() || '0'}
                </span>
              </div>
            </div>

            {/* Quick Prev/Next Employee Stepper */}
            <div className="flex items-center gap-1 bg-slate-950/60 border border-white/15 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => handleCycleEmployee(-1)}
                title="Previous Employee"
                aria-label="Previous Employee"
                className="p-1.5 rounded-md text-slate-200 hover:bg-white/15 hover:text-white transition cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 text-[11px] font-mono text-slate-300">
                {currentIndex + 1}/{employees.length}
              </span>
              <button
                type="button"
                onClick={() => handleCycleEmployee(1)}
                title="Next Employee"
                aria-label="Next Employee"
                className="p-1.5 rounded-md text-slate-200 hover:bg-white/15 hover:text-white transition cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Selector Controls Strip */}
        <div className="px-4 py-2.5 bg-slate-50/60 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="block text-[11px] font-bold text-slate-700">
                Select Employee *
              </label>
              <div className="flex items-center gap-1 text-[10px] font-bold">
                {(['ALL', 'EPF', 'NON_EPF'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setStaffTypeFilter(t)}
                    className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                      staffTypeFilter === t
                        ? t === 'NON_EPF'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-900 text-white'
                        : 'bg-slate-200/80 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {t === 'ALL' ? 'All' : t === 'EPF' ? 'EPF' : 'Non-EPF'}
                  </button>
                ))}
              </div>
            </div>
            <select
              value={currentEmployee.id}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
            >
              {(visibleEmployees.length > 0 ? visibleEmployees : employees).map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {isNonEpfEmployee(emp)
                    ? `[Non-EPF] ${emp.fullName} (${emp.role})`
                    : `EPF ${emp.epfNo} - ${emp.fullName} (${emp.role})`}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Payroll Month *
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
            >
              <option value="January 2026">January 2026</option>
              <option value="February 2026">February 2026</option>
              <option value="March 2026">March 2026</option>
              <option value="April 2026">April 2026</option>
              <option value="May 2026">May 2026</option>
              <option value="June 2026">June 2026</option>
              <option value="July 2026">July 2026</option>
              <option value="August 2026">August 2026</option>
              <option value="September 2026">September 2026</option>
              <option value="October 2026">October 2026</option>
              <option value="November 2026">November 2026</option>
              <option value="December 2026">December 2026</option>
              <option value="January 2027">January 2027</option>
              <option value="February 2027">February 2027</option>
              <option value="March 2027">March 2027</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Basic Salary Reference
            </label>
            <div className="px-3 py-1.5 bg-white rounded-lg border border-slate-200 font-mono font-extrabold text-slate-900 text-xs flex items-center justify-between">
              <span className="text-[10px] font-sans font-semibold text-slate-400">LKR</span>
              <span>{currentEmployee.basicSalary.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {isAllowanceLocked && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs sm:text-sm font-semibold flex items-center gap-3 shadow-xs">
          <Lock className="w-5 h-5 text-rose-600 shrink-0" />
          <span>
            Unpaid Leave / Absent exceeds 6 Days (48 Hours): Allowances &amp; Special Incentives are
            automatically locked (LKR 0.00). Basic salary, OT, and EPF/ETF deductions are calculated
            normally.
          </span>
        </div>
      )}

      {hasExcessDeductions && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-rose-300 text-rose-900 text-xs sm:text-sm font-semibold flex items-center gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>
            Warning: Total Deductions (LKR {calculation?.totalDeductions.toLocaleString()}) exceed
            Gross Earnings (LKR {calculation?.gross.toLocaleString()}). Reduce Salary Advance or
            absence/late hours to save this record.
          </span>
        </div>
      )}

      {/* 4 Compact Bento Calculator Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Card 1: OVERTIME & HOURS */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-3 flex flex-col justify-between border-t-4 border-t-blue-500">
          <div>
            <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-slate-100">
              <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                Overtime &amp; Hours
              </h3>
            </div>

            <div className="space-y-2.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700">OT Hours (1.5x)</label>
                  <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                    = LKR {calculation?.otAmt.toLocaleString() || '0'}
                  </span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={300}
                  step={0.25}
                  disabled={isPaidLocked}
                  value={otHours}
                  onChange={(e) => setOtHours(clampNumber(e.target.value, 0, 300))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
                <div className="flex items-center justify-between mt-1 gap-1">
                  <span className="text-[10px] text-slate-400">
                    LKR {calculation?.otRate || 0}/hr (÷208×1.5)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isPaidLocked}
                      onClick={() => setOtHours((v) => clampNumber(String(v + 1), 0, 300))}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-blue-100 text-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      +1h
                    </button>
                    <button
                      type="button"
                      disabled={isPaidLocked}
                      onClick={() => setOtHours((v) => clampNumber(String(v + 5), 0, 300))}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-blue-100 text-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      +5h
                    </button>
                    <button
                      type="button"
                      disabled={isPaidLocked}
                      onClick={() => setOtHours(0)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-rose-100 text-slate-500 disabled:opacity-40 cursor-pointer"
                    >
                      0
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700">SOT Hours (2.0x)</label>
                  <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                    = LKR {calculation?.sotAmt.toLocaleString() || '0'}
                  </span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={150}
                  step={0.25}
                  disabled={isPaidLocked}
                  value={sotHours}
                  onChange={(e) => setSotHours(clampNumber(e.target.value, 0, 150))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
                <div className="flex items-center justify-between mt-1 gap-1">
                  <span className="text-[10px] text-slate-400">
                    LKR {calculation?.sotRate || 0}/hr (÷208×2)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isPaidLocked}
                      onClick={() => setSotHours((v) => clampNumber(String(v + 1), 0, 150))}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-blue-100 text-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      +1h
                    </button>
                    <button
                      type="button"
                      disabled={isPaidLocked}
                      onClick={() => setSotHours((v) => clampNumber(String(v + 4), 0, 150))}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-blue-100 text-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      +4h
                    </button>
                    <button
                      type="button"
                      disabled={isPaidLocked}
                      onClick={() => setSotHours(0)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-rose-100 text-slate-500 disabled:opacity-40 cursor-pointer"
                    >
                      0
                    </button>
                  </div>
                </div>
              </div>

              {/* Additional Holiday / Triple OT / Poya / Sunday / Special Leave */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                    Triple OT (LKR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={200000}
                    step="any"
                    disabled={isPaidLocked}
                    value={totAmt}
                    onChange={(e) => setTotAmt(clampNumber(e.target.value, 0, 200000))}
                    className="w-full px-2 py-1 text-xs font-mono font-semibold border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                    Poya Day (LKR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={200000}
                    step="any"
                    disabled={isPaidLocked}
                    value={poyaDayAmt}
                    onChange={(e) => setPoyaDayAmt(clampNumber(e.target.value, 0, 200000))}
                    className="w-full px-2 py-1 text-xs font-mono font-semibold border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                    Sunday Pay (LKR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={200000}
                    step="any"
                    disabled={isPaidLocked}
                    value={sundayAmt}
                    onChange={(e) => setSundayAmt(clampNumber(e.target.value, 0, 200000))}
                    className="w-full px-2 py-1 text-xs font-mono font-semibold border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                    Special Leave (LKR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={200000}
                    step="any"
                    disabled={isPaidLocked}
                    value={specialLeaveAmt}
                    onChange={(e) => setSpecialLeaveAmt(clampNumber(e.target.value, 0, 200000))}
                    className="w-full px-2 py-1 text-xs font-mono font-semibold border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2.5 bg-blue-50/70 px-2.5 py-2 rounded-lg flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-blue-800 uppercase whitespace-nowrap">Total Overtime</span>
            <span className="text-sm font-mono font-black text-blue-950 whitespace-nowrap">
              LKR {formatLkr2(calculation?.totalOt || 0)}
            </span>
          </div>
        </div>

        {/* Card 2: ALLOWANCES */}
        <div
          className={`bg-white rounded-xl border border-slate-200/90 shadow-xs p-3 flex flex-col justify-between border-t-4 border-t-amber-500 transition ${
            isAllowanceLocked ? 'opacity-65 bg-slate-50' : ''
          }`}
        >
          <div>
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                  Allowances
                </h3>
              </div>
              {isAllowanceLocked && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-bold">
                  <Lock className="w-2.5 h-2.5" />
                  LOCKED
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Attendance Allowance
                  </label>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      attAllow === 5000
                        ? 'bg-emerald-100 text-emerald-800'
                        : attAllow === 2500
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {attAllow === 5000
                      ? 'Full Allowance'
                      : attAllow === 2500
                      ? lateHours >= 12 && totalLeaveAndAbsentDays < 1
                        ? `Late ${lateHours}h (≥12h) • Half`
                        : `${totalLeaveAndAbsentDays}d Absent • Half`
                      : lateHours >= 28 && totalLeaveAndAbsentDays < 2
                      ? `Late ${lateHours}h (≥28h) • None`
                      : `${totalLeaveAndAbsentDays}d Absent • None`}
                  </span>
                </div>
                <div
                  className={`w-full px-2.5 py-1.5 text-xs font-mono font-extrabold border rounded-lg flex items-center justify-between ${
                    attAllow === 5000
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : attAllow === 2500
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                      : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}
                >
                  <span>LKR {attAllow.toLocaleString()}</span>
                  <span className="text-[10px] font-sans font-medium opacity-75">
                    Leave: 1d+=2.5k, 2d+=0 | Late: 12h+=2.5k, 28h+=0
                  </span>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-amber-50/50 border border-amber-200/90 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-800">
                    Night Allowance (LKR)
                  </label>
                  <span className="text-[11px] font-mono font-extrabold text-amber-900">
                    = LKR {(isAllowanceLocked ? 0 : nightAllow).toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                      Night Days
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={31}
                      step={1}
                      disabled={inputsDisabled}
                      value={isAllowanceLocked ? 0 : nightDays}
                      onChange={(e) => {
                        const days = Math.floor(clampNumber(e.target.value, 0, 31));
                        setNightDays(days);
                        setNightAllow(Math.min(200000, Number((days * nightRate).toFixed(2))));
                      }}
                      className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                      Per Night (LKR)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={25000}
                      step={50}
                      disabled={inputsDisabled}
                      value={isAllowanceLocked ? 0 : nightRate}
                      onChange={(e) => {
                        const rate = clampNumber(e.target.value, 0, 25000);
                        setNightRate(rate);
                        setNightAllow(Math.min(200000, Number((nightDays * rate).toFixed(2))));
                      }}
                      className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Grade Allowance (Excl. Training)
                </label>
                <input
                  type="number"
                  min={0}
                  max={200000}
                  step={500}
                  disabled={inputsDisabled}
                  value={isAllowanceLocked ? 0 : gradeAllow}
                  onChange={(e) => setGradeAllow(clampNumber(e.target.value, 0, 200000))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Transport Allowance (LKR)
                </label>
                <input
                  type="number"
                  min={0}
                  max={200000}
                  step={250}
                  disabled={inputsDisabled}
                  value={isAllowanceLocked ? 0 : transAllow}
                  onChange={(e) => setTransAllow(clampNumber(e.target.value, 0, 200000))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="mt-2.5 bg-amber-50/70 px-2.5 py-2 rounded-lg flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-amber-800 uppercase whitespace-nowrap">Total Allowances</span>
            <span className="text-sm font-mono font-black text-amber-950 whitespace-nowrap">
              LKR {formatLkr2(calculation?.totalAllowances || 0)}
            </span>
          </div>
        </div>

        {/* Card 3: SPECIAL INCENTIVES */}
        <div
          className={`bg-white rounded-xl border border-slate-200/90 shadow-xs p-3 flex flex-col justify-between border-t-4 border-t-emerald-500 transition ${
            isAllowanceLocked ? 'opacity-65 bg-slate-50' : ''
          }`}
        >
          <div>
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Gift className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                  Special Incentives
                </h3>
              </div>
              {isAllowanceLocked && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-bold">
                  <Lock className="w-2.5 h-2.5" />
                  LOCKED
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Production Allowance / Incentive
                </label>
                <input
                  type="number"
                  min={0}
                  max={200000}
                  step={500}
                  disabled={inputsDisabled}
                  value={isAllowanceLocked ? 0 : prodAllow}
                  onChange={(e) => setProdAllow(clampNumber(e.target.value, 0, 200000))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  {[0, 5000, 10000, 20000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={inputsDisabled}
                      onClick={() => setProdAllow(preset)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 hover:bg-emerald-100 text-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      {preset === 0 ? '0' : `${preset / 1000}k`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Checking Allowance (Trimmer/Checker)
                </label>
                <input
                  type="number"
                  min={0}
                  max={200000}
                  step={250}
                  disabled={inputsDisabled}
                  value={isAllowanceLocked ? 0 : checkingAllow}
                  onChange={(e) => setCheckingAllow(clampNumber(e.target.value, 0, 200000))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  {[0, 2500, 5000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={inputsDisabled}
                      onClick={() => setCheckingAllow(preset)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 hover:bg-emerald-100 text-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      {preset === 0 ? '0' : preset.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2.5 bg-emerald-50/70 px-2.5 py-2 rounded-lg flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-emerald-800 uppercase whitespace-nowrap">Total Incentives</span>
            <span className="text-sm font-mono font-black text-emerald-950 whitespace-nowrap">
              LKR {formatLkr2(calculation?.totalSpecialIncentives || 0)}
            </span>
          </div>
        </div>

        {/* Card 4: DEDUCTIONS & ATTENDANCE */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-3 flex flex-col justify-between border-t-4 border-t-rose-500">
          <div>
            <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-slate-100">
              <div className="w-6 h-6 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
                <MinusCircle className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                Deductions
              </h3>
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[11px] font-semibold text-slate-700">EPF 8% Statutory</label>
                  <span
                    className={`text-[10px] ${
                      isCurrentNonEpf ? 'font-bold text-amber-700' : 'text-slate-400'
                    }`}
                  >
                    {isCurrentNonEpf ? 'Non-EPF Exempt (0%)' : '8% of (Basic − Late − Unpaid)'}
                  </span>
                </div>
                <div className="px-2.5 py-1.5 bg-rose-50/60 border border-rose-200 rounded-lg text-xs font-mono font-extrabold text-rose-900">
                  LKR {formatLkr2(calculation?.epf8 || 0)}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[11px] font-semibold text-slate-700">
                    Late &amp; Early Out (Hrs)
                  </label>
                  {calculation && calculation.lateDeduction > 0 && (
                    <span className="text-[10px] font-mono font-bold text-rose-600">
                      -LKR {calculation.lateDeduction.toLocaleString()}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min={0}
                  max={208}
                  step="any"
                  disabled={isPaidLocked}
                  value={lateHours}
                  onChange={(e) => setLateHours(clampNumber(e.target.value, 0, 208))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* Annual Leave (14 Days/Year Quota — Reduces Attendance Allowance Only) */}
              <div className="p-2 rounded-lg bg-indigo-50/60 border border-indigo-200/90 space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <label
                    htmlFor="salary-annual-leave-days"
                    className="text-[11px] font-bold text-indigo-950 flex items-center gap-1"
                  >
                    <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                    Annual Leave (14d/Yr)
                  </label>
                  <span
                    className={`text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded ${
                      totalAnnualLeaveUsedThisYear >= ANNUAL_LEAVE_QUOTA_DAYS
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {selectedYear}: {totalAnnualLeaveUsedThisYear}/{ANNUAL_LEAVE_QUOTA_DAYS}d
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    id="salary-annual-leave-days"
                    type="number"
                    min={0}
                    max={ANNUAL_LEAVE_QUOTA_DAYS}
                    step={0.5}
                    disabled={isPaidLocked}
                    value={annualLeaveDays}
                    onChange={(e) => handleAnnualLeaveChange(e.target.value)}
                    className="w-20 px-2 py-1 text-xs font-mono font-bold border border-indigo-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isPaidLocked}
                      onClick={() => handleAnnualLeaveChange(annualLeaveDays + 0.5)}
                      className="px-1.5 py-1 rounded text-[10px] font-bold bg-white hover:bg-indigo-100 border border-indigo-200 text-indigo-800 disabled:opacity-40 cursor-pointer"
                    >
                      +0.5d
                    </button>
                    <button
                      type="button"
                      disabled={isPaidLocked}
                      onClick={() => handleAnnualLeaveChange(annualLeaveDays + 1)}
                      className="px-1.5 py-1 rounded text-[10px] font-bold bg-white hover:bg-indigo-100 border border-indigo-200 text-indigo-800 disabled:opacity-40 cursor-pointer"
                    >
                      +1d
                    </button>
                    <button
                      type="button"
                      disabled={isPaidLocked}
                      onClick={() => handleAnnualLeaveChange(0)}
                      className="px-1.5 py-1 rounded text-[10px] font-bold bg-white hover:bg-rose-100 border border-slate-200 text-slate-500 disabled:opacity-40 cursor-pointer"
                    >
                      0
                    </button>
                  </div>
                </div>

                {/* Yearly 14-Day Progress Meter */}
                <div className="space-y-0.5">
                  <div className="h-1.5 w-full rounded-full bg-indigo-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        totalAnnualLeaveUsedThisYear >= ANNUAL_LEAVE_QUOTA_DAYS
                          ? 'bg-rose-600'
                          : totalAnnualLeaveUsedThisYear >= 11
                            ? 'bg-amber-500'
                            : 'bg-indigo-600'
                      }`}
                      style={{ width: `${annualLeavePct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-slate-600 font-medium">
                    <span>
                      Prior months: <strong>{usedLeaveOtherMonths}d</strong> • Left:{' '}
                      <strong
                        className={
                          remainingAnnualLeave === 0 ? 'text-rose-700' : 'text-emerald-700'
                        }
                      >
                        {remainingAnnualLeave}d
                      </strong>
                    </span>
                    <span className="text-amber-700 font-bold">Reduces Att. Allow.</span>
                  </div>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-rose-50/50 border border-rose-200/90 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-800">Unpaid Leave / Absents</label>
                  {calculation && calculation.unpaidDeduction > 0 && (
                    <span className="text-[10px] font-mono font-bold text-rose-600">
                      -LKR {calculation.unpaidDeduction.toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                      Days
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={26}
                      step="any"
                      disabled={isPaidLocked}
                      value={Number(unpaidDays.toFixed(4))}
                      onChange={(e) => setUnpaidDays(clampNumber(e.target.value, 0, 26))}
                      className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-rose-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                      Hours
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={208}
                      step="any"
                      disabled={isPaidLocked}
                      value={unpaidHours}
                      onChange={(e) => {
                        const hrs = clampNumber(e.target.value, 0, 208);
                        setUnpaidDays(Math.min(26, Number((hrs / 8).toFixed(6))));
                      }}
                      className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-rose-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* 6-Day (48h) Lock Threshold Meter */}
                <div className="space-y-0.5">
                  <div className="h-1 w-full rounded-full bg-rose-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isAllowanceLocked
                          ? 'bg-rose-600'
                          : unpaidDays >= 4
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${unpaidThresholdPct}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 block">
                    6 Days (48h) limit before Allowances lock (26d / 208h base)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Salary Advance (LKR)
                </label>
                <input
                  type="number"
                  min={0}
                  max={300000}
                  step={500}
                  disabled={isPaidLocked}
                  value={advance}
                  onChange={(e) => setAdvance(clampNumber(e.target.value, 0, 300000))}
                  className={`w-full px-2.5 py-1.5 text-xs font-mono font-semibold border rounded-lg focus:outline-hidden focus:ring-2 disabled:bg-slate-100 disabled:cursor-not-allowed ${
                    hasExcessDeductions
                      ? 'border-rose-500 focus:ring-rose-500 bg-rose-50/40'
                      : 'border-slate-300 focus:ring-rose-500'
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="mt-2.5 bg-rose-50/70 px-2.5 py-2 rounded-lg flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-rose-800 uppercase whitespace-nowrap">Total Deductions</span>
            <span className="text-sm font-mono font-black text-rose-950 whitespace-nowrap">
              LKR {formatLkr2(calculation?.totalDeductions || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Sharp Compact Financial Summary Bar */}
      <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-md border border-slate-800 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 min-w-0">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider whitespace-nowrap">
              Basic Salary
            </span>
            <span className="text-sm font-mono font-bold text-slate-100 whitespace-nowrap">
              LKR {formatLkr2(calculation?.basic || 0)}
            </span>
          </div>

          <div className="pl-3 border-l border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider whitespace-nowrap">
              Additions
            </span>
            <span className="text-sm font-mono font-bold text-indigo-300 whitespace-nowrap">
              +LKR {formatLkr2(totalAdditions)}
            </span>
          </div>

          <div className="pl-3 border-l border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider whitespace-nowrap">
              Gross Salary
            </span>
            <span className="text-sm font-mono font-bold text-amber-300 whitespace-nowrap">
              LKR {formatLkr2(calculation?.gross || 0)}
            </span>
          </div>

          <div className="pl-3 border-l border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider whitespace-nowrap">
              Deductions
            </span>
            <span className="text-sm font-mono font-bold text-rose-400 whitespace-nowrap">
              -LKR {formatLkr2(calculation?.totalDeductions || 0)}
            </span>
          </div>

          <div className="pl-3 border-l border-slate-800">
            <span className="text-[10px] text-emerald-400 block uppercase font-bold tracking-wider whitespace-nowrap">
              Net Salary
            </span>
            <span className="text-base xl:text-lg font-mono font-black text-emerald-400 tracking-tight whitespace-nowrap">
              LKR {formatLkr2(calculation?.net || 0)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 shrink-0">
          {statusMsg && (
            <div
              role="status"
              aria-live="polite"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300 whitespace-nowrap'
                  : 'bg-rose-500/15 border-rose-400/40 text-rose-200 max-w-xs sm:max-w-sm'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {isPaidLocked ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-bold whitespace-nowrap">
                <Lock className="w-3.5 h-3.5" />
                Paid &amp; Locked
              </span>
              {pendingUnlockRequests[`${currentEmployee.id}::${month}`] && (
                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-bold whitespace-nowrap">
                  <Clock className="w-3.5 h-3.5" />
                  Pending Admin Approval
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setUnlockError(null);
                  setUnlockModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Unlock className="w-3.5 h-3.5" />
                {pendingUnlockRequests[`${currentEmployee.id}::${month}`]
                  ? 'Admin Request Pending'
                  : 'Request Admin Edit / Unlock'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm transition flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer whitespace-nowrap ${
                shakeSaveBtn
                  ? 'animate-shake ring-2 ring-rose-400 bg-rose-600 hover:bg-rose-600'
                  : isExistingRecord
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isExistingRecord ? 'Update Salary' : 'Save Salary'}
            </button>
          )}
        </div>
      </div>

      {/* Update Confirmation Native Dialog */}
      <dialog
        ref={confirmUpdateDialogRef}
        aria-labelledby="confirm-update-title"
        onClose={() => setPendingUpdateData(null)}
        className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-2xl border border-amber-200/90 bg-white p-0 shadow-2xl text-slate-900"
      >
        <div className="flex flex-col overflow-hidden rounded-2xl">
          <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white px-5 py-4 flex items-center justify-between gap-3">
            <div>
              <h3 id="confirm-update-title" className="text-base font-bold text-white">
                Confirm Salary Update
              </h3>
              <p className="text-xs text-amber-200/90 mt-0.5">
                Are you sure you want to overwrite the saved salary record?
              </p>
            </div>
          </div>

          <div className="p-5 space-y-3 text-sm text-slate-700">
            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800">
                  EPF #{currentEmployee.epfNo}
                </span>
                <span className="text-xs font-semibold text-slate-500">{month}</span>
              </div>
              <div className="font-extrabold text-slate-900 text-sm">{currentEmployee.fullName}</div>
              <div className="text-xs font-mono font-bold text-emerald-700">
                Updated Net Salary: LKR {formatLkr2(calculation?.net || 0)}
              </div>
            </div>
            <p className="text-xs text-slate-600">
              This will replace the previously saved salary values for <strong>{month}</strong>.
            </p>
          </div>

          <div className="bg-slate-50 border-t border-slate-200/80 px-5 py-3.5 flex items-center justify-end gap-2.5">
            <button
              type="button"
              autoFocus
              onClick={() => setPendingUpdateData(null)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading || !pendingUpdateData}
              onClick={() => pendingUpdateData && executeSave(pendingUpdateData)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Yes, Update Salary
            </button>
          </div>
        </div>
      </dialog>

      {/* Annual Leave 14-Day Quota Exceeded Popup Dialog */}
      <dialog
        ref={leaveLimitDialogRef}
        aria-labelledby="annual-leave-limit-title"
        onClose={() => setLeaveLimitPopup(null)}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-rose-300 bg-white p-0 shadow-2xl text-slate-900 backdrop:bg-slate-950/60 backdrop:backdrop-blur-xs"
      >
        {leaveLimitPopup && (
          <div className="flex flex-col overflow-hidden rounded-2xl">
            <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 text-white px-5 py-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/25 border border-rose-300/40 text-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 id="annual-leave-limit-title" className="text-base font-extrabold text-white">
                  Annual Leave Limit Exceeded (14 Days / Year)
                </h3>
                <p className="text-xs text-rose-200 mt-0.5">
                  වාර්ෂික නිවාඩු දින 14 සීමාව ඉක්මවා ඇත — Unpaid Leave වලට ඇතුළත් කරන්න!
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-slate-700">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800">
                    EPF #{currentEmployee.epfNo}
                  </span>
                  <span className="font-bold text-slate-500">Year {leaveLimitPopup.year}</span>
                </div>
                <div className="text-sm font-black text-slate-900">
                  {currentEmployee.fullName}
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="bg-white rounded-lg p-2 border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-semibold">Yearly Quota</div>
                    <div className="text-sm font-mono font-black text-slate-900">14 Days</div>
                  </div>
                  <div className="bg-white rounded-lg p-2 border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-semibold">Used in Prior Mos</div>
                    <div className="text-sm font-mono font-black text-indigo-700">
                      {leaveLimitPopup.usedOtherMonths}d
                    </div>
                  </div>
                  <div className="bg-rose-50 rounded-lg p-2 border border-rose-200">
                    <div className="text-[10px] text-rose-700 font-bold">Excess Leave</div>
                    <div className="text-sm font-mono font-black text-rose-700">
                      +{leaveLimitPopup.excess}d
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 font-semibold leading-relaxed">
                සේවකයෙකුට වසරකට ලබාගත හැක්කේ <strong>Annual Leave දින 14ක්</strong> පමණි. දින 14 ඉක්මවන අමතර නිවාඩු දින (<strong>+{leaveLimitPopup.excess} Day(s)</strong>) Annual Leave යටතට දැමිය නොහැක — කරුණාකර එම අමතර නිවාඩු <strong>&ldquo;Unpaid Leave / Absents&rdquo;</strong> කොටසට ඇතුළත් කරන්න!
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const excessToAdd = leaveLimitPopup.excess;
                  setUnpaidDays((prev) =>
                    Math.min(26, Number((prev + excessToAdd).toFixed(2)))
                  );
                  setLeaveLimitPopup(null);
                  setStatusMsg({
                    type: 'success',
                    text: `Added +${excessToAdd}d excess leave to Unpaid Leave / Absents.`,
                  });
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-xs transition cursor-pointer"
              >
                Move +{leaveLimitPopup.excess}d to Unpaid Leave Now
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => setLeaveLimitPopup(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
              >
                OK, Got It
              </button>
            </div>
          </div>
        )}
      </dialog>

      {unlockModalOpen && (
        <AdminUnlockModal
          isOpen={unlockModalOpen}
          employeeName={currentEmployee.fullName}
          epfNo={currentEmployee.epfNo}
          month={month}
          netSalary={calculation?.net}
          loading={unlockLoading}
          errorMsg={unlockError}
          hasPendingRequest={Boolean(pendingUnlockRequests[`${currentEmployee.id}::${month}`])}
          onClose={() => setUnlockModalOpen(false)}
          onConfirm={handleAdminUnlock}
          onSendRequestToAdmin={handleSendPayrollEditRequestToAdmin}
        />
      )}
    </div>
  );
}
