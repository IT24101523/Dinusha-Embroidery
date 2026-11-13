'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { EmployeeEntity, PayrollCalculationBreakdown } from '@/modules/payroll/domain/entities';
import {
  MonthlySalaryInputData,
  monthlySalaryInputSchema,
} from '@/modules/payroll/domain/validation';
import { calculateSalaryForEmployee } from '@/modules/payroll/domain/calculator';
import {
  saveMonthlySalaryAction,
  fetchSalaryRecordAction,
  updateSalaryPaymentStatusAction,
} from '@/actions/payroll';
import { AdminUnlockModal } from './admin-unlock-modal';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Gift,
  MinusCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Lock,
  BadgeCheck,
  Unlock,
  ShieldAlert,
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
  const [month, setMonth] = useState<string>('October 2026');

  // Input states
  const [otHours, setOtHours] = useState<number>(0);
  const [sotHours, setSotHours] = useState<number>(0);
  const [totAmt, setTotAmt] = useState<number>(0);
  const [poyaDayAmt, setPoyaDayAmt] = useState<number>(0);
  const [sundayAmt, setSundayAmt] = useState<number>(0);
  const [specialLeaveAmt, setSpecialLeaveAmt] = useState<number>(0);

  const [attAllow, setAttAllow] = useState<number>(5000);
  const [nightDays, setNightDays] = useState<number>(0);
  const [nightRate, setNightRate] = useState<number>(0);
  const [nightAllow, setNightAllow] = useState<number>(0);
  const [gradeAllow, setGradeAllow] = useState<number>(0);
  const [transAllow, setTransAllow] = useState<number>(3750);

  const [prodAllow, setProdAllow] = useState<number>(0);
  const [checkingAllow, setCheckingAllow] = useState<number>(0);

  const [lateHours, setLateHours] = useState<number>(0);
  const [unpaidDays, setUnpaidDays] = useState<number>(0);
  const [advance, setAdvance] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [recordStatus, setRecordStatus] = useState<'DRAFT' | 'APPROVED' | 'PAID' | null>(null);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Active employee
  const currentEmployee = useMemo(() => {
    return employees.find((e) => e.id === selectedId) || employees[0] || null;
  }, [employees, selectedId]);

  const currentIndex = useMemo(() => {
    if (!currentEmployee) return -1;
    return employees.findIndex((e) => e.id === currentEmployee.id);
  }, [employees, currentEmployee]);

  const handleCycleEmployee = (direction: -1 | 1) => {
    if (employees.length === 0 || currentIndex === -1) return;
    const nextIdx = (currentIndex + direction + employees.length) % employees.length;
    setSelectedId(employees[nextIdx].id);
  };

  // Load existing salary record when employee or month changes
  useEffect(() => {
    if (!currentEmployee) return;

    let isMounted = true;
    async function loadExisting() {
      setStatusMsg(null);
      const res = await fetchSalaryRecordAction(currentEmployee!.id, month);
      if (isMounted && res.success && res.data) {
        const d = res.data;
        setOtHours(d.otHours);
        setSotHours(d.sotHours);
        setTotAmt(d.totAmt);
        setPoyaDayAmt(d.poyaDayAmt);
        setSundayAmt(d.sundayAmt);
        setSpecialLeaveAmt(d.specialLeaveAmt);

        setAttAllow(d.attAllow);
        setNightAllow(d.nightAllow);
        setNightDays(d.nightAllow > 0 ? 1 : 0);
        setNightRate(d.nightAllow > 0 ? d.nightAllow : 0);
        setGradeAllow(d.gradeAllow);
        setTransAllow(d.transAllow);

        setProdAllow(d.prodAllow);
        setCheckingAllow(d.checkingAllow);

        setLateHours(d.lateHours);
        setUnpaidDays(d.unpaidDays);
        setAdvance(d.advance);
        setRecordStatus((d.status as 'DRAFT' | 'APPROVED' | 'PAID') || 'APPROVED');
      } else if (isMounted) {
        // Reset to smart defaults for this employee
        setRecordStatus(null);
        setOtHours(0);
        setSotHours(0);
        setTotAmt(0);
        setPoyaDayAmt(0);
        setSundayAmt(0);
        setSpecialLeaveAmt(0);

        setAttAllow(5000);
        setNightDays(0);
        setNightRate(0);
        setNightAllow(0);
        setGradeAllow(currentEmployee!.role.includes('Supervisor') ? 35000 : 0);
        setTransAllow(3750);

        setProdAllow(currentEmployee!.role.includes('Supervisor') ? 20000 : 0);
        setCheckingAllow(0);

        setLateHours(0);
        setUnpaidDays(0);
        setAdvance(0);
      }
    }

    loadExisting();
    return () => {
      isMounted = false;
    };
  }, [currentEmployee, month]);

  const isPaidLocked = recordStatus === 'PAID';
  const isAllowanceLocked = unpaidDays > 6;
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
      setStatusMsg({
        type: 'error',
        text: 'This salary has already been marked as PAID and is locked. Admin authorization is required to unlock it before updating.',
      });
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
      lateHours,
      unpaidDays,
      advance,
    };

    const parsed = monthlySalaryInputSchema.safeParse(inputData);
    if (!parsed.success) {
      setStatusMsg({
        type: 'error',
        text:
          parsed.error.issues[0]?.message || 'Invalid salary input values. Please check your entries.',
      });
      return null;
    }

    if (calculation.totalDeductions > calculation.gross) {
      setStatusMsg({
        type: 'error',
        text: `Cannot save: Total deductions (LKR ${formatLkr2(calculation.totalDeductions)}) exceed gross earnings (LKR ${formatLkr2(calculation.gross)}). Reduce Salary Advance or absence/late deductions first.`,
      });
      return null;
    }

    return parsed.data;
  };

  const handleSave = async () => {
    if (!currentEmployee || !calculation) return;
    setStatusMsg(null);

    const validated = validateSalaryInput();
    if (!validated) return;

    setLoading(true);
    const res = await saveMonthlySalaryAction(validated);
    setLoading(false);

    if (res.success && res.breakdown) {
      setRecordStatus((res.breakdown.status as 'APPROVED' | 'PAID') || 'APPROVED');
      setStatusMsg({
        type: 'success',
        text: `Successfully calculated & saved ${month} salary for ${currentEmployee.fullName} (Net: LKR ${formatLkr2(res.breakdown.net)})`,
      });
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Failed to save salary record.' });
    }
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
        text: `Salary unlocked via Admin Approval ("${adminReason}"). You can now edit and re-save ${currentEmployee.fullName}'s salary.`,
      });
    } else {
      setUnlockError(res.error || 'Admin authorization failed.');
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
    <div className="space-y-5">
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl text-sm flex items-center gap-3 shadow-xs border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{statusMsg.text}</span>
        </div>
      )}

      {/* Employee Command Hero & Selector Studio */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {currentEmployee.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentEmployee.photoUrl}
                alt={currentEmployee.fullName}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-400/60 shrink-0 shadow-md"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/30 text-indigo-100 border border-indigo-400/40 flex items-center justify-center text-lg font-black shrink-0 shadow-md">
                {(currentEmployee.initials || currentEmployee.fullName || '?')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-500/30 border border-indigo-400/40 text-indigo-100">
                  EPF #{currentEmployee.epfNo}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/10 text-slate-200">
                  {currentEmployee.role}
                </span>
                <span className="text-[11px] font-mono text-slate-300">{currentEmployee.nic}</span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight truncate mt-1">
                {currentEmployee.fullName}
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Employer Statutory Preview Tiles */}
            <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-3.5 py-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-300 block uppercase">Employer EPF 12%</span>
                <span className="font-mono font-bold text-indigo-200">
                  LKR {calculation?.epf12.toLocaleString() || '0'}
                </span>
              </div>
              <div className="w-px h-7 bg-white/15 mx-1" />
              <div>
                <span className="text-[10px] text-slate-300 block uppercase">Employer ETF 3%</span>
                <span className="font-mono font-bold text-emerald-300">
                  LKR {calculation?.etf3.toLocaleString() || '0'}
                </span>
              </div>
            </div>

            {/* Quick Prev/Next Employee Stepper */}
            <div className="flex items-center gap-1 bg-slate-950/60 border border-white/15 rounded-xl p-1">
              <button
                type="button"
                onClick={() => handleCycleEmployee(-1)}
                title="Previous Employee"
                aria-label="Previous Employee"
                className="p-2 rounded-lg text-slate-200 hover:bg-white/15 hover:text-white transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-[11px] font-mono text-slate-300">
                {currentIndex + 1}/{employees.length}
              </span>
              <button
                type="button"
                onClick={() => handleCycleEmployee(1)}
                title="Next Employee"
                aria-label="Next Employee"
                className="p-2 rounded-lg text-slate-200 hover:bg-white/15 hover:text-white transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Selector Controls Strip */}
        <div className="p-4 sm:p-5 bg-slate-50/60 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Select Employee *
            </label>
            <select
              value={currentEmployee.id}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-semibold border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  EPF {emp.epfNo} - {emp.fullName} ({emp.role})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Payroll Month *
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-semibold border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
            >
              <option value="October 2026">October 2026</option>
              <option value="September 2026">September 2026</option>
              <option value="November 2026">November 2026</option>
              <option value="December 2026">December 2026</option>
              <option value="August 2026">August 2026</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-500 mb-1.5">
              Basic Salary Reference
            </label>
            <div className="px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 font-mono font-extrabold text-slate-900 text-sm flex items-center justify-between">
              <span className="text-[11px] font-sans font-semibold text-slate-400">LKR</span>
              <span>{currentEmployee.basicSalary.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {isPaidLocked && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <BadgeCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-emerald-950 flex items-center gap-2">
                SALARY PAID &amp; LOCKED ({month})
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                Disbursement has been confirmed. Further updates are blocked unless an Admin unlocks this record.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setUnlockError(null);
              setUnlockModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-xs cursor-pointer shrink-0"
          >
            <ShieldAlert className="w-4 h-4" />
            Admin Approval to Unlock
          </button>
        </div>
      )}

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

      {/* 4 Elevated Bento Calculator Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: OVERTIME & HOURS */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between border-t-4 border-t-blue-500">
          <div>
            <div className="flex items-center gap-2 pb-3 mb-3.5 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Overtime &amp; Hours
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">OT Hours (1.5x)</label>
                  <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md">
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
                  className="w-full px-3 py-2 text-sm font-mono font-semibold border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
                <div className="flex items-center justify-between mt-1.5 gap-1">
                  <span className="text-[10px] text-slate-400">
                    LKR {calculation?.otRate || 0}/hr
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isPaidLocked}
                      onClick={() => setOtHours((v) => clampNumber(String(v + 1), 0, 300))}
                      className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-blue-100 text-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      +1h
                    </button>
                    <button
                      type="button"
                      disabled={isPaidLocked}
                      onClick={() => setOtHours((v) => clampNumber(String(v + 5), 0, 300))}
                      className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-blue-100 text-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      +5h
                    </button>
                    <button
                      type="button"
                      disabled={isPaidLocked}
                      onClick={() => setOtHours(0)}
                      className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-rose-100 text-slate-500 disabled:opacity-40 cursor-pointer"
                    >
                      0
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">SOT Hours (2.0x)</label>
                  <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md">
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
                  className="w-full px-3 py-2 text-sm font-mono font-semibold border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
                <div className="flex items-center justify-between mt-1.5 gap-1">
                  <span className="text-[10px] text-slate-400">
                    LKR {calculation?.sotRate || 0}/hr
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isPaidLocked}
                      onClick={() => setSotHours((v) => clampNumber(String(v + 1), 0, 150))}
                      className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-blue-100 text-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      +1h
                    </button>
                    <button
                      type="button"
                      disabled={isPaidLocked}
                      onClick={() => setSotHours((v) => clampNumber(String(v + 4), 0, 150))}
                      className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-blue-100 text-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      +4h
                    </button>
                    <button
                      type="button"
                      disabled={isPaidLocked}
                      onClick={() => setSotHours(0)}
                      className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-rose-100 text-slate-500 disabled:opacity-40 cursor-pointer"
                    >
                      0
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 bg-blue-50/70 p-3 rounded-xl flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-blue-800 uppercase whitespace-nowrap">Total Overtime</span>
            <span className="text-sm sm:text-base font-mono font-black text-blue-950 whitespace-nowrap">
              LKR {formatLkr2(calculation?.totalOt || 0)}
            </span>
          </div>
        </div>

        {/* Card 2: ALLOWANCES */}
        <div
          className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between border-t-4 border-t-amber-500 transition ${
            isAllowanceLocked ? 'opacity-65 bg-slate-50' : ''
          }`}
        >
          <div>
            <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Allowances
                </h3>
              </div>
              {isAllowanceLocked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold">
                  <Lock className="w-3 h-3" />
                  LOCKED
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Attendant Allowance (Fixed 5,000)
                </label>
                <input
                  type="number"
                  min={0}
                  max={200000}
                  step={500}
                  disabled={inputsDisabled}
                  value={isAllowanceLocked ? 0 : attAllow}
                  onChange={(e) => setAttAllow(clampNumber(e.target.value, 0, 200000))}
                  className="w-full px-3 py-2 text-sm font-mono font-semibold border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/90 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Night Allowance (LKR)
                  </label>
                  <span className="text-xs font-mono font-extrabold text-amber-900">
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
                      className="w-full px-2.5 py-1.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
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
                      className="w-full px-2.5 py-1.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                  className="w-full px-3 py-2 text-sm font-mono font-semibold border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                  className="w-full px-3 py-2 text-sm font-mono font-semibold border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 bg-amber-50/70 p-3 rounded-xl flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-amber-800 uppercase whitespace-nowrap">Total Allowances</span>
            <span className="text-sm sm:text-base font-mono font-black text-amber-950 whitespace-nowrap">
              LKR {formatLkr2(calculation?.totalAllowances || 0)}
            </span>
          </div>
        </div>

        {/* Card 3: SPECIAL INCENTIVES */}
        <div
          className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between border-t-4 border-t-emerald-500 transition ${
            isAllowanceLocked ? 'opacity-65 bg-slate-50' : ''
          }`}
        >
          <div>
            <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Gift className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Special Incentives
                </h3>
              </div>
              {isAllowanceLocked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold">
                  <Lock className="w-3 h-3" />
                  LOCKED
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                  className="w-full px-3 py-2 text-sm font-mono font-semibold border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  {[0, 5000, 10000, 20000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={inputsDisabled}
                      onClick={() => setProdAllow(preset)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 hover:bg-emerald-100 text-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      {preset === 0 ? '0' : `${preset / 1000}k`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                  className="w-full px-3 py-2 text-sm font-mono font-semibold border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  {[0, 2500, 5000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={inputsDisabled}
                      onClick={() => setCheckingAllow(preset)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 hover:bg-emerald-100 text-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      {preset === 0 ? '0' : preset.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 bg-emerald-50/70 p-3 rounded-xl flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-emerald-800 uppercase whitespace-nowrap">Total Incentives</span>
            <span className="text-sm sm:text-base font-mono font-black text-emerald-950 whitespace-nowrap">
              LKR {formatLkr2(calculation?.totalSpecialIncentives || 0)}
            </span>
          </div>
        </div>

        {/* Card 4: DEDUCTIONS & ATTENDANCE */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between border-t-4 border-t-rose-500">
          <div>
            <div className="flex items-center gap-2 pb-3 mb-3.5 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <MinusCircle className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Deductions
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">EPF 8% Statutory</label>
                  <span className="text-[10px] text-slate-400">8% of Basic</span>
                </div>
                <div className="px-3 py-2 bg-rose-50/60 border border-rose-200 rounded-xl text-sm font-mono font-extrabold text-rose-900">
                  LKR {calculation?.epf8.toLocaleString() || '0.00'}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Late &amp; Early Out (Hrs)
                  </label>
                  {calculation && calculation.lateDeduction > 0 && (
                    <span className="text-[11px] font-mono font-bold text-rose-600">
                      -LKR {calculation.lateDeduction.toLocaleString()}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min={0}
                  max={200}
                  step={0.5}
                  disabled={isPaidLocked}
                  value={lateHours}
                  onChange={(e) => setLateHours(clampNumber(e.target.value, 0, 200))}
                  className="w-full px-3 py-2 text-sm font-mono font-semibold border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-200/90 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Unpaid Leave / Absents</label>
                  {calculation && calculation.unpaidDeduction > 0 && (
                    <span className="text-[11px] font-mono font-bold text-rose-600">
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
                      max={25}
                      step={0.5}
                      disabled={isPaidLocked}
                      value={unpaidDays}
                      onChange={(e) => setUnpaidDays(clampNumber(e.target.value, 0, 25))}
                      className="w-full px-2.5 py-1.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                      Hours
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={200}
                      step={1}
                      disabled={isPaidLocked}
                      value={unpaidHours}
                      onChange={(e) => {
                        const hrs = clampNumber(e.target.value, 0, 200);
                        setUnpaidDays(Math.min(25, Number((hrs / 8).toFixed(2))));
                      }}
                      className="w-full px-2.5 py-1.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* 6-Day (48h) Lock Threshold Meter */}
                <div className="space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-rose-100 overflow-hidden">
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
                  <span className="text-[10px] text-slate-500 block">
                    6 Days (48h) limit before Allowances lock (max 25d)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                  className={`w-full px-3 py-2 text-sm font-mono font-semibold border rounded-xl focus:outline-hidden focus:ring-2 disabled:bg-slate-100 disabled:cursor-not-allowed ${
                    hasExcessDeductions
                      ? 'border-rose-500 focus:ring-rose-500 bg-rose-50/40'
                      : 'border-slate-300 focus:ring-rose-500'
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 bg-rose-50/70 p-3 rounded-xl flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-rose-800 uppercase whitespace-nowrap">Total Deductions</span>
            <span className="text-sm sm:text-base font-mono font-black text-rose-950 whitespace-nowrap">
              LKR {formatLkr2(calculation?.totalDeductions || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Sharp Single-Row Financial Summary Bar */}
      <div className="bg-slate-900 text-white px-5 py-4 rounded-2xl shadow-lg border border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-x-5 xl:gap-x-6 gap-y-3 sm:divide-x sm:divide-slate-800 min-w-0">
          <div className="pr-1">
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider whitespace-nowrap">
              Basic Salary
            </span>
            <span className="text-sm font-mono font-bold text-slate-100 whitespace-nowrap">
              LKR {formatLkr2(calculation?.basic || 0)}
            </span>
          </div>

          <div className="sm:pl-5 xl:pl-6 pr-1">
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider whitespace-nowrap">
              Additions
            </span>
            <span className="text-sm font-mono font-bold text-indigo-300 whitespace-nowrap">
              +LKR {formatLkr2(totalAdditions)}
            </span>
          </div>

          <div className="sm:pl-5 xl:pl-6 pr-1">
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider whitespace-nowrap">
              Gross Salary
            </span>
            <span className="text-sm font-mono font-bold text-amber-300 whitespace-nowrap">
              LKR {formatLkr2(calculation?.gross || 0)}
            </span>
          </div>

          <div className="sm:pl-5 xl:pl-6 pr-1">
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider whitespace-nowrap">
              Deductions
            </span>
            <span className="text-sm font-mono font-bold text-rose-400 whitespace-nowrap">
              -LKR {formatLkr2(calculation?.totalDeductions || 0)}
            </span>
          </div>

          <div className="sm:pl-5 xl:pl-6">
            <span className="text-[10px] text-emerald-400 block uppercase font-bold tracking-wider whitespace-nowrap">
              Net Salary
            </span>
            <span className="text-base xl:text-lg font-mono font-black text-emerald-400 tracking-tight whitespace-nowrap">
              LKR {formatLkr2(calculation?.net || 0)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {isPaidLocked ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-bold whitespace-nowrap">
                <Lock className="w-3.5 h-3.5" />
                Paid &amp; Locked
              </span>
              <button
                type="button"
                onClick={() => {
                  setUnlockError(null);
                  setUnlockModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Unlock className="w-3.5 h-3.5" />
                Admin Unlock
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm transition flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save &amp; Update Salary
            </button>
          )}
        </div>
      </div>

      {unlockModalOpen && (
        <AdminUnlockModal
          isOpen={unlockModalOpen}
          employeeName={currentEmployee.fullName}
          epfNo={currentEmployee.epfNo}
          month={month}
          netSalary={calculation?.net}
          loading={unlockLoading}
          errorMsg={unlockError}
          onClose={() => setUnlockModalOpen(false)}
          onConfirm={handleAdminUnlock}
        />
      )}
    </div>
  );
}
