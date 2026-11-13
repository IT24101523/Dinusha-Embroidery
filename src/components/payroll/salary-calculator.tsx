'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { EmployeeEntity, PayrollCalculationBreakdown } from '@/modules/payroll/domain/entities';
import { MonthlySalaryInputData } from '@/modules/payroll/domain/validation';
import { calculateSalaryForEmployee } from '@/modules/payroll/domain/calculator';
import { saveMonthlySalaryAction, fetchSalaryRecordAction } from '@/actions/payroll';
import {
  Calculator,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Gift,
  MinusCircle,
  Loader2,
} from 'lucide-react';

interface SalaryCalculatorProps {
  employees: EmployeeEntity[];
  selectedEmployeeId?: string;
}

export function SalaryCalculator({ employees, selectedEmployeeId }: SalaryCalculatorProps) {
  const [selectedId, setSelectedId] = useState<string>(selectedEmployeeId || (employees[0]?.id || ''));
  const [month, setMonth] = useState<string>('October 2026');

  // Input states matching Image 3 & Image 2
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
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active employee
  const currentEmployee = useMemo(() => {
    return employees.find((e) => e.id === selectedId) || employees[0] || null;
  }, [employees, selectedId]);

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
      } else if (isMounted) {
        // Reset to smart defaults for this employee
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

  const handleSave = async () => {
    if (!currentEmployee || !calculation) return;

    setLoading(true);
    setStatusMsg(null);

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

    const res = await saveMonthlySalaryAction(inputData);
    setLoading(false);

    if (res.success && res.breakdown) {
      setStatusMsg({
        type: 'success',
        text: `Successfully calculated & saved ${month} salary for ${currentEmployee.fullName} (Net: LKR ${res.breakdown.net.toLocaleString()})`,
      });
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Failed to save salary record.' });
    }
  };

  if (!currentEmployee) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
        <p className="text-slate-600">Please register employees first in the Employee Master CRUD tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner (Matches Image 3) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">
                MONTHLY SALARY CALCULATOR & UPDATER
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {month}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Individual staff salary calculation, Sri Lankan statutory EPF/ETF & allowance orchestration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Deductions Fixed: Strictly Zero Unless Entered
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

      {/* Selectors Bar (Matches Image 3 top row) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Employee Dropdown */}
        <div className="md:col-span-5">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Select Employee *
          </label>
          <select
            value={currentEmployee.id}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm font-semibold border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                EPF {emp.epfNo} - {emp.fullName} ({emp.role})
              </option>
            ))}
          </select>
        </div>

        {/* Month Selector */}
        <div className="md:col-span-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Payroll Month *
          </label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm font-semibold border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
          >
            <option value="October 2026">October 2026 (ඔක්තෝබර්)</option>
            <option value="September 2026">September 2026 (සැප්තැම්බර්)</option>
            <option value="November 2026">November 2026 (නොවැම්බර්)</option>
            <option value="December 2026">December 2026 (දෙසැම්බර්)</option>
            <option value="August 2026">August 2026 (අගෝස්තු)</option>
          </select>
        </div>

        {/* Basic Salary Reference */}
        <div className="md:col-span-3">
          <label className="block text-xs font-semibold text-slate-500 mb-1">
            Basic Salary (Reference)
          </label>
          <div className="px-3.5 py-2.5 bg-slate-100 rounded-lg border border-slate-200 font-bold text-slate-800 text-sm">
            LKR {currentEmployee.basicSalary.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 4 Cards Grid (Exact replica of Image 3) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: OVERTIME & HOURS */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-100">
              <Clock className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Overtime & Hours
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  OT Hours (1.5x Rate)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.25}
                  value={otHours}
                  onChange={(e) => setOtHours(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Rate: LKR {calculation?.otRate || 0}/hr
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  SOT Hours (2.0x Rate)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.25}
                  value={sotHours}
                  onChange={(e) => setSotHours(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Rate: LKR {calculation?.sotRate || 0}/hr
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 bg-blue-50/50 p-2.5 rounded-lg">
            <span className="text-[11px] font-semibold text-blue-700 block uppercase">
              Total Overtime & Hours
            </span>
            <span className="text-base font-black text-blue-900">
              LKR {calculation?.totalOt.toLocaleString() || '0.00'}
            </span>
          </div>
        </div>

        {/* Card 2: ALLOWANCES */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-100">
              <DollarSign className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Allowances
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Attendant Allowance (Fixed 5,000)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={attAllow}
                  onChange={(e) => setAttAllow(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-amber-50/40 border border-amber-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Night Allowance (LKR)
                  </label>
                  <span className="text-xs font-bold text-amber-800">
                    = LKR {nightAllow.toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                      Night Days (දින ගණන)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={nightDays}
                      onChange={(e) => {
                        const days = Math.max(0, Number(e.target.value) || 0);
                        setNightDays(days);
                        setNightAllow(Number((days * nightRate).toFixed(2)));
                      }}
                      className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                      Per Night (එකකට LKR)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={nightRate}
                      onChange={(e) => {
                        const rate = Math.max(0, Number(e.target.value) || 0);
                        setNightRate(rate);
                        setNightAllow(Number((nightDays * rate).toFixed(2)));
                      }}
                      className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Grade Allowance (Excl. Training)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={gradeAllow}
                  onChange={(e) => setGradeAllow(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Transport Allowance (LKR)
                </label>
                <input
                  type="number"
                  min={0}
                  step={250}
                  value={transAllow}
                  onChange={(e) => setTransAllow(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 bg-amber-50/50 p-2.5 rounded-lg">
            <span className="text-[11px] font-semibold text-amber-700 block uppercase">
              Total Allowances
            </span>
            <span className="text-base font-black text-amber-900">
              LKR {calculation?.totalAllowances.toLocaleString() || '0.00'}
            </span>
          </div>
        </div>

        {/* Card 3: SPECIAL INCENTIVES */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-100">
              <Gift className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Special Incentives
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Production Allowance / Incentive
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={prodAllow}
                  onChange={(e) => setProdAllow(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  e.g. 20,000 for high efficiency
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Checking Allowance (Trimmer/Checker)
                </label>
                <input
                  type="number"
                  min={0}
                  step={250}
                  value={checkingAllow}
                  onChange={(e) => setCheckingAllow(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 bg-emerald-50/50 p-2.5 rounded-lg">
            <span className="text-[11px] font-semibold text-emerald-700 block uppercase">
              Total Special Incentives
            </span>
            <span className="text-base font-black text-emerald-900">
              LKR {calculation?.totalSpecialIncentives.toLocaleString() || '0.00'}
            </span>
          </div>
        </div>

        {/* Card 4: DEDUCTIONS */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-100">
              <MinusCircle className="w-4 h-4 text-rose-600" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Deductions
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  EPF 8% Deduction (LKR)
                </label>
                <div className="px-3 py-2 bg-rose-50/40 border border-rose-200 rounded-lg text-sm font-bold text-rose-900">
                  LKR {calculation?.epf8.toLocaleString() || '0.00'}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Statutory 8% of Basic Salary
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Late & Early Out (Hours)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={lateHours}
                  onChange={(e) => setLateHours(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
                {calculation && calculation.lateDeduction > 0 && (
                  <span className="text-[11px] text-rose-600 mt-0.5 block">
                    -LKR {calculation.lateDeduction.toLocaleString()}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Unpaid Leave / Absents (Days)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={unpaidDays}
                  onChange={(e) => setUnpaidDays(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
                {calculation && calculation.unpaidDeduction > 0 && (
                  <span className="text-[11px] text-rose-600 mt-0.5 block">
                    -LKR {calculation.unpaidDeduction.toLocaleString()}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Salary Advance (LKR)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={advance}
                  onChange={(e) => setAdvance(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 bg-rose-50/50 p-2.5 rounded-lg">
            <span className="text-[11px] font-semibold text-rose-700 block uppercase">
              Total Deductions
            </span>
            <span className="text-base font-black text-rose-900">
              LKR {calculation?.totalDeductions.toLocaleString() || '0.00'}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Calculation Footer & Actions */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <span className="text-xs text-slate-400 block uppercase font-medium">Basic Salary</span>
            <span className="text-lg font-bold text-slate-100">
              LKR {calculation?.basic.toLocaleString() || '0.00'}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block uppercase font-medium">Gross Earnings (දළ)</span>
            <span className="text-lg font-bold text-amber-400">
              LKR {calculation?.gross.toLocaleString() || '0.00'}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block uppercase font-medium">Total Deductions (අඩුකිරීම්)</span>
            <span className="text-lg font-bold text-rose-400">
              LKR {calculation?.totalDeductions.toLocaleString() || '0.00'}
            </span>
          </div>
          <div>
            <span className="text-xs text-indigo-300 block uppercase font-semibold">Net Salary (ශුද්ධ වැටුප)</span>
            <span className="text-2xl font-black text-emerald-400 tracking-tight">
              LKR {calculation?.net.toLocaleString() || '0.00'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition flex items-center gap-2 shadow-md disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save & Update Salary
          </button>
        </div>
      </div>
    </div>
  );
}
