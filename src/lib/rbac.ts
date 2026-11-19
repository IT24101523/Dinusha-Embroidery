import type { UserRole } from '@/db/schema/users';

export type ErpModuleId =
  | 'dashboard'
  | 'employees'
  | 'calculator'
  | 'printManager'
  | 'salarySheet'
  | 'etf'
  | 'epf'
  | 'needle'
  | 'production'
  | 'quality'
  | 'quotations'
  | 'adminUsers'
  | 'finance';

export interface ErpModuleMeta {
  id: ErpModuleId;
  label: string;
  category: 'Core' | 'Payroll' | 'Operations' | 'Administration';
  description: string;
}

export const ALL_ERP_MODULES: ErpModuleMeta[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    category: 'Core',
    description: 'Factory Overview & Production Plan',
  },
  {
    id: 'finance',
    label: 'Financial Governance',
    category: 'Core',
    description: 'P&L, Machine Revenue, Payroll, COGS & OPEX',
  },
  {
    id: 'employees',
    label: 'Employees',
    category: 'Payroll',
    description: 'Profiles, Photos & Personal Files',
  },
  {
    id: 'calculator',
    label: 'Salary Calculator',
    category: 'Payroll',
    description: 'OT, Allowances & Net Pay',
  },
  {
    id: 'printManager',
    label: 'Payslip Print Manager',
    category: 'Payroll',
    description: 'Bulk & Individual Bilingual Slips',
  },
  {
    id: 'salarySheet',
    label: 'Monthly Salary Sheet',
    category: 'Payroll',
    description: 'Master Payroll Register & CSV',
  },
  {
    id: 'etf',
    label: 'ETF Return',
    category: 'Payroll',
    description: '3% Statutory Schedule',
  },
  {
    id: 'epf',
    label: 'EPF Form C',
    category: 'Payroll',
    description: '8% + 12% Monthly Remittance',
  },
  {
    id: 'needle',
    label: 'Needle Management',
    category: 'Operations',
    description: 'Broken Needle Log & Stock Control',
  },
  {
    id: 'production',
    label: 'Production Management',
    category: 'Operations',
    description: 'Style Master, Machines & Gantt Matrix',
  },
  {
    id: 'quality',
    label: 'Quality Checking',
    category: 'Operations',
    description: 'Checking Plan, Live Floor & Checkers',
  },
  {
    id: 'quotations',
    label: 'Invoices & Quotations',
    category: 'Core',
    description: 'Zoho-Style Invoices, Quotes & Production Reconciliation',
  },
  {
    id: 'adminUsers',
    label: 'User Access & Audit',
    category: 'Administration',
    description: 'Role Access Control, Password Reset & Audit Logs',
  },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  CEO: 'CEO',
  FACTORY_MANAGER: 'Factory Manager',
  HR_NEEDLE_MANAGER: 'HR & Needle Manager',
  PRODUCTION_MANAGER: 'Production Manager',
  QUALITY_MANAGER: 'Quality Manager',
};

export const ROLE_DEFAULT_MODULES: Record<UserRole, ErpModuleId[]> = {
  SUPER_ADMIN: ALL_ERP_MODULES.map((m) => m.id),
  CEO: [
    'dashboard',
    'finance',
    'employees',
    'calculator',
    'printManager',
    'salarySheet',
    'etf',
    'epf',
    'needle',
    'production',
    'quality',
    'quotations',
  ],
  FACTORY_MANAGER: [
    'dashboard',
    'employees',
    'needle',
    'production',
    'quality',
    'quotations',
  ],
  HR_NEEDLE_MANAGER: [
    'dashboard',
    'employees',
    'calculator',
    'printManager',
    'salarySheet',
    'etf',
    'epf',
    'needle',
  ],
  PRODUCTION_MANAGER: ['dashboard', 'production', 'quotations'],
  QUALITY_MANAGER: ['dashboard', 'quality'],
};

export function resolveAllowedModules(
  role: UserRole,
  customModules?: string[] | null
): ErpModuleId[] {
  if (role === 'SUPER_ADMIN') {
    return ALL_ERP_MODULES.map((m) => m.id);
  }
  if (Array.isArray(customModules) && customModules.length > 0) {
    const validIds = new Set<string>(ALL_ERP_MODULES.map((m) => m.id));
    const filtered = customModules.filter((m): m is ErpModuleId => validIds.has(m));
    if (filtered.length > 0) return filtered;
  }
  return ROLE_DEFAULT_MODULES[role] || ['dashboard'];
}
