'use client';

import React, { useState, useMemo, useId } from 'react';
import { EmployeeEntity } from '@/modules/payroll/domain/entities';
import { EmployeeCrud } from './employee-crud';
import { SalaryCalculator } from './salary-calculator';
import { PayslipPrintManager } from './payslip-print-manager';
import { MonthlySalarySheet } from './monthly-salary-sheet';
import { EtfReturn } from './etf-return';
import { EpfFormC } from './epf-form-c';
import {
  Users,
  Calculator,
  Printer,
  Table2,
  ShieldCheck,
  FileCheck2,
  Building2,
  Sparkles,
} from 'lucide-react';

interface PayrollManagerProps {
  initialEmployees: EmployeeEntity[];
}

type WorkspaceTabId =
  | 'employees'
  | 'calculator'
  | 'printManager'
  | 'salarySheet'
  | 'etf'
  | 'epf';

interface NavTabItem {
  id: WorkspaceTabId;
  label: string;
  subtitle: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function PayrollManager({ initialEmployees }: PayrollManagerProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>('employees');
  const [employees, setEmployees] = useState<EmployeeEntity[]>(initialEmployees);
  const [calculatorEmployeeId, setCalculatorEmployeeId] = useState<string | undefined>(
    initialEmployees[0]?.id
  );
  const tabIdPrefix = useId();

  const navItems: NavTabItem[] = useMemo(
    () => [
      {
        id: 'employees',
        label: 'Employees',
        subtitle: 'Profiles, Photos & Personal Files',
        badge: String(employees.length),
        icon: Users,
      },
      {
        id: 'calculator',
        label: 'Salary Calculator',
        subtitle: 'OT, Night Pay, Allowances & Deductions',
        icon: Calculator,
      },
      {
        id: 'printManager',
        label: 'Payslips',
        subtitle: '2-Per-A4 Bilingual Batch Print',
        badge: '2/A4',
        icon: Printer,
      },
      {
        id: 'salarySheet',
        label: 'Salary Sheet',
        subtitle: 'Master Ledger & Excel Export',
        icon: Table2,
      },
      {
        id: 'etf',
        label: 'ETF Return',
        subtitle: 'Monthly 3% Contribution Schedule',
        badge: '3%',
        icon: ShieldCheck,
      },
      {
        id: 'epf',
        label: 'EPF & Form C',
        subtitle: '12% + 8% Act No. 15 Return',
        badge: '20%',
        icon: FileCheck2,
      },
    ],
    [employees.length]
  );

  const activeNav = navItems.find((item) => item.id === activeTab) || navItems[0];

  const handleOpenCalculatorForEmployee = (employeeId: string) => {
    setCalculatorEmployeeId(employeeId);
    setActiveTab('calculator');
  };

  return (
    <div className="min-h-screen app-mesh-bg text-slate-900 flex flex-col lg:flex-row font-sans print:block print:min-h-0 print:bg-white">
      {/* Desktop Enterprise Sidebar */}
      <aside className="hidden lg:flex lg:w-72 shrink-0 bg-slate-950 text-white flex-col justify-between border-r border-slate-800/80 sticky top-0 h-screen print:hidden">
        <div className="p-5 space-y-6 overflow-y-auto scrollbar-thin">
          {/* Brand Identity */}
          <div className="flex items-center gap-3 pb-5 border-b border-slate-800/90">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-950/60 ring-1 ring-white/15 shrink-0">
              D
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-white tracking-tight text-sm truncate">
                Dinusha Embroidery
              </div>
              <div className="text-[11px] font-medium text-indigo-300/90 flex items-center gap-1.5 mt-0.5">
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>Enterprise HR & Payroll</span>
              </div>
            </div>
          </div>

          {/* Navigation Tablist (Desktop Vertical) */}
          <div className="space-y-2">
            <div className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Payroll Modules
            </div>
            <div
              role="tablist"
              aria-label="Payroll workspace modules"
              aria-orientation="vertical"
              className="space-y-1.5"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    id={`${tabIdPrefix}-desktop-${item.id}`}
                    aria-selected={isSelected}
                    onClick={() => setActiveTab(item.id)}
                    className={`relative w-full text-left px-3.5 py-2.5 rounded-xl transition flex items-center gap-3 group cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/20 text-white ring-1 ring-indigo-500/50 shadow-sm after:content-[""] after:absolute after:left-0 after:top-2 after:bottom-2 after:w-1 after:rounded-r-full after:bg-indigo-400'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition ${
                        isSelected
                          ? 'bg-indigo-500 text-white shadow-sm'
                          : 'bg-slate-900 text-slate-400 group-hover:bg-slate-800 group-hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 ${
                              isSelected
                                ? 'bg-indigo-400/25 text-indigo-100 border border-indigo-400/40'
                                : 'bg-slate-800 text-slate-400 border border-slate-700/80'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Factory Compliance & Reg Footer */}
        <div className="p-4 border-t border-slate-800/90 bg-slate-950/80">
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                Factory Entity
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync
              </span>
            </div>
            <div className="text-xs font-bold text-slate-100">Dinusha Embroidery (Pvt) Ltd</div>
            <div className="text-[11px] font-mono text-slate-400">
              Reg: 1G 014585 • Weliweriya
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile & Tablet Header + Scrollable Tab Strip */}
      <header className="lg:hidden bg-slate-950 text-white sticky top-0 z-40 shadow-md border-b border-slate-800 print:hidden">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0">
              D
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-sm text-white truncate">Dinusha Embroidery</div>
              <div className="text-[10px] font-mono text-indigo-300 truncate">
                HR & Payroll ERP • 1G 014585
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {employees.length} Staff
          </span>
        </div>

        <div
          role="tablist"
          aria-label="Payroll workspace modules"
          className="tablist-scroller flex items-center gap-1.5 px-4 pb-2.5"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`${tabIdPrefix}-mobile-${item.id}`}
                aria-selected={isSelected}
                onClick={(e) => {
                  setActiveTab(item.id);
                  e.currentTarget.scrollIntoView({
                    block: 'nearest',
                    inline: 'nearest',
                  });
                }}
                className={`relative flex-none snap-start px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm after:content-[""] after:absolute after:inset-x-3 after:bottom-0 after:border-b-2 after:border-amber-300'
                    : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Workspace */}
      <div className="flex-1 min-w-0 flex flex-col print:block">
        {/* Desktop Top Context Header & Live KPI Ribbon */}
        <div className="max-w-[1480px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-2 space-y-5 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                <span>HR & Statutory Control Center</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-500">{activeNav.label}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                {activeNav.label} Workspace
              </h2>
            </div>

            <div className="hidden sm:flex items-center gap-2.5 bg-white/85 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-xs">
                <span className="font-semibold text-slate-700">Payroll Cycle Active</span>
                <span className="text-slate-400 mx-1.5">•</span>
                <span className="font-mono text-slate-500">SL EPF/ETF Compliant</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Tabpanel Content */}
        <main className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex-1 w-full print:max-w-none print:w-full print:p-0 print:m-0">
          {activeTab === 'employees' && (
            <div role="tabpanel" aria-labelledby={`${tabIdPrefix}-desktop-employees`}>
              <EmployeeCrud
                initialEmployees={employees}
                onEmployeesChange={(updated) => setEmployees(updated)}
                onOpenCalculator={handleOpenCalculatorForEmployee}
              />
            </div>
          )}

          {activeTab === 'calculator' && (
            <div role="tabpanel" aria-labelledby={`${tabIdPrefix}-desktop-calculator`}>
              <SalaryCalculator
                key={calculatorEmployeeId || 'default'}
                employees={employees}
                selectedEmployeeId={calculatorEmployeeId}
              />
            </div>
          )}

          {activeTab === 'printManager' && (
            <div role="tabpanel" aria-labelledby={`${tabIdPrefix}-desktop-printManager`}>
              <PayslipPrintManager employees={employees} />
            </div>
          )}

          {activeTab === 'salarySheet' && (
            <div role="tabpanel" aria-labelledby={`${tabIdPrefix}-desktop-salarySheet`}>
              <MonthlySalarySheet employees={employees} />
            </div>
          )}

          {activeTab === 'etf' && (
            <div role="tabpanel" aria-labelledby={`${tabIdPrefix}-desktop-etf`}>
              <EtfReturn employees={employees} />
            </div>
          )}

          {activeTab === 'epf' && (
            <div role="tabpanel" aria-labelledby={`${tabIdPrefix}-desktop-epf`}>
              <EpfFormC employees={employees} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
