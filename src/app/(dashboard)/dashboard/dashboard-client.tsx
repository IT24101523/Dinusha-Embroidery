'use client';

import Link from 'next/link';
import { logoutAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDialog } from '@/components/system/dialog-provider';
import {
  LogOut,
  User,
  Mail,
  ShieldCheck,
  Factory,
  BarChart3,
  ClipboardCheck,
  Scissors,
  DollarSign,
  Users,
} from 'lucide-react';

interface DashboardClientProps {
  user: {
    email: string;
    fullName: string;
    role: string;
  };
}

const ROLE_LABELS: Record<string, string> = {
  CEO: 'Chief Executive Officer',
  FACTORY_MANAGER: 'Factory Manager',
  HR_NEEDLE_MANAGER: 'HR & Needle Manager',
  PRODUCTION_MANAGER: 'Production Manager',
  QUALITY_MANAGER: 'Quality Manager',
};

const MODULE_CARDS = [
  {
    title: 'Production Management',
    description: '13-Machine Gantt Matrix, Style Planning, Daily Logs',
    icon: Factory,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    roles: ['CEO', 'FACTORY_MANAGER', 'PRODUCTION_MANAGER'],
    href: '/production',
  },
  {
    title: 'Quality & Delivery',
    description: '8-Checker Timeline, Inspection Logs, Day Delivery',
    icon: ClipboardCheck,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    roles: ['CEO', 'FACTORY_MANAGER', 'QUALITY_MANAGER'],
  },
  {
    title: 'Needle & Safety',
    description: 'Stock Directory, Broken Records, Missing Needle CLN',
    icon: Scissors,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    roles: ['CEO', 'FACTORY_MANAGER', 'HR_NEEDLE_MANAGER'],
  },
  {
    title: 'Payroll & Attendance',
    description: 'Employee Master, Salary Calculator, EPF/ETF',
    icon: Users,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    roles: ['CEO', 'FACTORY_MANAGER', 'HR_NEEDLE_MANAGER'],
  },
  {
    title: 'Financial Management',
    description: 'P&L Dashboard, Revenue Ledger, OPEX Logger',
    icon: DollarSign,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    roles: ['CEO', 'FACTORY_MANAGER'],
  },
  {
    title: 'Analytics & Reports',
    description: 'KPI Dashboards, Margin Analysis, Machine Reports',
    icon: BarChart3,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    roles: ['CEO', 'FACTORY_MANAGER'],
  },
];

export function DashboardClient({ user }: DashboardClientProps) {
  const dialog = useDialog();

  async function handleLogout() {
    const confirmed = await dialog.confirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of the system?',
      confirmText: 'Sign Out',
      cancelText: 'Stay',
      variant: 'warning',
    });

    if (confirmed) {
      await logoutAction();
    }
  }

  const accessibleModules = MODULE_CARDS.filter((mod) =>
    mod.roles.includes(user.role)
  );

  return (
    <div className="min-h-screen">
      {/* Top Header */}
      <header className="bg-persian-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-persian-800 flex items-center justify-center font-black text-xl">
              D
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-wide uppercase">
                Dinusha Embroidery
              </h1>
              <p className="text-xs text-blue-200/80">FactoryOps Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-blue-300" />
              <span className="font-medium">{user.fullName}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome Card */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-persian-800 text-white flex items-center justify-center font-black text-2xl">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Welcome, {user.fullName}!
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <Mail className="h-3.5 w-3.5" />
                      {user.email}
                    </div>
                    <Badge variant="info">
                      <ShieldCheck className="h-3 w-3" />
                      {ROLE_LABELS[user.role] || user.role}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Module Access Cards */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Your Modules</h3>
          <p className="text-sm text-slate-500">Quick access to your permitted operations</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accessibleModules.map((mod) => {
            const Icon = mod.icon;
            const cardContent = (
              <Card
                className="hover:shadow-md transition-shadow cursor-pointer group h-full"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl ${mod.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}
                    >
                      <Icon className={`h-5 w-5 ${mod.color}`} />
                    </div>
                    <CardTitle className="text-base">{mod.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500">{mod.description}</p>
                </CardContent>
              </Card>
            );

            if (mod.href) {
              return (
                <Link key={mod.title} href={mod.href} className="block">
                  {cardContent}
                </Link>
              );
            }

            return <div key={mod.title}>{cardContent}</div>;
          })}
        </div>
      </main>
    </div>
  );
}
