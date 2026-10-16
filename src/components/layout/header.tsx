"use client";

import React, { useEffect, useState } from "react";
import { Calendar, Clock, Sun, Eye } from "lucide-react";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showLiveTag?: boolean;
}

export function Header({
  title = "DINUSHA EMBROIDERY",
  subtitle = "Weliweriya Factory — Floor Production Monitoring Dashboard (13 Machines)",
  showLiveTag = false,
}: HeaderProps) {
  const [currentTime, setCurrentTime] = useState<string>("08:00:00 AM");
  const [currentDate, setCurrentDate] = useState<string>("2026-10-17");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-US", { hour12: true }));
      setCurrentDate(now.toISOString().split("T")[0]);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-persian-800 text-white sticky top-0 z-30 shadow-md no-print select-none">
      <div className="max-w-[1920px] mx-auto px-4 py-2.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Branding & Factory Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-white text-persian-800 flex items-center justify-center font-black text-xl shadow-inner shrink-0">
            D
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-wide uppercase truncate">{title}</h1>
              <span className="bg-blue-500/30 text-blue-100 text-[10px] px-2 py-0.5 rounded-full border border-blue-400/30 font-medium">
                Pvt Ltd
              </span>
            </div>
            <p className="text-[11px] text-blue-200/90 font-medium truncate">{subtitle}</p>
          </div>
        </div>

        {/* Status & Shift Display */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date & Clock */}
          <div className="bg-persian-900/60 border border-persian-600/40 rounded-xl px-3 py-1.5 flex items-center gap-2.5 text-xs text-blue-100">
            <div className="flex items-center gap-1.5 font-semibold">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentDate}</span>
            </div>
            <span className="text-persian-600">|</span>
            <div className="flex items-center gap-1.5 font-mono font-bold text-amber-300">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>{currentTime}</span>
            </div>
          </div>

          {/* Shift Indicator Badge */}
          <div className="bg-persian-900/80 px-3 py-1.5 rounded-xl border border-persian-600/50 flex items-center gap-1.5 text-xs font-bold text-white">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Day Shift (08:00 - 19:00)</span>
          </div>

          {/* Status View Tag */}
          {showLiveTag && (
            <div className="bg-blue-900/50 border border-blue-500/40 text-blue-100 text-xs font-semibold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-300" />
              <span>Live Display Mode (Read-Only)</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
