'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { CalendarDays, Clock, Sun, Eye, Cpu, Tags, UserCog, Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ProductionDashboardData, MachineWithAssignments } from '@/actions/production';

interface ProductionDashboardProps {
  initialData: ProductionDashboardData;
}

const SHIFT_HOURS = [
  { time: '08:00 AM', label: '08:00' },
  { time: '09:00 AM', label: '09:00' },
  { time: '10:00 AM', label: '10:00' },
  { time: '11:00 AM', label: '11:00' },
  { time: '12:00 PM', label: '12:00' },
  { time: '01:00 PM', label: '13:00' },
  { time: '02:00 PM', label: '14:00' },
  { time: '03:00 PM', label: '15:00' },
  { time: '04:00 PM', label: '16:00' },
  { time: '05:00 PM', label: '17:00' },
  { time: '06:00 PM', label: '18:00' },
];

const CLIENT_STYLES: Record<string, { bg: string; text: string; border: string; tag: string }> = {
  indigo: {
    bg: 'bg-indigo-50/90',
    text: 'text-indigo-950',
    border: 'border-indigo-300',
    tag: 'bg-indigo-700',
  },
  amber: {
    bg: 'bg-amber-50/90',
    text: 'text-amber-950',
    border: 'border-amber-300',
    tag: 'bg-amber-600',
  },
  emerald: {
    bg: 'bg-emerald-50/90',
    text: 'text-emerald-950',
    border: 'border-emerald-300',
    tag: 'bg-emerald-700',
  },
  purple: {
    bg: 'bg-purple-50/90',
    text: 'text-purple-950',
    border: 'border-purple-300',
    tag: 'bg-purple-700',
  },
  slate: {
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
    tag: 'bg-slate-600',
  },
};

function getPerformanceGlow(percentage: number): string {
  if (percentage >= 100) return 'border-l-4 border-l-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.15)]';
  if (percentage >= 85) return 'border-l-4 border-l-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.15)]';
  return 'border-l-4 border-l-rose-500 shadow-[0_0_12px_rgba(239,68,68,0.15)]';
}

function getProgressColor(percentage: number): string {
  if (percentage >= 100) return 'bg-emerald-500';
  if (percentage >= 85) return 'bg-amber-500';
  return 'bg-rose-500';
}

function getPercentageColor(percentage: number): string {
  if (percentage >= 100) return 'text-emerald-600 font-bold';
  if (percentage >= 85) return 'text-amber-600 font-semibold';
  return 'text-rose-500 font-bold';
}

const emptySubscribe = () => () => {};

export function ProductionDashboard({ initialData }: ProductionDashboardProps) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [currentTime, setCurrentTime] = useState(new Date());
  const [data] = useState(initialData);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const overallPercentage = data.totalPlan > 0
    ? Math.round((data.totalActual / data.totalPlan) * 100)
    : 0;

  const dateStr = isMounted ? currentTime.toISOString().split('T')[0] : '2026-10-19';
  const timeStr = isMounted ? currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }) : '08:00:00 AM';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans antialiased flex flex-col">
      {/* Top Persian Blue Header */}
      <header className="bg-persian-800 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-[1920px] mx-auto px-4 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Branding */}
          <div className="flex items-center space-x-3.5">
            <Link
              href="/dashboard"
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              title="Return to Main Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="w-11 h-11 rounded-xl bg-white text-persian-800 flex items-center justify-center font-black text-2xl shadow-inner">
              D
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-wide uppercase">DINUSHA EMBROIDERY</h1>
                <span className="bg-blue-500/30 text-blue-100 text-xs px-2.5 py-0.5 rounded-full border border-blue-400/30 font-medium">
                  Pvt Ltd
                </span>
              </div>
              <p className="text-xs text-blue-200/90 font-medium">
                Weliweriya Factory — Floor Production Monitoring Dashboard (13 Machines)
              </p>
            </div>
          </div>

          {/* Status & Shift Display */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date & Clock */}
            <div className="bg-persian-900/60 border border-persian-600/40 rounded-xl px-3.5 py-2 flex items-center gap-3 text-xs text-blue-100">
              <div className="flex items-center gap-1.5 font-semibold">
                <CalendarDays className="h-3.5 w-3.5 text-amber-400" />
                <span>{dateStr}</span>
              </div>
              <span className="text-persian-600">|</span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-amber-300">
                <Clock className="h-3.5 w-3.5" />
                <span>{timeStr}</span>
              </div>
            </div>

            {/* Shift Indicator */}
            <div className="bg-persian-900/80 px-3.5 py-2 rounded-xl border border-persian-600/50 flex items-center gap-2 text-xs font-bold text-white">
              <Sun className="h-3.5 w-3.5 text-amber-400" />
              <span>Day Shift (08:00 - 19:00)</span>
            </div>

            {/* Status View Tag */}
            <div className="bg-blue-900/50 border border-blue-500/40 text-blue-100 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-blue-300" />
              <span>Live Display Mode (Read-Only)</span>
            </div>
          </div>
        </div>
      </header>

      {/* KPI Section */}
      <section className="p-4 max-w-[1920px] w-full mx-auto grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Overall KPI Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                DAILY TARGET VS ACTUAL OUTPUT
              </span>
              <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                {overallPercentage}% Met
              </span>
            </div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-3xl font-black text-persian-800">
                {data.totalActual.toLocaleString()}
              </span>
              <span className="text-sm font-semibold text-slate-500">
                / {data.totalPlan.toLocaleString()} Pcs
              </span>
            </div>
          </div>

          <div className="mt-4">
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(overallPercentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500 mt-2">
              <span>{data.activeMachineCount} Active Machines Running</span>
              <span>Day Shift (08:00 - 19:00)</span>
            </div>
          </div>
        </div>

        {/* Style-Wise Breakdown */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Tags className="h-3.5 w-3.5 text-persian-500" />
              Style-Wise Total Output Breakdown (Active Orders)
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              Aggregated across all {data.machines.length} machines
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.styleAggregates.map((agg, idx) => {
              const pct = agg.totalPlan > 0 ? Math.round((agg.totalActual / agg.totalPlan) * 100) : 0;
              const cStyle = CLIENT_STYLES[agg.clientColorScheme] || CLIENT_STYLES.slate;

              return (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(cStyle.tag, 'text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider')}>
                        {agg.clientName}
                      </span>
                      <span className={cn('text-[11px] font-bold', getPercentageColor(pct))}>
                        {pct}% Met
                      </span>
                    </div>
                    <h4 className="font-extrabold text-slate-800 text-xs truncate mt-1">
                      {agg.styleName}
                    </h4>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between items-baseline text-xs font-bold text-slate-700">
                      <span className="text-persian-800 text-sm font-black">
                        {agg.totalActual.toLocaleString()}
                      </span>
                      <span className="text-slate-400 font-normal">
                        / {agg.totalPlan.toLocaleString()} Pcs Total
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div
                        className={cn(getProgressColor(pct), 'h-full rounded-full')}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {data.styleAggregates.length === 0 && (
              <div className="col-span-full text-center py-8 text-slate-400 text-sm">
                No production assignments scheduled for today
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Visual Gantt Matrix */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto px-4 pb-6 flex flex-col">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden">
          {/* Timeline Header */}
          <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-20 font-semibold text-xs text-slate-600">
            <div className="w-80 sm:w-96 p-3 flex items-center justify-between bg-slate-100 border-r border-slate-300 font-bold text-persian-800 uppercase tracking-wider shrink-0">
              <span className="flex items-center gap-2">
                <Cpu className="h-3.5 w-3.5 text-persian-500" />
                Machine & Crew ({data.machines.length})
              </span>
              <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-300 font-normal text-slate-500">
                Operator + Helper
              </span>
            </div>

            <div className="flex-1 grid grid-cols-11 divide-x divide-slate-200">
              {SHIFT_HOURS.map((h, idx) => (
                <div key={idx} className="py-2.5 px-1 flex flex-col items-center justify-center bg-slate-50/90">
                  <span className="font-bold text-slate-800 text-xs">{h.time}</span>
                  <span className="text-[10px] text-slate-400 font-normal">Hour {idx + 1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Machine Rows */}
          <div className="divide-y divide-slate-200 flex-1 overflow-y-auto max-h-[calc(100vh-320px)]">
            {data.machines.map((machine) => (
              <MachineRow key={machine.id} machine={machine} />
            ))}

            {data.machines.length === 0 && (
              <div className="flex items-center justify-center py-20 text-slate-400">
                <p>No machines configured. Please set up machines in Master Data.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function MachineRow({ machine }: { machine: MachineWithAssignments }) {
  const macPlan = machine.styles.reduce((sum, s) => sum + s.planQty, 0);
  const macActual = machine.styles.reduce((sum, s) => sum + s.actualQty, 0);
  const compPercent = macPlan > 0 ? Math.round((macActual / macPlan) * 100) : 0;

  const statusConfig: Record<string, { label: string; className: string }> = {
    RUNNING: { label: 'Running', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    SETUP: { label: 'Setup', className: 'bg-amber-100 text-amber-800 border-amber-300' },
    MAINTENANCE: { label: 'Idle', className: 'bg-rose-100 text-rose-800 border-rose-300' },
    IDLE: { label: 'Idle', className: 'bg-rose-100 text-rose-800 border-rose-300' },
  };

  const status = statusConfig[machine.status] || statusConfig.IDLE;

  return (
    <div className="flex items-stretch hover:bg-slate-50/80 transition-colors">
      {/* Machine Sidebar */}
      <div className="w-80 sm:w-96 p-3 bg-white border-r border-slate-300 flex flex-col justify-between shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-800 text-sm tracking-tight">
              {machine.machineName}
            </span>
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded border', status.className)}>
              {status.label}
            </span>
          </div>
        </div>

        {/* Operator & Helper */}
        <div className="flex items-center gap-2 text-xs mb-2">
          {machine.operatorName && (
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-medium">
              <UserCog className="h-2.5 w-2.5 text-persian-600" />
              <span>{machine.operatorName}</span>
            </div>
          )}
          {machine.helperName && (
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-medium">
              <Users className="h-2.5 w-2.5 text-amber-600" />
              <span>{machine.helperName}</span>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
          <span>
            Output: <strong className="text-slate-800">{macActual}</strong> / {macPlan} Pcs
          </span>
          <span className={getPercentageColor(compPercent)}>{compPercent}%</span>
        </div>
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1 border border-slate-200">
          <div
            className={cn(getProgressColor(compPercent), 'h-full rounded-full')}
            style={{ width: `${Math.min(compPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Timeline Grid */}
      <div
        className="flex-1 grid grid-cols-11 relative p-1.5 gap-2 items-center"
        style={{
          backgroundSize: 'calc(100% / 11) 100%',
          backgroundImage: 'linear-gradient(to right, #e2e8f0 1px, transparent 1px)',
        }}
      >
        {machine.styles.length > 0 ? (
          machine.styles.map((st, idx) => {
            const cStyle = CLIENT_STYLES[st.clientColorScheme] || CLIENT_STYLES.slate;
            const pct = st.planQty > 0 ? Math.round((st.actualQty / st.planQty) * 100) : 0;
            const startCol = Math.max(1, st.startHour - 7);
            const span = st.spanHours;

            return (
              <div
                key={idx}
                style={{ gridColumn: `${startCol} / span ${span}` }}
                className={cn(
                  cStyle.bg,
                  cStyle.border,
                  getPerformanceGlow(pct),
                  'border rounded-xl p-3 shadow-sm flex flex-col justify-between relative'
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={cn('text-[10px] font-black uppercase tracking-wider', cStyle.text)}>
                    {st.clientName}
                  </span>
                </div>
                <div className="font-extrabold text-slate-800 text-xs tracking-tight mb-2 truncate">
                  {st.styleName}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] font-bold text-slate-600">
                    Plan: {st.planQty}
                  </span>
                  <div className="bg-persian-800 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-lg shadow-sm">
                    Act: {st.actualQty}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-11 flex items-center justify-center text-xs text-slate-400 py-4">
            No assignment for this machine today
          </div>
        )}
      </div>
    </div>
  );
}
