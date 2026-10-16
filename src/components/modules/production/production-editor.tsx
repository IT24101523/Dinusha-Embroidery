"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PlusCircle, Share2, Layers, Cpu, User, Users, MousePointerClick } from "lucide-react";
import { dialog } from "@/components/ui/dialog";
import { formatNumber } from "@/lib/utils";
import { EditBlockModal, ActiveBlockData } from "./edit-block-modal";

const SHIFT_HOURS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
];

const CLIENT_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  "Nike Apparel": { bg: "bg-indigo-50/90", text: "text-indigo-950", border: "border-indigo-300" },
  "Motif Brand": { bg: "bg-amber-50/90", text: "text-amber-950", border: "border-amber-300" },
  "Tesco Sri Lanka": { bg: "bg-emerald-50/90", text: "text-emerald-950", border: "border-emerald-300" },
  "Adidas Sportswear": { bg: "bg-purple-50/90", text: "text-purple-950", border: "border-purple-300" },
};

const OPERATORS = [
  "Nimal", "Kamal", "Sunil", "Bandara", "Ruwan", "Nuwan", "Chathura", "Dhammika", "Mahesh", "Asanka", "Kasun", "Tharindu", "Saman"
];

const HELPERS = [
  "None", "Priyanta", "Lalith", "Dinesh", "Sanjeeva", "Anura", "Indika", "Janaka", "Gayan", "Roshan", "Upul", "Priyantha", "Sujith", "Buddhika"
];

interface MachineOption {
  id: string;
  name: string;
  status: string;
  current_operator: string;
  current_helper: string;
}

interface StyleOption {
  id: string;
  code: string;
  name: string;
  company: string;
  orderQty: number;
}

interface CompanyOption {
  id: string;
  name: string;
}

interface ProductionPlanRecord {
  id: string;
  plan_date: string;
  shift: string;
  machine_id: string;
  machine_name: string;
  company_name: string;
  style_name: string;
  size: string;
  start_time: string;
  end_time: string;
  start_col: number;
  span: number;
  plan_qty: number;
  actual_qty: number;
  operator: string;
  helper: string;
  status: string;
}

export function ProductionEditor() {
  const todayStr = new Date().toISOString().split("T")[0];

  const [selectedDate] = useState(todayStr);
  const [machines, setMachines] = useState<MachineOption[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [styles, setStyles] = useState<StyleOption[]>([]);
  const [plans, setPlans] = useState<ProductionPlanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State (2 Lines)
  const [formDate, setFormDate] = useState(todayStr);
  const [formShift, setFormShift] = useState("day");
  const [formMachine, setFormMachine] = useState("Machine 01");
  const [formCompany, setFormCompany] = useState("Nike Apparel");
  const [formStyle, setFormStyle] = useState("");
  const [formSize, setFormSize] = useState("L");
  const [formStartTime, setFormStartTime] = useState("08:00");
  const [formEndTime, setFormEndTime] = useState("18:00");
  const [formQty, setFormQty] = useState(300);
  const [formOperator, setFormOperator] = useState("Nimal");
  const [formHelper, setFormHelper] = useState("Priyanta");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active modal state
  const [activeBlock, setActiveBlock] = useState<ActiveBlockData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [macRes, compRes, styleRes, planRes] = await Promise.all([
        fetch("/api/master-data/machines"),
        fetch("/api/master-data/companies"),
        fetch("/api/master-data/styles"),
        fetch(`/api/production/plans?date=${selectedDate}`),
      ]);

      if (macRes.ok && compRes.ok && styleRes.ok && planRes.ok) {
        const macData = await macRes.json();
        const compData = await compRes.json();
        const styleData = await styleRes.json();
        const planData = await planRes.json();

        setMachines(macData.machines || []);
        setCompanies(compData.companies || []);
        setStyles(styleData.styles || []);
        setPlans(planData.plans || []);

        if (styleData.styles && styleData.styles.length > 0 && !formStyle) {
          setFormStyle(styleData.styles[0].name);
        }
      }
    } catch (err) {
      console.error("Failed to load editor data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, formStyle]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate metrics per style
  const styleMetrics = styles.map((sm) => {
    let planned = 0;
    let done = 0;

    plans.forEach((p) => {
      if (p.style_name.includes(sm.name)) {
        planned += p.plan_qty;
        done += p.actual_qty;
      }
    });

    const remaining = Math.max(sm.orderQty - done, 0);

    return {
      name: sm.name,
      company: sm.company,
      orderQty: sm.orderQty,
      plannedQty: planned,
      doneQty: done,
      remaining,
    };
  });

  const handlePushPlan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formDate < todayStr) {
      dialog.toast("Error: You can only schedule and plan for today or future dates!", "warning", "Date Restriction");
      return;
    }

    const startIdx = SHIFT_HOURS.indexOf(formStartTime);
    const endIdx = SHIFT_HOURS.indexOf(formEndTime);

    if (startIdx > endIdx) {
      dialog.toast("Error: Start time cannot be later than end time!", "warning", "Time Error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/production/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planDate: formDate,
          shift: formShift,
          machineName: formMachine,
          companyName: formCompany,
          styleName: formStyle,
          size: formSize,
          startTime: formStartTime,
          endTime: formEndTime,
          planQty: formQty,
          operator: formOperator,
          helper: formHelper,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        dialog.toast(data.error || "Failed to push plan to dashboard", "danger", "Schedule Error");
        return;
      }

      dialog.toast("Plan block successfully added to production matrix", "success", "Pushed");
      loadData();
    } catch {
      dialog.toast("Error communicating with server", "danger", "Network Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (plan: ProductionPlanRecord) => {
    setActiveBlock({
      id: plan.id,
      machineId: plan.machine_id,
      machineName: plan.machine_name,
      company: plan.company_name,
      style: plan.style_name,
      plan: plan.plan_qty,
      actual: plan.actual_qty,
    });
    setIsModalOpen(true);
  };

  const handleUpdateBlock = async (id: string, style: string, plan: number, actual: number) => {
    const res = await fetch(`/api/production/plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ styleName: style, planQty: plan, actualQty: actual }),
    });
    if (!res.ok) throw new Error("Update failed");
    loadData();
  };

  const handleDeleteBlock = async (id: string) => {
    const res = await fetch(`/api/production/plans/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Delete failed");
    loadData();
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-persian-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Production Planner...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-4">
      {/* 1. Style-Wise Order & Production Breakdown Cards */}
      <section className="p-4 max-w-[1920px] w-full mx-auto">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-persian-500" />
            Style-Wise Order & Production Breakdown Cards
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">Real-time sync with machine schedules</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {styleMetrics.map((sm) => (
            <div
              key={sm.name}
              className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-soft flex flex-col justify-between space-y-2.5"
            >
              <div className="border-b border-slate-100 pb-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{sm.company}</span>
                <h4 className="font-extrabold text-slate-800 text-xs truncate" title={sm.name}>
                  {sm.name}
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-blue-50/60 p-2 rounded-lg border border-blue-100">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Order Qty</span>
                  <span className="font-black text-persian-800 text-sm">{formatNumber(sm.orderQty)}</span>
                </div>
                <div className="bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                  <span className="text-[9px] font-bold text-amber-700/85 block uppercase">Planned Qty</span>
                  <span className="font-black text-amber-600 text-sm">{formatNumber(sm.plannedQty)}</span>
                </div>
                <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                  <span className="text-[9px] font-bold text-emerald-700/85 block uppercase">Done Qty</span>
                  <span className="font-black text-emerald-600 text-sm">{formatNumber(sm.doneQty)}</span>
                </div>
                <div className="bg-indigo-50/60 p-2 rounded-lg border border-indigo-100">
                  <span className="text-[9px] font-bold text-indigo-700/85 block uppercase">Remaining</span>
                  <span className="font-black text-indigo-600 text-sm">{formatNumber(sm.remaining)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Production Plan Form Editor Panel (Split into 2 Horizontal Lines) */}
      <section className="px-4 max-w-[1920px] w-full mx-auto mb-2">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-soft">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-persian-500" />
              Schedule New Production Plan (Future Days Only)
            </h3>
            <span className="text-[11px] text-rose-500 font-medium">* Restrictive to Today or Future Dates</span>
          </div>

          <form onSubmit={handlePushPlan} className="space-y-3">
            {/* LINE 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none focus:border-persian-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Shift *</label>
                <select
                  value={formShift}
                  onChange={(e) => setFormShift(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none"
                >
                  <option value="day">Day Shift (08:00 - 19:00)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Machine *</label>
                <select
                  value={formMachine}
                  onChange={(e) => setFormMachine(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Company *</label>
                <select
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Style Name *</label>
                <select
                  value={formStyle}
                  onChange={(e) => setFormStyle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none"
                >
                  {styles.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({formatNumber(s.orderQty)} Pcs)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* LINE 2 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3 items-end pt-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Size *</label>
                <select
                  value={formSize}
                  onChange={(e) => setFormSize(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none"
                >
                  <option value="S">Small (S)</option>
                  <option value="M">Medium (M)</option>
                  <option value="L">Large (L)</option>
                  <option value="XL">X-Large (XL)</option>
                  <option value="XXL">XXL</option>
                  <option value="Free Size">Free Size</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Start Time *</label>
                <select
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none"
                >
                  {SHIFT_HOURS.slice(0, -1).map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">End Time *</label>
                <select
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none"
                >
                  {SHIFT_HOURS.slice(1).map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Plan Qty *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formQty}
                  onChange={(e) => setFormQty(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-persian-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Operator *</label>
                <select
                  value={formOperator}
                  onChange={(e) => setFormOperator(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none"
                >
                  {OPERATORS.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Helper</label>
                <select
                  value={formHelper}
                  onChange={(e) => setFormHelper(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none"
                >
                  {HELPERS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-persian-800 hover:bg-persian-700 text-white font-bold text-xs p-2.5 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Push into Matrix</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* 3. Gantt Matrix with Clickable Editable Blocks */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto px-4 pb-6 flex flex-col">
        <div className="bg-white border border-slate-200 rounded-xl shadow-soft flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-20 font-semibold text-[11px] text-slate-600">
            <div className="w-72 sm:w-80 p-2.5 flex items-center justify-between bg-slate-100 border-r border-slate-300 font-bold text-persian-800 uppercase tracking-wider shrink-0">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-persian-500" />
                Machine & Crew
              </span>
              <span className="text-[9px] bg-white px-1.5 py-0.5 rounded border border-slate-300 font-normal text-slate-500">
                13 Units
              </span>
            </div>
            <div className="flex-1 grid grid-cols-11 text-center divide-x divide-slate-200">
              {SHIFT_HOURS.map((h, idx) => (
                <div key={h} className="py-2 px-1 flex flex-col items-center justify-center bg-slate-50">
                  <span className="font-bold text-slate-800 text-[11px]">{h}</span>
                  <span className="text-[9px] text-slate-400">H{idx + 1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Machine rows */}
          <div className="divide-y divide-slate-200 flex-1 overflow-y-auto max-h-[calc(100vh-380px)]">
            {machines.map((mac) => {
              const macPlans = plans.filter((p) => p.machine_id === mac.id || p.machine_name === mac.name);
              let macPlanTotal = 0;
              let macActualTotal = 0;
              macPlans.forEach((p) => {
                macPlanTotal += p.plan_qty;
                macActualTotal += p.actual_qty;
              });

              const compPct = macPlanTotal > 0 ? Math.round((macActualTotal / macPlanTotal) * 100) : 0;

              return (
                <div key={mac.id} className="flex items-stretch hover:bg-slate-50/70 transition-colors">
                  {/* Left Machine Crew */}
                  <div className="w-72 sm:w-80 p-2.5 bg-white border-r border-slate-300 flex flex-col justify-between shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-800 text-xs">{mac.name}</span>
                        {mac.status === "RUNNING" && (
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-300">
                            Running
                          </span>
                        )}
                        {mac.status === "SETUP" && (
                          <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-300">
                            Setup
                          </span>
                        )}
                        {mac.status === "MAINTENANCE" && (
                          <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-1.5 py-0.5 rounded border border-rose-300">
                            Idle
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] mb-1">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-medium truncate flex items-center gap-1">
                        <User className="w-2.5 h-2.5 text-persian-600" />
                        {mac.current_operator || "Nimal"}
                      </span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium truncate flex items-center gap-1">
                        <Users className="w-2.5 h-2.5 text-amber-600" />
                        {mac.current_helper || "Priyanta"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                      <span>
                        Out: <strong>{macActualTotal}</strong>/{macPlanTotal}
                      </span>
                      <span className={compPct >= 100 ? "text-emerald-600 font-bold" : "text-slate-600"}>
                        {compPct}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-0.5">
                      <div
                        className="bg-persian-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(compPct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Right Timeline Grid Tracks */}
                  <div className="flex-1 grid grid-cols-11 relative matrix-grid p-1.5 gap-1.5 items-center">
                    {macPlans.map((st) => {
                      const cStyle = CLIENT_STYLES[st.company_name] || {
                        bg: "bg-slate-100",
                        text: "text-slate-800",
                        border: "border-slate-300",
                      };

                      return (
                        <div
                          key={st.id}
                          style={{ gridColumn: `${st.start_col} / span ${st.span}` }}
                          onClick={() => handleOpenEdit(st)}
                          className={`${cStyle.bg} ${cStyle.border} border rounded-lg p-2 shadow-2xs hover:shadow-md cursor-pointer transition-all flex flex-col justify-between relative group`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`text-[9px] font-black uppercase tracking-wider ${cStyle.text}`}>
                              {st.company_name}
                            </span>
                            <span className="text-[9px] bg-white/80 px-1 rounded font-bold text-slate-600 flex items-center gap-0.5">
                              <MousePointerClick className="w-2.5 h-2.5 text-persian-600" /> Click to Edit
                            </span>
                          </div>
                          <div className="font-extrabold text-slate-800 text-[11px] truncate mb-1">
                            {st.style_name}
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                            <span>Plan: {st.plan_qty}</span>
                            <span className="bg-persian-800 text-white px-1.5 py-0.2 rounded text-[10px]">
                              Act: {st.actual_qty}
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
        </div>
      </main>

      {/* Edit Block Modal */}
      <EditBlockModal
        block={activeBlock}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpdate={handleUpdateBlock}
        onDelete={handleDeleteBlock}
      />
    </div>
  );
}
