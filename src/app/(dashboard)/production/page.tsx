'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Factory,
  Tv,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  TrendingUp,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Share2,
  RefreshCw,
  Cpu,
  Users,
  ChevronLeft,
  ChevronRight as ChevronNext,
  Printer,
  Gauge,
  Calculator,
} from 'lucide-react';
import {
  fetchDbMachines,
  fetchDbClients,
  fetchDbStyles,
  updateDbMachine,
  DbMachine,
  DbClient,
  DbStyle,
} from '@/actions/master-data';
import {
  fetchProductionSchedule,
  createProductionAssignment,
  updateProductionActualQty,
  deleteProductionAssignment,
  ProductionScheduleItem,
} from '@/actions/production';
import { fetchEmployees, DbEmployee } from '@/actions/employees';

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

export default function ProductionPage() {
  const [machines, setMachines] = useState<DbMachine[]>([]);
  const [clients, setClients] = useState<DbClient[]>([]);
  const [styles, setStyles] = useState<DbStyle[]>([]);
  const [employees, setEmployees] = useState<DbEmployee[]>([]);
  const [assignments, setAssignments] = useState<ProductionScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Date State (Defaults to today)
  const todayStr = new Date().toISOString().split('T')[0];
  const [formDate, setFormDate] = useState(todayStr);

  // Form State
  const [formMachineId, setFormMachineId] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formStyleId, setFormStyleId] = useState('');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('18:00');
  const [formQty, setFormQty] = useState(300);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State for updating actual qty
  const [modalOpen, setModalOpen] = useState(false);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [editStyleName, setEditStyleName] = useState('');
  const [editPlanQty, setEditPlanQty] = useState(0);
  const [editActualQty, setEditActualQty] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal State for Machine Crew Assignment
  const [crewModalOpen, setCrewModalOpen] = useState(false);
  const [activeMachine, setActiveMachine] = useState<DbMachine | null>(null);
  const [crewOperator, setCrewOperator] = useState('');
  const [crewHelper, setCrewHelper] = useState('');
  const [crewStatus, setCrewStatus] = useState<'RUNNING' | 'SETUP' | 'MAINTENANCE' | 'IDLE'>('RUNNING');
  const [isSavingCrew, setIsSavingCrew] = useState(false);

  // Load Database Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [macData, clientData, styleData, scheduleData, empData] = await Promise.all([
        fetchDbMachines(),
        fetchDbClients(),
        fetchDbStyles(),
        fetchProductionSchedule(formDate),
        fetchEmployees(),
      ]);
      setMachines(macData);
      setClients(clientData);
      setStyles(styleData);
      setAssignments(scheduleData);
      setEmployees(empData);

      if (macData.length > 0 && !formMachineId) {
        setFormMachineId(macData[0].id);
      }
      if (clientData.length > 0 && !formClientId) {
        setFormClientId(clientData[0].id);
      }
    } catch (err) {
      console.error('Failed to load production data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [formDate, formMachineId, formClientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Date Navigation Helpers
  const shiftDate = (offsetDays: number) => {
    const d = new Date(formDate);
    d.setDate(d.getDate() + offsetDays);
    setFormDate(d.toISOString().split('T')[0]);
  };

  const setDateToToday = () => {
    setFormDate(todayStr);
  };

  // Filter styles by selected client
  const availableStyles = formClientId
    ? styles.filter((s) => s.client_id === formClientId)
    : styles;

  useEffect(() => {
    if (availableStyles.length > 0 && !availableStyles.some((s) => s.id === formStyleId)) {
      setFormStyleId(availableStyles[0].id);
    }
  }, [availableStyles, formStyleId]);

  // Selected Style Info
  const selectedStyle = styles.find((s) => s.id === formStyleId);

  // Auto-calculate suggested quantity
  const calculateTargetQty = () => {
    const startIdx = SHIFT_HOURS.indexOf(formStartTime);
    const endIdx = SHIFT_HOURS.indexOf(formEndTime);
    const span = Math.max(1, endIdx - startIdx + 1);
    const rate = selectedStyle?.target_per_hour || 25;
    setFormQty(rate * span);
  };

  // Schedule Push Handler
  const handlePushPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMachineId || !formStyleId) {
      alert('Please select both a machine and a style.');
      return;
    }

    const startIdx = SHIFT_HOURS.indexOf(formStartTime);
    const endIdx = SHIFT_HOURS.indexOf(formEndTime);

    if (startIdx > endIdx) {
      alert('Start time cannot be later than End time.');
      return;
    }

    const startHour = startIdx + 1; // 1 to 11
    const spanHours = endIdx - startIdx + 1;

    setIsSubmitting(true);
    try {
      await createProductionAssignment({
        machine_id: formMachineId,
        style_id: formStyleId,
        assignment_date: formDate,
        start_hour: startHour,
        span_hours: spanHours,
        plan_qty: formQty,
        actual_qty: 0,
      });
      await loadData();
    } catch (err: any) {
      alert('Failed to schedule assignment: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Crew Modal Handler
  const openCrewModal = (mac: DbMachine) => {
    setActiveMachine(mac);
    setCrewOperator(mac.operator_name || '');
    setCrewHelper(mac.helper_name || '');
    setCrewStatus(mac.status || 'RUNNING');
    setCrewModalOpen(true);
  };

  const handleSaveCrew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMachine) return;
    setIsSavingCrew(true);
    try {
      await updateDbMachine(activeMachine.id, {
        operator_name: crewOperator || null,
        helper_name: crewHelper || null,
        status: crewStatus,
      });
      setCrewModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Failed to update machine crew: ' + err.message);
    } finally {
      setIsSavingCrew(false);
    }
  };

  // Modal Handlers
  const openEditModal = (assignment: ProductionScheduleItem) => {
    setActiveAssignmentId(assignment.id);
    setEditStyleName(assignment.style?.style_name || 'Embroidery Task');
    setEditPlanQty(assignment.plan_qty);
    setEditActualQty(assignment.actual_qty);
    setModalOpen(true);
  };

  const handleUpdateActual = async () => {
    if (!activeAssignmentId) return;
    setIsUpdating(true);
    try {
      await updateProductionActualQty(activeAssignmentId, editActualQty);
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Update failed: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!activeAssignmentId) return;
    if (!confirm('Are you sure you want to remove this production assignment?')) return;
    setIsUpdating(true);
    try {
      await deleteProductionAssignment(activeAssignmentId);
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Group assignments by machine
  const assignmentsByMachine: Record<string, ProductionScheduleItem[]> = {};
  assignments.forEach((item) => {
    if (!assignmentsByMachine[item.machine_id]) {
      assignmentsByMachine[item.machine_id] = [];
    }
    assignmentsByMachine[item.machine_id].push(item);
  });

  // Calculate day summary metrics
  const totalPlannedPcs = assignments.reduce((acc, a) => acc + a.plan_qty, 0);
  const totalActualPcs = assignments.reduce((acc, a) => acc + a.actual_qty, 0);
  const overallEfficiency =
    totalPlannedPcs > 0 ? Math.round((totalActualPcs / totalPlannedPcs) * 100) : 0;
  const runningMachinesCount = machines.filter((m) => m.status === 'RUNNING').length;

  return (
    <div className="space-y-6">
      {/* Top Action & Date Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs no-print">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-persian-50 text-persian-700 flex items-center justify-center font-bold">
            <Factory className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm uppercase text-slate-900 tracking-tight">
                Daily Production Planning Matrix
              </h3>
              <span className="text-[10px] bg-persian-100 text-persian-800 px-2 py-0.5 rounded-full font-mono font-bold">
                {machines.length} Machines
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Allocate embroidery styles, shift slots, and machine crews
            </p>
          </div>
        </div>

        {/* Date Selector with Next / Prev */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1">
            <button
              onClick={() => shiftDate(-1)}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="bg-transparent px-2 text-xs font-mono font-bold text-slate-800 outline-none"
            />
            <button
              onClick={() => shiftDate(1)}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
              title="Next Day"
            >
              <ChevronNext className="w-4 h-4" />
            </button>
          </div>

          {formDate !== todayStr && (
            <button
              onClick={setDateToToday}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
            >
              Today
            </button>
          )}

          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl transition-all"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <Link
            href="/employees"
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3.5 py-2 rounded-xl transition-all"
          >
            <Users className="w-3.5 h-3.5 text-persian-700" />
            <span>Staff Roster</span>
          </Link>

          <Link
            href="/production/live"
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-all"
          >
            <Tv className="w-4 h-4 text-emerald-400" />
            <span>Floor Wallboard</span>
          </Link>
        </div>
      </div>

      {/* Daily Target Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
            Day Target Plan
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-persian-800">
              {totalPlannedPcs.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">Pieces</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-emerald-600 tracking-wider block">
            Actual Done Output
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-600">
              {totalActualPcs.toLocaleString()}
            </span>
            <span className="text-[11px] text-emerald-700 font-semibold">Pieces</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-amber-600 tracking-wider block">
            Daily Completion Rate
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-600">{overallEfficiency}%</span>
            <span className="text-[11px] text-amber-700 font-semibold">Plan vs Actual</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
            Active Fleet Status
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-800">
              {runningMachinesCount} / {machines.length}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">Running</span>
          </div>
        </div>
      </div>

      {/* Schedule Form */}
      <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Plus className="w-4 h-4 text-persian-600" />
            <span>Schedule New Production Block ({formDate})</span>
          </h4>
          <span className="text-[11px] text-slate-400">
            Select machine, style, and shift block to allocate capacity
          </span>
        </div>

        {machines.length === 0 ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Configure machines in Master Data before scheduling assignments.</span>
            </div>
            <Link
              href="/master-data"
              className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-lg shrink-0"
            >
              Add Machines
            </Link>
          </div>
        ) : (
          <form onSubmit={handlePushPlan} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Machine *
                </label>
                <select
                  value={formMachineId}
                  onChange={(e) => setFormMachineId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold outline-none focus:border-persian-500"
                  required
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      Machine {m.machine_number.toString().padStart(2, '0')} ({m.machine_name}
                      {m.operator_name ? ` • ${m.operator_name}` : ''})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Client Filter
                </label>
                <select
                  value={formClientId}
                  onChange={(e) => setFormClientId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold outline-none focus:border-persian-500"
                >
                  <option value="">All Clients ({clients.length})</option>
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold outline-none focus:border-persian-500"
                  required
                >
                  {availableStyles.length === 0 ? (
                    <option value="">No styles available</option>
                  ) : (
                    availableStyles.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.style_name} {s.target_per_hour ? `(${s.target_per_hour} pcs/hr)` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Start Hour *
                  </label>
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
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    End Hour *
                  </label>
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
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-600">
                    Plan Target (Pcs) *
                  </label>
                  {selectedStyle?.target_per_hour && (
                    <button
                      type="button"
                      onClick={calculateTargetQty}
                      className="text-[10px] text-persian-700 hover:text-persian-900 font-bold flex items-center gap-1"
                    >
                      <Calculator className="w-3 h-3" />
                      <span>Auto-calc: {selectedStyle.target_per_hour} pcs/hr</span>
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  value={formQty}
                  onChange={(e) => setFormQty(parseInt(e.target.value) || 0)}
                  required
                  min={1}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-black text-persian-800 outline-none focus:border-persian-500"
                />
              </div>

              <div className="lg:col-span-2">
                <button
                  type="submit"
                  disabled={isSubmitting || availableStyles.length === 0}
                  className="w-full bg-persian-800 hover:bg-persian-700 disabled:bg-slate-300 text-white font-bold text-xs p-2.5 rounded-xl shadow-md shadow-persian-800/20 transition-all flex items-center justify-center gap-2"
                >
                  <Share2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isSubmitting ? 'Scheduling...' : 'Push to Machine Schedule'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </section>

      {/* Main Gantt Matrix */}
      <section className="bg-white border border-slate-200 rounded-3xl shadow-soft overflow-hidden flex flex-col">
        {/* Timeline Hours Header */}
        <div className="flex border-b border-slate-200 bg-slate-50 font-semibold text-[11px] text-slate-600 sticky top-0 z-20">
          <div className="w-72 sm:w-80 p-3 bg-slate-100 border-r border-slate-300 font-bold text-persian-800 uppercase tracking-wider flex items-center justify-between shrink-0">
            <span>Machine & Assigned Crew</span>
            <span className="text-[9px] bg-white px-2 py-0.5 rounded border border-slate-300 font-mono text-slate-500">
              {machines.length} Units
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

        {/* Machine Rows */}
        {machines.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Factory className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-sm text-slate-700">No Machines In Database</p>
            <p className="text-xs text-slate-400 mt-1">
              Add machines in Master Data to populate the production Gantt matrix.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 max-h-[650px] overflow-y-auto">
            {machines.map((mac) => {
              const macAssignments = assignmentsByMachine[mac.id] || [];
              const macPlan = macAssignments.reduce((acc, a) => acc + a.plan_qty, 0);
              const macActual = macAssignments.reduce((acc, a) => acc + a.actual_qty, 0);
              const compPct = macPlan > 0 ? Math.round((macActual / macPlan) * 100) : 0;

              return (
                <div key={mac.id} className="flex items-stretch hover:bg-slate-50/70 transition-colors">
                  {/* Left Machine Header Card */}
                  <div className="w-72 sm:w-80 p-3 bg-white border-r border-slate-300 flex flex-col justify-between shrink-0">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-black text-slate-900 text-xs">
                          Machine {mac.machine_number.toString().padStart(2, '0')}
                        </span>
                        <button
                          onClick={() => openCrewModal(mac)}
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full hover:scale-105 transition-transform ${
                            mac.status === 'RUNNING'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : mac.status === 'SETUP'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                          title="Click to edit machine crew & status"
                        >
                          {mac.status} ✎
                        </button>
                      </div>

                      <div className="text-[10px] space-y-0.5 text-slate-600 mb-2">
                        <div className="truncate">
                          <span className="text-slate-400 font-semibold">Model: </span>
                          <span className="font-bold text-slate-800">
                            {mac.machine_name} {mac.brand ? `• ${mac.brand}` : ''} ({mac.heads || 15}H)
                          </span>
                        </div>
                        <div className="truncate flex items-center justify-between">
                          <span>
                            <span className="text-slate-400 font-semibold">Operator: </span>
                            <span className="font-bold text-slate-800">
                              {mac.operator_name || 'Unassigned'}
                            </span>
                          </span>
                          <button
                            onClick={() => openCrewModal(mac)}
                            className="text-[9px] text-persian-700 font-bold hover:underline"
                          >
                            Assign
                          </button>
                        </div>
                        <div className="truncate">
                          <span className="text-slate-400 font-semibold">Helper: </span>
                          <span className="font-bold text-slate-800">
                            {mac.helper_name || 'None'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1.5 border-t border-slate-100">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-slate-500">Day Target:</span>
                        <span className="font-black text-persian-800">
                          {macActual} / {macPlan} ({compPct}%)
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

                  {/* 11-Hour Gantt Timeline Slots */}
                  <div className="flex-1 grid grid-cols-11 p-2 gap-1.5 relative bg-slate-50/40">
                    {/* Background hour slot guidelines */}
                    <div className="absolute inset-0 grid grid-cols-11 divide-x divide-slate-100 pointer-events-none" />

                    {macAssignments.length === 0 ? (
                      <div className="col-span-11 flex items-center justify-center text-[11px] text-slate-400 font-medium italic">
                        No production blocks scheduled for this machine on {formDate}
                      </div>
                    ) : (
                      macAssignments.map((block) => {
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
                            className="z-10 group cursor-pointer relative bg-indigo-50 border border-indigo-200 text-indigo-950 rounded-xl p-2 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0">
                                <span className="text-[8px] font-black uppercase text-white bg-indigo-700 px-1 py-0.2 rounded truncate block w-fit mb-0.5">
                                  {block.style?.client?.name || 'Client'}
                                </span>
                                <h6 className="font-black text-[11px] truncate leading-tight">
                                  {block.style?.style_name || 'Embroidery Task'}
                                </h6>
                              </div>
                              <span className="text-[9px] font-extrabold text-indigo-900 bg-white/80 px-1.5 py-0.5 rounded border border-indigo-200">
                                {blockPct}%
                              </span>
                            </div>

                            <div className="mt-2 pt-1 border-t border-indigo-200/60 flex items-center justify-between text-[10px]">
                              <span className="font-bold">
                                Actual:{' '}
                                <span className="font-black text-indigo-900">
                                  {block.actual_qty}
                                </span>
                              </span>
                              <span className="text-slate-500 font-semibold">
                                Target: {block.plan_qty}
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
        )}
      </section>

      {/* Edit Actual Quantity Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-black text-sm uppercase text-slate-800">
                  Update Production Output
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
                  Plan Target Quantity
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
                  Actual Completed Pieces *
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
                  {isUpdating ? 'Saving...' : 'Save Actual Output'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Machine Crew Assignment Modal */}
      {crewModalOpen && activeMachine && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-persian-50 text-persian-700 flex items-center justify-center font-bold">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sm uppercase text-slate-900">
                    Assign Machine Crew
                  </h4>
                  <p className="text-xs text-slate-500">
                    Machine {activeMachine.machine_number.toString().padStart(2, '0')} (
                    {activeMachine.machine_name})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCrewModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCrew} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Assigned Machine Operator
                </label>
                <select
                  value={crewOperator}
                  onChange={(e) => setCrewOperator(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-persian-500"
                >
                  <option value="">-- No Operator Assigned --</option>
                  {employees
                    .filter((e) => e.is_active)
                    .map((emp) => (
                      <option key={emp.id} value={emp.full_name}>
                        #{emp.epf_no} • {emp.full_name} ({emp.role})
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Registered in Employee Registration
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Assigned Machine Helper
                </label>
                <select
                  value={crewHelper}
                  onChange={(e) => setCrewHelper(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-persian-500"
                >
                  <option value="">-- No Helper Assigned --</option>
                  {employees
                    .filter((e) => e.is_active)
                    .map((emp) => (
                      <option key={emp.id} value={emp.full_name}>
                        #{emp.epf_no} • {emp.full_name} ({emp.role})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Machine Operating Status
                </label>
                <select
                  value={crewStatus}
                  onChange={(e) =>
                    setCrewStatus(
                      e.target.value as 'RUNNING' | 'SETUP' | 'MAINTENANCE' | 'IDLE'
                    )
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-persian-500"
                >
                  <option value="RUNNING">RUNNING (In Production)</option>
                  <option value="SETUP">SETUP (Hooping & Threading)</option>
                  <option value="IDLE">IDLE (Standby / No Job)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Mechanic Repair)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCrewModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCrew}
                  className="px-4 py-2 bg-persian-800 hover:bg-persian-700 text-white rounded-xl font-bold text-xs shadow-md shadow-persian-800/20 disabled:opacity-50"
                >
                  {isSavingCrew ? 'Saving...' : 'Save Crew Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
