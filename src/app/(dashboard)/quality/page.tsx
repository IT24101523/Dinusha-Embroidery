'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Tv,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Layers,
  Sparkles,
  Share2,
  X,
  Target,
  Truck,
  Users,
  RefreshCw,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { fetchDbStyles, fetchDbClients, DbStyle, DbClient } from '@/actions/master-data';
import {
  fetchQualityAssignments,
  createQualityAssignment,
  updateQualityActualQty,
  deleteQualityAssignment,
  DbQualityAssignment,
} from '@/actions/quality';

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

export default function QualityPage() {
  const [styles, setStyles] = useState<DbStyle[]>([]);
  const [clients, setClients] = useState<DbClient[]>([]);
  const [assignments, setAssignments] = useState<DbQualityAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [formDate, setFormDate] = useState(todayStr);
  const [formChecker, setFormChecker] = useState(DEFAULT_STATIONS[0]);
  const [formClientId, setFormClientId] = useState('');
  const [formStyleId, setFormStyleId] = useState('');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('18:00');
  const [formQty, setFormQty] = useState(300);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [editStyleName, setEditStyleName] = useState('');
  const [editPlanQty, setEditPlanQty] = useState(0);
  const [editActualQty, setEditActualQty] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [styleData, clientData, qcData] = await Promise.all([
        fetchDbStyles(),
        fetchDbClients(),
        fetchQualityAssignments(formDate),
      ]);
      setStyles(styleData);
      setClients(clientData);
      setAssignments(qcData);

      if (clientData.length > 0 && !formClientId) {
        setFormClientId(clientData[0].id);
      }
    } catch (err) {
      console.error('Failed to load quality database data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [formDate, formClientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter styles by selected client
  const availableStyles = formClientId
    ? styles.filter((s) => s.client_id === formClientId)
    : styles;

  useEffect(() => {
    if (availableStyles.length > 0 && !availableStyles.some((s) => s.id === formStyleId)) {
      setFormStyleId(availableStyles[0].id);
    }
  }, [availableStyles, formStyleId]);

  // Handle schedule push
  const handlePushPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStyleId) {
      alert('Please select an embroidery style from Master Data.');
      return;
    }

    const startIdx = SHIFT_HOURS.indexOf(formStartTime);
    const endIdx = SHIFT_HOURS.indexOf(formEndTime);

    if (startIdx > endIdx) {
      alert('Start time cannot be later than End time.');
      return;
    }

    const startHour = startIdx + 1;
    const spanHours = endIdx - startIdx + 1;
    const selectedStyle = styles.find((s) => s.id === formStyleId);
    const selectedClient = clients.find((c) => c.id === formClientId);

    setIsSubmitting(true);
    try {
      await createQualityAssignment({
        checker_name: formChecker,
        client_name: selectedClient?.name || 'Standard Client',
        style_name: selectedStyle?.style_name || 'Embroidery Task',
        assignment_date: formDate,
        start_hour: startHour,
        span_hours: spanHours,
        plan_qty: formQty,
        actual_qty: 0,
      });
      await loadData();
    } catch (err: any) {
      alert('Failed to schedule inspection block: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (assignment: DbQualityAssignment) => {
    setActiveAssignmentId(assignment.id);
    setEditStyleName(assignment.style_name);
    setEditPlanQty(assignment.plan_qty);
    setEditActualQty(assignment.actual_qty);
    setModalOpen(true);
  };

  const handleUpdateActual = async () => {
    if (!activeAssignmentId) return;
    setIsUpdating(true);
    try {
      await updateQualityActualQty(activeAssignmentId, editActualQty);
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Failed to update quality record: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!activeAssignmentId) return;
    if (!confirm('Are you sure you want to delete this inspection schedule?')) return;
    setIsUpdating(true);
    try {
      await deleteQualityAssignment(activeAssignmentId);
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Failed to delete assignment: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Group assignments by checker name
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
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-persian-50 text-persian-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm uppercase text-slate-800 flex items-center gap-2">
              <span>Quality Inspection Matrix (Supabase)</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                {assignments.length} Blocks Scheduled
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Shift hours (08:00 - 19:00) • Final garment embroidery audit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <Link
            href="/quality/live"
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all"
          >
            <Tv className="w-4 h-4 text-emerald-400" />
            <span>Launch QC Wallboard</span>
          </Link>
        </div>
      </div>

      {/* Style Breakdown Cards */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-2">
            <Layers className="w-4 h-4 text-persian-600" />
            <span>Style Inspection Status in Database</span>
          </h4>
          <span className="text-[11px] text-slate-400 font-semibold">
            {styles.length} Registered Styles
          </span>
        </div>

        {styles.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 text-center">
            <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No styles in database</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Add embroidery styles in Master Data to track inspection deliverables.
            </p>
            <Link
              href="/master-data"
              className="inline-flex items-center gap-1 mt-3 text-xs font-black text-persian-700 hover:underline"
            >
              <span>Add Styles in Master Data</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {styles.map((sm) => {
              const matched = assignments.filter((a) => a.style_name === sm.style_name);
              const plannedQty = matched.reduce((acc, a) => acc + a.plan_qty, 0);
              const doneQty = matched.reduce((acc, a) => acc + a.actual_qty, 0);
              const balance = Math.max(0, plannedQty - doneQty);

              return (
                <div
                  key={sm.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 flex flex-col justify-between"
                >
                  <div className="border-b border-slate-100 pb-2">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block truncate">
                      {sm.client?.name || 'Client'}
                    </span>
                    <h5 className="font-black text-slate-800 text-xs truncate mt-0.5" title={sm.style_name}>
                      {sm.style_name}
                    </h5>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">
                        Target/Hr
                      </span>
                      <span className="font-black text-slate-800 text-sm">
                        {sm.target_per_hour || 0}
                      </span>
                    </div>
                    <div className="bg-amber-50/70 p-2 rounded-xl border border-amber-100">
                      <span className="text-[9px] font-bold text-amber-800 uppercase block">
                        Target Pcs
                      </span>
                      <span className="font-black text-amber-600 text-sm">
                        {plannedQty.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                      <span className="text-[9px] font-bold text-emerald-800 uppercase block">
                        Passed
                      </span>
                      <span className="font-black text-emerald-600 text-sm">
                        {doneQty.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-indigo-50/70 p-2 rounded-xl border border-indigo-100">
                      <span className="text-[9px] font-bold text-indigo-800 uppercase block">
                        Balance
                      </span>
                      <span className="font-black text-indigo-600 text-sm">
                        {balance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* QC Plan Form Scheduler */}
      <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Plus className="w-4 h-4 text-persian-600" />
            <span>Schedule Checking Session</span>
          </h4>
          <span className="text-[11px] text-slate-400">
            Saves directly to Supabase quality_assignments table
          </span>
        </div>

        <form onSubmit={handlePushPlan} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Date *</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold outline-none focus:border-persian-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                Checker Station *
              </label>
              <select
                value={formChecker}
                onChange={(e) => setFormChecker(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold outline-none"
              >
                {DEFAULT_STATIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Client *</label>
              <select
                value={formClientId}
                onChange={(e) => setFormClientId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold outline-none"
              >
                <option value="">All Clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                Embroidery Style *
              </label>
              <select
                value={formStyleId}
                onChange={(e) => setFormStyleId(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold outline-none"
              >
                {availableStyles.length === 0 ? (
                  <option value="">No styles available</option>
                ) : (
                  availableStyles.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.style_name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Start Hour *</label>
              <select
                value={formStartTime}
                onChange={(e) => setFormStartTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold outline-none"
              >
                {SHIFT_HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">End Hour *</label>
              <select
                value={formEndTime}
                onChange={(e) => setFormEndTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold outline-none"
              >
                {SHIFT_HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                Inspection Target (Pcs) *
              </label>
              <input
                type="number"
                value={formQty}
                onChange={(e) => setFormQty(parseInt(e.target.value) || 0)}
                required
                min={1}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-black text-persian-800 outline-none"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting || availableStyles.length === 0}
                className="w-full bg-persian-800 hover:bg-persian-700 disabled:bg-slate-300 text-white font-bold text-xs p-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving...' : 'Push to QC Table'}</span>
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Main Checker Timeline Matrix */}
      <section className="bg-white border border-slate-200 rounded-3xl shadow-soft overflow-hidden flex flex-col">
        {/* Timeline Hours Header */}
        <div className="flex border-b border-slate-200 bg-slate-50 font-semibold text-[11px] text-slate-600 sticky top-0 z-20">
          <div className="w-72 sm:w-80 p-3 bg-slate-100 border-r border-slate-300 font-bold text-persian-800 uppercase tracking-wider flex items-center justify-between shrink-0">
            <span>Inspection Table & Auditor</span>
            <span className="text-[9px] bg-white px-2 py-0.5 rounded border border-slate-300 font-mono text-slate-500">
              {DEFAULT_STATIONS.length} Stations
            </span>
          </div>

          <div className="flex-1 grid grid-cols-11 text-center divide-x divide-slate-200">
            {SHIFT_HOURS.map((h, idx) => (
              <div key={h} className="py-2 px-1 flex flex-col items-center justify-center">
                <span className="font-black text-slate-800 text-[11px]">{h}</span>
                <span className="text-[9px] text-slate-400 font-medium">H{idx + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Checker Rows */}
        <div className="divide-y divide-slate-200 max-h-[650px] overflow-y-auto">
          {DEFAULT_STATIONS.map((stationName) => {
            const rowAssignments = assignmentsByChecker[stationName] || [];
            const planTotal = rowAssignments.reduce((acc, a) => acc + a.plan_qty, 0);
            const actualTotal = rowAssignments.reduce((acc, a) => acc + a.actual_qty, 0);
            const compPct = planTotal > 0 ? Math.round((actualTotal / planTotal) * 100) : 0;

            return (
              <div key={stationName} className="flex items-stretch hover:bg-slate-50/70 transition-colors">
                <div className="w-72 sm:w-80 p-3 bg-white border-r border-slate-300 flex flex-col justify-between shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-slate-900 text-xs">{stationName}</span>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ACTIVE
                    </span>
                  </div>

                  <div className="space-y-1 pt-1.5 border-t border-slate-100">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-slate-500">Inspected Output:</span>
                      <span className="font-black text-persian-800">
                        {actualTotal} / {planTotal} ({compPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-persian-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, compPct)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-11 p-2 gap-1.5 relative bg-slate-50/40">
                  <div className="absolute inset-0 grid grid-cols-11 divide-x divide-slate-100 pointer-events-none" />

                  {rowAssignments.length === 0 ? (
                    <div className="col-span-11 flex items-center justify-center text-[11px] text-slate-400 font-medium italic">
                      No inspection slots scheduled for this station today
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
                          onClick={() => openEditModal(block)}
                          className="z-10 group cursor-pointer relative bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl p-2 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0">
                              <span className="text-[8px] font-black uppercase text-white bg-emerald-700 px-1 py-0.2 rounded truncate block w-fit mb-0.5">
                                {block.client_name}
                              </span>
                              <h6 className="font-black text-[11px] truncate leading-tight">
                                {block.style_name}
                              </h6>
                            </div>
                            <span className="text-[9px] font-extrabold text-emerald-900 bg-white/80 px-1.5 py-0.5 rounded border border-emerald-200">
                              {blockPct}%
                            </span>
                          </div>

                          <div className="mt-2 pt-1 border-t border-emerald-200/60 flex items-center justify-between text-[10px]">
                            <span className="font-bold">
                              Passed: <span className="font-black text-emerald-900">{block.actual_qty}</span>
                            </span>
                            <span className="text-slate-500 font-semibold">
                              Plan: {block.plan_qty}
                            </span>
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

      {/* Edit Actual Quantity Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-black text-sm uppercase text-slate-800">
                  Update QC Inspected Pieces
                </h4>
                <p className="text-xs text-slate-500">{editStyleName}</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Plan Inspection Target
                </label>
                <input
                  type="number"
                  value={editPlanQty}
                  disabled
                  className="w-full bg-slate-100 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Passed / Inspected Quantity *
                </label>
                <input
                  type="number"
                  value={editActualQty}
                  onChange={(e) => setEditActualQty(parseInt(e.target.value) || 0)}
                  min={0}
                  className="w-full bg-white border-2 border-persian-500 rounded-xl p-2.5 text-sm font-black text-slate-900 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleDeleteAssignment}
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-bold text-xs transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Block</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateActual}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-persian-800 hover:bg-persian-700 text-white rounded-xl font-bold text-xs shadow-md"
                >
                  {isUpdating ? 'Saving...' : 'Save QC Count'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
