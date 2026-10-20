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
  Sparkles,
} from 'lucide-react';
import { fetchQualityAssignments, DbQualityAssignment } from '@/actions/quality';
import { fetchDbStyles, DbStyle } from '@/actions/master-data';

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

const DEFAULT_STATIONS = [
  'Checker Table 01 (Yamuna)',
  'Checker Table 02 (Dilrukshi)',
  'Checker Table 03 (Sachini)',
  'Checker Table 04 (Nawodhya)',
  'Checker Table 05 (Nadeera)',
  'Checker Table 06 (Bimesha)',
  'Checker Table 07 (Ramalsha)',
  'Checker Table 08 (Nethmini)',
];

export default function QualityLivePage() {
  const [assignments, setAssignments] = useState<DbQualityAssignment[]>([]);
  const [styles, setStyles] = useState<DbStyle[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateClock();
    const clockTimer = setInterval(updateClock, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const loadData = async () => {
    try {
      const [qcData, styleData] = await Promise.all([
        fetchQualityAssignments(),
        fetchDbStyles(),
      ]);
      setAssignments(qcData);
      setStyles(styleData);
    } catch (err) {
      console.error('Failed to load QC live wallboard data:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Aggregated Totals
  const totalPlan = assignments.reduce((acc, a) => acc + a.plan_qty, 0);
  const totalActual = assignments.reduce((acc, a) => acc + a.actual_qty, 0);
  const overallPct = totalPlan > 0 ? Math.round((totalActual / totalPlan) * 100) : 0;

  // Group by checker
  const assignmentsByChecker: Record<string, DbQualityAssignment[]> = {};
  DEFAULT_STATIONS.forEach((station) => {
    assignmentsByChecker[station] = [];
  });
  assignments.forEach((a) => {
    if (!assignmentsByChecker[a.checker_name]) {
      assignmentsByChecker[a.checker_name] = [];
    }
    assignmentsByChecker[a.checker_name].push(a);
  });

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Top Floor KPIs */}
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main Target Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                QC Passed vs Shift Target
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
                {overallPct}% PASSED
              </span>
            </div>

            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-4xl font-black text-emerald-400 font-mono">
                {totalActual.toLocaleString()}
              </span>
              <span className="text-sm font-semibold text-slate-400">
                / {totalPlan.toLocaleString()} Target Pcs
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
                <Users className="w-3.5 h-3.5" />
                8 Inspection Stations
              </span>
              <span className="font-mono text-slate-300">{currentTime || '08:00 - 19:00'}</span>
            </div>
          </div>
        </div>

        {/* Style-Wise Output Stream */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                Quality Inspection Stream (Live Database)
              </h4>
            </div>
            <span className="text-[11px] text-slate-500">Auto-refresh every 5s</span>
          </div>

          {assignments.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-semibold">
              No quality inspection blocks scheduled in the database for today.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {assignments.map((a) => {
                const pct = a.plan_qty > 0 ? Math.round((a.actual_qty / a.plan_qty) * 100) : 0;
                return (
                  <div
                    key={a.id}
                    className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[9px] font-black uppercase text-emerald-400 block truncate">
                        {a.client_name}
                      </span>
                      <h5 className="font-black text-xs text-white truncate mt-0.5" title={a.style_name}>
                        {a.style_name}
                      </h5>
                    </div>

                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <span className="text-xs font-mono font-black text-emerald-400">
                          {a.actual_qty.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500"> / {a.plan_qty} pcs</span>
                      </div>
                      <span className="text-[10px] font-black px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Main Checker Station Matrix */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="flex border-b border-slate-800 bg-slate-950/80 font-semibold text-xs text-slate-400 sticky top-0 z-20">
          <div className="w-80 p-3.5 bg-slate-950 border-r border-slate-800 font-black text-white uppercase tracking-wider flex items-center justify-between shrink-0">
            <span>Checker Station & Crew</span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
              Live Fleet
            </span>
          </div>

          <div className="flex-1 grid grid-cols-11 text-center divide-x divide-slate-800 font-mono text-[11px]">
            {SHIFT_HOURS.map((h, idx) => (
              <div key={h} className="py-2.5 px-1 flex flex-col items-center justify-center">
                <span className="font-black text-slate-200">{h}</span>
                <span className="text-[9px] text-slate-500">H{idx + 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-800 max-h-[700px] overflow-y-auto">
          {DEFAULT_STATIONS.map((stationName) => {
            const rowAssignments = assignmentsByChecker[stationName] || [];
            const planTotal = rowAssignments.reduce((acc, a) => acc + a.plan_qty, 0);
            const actualTotal = rowAssignments.reduce((acc, a) => acc + a.actual_qty, 0);
            const compPct = planTotal > 0 ? Math.round((actualTotal / planTotal) * 100) : 0;

            return (
              <div key={stationName} className="flex items-stretch hover:bg-slate-800/40 transition-colors">
                <div className="w-80 p-3.5 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-white text-sm">{stationName}</span>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      ACTIVE
                    </span>
                  </div>

                  <div className="space-y-1 pt-1.5 border-t border-slate-800 text-[10px]">
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-500">Audited Pieces:</span>
                      <span className="text-emerald-400 font-bold">
                        {actualTotal} / {planTotal} ({compPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(compPct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-11 p-2 gap-1.5 relative bg-slate-950/40">
                  <div className="absolute inset-0 grid grid-cols-11 divide-x divide-slate-800/40 pointer-events-none" />

                  {rowAssignments.length === 0 ? (
                    <div className="col-span-11 flex items-center justify-center text-xs text-slate-600 font-medium italic">
                      No inspection slots scheduled today
                    </div>
                  ) : (
                    rowAssignments.map((block) => {
                      const start = Math.max(1, Math.min(11, block.start_hour));
                      const span = Math.max(1, Math.min(11 - start + 1, block.span_hours));
                      const blockPct =
                        block.plan_qty > 0
                          ? Math.round((block.actual_qty / block.plan_qty) * 100)
                          : 0;

                      return (
                        <div
                          key={block.id}
                          style={{
                            gridColumnStart: start,
                            gridColumnEnd: `span ${span}`,
                          }}
                          className="z-10 relative bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 rounded-xl p-2.5 shadow-md flex flex-col justify-between overflow-hidden"
                        >
                          <div>
                            <span className="text-[8px] font-black uppercase text-white bg-emerald-600 px-1.5 py-0.5 rounded truncate block w-fit mb-1">
                              {block.client_name}
                            </span>
                            <h6 className="font-black text-xs text-white truncate">
                              {block.style_name}
                            </h6>
                          </div>

                          <div className="mt-2 pt-1 border-t border-emerald-500/20 flex items-center justify-between text-[11px] font-mono">
                            <span className="text-emerald-400 font-black">
                              {block.actual_qty} Pcs
                            </span>
                            <span className="text-slate-400 text-[10px]">{blockPct}%</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
