'use client';

import React, { useMemo, useState } from 'react';

export interface MonthlyChartPoint {
  ym: string;
  label: string;
  received: number;
  pending: number;
  expectedRevenue: number;
  salaries: number;
  cogsOpex: number;
  netProfit: number;
}

interface PnlComboChartProps {
  data: MonthlyChartPoint[];
  activeMonth: string;
  animationKey: string;
}

type BarSeriesKey = 'received' | 'pending' | 'salaries' | 'cogsOpex';

interface SeriesMeta {
  key: BarSeriesKey;
  label: string;
  color: string;
}

const SERIES_META: SeriesMeta[] = [
  { key: 'received', label: 'Received Income', color: '#10b981' },
  { key: 'pending', label: 'Pending Receivable', color: '#3b82f6' },
  { key: 'salaries', label: 'Staff Salaries', color: '#f43f5e' },
  { key: 'cogsOpex', label: 'COGS & OPEX', color: '#f59e0b' },
];

function formatAxisLKR(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}k`;
  return `${sign}${abs.toFixed(0)}`;
}

function formatFullLKR(val: number): string {
  return `LKR ${Math.round(val).toLocaleString()}`;
}

export function PnlComboChart({ data, activeMonth, animationKey }: PnlComboChartProps) {
  const [visible, setVisible] = useState<Record<BarSeriesKey, boolean>>({
    received: true,
    pending: true,
    salaries: true,
    cogsOpex: true,
  });

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const toggleSeries = (key: BarSeriesKey) => {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const width = 920;
  const height = 350;
  const padLeft = 64;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 42;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const { maxVal, ticks, baselineY } = useMemo(() => {
    const values: number[] = [0];
    data.forEach((d) => {
      if (visible.received) values.push(d.received);
      if (visible.pending) values.push(d.pending);
      if (visible.salaries) values.push(d.salaries);
      if (visible.cogsOpex) values.push(d.cogsOpex);
    });

    const rawMax = Math.max(...values, 50000);
    const paddedMax = Math.ceil((rawMax * 1.15) / 25000) * 25000;
    const stepCount = 5;
    const tickArr: number[] = [];
    for (let i = 0; i <= stepCount; i++) {
      tickArr.push((paddedMax * i) / stepCount);
    }

    return { maxVal: paddedMax, ticks: tickArr, baselineY: padTop + plotH };
  }, [data, visible, plotH]);

  const valToY = (v: number) => {
    const span = Math.max(maxVal, 1);
    return padTop + ((span - Math.max(0, v)) / span) * plotH;
  };

  const colCount = Math.max(data.length, 1);
  const colWidth = plotW / colCount;
  const activeBars = (['received', 'pending', 'salaries', 'cogsOpex'] as const).filter(
    (k) => visible[k]
  );

  const hoveredPoint = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div className="space-y-4">
      {/* Interactive Bar Series Toggle Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {SERIES_META.map((s) => {
          const isOn = visible[s.key];
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggleSeries(s.key)}
              aria-pressed={isOn}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                isOn
                  ? 'bg-white border-slate-300 text-slate-800 shadow-xs hover:border-slate-400'
                  : 'bg-slate-100 border-slate-200 text-slate-400 opacity-65 hover:opacity-90'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0"
                style={{ backgroundColor: isOn ? s.color : '#cbd5e1' }}
              />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* SVG Animated Bar Chart */}
      <div className="relative w-full rounded-2xl bg-gradient-to-b from-slate-50/70 to-white border border-slate-200/80 p-3 sm:p-4">
        <style>{`
          @keyframes pnlBarGrow {
            0% { transform: scaleY(0); opacity: 0.25; }
            100% { transform: scaleY(1); opacity: 1; }
          }
          .pnl-bar-anim {
            transform-box: fill-box;
            transform-origin: center bottom;
            animation: pnlBarGrow 600ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          @media (prefers-reduced-motion: reduce) {
            .pnl-bar-anim {
              animation: none !important;
              opacity: 1 !important;
              transform: none !important;
            }
          }
        `}</style>

        <svg
          key={animationKey}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-[280px] sm:h-[340px] overflow-visible select-none"
          role="img"
          aria-label="Monthly Income, Receivables and Expenses Bar Chart"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id="gradReceived" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="gradSalaries" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="gradCogsOpex" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* Horizontal Y-Axis Gridlines */}
          {ticks.map((tickVal, idx) => {
            const y = valToY(tickVal);
            const isZero = idx === 0;
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke={isZero ? '#94a3b8' : '#e2e8f0'}
                  strokeWidth={isZero ? 1.2 : 1}
                  strokeDasharray={isZero ? undefined : '4 4'}
                />
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-500 text-[11px] font-semibold"
                >
                  {formatAxisLKR(tickVal)}
                </text>
              </g>
            );
          })}

          {/* Month Column Highlight */}
          {data.map((d, idx) => {
            const colX = padLeft + colWidth * idx;
            const isHovered = hoveredIdx === idx;
            const isActive = d.ym === activeMonth;
            if (!isHovered && !isActive) return null;
            return (
              <rect
                key={`bg-${d.ym}`}
                x={colX + 6}
                y={padTop - 4}
                width={Math.max(colWidth - 12, 10)}
                height={plotH + 8}
                rx={12}
                fill={isHovered ? '#e0e7ff' : '#f1f5f9'}
                fillOpacity={isHovered ? 0.55 : 0.7}
              />
            );
          })}

          {/* Grouped Animated Bars */}
          {data.map((d, idx) => {
            const colCenter = padLeft + colWidth * idx + colWidth / 2;
            const barCount = Math.max(activeBars.length, 1);
            const maxGroupW = Math.min(colWidth * 0.74, 100);
            const gap = 5;
            const barW = Math.max((maxGroupW - gap * (barCount - 1)) / barCount, 8);
            const startX = colCenter - (barW * barCount + gap * (barCount - 1)) / 2;

            const barValues: Record<BarSeriesKey, { val: number; fill: string }> = {
              received: { val: d.received, fill: 'url(#gradReceived)' },
              pending: { val: d.pending, fill: 'url(#gradPending)' },
              salaries: { val: d.salaries, fill: 'url(#gradSalaries)' },
              cogsOpex: { val: d.cogsOpex, fill: 'url(#gradCogsOpex)' },
            };

            return (
              <g key={`bars-${d.ym}`}>
                {activeBars.map((bKey, bIdx) => {
                  const val = Math.max(0, barValues[bKey].val);
                  const topY = valToY(val);
                  const barH = Math.max(baselineY - topY, val > 0 ? 3 : 0);
                  const x = startX + bIdx * (barW + gap);
                  return (
                    <rect
                      key={bKey}
                      x={x}
                      y={topY}
                      width={barW}
                      height={barH}
                      rx={Math.min(barW / 2, 6)}
                      fill={barValues[bKey].fill}
                      className="pnl-bar-anim"
                      style={{
                        animationDelay: `${idx * 60 + bIdx * 35}ms`,
                      }}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* X-Axis Labels + Interactive Hitboxes */}
          {data.map((d, idx) => {
            const colX = padLeft + colWidth * idx;
            const centerX = colX + colWidth / 2;
            const isActive = d.ym === activeMonth;
            return (
              <g key={`x-${d.ym}`}>
                <text
                  x={centerX}
                  y={height - 14}
                  textAnchor="middle"
                  className={`text-[11px] ${
                    isActive ? 'fill-indigo-800 font-extrabold' : 'fill-slate-600 font-semibold'
                  }`}
                >
                  {d.label}
                </text>
                <rect
                  x={colX}
                  y={padTop}
                  width={colWidth}
                  height={plotH + padBottom}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onClick={() => setHoveredIdx(hoveredIdx === idx ? null : idx)}
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Glassmorphism Tooltip */}
        {hoveredPoint && hoveredIdx !== null && (
          <div
            className="pointer-events-none absolute top-4 z-20 w-64 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white p-3.5 shadow-xl border border-white/10 text-xs transition-all duration-150"
            style={{
              left: hoveredIdx >= data.length / 2 ? '16px' : undefined,
              right: hoveredIdx < data.length / 2 ? '16px' : undefined,
            }}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
              <span className="font-extrabold text-sm text-white">{hoveredPoint.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  hoveredPoint.netProfit >= 0
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {hoveredPoint.expectedRevenue > 0
                  ? `${((hoveredPoint.netProfit / hoveredPoint.expectedRevenue) * 100).toFixed(1)}% Margin`
                  : '0.0% Margin'}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Received Income
                </span>
                <span className="font-bold tabular-nums text-emerald-300">
                  {formatFullLKR(hoveredPoint.received)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  Pending Receivable
                </span>
                <span className="font-bold tabular-nums text-blue-300">
                  {formatFullLKR(hoveredPoint.pending)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  Staff Salaries
                </span>
                <span className="font-bold tabular-nums text-rose-300">
                  {formatFullLKR(hoveredPoint.salaries)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  COGS &amp; OPEX
                </span>
                <span className="font-bold tabular-nums text-amber-300">
                  {formatFullLKR(hoveredPoint.cogsOpex)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-white/10">
                <span className="font-bold text-slate-200">Net Profit</span>
                <span
                  className={`font-black tabular-nums ${
                    hoveredPoint.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatFullLKR(hoveredPoint.netProfit)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
