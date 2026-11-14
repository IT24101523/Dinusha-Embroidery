'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { EmployeeEntity } from '@/modules/payroll/domain/entities';
import {
  Boxes,
  FileText,
  ShieldAlert,
  RefreshCw,
  AlertTriangle,
  PlusCircle,
  PackagePlus,
  Printer,
  CheckCircle2,
  AlertCircle,
  Search,
  Pin,
  ShieldCheck,
} from 'lucide-react';

const LOW_STOCK_THRESHOLD = 200;
const MAX_STOCK_LIMIT = 50000;
const MAX_RESTOCK_QTY = 50000;
const STORAGE_TYPES_KEY = 'dinusha_needle_types_v2';
const STORAGE_LOGS_KEY = 'dinusha_needle_logs_v2';

const SECTION_OPTIONS = [
  'Embroidery Floor',
  'Production',
  'Finishing',
  'Quality Checking',
  'Sample Room',
];

const PRODUCTION_OPTIONS = [
  'Export Bulk',
  'Sample',
  'Rework',
  'Urgent Order',
  'Trial Run',
];

const OPERATION_OPTIONS = [
  'Chest Logo Embroidery',
  'Back Crest Embroidery',
  'Sleeve Badge',
  'Floral Embroidery',
  'Collar / Cuff Embroidery',
  'Front Panel',
  'Side Pocket',
];

const MACHINE_OPTIONS = Array.from({ length: 13 }, (_, i) =>
  `Machine ${String(i + 1).padStart(2, '0')}`
);

const SEARCH_TIME_OPTIONS = [
  '5 Mins',
  '10 Mins',
  '15 Mins',
  '20 Mins',
  '30 Mins',
  '45 Mins',
  '1 Hour',
  '1.5 Hours',
  '2 Hours',
];

export interface NeedleTypeItem {
  id: number;
  system: string;
  size: string;
  ref: string;
  point: string;
  stock: number;
}

export type NeedleActionType = 'BROKEN' | 'BLUNT' | 'MISSING' | 'SWITCH';

export interface NeedleRecordLog {
  id: number;
  date: string;
  styleNo: string;
  epfNo: string;
  seamLocation: string;
  size: string;
  type: string;
  time: string;
  traced: 'Y' | 'N' | '-';
  mcNumber: string;
  sign: string;
  actionType: NeedleActionType;
}

const DEFAULT_NEEDLE_TYPES: NeedleTypeItem[] = [];

const DEFAULT_RECORD_LOGS: NeedleRecordLog[] = [];

type NeedleSubTab =
  | 'inventory'
  | 'recordSheet'
  | 'cln'
  | 'switchNeedle'
  | 'recordBroken'
  | 'stockManage';

interface NeedleManagementProps {
  employees: EmployeeEntity[];
}

export function NeedleManagement({ employees }: NeedleManagementProps) {
  const [subTab, setSubTab] = useState<NeedleSubTab>('inventory');
  const [needleTypes, setNeedleTypes] = useState<NeedleTypeItem[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_NEEDLE_TYPES;
    try {
      const saved = localStorage.getItem(STORAGE_TYPES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as NeedleTypeItem[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore storage errors
    }
    return DEFAULT_NEEDLE_TYPES;
  });
  const [recordLogs, setRecordLogs] = useState<NeedleRecordLog[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_RECORD_LOGS;
    try {
      const saved = localStorage.getItem(STORAGE_LOGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as NeedleRecordLog[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore storage errors
    }
    return DEFAULT_RECORD_LOGS;
  });

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Record Sheet header & filter
  const [floorIncharge, setFloorIncharge] = useState('');
  const [weekNo, setWeekNo] = useState('');
  const [searchDate, setSearchDate] = useState('');

  // Switch Needle form
  const [switchOperator, setSwitchOperator] = useState('');
  const [switchMachine, setSwitchMachine] = useState('');
  const [switchStyle, setSwitchStyle] = useState('');
  const [switchSeam, setSwitchSeam] = useState('');
  const [switchCarriedId, setSwitchCarriedId] = useState<number>(0);
  const [switchRequestedId, setSwitchRequestedId] = useState<number>(0);

  // Record Broken / Blunt form (all parts must be traced; missing parts go to CLN tab)
  const todayStr = new Date().toISOString().split('T')[0];
  const [brokenDate, setBrokenDate] = useState(todayStr);
  const [brokenStyle, setBrokenStyle] = useState('');
  const [brokenEpf, setBrokenEpf] = useState('');
  const [brokenMc, setBrokenMc] = useState('');
  const [brokenSeam, setBrokenSeam] = useState('');
  const [brokenNeedleId, setBrokenNeedleId] = useState<number>(0);
  const [brokenTime, setBrokenTime] = useState('');
  const [brokenActionType, setBrokenActionType] = useState<'BROKEN' | 'BLUNT'>('BROKEN');

  // New Needle Type form
  const [newSystem, setNewSystem] = useState('');
  const [newSize, setNewSize] = useState('');
  const [newRef, setNewRef] = useState('');
  const [newPoint, setNewPoint] = useState('');
  const [newStock, setNewStock] = useState(0);

  // Bulk Restock form
  const [restockNeedleId, setRestockNeedleId] = useState<number>(0);
  const [restockQty, setRestockQty] = useState(0);

  // CLN Form fields (100% matching official CLN-01 form)
  const [clnDate, setClnDate] = useState(todayStr);
  const [clnBrokenTime, setClnBrokenTime] = useState('');
  const [clnLetterIssueTime, setClnLetterIssueTime] = useState('');
  const [clnNeedleIssueTime, setClnNeedleIssueTime] = useState('');
  const [clnSection, setClnSection] = useState('');
  const [clnProduction, setClnProduction] = useState('');
  const [clnNeedleSpec, setClnNeedleSpec] = useState('');
  const [clnEpf, setClnEpf] = useState('');
  const [clnStyle, setClnStyle] = useState('');
  const [clnOperation, setClnOperation] = useState('');
  const [clnMachine, setClnMachine] = useState('');
  const [clnQ1Mechanic, setClnQ1Mechanic] = useState('');
  const [clnQ1Answer, setClnQ1Answer] = useState<'' | 'Yes' | 'No'>('');
  const [clnQ2Mechanic, setClnQ2Mechanic] = useState('');
  const [clnQ2Answer, setClnQ2Answer] = useState<'' | 'Yes' | 'No'>('');
  const [clnQ3Answer, setClnQ3Answer] = useState<'' | 'Yes' | 'No'>('');
  const [clnMetalQty, setClnMetalQty] = useState<number>(0);
  const [clnQ5Answer, setClnQ5Answer] = useState<'' | 'Yes' | 'No'>('');
  const [clnSearchTime, setClnSearchTime] = useState('');
  const [clnRevNo, setClnRevNo] = useState('');
  const [clnRevDate, setClnRevDate] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TYPES_KEY, JSON.stringify(needleTypes));
    } catch {
      // Ignore storage errors
    }
  }, [needleTypes]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(recordLogs));
    } catch {
      // Ignore storage errors
    }
  }, [recordLogs]);

  const lowStockCount = useMemo(
    () => needleTypes.filter((n) => n.stock <= LOW_STOCK_THRESHOLD).length,
    [needleTypes]
  );

  const totalStockPcs = useMemo(
    () => needleTypes.reduce((sum, n) => sum + (n.stock || 0), 0),
    [needleTypes]
  );

  const filteredLogs = useMemo(() => {
    if (!searchDate) return recordLogs;
    return recordLogs.filter((r) => r.date === searchDate);
  }, [recordLogs, searchDate]);

  const clnNeedleOptions = useMemo(() => {
    const fromStock = Array.from(new Set(needleTypes.map((n) => `${n.system} / ${n.size}`)));
    if (clnNeedleSpec && !fromStock.includes(clnNeedleSpec)) {
      return [clnNeedleSpec, ...fromStock];
    }
    return fromStock;
  }, [needleTypes, clnNeedleSpec]);

  const showSuccess = (text: string) => {
    setStatusMsg({ type: 'success', text });
  };

  const showError = (text: string) => {
    setStatusMsg({ type: 'error', text });
  };

  const handleSwitchNeedle = (e: React.FormEvent) => {
    e.preventDefault();
    if (needleTypes.length === 0) {
      showError('Please add at least one needle type in Stock Directory before switching.');
      return;
    }

    const operatorText = switchOperator.trim();
    const machineText = switchMachine.trim();
    const styleText = switchStyle.trim();
    const seamText = switchSeam.trim();

    if (operatorText.length < 2 || operatorText.length > 80) {
      showError('Please select or enter a valid Operator EPF / Name (2-80 characters).');
      return;
    }
    if (!machineText || machineText.length > 30) {
      showError('Please select or enter a valid Machine Number.');
      return;
    }
    if (!styleText || styleText.length > 60) {
      showError('Please enter a valid Style Number (max 60 characters).');
      return;
    }
    if (!seamText || seamText.length > 60) {
      showError('Please enter a valid Seam Location (max 60 characters).');
      return;
    }

    const reqNeedle = needleTypes.find((n) => n.id === switchRequestedId);
    const carNeedle = needleTypes.find((n) => n.id === switchCarriedId);

    if (!carNeedle) {
      showError('Please select the carried / old needle being returned.');
      return;
    }
    if (!reqNeedle) {
      showError('Please select the requested new needle type.');
      return;
    }
    if (reqNeedle.stock <= 0) {
      showError(`Requested needle (${reqNeedle.system} ${reqNeedle.size}) is out of stock.`);
      return;
    }
    if (carNeedle.id !== reqNeedle.id && carNeedle.stock + 1 > MAX_STOCK_LIMIT) {
      showError(`Stock limit (${MAX_STOCK_LIMIT.toLocaleString()} Pcs) exceeded for returned needle.`);
      return;
    }

    setNeedleTypes((prev) =>
      prev.map((n) => {
        if (n.id === reqNeedle.id && carNeedle.id === reqNeedle.id) {
          return n;
        }
        if (n.id === reqNeedle.id) return { ...n, stock: Math.max(0, n.stock - 1) };
        if (n.id === carNeedle.id) return { ...n, stock: n.stock + 1 };
        return n;
      })
    );

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newLog: NeedleRecordLog = {
      id: Date.now(),
      date: dateStr,
      styleNo: styleText,
      epfNo: operatorText,
      seamLocation: seamText,
      size: reqNeedle.size,
      type: reqNeedle.system,
      time: timeStr,
      traced: '-',
      mcNumber: machineText,
      sign: operatorText.split('/')[0].trim(),
      actionType: 'SWITCH',
    };

    setRecordLogs((prev) => [newLog, ...prev]);
    setSwitchOperator('');
    setSwitchMachine('');
    setSwitchStyle('');
    setSwitchSeam('');
    showSuccess(`Switched needle to ${reqNeedle.system} (${reqNeedle.size}) & recorded.`);
    setSubTab('recordSheet');
  };

  const handleBrokenRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (needleTypes.length === 0) {
      showError('Please add at least one needle type in Stock Directory first.');
      return;
    }
    if (!brokenDate || brokenDate > todayStr) {
      showError('Please enter a valid date (today or earlier).');
      return;
    }
    if (!brokenStyle.trim() || brokenStyle.trim().length > 60) {
      showError('Please enter a valid Style No. (max 60 characters).');
      return;
    }
    if (brokenEpf.trim().length < 2 || brokenEpf.trim().length > 80) {
      showError('Please select or enter a valid EPF No / Name (2-80 characters).');
      return;
    }
    if (!brokenMc.trim() || brokenMc.trim().length > 30) {
      showError('Please select or enter a valid MC Number.');
      return;
    }
    if (!brokenSeam.trim() || brokenSeam.trim().length > 60) {
      showError('Please enter a valid Seam Location (max 60 characters).');
      return;
    }
    if (!brokenTime.trim()) {
      showError('Please enter the time of the incident.');
      return;
    }

    const reqNeedle = needleTypes.find((n) => n.id === brokenNeedleId);
    if (!reqNeedle) {
      showError('Please select a valid Needle Spec.');
      return;
    }
    if (reqNeedle.stock <= 0) {
      showError(`Selected needle (${reqNeedle.system} ${reqNeedle.size}) is out of stock.`);
      return;
    }

    setNeedleTypes((prev) =>
      prev.map((n) => (n.id === reqNeedle.id ? { ...n, stock: Math.max(0, n.stock - 1) } : n))
    );

    const newLog: NeedleRecordLog = {
      id: Date.now(),
      date: brokenDate,
      styleNo: brokenStyle.trim(),
      epfNo: brokenEpf.trim(),
      seamLocation: brokenSeam.trim(),
      size: reqNeedle.size,
      type: reqNeedle.system,
      time: brokenTime.trim(),
      traced: 'Y',
      mcNumber: brokenMc.trim(),
      sign: '',
      actionType: brokenActionType,
    };

    setRecordLogs((prev) => [newLog, ...prev]);

    setBrokenStyle('');
    setBrokenEpf('');
    setBrokenMc('');
    setBrokenSeam('');
    setBrokenTime('');
    showSuccess(
      `Recorded ${brokenActionType} needle (${reqNeedle.system} ${reqNeedle.size}) & deducted 1 Pc from stock.`
    );
    setSubTab('recordSheet');
  };

  const handleSaveNewType = (e: React.FormEvent) => {
    e.preventDefault();
    const sys = newSystem.trim();
    const sz = newSize.trim();
    const refCode = newRef.trim();
    const pt = newPoint.trim();

    if (sys.length < 2 || sys.length > 30) {
      showError('Needle System Code must be between 2 and 30 characters.');
      return;
    }
    if (sz.length < 2 || sz.length > 20) {
      showError('Needle Size / Nm must be between 2 and 20 characters (e.g. 75/11).');
      return;
    }
    if (refCode.length > 30 || pt.length > 30) {
      showError('Ref Code and Point Variant must be 30 characters or less.');
      return;
    }
    const isDuplicate = needleTypes.some(
      (n) => n.system.toLowerCase() === sys.toLowerCase() && n.size.toLowerCase() === sz.toLowerCase()
    );
    if (isDuplicate) {
      showError(`Needle type "${sys} (${sz})" already exists. Use Bulk Restock to add stock.`);
      return;
    }

    const stockCount = Math.floor(Number(newStock));
    if (!Number.isFinite(stockCount) || stockCount < 0 || stockCount > MAX_STOCK_LIMIT) {
      showError(`Initial stock must be between 0 and ${MAX_STOCK_LIMIT.toLocaleString()} Pcs.`);
      return;
    }

    const item: NeedleTypeItem = {
      id: Date.now(),
      system: sys,
      size: sz,
      ref: refCode || '-',
      point: pt || '-',
      stock: stockCount,
    };

    setNeedleTypes((prev) => [...prev, item]);
    setNewSystem('');
    setNewSize('');
    setNewRef('');
    setNewPoint('');
    setNewStock(0);
    showSuccess(`Added new needle specification ${item.system} (${item.size}).`);
    setSubTab('inventory');
  };

  const handleRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (needleTypes.length === 0) {
      showError('Please register a needle type first before restocking.');
      return;
    }

    const target = needleTypes.find((n) => n.id === restockNeedleId);
    if (!target) {
      showError('Please select a needle type to restock.');
      return;
    }

    const qty = Math.floor(Number(restockQty));
    if (!Number.isFinite(qty) || qty <= 0 || qty > MAX_RESTOCK_QTY) {
      showError(`Restock quantity must be between 1 and ${MAX_RESTOCK_QTY.toLocaleString()} Pcs.`);
      return;
    }
    if (target.stock + qty > MAX_STOCK_LIMIT * 2) {
      showError(`Total stock cannot exceed ${(MAX_STOCK_LIMIT * 2).toLocaleString()} Pcs.`);
      return;
    }

    setNeedleTypes((prev) =>
      prev.map((n) => (n.id === restockNeedleId ? { ...n, stock: n.stock + qty } : n))
    );
    setRestockQty(0);
    showSuccess(`Added +${qty} Pcs to ${target.system} (${target.size}).`);
    setSubTab('inventory');
  };

  const handlePrintActiveView = () => {
    if (subTab === 'cln') {
      const missing: string[] = [];
      if (!clnDate || clnDate > todayStr) missing.push('Valid Date (today or earlier)');
      if (!clnSection) missing.push('Section');
      if (!clnProduction) missing.push('Production');
      if (!clnNeedleSpec) missing.push('Needle Type & Size');
      if (!clnEpf) missing.push('Operator EPF No');
      if (!clnStyle.trim()) missing.push('Style No');
      if (!clnOperation) missing.push('Operation');
      if (!clnMachine) missing.push('Machine Number');
      if (!clnQ1Answer) missing.push('Q1 (Yes/No)');
      if (!clnQ2Answer) missing.push('Q2 (Yes/No)');
      if (!clnQ3Answer) missing.push('Q3 (Yes/No)');
      if (!clnQ5Answer) missing.push('Q5 (Yes/No)');
      if (!clnSearchTime) missing.push('Q6 (Search Time)');

      if (missing.length > 0) {
        showError(`CLN-01: Please complete: ${missing.join(', ')}.`);
        return;
      }
      if (clnMetalQty < 0 || clnMetalQty > 10000) {
        showError('CLN-01: Quantity of metal detected must be between 0 and 10,000.');
        return;
      }
    }
    setStatusMsg(null);
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Studio Command Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-md flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0">
            <Pin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight">NEEDLE &amp; SAFETY STUDIO</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Tesco Audit Compliant
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Groz-Beckert stock control ({totalStockPcs.toLocaleString()} Pcs), broken/switch log &amp; CLN-01 missing needle checklist.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {lowStockCount > 0 && (
            <span className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-200 text-xs font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-300" />
              {lowStockCount} Low Stock
            </span>
          )}
          <button
            type="button"
            onClick={handlePrintActiveView}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Active View
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-2 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'inventory', label: 'Stock Directory', icon: Boxes },
              { id: 'recordSheet', label: 'Broken & Issued Sheet', icon: FileText },
              { id: 'cln', label: 'Missing Checklist (CLN)', icon: ShieldAlert },
              { id: 'switchNeedle', label: 'Switch Needle', icon: RefreshCw },
              { id: 'recordBroken', label: 'Record Broken', icon: AlertTriangle },
              { id: 'stockManage', label: 'New Type & Restock', icon: PackagePlus },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusMsg(null);
                  setSubTab(tab.id);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${active
                    ? 'bg-slate-900 text-white shadow-xs'
                    : tab.id === 'switchNeedle'
                      ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Banner */}
      {statusMsg && (
        <div
          className={`px-4 py-3 rounded-xl border text-xs font-semibold flex items-center gap-2 print:hidden ${statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Employee datalist for quick EPF / Name selection */}
      <datalist id="needle-employee-options">
        {employees.map((emp) => (
          <option key={emp.id} value={`EPF ${emp.epfNo} - ${emp.fullName}`} />
        ))}
      </datalist>

      {/* ================================================================= */}
      {/* TAB 1: NEEDLE STOCK DIRECTORY */}
      {/* ================================================================= */}
      {subTab === 'inventory' && (
        <div className="space-y-5">
          {needleTypes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-3">
              <Boxes className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-slate-800">
                  No Needle Types Added Yet
                </h3>
                <p className="text-xs text-slate-500">
                  Add your factory needle specifications first to track stock, switches, and broken records.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubTab('stockManage')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Add Needle Type
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {needleTypes.map((n) => {
                const isLow = n.stock <= LOW_STOCK_THRESHOLD;
                return (
                  <div
                    key={n.id}
                    className={`bg-white p-4 rounded-2xl border shadow-xs flex flex-col justify-between ${isLow ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200/90'
                      }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="bg-slate-900 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md uppercase">
                          {n.system}
                        </span>
                        <span className="text-[10px] font-mono font-semibold text-slate-400">
                          Ref: {n.ref}
                        </span>
                      </div>
                      <h4 className="font-black text-slate-900 text-sm">Size: {n.size}</h4>
                      <p className="text-[11px] font-medium text-slate-500">Variant: {n.point}</p>
                    </div>

                    <div className="mt-3 space-y-2">
                      {isLow && (
                        <div className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 font-extrabold text-[10px] px-2 py-0.5 rounded-md border border-rose-200">
                          <AlertTriangle className="w-3 h-3" /> LOW STOCK
                        </div>
                      )}
                      <div className="pt-2 border-t border-slate-100 flex justify-between items-baseline">
                        <span className="text-[11px] font-bold text-slate-500">In Stock</span>
                        <span
                          className={`text-lg font-mono font-black ${isLow ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                        >
                          {n.stock} <span className="text-[11px] font-sans">Pcs</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Detailed Needle Inventory Ledger (Threshold ≤ {LOW_STOCK_THRESHOLD} Pcs)
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">
                Total Types: {needleTypes.length}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-900 text-white uppercase text-[11px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Ref Code</th>
                    <th className="py-3 px-4">Needle System</th>
                    <th className="py-3 px-4">Size (Nm)</th>
                    <th className="py-3 px-4">Point Variant</th>
                    <th className="py-3 px-4">In Stock</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {needleTypes.map((n) => {
                    const isLow = n.stock <= LOW_STOCK_THRESHOLD;
                    return (
                      <tr key={n.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-700">{n.ref}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{n.system}</td>
                        <td className="py-3 px-4 font-extrabold text-slate-800">{n.size}</td>
                        <td className="py-3 px-4 text-slate-600">{n.point}</td>
                        <td
                          className={`py-3 px-4 font-mono font-black ${isLow ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                        >
                          {n.stock} Pcs
                        </td>
                        <td className="py-3 px-4">
                          {isLow ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                              LOW STOCK WARNING
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Optimal Stock
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setRestockNeedleId(n.id);
                              setSubTab('stockManage');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 font-bold text-[11px] transition cursor-pointer"
                          >
                            + Restock
                          </button>
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

      {/* ================================================================= */}
      {/* TAB 2: BROKEN & ISSUED RECORD SHEET */}
      {/* ================================================================= */}
      {subTab === 'recordSheet' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 print:border-none print:shadow-none print:p-0">
          <div className="border-b-2 border-black pb-3 mb-4 flex flex-wrap justify-between items-center gap-3">
            <div>
              <h2 className="text-xl font-black text-black uppercase tracking-tight">
                DINUSHA EMBROIDERY
              </h2>
              <p className="text-xs font-bold text-slate-800 uppercase">
                NEEDLE BROKEN &amp; EXCHANGE RECORD SHEET
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-800">
              <label className="flex items-center gap-1.5">
                Floor Incharge:
                <input
                  type="text"
                  value={floorIncharge}
                  onChange={(e) => setFloorIncharge(e.target.value)}
                  className="border-b border-black font-bold w-28 px-1 focus:outline-hidden bg-transparent"
                />
              </label>
              <label className="flex items-center gap-1.5">
                Week No:
                <input
                  type="text"
                  value={weekNo}
                  onChange={(e) => setWeekNo(e.target.value)}
                  className="border-b border-black font-bold w-20 px-1 focus:outline-hidden bg-transparent"
                />
              </label>
            </div>
          </div>

          {/* Filter Bar (Hidden on Print) */}
          <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-slate-400" />
              <label className="text-xs font-bold text-slate-700">Filter by Date:</label>
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
              />
              {searchDate && (
                <button
                  type="button"
                  onClick={() => setSearchDate('')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Showing {filteredLogs.length} records
            </span>
          </div>

          <div className="overflow-x-auto mb-4">
            <table className="w-full text-left text-[11px] border-collapse border border-black">
              <thead className="bg-slate-100 text-black font-extrabold uppercase text-[10px] border-b-2 border-black">
                <tr>
                  <th className="border border-black p-2">DATE</th>
                  <th className="border border-black p-2">STYLE NO.</th>
                  <th className="border border-black p-2">EPF NO / NAME</th>
                  <th className="border border-black p-2">SEAM LOCATION</th>
                  <th className="border border-black p-2">SIZE</th>
                  <th className="border border-black p-2">NEEDLE TYPE</th>
                  <th className="border border-black p-2">TIME</th>
                  <th className="border border-black p-2 text-center">TRACED</th>
                  <th className="border border-black p-2">MC NO</th>
                  <th className="border border-black p-2">SIGN</th>
                  <th className="border border-black p-2 text-center w-48">
                    REF. NEEDLE PARTS (TAPE AREA)
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="border border-black p-6 text-center text-slate-500">
                      No needle exchange records match this date.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="border border-black p-2 font-mono font-bold whitespace-nowrap">
                        {r.date}
                      </td>
                      <td className="border border-black p-2 font-semibold">{r.styleNo}</td>
                      <td className="border border-black p-2 font-semibold">{r.epfNo}</td>
                      <td className="border border-black p-2">{r.seamLocation}</td>
                      <td className="border border-black p-2 font-mono font-bold">({r.size})</td>
                      <td className="border border-black p-2 font-bold">{r.type}</td>
                      <td className="border border-black p-2 whitespace-nowrap">{r.time}</td>
                      <td className="border border-black p-2 text-center font-bold">{r.traced}</td>
                      <td className="border border-black p-2 font-bold">{r.mcNumber}</td>
                      <td className="border border-black p-2">{r.sign}</td>
                      <td className="border border-black p-1.5 bg-slate-50/50">
                        {r.actionType === 'BROKEN' || r.actionType === 'BLUNT' ? (
                          <div className="border-2 border-dashed border-slate-400 bg-white p-1 rounded text-center h-11 flex flex-col justify-center items-center">
                            <span className="text-[9px] text-slate-500 font-bold uppercase">
                              Tape Needle Part Here
                            </span>
                            <span className="text-[8px] text-slate-400">({r.actionType})</span>
                          </div>
                        ) : r.actionType === 'MISSING' ? (
                          <div className="bg-rose-100 text-rose-800 font-black text-[11px] p-1.5 rounded text-center border border-rose-300">
                            MISSING
                          </div>
                        ) : (
                          <div className="bg-indigo-100 text-indigo-900 font-black text-[11px] p-1.5 rounded text-center border border-indigo-300">
                            SWITCH
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border border-black p-3 rounded-lg text-[11px] bg-slate-50 text-slate-800 space-y-0.5">
            <p className="font-bold">Instructions for Physical Needle Issue File:</p>
            <p>
              • <strong>Broken / Blunt Needles:</strong> Stick returned needle parts into the
              right-hand box using clear transparent tape.
            </p>
            <p>
              • <strong>Missing / Switch:</strong> The system stamps &ldquo;MISSING&rdquo; or
              &ldquo;SWITCH&rdquo; directly into the box.
            </p>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: MISSING NEEDLE PARTS CHECKLIST (CLN-01 — 100% OFFICIAL) */}
      {/* ================================================================= */}
      {subTab === 'cln' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 max-w-4xl mx-auto text-black print:max-w-none print:w-full print:border-none print:shadow-none print:p-0">
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @page {
                  size: A4 portrait;
                  margin: 7mm 8mm;
                }
                @media print {
                  .cln-sheet {
                    font-size: 10px !important;
                    line-height: 1.25 !important;
                    width: 100% !important;
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                  }
                  .cln-select {
                    appearance: none !important;
                    -webkit-appearance: none !important;
                    border: none !important;
                    background: transparent !important;
                    padding: 0 !important;
                  }
                }
              `,
            }}
          />

          <div className="cln-sheet space-y-2.5 text-[11px] leading-snug">
            {/* Official Header Table */}
            <table className="w-full border-collapse border border-black">
              <tbody>
                <tr className="border-b border-black">
                  <td colSpan={6} className="py-1.5 px-2 text-center font-serif text-lg font-bold">
                    Dinusha Embroidery
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td colSpan={6} className="py-1 px-2 text-center font-serif text-xs font-bold">
                    Check List for Missing Needle Parts Production
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td rowSpan={3} className="w-[12%] border-r border-black p-1.5 text-center font-semibold">
                    Date
                  </td>
                  <td rowSpan={3} className="w-[20%] border-r border-black p-1 text-center">
                    <input
                      type="date"
                      max={todayStr}
                      value={clnDate}
                      onChange={(e) => setClnDate(e.target.value)}
                      className="w-full text-center font-mono font-bold bg-slate-50 border border-slate-300 rounded px-1 py-0.5 print:border-none print:bg-transparent"
                    />
                  </td>
                  <td className="w-[18%] border-r border-b border-black px-1.5 py-0.5 font-semibold">
                    Broken Time
                  </td>
                  <td className="w-[14%] border-r border-b border-black px-1 py-0.5">
                    <input
                      type="time"
                      value={clnBrokenTime}
                      onChange={(e) => setClnBrokenTime(e.target.value)}
                      className="w-full text-center font-mono text-[10px] bg-slate-50 border border-slate-300 rounded px-1 py-0.2 print:border-none print:bg-transparent"
                    />
                  </td>
                  <td rowSpan={3} className="w-[18%] border-r border-black p-1.5 text-center align-top">
                    <div className="font-semibold mb-1">Section</div>
                    <select
                      value={clnSection}
                      onChange={(e) => setClnSection(e.target.value)}
                      className="cln-select w-full text-center font-bold bg-slate-50 border border-slate-300 rounded px-1 py-0.5 text-[10px]"
                    >
                      <option value="">-- Select --</option>
                      {SECTION_OPTIONS.map((sec) => (
                        <option key={sec} value={sec}>
                          {sec}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td rowSpan={3} className="w-[18%] p-1.5 text-center align-top">
                    <div className="font-semibold mb-1">Production</div>
                    <select
                      value={clnProduction}
                      onChange={(e) => setClnProduction(e.target.value)}
                      className="cln-select w-full text-center font-bold bg-slate-50 border border-slate-300 rounded px-1 py-0.5 text-[10px]"
                    >
                      <option value="">-- Select --</option>
                      {PRODUCTION_OPTIONS.map((prod) => (
                        <option key={prod} value={prod}>
                          {prod}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="border-r border-b border-black px-1.5 py-0.5 font-semibold">
                    Letter Issue Time
                  </td>
                  <td className="border-r border-b border-black px-1 py-0.5">
                    <input
                      type="time"
                      value={clnLetterIssueTime}
                      onChange={(e) => setClnLetterIssueTime(e.target.value)}
                      className="w-full text-center font-mono text-[10px] bg-slate-50 border border-slate-300 rounded px-1 py-0.2 print:border-none print:bg-transparent"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="border-r border-black px-1.5 py-0.5 font-semibold">
                    Needle Issue Time
                  </td>
                  <td className="border-r border-black px-1 py-0.5">
                    <input
                      type="time"
                      value={clnNeedleIssueTime}
                      onChange={(e) => setClnNeedleIssueTime(e.target.value)}
                      className="w-full text-center font-mono text-[10px] bg-slate-50 border border-slate-300 rounded px-1 py-0.2 print:border-none print:bg-transparent"
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Needle Type & Size + Operator EPF No */}
            <table className="w-full border-collapse border border-black">
              <tbody>
                <tr>
                  <td className="w-[26%] border-r border-black p-1.5 text-center font-bold">
                    Needle Type &amp; Size
                  </td>
                  <td className="w-[34%] border-r border-black p-1">
                    <select
                      value={clnNeedleSpec}
                      onChange={(e) => setClnNeedleSpec(e.target.value)}
                      className="cln-select w-full font-bold bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[11px]"
                    >
                      <option value="">
                        {clnNeedleOptions.length === 0
                          ? '-- Add Needle Type First --'
                          : '-- Select Needle Type & Size --'}
                      </option>
                      {clnNeedleOptions.map((spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="w-[20%] border-r border-black p-1.5 text-center font-bold">
                    Operator EPF No
                  </td>
                  <td className="w-[20%] p-1">
                    <select
                      value={clnEpf}
                      onChange={(e) => setClnEpf(e.target.value)}
                      className="cln-select w-full font-bold bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[11px]"
                    >
                      <option value="">-- Select EPF --</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={`EPF ${emp.epfNo} - ${emp.fullName}`}>
                          EPF #{emp.epfNo} - {emp.fullName}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Style No, Operation, Machine Number */}
            <table className="w-full border-collapse border border-black">
              <tbody>
                <tr>
                  <td className="w-1/3 border-r border-black p-1.5 align-top">
                    <div className="font-bold text-center mb-1">Style No:</div>
                    <input
                      type="text"
                      maxLength={60}
                      placeholder="Enter Style No"
                      value={clnStyle}
                      onChange={(e) => setClnStyle(e.target.value)}
                      className="w-full text-center font-bold bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 print:border-none print:bg-transparent"
                    />
                  </td>
                  <td className="w-1/3 border-r border-black p-1.5 align-top">
                    <div className="font-bold text-center mb-1">Operation</div>
                    <select
                      value={clnOperation}
                      onChange={(e) => setClnOperation(e.target.value)}
                      className="cln-select w-full text-center font-bold bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-[11px]"
                    >
                      <option value="">-- Select Operation --</option>
                      {OPERATION_OPTIONS.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="w-1/3 p-1.5 align-top">
                    <div className="font-bold text-center mb-1">Machine Number</div>
                    <select
                      value={clnMachine}
                      onChange={(e) => setClnMachine(e.target.value)}
                      className="cln-select w-full text-center font-bold bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-[11px]"
                    >
                      <option value="">-- Select Machine --</option>
                      {MACHINE_OPTIONS.map((mc) => (
                        <option key={mc} value={mc}>
                          {mc}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Safety Officer Bilingual Instruction Box */}
            <div className="border border-black p-2 text-[10.5px]">
              <p className="font-medium">
                When a part of a broken Needle missing, the following check list has to be filled by
                the safety officer to ensure that all following steps were taken.
              </p>
              <p className="mt-1 text-[10px]">
                ඉදිකටු කැබැල්ලක් නැතිවූ විට පහත ක්‍රියාමාර්ග අනුගමනය කළ බව තහවුරු කර ගැනීම සඳහා
                ආරක්ෂක නිලධාරියා විසින් මෙම ලිපිය පිරවිය යුතු යි.
              </p>
            </div>

            {/* Question 1 */}
            <table className="w-full border-collapse border border-black">
              <tbody>
                <tr>
                  <td rowSpan={2} className="w-[62%] border-r border-black p-2 align-top">
                    <p className="font-bold">
                      1.Did you check all garments/parts/bundles around 2m radius of the machine for
                      Metal parts using the magnet?
                    </p>
                    <p className="text-[10px] mt-1">
                      1. ඔබ විසින් කාන්දම භාවිතා කර මැෂිම අවට මීටර 2ක අර්ධ විෂ්කම්භයක් ඇතුළත
                      ඇඟලුම් කොටස් බන්ඩල් පරීක්ෂා කළාද ?
                    </p>
                  </td>
                  <td className="w-[22%] border-r border-b border-black px-2 py-1">
                    <div className="text-[10px] font-semibold">Mechanic Name :</div>
                    <input
                      type="text"
                      maxLength={40}
                      placeholder="Name"
                      value={clnQ1Mechanic}
                      onChange={(e) => setClnQ1Mechanic(e.target.value)}
                      className="w-full font-semibold bg-slate-50 border border-slate-300 rounded px-1 py-0.5 text-[10px] mt-0.5 print:border-none print:bg-transparent"
                    />
                  </td>
                  <td rowSpan={2} className="w-[16%] p-1.5 text-center">
                    <select
                      value={clnQ1Answer}
                      onChange={(e) => setClnQ1Answer(e.target.value as '' | 'Yes' | 'No')}
                      className="cln-select w-full text-center font-bold bg-slate-50 border border-slate-300 rounded px-1 py-1 text-[11px]"
                    >
                      <option value="">Yes / No</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </td>
                </tr>
                <tr>
                  <td className="border-r border-black px-2 py-1.5 text-[10px] font-semibold">
                    Signature
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Question 2 */}
            <table className="w-full border-collapse border border-black">
              <tbody>
                <tr>
                  <td rowSpan={2} className="w-[62%] border-r border-black p-2 align-top">
                    <p className="font-bold">
                      2.Did you check the &lsquo;machine inside&rsquo; for missing broken needle
                      parts from the magnet?
                    </p>
                    <p className="text-[10px] mt-1">
                      2. මැකෑනික් විසින් මැෂිම ඇතුළත කැබුණු ඉදිකටු කැබලි ඇති දැයි කාන්දම භාවිතා
                      කර පරීක්ෂා කළාද ?
                    </p>
                  </td>
                  <td className="w-[22%] border-r border-b border-black px-2 py-1">
                    <div className="text-[10px] font-semibold">Mechanic Name :</div>
                    <input
                      type="text"
                      maxLength={40}
                      placeholder="Name"
                      value={clnQ2Mechanic}
                      onChange={(e) => setClnQ2Mechanic(e.target.value)}
                      className="w-full font-semibold bg-slate-50 border border-slate-300 rounded px-1 py-0.5 text-[10px] mt-0.5 print:border-none print:bg-transparent"
                    />
                  </td>
                  <td rowSpan={2} className="w-[16%] p-1.5 text-center">
                    <select
                      value={clnQ2Answer}
                      onChange={(e) => setClnQ2Answer(e.target.value as '' | 'Yes' | 'No')}
                      className="cln-select w-full text-center font-bold bg-slate-50 border border-slate-300 rounded px-1 py-1 text-[11px]"
                    >
                      <option value="">Yes / No</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </td>
                </tr>
                <tr>
                  <td className="border-r border-black px-2 py-1.5 text-[10px] font-semibold">
                    Signature
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Question 3 */}
            <table className="w-full border-collapse border border-black">
              <tbody>
                <tr>
                  <td className="w-[62%] border-r border-black p-2 align-top">
                    <p className="font-bold">
                      3.Did you check the garments for metal contamination within 2m radius by
                      using the metal detector machine?
                    </p>
                    <p className="text-[10px] mt-1">
                      3. ඉදිකටු කැබැල්ල නැති වූ අවට මීටර 2ක අර්ධ විෂ්කම්භයක් ඇතුළත ඇති ඇඟලුම්
                      ඉදිකටු පරීක්ෂා කරන යන්ත්‍රය මගින් පරීක්ෂා කළාද ?
                    </p>
                  </td>
                  <td className="w-[38%] p-2 text-center">
                    <select
                      value={clnQ3Answer}
                      onChange={(e) => setClnQ3Answer(e.target.value as '' | 'Yes' | 'No')}
                      className="cln-select w-full text-center font-bold bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[11px]"
                    >
                      <option value="">Yes / No</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Question 4 */}
            <table className="w-full border-collapse border border-black">
              <tbody>
                <tr className="border-b border-black">
                  <td className="w-[62%] border-r border-black p-2">
                    <p className="font-bold">4.What is the qty of metal detected?</p>
                    <p className="text-[10px] mt-0.5">
                      4. යන්ත්‍රය මගින් පරීක්ෂා කළ ප්‍රමාණය කොපමණද ?
                    </p>
                  </td>
                  <td className="w-[38%] p-2 text-center">
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      value={clnMetalQty}
                      onChange={(e) =>
                        setClnMetalQty(Math.min(10000, Math.max(0, Number(e.target.value) || 0)))
                      }
                      className="w-28 text-center font-mono font-bold bg-slate-50 border border-slate-300 rounded px-2 py-0.5 print:border-none print:bg-transparent"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="border-r border-black px-2 py-1.5 font-semibold">
                    Metal Detector Signature /
                  </td>
                  <td className="px-2 py-1.5" />
                </tr>
              </tbody>
            </table>

            {/* Question 5 */}
            <table className="w-full border-collapse border border-black">
              <tbody>
                <tr>
                  <td className="w-[62%] border-r border-black p-2">
                    <p className="font-bold">5.Did you remove the garment from section?</p>
                    <p className="text-[10px] mt-0.5">
                      5. මෙම අවස්ථාවට භාජනය වූ ඇඟලුම අංශයෙන් ඉවත් කර MD කර ඉදිකටු කැබලි නොමැති
                      බව තහවුරු කර ගත්තාද ?
                    </p>
                  </td>
                  <td className="w-[38%] p-2 text-center">
                    <select
                      value={clnQ5Answer}
                      onChange={(e) => setClnQ5Answer(e.target.value as '' | 'Yes' | 'No')}
                      className="cln-select w-full text-center font-bold bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[11px]"
                    >
                      <option value="">Yes / No</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Question 6 */}
            <table className="w-full border-collapse border border-black">
              <tbody>
                <tr>
                  <td className="w-[62%] border-r border-black p-2">
                    <p className="font-bold">6. Did you inform this issue to your APM ?</p>
                    <p className="text-[10px] mt-0.5">
                      6. සෙවීම සඳහා ගතකළ කාලය කොපමණද ?
                    </p>
                  </td>
                  <td className="w-[38%] p-2 text-center">
                    <select
                      value={clnSearchTime}
                      onChange={(e) => setClnSearchTime(e.target.value)}
                      className="cln-select w-full text-center font-bold bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[11px]"
                    >
                      <option value="">-- Select Search Time --</option>
                      {SEARCH_TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Certification Box */}
            <div className="border border-black p-2 text-center space-y-1">
              <p className="font-semibold text-[11px]">
                We Certify that the team has done their best to find the missing needle part failing
                which is issued to continue production.
              </p>
              <p className="text-[9.5px]">
                නිෂ්පාදන ක්‍රියාවලිය සඳහා නිකුත් කළ ඉදිකටුවක කැබුණු කැබැල්ලක් නැති වූ විට එය
                සෙවීම සඳහා අපගේ කණ්ඩායම සෑම උත්සාහයක්ම ගන්නා බව
              </p>
            </div>

            {/* Signatures & Revision Footer */}
            <div className="pt-5 space-y-3">
              <div className="grid grid-cols-3 gap-6 text-center text-[11px] font-semibold">
                <div>
                  <div className="border-b border-dotted border-black h-5 mb-1" />
                  <p>Production Safety Executive</p>
                </div>
                <div>
                  <div className="border-b border-dotted border-black h-5 mb-1" />
                  <p>Quality Manager</p>
                </div>
                <div>
                  <div className="border-b border-dotted border-black h-5 mb-1" />
                  <p>Operation Manager</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10.5px] font-semibold pt-1">
                <label className="flex items-center gap-1.5">
                  Rev No :
                  <input
                    type="text"
                    maxLength={20}
                    value={clnRevNo}
                    onChange={(e) => setClnRevNo(e.target.value)}
                    className="w-24 border-b border-slate-400 bg-transparent px-1 focus:outline-hidden print:border-none"
                  />
                </label>
                <label className="flex items-center gap-1.5">
                  Rev Date :
                  <input
                    type="text"
                    maxLength={20}
                    value={clnRevDate}
                    onChange={(e) => setClnRevDate(e.target.value)}
                    className="w-28 border-b border-slate-400 bg-transparent px-1 focus:outline-hidden print:border-none"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 4: SWITCH NEEDLE */}
      {/* ================================================================= */}
      {subTab === 'switchNeedle' && (
        <form
          onSubmit={handleSwitchNeedle}
          className="bg-white rounded-2xl border border-slate-200/90 shadow-xs max-w-xl mx-auto overflow-hidden"
        >
          <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold">Switch Needle Action (Swap Size)</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-3 rounded text-xs font-bold text-indigo-900">
              Old carried needle returns to stock (+1), and requested new needle is issued (-1).
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Operator EPF / Name
                </label>
                <select
                  value={switchOperator}
                  onChange={(e) => setSwitchOperator(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold"
                >
                  <option value="">-- Select Operator --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={`EPF ${emp.epfNo} - ${emp.fullName}`}>
                      EPF #{emp.epfNo} - {emp.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Machine Number
                </label>
                <select
                  value={switchMachine}
                  onChange={(e) => setSwitchMachine(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold"
                >
                  <option value="">-- Select Machine --</option>
                  {MACHINE_OPTIONS.map((mc) => (
                    <option key={mc} value={mc}>
                      {mc}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Style Number</label>
                <input
                  type="text"
                  maxLength={60}
                  placeholder="Enter Style No."
                  value={switchStyle}
                  onChange={(e) => setSwitchStyle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Seam Location</label>
                <select
                  value={switchSeam}
                  onChange={(e) => setSwitchSeam(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold"
                >
                  <option value="">-- Select Seam Location --</option>
                  {OPERATION_OPTIONS.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <label className="block text-xs font-extrabold text-amber-900 mb-1">
                Carried / Old Needle Returned (+1 Stock In)
              </label>
              <select
                value={switchCarriedId}
                onChange={(e) => setSwitchCarriedId(Number(e.target.value))}
                className="w-full bg-white border border-amber-300 rounded-lg p-2 text-xs font-bold text-slate-800"
              >
                <option value={0}>
                  {needleTypes.length === 0 ? '-- Add Needle Type First --' : '-- Select Old Needle --'}
                </option>
                {needleTypes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.system} - Size: {n.size} (Stock: {n.stock})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Requested New Needle Type (-1 Stock Out)
              </label>
              <select
                value={switchRequestedId}
                onChange={(e) => setSwitchRequestedId(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800"
              >
                <option value={0}>
                  {needleTypes.length === 0 ? '-- Add Needle Type First --' : '-- Select New Needle --'}
                </option>
                {needleTypes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.system} - Size: {n.size} (Stock: {n.stock})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition cursor-pointer"
            >
              Process Switch &amp; Record
            </button>
          </div>
        </form>
      )}

      {/* ================================================================= */}
      {/* TAB 5: RECORD BROKEN / BLUNT NEEDLE (TRACED ONLY) */}
      {/* ================================================================= */}
      {subTab === 'recordBroken' && (
        <form
          onSubmit={handleBrokenRecord}
          className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4"
        >
          <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Record Broken / Blunt Needle
              </h3>
              <p className="text-xs text-slate-500">
                All needle parts must be traced (Y). For missing parts, use the Missing Checklist (CLN) tab.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {(['BROKEN', 'BLUNT'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setBrokenActionType(t)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                    brokenActionType === t
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                max={todayStr}
                value={brokenDate}
                onChange={(e) => setBrokenDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Style No.</label>
              <input
                type="text"
                maxLength={60}
                placeholder="Enter Style No."
                value={brokenStyle}
                onChange={(e) => setBrokenStyle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">EPF No / Name</label>
              <select
                value={brokenEpf}
                onChange={(e) => setBrokenEpf(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold"
              >
                <option value="">-- Select Operator --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={`EPF ${emp.epfNo} - ${emp.fullName}`}>
                    EPF #{emp.epfNo} - {emp.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">MC Number</label>
              <select
                value={brokenMc}
                onChange={(e) => setBrokenMc(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold"
              >
                <option value="">-- Select Machine --</option>
                {MACHINE_OPTIONS.map((mc) => (
                  <option key={mc} value={mc}>
                    {mc}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Seam Location</label>
              <select
                value={brokenSeam}
                onChange={(e) => setBrokenSeam(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold"
              >
                <option value="">-- Select Seam Location --</option>
                {OPERATION_OPTIONS.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Needle Spec</label>
              <select
                value={brokenNeedleId}
                onChange={(e) => setBrokenNeedleId(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold"
              >
                <option value={0}>
                  {needleTypes.length === 0 ? '-- Add Needle Type First --' : '-- Select Needle --'}
                </option>
                {needleTypes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.system} - {n.size} (Stock: {n.stock})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Time</label>
              <input
                type="time"
                value={brokenTime}
                onChange={(e) => setBrokenTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4 flex items-end justify-end pt-1">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
              >
                Save {brokenActionType} Record (Traced) &amp; Adjust Stock
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ================================================================= */}
      {/* TAB 6: NEW NEEDLE TYPE & BULK RESTOCK */}
      {/* ================================================================= */}
      {subTab === 'stockManage' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Bulk Restock */}
          <form
            onSubmit={handleRestock}
            className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden"
          >
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center gap-2">
              <PackagePlus className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold">Bulk Restock Needle Inventory</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Needle Type
                </label>
                <select
                  value={restockNeedleId}
                  onChange={(e) => setRestockNeedleId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800"
                >
                  <option value={0}>
                    {needleTypes.length === 0 ? '-- Add Needle Type First --' : '-- Select Needle Type --'}
                  </option>
                  {needleTypes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.system} - Size: {n.size} (Current: {n.stock} Pcs)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Quantity to Add (Pcs)
                </label>
                <input
                  type="number"
                  min={1}
                  value={restockQty}
                  onChange={(e) => setRestockQty(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-black text-emerald-700"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition cursor-pointer"
              >
                Add to Inventory Stock
              </button>
            </div>
          </form>

          {/* Register New Needle Specification */}
          <form
            onSubmit={handleSaveNewType}
            className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden"
          >
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold">Register New Needle Specification</h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Needle System *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DB X K5"
                    value={newSystem}
                    onChange={(e) => setNewSystem(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Size / Nm *</label>
                  <input
                    type="text"
                    placeholder="e.g. 75/11"
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ref Code</label>
                  <input
                    type="text"
                    placeholder="785965"
                    value={newRef}
                    onChange={(e) => setNewRef(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Point Variant
                  </label>
                  <input
                    type="text"
                    placeholder="FFG/SES"
                    value={newPoint}
                    onChange={(e) => setNewPoint(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newStock}
                    onChange={(e) => setNewStock(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-mono font-bold text-emerald-700"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
              >
                Save Needle Type
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
