'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Tv,
  Users,
  Target,
  ArrowLeft,
  Activity,
  Layers,
} from 'lucide-react';

interface CheckingBlock {
  id: string;
  client: string;
  style: string;
  startCol: number;
  span: number;
  plan: number;
  actual: number;
}

interface CheckerRow {
  id: string;
  status: 'ACTIVE' | 'IDLE';
  styles: CheckingBlock[];
}

interface StyleMasterItem {
  name: string;
  company: string;
  orderQty: number;
  todayDeliveryQty: number;
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

const DEFAULT_STYLES: StyleMasterItem[] = [
  { name: 'Miami Denim', company: 'Nike Apparel', orderQty: 2500, todayDeliveryQty: 1000 },
  { name: 'Miami Strawberry', company: 'Motif Brand', orderQty: 1500, todayDeliveryQty: 500 },
  { name: 'F/S Animals', company: 'Tesco Sri Lanka', orderQty: 1800, todayDeliveryQty: 800 },
  { name: 'Miami Big love', company: 'Adidas Sportswear', orderQty: 3200, todayDeliveryQty: 1200 },
  { name: 'Track Jacket Logo #102', company: 'Nike Apparel', orderQty: 2000, todayDeliveryQty: 0 },
];

export default function QualityLivePage() {
  const [checkers, setCheckers] = useState<CheckerRow[]>([]);
  const [stylesMaster, setStylesMaster] = useState<StyleMasterItem[]>(DEFAULT_STYLES);

  useEffect(() => {
    const loadData = () => {
      const savedCheckers = localStorage.getItem('dinusha_checkers_data_v4');
      const savedStyles = localStorage.getItem('dinusha_qc_styles_v4');
      if (savedCheckers) setCheckers(JSON.parse(savedCheckers));
      if (savedStyles) setStylesMaster(JSON.parse(savedStyles));
    };

    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Aggregated Metrics
  let shiftActualTotal = 0;
  let shiftDeliveryTargetTotal = 0;
  const styleMetrics: Record<
    string,
    { orderQty: number; plannedCheckingQty: number; actualDoneQty: number; todayDeliveryQty: number; company: string }
  > = {};

  stylesMaster.forEach((sm) => {
    styleMetrics[sm.name] = {
      orderQty: sm.orderQty,
      plannedCheckingQty: 0,
      actualDoneQty: 0,
      todayDeliveryQty: sm.todayDeliveryQty,
      company: sm.company,
    };
  });

  checkers.forEach((c) => {
    c.styles.forEach((s) => {
      shiftActualTotal += s.actual;
      if (styleMetrics[s.style]) {
        styleMetrics[s.style].plannedCheckingQty += s.plan;
        styleMetrics[s.style].actualDoneQty += s.actual;
      }
    });
  });

  // Enforce Auto-Cap Logic for Read-Only Display to maintain Data Integrity
  stylesMaster.forEach((sm) => {
    if (styleMetrics[sm.name].todayDeliveryQty > styleMetrics[sm.name].plannedCheckingQty) {
      styleMetrics[sm.name].todayDeliveryQty = styleMetrics[sm.name].plannedCheckingQty;
    }
    shiftDeliveryTargetTotal += styleMetrics[sm.name].todayDeliveryQty;
  });

  const overallPct =
    shiftDeliveryTargetTotal > 0
      ? Math.round((shiftActualTotal / shiftDeliveryTargetTotal) * 100)
      : 0;

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Top Checking KPIs */}
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main Target Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Daily Checking vs Delivery Target
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
              <span className="text-4xl font-black text-emerald-400 font-mono">
                {shiftActualTotal.toLocaleString()}
              </span>
              <span className="text-sm font-semibold text-slate-400">
                / {shiftDeliveryTargetTotal.toLocaleString()} Pcs Delivered
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
                <Users className="w-3.5 h-3.5" />8 Active Checkers Working
              </span>
              <span>Day Shift (08:00 - 19:00)</span>
            </div>
          </div>
        </div>

        {/* Style-Wise Output & Delivery Cards */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Style-Wise Output & Delivery Breakdown</span>
            </h4>
            <span className="text-[11px] text-slate-500 font-mono">Aggregated Across Checkers</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {stylesMaster.map((sm) => {
              const data = styleMetrics[sm.name];
              const cStyle = CLIENT_STYLES[data.company] || CLIENT_STYLES['Nike Apparel'];

              return (
                <div
                  key={sm.name}
                  className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between space-y-2.5"
                >
                  <div>
                    <span
                      className={`${cStyle.tag} text-white font-extrabold text-[9px] px-2 py-0.5 rounded uppercase tracking-wider`}
                    >
                      {data.company}
                    </span>
                    <h5 className="font-extrabold text-slate-200 text-xs truncate mt-2">
                      {sm.name}
                    </h5>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                      <span className="text-[9px] text-slate-500 uppercase block font-sans">
                        Checked
                      </span>
                      <span className="font-bold text-emerald-400">
                        {data.actualDoneQty.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                      <span className="text-[9px] text-slate-500 uppercase block font-sans">
                        Delivery
                      </span>
                      <span className="font-bold text-indigo-400">
                        {data.todayDeliveryQty.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Floor TV Wallboard 8 Checkers Matrix */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Hours Header */}
        <div className="flex border-b border-slate-800 bg-slate-950 text-slate-300 font-bold text-xs sticky top-0 z-20">
          <div className="w-64 p-3 bg-slate-900 border-r border-slate-800 uppercase tracking-wider flex items-center justify-between shrink-0">
            <span className="text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              8 Quality Checkers
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
              Staff
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

        {/* Checker Rows */}
        <div className="divide-y divide-slate-800/80">
          {checkers.map((checker) => {
            let checkerPlan = 0;
            let checkerActual = 0;
            checker.styles.forEach((s) => {
              checkerPlan += s.plan;
              checkerActual += s.actual;
            });

            const compPct = checkerPlan > 0 ? Math.round((checkerActual / checkerPlan) * 100) : 0;

            return (
              <div
                key={checker.id}
                className="flex items-stretch hover:bg-slate-800/30 transition-colors"
              >
                {/* Left Staff Info */}
                <div className="w-64 p-3.5 bg-slate-950/70 border-r border-slate-800 flex flex-col justify-between shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-white text-sm tracking-tight">
                      {checker.id}
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-500/40">
                      Active
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono font-semibold text-slate-400 mt-2">
                    <span>
                      <strong className="text-white">{checkerActual}</strong> / {checkerPlan}
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
                          : 'bg-persian-500'
                      }`}
                      style={{ width: `${Math.min(compPct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Right Matrix Blocks */}
                <div className="flex-1 grid grid-cols-11 relative matrix-grid p-2.5 gap-2.5 items-center">
                  {checker.styles.map((block) => {
                    const cStyle =
                      CLIENT_STYLES[block.client] || CLIENT_STYLES['Nike Apparel'];

                    return (
                      <div
                        key={block.id}
                        style={{
                          gridColumn: `${block.startCol} / span ${block.span}`,
                        }}
                        className={`${cStyle.bg} ${cStyle.border} border rounded-2xl p-3 shadow-md flex flex-col justify-between`}
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
                          <span className="bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-lg text-xs shadow-sm">
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
