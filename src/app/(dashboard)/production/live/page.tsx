'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Factory,
  Tv,
  CheckCircle2,
  Calendar,
  Clock,
  Layers,
  ArrowLeft,
  Activity,
  Flame,
} from 'lucide-react';

interface ProductionBlock {
  id: string;
  client: string;
  style: string;
  startCol: number;
  span: number;
  plan: number;
  actual: number;
}

interface MachineRow {
  id: string;
  num: number;
  operator: string;
  helper: string;
  status: 'RUNNING' | 'SETUP' | 'MAINTENANCE';
  styles: ProductionBlock[];
}

const SHIFT_HOURS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
];

const CLIENT_STYLES: Record<string, { bg: string; text: string; border: string; tag: string }> = {
  'Nike Apparel': {
    bg: 'bg-indigo-950/70',
    text: 'text-indigo-200',
    border: 'border-indigo-500/40',
    tag: 'bg-indigo-600',
  },
  'Motif Brand': {
    bg: 'bg-amber-950/70',
    text: 'text-amber-200',
    border: 'border-amber-500/40',
    tag: 'bg-amber-600',
  },
  'Tesco Sri Lanka': {
    bg: 'bg-emerald-950/70',
    text: 'text-emerald-200',
    border: 'border-emerald-500/40',
    tag: 'bg-emerald-600',
  },
  'Adidas Sportswear': {
    bg: 'bg-purple-950/70',
    text: 'text-purple-200',
    border: 'border-purple-500/40',
    tag: 'bg-purple-600',
  },
};

export default function ProductionLivePage() {
  const [machines, setMachines] = useState<MachineRow[]>([]);

  useEffect(() => {
    const loadData = () => {
      const saved = localStorage.getItem('dinusha_production_machines_v4');
      if (saved) {
        setMachines(JSON.parse(saved));
      }
    };

    loadData();
    const interval = setInterval(loadData, 3000); // Polling local state
    return () => clearInterval(interval);
  }, []);

  // Aggregated Totals
  let totalPlan = 0;
  let totalActual = 0;
  const styleAggregates: Record<
    string,
    { client: string; style: string; plan: number; actual: number }
  > = {};

  machines.forEach((mac) => {
    mac.styles.forEach((s) => {
      totalPlan += s.plan;
      totalActual += s.actual;

      const key = `${s.client} - ${s.style}`;
      if (!styleAggregates[key]) {
        styleAggregates[key] = {
          client: s.client,
          style: s.style,
          plan: 0,
          actual: 0,
        };
      }
      styleAggregates[key].plan += s.plan;
      styleAggregates[key].actual += s.actual;
    });
  });

  const overallPct = totalPlan > 0 ? Math.round((totalActual / totalPlan) * 100) : 0;

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Top Floor KPIs */}
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main Target Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Daily Shift Target vs Output
              </span>
              <span
                className={`text-xs font-black px-3 py-1 rounded-full border ${
                  overallPct >= 100
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : overallPct >= 85
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}
              >
                {overallPct}% MET
              </span>
            </div>

            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-4xl font-black text-amber-300 font-mono">
                {totalActual.toLocaleString()}
              </span>
              <span className="text-sm font-semibold text-slate-400">
                / {totalPlan.toLocaleString()} Pcs Target
              </span>
            </div>
          </div>

          <div className="mt-5">
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  overallPct >= 100
                    ? 'bg-emerald-500'
                    : overallPct >= 85
                    ? 'bg-amber-500'
                    : 'bg-persian-500'
                }`}
                style={{ width: `${Math.min(overallPct, 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] font-semibold text-slate-400 mt-2.5">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Activity className="w-3.5 h-3.5" />
                13 Active Machine Fleets
              </span>
              <span>Day Shift (08:00 - 19:00)</span>
            </div>
          </div>
        </div>

        {/* Style-Wise Output Cards */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-persian-400" />
              <span>Style-Wise Shift Output Breakdown</span>
            </h4>
            <span className="text-[11px] text-slate-500 font-mono">Real-Time Aggregates</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.keys(styleAggregates).map((key) => {
              const item = styleAggregates[key];
              const pct = item.plan > 0 ? Math.round((item.actual / item.plan) * 100) : 0;
              const cStyle = CLIENT_STYLES[item.client] || CLIENT_STYLES['Nike Apparel'];

              return (
                <div
                  key={key}
                  className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between space-y-2.5"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`${cStyle.tag} text-white font-extrabold text-[9px] px-2 py-0.5 rounded uppercase tracking-wider`}
                      >
                        {item.client}
                      </span>
                      <span
                        className={`text-[11px] font-mono font-bold ${
                          pct >= 100 ? 'text-emerald-400' : pct >= 85 ? 'text-amber-400' : 'text-slate-400'
                        }`}
                      >
                        {pct}%
                      </span>
                    </div>
                    <h5 className="font-extrabold text-slate-200 text-xs truncate mt-2">
                      {item.style}
                    </h5>
                  </div>

                  <div>
                    <div className="flex justify-between items-baseline text-xs font-mono font-bold">
                      <span className="text-amber-300 text-sm">{item.actual.toLocaleString()}</span>
                      <span className="text-slate-500 text-[11px]">
                        / {item.plan.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div
                        className={`h-full rounded-full ${
                          pct >= 100
                            ? 'bg-emerald-500'
                            : pct >= 85
                            ? 'bg-amber-500'
                            : 'bg-persian-500'
                        }`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Floor TV Wallboard Gantt Matrix */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Timeline Hours Header */}
        <div className="flex border-b border-slate-800 bg-slate-950 text-slate-300 font-bold text-xs sticky top-0 z-20">
          <div className="w-80 p-3 bg-slate-900 border-r border-slate-800 uppercase tracking-wider flex items-center justify-between shrink-0">
            <span className="text-amber-300 flex items-center gap-2">
              <Factory className="w-4 h-4" />
              13 Machines Fleet
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
              Operator / Helper
            </span>
          </div>

          <div className="flex-1 grid grid-cols-11 text-center divide-x divide-slate-800">
            {SHIFT_HOURS.map((h, idx) => (
              <div key={h} className="py-2.5 px-1 flex flex-col items-center justify-center">
                <span className="font-mono font-bold text-white text-xs">{h}</span>
                <span className="text-[10px] text-slate-500 font-medium">H{idx + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Machine Rows */}
        <div className="divide-y divide-slate-800/80">
          {machines.map((mac) => {
            let macPlan = 0;
            let macActual = 0;
            mac.styles.forEach((s) => {
              macPlan += s.plan;
              macActual += s.actual;
            });

            const compPct = macPlan > 0 ? Math.round((macActual / macPlan) * 100) : 0;

            return (
              <div key={mac.id} className="flex items-stretch hover:bg-slate-800/30 transition-colors">
                {/* Left Machine Header */}
                <div className="w-80 p-3.5 bg-slate-950/70 border-r border-slate-800 flex flex-col justify-between shrink-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-black text-white text-sm tracking-tight">{mac.id}</span>
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                        mac.status === 'RUNNING'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : mac.status === 'SETUP'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}
                    >
                      {mac.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs mb-2">
                    <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300 font-medium truncate">
                      {mac.operator}
                    </span>
                    <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400 font-medium truncate">
                      {mac.helper}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono font-semibold text-slate-400">
                    <span>
                      <strong className="text-white">{macActual}</strong> / {macPlan} Pcs
                    </span>
                    <span
                      className={
                        compPct >= 100
                          ? 'text-emerald-400 font-bold'
                          : compPct >= 85
                          ? 'text-amber-400 font-bold'
                          : 'text-rose-400 font-bold'
                      }
                    >
                      {compPct}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1.5 border border-slate-700">
                    <div
                      className={`h-full rounded-full ${
                        compPct >= 100
                          ? 'bg-emerald-500'
                          : compPct >= 85
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(compPct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Right Timeline Grid Tracks with Glowing Performance Borders */}
                <div className="flex-1 grid grid-cols-11 relative matrix-grid p-2.5 gap-2.5 items-center">
                  {mac.styles.map((block) => {
                    const cStyle =
                      CLIENT_STYLES[block.client] || CLIENT_STYLES['Nike Apparel'];
                    const pct = block.plan > 0 ? Math.round((block.actual / block.plan) * 100) : 0;

                    let glowClass = '';
                    if (pct >= 100) glowClass = 'glow-target-met';
                    else if (pct >= 85) glowClass = 'glow-target-near';
                    else glowClass = 'glow-target-behind';

                    return (
                      <div
                        key={block.id}
                        style={{
                          gridColumn: `${block.startCol} / span ${block.span}`,
                        }}
                        className={`${cStyle.bg} ${cStyle.border} ${glowClass} border rounded-2xl p-3 shadow-md flex flex-col justify-between`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider ${cStyle.text}`}
                          >
                            {block.client}
                          </span>
                        </div>

                        <div className="font-black text-white text-xs truncate mb-2">
                          {block.style}
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400 font-semibold">
                            Plan: {block.plan}
                          </span>
                          <span className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-lg text-xs shadow-sm">
                            Act: {block.actual}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
