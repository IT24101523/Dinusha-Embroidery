"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardKpis } from "./dashboard-kpis";
import { DashboardMatrix, MachineRowData } from "./dashboard-matrix";
import { RefreshCw } from "lucide-react";

interface DashboardData {
  date: string;
  shift: string;
  summary: {
    totalPlan: number;
    totalActual: number;
    percentage: number;
    activeMachines: number;
    totalMachines: number;
  };
  styleBreakdown: Array<{
    client: string;
    style: string;
    plan: number;
    actual: number;
  }>;
  machines: MachineRowData[];
}

export function FloorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async (quiet = false) => {
    if (!quiet) setIsRefreshing(true);
    try {
      const res = await fetch("/api/production/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 15 seconds for live floor monitoring
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  if (isLoading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-persian-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Loading Live Floor Production Matrix...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-4">
      {/* Top action row */}
      <div className="max-w-[1920px] w-full mx-auto px-4 pt-3 flex justify-end">
        <button
          onClick={() => fetchDashboardData()}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-persian-600 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>{isRefreshing ? "Syncing..." : "Sync Live Floor"}</span>
        </button>
      </div>

      <DashboardKpis summary={data.summary} styleBreakdown={data.styleBreakdown} />

      <main className="flex-1 max-w-[1920px] w-full mx-auto px-4 pb-6 flex flex-col">
        <DashboardMatrix machines={data.machines} />
      </main>
    </div>
  );
}
