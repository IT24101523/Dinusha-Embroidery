'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

interface ProductionBlock {
  id: string;
  client: string;
  style: string;
  baseName: string;
  startCol: number; // 1-indexed (1 to 11)
  span: number;
  plan: number;
  actual: number;
}

interface MachineRow {
  id: string;
  num: number;
  operator: string;
  helper: string;
  status: 'RUNNING' | 'SETUP' | 'MAINTENANCE';
  styles: ProductionBlock[];
}

interface StyleMasterItem {
  name: string;
  company: string;
  orderQty: number;
}

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

const STYLES_MASTER: StyleMasterItem[] = [
  { name: 'Track Jacket Logo #102', orderQty: 2000, company: 'Nike Apparel' },
  { name: 'Chest Badge #88', orderQty: 1500, company: 'Motif Brand' },
  { name: 'Floral Embroidery #502', orderQty: 1800, company: 'Tesco Sri Lanka' },
  { name: 'Back Crest #301', orderQty: 2200, company: 'Adidas Sportswear' },
  { name: 'Sleeve Logo #405', orderQty: 1200, company: 'Nike Apparel' },
];

const CLIENT_STYLES: Record<string, { bg: string; text: string; border: string; tag: string }> = {
  'Nike Apparel': {
    bg: 'bg-indigo-50/90',
    text: 'text-indigo-950',
    border: 'border-indigo-300',
    tag: 'bg-indigo-700',
  },
  'Motif Brand': {
    bg: 'bg-amber-50/90',
    text: 'text-amber-950',
    border: 'border-amber-300',
    tag: 'bg-amber-600',
  },
  'Tesco Sri Lanka': {
    bg: 'bg-emerald-50/90',
    text: 'text-emerald-950',
    border: 'border-emerald-300',
    tag: 'bg-emerald-700',
  },
  'Adidas Sportswear': {
    bg: 'bg-purple-50/90',
    text: 'text-purple-950',
    border: 'border-purple-300',
    tag: 'bg-purple-700',
  },
};

const OPERATORS = [
  'Nimal',
  'Kamal',
  'Sunil',
  'Bandara',
  'Ruwan',
  'Nuwan',
  'Chathura',
  'Dhammika',
  'Mahesh',
  'Asanka',
  'Kasun',
  'Tharindu',
  'Saman',
];

const HELPERS = [
  'Priyanta',
  'Lalith',
  'Dinesh',
  'Sanjeeva',
  'Anura',
  'Indika',
  'Janaka',
  'Gayan',
  'Roshan',
  'Upul',
  'Priyantha',
  'Sujith',
  'Buddhika',
];

export default function ProductionPage() {
  const [machines, setMachines] = useState<MachineRow[]>([]);
  const [stylesMaster] = useState<StyleMasterItem[]>(STYLES_MASTER);

  // Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [formDate, setFormDate] = useState(todayStr);
  const [formMachine, setFormMachine] = useState('Machine 01');
  const [formCompany, setFormCompany] = useState('Nike Apparel');
  const [formStyle, setFormStyle] = useState('Track Jacket Logo #102');
  const [formSize, setFormSize] = useState('L');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('18:00');
  const [formQty, setFormQty] = useState(300);
  const [formOperator, setFormOperator] = useState('Nimal');
  const [formHelper, setFormHelper] = useState('Priyanta');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [activeMacId, setActiveMacId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [editStyleName, setEditStyleName] = useState('');
  const [editPlanQty, setEditPlanQty] = useState(0);
  const [editActualQty, setEditActualQty] = useState(0);

  // Initial Data Load
  useEffect(() => {
    const saved = localStorage.getItem('dinusha_production_machines_v4');
    if (saved) {
      setMachines(JSON.parse(saved));
    } else {
      const initial: MachineRow[] = Array.from({ length: 13 }, (_, i) => {
        const macNum = (i + 1).toString().padStart(2, '0');
        const assignedStyle = STYLES_MASTER[i % STYLES_MASTER.length];
        return {
          id: `Machine ${macNum}`,
          num: i + 1,
          operator: OPERATORS[i],
          helper: HELPERS[i],
          status: i === 5 ? 'SETUP' : i === 11 ? 'MAINTENANCE' : 'RUNNING',
          styles: [
            {
              id: `m${i}-s1`,
              client: assignedStyle.company,
              style: `${assignedStyle.name} (L)`,
              baseName: assignedStyle.name,
              startCol: 1,
              span: 11,
              plan: 300,
              actual: i % 2 === 0 ? 285 : 210,
            },
          ],
        };
      });
      setMachines(initial);
      localStorage.setItem('dinusha_production_machines_v4', JSON.stringify(initial));
    }
  }, []);

  const persistMachines = (updated: MachineRow[]) => {
    setMachines(updated);
    localStorage.setItem('dinusha_production_machines_v4', JSON.stringify(updated));
  };

  // Schedule Push Handler
  const handlePushPlan = (e: React.FormEvent) => {
    e.preventDefault();
    const startIdx = SHIFT_HOURS.indexOf(formStartTime);
    const endIdx = SHIFT_HOURS.indexOf(formEndTime);

    if (startIdx > endIdx) {
      alert('Start time cannot be later than End time.');
      return;
    }

    const startCol = startIdx + 1;
    const span = endIdx - startIdx + 1;

    const updated = machines.map((mac) => {
      if (mac.id === formMachine) {
        return {
          ...mac,
          operator: formOperator,
          helper: formHelper !== 'None' ? formHelper : mac.helper,
          styles: [
            ...mac.styles,
            {
              id: `block-${Date.now()}`,
              client: formCompany,
              style: `${formStyle} (${formSize})`,
              baseName: formStyle,
              startCol,
              span,
              plan: formQty,
              actual: 0,
            },
          ],
        };
      }
      return mac;
    });

    persistMachines(updated);
  };

  // Modal Handlers
  const openEditModal = (macId: string, blockId: string) => {
    const mac = machines.find((m) => m.id === macId);
    if (!mac) return;
    const block = mac.styles.find((b) => b.id === blockId);
    if (!block) return;

    setActiveMacId(macId);
    setActiveBlockId(blockId);
    setEditStyleName(block.style);
    setEditPlanQty(block.plan);
    setEditActualQty(block.actual);
    setModalOpen(true);
  };

  const updateBlock = () => {
    if (!activeMacId || !activeBlockId) return;

    const updated = machines.map((mac) => {
      if (mac.id === activeMacId) {
        return {
          ...mac,
          styles: mac.styles.map((b) =>
            b.id === activeBlockId
              ? {
                  ...b,
                  style: editStyleName,
                  plan: editPlanQty,
                  actual: editActualQty,
                }
              : b
          ),
        };
      }
      return mac;
    });

    persistMachines(updated);
    setModalOpen(false);
  };

  const deleteBlock = () => {
    if (!activeMacId || !activeBlockId) return;

    const updated = machines.map((mac) => {
      if (mac.id === activeMacId) {
        return {
          ...mac,
          styles: mac.styles.filter((b) => b.id !== activeBlockId),
        };
      }
      return mac;
    });

    persistMachines(updated);
    setModalOpen(false);
  };

  // Compute Style Breakdown Metrics
  const styleMetrics: Record<string, { orderQty: number; plannedQty: number; doneQty: number }> =
    {};
  stylesMaster.forEach((sm) => {
    styleMetrics[sm.name] = { orderQty: sm.orderQty, plannedQty: 0, doneQty: 0 };
  });

  machines.forEach((mac) => {
    mac.styles.forEach((s) => {
      const match = stylesMaster.find((sm) => s.style.includes(sm.name));
      if (match) {
        styleMetrics[match.name].plannedQty += s.plan;
        styleMetrics[match.name].doneQty += s.actual;
      }
    });
  });

  return (
    <div className="space-y-6">
      {/* Top Action Bar with Wallboard Shortcut */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-persian-50 text-persian-700 flex items-center justify-center font-bold">
            <Factory className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm uppercase text-slate-800">
              13-Machine Production Schedule Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Day Shift (08:00 - 19:00) • Real-time timeline allocations
            </p>
          </div>
        </div>

        <Link
          href="/production/live"
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all"
        >
          <Tv className="w-4 h-4 text-emerald-400" />
          <span>Launch TV Wallboard</span>
        </Link>
      </div>

      {/* Style Breakdown Cards Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-2">
            <Layers className="w-4 h-4 text-persian-600" />
            <span>Style-Wise Order & Production Breakdown</span>
          </h4>
          <span className="text-[11px] text-slate-400 font-semibold">
            Aggregated across all 13 machines
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {stylesMaster.map((sm) => {
            const data = styleMetrics[sm.name] || {
              orderQty: sm.orderQty,
              plannedQty: 0,
              doneQty: 0,
            };
            const remaining = Math.max(0, data.orderQty - data.doneQty);

            return (
              <div
                key={sm.name}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="border-b border-slate-100 pb-2">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    {sm.company}
                  </span>
                  <h5 className="font-black text-slate-800 text-xs truncate mt-0.5" title={sm.name}>
                    {sm.name}
                  </h5>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">
                      Order Qty
                    </span>
                    <span className="font-black text-slate-800 text-sm">
                      {data.orderQty.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-amber-50/70 p-2 rounded-xl border border-amber-100">
                    <span className="text-[9px] font-bold text-amber-800 uppercase block">
                      Planned
                    </span>
                    <span className="font-black text-amber-600 text-sm">
                      {data.plannedQty.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                    <span className="text-[9px] font-bold text-emerald-800 uppercase block">
                      Done
                    </span>
                    <span className="font-black text-emerald-600 text-sm">
                      {data.doneQty.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-indigo-50/70 p-2 rounded-xl border border-indigo-100">
                    <span className="text-[9px] font-bold text-indigo-800 uppercase block">
                      Remaining
                    </span>
                    <span className="font-black text-indigo-600 text-sm">
                      {remaining.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Production Plan Form Scheduler */}
      <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Plus className="w-4 h-4 text-persian-600" />
            <span>Schedule New Production Block</span>
          </h4>
          <span className="text-[11px] text-slate-400">
            Push schedule into the 11-hour matrix
          </span>
        </div>

        <form onSubmit={handlePushPlan} className="space-y-3">
          {/* Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Shift</label>
              <select className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold outline-none">
                <option value="day">Day Shift (08:00 - 19:00)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                Machine *
              </label>
              <select
                value={formMachine}
                onChange={(e) => setFormMachine(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold outline-none focus:border-persian-500"
              >
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                Company *
              </label>
              <select
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold outline-none"
              >
                <option value="Nike Apparel">Nike Apparel</option>
                <option value="Motif Brand">Motif Brand</option>
                <option value="Tesco Sri Lanka">Tesco Sri Lanka</option>
                <option value="Adidas Sportswear">Adidas Sportswear</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Style *</label>
              <select
                value={formStyle}
                onChange={(e) => setFormStyle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold outline-none"
              >
                {stylesMaster.map((sm) => (
                  <option key={sm.name} value={sm.name}>
                    {sm.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 items-end pt-1">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Size</label>
              <select
                value={formSize}
                onChange={(e) => setFormSize(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold outline-none"
              >
                <option value="S">Small (S)</option>
                <option value="M">Medium (M)</option>
                <option value="L">Large (L)</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
                <option value="Free Size">Free Size</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Start *</label>
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
              <label className="block text-[10px] font-bold text-slate-600 mb-1">End *</label>
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
                Plan Target *
              </label>
              <input
                type="number"
                value={formQty}
                onChange={(e) => setFormQty(parseInt(e.target.value) || 0)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-black text-persian-800 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Operator</label>
              <select
                value={formOperator}
                onChange={(e) => setFormOperator(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold outline-none"
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
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold outline-none"
              >
                <option value="None">None</option>
                {HELPERS.map((hp) => (
                  <option key={hp} value={hp}>
                    {hp}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <button
                type="submit"
                className="w-full bg-persian-800 hover:bg-persian-700 text-white font-bold text-xs p-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Push Plan</span>
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Main 13-Machine Gantt Matrix */}
      <section className="bg-white border border-slate-200 rounded-3xl shadow-soft overflow-hidden flex flex-col">
        {/* Timeline Hours Header */}
        <div className="flex border-b border-slate-200 bg-slate-50 font-semibold text-[11px] text-slate-600 sticky top-0 z-20">
          <div className="w-72 sm:w-80 p-3 bg-slate-100 border-r border-slate-300 font-bold text-persian-800 uppercase tracking-wider flex items-center justify-between shrink-0">
            <span>Machine & Crew</span>
            <span className="text-[9px] bg-white px-2 py-0.5 rounded border border-slate-300 font-mono text-slate-500">
              13 Units
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
        <div className="divide-y divide-slate-200 max-h-[650px] overflow-y-auto">
          {machines.map((mac) => {
            let macPlan = 0;
            let macActual = 0;
            mac.styles.forEach((s) => {
              macPlan += s.plan;
              macActual += s.actual;
            });

            const compPct = macPlan > 0 ? Math.round((macActual / macPlan) * 100) : 0;

            return (
              <div key={mac.id} className="flex items-stretch hover:bg-slate-50/70 transition-colors">
                {/* Left Machine Header Card */}
                <div className="w-72 sm:w-80 p-3 bg-white border-r border-slate-300 flex flex-col justify-between shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-slate-900 text-xs">{mac.id}</span>
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        mac.status === 'RUNNING'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : mac.status === 'SETUP'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {mac.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] mb-1.5">
                    <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-semibold truncate">
                      {mac.operator}
                    </span>
                    <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-500 font-medium truncate">
                      {mac.helper}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                    <span>
                      Output: <strong className="text-slate-800">{macActual}</strong>/{macPlan} Pcs
                    </span>
                    <span
                      className={
                        compPct >= 100
                          ? 'text-emerald-600 font-bold'
                          : compPct >= 85
                          ? 'text-amber-600 font-bold'
                          : 'text-slate-600'
                      }
                    >
                      {compPct}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1 border border-slate-200">
                    <div
                      className={`h-full rounded-full ${
                        compPct >= 100
                          ? 'bg-emerald-500'
                          : compPct >= 85
                          ? 'bg-amber-500'
                          : 'bg-persian-600'
                      }`}
                      style={{ width: `${Math.min(compPct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Right Timeline Grid Tracks */}
                <div className="flex-1 grid grid-cols-11 relative matrix-grid p-2 gap-2 items-center">
                  {mac.styles.map((block) => {
                    const cStyle =
                      CLIENT_STYLES[block.client] || CLIENT_STYLES['Nike Apparel'];

                    return (
                      <div
                        key={block.id}
                        style={{
                          gridColumn: `${block.startCol} / span ${block.span}`,
                        }}
                        onClick={() => openEditModal(mac.id, block.id)}
                        className={`${cStyle.bg} ${cStyle.border} border rounded-xl p-2.5 shadow-2xs hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-[9px] font-black uppercase tracking-wider ${cStyle.text}`}
                          >
                            {block.client}
                          </span>
                          <span className="text-[9px] bg-white/90 text-slate-600 px-1 rounded font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to Edit
                          </span>
                        </div>

                        <div className="font-black text-slate-800 text-[11px] truncate mb-1.5">
                          {block.style}
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-slate-600">Plan: {block.plan}</span>
                          <span className="bg-persian-800 text-white px-2 py-0.5 rounded text-[10px] shadow-xs">
                            Act: {block.actual}
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
      </section>

      {/* Edit Block Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-persian-800 text-white p-4 flex items-center justify-between">
              <div>
                <h4 className="font-black text-sm flex items-center gap-1.5">
                  <Edit2 className="w-4 h-4 text-amber-400" />
                  <span>Update Production Block</span>
                </h4>
                <p className="text-[11px] text-blue-200 mt-0.5">{activeMacId}</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-persian-900/50 text-blue-200 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Style Description
                </label>
                <input
                  type="text"
                  value={editStyleName}
                  onChange={(e) => setEditStyleName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-persian-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Plan Target Qty
                  </label>
                  <input
                    type="number"
                    value={editPlanQty}
                    onChange={(e) => setEditPlanQty(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-black text-persian-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-emerald-700 mb-1">
                    Actual Done Qty
                  </label>
                  <input
                    type="number"
                    value={editActualQty}
                    onChange={(e) => setEditActualQty(parseInt(e.target.value) || 0)}
                    className="w-full bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 text-xs font-black text-emerald-800 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={deleteBlock}
                  className="w-1/3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
                <button
                  type="button"
                  onClick={updateBlock}
                  className="w-2/3 py-2.5 rounded-xl bg-persian-800 hover:bg-persian-700 text-white font-bold text-xs shadow-md transition-all"
                >
                  Update & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
