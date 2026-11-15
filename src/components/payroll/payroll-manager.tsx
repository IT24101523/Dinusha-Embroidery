'use client';

import React, { useState, useMemo, useId } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logoutFromErpAction } from '@/actions/auth';
import { EmployeeEntity } from '@/modules/payroll/domain/entities';
import { ProductionBundle } from '@/actions/production';
import { QualityBundle } from '@/actions/quality';
import { ProductionQuotationEntity } from '@/actions/quotations';
import { ErpModuleId, ROLE_LABELS } from '@/lib/rbac';
import type { UserRole } from '@/db/schema/users';
import { FactoryDashboard } from '@/components/dashboard/factory-dashboard';
import { NeedleManagement } from '@/components/needle/needle-management';
import { ProductionManagement } from '@/components/production/production-management';
import { QualityManagement } from '@/components/quality/quality-management';
import { QuotationsManagement } from '@/components/quotations/quotations-management';
import { AdminUserManagement } from '@/components/admin/admin-user-management';
import { EmployeeCrud } from './employee-crud';
import { SalaryCalculator } from './salary-calculator';
import { PayslipPrintManager } from './payslip-print-manager';
import { MonthlySalarySheet } from './monthly-salary-sheet';
import { EtfReturn } from './etf-return';
import { EpfFormC } from './epf-form-c';
import {
  LayoutDashboard,
  Users,
  Calculator,
  Printer,
  Table2,
  ShieldCheck,
  FileCheck2,
  Building2,
  Sparkles,
  Pin,
  Cpu,
  ClipboardCheck,
  Landmark,
  Clock,
  ArrowLeft,
  Wallet,
  ChevronDown,
  Globe,
  LogOut,
  FileText,
  ShieldAlert,
} from 'lucide-react';

export interface PayrollManagerSessionInfo {
  userId: string | null;
  email: string | null;
  userLabel: string | null;
  role: UserRole | null;
  allowedModules: ErpModuleId[];
}

interface PayrollManagerProps {
  initialEmployees: EmployeeEntity[];
  initialProductionBundle?: ProductionBundle;
  initialQualityBundle?: QualityBundle;
  initialQuotations?: ProductionQuotationEntity[];
  sessionInfo?: PayrollManagerSessionInfo;
}

type WorkspaceTabId = ErpModuleId;

type NavSection = 'overview' | 'payroll' | 'administration' | 'upcoming';

interface NavTabItem {
  id: WorkspaceTabId;
  section: NavSection;
  label: string;
  subtitle: string;
  badge?: string;
  isUpcoming?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

export function PayrollManager({
  initialEmployees,
  initialProductionBundle = { companies: [], machines: [], styles: [], plans: [] },
  initialQualityBundle = { checkers: [], blocks: [], deliveryTargets: [] },
  initialQuotations = [],
  sessionInfo,
}: PayrollManagerProps) {
  const router = useRouter();
  const allowedModules = useMemo<ErpModuleId[]>(
    () =>
      sessionInfo?.allowedModules && sessionInfo.allowedModules.length > 0
        ? sessionInfo.allowedModules
        : ['dashboard'],
    [sessionInfo?.allowedModules]
  );
  const allowedSet = useMemo(() => new Set<ErpModuleId>(allowedModules), [allowedModules]);
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>(
    allowedModules.includes('dashboard') ? 'dashboard' : allowedModules[0] || 'dashboard'
  );
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [employees, setEmployees] = useState<EmployeeEntity[]>(initialEmployees);
  const [productionBundle, setProductionBundle] =
    useState<ProductionBundle>(initialProductionBundle);
  const [qualityBundle, setQualityBundle] =
    useState<QualityBundle>(initialQualityBundle);
  const [calculatorEmployeeId, setCalculatorEmployeeId] = useState<string | undefined>(
    initialEmployees[0]?.id
  );
  const tabIdPrefix = useId();

  const navItems: NavTabItem[] = useMemo(
    () => [
      {
        id: 'dashboard',
        section: 'overview',
        label: 'Dashboard',
        subtitle: 'Factory Overview & Production Plan',
        badge: 'Live',
        icon: LayoutDashboard,
      },
      {
        id: 'employees',
        section: 'payroll',
        label: 'Employees',
        subtitle: 'Profiles, Photos & Personal Files',
        badge: String(employees.length),
        icon: Users,
      },
      {
        id: 'calculator',
        section: 'payroll',
        label: 'Salary Calculator',
        subtitle: 'OT, Night Pay, Allowances & Deductions',
        icon: Calculator,
      },
      {
        id: 'printManager',
        section: 'payroll',
        label: 'Payslips',
        subtitle: '4-Per-A4 Sinhala Batch Print',
        badge: '4/A4',
        icon: Printer,
      },
      {
        id: 'salarySheet',
        section: 'payroll',
        label: 'Salary Sheet',
        subtitle: 'Master Ledger & Excel Export',
        icon: Table2,
      },
      {
        id: 'etf',
        section: 'payroll',
        label: 'ETF Return',
        subtitle: 'Monthly 3% Contribution Schedule',
        badge: '3%',
        icon: ShieldCheck,
      },
      {
        id: 'epf',
        section: 'payroll',
        label: 'EPF & Form C',
        subtitle: '12% + 8% Act No. 15 Return',
        badge: '20%',
        icon: FileCheck2,
      },
      {
        id: 'needle',
        section: 'overview',
        label: 'Needle Management',
        subtitle: 'Broken Needle Log & Stock Control',
        badge: 'Live',
        icon: Pin,
      },
      {
        id: 'production',
        section: 'overview',
        label: 'Production Management',
        subtitle: 'Style Master, Machines & Gantt Matrix',
        badge: 'Live',
        icon: Cpu,
      },
      {
        id: 'quality',
        section: 'overview',
        label: 'Quality Checking',
        subtitle: 'Checking Plan, Live Floor & Checkers',
        badge: 'Live',
        icon: ClipboardCheck,
      },
      {
        id: 'quotations',
        section: 'overview',
        label: 'Production Quotations',
        subtitle: 'Customer Quote Requests & Follow-up',
        badge: String(initialQuotations.filter((q) => q.status === 'New').length || initialQuotations.length),
        icon: FileText,
      },
      {
        id: 'adminUsers',
        section: 'administration',
        label: 'User Access & Audit',
        subtitle: 'RBAC, Password Reset & Audit Logs',
        badge: 'Admin',
        icon: ShieldAlert,
      },
      {
        id: 'finance',
        section: 'upcoming',
        label: 'Financial Manager',
        subtitle: 'Cashflow, Expenses & Accounts',
        badge: 'Soon',
        isUpcoming: true,
        icon: Landmark,
      },
    ],
    [employees.length, initialQuotations]
  );

  const visibleNavItems = useMemo(
    () => navItems.filter((item) => allowedSet.has(item.id)),
    [navItems, allowedSet]
  );

  const activeNav =
    visibleNavItems.find((item) => item.id === activeTab) || visibleNavItems[0] || navItems[0];
  const isPayrollTabActive = visibleNavItems.some(
    (item) => item.section === 'payroll' && item.id === activeTab
  );

  const handleOpenCalculatorForEmployee = (employeeId: string) => {
    setCalculatorEmployeeId(employeeId);
    setPayrollOpen(true);
    setActiveTab('calculator');
  };

  return (
    <div className="min-h-screen app-mesh-bg text-slate-900 flex flex-col lg:flex-row font-sans print:block print:min-h-0 print:bg-white">
      {/* Desktop Enterprise Sidebar (Icon-only by default, expands on hover) */}
      <aside className="hidden lg:flex lg:w-[76px] hover:lg:w-72 shrink-0 bg-slate-950 text-white flex-col justify-between border-r border-slate-800/80 sticky top-0 h-screen print:hidden transition-all duration-200 ease-out group/sidebar overflow-hidden z-30">
        <div className="p-3.5 group-hover/sidebar:p-5 space-y-5 group-hover/sidebar:space-y-6 overflow-y-auto overflow-x-hidden scrollbar-thin transition-all duration-200">
          {/* Brand Identity */}
          <div className="flex items-center justify-center group-hover/sidebar:justify-start gap-0 group-hover/sidebar:gap-3 pb-4 group-hover/sidebar:pb-5 border-b border-slate-800/90 transition-all duration-200">
            <img
              src="/images/dinusha-logo.jpg"
              alt="Dinusha Embroidery"
              className="w-11 h-11 rounded-full object-cover shadow-lg shadow-indigo-950/60 ring-1 ring-white/25 shrink-0"
            />
            <div className="w-0 opacity-0 overflow-hidden group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 group-hover/sidebar:min-w-0 transition-all duration-200 whitespace-nowrap">
              <div className="font-extrabold text-white tracking-tight text-sm truncate">
                Dinusha Embroidery
              </div>
              <div className="text-[11px] font-medium text-indigo-300/90 flex items-center gap-1.5 mt-0.5">
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>Enterprise Payroll ERP</span>
              </div>
            </div>
          </div>

          {/* Navigation Tablist (Desktop Vertical) */}
          <div
            role="tablist"
            aria-label="ERP workspace modules"
            aria-orientation="vertical"
            className="space-y-4"
          >
            {(
              [
                { key: 'overview', title: 'Overview' },
                { key: 'payroll', title: 'Payroll' },
                { key: 'administration', title: 'Administration' },
                { key: 'upcoming', title: 'Upcoming Systems' },
              ] as const
            ).map((group) => {
              const groupItems = visibleNavItems.filter((item) => item.section === group.key);
              if (groupItems.length === 0) return null;

              if (group.key === 'payroll') {
                return (
                  <div key={group.key} className="space-y-1.5">
                    <div className="h-0 opacity-0 overflow-hidden group-hover/sidebar:h-auto group-hover/sidebar:opacity-100 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap transition-all duration-200">
                      Payroll
                    </div>

                    {/* Collapsible Payroll Dropdown Trigger */}
                    <button
                      type="button"
                      aria-expanded={payrollOpen}
                      title="Payroll"
                      onClick={() => setPayrollOpen((prev) => !prev)}
                      className={`relative w-full text-left px-2.5 group-hover/sidebar:px-3.5 py-2 rounded-xl transition-all duration-200 flex items-center justify-center group-hover/sidebar:justify-start gap-0 group-hover/sidebar:gap-3 group cursor-pointer ${
                        isPayrollTabActive
                          ? 'bg-indigo-600/20 text-white ring-1 ring-indigo-500/50 shadow-sm'
                          : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 group-hover/sidebar:w-8 group-hover/sidebar:h-8 rounded-lg flex items-center justify-center shrink-0 transition ${
                          isPayrollTabActive
                            ? 'bg-indigo-500 text-white shadow-sm'
                            : 'bg-slate-900 text-slate-400 group-hover:bg-slate-800 group-hover:text-slate-200'
                        }`}
                      >
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div className="w-0 opacity-0 overflow-hidden group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 group-hover/sidebar:flex-1 group-hover/sidebar:min-w-0 transition-all duration-200 whitespace-nowrap">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold truncate">Payroll</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700/80">
                              6
                            </span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                                payrollOpen ? 'rotate-180 text-indigo-300' : ''
                              }`}
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          Employees, Salary, Payslips, EPF/ETF
                        </p>
                      </div>
                    </button>

                    {/* Payroll Sub-Items (only visible when Payroll dropdown is open) */}
                    {payrollOpen && (
                      <div className="space-y-1 group-hover/sidebar:pl-2.5 group-hover/sidebar:border-l group-hover/sidebar:border-slate-800 group-hover/sidebar:ml-3.5 transition-all">
                        {groupItems.map((item) => {
                          const Icon = item.icon;
                          const isSelected = activeTab === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              role="tab"
                              id={`${tabIdPrefix}-desktop-${item.id}`}
                              aria-selected={isSelected}
                              title={item.label}
                              onClick={() => setActiveTab(item.id)}
                              className={`relative w-full text-left px-2.5 group-hover/sidebar:px-3 py-1.5 rounded-xl transition-all duration-200 flex items-center justify-center group-hover/sidebar:justify-start gap-0 group-hover/sidebar:gap-2.5 group cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-600/20 text-white ring-1 ring-indigo-500/50 shadow-sm after:content-[""] after:absolute after:left-0 after:top-1.5 after:bottom-1.5 after:w-1 after:rounded-r-full after:bg-indigo-400'
                                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                              }`}
                            >
                              <div
                                className={`w-8 h-8 group-hover/sidebar:w-7 group-hover/sidebar:h-7 rounded-lg flex items-center justify-center shrink-0 transition ${
                                  isSelected
                                    ? 'bg-indigo-500 text-white shadow-sm'
                                    : 'bg-slate-900 text-slate-400 group-hover:bg-slate-800 group-hover:text-slate-200'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="w-0 opacity-0 overflow-hidden group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 group-hover/sidebar:flex-1 group-hover/sidebar:min-w-0 transition-all duration-200 whitespace-nowrap">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-bold truncate">
                                    {item.label}
                                  </span>
                                  {item.badge && (
                                    <span
                                      className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold shrink-0 ${
                                        isSelected
                                          ? 'bg-indigo-400/25 text-indigo-100 border border-indigo-400/40'
                                          : 'bg-slate-800 text-slate-400 border border-slate-700/80'
                                      }`}
                                    >
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={group.key} className="space-y-1.5">
                  <div className="h-0 opacity-0 overflow-hidden group-hover/sidebar:h-auto group-hover/sidebar:opacity-100 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap transition-all duration-200">
                    {group.title}
                  </div>
                  {groupItems.map((item) => {
                    const Icon = item.icon;
                    const isSelected = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        id={`${tabIdPrefix}-desktop-${item.id}`}
                        aria-selected={isSelected}
                        title={item.label}
                        onClick={() => setActiveTab(item.id)}
                        className={`relative w-full text-left px-2.5 group-hover/sidebar:px-3.5 py-2 rounded-xl transition-all duration-200 flex items-center justify-center group-hover/sidebar:justify-start gap-0 group-hover/sidebar:gap-3 group cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600/20 text-white ring-1 ring-indigo-500/50 shadow-sm after:content-[""] after:absolute after:left-0 after:top-2 after:bottom-2 after:w-1 after:rounded-r-full after:bg-indigo-400'
                            : item.isUpcoming
                            ? 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                            : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 group-hover/sidebar:w-8 group-hover/sidebar:h-8 rounded-lg flex items-center justify-center shrink-0 transition ${
                            isSelected
                              ? 'bg-indigo-500 text-white shadow-sm'
                              : item.id === 'needle'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 group-hover:bg-amber-500/25'
                              : 'bg-slate-900 text-slate-400 group-hover:bg-slate-800 group-hover:text-slate-200'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="w-0 opacity-0 overflow-hidden group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 group-hover/sidebar:flex-1 group-hover/sidebar:min-w-0 transition-all duration-200 whitespace-nowrap">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold truncate">{item.label}</span>
                            {item.badge && (
                              <span
                                className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 ${
                                  isSelected
                                    ? 'bg-indigo-400/25 text-indigo-100 border border-indigo-400/40'
                                    : item.badge === 'Next'
                                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700/80'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Factory Compliance & Reg Footer */}
        <div className="p-3 group-hover/sidebar:p-4 border-t border-slate-800/90 bg-slate-950/80 transition-all duration-200">
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-2.5 group-hover/sidebar:p-3.5 space-y-0 group-hover/sidebar:space-y-2 transition-all duration-200">
            <div className="flex items-center justify-center group-hover/sidebar:justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 group-hover/sidebar:w-3.5 group-hover/sidebar:h-3.5 text-indigo-400 shrink-0" />
                <span className="w-0 opacity-0 overflow-hidden group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 whitespace-nowrap transition-all duration-200">
                  Factory Entity
                </span>
              </span>
              <span className="hidden group-hover/sidebar:inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync
              </span>
            </div>
            <div className="h-0 opacity-0 overflow-hidden group-hover/sidebar:h-auto group-hover/sidebar:opacity-100 transition-all duration-200 whitespace-nowrap">
              <div className="text-xs font-bold text-slate-100 truncate">
                {sessionInfo?.userLabel || 'Dinusha Embroidery'}
              </div>
              <div className="text-[11px] font-mono text-indigo-300 mt-0.5 truncate">
                {sessionInfo?.role ? ROLE_LABELS[sessionInfo.role] : 'ERP User'} • 1G 014585
              </div>
            </div>
          </div>

          <div className="mt-2.5 flex items-center gap-1.5">
            <Link
              href="/"
              title="Back to Public Business Website"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-slate-300 hover:text-white transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="w-0 opacity-0 overflow-hidden group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 whitespace-nowrap transition-all duration-200">
                Website
              </span>
            </Link>
            <button
              type="button"
              onClick={async () => {
                await logoutFromErpAction();
                router.push('/');
                router.refresh();
              }}
              title="Lock & Sign Out of ERP"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/70 border border-rose-800/40 text-[11px] font-bold text-rose-300 hover:text-white transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="w-0 opacity-0 overflow-hidden group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 whitespace-nowrap transition-all duration-200">
                Sign Out
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile & Tablet Header + Scrollable Tab Strip */}
      <header className="lg:hidden bg-slate-950 text-white sticky top-0 z-40 shadow-md border-b border-slate-800 print:hidden">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/images/dinusha-logo.jpg"
              alt="Dinusha Embroidery"
              className="w-9 h-9 rounded-full object-cover shadow-sm ring-1 ring-white/25 shrink-0"
            />
            <div className="min-w-0">
              <div className="font-extrabold text-sm text-white truncate">Dinusha Embroidery</div>
              <div className="text-[10px] font-mono text-indigo-300 truncate">
                Payroll ERP • 1G 014585
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
          {visibleNavItems.map((item) => {
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
                <span>Payroll &amp; Factory Control Center</span>
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
          {activeTab === 'dashboard' && (
            <div role="tabpanel" aria-labelledby={`${tabIdPrefix}-desktop-dashboard`}>
              <FactoryDashboard
                employees={employees}
                productionBundle={productionBundle}
                onNavigate={(tab) => {
                  if (
                    tab === 'employees' ||
                    tab === 'calculator' ||
                    tab === 'printManager' ||
                    tab === 'salarySheet'
                  ) {
                    setPayrollOpen(true);
                  }
                  setActiveTab(tab);
                }}
              />
            </div>
          )}

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

          {activeTab === 'needle' && (
            <div role="tabpanel" aria-labelledby={`${tabIdPrefix}-desktop-needle`}>
              <NeedleManagement
                employees={employees}
                machines={productionBundle.machines}
                styles={productionBundle.styles}
              />
            </div>
          )}

          {activeTab === 'production' && (
            <div role="tabpanel" aria-labelledby={`${tabIdPrefix}-desktop-production`}>
              <ProductionManagement
                employees={employees}
                initialBundle={productionBundle}
                onBundleChange={setProductionBundle}
              />
            </div>
          )}

          {activeTab === 'quality' && allowedSet.has('quality') && (
            <div role="tabpanel" aria-labelledby={`${tabIdPrefix}-desktop-quality`}>
              <QualityManagement
                employees={employees}
                productionBundle={productionBundle}
                initialQualityBundle={qualityBundle}
                onQualityBundleChange={setQualityBundle}
              />
            </div>
          )}

          {activeTab === 'quotations' && allowedSet.has('quotations') && (
            <div role="tabpanel" aria-labelledby={`${tabIdPrefix}-desktop-quotations`}>
              <QuotationsManagement initialQuotations={initialQuotations} />
            </div>
          )}

          {activeTab === 'adminUsers' && allowedSet.has('adminUsers') && (
            <div role="tabpanel" aria-labelledby={`${tabIdPrefix}-desktop-adminUsers`}>
              <AdminUserManagement currentUserId={sessionInfo?.userId || null} />
            </div>
          )}

          {activeTab === 'finance' && (
            <div
              role="tabpanel"
              aria-labelledby={`${tabIdPrefix}-desktop-${activeTab}`}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-8 max-w-2xl mx-auto text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Landmark className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  <Clock className="w-3 h-3" />
                  Planned ERP Module
                </span>
                <h3 className="text-lg font-extrabold text-slate-900">{activeNav.label}</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {activeNav.label} ({activeNav.subtitle}) is listed in the ERP roadmap and will be
                  developed next.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Dashboard
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
