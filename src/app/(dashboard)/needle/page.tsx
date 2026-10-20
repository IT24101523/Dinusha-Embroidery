'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Boxes,
  FileText,
  FileCheck2,
  RefreshCw,
  PlusCircle,
  PackagePlus,
  AlertTriangle,
  Printer,
  Search,
  CheckCircle2,
  X,
  Building,
  ShieldCheck,
} from 'lucide-react';

interface NeedleType {
  id: number;
  system: string;
  size: string;
  ref: string;
  point: string;
  stock: number;
}

interface RecordLog {
  id: number;
  date: string;
  styleNo: string;
  epfNo: string;
  seamLocation: string;
  size: string;
  type: string;
  time: string;
  traced: string;
  mcNumber: string;
  sign: string;
  actionType: 'BROKEN' | 'BLUNT' | 'MISSING' | 'SWITCH';
}

const LOW_STOCK_THRESHOLD = 200;

const DEFAULT_NEEDLES: NeedleType[] = [
  { id: 1, system: 'DB X K5', size: '75/11', ref: '785965', point: 'FFG/SES', stock: 300 },
  { id: 2, system: 'DB X K5', size: '60/8', ref: '759922', point: 'FFG/SES', stock: 180 }, // LOW
  { id: 3, system: 'DB X K5', size: '65/9', ref: '758082', point: 'FFG/SES', stock: 200 }, // LOW
  { id: 4, system: 'DB X K5', size: '90/14', ref: '761302', point: 'FFG/SES', stock: 300 },
  { id: 5, system: 'CE X 3 PH-C70', size: '90/14', ref: '779232', point: 'R', stock: 150 }, // LOW
];

const DEFAULT_LOGS: RecordLog[] = [
  {
    id: 101,
    date: '2026-10-08',
    styleNo: 'Laklo',
    epfNo: 'Hiruna',
    seamLocation: 'Front Panel',
    size: '90/14',
    type: 'DB X K5',
    time: '4:51 PM',
    traced: 'N',
    mcNumber: '08',
    sign: 'Hiruna',
    actionType: 'BROKEN',
  },
  {
    id: 102,
    date: '2026-10-08',
    styleNo: 'Lahiru',
    epfNo: 'Lahiru',
    seamLocation: 'Side Pocket',
    size: '90/14',
    type: 'DB X K5',
    time: '1:00 PM',
    traced: '-',
    mcNumber: 'New',
    sign: 'Lahiru',
    actionType: 'SWITCH',
  },
  {
    id: 103,
    date: '2026-10-09',
    styleNo: 'ST-102 Nike',
    epfNo: 'Kamal',
    seamLocation: 'Collar Band',
    size: '75/11',
    type: 'DB X K5',
    time: '11:20 AM',
    traced: 'Y',
    mcNumber: '03',
    sign: 'Kamal',
    actionType: 'BROKEN',
  },
];

export default function NeedleManagementPage() {
  const [activeTab, setActiveTab] = useState<
    'inventory' | 'sheet' | 'cln' | 'switch' | 'broken' | 'newType' | 'restock'
  >('inventory');

  const [needleTypes, setNeedleTypes] = useState<NeedleType[]>([]);
  const [recordLogs, setRecordLogs] = useState<RecordLog[]>([]);

  // Search filter for sheet
  const [searchDate, setSearchDate] = useState('');

  // Switch form state
  const [switchOperator, setSwitchOperator] = useState('');
  const [switchMachine, setSwitchMachine] = useState('');
  const [switchStyle, setSwitchStyle] = useState('');
  const [switchSeam, setSwitchSeam] = useState('');
  const [switchOldNeedleId, setSwitchOldNeedleId] = useState<number>(1);
  const [switchNewNeedleId, setSwitchNewNeedleId] = useState<number>(2);

  // Broken form state
  const todayStr = new Date().toISOString().split('T')[0];
  const [brokenDate, setBrokenDate] = useState(todayStr);
  const [brokenStyle, setBrokenStyle] = useState('');
  const [brokenEpf, setBrokenEpf] = useState('');
  const [brokenMc, setBrokenMc] = useState('');
  const [brokenSeam, setBrokenSeam] = useState('');
  const [brokenNeedleId, setBrokenNeedleId] = useState<number>(1);
  const [brokenTime, setBrokenTime] = useState('14:30');
  const [brokenTraced, setBrokenTraced] = useState('N');

  // New Type state
  const [newSystem, setNewSystem] = useState('DB X K5');
  const [newSize, setNewSize] = useState('');
  const [newRef, setNewRef] = useState('');
  const [newPoint, setNewPoint] = useState('FFG/SES');
  const [newStock, setNewStock] = useState(100);

  // Restock state
  const [restockNeedleId, setRestockNeedleId] = useState<number>(1);
  const [restockQty, setRestockQty] = useState(100);

  // CLN checklist state
  const [clnDate, setClnDate] = useState(todayStr);
  const [clnEpf, setClnEpf] = useState('EMP-012');
  const [clnStyle, setClnStyle] = useState('ST-102 Nike');
  const [clnMachine, setClnMachine] = useState('Mac 02');

  useEffect(() => {
    const savedNeedles = localStorage.getItem('dinusha_needle_types_v4');
    const savedLogs = localStorage.getItem('dinusha_needle_logs_v4');

    if (savedNeedles) setNeedleTypes(JSON.parse(savedNeedles));
    else {
      setNeedleTypes(DEFAULT_NEEDLES);
      localStorage.setItem('dinusha_needle_types_v4', JSON.stringify(DEFAULT_NEEDLES));
    }

    if (savedLogs) setRecordLogs(JSON.parse(savedLogs));
    else {
      setRecordLogs(DEFAULT_LOGS);
      localStorage.setItem('dinusha_needle_logs_v4', JSON.stringify(DEFAULT_LOGS));
    }
  }, []);

  const persistNeedles = (updated: NeedleType[]) => {
    setNeedleTypes(updated);
    localStorage.setItem('dinusha_needle_types_v4', JSON.stringify(updated));
  };

  const persistLogs = (updated: RecordLog[]) => {
    setRecordLogs(updated);
    localStorage.setItem('dinusha_needle_logs_v4', JSON.stringify(updated));
  };

  // Switch Needle Handler (Auto Stock In old + Stock Out new)
  const handleSwitchNeedle = (e: React.FormEvent) => {
    e.preventDefault();
    const reqNeedle = needleTypes.find((n) => n.id === switchNewNeedleId);
    const oldNeedle = needleTypes.find((n) => n.id === switchOldNeedleId);

    if (!reqNeedle || reqNeedle.stock <= 0) {
      alert('Requested needle type is out of stock.');
      return;
    }

    // Adjust Stocks: old Needle +1, new Needle -1
    const updatedNeedles = needleTypes.map((n) => {
      if (n.id === switchNewNeedleId) return { ...n, stock: n.stock - 1 };
      if (oldNeedle && n.id === switchOldNeedleId) return { ...n, stock: n.stock + 1 };
      return n;
    });

    const now = new Date();
    const newLog: RecordLog = {
      id: Date.now(),
      date: now.toISOString().split('T')[0],
      styleNo: switchStyle || 'General',
      epfNo: switchOperator || 'Operator',
      seamLocation: switchSeam || 'Seam',
      size: reqNeedle.size,
      type: reqNeedle.system,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      traced: '-',
      mcNumber: switchMachine || 'Mac 01',
      sign: (switchOperator || 'Op').split('/')[0],
      actionType: 'SWITCH',
    };

    persistNeedles(updatedNeedles);
    persistLogs([newLog, ...recordLogs]);

    setSwitchOperator('');
    setSwitchMachine('');
    setSwitchStyle('');
    setSwitchSeam('');
    setActiveTab('sheet');
  };

  // Record Broken Needle Handler (Deduct -1)
  const handleRecordBroken = (e: React.FormEvent) => {
    e.preventDefault();
    const needle = needleTypes.find((n) => n.id === brokenNeedleId);
    if (!needle || needle.stock <= 0) {
      alert('Selected needle is out of stock.');
      return;
    }

    const updatedNeedles = needleTypes.map((n) =>
      n.id === brokenNeedleId ? { ...n, stock: n.stock - 1 } : n
    );

    const newLog: RecordLog = {
      id: Date.now(),
      date: brokenDate,
      styleNo: brokenStyle || '-',
      epfNo: brokenEpf || '-',
      seamLocation: brokenSeam || '-',
      size: needle.size,
      type: needle.system,
      time: brokenTime,
      traced: brokenTraced,
      mcNumber: brokenMc || '-',
      sign: '',
      actionType: 'BROKEN',
    };

    persistNeedles(updatedNeedles);
    persistLogs([newLog, ...recordLogs]);

    setBrokenStyle('');
    setBrokenEpf('');
    setBrokenMc('');
    setBrokenSeam('');
    setActiveTab('sheet');
  };

  // Bulk Restock Handler
  const handleRestock = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = needleTypes.map((n) =>
      n.id === restockNeedleId ? { ...n, stock: n.stock + restockQty } : n
    );
    persistNeedles(updated);
    setActiveTab('inventory');
  };

  // New Type Handler
  const handleSaveNewType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSystem || !newSize) return;

    const newNeedle: NeedleType = {
      id: Date.now(),
      system: newSystem,
      size: newSize,
      ref: newRef || 'GEN-01',
      point: newPoint,
      stock: newStock,
    };

    persistNeedles([...needleTypes, newNeedle]);
    setNewSize('');
    setNewRef('');
    setActiveTab('inventory');
  };

  // Filtered Sheet Logs
  const filteredLogs = searchDate
    ? recordLogs.filter((r) => r.date === searchDate)
    : recordLogs;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Action Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs no-print">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'inventory'
                ? 'bg-persian-800 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Stock Directory</span>
          </button>

          <button
            onClick={() => setActiveTab('sheet')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'sheet'
                ? 'bg-persian-800 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Broken & Issued Sheet</span>
          </button>

          <button
            onClick={() => setActiveTab('cln')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'cln'
                ? 'bg-persian-800 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Tesco CLN-01 Form</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('switch')}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-md transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Switch Needle</span>
          </button>

          <button
            onClick={() => setActiveTab('broken')}
            className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md transition-all"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Log Broken</span>
          </button>

          <button
            onClick={() => setActiveTab('restock')}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition-all"
          >
            <PackagePlus className="w-3.5 h-3.5" />
            <span>Restock</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: INVENTORY & GROZ-BECKERT CARDS */}
      {/* ============================================================== */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-black text-sm uppercase text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Groz-Beckert Needle Stock Directory (5 Factory Standard Lines)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Low Stock Threshold: Stock ≤ {LOW_STOCK_THRESHOLD} Pcs triggers automatic audit alerts
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200">
              Total Types: {needleTypes.length}
            </span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {needleTypes.map((n) => {
              const isLow = n.stock <= LOW_STOCK_THRESHOLD;

              return (
                <div
                  key={n.id}
                  className={`bg-white rounded-3xl p-5 border shadow-xs flex flex-col justify-between relative overflow-hidden transition-all ${
                    isLow ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="bg-persian-800 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {n.system}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        Ref: {n.ref}
                      </span>
                    </div>

                    <h4 className="font-black text-slate-900 text-base mt-2">Size: {n.size}</h4>
                    <p className="text-xs font-semibold text-slate-500">Variant: {n.point}</p>
                  </div>

                  {isLow && (
                    <div className="mt-3 inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 font-black text-[9px] px-2.5 py-1 rounded-lg border border-rose-200 w-fit">
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      <span>LOW STOCK WARNING</span>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                    <span className="text-xs font-bold text-slate-500">In Stock:</span>
                    <span
                      className={`text-xl font-mono font-black ${
                        isLow ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {n.stock} Pcs
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Ledger Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h4 className="font-black text-xs uppercase text-slate-700">Detailed Needle Stock Ledger</h4>
              <span className="text-[11px] text-slate-400 font-semibold">
                Auto-syncs on needle swaps & breakage logs
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-100 text-slate-600 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4">Ref Code</th>
                    <th className="p-4">Needle System</th>
                    <th className="p-4">Size (Nm)</th>
                    <th className="p-4">Point Variant</th>
                    <th className="p-4">In Stock (Pcs)</th>
                    <th className="p-4">Compliance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {needleTypes.map((n) => {
                    const isLow = n.stock <= LOW_STOCK_THRESHOLD;
                    return (
                      <tr key={n.id} className="hover:bg-slate-50/80">
                        <td className="p-4 font-mono font-black text-persian-800">{n.ref}</td>
                        <td className="p-4 font-bold text-slate-800">{n.system}</td>
                        <td className="p-4 font-black text-slate-900">{n.size}</td>
                        <td className="p-4 text-slate-600">{n.point}</td>
                        <td className="p-4 font-mono font-black text-sm">
                          <span className={isLow ? 'text-rose-600' : 'text-emerald-700'}>
                            {n.stock} Pcs
                          </span>
                        </td>
                        <td className="p-4">
                          {isLow ? (
                            <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-rose-300">
                              REORDER REQUIRED
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                              Optimal Inventory
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: BROKEN & ISSUED RECORD SHEET */}
      {/* ============================================================== */}
      {activeTab === 'sheet' && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 printable-area space-y-6">
          <div className="border-b-2 border-slate-900 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                DINUSHA EMBROIDERY
              </h1>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                NEEDLE BROKEN & EXCHANGE RECORD SHEET
              </h2>
            </div>
            <div className="text-right text-xs font-bold text-slate-700 space-y-1">
              <div>Floor Incharge: Saman P.</div>
              <div>Week No: WK-41</div>
            </div>
          </div>

          {/* Search Bar no-print */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl no-print flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-700">Filter Log by Date:</span>
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold outline-none"
            />
            {searchDate && (
              <button
                onClick={() => setSearchDate('')}
                className="text-xs font-bold text-rose-600 hover:underline"
              >
                Clear Filter
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="ml-auto inline-flex items-center gap-1.5 bg-persian-800 hover:bg-persian-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Audit Sheet</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse border border-slate-900">
              <thead className="bg-[#f0f4fa] text-slate-900 font-black uppercase text-[10px] border-b-2 border-slate-900">
                <tr>
                  <th className="border border-slate-900 p-2.5 w-24">DATE</th>
                  <th className="border border-slate-900 p-2.5 w-28">STYLE NO.</th>
                  <th className="border border-slate-900 p-2.5 w-28">EPF NO / NAME</th>
                  <th className="border border-slate-900 p-2.5 w-28">SEAM LOCATION</th>
                  <th className="border border-slate-900 p-2.5 w-24">NEEDLE SIZE</th>
                  <th className="border border-slate-900 p-2.5 w-28">NEEDLE TYPE</th>
                  <th className="border border-slate-900 p-2.5 w-20">TIME</th>
                  <th className="border border-slate-900 p-2.5 w-20 text-center">TRACED Y/N</th>
                  <th className="border border-slate-900 p-2.5 w-24">MC NUMBER</th>
                  <th className="border border-slate-900 p-2.5 w-24">SIGN</th>
                  <th className="border border-slate-900 p-2.5 text-center w-56">
                    REF. NEEDLE PARTS (PHYSICAL TAPE AREA / ACTION)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-slate-900 font-medium">
                {filteredLogs.map((log) => {
                  let tapeCell = null;
                  if (log.actionType === 'BROKEN' || log.actionType === 'BLUNT') {
                    tapeCell = (
                      <div className="border-2 border-dashed border-slate-400 bg-slate-50 p-2 rounded text-center h-12 flex flex-col justify-center items-center">
                        <span className="text-[9px] text-slate-400 font-bold uppercase">
                          Tape Needle Part Here
                        </span>
                        <span className="text-[8px] text-slate-500 font-mono">
                          ({log.actionType})
                        </span>
                      </div>
                    );
                  } else if (log.actionType === 'SWITCH') {
                    tapeCell = (
                      <div className="bg-blue-100 text-blue-900 font-black text-xs p-2 rounded text-center border border-blue-300 tracking-wider">
                        SWITCHED
                      </div>
                    );
                  } else {
                    tapeCell = (
                      <div className="bg-rose-100 text-rose-800 font-black text-xs p-2 rounded text-center border border-rose-300 tracking-wider">
                        MISSING
                      </div>
                    );
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="border border-slate-900 p-2 font-mono font-bold">
                        {log.date}
                      </td>
                      <td className="border border-slate-900 p-2 font-semibold">{log.styleNo}</td>
                      <td className="border border-slate-900 p-2 font-bold">{log.epfNo}</td>
                      <td className="border border-slate-900 p-2 text-slate-700">
                        {log.seamLocation}
                      </td>
                      <td className="border border-slate-900 p-2 font-mono font-bold">
                        ({log.size})
                      </td>
                      <td className="border border-slate-900 p-2 font-bold">{log.type}</td>
                      <td className="border border-slate-900 p-2 font-mono">{log.time}</td>
                      <td className="border border-slate-900 p-2 text-center font-bold">
                        {log.traced}
                      </td>
                      <td className="border border-slate-900 p-2 font-bold">{log.mcNumber}</td>
                      <td className="border border-slate-900 p-2 font-mono">{log.sign || '—'}</td>
                      <td className="border border-slate-900 p-1.5 bg-slate-50/50">{tapeCell}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border border-slate-900 p-4 rounded-xl text-xs bg-slate-50 text-slate-800 space-y-1">
            <p className="font-bold">Instructions for Physical Factory File:</p>
            <p>
              • <strong>Broken / Blunt Needles:</strong> Adhere all retrieved broken needle pieces
              into the designated box using clear transparent cellophane tape.
            </p>
            <p>
              • <strong>Missing / Switch:</strong> The system stamps &apos;MISSING&apos; or
              &apos;SWITCHED&apos; automatically with audit trail verification.
            </p>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: TESCO CLN-01 CHECKLIST FORM */}
      {/* ============================================================== */}
      {activeTab === 'cln' && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 printable-area space-y-6">
          <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-black text-slate-900 uppercase">
                DINUSHA EMBROIDERY (PVT) LTD
              </h1>
              <p className="text-xs font-bold text-slate-700 uppercase">
                Check List for Missing Needle Parts Production (CLN-01)
              </p>
            </div>
            <div className="text-right">
              <span className="border-2 border-slate-900 font-black px-2.5 py-1 text-xs uppercase inline-block">
                Doc Ref: CLN-01
              </span>
              <button
                onClick={() => window.print()}
                className="mt-2 block no-print bg-persian-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg"
              >
                Print CLN Form
              </button>
            </div>
          </div>

          {/* Form Meta Fields */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-300">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Date</label>
              <input
                type="date"
                value={clnDate}
                onChange={(e) => setClnDate(e.target.value)}
                className="w-full bg-white border border-slate-300 p-2 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Section</label>
              <input
                type="text"
                defaultValue="Embroidery Floor"
                className="w-full bg-white border border-slate-300 p-2 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Needle Specification</label>
              <input
                type="text"
                defaultValue="DB X K5 / 75/11"
                className="w-full bg-white border border-slate-300 p-2 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Operator EPF No</label>
              <input
                type="text"
                value={clnEpf}
                onChange={(e) => setClnEpf(e.target.value)}
                className="w-full bg-white border border-slate-300 p-2 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Style No</label>
              <input
                type="text"
                value={clnStyle}
                onChange={(e) => setClnStyle(e.target.value)}
                className="w-full bg-white border border-slate-300 p-2 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Operation</label>
              <input
                type="text"
                defaultValue="Chest Logo Embroidery"
                className="w-full bg-white border border-slate-300 p-2 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Machine Number</label>
              <input
                type="text"
                value={clnMachine}
                onChange={(e) => setClnMachine(e.target.value)}
                className="w-full bg-white border border-slate-300 p-2 rounded-lg font-bold"
              />
            </div>
          </div>

          {/* 6 Verification Checkpoints */}
          <div className="space-y-3 text-xs border-t border-slate-200 pt-4">
            <div className="p-3.5 border border-slate-300 rounded-xl bg-slate-50/70 flex justify-between items-center">
              <span className="font-bold text-slate-900">
                1. Did you check all garments/parts/bundles around 2m radius using magnet?
              </span>
              <select className="border border-slate-300 bg-white p-1.5 rounded-lg font-bold">
                <option>Yes (ඔව්)</option>
                <option>No (නැත)</option>
              </select>
            </div>

            <div className="p-3.5 border border-slate-300 rounded-xl bg-slate-50/70 flex justify-between items-center">
              <span className="font-bold text-slate-900">
                2. Did you check &apos;machine inside&apos; for missing broken parts?
              </span>
              <select className="border border-slate-300 bg-white p-1.5 rounded-lg font-bold">
                <option>Yes (ඔව්)</option>
                <option>No (නැත)</option>
              </select>
            </div>

            <div className="p-3.5 border border-slate-300 rounded-xl bg-slate-50/70 flex justify-between items-center">
              <span className="font-bold text-slate-900">
                3. Did you check garments using conveyor metal detector machine?
              </span>
              <select className="border border-slate-300 bg-white p-1.5 rounded-lg font-bold">
                <option>Yes (ඔව්)</option>
                <option>No (නැත)</option>
              </select>
            </div>

            <div className="p-3.5 border border-slate-300 rounded-xl bg-slate-50/70 flex justify-between items-center">
              <span className="font-bold text-slate-900">
                4. What is the quantity of metal detected?
              </span>
              <div className="flex items-center gap-1 font-bold">
                <input
                  type="number"
                  defaultValue={0}
                  className="w-20 p-1.5 border border-slate-300 bg-white rounded-lg text-center"
                />
                <span>Pcs</span>
              </div>
            </div>

            <div className="p-3.5 border border-slate-300 rounded-xl bg-slate-50/70 flex justify-between items-center">
              <span className="font-bold text-slate-900">
                5. Did you remove the affected garment from section immediately?
              </span>
              <select className="border border-slate-300 bg-white p-1.5 rounded-lg font-bold">
                <option>Yes (ඔව්)</option>
                <option>No (නැත)</option>
              </select>
            </div>

            <div className="p-3.5 border border-slate-300 rounded-xl bg-slate-50/70 flex justify-between items-center">
              <span className="font-bold text-slate-900">
                6. Did you inform this issue to your APM? (Total search time)
              </span>
              <input
                type="text"
                defaultValue="25 Mins"
                className="w-32 p-1.5 border border-slate-300 bg-white rounded-lg text-center font-bold"
              />
            </div>
          </div>

          <div className="p-3.5 border-2 border-slate-900 text-xs text-center font-bold bg-slate-100">
            We certify that the factory response team has performed comprehensive searches to retrieve
            the broken needle piece in full compliance with Tesco Safety standards before authorizing
            needle re-issuance.
          </div>

          <div className="grid grid-cols-3 gap-6 pt-10 text-xs text-center border-t border-slate-300">
            <div>
              <div className="h-8 border-b border-slate-400 mb-1" />
              <p className="font-bold">Production Safety Executive</p>
            </div>
            <div>
              <div className="h-8 border-b border-slate-400 mb-1" />
              <p className="font-bold">Quality Assurance Manager</p>
            </div>
            <div>
              <div className="h-8 border-b border-slate-400 mb-1" />
              <p className="font-bold">Operations Director</p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: SWITCH NEEDLE ACTION WIZARD */}
      {/* ============================================================== */}
      {activeTab === 'switch' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm max-w-xl mx-auto overflow-hidden">
          <div className="bg-persian-800 text-white p-5 flex items-center justify-between">
            <h3 className="font-black text-sm flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-400" />
              <span>Switch Needle (Auto Inventory Stock Adjustment)</span>
            </h3>
          </div>

          <form onSubmit={handleSwitchNeedle} className="p-6 space-y-4">
            <div className="bg-blue-50 border-l-4 border-persian-600 p-3.5 rounded-r-xl">
              <p className="text-xs font-bold text-persian-900">
                Action: Old carried needle is returned (+1 credited to stock), while the newly
                requested needle is issued (-1 deducted). An audit record is automatically logged.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Operator EPF / Name *
                </label>
                <input
                  type="text"
                  value={switchOperator}
                  onChange={(e) => setSwitchOperator(e.target.value)}
                  placeholder="e.g. Hiruna (55)"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-persian-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Machine Number *
                </label>
                <input
                  type="text"
                  value={switchMachine}
                  onChange={(e) => setSwitchMachine(e.target.value)}
                  placeholder="e.g. Machine 08"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-persian-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Style Code</label>
                <input
                  type="text"
                  value={switchStyle}
                  onChange={(e) => setSwitchStyle(e.target.value)}
                  placeholder="e.g. ST-102 Nike"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Seam Location</label>
                <input
                  type="text"
                  value={switchSeam}
                  onChange={(e) => setSwitchSeam(e.target.value)}
                  placeholder="e.g. Front Crest"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none"
                />
              </div>
            </div>

            {/* Old Needle Dropdown */}
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
              <label className="block text-xs font-black text-amber-900">
                1. Carried / Old Needle Being Returned (+1 Stock Credited)
              </label>
              <select
                value={switchOldNeedleId}
                onChange={(e) => setSwitchOldNeedleId(parseInt(e.target.value))}
                className="w-full bg-white border border-amber-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none"
              >
                {needleTypes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.system} - Size: {n.size} (Current Stock: {n.stock} Pcs)
                  </option>
                ))}
              </select>
            </div>

            {/* New Needle Dropdown */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1">
              <label className="block text-xs font-black text-emerald-900">
                2. Requested New Needle Type (-1 Stock Deducted)
              </label>
              <select
                value={switchNewNeedleId}
                onChange={(e) => setSwitchNewNeedleId(parseInt(e.target.value))}
                className="w-full bg-white border border-emerald-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none"
              >
                {needleTypes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.system} - Size: {n.size} (Current Stock: {n.stock} Pcs)
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wider shadow-md transition-all"
            >
              Process Needle Switch & Record Log
            </button>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: RECORD BROKEN NEEDLE */}
      {/* ============================================================== */}
      {activeTab === 'broken' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm max-w-xl mx-auto overflow-hidden">
          <div className="bg-rose-900 text-white p-5 flex items-center justify-between">
            <h3 className="font-black text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-300" />
              <span>Record Broken Needle Audit Log</span>
            </h3>
          </div>

          <form onSubmit={handleRecordBroken} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={brokenDate}
                  onChange={(e) => setBrokenDate(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Time</label>
                <input
                  type="time"
                  value={brokenTime}
                  onChange={(e) => setBrokenTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  EPF No / Name *
                </label>
                <input
                  type="text"
                  value={brokenEpf}
                  onChange={(e) => setBrokenEpf(e.target.value)}
                  placeholder="e.g. Hiruna"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Machine Number *
                </label>
                <input
                  type="text"
                  value={brokenMc}
                  onChange={(e) => setBrokenMc(e.target.value)}
                  placeholder="08"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Style No</label>
                <input
                  type="text"
                  value={brokenStyle}
                  onChange={(e) => setBrokenStyle(e.target.value)}
                  placeholder="e.g. Laklo"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Seam Location</label>
                <input
                  type="text"
                  value={brokenSeam}
                  onChange={(e) => setBrokenSeam(e.target.value)}
                  placeholder="Front Panel"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Broken Needle Specification (Stock -1) *
              </label>
              <select
                value={brokenNeedleId}
                onChange={(e) => setBrokenNeedleId(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold outline-none"
              >
                {needleTypes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.system} - Size: {n.size} (Stock: {n.stock})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Traced Broken Parts?
              </label>
              <select
                value={brokenTraced}
                onChange={(e) => setBrokenTraced(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold outline-none"
              >
                <option value="Y">Y (Yes, all parts found)</option>
                <option value="N">N (No, parts missing)</option>
              </select>
            </div>

            <div className="p-4 border-2 border-dashed border-rose-300 bg-rose-50/50 rounded-2xl text-center">
              <span className="text-xs font-bold text-rose-800 block">
                Attach Returned Needle Part in Physical Record Binder
              </span>
              <span className="text-[10px] text-slate-500">
                Cellophane tape will be applied directly on the physical sheet.
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-black text-xs uppercase tracking-wider shadow-md transition-all"
            >
              Log Broken Needle & Deduct Stock
            </button>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 6: BULK RESTOCK */}
      {/* ============================================================== */}
      {activeTab === 'restock' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm max-w-md mx-auto overflow-hidden">
          <div className="bg-persian-800 text-white p-5">
            <h3 className="font-black text-sm flex items-center gap-2">
              <PackagePlus className="w-4 h-4 text-emerald-400" />
              <span>Bulk Restock Needle Inventory</span>
            </h3>
          </div>

          <form onSubmit={handleRestock} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Needle Line
              </label>
              <select
                value={restockNeedleId}
                onChange={(e) => setRestockNeedleId(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold outline-none"
              >
                {needleTypes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.system} - Size: {n.size} (Current: {n.stock} Pcs)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Quantity to Restock (Pcs) *
              </label>
              <input
                type="number"
                min="10"
                value={restockQty}
                onChange={(e) => setRestockQty(parseInt(e.target.value) || 0)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-black text-emerald-700 outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs uppercase shadow-md transition-all"
            >
              Credit Stock In
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
