'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Factory,
  Tv,
  CheckCircle2,
  ShieldAlert,
  Database,
  Banknote,
  TrendingUp,
  Menu,
  X,
  Clock,
  Calendar,
  Globe,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface FactoryShellProps {
  children: React.ReactNode;
}

export function FactoryShell({ children }: FactoryShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setDateStr(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Determine if active view is a TV wallboard
  const isWallboard = pathname.includes('/live');

  // Navigation Links
  const navSections = [
    {
      title: 'Production Operations',
      items: [
        {
          name: 'Production Gantt Matrix',
          href: '/production',
          icon: Factory,
          badge: '13 Units',
        },
        {
          name: 'Production TV Wallboard',
          href: '/production/live',
          icon: Tv,
          badge: 'Live',
        },
      ],
    },
    {
      title: 'Quality & Delivery',
      items: [
        {
          name: 'Quality Checking Matrix',
          href: '/quality',
          icon: CheckCircle2,
          badge: '8 Staff',
        },
        {
          name: 'Checking TV Wallboard',
          href: '/quality/live',
          icon: Tv,
          badge: 'Live',
        },
      ],
    },
    {
      title: 'Technical & Compliance',
      items: [
        {
          name: 'Needle & Safety (CLN-01)',
          href: '/needle',
          icon: ShieldAlert,
          badge: 'Tesco',
        },
        {
          name: 'Master Data & Strike-Off',
          href: '/master-data',
          icon: Database,
          badge: 'Formulas',
        },
      ],
    },
    {
      title: 'Human Resources & Finance',
      items: [
        {
          name: 'Payroll, Attendance & Slips',
          href: '/payroll',
          icon: Banknote,
          badge: 'Sinhala/EPF',
        },
        {
          name: 'P&L & Machine Revenue',
          href: '/finance',
          icon: TrendingUp,
          badge: 'Multi-FX',
        },
      ],
    },
  ];

  // If on a TV wallboard, provide an ultra-clean full-screen presentation mode
  if (isWallboard) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-6 py-3 flex items-center justify-between no-print sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-persian-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-persian-500/20">
              D
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black tracking-wider uppercase text-white">
                  DINUSHA EMBROIDERY
                </h1>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  FLOOR WALLBOARD
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Weliweriya Industrial Facility • Live Telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-xs font-mono bg-slate-800/80 px-4 py-1.5 rounded-xl border border-slate-700">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                {dateStr}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-amber-300 font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {timeStr}
              </span>
            </div>

            <Link
              href={pathname.startsWith('/production') ? '/production' : '/quality'}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Exit Wallboard
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-y-auto">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans antialiased text-slate-800">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-72 bg-persian-900 text-white z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } no-print`}
      >
        {/* Brand Banner */}
        <div className="p-5 bg-persian-800 border-b border-persian-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-persian-800 flex items-center justify-center font-black text-xl shadow-lg">
              D
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-black tracking-wide uppercase text-white">
                  DINUSHA
                </h1>
                <span className="bg-amber-400/20 text-amber-300 text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase">
                  Pvt Ltd
                </span>
              </div>
              <p className="text-[10px] text-blue-200/80 font-medium tracking-wider uppercase">
                Weliweriya Factory
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-blue-200 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-300/80 px-3">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-persian-600 text-white shadow-md shadow-persian-600/30 font-black'
                          : 'text-blue-200/90 hover:bg-persian-800/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 ${
                            isActive ? 'text-amber-300' : 'text-blue-300'
                          }`}
                        />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-tight ${
                            isActive
                              ? 'bg-white text-persian-800'
                              : 'bg-persian-800/90 text-blue-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-persian-800 space-y-2 bg-persian-950/60">
          <Link
            href="/"
            className="flex items-center justify-between w-full p-2.5 bg-persian-800/70 hover:bg-persian-800 text-blue-100 hover:text-white rounded-xl text-xs font-bold transition-all border border-persian-700/60"
          >
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>Public Website</span>
            </div>
            <ExternalLink className="w-3 h-3 text-blue-300" />
          </Link>

          <div className="flex items-center justify-between text-[10px] text-blue-300/70 px-1 pt-1 font-medium">
            <span>Tesco Compliance Verified</span>
            <span className="font-mono">v4.0 Enterprise</span>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        {/* Top Sticky Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs no-print">
          <div className="px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-persian-800 uppercase tracking-tight">
                    {pathname.startsWith('/production')
                      ? 'Production Management Suite'
                      : pathname.startsWith('/quality')
                      ? 'Quality & Checking Suite'
                      : pathname.startsWith('/needle')
                      ? 'Needle & Safety Management'
                      : pathname.startsWith('/master-data')
                      ? 'Master Data & Strike-Off Portal'
                      : pathname.startsWith('/payroll')
                      ? 'Payroll, Attendance & Statutory'
                      : pathname.startsWith('/finance')
                      ? 'Financial Governance & P&L'
                      : 'Factory Operations Portal'}
                  </h2>
                </div>
                <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                  Dinusha Embroidery (Pvt Ltd) • Industrial Facility Operations
                </p>
              </div>
            </div>

            {/* Header Right Widgets */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-persian-500" />
                <span className="font-semibold">{dateStr}</span>
                <span className="text-slate-300">|</span>
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-mono font-bold text-slate-800">
                  {timeStr || '00:00:00 AM'}
                </span>
              </div>

              <div className="bg-persian-50 border border-persian-200 text-persian-800 text-[11px] font-bold px-3 py-1.5 rounded-xl hidden sm:flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Day Shift (08:00 - 19:00)</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
