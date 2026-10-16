"use client";

import React from "react";
import { User, Users, Cpu } from "lucide-react";

export interface TimelineBlock {
  id: string;
  client: string;
  style: string;
  size?: string;
  startCol: number;
  span: number;
  plan: number;
  actual: number;
}

export interface MachineRowData {
  id: string;
  dbId?: string;
  num: number;
  operator: string;
  helper: string;
  status: string;
  plan: number;
  actual: number;
  percentage: number;
  styles: TimelineBlock[];
}

interface DashboardMatrixProps {
  machines: MachineRowData[];
}

const SHIFT_HOURS = [
  { time: "08:00 AM", label: "08:00", hour: "Hour 1" },
  { time: "09:00 AM", label: "09:00", hour: "Hour 2" },
  { time: "10:00 AM", label: "10:00", hour: "Hour 3" },
  { time: "11:00 AM", label: "11:00", hour: "Hour 4" },
  { time: "12:00 PM", label: "12:00", hour: "Hour 5" },
  { time: "01:00 PM", label: "13:00", hour: "Hour 6" },
  { time: "02:00 PM", label: "14:00", hour: "Hour 7" },
  { time: "03:00 PM", label: "15:00", hour: "Hour 8" },
  { time: "04:00 PM", label: "16:00", hour: "Hour 9" },
  { time: "05:00 PM", label: "17:00", hour: "Hour 10" },
  { time: "06:00 PM", label: "18:00", hour: "Hour 11" },
];

const CLIENT_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  "Nike Apparel": { bg: "bg-indigo-50/90", text: "text-indigo-950", border: "border-indigo-300" },
  "Motif Brand": { bg: "bg-amber-50/90", text: "text-amber-950", border: "border-amber-300" },
  "Tesco Sri Lanka": { bg: "bg-emerald-50/90", text: "text-emerald-950", border: "border-emerald-300" },
  "Adidas Sportswear": { bg: "bg-purple-50/90", text: "text-purple-950", border: "border-purple-300" },
};

export function DashboardMatrix({ machines }: DashboardMatrixProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-soft flex-1 flex flex-col overflow-hidden">
      {/* Timeline Matrix Header */}
      <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-20 font-semibold text-xs text-slate-600">
        <div className="w-80 sm:w-96 p-3 flex items-center justify-between bg-slate-100 border-r border-slate-300 font-bold text-persian-800 uppercase tracking-wider shrink-0">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-persian-500" />
            Machine & Crew (13)
          </span>
          <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-300 font-normal text-slate-500">
            Operator + Helper
          </span>
        </div>

        <div className="flex-1 grid grid-cols-11 text-center divide-x divide-slate-200">
          {SHIFT_HOURS.map((h) => (
            <div key={h.time} className="py-2.5 px-1 flex flex-col items-center justify-center bg-slate-50/90">
              <span className="font-bold text-slate-800 text-xs">{h.time}</span>
              <span className="text-[10px] text-slate-400 font-normal">{h.hour}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Machine Rows */}
      <div className="divide-y divide-slate-200 flex-1 overflow-y-auto max-h-[calc(100vh-320px)]">
        {machines.map((mac) => {
          const compPercent = mac.plan > 0 ? Math.round((mac.actual / mac.plan) * 100) : 0;

          return (
            <div key={mac.id} className="flex items-stretch hover:bg-slate-50/80 transition-colors">
              {/* Left Machine & Crew Info */}
              <div className="w-80 sm:w-96 p-3 bg-white border-r border-slate-300 flex flex-col justify-between shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-800 text-sm tracking-tight">{mac.id}</span>
                    {mac.status === "RUNNING" && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-300">
                        Running
                      </span>
                    )}
                    {mac.status === "SETUP" && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-300">
                        Setup
                      </span>
                    )}
                    {mac.status === "MAINTENANCE" && (
                      <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-300">
                        Idle
                      </span>
                    )}
                  </div>
                </div>

                {/* Operator & Helper */}
                <div className="flex items-center gap-2 text-xs mb-2">
                  <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-medium">
                    <User className="w-3 h-3 text-persian-600" />
                    <span>{mac.operator}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-medium">
                    <Users className="w-3 h-3 text-amber-600" />
                    <span>{mac.helper}</span>
                  </div>
                </div>

                {/* Output & Progress Bar */}
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span>
                    Output: <strong className="text-slate-800">{mac.actual}</strong> / {mac.plan} Pcs
                  </span>
                  <span
                    className={
                      compPercent >= 100
                        ? "text-emerald-600 font-bold"
                        : compPercent >= 85
                        ? "text-amber-600 font-bold"
                        : "text-rose-500 font-bold"
                    }
                  >
                    {compPercent}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1 border border-slate-200">
                  <div
                    className={`${
                      compPercent >= 100 ? "bg-emerald-500" : compPercent >= 85 ? "bg-amber-500" : "bg-rose-500"
                    } h-full rounded-full transition-all duration-300`}
                    style={{ width: `${Math.min(compPercent, 100)}%` }}
                  />
                </div>
              </div>

              {/* Right Side Timeline Grid Track (11 cols) */}
              <div className="flex-1 grid grid-cols-11 relative matrix-grid p-1.5 gap-2 items-center">
                {mac.styles.map((st) => {
                  const cStyle = CLIENT_STYLES[st.client] || {
                    bg: "bg-slate-100",
                    text: "text-slate-800",
                    border: "border-slate-300",
                  };
                  const pct = st.plan > 0 ? Math.round((st.actual / st.plan) * 100) : 0;
                  const glowClass =
                    pct >= 100 ? "glow-target-met" : pct >= 85 ? "glow-target-near" : "glow-target-behind";

                  return (
                    <div
                      key={st.id}
                      style={{ gridColumn: `${st.startCol} / span ${st.span}` }}
                      className={`${cStyle.bg} ${cStyle.border} ${glowClass} border rounded-xl p-3 shadow-sm flex flex-col justify-between relative`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${cStyle.text}`}>
                          {st.client}
                        </span>
                      </div>
                      <div className="font-extrabold text-slate-800 text-xs tracking-tight mb-2 truncate">
                        {st.style}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] font-bold text-slate-600">Plan: {st.plan}</span>
                        <div className="bg-persian-800 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-lg shadow-sm">
                          Act: {st.actual}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
