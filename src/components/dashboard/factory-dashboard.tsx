'use client';

import React, { useMemo } from 'react';
import { EmployeeEntity } from '@/modules/payroll/domain/entities';
import { ProductionBundle } from '@/actions/production';
import {
  Users,
  Wallet,
  Cpu,
  ClipboardCheck,
  Landmark,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  FileCheck,
  Calculator,
  Printer,
  Table2,
  Pin,
  Layers,
} from 'lucide-react';

export type DashboardTargetTab =
  | 'employees'
  | 'calculator'
  | 'printManager'
  | 'salarySheet'
  | 'needle'
  | 'production'
  | 'quality'
  | 'finance';

interface FactoryDashboardProps {
  employees: EmployeeEntity[];
  productionBundle: ProductionBundle;
  onNavigate: (tab: DashboardTargetTab) => void;
}

export function FactoryDashboard({
  employees,
  productionBundle,
  onNavigate,
}: FactoryDashboardProps) {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const stats = useMemo(() => {
    const totalStaff = employees.length;
    const activeStaff = employees.filter((e) => e.isActive).length;
    const supervisors = employees.filter((e) =>
      e.role.toLowerCase().includes('supervisor')
    ).length;
    const operators = totalStaff - supervisors;
    const totalBasic = employees.reduce((sum, e) => sum + (Number(e.basicSalary) || 0), 0);
    const estStatutory = Math.round(totalBasic * 0.23); // 20% EPF + 3% ETF

    const compliantCount = employees.filter((e) =>
      [
        e.hasNicCopy,
        e.hasBirthCertificate,
        e.hasGramasewakaCert,
        e.hasMedicalReport,
        e.hasAppointmentLetter,
      ].every(Boolean)
    ).length;

    const roleMap = new Map<string, number>();
    for (const emp of employees) {
      roleMap.set(emp.role, (roleMap.get(emp.role) || 0) + 1);
    }
    const roleBreakdown = Array.from(roleMap.entries()).sort((a, b) => b[1] - a[1]);

    return {
      totalStaff,
      activeStaff,
      supervisors,
      operators,
      totalBasic,
      estStatutory,
      compliantCount,
      roleBreakdown,
    };
  }, [employees]);

  const prodStats = useMemo(() => {
    const { companies, machines, styles, plans } = productionBundle;
    const todayPlans = plans.filter((p) => p.date === todayStr);
    const todayPlanQty = todayPlans.reduce((sum, p) => sum + p.planQty, 0);
    const todayActualQty = todayPlans.reduce((sum, p) => sum + p.actualQty, 0);
    const todayPct = todayPlanQty > 0 ? Math.round((todayActualQty / todayPlanQty) * 100) : 0;

    const activeMachines = machines.filter((m) => m.status === 'Active').length;

    const styleCards = styles.slice(0, 6).map((s) => {
      const stylePlans = plans.filter(
        (p) => p.styleId === s.id || p.styleCode === s.code || p.styleName === s.name
      );
      const planned = stylePlans.reduce((sum, p) => sum + p.planQty, 0);
      const done = stylePlans.reduce((sum, p) => sum + p.actualQty, 0);
      return {
        id: s.id,
        code: s.code,
        name: s.name,
        company: s.company,
        orderQty: s.qty,
        plannedQty: planned,
        doneQty: done,
        remaining: Math.max(0, s.qty - done),
      };
    });

    return {
      companyCount: companies.length,
      machineCount: machines.length,
      activeMachines,
      styleCount: styles.length,
      todayPlanQty,
      todayActualQty,
      todayPct,
      todayPlans,
      styleCards,
      machines,
    };
  }, [productionBundle, todayStr]);

  return (
    <div className="space-y-5">
      {/* Top KPI Ribbon (Live Data Only) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Live Employee Count */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Factory Workforce
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                {stats.totalStaff}{' '}
                <span className="text-xs font-semibold text-emerald-600 font-sans">
                  ({stats.activeStaff} Active)
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Supervisors: {stats.supervisors}</span>
            <span className="font-semibold text-indigo-700">Floor Staff: {stats.operators}</span>
          </div>
        </div>

        {/* KPI 2: Live Basic Payroll Base */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Basic Payroll Base
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                LKR {stats.totalBasic.toLocaleString()}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Est. EPF+ETF (23%):</span>
            <span className="font-mono font-bold text-emerald-700">
              LKR {stats.estStatutory.toLocaleString()}
            </span>
          </div>
        </div>

        {/* KPI 3: File Compliance */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Personal File Audit (5/5)
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                {stats.compliantCount}
                <span className="text-sm font-semibold text-slate-400">/{stats.totalStaff}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Staff Records:</span>
            <button
              type="button"
              onClick={() => onNavigate('employees')}
              className="font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer"
            >
              Open Directory <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* KPI 4: Needle Management Shortcut */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Needle &amp; Safety Control
              </span>
              <div className="text-base font-extrabold text-slate-900 mt-1.5">
                Tesco Audit Module
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Pin className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-emerald-700 font-semibold">Active</span>
            <button
              type="button"
              onClick={() => onNavigate('needle')}
              className="font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer"
            >
              Open Needles <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left 2 Cols: Live Production Plan & Machine Floor Summary */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Production Plan &amp; Machine Floor ({todayStr})
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {prodStats.machineCount} Machines • {prodStats.styleCount} Styles •{' '}
                {prodStats.companyCount} Clients
              </span>
              <button
                type="button"
                onClick={() => onNavigate('production')}
                className="px-3 py-1 rounded-xl bg-persian-800 hover:bg-persian-600 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
              >
                Open Production Studio <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-5 flex-1">
            {/* Daily Output vs Target Bar */}
            <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Today&apos;s Scheduled Floor Output ({todayStr})
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-persian-800 font-mono">
                    {prodStats.todayActualQty.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    / <span className="font-mono">{prodStats.todayPlanQty.toLocaleString()}</span>{' '}
                    Planned Pcs
                  </span>
                </div>
              </div>
              <div className="sm:w-64 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600">
                    {prodStats.activeMachines}/{prodStats.machineCount} Running
                  </span>
                  <span className="text-emerald-700">{prodStats.todayPct}% Met</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(prodStats.todayPct, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Active Style Orders Breakdown */}
            {prodStats.styleCards.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-persian-500" />
                  Active Style Order Balances
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {prodStats.styleCards.map((sc) => (
                    <div
                      key={sc.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold uppercase text-slate-400 truncate">
                          {sc.company}
                        </span>
                        <span className="font-mono font-extrabold text-persian-700">{sc.code}</span>
                      </div>
                      <div className="text-xs font-extrabold text-slate-800 truncate">{sc.name}</div>
                      <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] font-mono">
                        <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                          <span className="text-slate-400 block font-sans text-[9px]">Order</span>
                          <strong className="text-slate-800">{sc.orderQty}</strong>
                        </div>
                        <div className="bg-emerald-50 p-1.5 rounded border border-emerald-100">
                          <span className="text-emerald-700 block font-sans text-[9px]">Done</span>
                          <strong className="text-emerald-800">{sc.doneQty}</strong>
                        </div>
                        <div className="bg-indigo-50 p-1.5 rounded border border-indigo-100">
                          <span className="text-indigo-700 block font-sans text-[9px]">Rem</span>
                          <strong className="text-indigo-800">{sc.remaining}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Machine Floor Grid */}
            {prodStats.machines.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-slate-300 space-y-2">
                <p className="text-xs font-semibold text-slate-600">
                  No machines or styles registered yet in Production Management.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('production')}
                  className="px-4 py-2 rounded-xl bg-persian-800 hover:bg-persian-600 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  Configure Machines, Styles &amp; Daily Plan <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {prodStats.machines.slice(0, 6).map((mac) => {
                  const blocks = prodStats.todayPlans.filter(
                    (b) => b.machineId === mac.id || b.machineName === mac.name
                  );
                  const plan = blocks.reduce((sum, b) => sum + b.planQty, 0);
                  const actual = blocks.reduce((sum, b) => sum + b.actualQty, 0);
                  const pct = plan > 0 ? Math.round((actual / plan) * 100) : 0;
                  return (
                    <div
                      key={mac.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800">{mac.name}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                            mac.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : mac.status === 'Setup'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-rose-100 text-rose-800 border-rose-200'
                          }`}
                        >
                          {mac.status === 'Active' ? 'Running' : mac.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {mac.brand} • {mac.heads} Heads • Op: {mac.operatorName || 'Unassigned'}
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-700">
                        <span>
                          Out: {actual}/{plan}
                        </span>
                        <span>{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Workforce Breakdown + Quick Links + Roadmap */}
        <div className="space-y-5">
          {/* Role Breakdown & Quick Payroll Shortcuts */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Staff Breakdown by Role
            </h3>
            {stats.roleBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400">No employees registered yet.</p>
            ) : (
              <div className="space-y-1.5">
                {stats.roleBreakdown.map(([role, count]) => (
                  <div
                    key={role}
                    className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <span className="font-medium text-slate-700 truncate pr-2">{role}</span>
                    <span className="font-mono font-extrabold text-indigo-700">{count}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onNavigate('employees')}
                className="px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <Users className="w-3.5 h-3.5" /> Employees
              </button>
              <button
                type="button"
                onClick={() => onNavigate('calculator')}
                className="px-2.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <Calculator className="w-3.5 h-3.5" /> Calculator
              </button>
              <button
                type="button"
                onClick={() => onNavigate('printManager')}
                className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <Printer className="w-3.5 h-3.5" /> Payslips (4/A4)
              </button>
              <button
                type="button"
                onClick={() => onNavigate('salarySheet')}
                className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <Table2 className="w-3.5 h-3.5" /> Salary Sheet
              </button>
            </div>
          </div>

          {/* ERP Systems Roadmap */}
          <div className="bg-slate-950 text-white rounded-2xl border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                ERP System Roadmap
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
                <span className="font-bold flex items-center gap-2 text-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Payroll
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-300">Active</span>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('needle')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 transition cursor-pointer"
              >
                <span className="font-bold flex items-center gap-2 text-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Needle Management
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-300">Active</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('production')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 transition cursor-pointer"
              >
                <span className="font-bold flex items-center gap-2 text-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Production Management
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-300">Active</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('quality')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800/80 transition cursor-pointer"
              >
                <span className="font-semibold flex items-center gap-2 text-slate-300">
                  <ClipboardCheck className="w-3.5 h-3.5 text-slate-400" />
                  Quality Checking
                </span>
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Planned
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('finance')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800/80 transition cursor-pointer"
              >
                <span className="font-semibold flex items-center gap-2 text-slate-300">
                  <Landmark className="w-3.5 h-3.5 text-slate-400" />
                  Financial Manager
                </span>
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Planned
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
