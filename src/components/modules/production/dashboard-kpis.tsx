"use client";

import React from "react";
import { Tag } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface StyleBreakdownItem {
  client: string;
  style: string;
  plan: number;
  actual: number;
}

interface DashboardKpisProps {
  summary: {
    totalPlan: number;
    totalActual: number;
    percentage: number;
    activeMachines: number;
    totalMachines: number;
  };
  styleBreakdown: StyleBreakdownItem[];
}

const CLIENT_TAGS: Record<string, string> = {
  "Nike Apparel": "bg-indigo-700",
  "Motif Brand": "bg-amber-600",
  "Tesco Sri Lanka": "bg-emerald-700",
  "Adidas Sportswear": "bg-purple-700",
};

export function DashboardKpis({ summary, styleBreakdown }: DashboardKpisProps) {
  return (
    <section className="p-4 max-w-[1920px] w-full mx-auto grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Main Overall Shift Target Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              DAILY TARGET VS ACTUAL OUTPUT
            </span>
            <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
              {summary.percentage}% Met
            </span>
          </div>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-3xl font-black text-persian-800">
              {formatNumber(summary.totalActual)}
            </span>
            <span className="text-sm font-semibold text-slate-500">
              / {formatNumber(summary.totalPlan)} Pcs
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(summary.percentage, 100)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500 mt-2">
            <span>{summary.activeMachines} of {summary.totalMachines} Active Machines Running</span>
            <span>Day Shift (08:00 - 19:00)</span>
          </div>
        </div>
      </div>

      {/* Style-Wise Total Output Breakdown Cards (3 Columns) */}
      <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-soft">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
          <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-persian-500" />
            Style-Wise Total Output Breakdown (Active Orders)
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">Aggregated across all 13 machines</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {styleBreakdown.map((item) => {
            const pct = item.plan > 0 ? Math.round((item.actual / item.plan) * 100) : 0;
            const tagBg = CLIENT_TAGS[item.client] || "bg-slate-600";

            return (
              <div
                key={`${item.client}-${item.style}`}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`${tagBg} text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider`}>
                      {item.client}
                    </span>
                    <span
                      className={`text-[11px] font-bold ${
                        pct >= 100 ? "text-emerald-600" : pct >= 85 ? "text-amber-600" : "text-slate-600"
                      }`}
                    >
                      {pct}% Met
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-xs truncate mt-1">
                    {item.style}
                  </h4>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between items-baseline text-xs font-bold text-slate-700">
                    <span className="text-persian-800 text-sm font-black">
                      {formatNumber(item.actual)}
                    </span>
                    <span className="text-slate-400 font-normal">
                      / {formatNumber(item.plan)} Pcs Total
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div
                      className={`${
                        pct >= 100 ? "bg-emerald-500" : pct >= 85 ? "bg-amber-500" : "bg-persian-500"
                      } h-full rounded-full transition-all duration-300`}
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
  );
}
