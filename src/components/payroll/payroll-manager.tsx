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
import { NeedleManagement, type NeedleSubTab } from '@/components/needle/needle-management';
import {
  NormalInventoryManagement,
  type NormalInventorySubTab,
} from '@/components/inventory/normal-inventory-management';
import {
  ProductionManagement,
  type ProductionSubTab,
} from '@/components/production/production-management';
import { QualityManagement, type QualitySubTab } from '@/components/quality/quality-management';
import {
  QuotationsManagement,
  type BillingWorkspaceTab,
} from '@/components/quotations/quotations-management';
import { AdminUserManagement } from '@/components/admin/admin-user-management';
import {
  FinancialManagement,
  type FinanceSubTab,
} from '@/components/finance/financial-management';
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
  PanelLeftClose,
  PanelLeftOpen,
  Boxes,
  Layers,
  Truck,
  PlusCircle,
  PackagePlus,
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
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [needleSubTab, setNeedleSubTab] = useState<NeedleSubTab>('inventory');
  const [inventorySubTab, setInventorySubTab] = useState<NormalInventorySubTab>('inventory');
  const [productionSubTab, setProductionSubTab] = useState<ProductionSubTab>('planEditor');
  const [qualitySubTab, setQualitySubTab] = useState<QualitySubTab>('checkingEditor');
  const [billingSubTab, setBillingSubTab] = useState<BillingWorkspaceTab>('invoices');
  const [financeSubTab, setFinanceSubTab] = useState<FinanceSubTab>('dashboard');
  const [adminSubTab, setAdminSubTab] = useState<'users' | 'requests' | 'audit'>('users');

  const toggleMenu = (key: string) => {
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };
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
        id: 'inventory',
        section: 'overview',
        label: 'Normal Inventory',
        subtitle: 'Backing, Double Side, Bobbin & Thread Cone Stock',
        badge: 'Live',
        icon: Boxes,
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
        label: 'Invoices & Quotations',
        subtitle: 'Zoho-Style Billing, Quotes & Style Reconciliation',
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
        section: 'overview',
        label: 'Financial Governance',
        subtitle: 'P&L, Revenue, Payroll, COGS & OPEX',
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
      {/* Desktop Enterprise Sidebar (Manual Toggle Button — No Auto Hover Slide) */}
      <aside
        className={`hidden lg:flex ${
          sidebarExpanded ? 'lg:w-72' : 'lg:w-[76px]'
        } shrink-0 bg-slate-950 text-white flex-col justify-between border-r border-slate-800/80 sticky top-0 h-screen print:hidden transition-all duration-200 ease-out overflow-hidden z-30`}
      >
        <div
          className={`${
            sidebarExpanded ? 'p-4 space-y-5' : 'p-3 space-y-4'
          } overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-all duration-200`}
        >
          {/* Brand Identity + Manual Slide Toggle Button */}
          <div
            className={`flex items-center ${
              sidebarExpanded ? 'justify-between gap-2.5 pb-4' : 'flex-col justify-center gap-2.5 pb-3'
            } border-b border-slate-800/90 transition-all duration-200`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="/images/dinusha-logo.jpg"
                alt="Dinusha Embroidery"
                className="w-10 h-10 rounded-full object-cover shadow-lg shadow-indigo-950/60 ring-1 ring-white/25 shrink-0"
              />
              {sidebarExpanded && (
                <div className="min-w-0 whitespace-nowrap">
                  <div className="font-extrabold text-white tracking-tight text-sm truncate">
                    Dinusha Embroidery
                  </div>
                  <div className="text-[11px] font-medium text-indigo-300/90 flex items-center gap-1.5 mt-0.5">
                    <Sparkles className="w-3 h-3 shrink-0" />
                    <span>Enterprise ERP</span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSidebarExpanded((prev) => !prev)}
              aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
              title={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer shrink-0"
            >
              {sidebarExpanded ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation Tablist (Desktop Vertical — All Collapsible Dropdowns like Payroll) */}
          <div
            role="tablist"
            aria-label="ERP workspace modules"
            aria-orientation="vertical"
            className="space-y-2.5"
          >
            {[
              {
                key: 'dashboard',
                allowed: allowedSet.has('dashboard'),
                title: 'Dashboard',
                subtitle: 'Factory Overview & Live Floor',
                icon: LayoutDashboard,
                isActive: activeTab === 'dashboard',
                subItems: [
                  {
                    id: 'dash-overview',
                    label: 'Factory Overview',
                    badge: 'Live',
                    icon: LayoutDashboard,
                    isSelected: activeTab === 'dashboard',
                    onSelect: () => setActiveTab('dashboard'),
                  },
                ],
              },
              {
                key: 'payroll',
                allowed: visibleNavItems.some((item) => item.section === 'payroll'),
                title: 'Payroll',
                subtitle: 'Employees, Salary, Payslips, EPF/ETF',
                icon: Wallet,
                isActive: isPayrollTabActive,
                subItems: visibleNavItems
                  .filter((item) => item.section === 'payroll')
                  .map((item) => ({
                    id: item.id,
                    label: item.label,
                    badge: item.badge,
                    icon: item.icon,
                    isSelected: activeTab === item.id,
                    onSelect: () => setActiveTab(item.id),
                  })),
              },
              {
                key: 'needle',
                allowed: allowedSet.has('needle'),
                title: 'Needle Management',
                subtitle: 'Inventory, Logs, CLN & Broken Needles',
                icon: Pin,
                isActive: activeTab === 'needle',
                subItems: [
                  {
                    id: 'needle-inventory',
                    label: 'Needle Inventory',
                    icon: Pin,
                    isSelected: activeTab === 'needle' && needleSubTab === 'inventory',
                    onSelect: () => {
                      setActiveTab('needle');
                      setNeedleSubTab('inventory');
                    },
                  },
                  {
                    id: 'needle-recordSheet',
                    label: 'Record Sheet',
                    icon: Table2,
                    isSelected: activeTab === 'needle' && needleSubTab === 'recordSheet',
                    onSelect: () => {
                      setActiveTab('needle');
                      setNeedleSubTab('recordSheet');
                    },
                  },
                  {
                    id: 'needle-cln',
                    label: 'CLN Checklist',
                    icon: ClipboardCheck,
                    isSelected: activeTab === 'needle' && needleSubTab === 'cln',
                    onSelect: () => {
                      setActiveTab('needle');
                      setNeedleSubTab('cln');
                    },
                  },
                  {
                    id: 'needle-switchNeedle',
                    label: 'Switch Needle',
                    icon: Sparkles,
                    isSelected: activeTab === 'needle' && needleSubTab === 'switchNeedle',
                    onSelect: () => {
                      setActiveTab('needle');
                      setNeedleSubTab('switchNeedle');
                    },
                  },
                  {
                    id: 'needle-recordBroken',
                    label: 'Record Broken Needle',
                    icon: ShieldAlert,
                    isSelected: activeTab === 'needle' && needleSubTab === 'recordBroken',
                    onSelect: () => {
                      setActiveTab('needle');
                      setNeedleSubTab('recordBroken');
                    },
                  },
                  {
                    id: 'needle-newNeedleType',
                    label: 'New Needle Type',
                    icon: PlusCircle,
                    isSelected: activeTab === 'needle' && needleSubTab === 'newNeedleType',
                    onSelect: () => {
                      setActiveTab('needle');
                      setNeedleSubTab('newNeedleType');
                    },
                  },
                  {
                    id: 'needle-restockNeedle',
                    label: 'Restock Needles',
                    icon: PackagePlus,
                    isSelected: activeTab === 'needle' && needleSubTab === 'restockNeedle',
                    onSelect: () => {
                      setActiveTab('needle');
                      setNeedleSubTab('restockNeedle');
                    },
                  },
                ],
              },
              {
                key: 'inventory',
                allowed:
                  allowedSet.has('inventory') ||
                  allowedSet.has('needle') ||
                  allowedSet.has('production'),
                title: 'Normal Inventory',
                subtitle: 'Backing, Double Side, Bobbin & Thread Cone',
                icon: Boxes,
                isActive: activeTab === 'inventory',
                subItems: [
                  {
                    id: 'inv-directory',
                    label: 'Material Stock Directory',
                    icon: Boxes,
                    isSelected: activeTab === 'inventory' && inventorySubTab === 'inventory',
                    onSelect: () => {
                      setActiveTab('inventory');
                      setInventorySubTab('inventory');
                    },
                  },
                  {
                    id: 'inv-usageLog',
                    label: 'Issued & Restock Sheet',
                    icon: Table2,
                    isSelected: activeTab === 'inventory' && inventorySubTab === 'usageLog',
                    onSelect: () => {
                      setActiveTab('inventory');
                      setInventorySubTab('usageLog');
                    },
                  },
                  {
                    id: 'inv-issueMaterial',
                    label: 'Issue Material to Floor',
                    icon: Layers,
                    isSelected: activeTab === 'inventory' && inventorySubTab === 'issueMaterial',
                    onSelect: () => {
                      setActiveTab('inventory');
                      setInventorySubTab('issueMaterial');
                    },
                  },
                  {
                    id: 'inv-stockManage',
                    label: 'New Material & Restock',
                    icon: Sparkles,
                    isSelected: activeTab === 'inventory' && inventorySubTab === 'stockManage',
                    onSelect: () => {
                      setActiveTab('inventory');
                      setInventorySubTab('stockManage');
                    },
                  },
                ],
              },
              {
                key: 'production',
                allowed: allowedSet.has('production'),
                title: 'Production Management',
                subtitle: 'Plan Matrix, Styles, Machines & Customers',
                icon: Cpu,
                isActive: activeTab === 'production',
                subItems: [
                  {
                    id: 'prod-planEditor',
                    label: 'Production Plan Matrix',
                    icon: Cpu,
                    isSelected: activeTab === 'production' && productionSubTab === 'planEditor',
                    onSelect: () => {
                      setActiveTab('production');
                      setProductionSubTab('planEditor');
                    },
                  },
                  {
                    id: 'prod-floorDisplay',
                    label: 'Live Floor Display',
                    icon: LayoutDashboard,
                    isSelected: activeTab === 'production' && productionSubTab === 'floorDisplay',
                    onSelect: () => {
                      setActiveTab('production');
                      setProductionSubTab('floorDisplay');
                    },
                  },
                  {
                    id: 'prod-styleCrud',
                    label: 'Style Master',
                    icon: FileText,
                    isSelected: activeTab === 'production' && productionSubTab === 'styleCrud',
                    onSelect: () => {
                      setActiveTab('production');
                      setProductionSubTab('styleCrud');
                    },
                  },
                  {
                    id: 'prod-doneStyles',
                    label: 'Completed Styles',
                    icon: FileCheck2,
                    isSelected: activeTab === 'production' && productionSubTab === 'doneStyles',
                    onSelect: () => {
                      setActiveTab('production');
                      setProductionSubTab('doneStyles');
                    },
                  },
                  {
                    id: 'prod-strikeOff',
                    label: 'Strike-Off & Samples',
                    icon: Sparkles,
                    isSelected: activeTab === 'production' && productionSubTab === 'strikeOff',
                    onSelect: () => {
                      setActiveTab('production');
                      setProductionSubTab('strikeOff');
                    },
                  },
                  {
                    id: 'prod-companyCrud',
                    label: 'Partner Companies (Customers)',
                    badge: String(productionBundle.companies.length),
                    icon: Building2,
                    isSelected: activeTab === 'production' && productionSubTab === 'companyCrud',
                    onSelect: () => {
                      setActiveTab('production');
                      setProductionSubTab('companyCrud');
                    },
                  },
                  {
                    id: 'prod-machineCrud',
                    label: 'Machines & Operators',
                    badge: String(productionBundle.machines.length),
                    icon: Cpu,
                    isSelected: activeTab === 'production' && productionSubTab === 'machineCrud',
                    onSelect: () => {
                      setActiveTab('production');
                      setProductionSubTab('machineCrud');
                    },
                  },
                ],
              },
              {
                key: 'quality',
                allowed: allowedSet.has('quality'),
                title: 'Quality Checking',
                subtitle: 'Checking Plan, Floor & Checkers',
                icon: ClipboardCheck,
                isActive: activeTab === 'quality',
                subItems: [
                  {
                    id: 'qual-checkingEditor',
                    label: 'Checking Plan Matrix',
                    icon: ClipboardCheck,
                    isSelected: activeTab === 'quality' && qualitySubTab === 'checkingEditor',
                    onSelect: () => {
                      setActiveTab('quality');
                      setQualitySubTab('checkingEditor');
                    },
                  },
                  {
                    id: 'qual-deliveryPlan',
                    label: 'Daily Delivery Plan',
                    icon: Truck,
                    isSelected: activeTab === 'quality' && qualitySubTab === 'deliveryPlan',
                    onSelect: () => {
                      setActiveTab('quality');
                      setQualitySubTab('deliveryPlan');
                    },
                  },
                  {
                    id: 'qual-floorDisplay',
                    label: 'Live Quality Floor',
                    icon: LayoutDashboard,
                    isSelected: activeTab === 'quality' && qualitySubTab === 'floorDisplay',
                    onSelect: () => {
                      setActiveTab('quality');
                      setQualitySubTab('floorDisplay');
                    },
                  },
                  {
                    id: 'qual-doneStyles',
                    label: 'Completed Styles',
                    icon: FileCheck2,
                    isSelected: activeTab === 'quality' && qualitySubTab === 'doneStyles',
                    onSelect: () => {
                      setActiveTab('quality');
                      setQualitySubTab('doneStyles');
                    },
                  },
                  {
                    id: 'qual-checkerCrud',
                    label: 'Quality Checkers',
                    icon: Users,
                    isSelected: activeTab === 'quality' && qualitySubTab === 'checkerCrud',
                    onSelect: () => {
                      setActiveTab('quality');
                      setQualitySubTab('checkerCrud');
                    },
                  },
                ],
              },
              {
                key: 'quotations',
                allowed: allowedSet.has('quotations'),
                title: 'Invoices & Quotations',
                subtitle: 'Invoices, Tax Invoices, Quotes & Items',
                icon: FileText,
                isActive: activeTab === 'quotations',
                subItems: [
                  {
                    id: 'bill-invoices',
                    label: 'All Invoices',
                    icon: FileCheck2,
                    isSelected: activeTab === 'quotations' && billingSubTab === 'invoices',
                    onSelect: () => {
                      setActiveTab('quotations');
                      setBillingSubTab('invoices');
                    },
                  },
                  {
                    id: 'bill-quotes',
                    label: 'All Quotes (QT)',
                    icon: FileText,
                    isSelected: activeTab === 'quotations' && billingSubTab === 'quotes',
                    onSelect: () => {
                      setActiveTab('quotations');
                      setBillingSubTab('quotes');
                    },
                  },
                  {
                    id: 'bill-customers',
                    label: 'Customers',
                    icon: Users,
                    isSelected: activeTab === 'quotations' && billingSubTab === 'customers',
                    onSelect: () => {
                      setActiveTab('quotations');
                      setBillingSubTab('customers');
                    },
                  },
                  {
                    id: 'bill-items',
                    label: 'Items & Styles',
                    icon: Table2,
                    isSelected: activeTab === 'quotations' && billingSubTab === 'items',
                    onSelect: () => {
                      setActiveTab('quotations');
                      setBillingSubTab('items');
                    },
                  },
                  {
                    id: 'bill-webInquiries',
                    label: 'Website Quote Requests',
                    badge: String(initialQuotations.length),
                    icon: Globe,
                    isSelected: activeTab === 'quotations' && billingSubTab === 'webInquiries',
                    onSelect: () => {
                      setActiveTab('quotations');
                      setBillingSubTab('webInquiries');
                    },
                  },
                ],
              },
              {
                key: 'finance',
                allowed: allowedSet.has('finance'),
                title: 'Financial Governance',
                subtitle: 'P&L, Revenue, Salaries, COGS & OPEX',
                icon: Landmark,
                isActive: activeTab === 'finance',
                subItems: [
                  {
                    id: 'fin-dashboard',
                    label: 'P&L Dashboard',
                    icon: Landmark,
                    isSelected: activeTab === 'finance' && financeSubTab === 'dashboard',
                    onSelect: () => {
                      setActiveTab('finance');
                      setFinanceSubTab('dashboard');
                    },
                  },
                  {
                    id: 'fin-revenue',
                    label: 'Machine Revenue',
                    icon: Cpu,
                    isSelected: activeTab === 'finance' && financeSubTab === 'revenue',
                    onSelect: () => {
                      setActiveTab('finance');
                      setFinanceSubTab('revenue');
                    },
                  },
                  {
                    id: 'fin-salary',
                    label: 'Staff Salaries (Payroll)',
                    icon: Users,
                    isSelected: activeTab === 'finance' && financeSubTab === 'salary',
                    onSelect: () => {
                      setActiveTab('finance');
                      setFinanceSubTab('salary');
                    },
                  },
                  {
                    id: 'fin-cogs',
                    label: 'Material Cost (COGS)',
                    icon: Building2,
                    isSelected: activeTab === 'finance' && financeSubTab === 'cogs',
                    onSelect: () => {
                      setActiveTab('finance');
                      setFinanceSubTab('cogs');
                    },
                  },
                  {
                    id: 'fin-expense',
                    label: 'OPEX & Bills Ledger',
                    icon: FileText,
                    isSelected: activeTab === 'finance' && financeSubTab === 'expense',
                    onSelect: () => {
                      setActiveTab('finance');
                      setFinanceSubTab('expense');
                    },
                  },
                ],
              },
              {
                key: 'adminUsers',
                allowed: allowedSet.has('adminUsers'),
                title: 'User Access & Audit',
                subtitle: 'RBAC, Approvals & Audit Logs',
                icon: ShieldAlert,
                isActive: activeTab === 'adminUsers',
                subItems: [
                  {
                    id: 'adm-users',
                    label: 'User Accounts & RBAC',
                    badge: 'Admin',
                    icon: Users,
                    isSelected: activeTab === 'adminUsers' && adminSubTab === 'users',
                    onSelect: () => {
                      setActiveTab('adminUsers');
                      setAdminSubTab('users');
                    },
                  },
                  {
                    id: 'adm-requests',
                    label: 'Approval Requests',
                    badge: 'New',
                    icon: ClipboardCheck,
                    isSelected: activeTab === 'adminUsers' && adminSubTab === 'requests',
                    onSelect: () => {
                      setActiveTab('adminUsers');
                      setAdminSubTab('requests');
                    },
                  },
                  {
                    id: 'adm-audit',
                    label: 'System Audit Logs',
                    icon: ShieldCheck,
                    isSelected: activeTab === 'adminUsers' && adminSubTab === 'audit',
                    onSelect: () => {
                      setActiveTab('adminUsers');
                      setAdminSubTab('audit');
                    },
                  },
                ],
              },
            ]
              .filter((group) => group.allowed && group.subItems.length > 0)
              .map((group) => {
                const GroupIcon = group.icon;
                const isOpen =
                  group.key === 'payroll'
                    ? payrollOpen || group.isActive
                    : Boolean(openMenus[group.key] ?? group.isActive);

                const handleToggle = () => {
                  if (!sidebarExpanded) {
                    setSidebarExpanded(true);
                    if (group.key === 'payroll') setPayrollOpen(true);
                    else setOpenMenus((prev) => ({ ...prev, [group.key]: true }));
                    group.subItems[0]?.onSelect();
                    return;
                  }
                  if (group.key === 'payroll') {
                    setPayrollOpen((prev) => !prev);
                  } else {
                    toggleMenu(group.key);
                  }
                };

                return (
                  <div key={group.key} className="space-y-1">
                    {/* Collapsible Module Dropdown Trigger */}
                    <button
                      type="button"
                      aria-expanded={sidebarExpanded && isOpen}
                      title={group.title}
                      onClick={handleToggle}
                      className={`relative w-full text-left ${
                        sidebarExpanded
                          ? 'px-3.5 py-2 justify-start gap-3'
                          : 'px-2.5 py-2 justify-center gap-0'
                      } rounded-xl transition-all duration-200 flex items-center group cursor-pointer ${
                        group.isActive
                          ? 'bg-indigo-600/20 text-white ring-1 ring-indigo-500/50 shadow-sm'
                          : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <div
                        className={`${
                          sidebarExpanded ? 'w-8 h-8' : 'w-9 h-9'
                        } rounded-lg flex items-center justify-center shrink-0 transition ${
                          group.isActive
                            ? 'bg-indigo-500 text-white shadow-sm'
                            : 'bg-slate-900 text-slate-400 group-hover:bg-slate-800 group-hover:text-slate-200'
                        }`}
                      >
                        <GroupIcon className="w-4 h-4" />
                      </div>
                      {sidebarExpanded && (
                        <div className="flex-1 min-w-0 whitespace-nowrap">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold truncate">{group.title}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700/80">
                                {group.subItems.length}
                              </span>
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                                  isOpen ? 'rotate-180 text-indigo-300' : ''
                                }`}
                              />
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {group.subtitle}
                          </p>
                        </div>
                      )}
                    </button>

                    {/* Indented Sub-Items List (Only rendered when sidebar is expanded) */}
                    {sidebarExpanded && isOpen && (
                      <div className="space-y-1 pl-2.5 border-l border-slate-800 ml-3.5 transition-all">
                        {group.subItems.map((sub) => {
                          const SubIcon = sub.icon;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              role="tab"
                              aria-selected={sub.isSelected}
                              title={sub.label}
                              onClick={sub.onSelect}
                              className={`relative w-full text-left px-3 py-1.5 rounded-xl transition-all duration-200 flex items-center justify-start gap-2.5 group cursor-pointer ${
                                sub.isSelected
                                  ? 'bg-indigo-600/20 text-white ring-1 ring-indigo-500/50 shadow-sm after:content-[""] after:absolute after:left-0 after:top-1.5 after:bottom-1.5 after:w-1 after:rounded-r-full after:bg-indigo-400'
                                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                              }`}
                            >
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition ${
                                  sub.isSelected
                                    ? 'bg-indigo-500 text-white shadow-sm'
                                    : 'bg-slate-900 text-slate-400 group-hover:bg-slate-800 group-hover:text-slate-200'
                                }`}
                              >
                                <SubIcon className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0 whitespace-nowrap">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-bold truncate">
                                    {sub.label}
                                  </span>
                                  {'badge' in sub && sub.badge && (
                                    <span
                                      className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold shrink-0 ${
                                        sub.isSelected
                                          ? 'bg-indigo-400/25 text-indigo-100 border border-indigo-400/40'
                                          : 'bg-slate-800 text-slate-400 border border-slate-700/80'
                                      }`}
                                    >
                                      {sub.badge}
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
              })}
          </div>
        </div>

        {/* Factory Compliance & Reg Footer */}
        <div
          className={`${
            sidebarExpanded ? 'p-4' : 'p-2.5'
          } border-t border-slate-800/90 bg-slate-950/80 transition-all duration-200`}
        >
          <div
            className={`rounded-xl bg-slate-900/90 border border-slate-800 ${
              sidebarExpanded ? 'p-3.5 space-y-2' : 'p-2.5'
            } transition-all duration-200`}
          >
            <div
              className={`flex items-center ${
                sidebarExpanded ? 'justify-between' : 'justify-center'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                {sidebarExpanded && <span className="whitespace-nowrap">Factory Entity</span>}
              </span>
              {sidebarExpanded && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              )}
            </div>
            {sidebarExpanded && (
              <div className="whitespace-nowrap">
                <div className="text-xs font-bold text-slate-100 truncate">
                  {sessionInfo?.userLabel || 'Dinusha Embroidery'}
                </div>
                <div className="text-[11px] font-mono text-indigo-300 mt-0.5 truncate">
                  {sessionInfo?.role ? ROLE_LABELS[sessionInfo.role] : 'ERP User'} • 1G 014585
                </div>
              </div>
            )}
          </div>

          <div
            className={`mt-2.5 flex ${
              sidebarExpanded ? 'flex-row items-center gap-1.5' : 'flex-col items-center gap-1.5'
            }`}
          >
            <Link
              href="/"
              title="Back to Public Business Website"
              className="w-full flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-slate-300 hover:text-white transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              {sidebarExpanded && <span className="whitespace-nowrap">Website</span>}
            </Link>
            <button
              type="button"
              onClick={async () => {
                await logoutFromErpAction();
                router.push('/');
                router.refresh();
              }}
              title="Lock & Sign Out of ERP"
              className="w-full flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/70 border border-rose-800/40 text-[11px] font-bold text-rose-300 hover:text-white transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              {sidebarExpanded && <span className="whitespace-nowrap">Sign Out</span>}
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
                externalSubTab={needleSubTab}
                userRole={sessionInfo?.role || null}
                userLabel={sessionInfo?.userLabel || sessionInfo?.email || null}
              />
            </div>
          )}

          {activeTab === 'inventory' && (
            <div role="tabpanel" aria-labelledby={`${tabIdPrefix}-desktop-inventory`}>
              <NormalInventoryManagement
                employees={employees}
                machines={productionBundle.machines}
                styles={productionBundle.styles}
                externalSubTab={inventorySubTab}
              />
            </div>
          )}

          {activeTab === 'production' && (
            <div role="tabpanel" aria-labelledby={`${tabIdPrefix}-desktop-production`}>
              <ProductionManagement
                employees={employees}
                initialBundle={productionBundle}
                onBundleChange={setProductionBundle}
                externalSubTab={productionSubTab}
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
                externalSubTab={qualitySubTab}
              />
            </div>
          )}

          {activeTab === 'quotations' && allowedSet.has('quotations') && (
            <div role="tabpanel" aria-labelledby={`${tabIdPrefix}-desktop-quotations`}>
              <QuotationsManagement
                initialQuotations={initialQuotations}
                productionBundle={productionBundle}
                qualityBundle={qualityBundle}
                externalSubTab={billingSubTab}
                userRole={sessionInfo?.role || null}
                onOpenCustomerRegistration={() => {
                  if (allowedSet.has('production')) {
                    setActiveTab('production');
                    setProductionSubTab('companyCrud');
                    setOpenMenus((prev) => ({ ...prev, production: true }));
                  } else {
                    setActiveTab('quotations');
                    setBillingSubTab('customers');
                  }
                }}
              />
            </div>
          )}

          {activeTab === 'adminUsers' && allowedSet.has('adminUsers') && (
            <div role="tabpanel" aria-labelledby={`${tabIdPrefix}-desktop-adminUsers`}>
              <AdminUserManagement
                currentUserId={sessionInfo?.userId || null}
                externalSubTab={adminSubTab}
              />
            </div>
          )}

          {activeTab === 'finance' && allowedSet.has('finance') && (
            <div role="tabpanel" aria-labelledby={`${tabIdPrefix}-desktop-finance`}>
              <FinancialManagement
                productionStyles={productionBundle.styles}
                productionMachines={productionBundle.machines}
                externalSubTab={financeSubTab}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
