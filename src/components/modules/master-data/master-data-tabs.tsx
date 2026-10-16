"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Shirt, Building2, Cpu, FileText, CheckCircle2 } from "lucide-react";
import { StyleCrud } from "./style-crud";
import { CompanyCrud } from "./company-crud";
import { MachineCrud } from "./machine-crud";
import { StrikeOffSheet } from "./strike-off-sheet";
import { FullStyleData } from "./view-style-modal";

interface CompanyData {
  id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
}

interface MachineData {
  id: string;
  name: string;
  machine_number: number;
  heads: number;
  speed_spm: number;
  brand: string;
  embroidery_types: string[];
  status: string;
}

export function MasterDataTabs() {
  const [activeTab, setActiveTab] = useState<"styleTab" | "companyTab" | "machineTab" | "sheetTab">("styleTab");
  const [styles, setStyles] = useState<FullStyleData[]>([]);
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [machines, setMachines] = useState<MachineData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAllData = useCallback(async () => {
    try {
      const [sRes, cRes, mRes] = await Promise.all([
        fetch("/api/master-data/styles"),
        fetch("/api/master-data/companies"),
        fetch("/api/master-data/machines"),
      ]);

      if (sRes.ok && cRes.ok && mRes.ok) {
        const sData = await sRes.json();
        const cData = await cRes.json();
        const mData = await mRes.json();

        setStyles(sData.styles || []);
        setCompanies(cData.companies || []);
        setMachines(mData.machines || []);
      }
    } catch (err) {
      console.error("Failed to load master data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const titles = {
    styleTab: "Style & Parts Master",
    companyTab: "Company / Client Master CRUD",
    machineTab: "Machine Inventory Master",
    sheetTab: "Production Strike-Offs",
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-persian-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Master Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sub-navigation Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-lg z-10 no-print shrink-0 border-r border-slate-800">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-persian-600 text-white flex items-center justify-center font-black text-sm">
            M
          </div>
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider">Master Data</h2>
            <p className="text-[10px] text-slate-400">Database Catalog</p>
          </div>
        </div>

        <nav className="p-3 space-y-1.5 flex-1">
          <button
            onClick={() => setActiveTab("styleTab")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors text-left ${
              activeTab === "styleTab"
                ? "bg-persian-600 text-white shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Shirt className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Style & Parts CRUD</span>
          </button>

          <button
            onClick={() => setActiveTab("companyTab")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors text-left ${
              activeTab === "companyTab"
                ? "bg-persian-600 text-white shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Company CRUD</span>
          </button>

          <button
            onClick={() => setActiveTab("machineTab")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors text-left ${
              activeTab === "machineTab"
                ? "bg-persian-600 text-white shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Cpu className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Machine CRUD</span>
          </button>

          <button
            onClick={() => setActiveTab("sheetTab")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors text-left ${
              activeTab === "sheetTab"
                ? "bg-persian-600 text-white shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <FileText className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Strike-Off Sheet</span>
          </button>
        </nav>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50 relative">
        <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 flex justify-between items-center shadow-xs no-print">
          <h2 className="text-lg font-black text-persian-800 uppercase tracking-tight">
            {titles[activeTab]}
          </h2>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Live Sync Enabled
            </span>
          </div>
        </header>

        <div className="p-6 max-w-[1400px] w-full mx-auto">
          {activeTab === "styleTab" && (
            <StyleCrud styles={styles} companies={companies} onRefresh={loadAllData} />
          )}
          {activeTab === "companyTab" && (
            <CompanyCrud companies={companies} onRefresh={loadAllData} />
          )}
          {activeTab === "machineTab" && (
            <MachineCrud machines={machines} onRefresh={loadAllData} />
          )}
          {activeTab === "sheetTab" && (
            <StrikeOffSheet styles={styles} onBack={() => setActiveTab("styleTab")} />
          )}
        </div>
      </main>
    </div>
  );
}
