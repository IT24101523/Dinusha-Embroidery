'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

interface CheckingBlock {
  id: string;
  client: string;
  style: string;
  startCol: number;
  span: number;
  plan: number;
  actual: number;
}

interface CheckerRow {
  id: string;
  status: 'ACTIVE' | 'IDLE';
  styles: CheckingBlock[];
}

interface StyleMasterItem {
  name: string;
  company: string;
  orderQty: number;
  todayDeliveryQty: number;
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

const CHECKER_NAMES = [
  'YAMUNA',
  'DILRUKSHI',
  'SACHINI',
  'NAWODHYA',
  'NADEERA',
  'BIMESHA',
  'RAMALSHA',
  'NETHMINI',
];

const INITIAL_STYLES: StyleMasterItem[] = [
  { name: 'Miami Denim', company: 'Nike Apparel', orderQty: 2500, todayDeliveryQty: 1000 },
  { name: 'Miami Strawberry', company: 'Motif Brand', orderQty: 1500, todayDeliveryQty: 500 },
  { name: 'F/S Animals', company: 'Tesco Sri Lanka', orderQty: 1800, todayDeliveryQty: 800 },
  { name: 'Miami Big love', company: 'Adidas Sportswear', orderQty: 3200, todayDeliveryQty: 1200 },
  { name: 'Track Jacket Logo #102', company: 'Nike Apparel', orderQty: 2000, todayDeliveryQty: 0 },
];

const CLIENT_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'Nike Apparel': {
    bg: 'bg-indigo-50/90',
    text: 'text-indigo-950',
    border: 'border-indigo-300',
  },
  'Motif Brand': {
    bg: 'bg-amber-50/90',
    text: 'text-amber-950',
    border: 'border-amber-300',
  },
  'Tesco Sri Lanka': {
    bg: 'bg-emerald-50/90',
    text: 'text-emerald-950',
    border: 'border-emerald-300',
  },
  'Adidas Sportswear': {
    bg: 'bg-purple-50/90',
    text: 'text-purple-950',
    border: 'border-purple-300',
  },
};

export default function QualityPage() {
  const [checkers, setCheckers] = useState<CheckerRow[]>([]);
  const [stylesMaster, setStylesMaster] = useState<StyleMasterItem[]>(INITIAL_STYLES);

  // Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [formDate, setFormDate] = useState(todayStr);
  const [formChecker, setFormChecker] = useState('YAMUNA');
  const [formCompany, setFormCompany] = useState('Nike Apparel');
  const [formStyle, setFormStyle] = useState('Miami Denim');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('18:00');
  const [formQty, setFormQty] = useState(300);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCheckerId, setActiveCheckerId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [editPlanQty, setEditPlanQty] = useState(0);
  const [editActualQty, setEditActualQty] = useState(0);

  // Initial Load
  useEffect(() => {
    const savedCheckers = localStorage.getItem('dinusha_checkers_data_v4');
    const savedStyles = localStorage.getItem('dinusha_qc_styles_v4');

    if (savedStyles) {
      setStylesMaster(JSON.parse(savedStyles));
    }

    if (savedCheckers) {
      setCheckers(JSON.parse(savedCheckers));
    } else {
      const initial: CheckerRow[] = CHECKER_NAMES.map((name, i) => {
        const row: CheckerRow = { id: name, status: 'ACTIVE', styles: [] };
        if (i === 0) {
          row.styles.push({
            id: 'b1',
            client: 'Nike Apparel',
            style: 'Miami Denim',
            startCol: 1,
            span: 5,
            plan: 620,
            actual: 400,
          });
        }
        if (i === 1) {
          row.styles.push({
            id: 'b2',
            client: 'Motif Brand',
            style: 'Miami Strawberry',
            startCol: 1,
            span: 5,
            plan: 160,
            actual: 147,
          });
        }
        if (i === 2) {
          row.styles.push({
            id: 'b3',
            client: 'Tesco Sri Lanka',
            style: 'F/S Animals',
            startCol: 1,
            span: 5,
            plan: 381,
            actual: 381,
          });
        }
        return row;
      });
      setCheckers(initial);
      localStorage.setItem('dinusha_checkers_data_v4', JSON.stringify(initial));
    }
  }, []);

  const persistCheckers = (updated: CheckerRow[]) => {
    setCheckers(updated);
    localStorage.setItem('dinusha_checkers_data_v4', JSON.stringify(updated));
  };

  const persistStyles = (updated: StyleMasterItem[]) => {
    setStylesMaster(updated);
    localStorage.setItem('dinusha_qc_styles_v4', JSON.stringify(updated));
  };

  // Delivery Quota Setter
  const setDeliveryPlan = (styleName: string) => {
    const current = stylesMaster.find((s) => s.name === styleName)?.todayDeliveryQty || 0;
    const input = prompt(`Set Today's Target Delivery Quantity for "${styleName}":`, current.toString());
    if (input !== null && input !== '') {
      const val = parseInt(input) || 0;
      const updated = stylesMaster.map((s) =>
        s.name === styleName ? { ...s, todayDeliveryQty: val } : s
      );
      persistStyles(updated);
    }
  };

  // Push Assignment
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

    const updated = checkers.map((c) => {
      if (c.id === formChecker) {
        return {
          ...c,
          styles: [
            ...c.styles,
            {
              id: `block-${Date.now()}`,
              client: formCompany,
              style: formStyle,
              startCol,
              span,
              plan: formQty,
              actual: 0,
            },
          ],
        };
      }
      return c;
    });

    persistCheckers(updated);
  };

  // Modal Handlers
  const openEditModal = (checkerId: string, blockId: string) => {
    const c = checkers.find((item) => item.id === checkerId);
    if (!c) return;
    const block = c.styles.find((b) => b.id === blockId);
    if (!block) return;

    setActiveCheckerId(checkerId);
    setActiveBlockId(blockId);
    setEditPlanQty(block.plan);
    setEditActualQty(block.actual);
    setModalOpen(true);
  };

  const updateBlock = () => {
    if (!activeCheckerId || !activeBlockId) return;

    const updated = checkers.map((c) => {
      if (c.id === activeCheckerId) {
        return {
          ...c,
          styles: c.styles.map((b) =>
            b.id === activeBlockId
              ? {
                  ...b,
                  plan: editPlanQty,
                  actual: editActualQty,
                }
              : b
          ),
        };
      }
      return c;
    });

    persistCheckers(updated);
    setModalOpen(false);
  };

  const deleteBlock = () => {
    if (!activeCheckerId || !activeBlockId) return;

    const updated = checkers.map((c) => {
      if (c.id === activeCheckerId) {
        return {
          ...c,
          styles: c.styles.filter((b) => b.id !== activeBlockId),
        };
      }
      return c;
    });

    persistCheckers(updated);
    setModalOpen(false);
  };

  // Metrics
  const styleMetrics: Record<
    string,
    { orderQty: number; plannedCheckingQty: number; actualDoneQty: number; todayDeliveryQty: number; company: string }
  > = {};

  stylesMaster.forEach((sm) => {
    styleMetrics[sm.name] = {
      orderQty: sm.orderQty,
      plannedCheckingQty: 0,
      actualDoneQty: 0,
      todayDeliveryQty: sm.todayDeliveryQty,
      company: sm.company,
    };
  });

  checkers.forEach((c) => {
    c.styles.forEach((s) => {
      if (styleMetrics[s.style]) {
        styleMetrics[s.style].plannedCheckingQty += s.plan;
        styleMetrics[s.style].actualDoneQty += s.actual;
      }
    });
  });

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm uppercase text-slate-800">
              Quality Checking & Day Delivery Management
            </h3>
            <p className="text-xs text-slate-500">
              8 Dedicated Quality Checkers • Hour-by-hour inspection tracking
            </p>
          </div>
        </div>

        <Link
          href="/quality/live"
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all"
        >
          <Tv className="w-4 h-4 text-emerald-400" />
          <span>Launch Checking Wallboard</span>
        </Link>
      </div>

      {/* 4-Box Style Breakdown Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-2">
            <Layers className="w-4 h-4 text-persian-600" />
            <span>Style-Wise Order & Checking Breakdown (4 Metrics)</span>
          </h4>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            💡 Click &apos;Today Delivery Qty&apos; box to adjust daily target
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {stylesMaster.map((sm) => {
            const data = styleMetrics[sm.name];

            return (
              <div
                key={sm.name}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="border-b border-slate-100 pb-2">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    {data.company}
                  </span>
                  <h5 className="font-black text-slate-800 text-xs truncate mt-0.5">{sm.name}</h5>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* BOX 1 */}
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">
                      Order Qty
                    </span>
                    <span className="font-black text-slate-800 text-sm">
                      {data.orderQty.toLocaleString()}
                    </span>
                  </div>

                  {/* BOX 2 */}
                  <div className="bg-amber-50/70 p-2 rounded-xl border border-amber-100">
                    <span className="text-[9px] font-bold text-amber-800 uppercase block">
                      Plan Check
                    </span>
                    <span className="font-black text-amber-600 text-sm">
                      {data.plannedCheckingQty.toLocaleString()}
                    </span>
                  </div>

                  {/* BOX 3 */}
                  <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                    <span className="text-[9px] font-bold text-emerald-800 uppercase block">
                      Actual Done
                    </span>
                    <span className="font-black text-emerald-600 text-sm">
                      {data.actualDoneQty.toLocaleString()}
                    </span>
                  </div>

                  {/* BOX 4: Clickable Target Setter */}
                  <div
                    onClick={() => setDeliveryPlan(sm.name)}
                    className="bg-indigo-50/70 hover:bg-indigo-100/80 p-2 rounded-xl border border-indigo-200 cursor-pointer transition-colors group"
                  >
                    <span className="text-[9px] font-extrabold text-indigo-800 uppercase block flex items-center justify-between">
                      <span>Delivery Target</span>
                      <Target className="w-2.5 h-2.5 text-indigo-600" />
                    </span>
                    <span className="font-black text-indigo-700 text-sm">
                      {data.todayDeliveryQty.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Assignment Form */}
      <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>Assign Checker & Timeline Block</span>
          </h4>
          <span className="text-[11px] text-slate-400">Day Shift (08:00 - 19:00)</span>
        </div>

        <form onSubmit={handlePushPlan} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Date *</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Shift</label>
              <select className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold outline-none">
                <option value="day">Day Shift (08:00 - 19:00)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Checker *</label>
              <select
                value={formChecker}
                onChange={(e) => setFormChecker(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold outline-none focus:border-emerald-500"
              >
                {CHECKER_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Company *</label>
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

            <div className="col-span-2">
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end pt-1">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Start Hour</label>
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
              <label className="block text-[10px] font-bold text-slate-600 mb-1">End Hour</label>
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
                Plan Checking Target
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
              <button
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs p-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Assign Block</span>
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* 8 Checkers Gantt Timeline Matrix */}
      <section className="bg-white border border-slate-200 rounded-3xl shadow-soft overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex border-b border-slate-200 bg-slate-50 font-semibold text-[11px] text-slate-600 sticky top-0 z-20">
          <div className="w-64 p-3 bg-slate-100 border-r border-slate-300 font-bold text-persian-800 uppercase tracking-wider flex items-center justify-between shrink-0">
            <span>Quality Staff (8)</span>
            <span className="text-[9px] bg-white px-2 py-0.5 rounded border border-slate-300 font-mono text-slate-500">
              Checking Crew
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
        <div className="divide-y divide-slate-200 max-h-[600px] overflow-y-auto">
          {checkers.map((checker) => {
            let checkerPlan = 0;
            let checkerActual = 0;
            checker.styles.forEach((s) => {
              checkerPlan += s.plan;
              checkerActual += s.actual;
            });

            const compPct = checkerPlan > 0 ? Math.round((checkerActual / checkerPlan) * 100) : 0;

            return (
              <div
                key={checker.id}
                className="flex items-stretch hover:bg-slate-50/70 transition-colors"
              >
                {/* Left Staff Info */}
                <div className="w-64 p-3 bg-white border-r border-slate-300 flex flex-col justify-between shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-slate-900 text-xs">{checker.id}</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-300">
                      Active
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mt-2">
                    <span>
                      Done: <strong className="text-slate-800">{checkerActual}</strong>/{checkerPlan}
                    </span>
                    <span
                      className={
                        compPct >= 100 ? 'text-emerald-600 font-bold' : 'text-slate-600'
                      }
                    >
                      {compPct}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1 border border-slate-200">
                    <div
                      className="bg-emerald-600 h-full rounded-full"
                      style={{ width: `${Math.min(compPct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Right Matrix Blocks */}
                <div className="flex-1 grid grid-cols-11 relative matrix-grid p-2 gap-2 items-center">
                  {checker.styles.map((block) => {
                    const cStyle =
                      CLIENT_STYLES[block.client] || CLIENT_STYLES['Nike Apparel'];

                    return (
                      <div
                        key={block.id}
                        style={{
                          gridColumn: `${block.startCol} / span ${block.span}`,
                        }}
                        onClick={() => openEditModal(checker.id, block.id)}
                        className={`${cStyle.bg} ${cStyle.border} border rounded-xl p-2.5 shadow-2xs hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-[9px] font-black uppercase tracking-wider ${cStyle.text}`}
                          >
                            {block.client}
                          </span>
                          <span className="text-[9px] bg-white/90 text-slate-600 px-1 rounded font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                            Edit
                          </span>
                        </div>

                        <div className="font-black text-slate-800 text-[11px] truncate mb-1">
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

      {/* Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-persian-800 text-white p-4 flex items-center justify-between">
              <div>
                <h4 className="font-black text-sm flex items-center gap-1.5">
                  <Edit2 className="w-4 h-4 text-amber-400" />
                  <span>Update Checking Actuals</span>
                </h4>
                <p className="text-[11px] text-blue-200 mt-0.5">{activeCheckerId}</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-persian-900/50 text-blue-200 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Plan Checking Qty
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
                  className="w-1/3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors"
                >
                  Delete
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
