'use client';

import React, { useState, useEffect, useMemo, useId } from 'react';
import { EmployeeEntity } from '@/modules/payroll/domain/entities';
import { MachineEntity, StyleMasterEntity } from '@/actions/production';
import {
  Boxes,
  FileText,
  AlertTriangle,
  PlusCircle,
  PackagePlus,
  Printer,
  CheckCircle2,
  AlertCircle,
  Search,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  SlidersHorizontal,
} from 'lucide-react';

const STORAGE_ITEMS_KEY = 'dinusha_normal_inventory_items_v1';
const STORAGE_LOGS_KEY = 'dinusha_normal_inventory_logs_v1';
const MAX_STOCK_LIMIT = 500000;

export type NormalInventoryCategory =
  | 'Backing'
  | 'Double Side'
  | 'Bobbin'
  | 'Thread Cone'
  | 'Machine Spares & Oil'
  | 'Other Material';

export type NormalInventoryUnit =
  | 'Rolls'
  | 'Cones'
  | 'Pcs'
  | 'Boxes'
  | 'Yards'
  | 'Meters'
  | 'Packs'
  | 'Cans';

export const MATERIAL_CATEGORIES: NormalInventoryCategory[] = [
  'Backing',
  'Double Side',
  'Bobbin',
  'Thread Cone',
  'Machine Spares & Oil',
  'Other Material',
];

export const MATERIAL_UNITS: NormalInventoryUnit[] = [
  'Rolls',
  'Cones',
  'Pcs',
  'Boxes',
  'Yards',
  'Meters',
  'Packs',
  'Cans',
];

const SECTION_OPTIONS = [
  'Embroidery Floor',
  'Production',
  'Finishing',
  'Quality Checking',
  'Sample Room',
];

const DEFAULT_MACHINE_OPTIONS = Array.from({ length: 13 }, (_, i) =>
  `Machine ${String(i + 1).padStart(2, '0')}`
);

export interface NormalInventoryItem {
  id: number;
  category: NormalInventoryCategory;
  itemName: string;
  codeOrColor: string;
  specOrSize: string;
  unit: NormalInventoryUnit;
  stock: number;
  lowStockThreshold: number;
}

export type InventoryMovementType = 'ISSUED' | 'RESTOCK' | 'INITIAL';

export interface NormalInventoryLog {
  id: number;
  date: string;
  time: string;
  itemId: number;
  category: NormalInventoryCategory;
  itemName: string;
  codeOrColor: string;
  specOrSize: string;
  unit: NormalInventoryUnit;
  movementType: InventoryMovementType;
  qty: number;
  balanceAfter: number;
  epfOrPerson: string;
  machineOrSection: string;
  styleNo: string;
  remarks: string;
}

export type NormalInventorySubTab =
  | 'inventory'
  | 'usageLog'
  | 'issueMaterial'
  | 'stockManage';

interface NormalInventoryManagementProps {
  employees: EmployeeEntity[];
  machines?: MachineEntity[];
  styles?: StyleMasterEntity[];
  externalSubTab?: NormalInventorySubTab;
}

const QUICK_MATERIAL_PRESETS: Array<{
  label: string;
  category: NormalInventoryCategory;
  itemName: string;
  codeOrColor: string;
  specOrSize: string;
  unit: NormalInventoryUnit;
  threshold: number;
}> = [
  {
    label: 'Backing Roll',
    category: 'Backing',
    itemName: 'Non-Woven Embroidery Backing',
    codeOrColor: 'White / 40 GSM',
    specOrSize: '36" x 100 Yards',
    unit: 'Rolls',
    threshold: 5,
  },
  {
    label: 'Double Side Tape',
    category: 'Double Side',
    itemName: 'Double Side Adhesive Tape / Backing',
    codeOrColor: 'Clear / Strong Hold',
    specOrSize: '1 Inch (25mm) x 50m',
    unit: 'Rolls',
    threshold: 10,
  },
  {
    label: 'Bobbin Thread',
    category: 'Bobbin',
    itemName: 'Embroidery Bobbin Thread Cone',
    codeOrColor: 'White / 60s/2',
    specOrSize: '5000m Cone',
    unit: 'Cones',
    threshold: 15,
  },
  {
    label: 'Thread Cone',
    category: 'Thread Cone',
    itemName: 'Polyester Embroidery Thread Cone',
    codeOrColor: 'Col #1001 White',
    specOrSize: '120D/2 (4000m)',
    unit: 'Cones',
    threshold: 20,
  },
  {
    label: 'Water-Soluble Topping',
    category: 'Backing',
    itemName: 'Water-Soluble Topping Film',
    codeOrColor: 'Clear Film',
    specOrSize: '100 Yards Roll',
    unit: 'Rolls',
    threshold: 5,
  },
  {
    label: 'Spray / Machine Oil',
    category: 'Machine Spares & Oil',
    itemName: 'Temporary Spray Adhesive / Machine Oil',
    codeOrColor: 'KK-100 / White Oil',
    specOrSize: '500ml Can',
    unit: 'Cans',
    threshold: 6,
  },
];

function getCategoryBadgeClasses(cat: NormalInventoryCategory): string {
  switch (cat) {
    case 'Backing':
      return 'bg-indigo-900 text-indigo-100';
    case 'Double Side':
      return 'bg-amber-600 text-white';
    case 'Bobbin':
      return 'bg-teal-700 text-white';
    case 'Thread Cone':
      return 'bg-purple-800 text-purple-100';
    case 'Machine Spares & Oil':
      return 'bg-slate-800 text-slate-100';
    default:
      return 'bg-slate-700 text-white';
  }
}

export function NormalInventoryManagement({
  employees,
  machines = [],
  styles = [],
  externalSubTab,
}: NormalInventoryManagementProps) {
  const uid = useId();
  const [subTab, setSubTab] = useState<NormalInventorySubTab>(externalSubTab || 'inventory');

  useEffect(() => {
    if (externalSubTab) setSubTab(externalSubTab);
  }, [externalSubTab]);

  const [items, setItems] = useState<NormalInventoryItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_ITEMS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as NormalInventoryItem[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore localStorage error
    }
    return [];
  });

  const [logs, setLogs] = useState<NormalInventoryLog[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_LOGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as NormalInventoryLog[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore localStorage error
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ITEMS_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage errors
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(logs));
    } catch {
      // Ignore storage errors
    }
  }, [logs]);

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const showError = (text: string) => setStatusMsg({ type: 'error', text });
  const showSuccess = (text: string) => setStatusMsg({ type: 'success', text });

  // Filters on Stock Directory
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | NormalInventoryCategory>('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Filters on Usage Log Sheet
  const [storeIncharge, setStoreIncharge] = useState('');
  const [weekNo, setWeekNo] = useState('');
  const [logSearchDate, setLogSearchDate] = useState('');
  const [logCategoryFilter, setLogCategoryFilter] = useState<'ALL' | NormalInventoryCategory>('ALL');

  // Issue Material to Floor form
  const todayStr = new Date().toISOString().split('T')[0];
  const [issueDate, setIssueDate] = useState(todayStr);
  const [issueTime, setIssueTime] = useState(() =>
    new Date().toTimeString().slice(0, 5)
  );
  const [issueItemId, setIssueItemId] = useState<number>(0);
  const [issueQty, setIssueQty] = useState<number>(1);
  const [issueEpf, setIssueEpf] = useState('');
  const [issueMachine, setIssueMachine] = useState('');
  const [issueStyle, setIssueStyle] = useState('');
  const [issueRemarks, setIssueRemarks] = useState('');

  // New Material form
  const [newCategory, setNewCategory] = useState<NormalInventoryCategory>('Backing');
  const [newItemName, setNewItemName] = useState('');
  const [newCodeOrColor, setNewCodeOrColor] = useState('');
  const [newSpecOrSize, setNewSpecOrSize] = useState('');
  const [newUnit, setNewUnit] = useState<NormalInventoryUnit>('Rolls');
  const [newStock, setNewStock] = useState<number>(0);
  const [newThreshold, setNewThreshold] = useState<number>(5);

  // Bulk Restock & Threshold Update form
  const [restockItemId, setRestockItemId] = useState<number>(0);
  const [restockQty, setRestockQty] = useState<number>(0);
  const [restockRemarks, setRestockRemarks] = useState('');
  const [editThresholdValue, setEditThresholdValue] = useState<number>(5);

  useEffect(() => {
    if (items.length > 0 && !items.some((i) => i.id === restockItemId)) {
      setRestockItemId(items[0].id);
      setEditThresholdValue(items[0].lowStockThreshold);
    }
    if (items.length > 0 && !items.some((i) => i.id === issueItemId)) {
      setIssueItemId(items[0].id);
    }
  }, [items, restockItemId, issueItemId]);

  const machineOptions = useMemo(() => {
    const fromProd = machines.map((m) => m.name).filter(Boolean);
    const merged = Array.from(new Set([...fromProd, ...DEFAULT_MACHINE_OPTIONS, ...SECTION_OPTIONS]));
    return merged;
  }, [machines]);

  const styleOptions = useMemo(() => {
    if (!styles || styles.length === 0) return [];
    return Array.from(
      new Set(styles.map((s) => (s.code ? `${s.code} - ${s.name}` : s.name)).filter(Boolean))
    );
  }, [styles]);

  const lowStockItems = useMemo(
    () => items.filter((item) => item.stock <= item.lowStockThreshold),
    [items]
  );

  const lowStockCount = lowStockItems.length;

  const totalStockUnits = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.stock) || 0), 0),
    [items]
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
      if (lowStockOnly && item.stock > item.lowStockThreshold) return false;
      if (!q) return true;
      return (
        item.itemName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.codeOrColor.toLowerCase().includes(q) ||
        item.specOrSize.toLowerCase().includes(q)
      );
    });
  }, [items, searchQuery, selectedCategory, lowStockOnly]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (logSearchDate && log.date !== logSearchDate) return false;
      if (logCategoryFilter !== 'ALL' && log.category !== logCategoryFilter) return false;
      return true;
    });
  }, [logs, logSearchDate, logCategoryFilter]);

  const handleApplyPreset = (preset: (typeof QUICK_MATERIAL_PRESETS)[number]) => {
    setNewCategory(preset.category);
    setNewItemName(preset.itemName);
    setNewCodeOrColor(preset.codeOrColor);
    setNewSpecOrSize(preset.specOrSize);
    setNewUnit(preset.unit);
    setNewThreshold(preset.threshold);
    setStatusMsg(null);
  };

  const handleSaveNewMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrim = newItemName.trim();
    const codeTrim = newCodeOrColor.trim() || '-';
    const specTrim = newSpecOrSize.trim() || '-';

    if (nameTrim.length < 2 || nameTrim.length > 80) {
      showError('Material Name must be between 2 and 80 characters (e.g. Tear-Away Backing).');
      return;
    }

    const isDuplicate = items.some(
      (i) =>
        i.category === newCategory &&
        i.itemName.toLowerCase() === nameTrim.toLowerCase() &&
        i.codeOrColor.toLowerCase() === codeTrim.toLowerCase() &&
        i.specOrSize.toLowerCase() === specTrim.toLowerCase()
    );
    if (isDuplicate) {
      showError(
        `Material "${nameTrim} (${codeTrim})" already exists in ${newCategory}. Use Bulk Restock to add stock.`
      );
      return;
    }

    const initialQty = Math.max(0, Number(newStock) || 0);
    const thresholdQty = Math.max(0, Number(newThreshold) || 0);
    if (initialQty > MAX_STOCK_LIMIT) {
      showError(`Initial stock cannot exceed ${MAX_STOCK_LIMIT.toLocaleString()}.`);
      return;
    }

    const created: NormalInventoryItem = {
      id: Date.now(),
      category: newCategory,
      itemName: nameTrim,
      codeOrColor: codeTrim,
      specOrSize: specTrim,
      unit: newUnit,
      stock: initialQty,
      lowStockThreshold: thresholdQty,
    };

    setItems((prev) => [...prev, created]);

    if (initialQty > 0) {
      const nowTime = new Date().toTimeString().slice(0, 5);
      const initLog: NormalInventoryLog = {
        id: Date.now() + 1,
        date: todayStr,
        time: nowTime,
        itemId: created.id,
        category: created.category,
        itemName: created.itemName,
        codeOrColor: created.codeOrColor,
        specOrSize: created.specOrSize,
        unit: created.unit,
        movementType: 'INITIAL',
        qty: initialQty,
        balanceAfter: initialQty,
        epfOrPerson: 'Opening Stock',
        machineOrSection: 'Main Store',
        styleNo: '-',
        remarks: `Initial registration (Low Stock Alert ≤ ${thresholdQty} ${created.unit})`,
      };
      setLogs((prev) => [initLog, ...prev]);
    }

    setNewItemName('');
    setNewCodeOrColor('');
    setNewSpecOrSize('');
    setNewStock(0);
    showSuccess(
      `Registered "${created.itemName}" (${created.category}) with ${created.stock} ${created.unit}.`
    );
    setSubTab('inventory');
  };

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      showError('Please register a material item first before restocking.');
      return;
    }
    const target = items.find((i) => i.id === restockItemId);
    if (!target) {
      showError('Please select a material item to restock.');
      return;
    }
    const qty = Number(restockQty);
    if (!Number.isFinite(qty) || qty <= 0 || qty > MAX_STOCK_LIMIT) {
      showError(`Restock quantity must be between 1 and ${MAX_STOCK_LIMIT.toLocaleString()}.`);
      return;
    }

    const updatedBalance = target.stock + qty;
    setItems((prev) =>
      prev.map((i) => (i.id === target.id ? { ...i, stock: updatedBalance } : i))
    );

    const nowTime = new Date().toTimeString().slice(0, 5);
    const newLog: NormalInventoryLog = {
      id: Date.now(),
      date: todayStr,
      time: nowTime,
      itemId: target.id,
      category: target.category,
      itemName: target.itemName,
      codeOrColor: target.codeOrColor,
      specOrSize: target.specOrSize,
      unit: target.unit,
      movementType: 'RESTOCK',
      qty,
      balanceAfter: updatedBalance,
      epfOrPerson: 'Store Restock',
      machineOrSection: 'Main Store',
      styleNo: '-',
      remarks: restockRemarks.trim() || 'Bulk stock received',
    };

    setLogs((prev) => [newLog, ...prev]);
    setRestockQty(0);
    setRestockRemarks('');
    showSuccess(
      `Added +${qty} ${target.unit} to "${target.itemName}". New stock: ${updatedBalance} ${target.unit}.`
    );
    setSubTab('inventory');
  };

  const handleUpdateThreshold = () => {
    const target = items.find((i) => i.id === restockItemId);
    if (!target) {
      showError('Select a material first.');
      return;
    }
    const nextVal = Math.max(0, Number(editThresholdValue) || 0);
    setItems((prev) =>
      prev.map((i) => (i.id === target.id ? { ...i, lowStockThreshold: nextVal } : i))
    );
    showSuccess(
      `Updated Low Stock threshold for "${target.itemName}" to ≤ ${nextVal} ${target.unit}.`
    );
  };

  const handleIssueMaterialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      showError('Please add at least one material in New Material & Restock first.');
      return;
    }
    const target = items.find((i) => i.id === issueItemId);
    if (!target) {
      showError('Please select a material to issue.');
      return;
    }
    const qty = Number(issueQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      showError('Please enter a valid quantity greater than 0.');
      return;
    }
    if (qty > target.stock) {
      showError(
        `Insufficient stock for "${target.itemName}". Available: ${target.stock} ${target.unit}.`
      );
      return;
    }
    if (!issueEpf.trim()) {
      showError('Please select or enter the Operator / Employee receiving the material.');
      return;
    }
    if (!issueMachine.trim()) {
      showError('Please select the Machine or Floor Section.');
      return;
    }

    const updatedBalance = Math.max(0, target.stock - qty);
    setItems((prev) =>
      prev.map((i) => (i.id === target.id ? { ...i, stock: updatedBalance } : i))
    );

    const newLog: NormalInventoryLog = {
      id: Date.now(),
      date: issueDate || todayStr,
      time: issueTime || new Date().toTimeString().slice(0, 5),
      itemId: target.id,
      category: target.category,
      itemName: target.itemName,
      codeOrColor: target.codeOrColor,
      specOrSize: target.specOrSize,
      unit: target.unit,
      movementType: 'ISSUED',
      qty,
      balanceAfter: updatedBalance,
      epfOrPerson: issueEpf.trim(),
      machineOrSection: issueMachine.trim(),
      styleNo: issueStyle.trim() || '-',
      remarks: issueRemarks.trim() || 'Issued to production floor',
    };

    setLogs((prev) => [newLog, ...prev]);
    setIssueQty(1);
    setIssueRemarks('');

    const lowWarning =
      updatedBalance <= target.lowStockThreshold
        ? ` ⚠️ LOW STOCK ALERT (${updatedBalance} ${target.unit} left!)`
        : '';
    showSuccess(
      `Issued ${qty} ${target.unit} of "${target.itemName}" to ${issueEpf.trim()} (${issueMachine.trim()}).${lowWarning}`
    );
    setSubTab('usageLog');
  };

  const handleDeleteItem = (item: NormalInventoryItem) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    showSuccess(`Removed "${item.itemName}" from Normal Inventory.`);
  };

  return (
    <div className="space-y-5">
      {/* Studio Command Header (Matches Needle & Safety Studio) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-md flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-400/15 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight">
                NORMAL INVENTORY &amp; CONSUMABLES STUDIO
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 inline-flex items-center gap-1">
                <Boxes className="w-3 h-3" /> Live Stock &amp; Low-Stock Alerts
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Backing, Double Side, Bobbin, Thread Cone &amp; factory consumables control ({items.length} Materials • {totalStockUnits.toLocaleString()} Total Units).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {lowStockCount > 0 ? (
            <button
              type="button"
              onClick={() => {
                setSubTab('inventory');
                setLowStockOnly(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-300" />
              {lowStockCount} Low Stock Alert{lowStockCount > 1 ? 's' : ''}
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              0 Low Stock Alerts
            </span>
          )}
          <button
            type="button"
            onClick={() => window.print()}
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
              { id: 'inventory', label: 'Material Stock Directory', icon: Boxes },
              { id: 'usageLog', label: 'Issued & Restock Sheet', icon: FileText },
              { id: 'issueMaterial', label: 'Issue Material to Floor', icon: ArrowUpRight },
              { id: 'stockManage', label: 'New Material & Restock', icon: PackagePlus },
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
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white shadow-xs'
                    : tab.id === 'issueMaterial'
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

        {/* Category Summary Pills */}
        <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-bold text-slate-600 pr-2">
          {(['Backing', 'Double Side', 'Bobbin', 'Thread Cone'] as NormalInventoryCategory[]).map(
            (cat) => {
              const count = items.filter((i) => i.category === cat).length;
              const lowInCat = items.filter(
                (i) => i.category === cat && i.stock <= i.lowStockThreshold
              ).length;
              return (
                <span
                  key={cat}
                  className={`px-2.5 py-1 rounded-lg border ${
                    lowInCat > 0
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {cat}: {count} {lowInCat > 0 ? `(⚠️ ${lowInCat} Low)` : ''}
                </span>
              );
            }
          )}
        </div>
      </div>

      {/* Status Banner */}
      {statusMsg && (
        <div
          role="status"
          aria-live="polite"
          className={`px-4 py-3 rounded-xl border text-xs font-semibold flex items-center gap-2 print:hidden ${
            statusMsg.type === 'success'
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

      {/* ================================================================= */}
      {/* TAB 1: MATERIAL STOCK DIRECTORY (WITH LOW STOCK CARDS & LEDGER) */}
      {/* ================================================================= */}
      {subTab === 'inventory' && (
        <div className="space-y-5">
          {/* Search & Category Filter Bar */}
          <search className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex flex-wrap items-center gap-1.5">
              {(['ALL', ...MATERIAL_CATEGORIES] as const).map((cat) => {
                const isSelected = selectedCategory === cat;
                const count =
                  cat === 'ALL'
                    ? items.length
                    : items.filter((i) => i.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'ALL' ? 'All Materials' : cat} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setLowStockOnly((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition flex items-center gap-1.5 cursor-pointer ${
                  lowStockOnly
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Low Stock Only ({lowStockCount})
              </button>

              <div className="relative">
                <label htmlFor={`${uid}-inv-search`} className="sr-only">
                  Search materials
                </label>
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id={`${uid}-inv-search`}
                  name="inventory_search"
                  type="search"
                  placeholder="Search Backing, Bobbin, Thread..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800 w-56 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </search>

          {/* Visual Material Cards (Same layout & Low Stock highlight as Needle Management) */}
          {items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-3">
              <Boxes className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-slate-800">
                  No Factory Materials Added Yet
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Add your Backing, Double Side Tape, Bobbin, Thread Cones, and other embroidery materials to track live stock and receive Low Stock warnings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubTab('stockManage')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Add Backing / Bobbin / Thread Material
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs font-semibold text-slate-500">
              No materials match the selected filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {filteredItems.map((item) => {
                const isLow = item.stock <= item.lowStockThreshold;
                const isOut = item.stock <= 0;
                const fillPct =
                  item.lowStockThreshold > 0
                    ? Math.min(100, Math.round((item.stock / (item.lowStockThreshold * 2.5)) * 100))
                    : 100;
                return (
                  <div
                    key={item.id}
                    className={`bg-white p-4 rounded-2xl border shadow-xs flex flex-col justify-between transition ${
                      isLow
                        ? 'border-rose-300 ring-2 ring-rose-100'
                        : 'border-slate-200/90 hover:border-indigo-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span
                          className={`font-extrabold text-[10px] px-2 py-0.5 rounded-md uppercase ${getCategoryBadgeClasses(
                            item.category
                          )}`}
                        >
                          {item.category}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-500 truncate max-w-[130px]">
                          {item.codeOrColor}
                        </span>
                      </div>
                      <h4 className="font-black text-slate-900 text-sm leading-snug">
                        {item.itemName}
                      </h4>
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                        Spec: {item.specOrSize}
                      </p>
                    </div>

                    <div className="mt-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        {isOut ? (
                          <div className="inline-flex items-center gap-1 bg-rose-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md">
                            <AlertTriangle className="w-3 h-3" /> OUT OF STOCK
                          </div>
                        ) : isLow ? (
                          <div className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 font-extrabold text-[10px] px-2 py-0.5 rounded-md border border-rose-200">
                            <AlertTriangle className="w-3 h-3" /> LOW STOCK (≤ {item.lowStockThreshold})
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 font-bold text-[10px] px-2 py-0.5 rounded-md border border-emerald-200">
                            Optimal (Min: {item.lowStockThreshold})
                          </div>
                        )}
                      </div>

                      {/* Visual Stock Level Bar */}
                      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isLow ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.max(6, fillPct)}%` }}
                        />
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex justify-between items-baseline">
                        <span className="text-[11px] font-bold text-slate-500">In Stock</span>
                        <span
                          className={`text-lg font-mono font-black ${
                            isLow ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {item.stock.toLocaleString()}{' '}
                          <span className="text-[11px] font-sans font-bold">{item.unit}</span>
                        </span>
                      </div>

                      <div className="pt-1 flex items-center gap-1.5 print:hidden">
                        <button
                          type="button"
                          onClick={() => {
                            setIssueItemId(item.id);
                            setSubTab('issueMaterial');
                          }}
                          className="flex-1 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 border border-emerald-200 font-bold text-[11px] transition cursor-pointer"
                        >
                          Issue to Floor
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRestockItemId(item.id);
                            setEditThresholdValue(item.lowStockThreshold);
                            setSubTab('stockManage');
                          }}
                          className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 font-bold text-[11px] transition cursor-pointer"
                        >
                          + Restock
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Detailed Normal Inventory Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
              <h3
                id={`${uid}-ledger-caption`}
                className="text-xs font-extrabold uppercase tracking-wider text-slate-800"
              >
                Detailed Normal Inventory Ledger (Backing, Double Side, Bobbin, Thread Cone)
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">
                Showing {filteredItems.length} of {items.length} Materials
              </span>
            </div>
            <div
              tabIndex={0}
              role="region"
              aria-labelledby={`${uid}-ledger-caption`}
              className="overflow-x-auto"
            >
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-900 text-white uppercase text-[11px] font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">Material Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Code / Color / GSM</th>
                    <th className="py-3 px-4">Size / Spec</th>
                    <th className="py-3 px-4">In Stock</th>
                    <th className="py-3 px-4">Low Threshold</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right print:hidden">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => {
                    const isLow = item.stock <= item.lowStockThreshold;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <th
                          scope="row"
                          className="py-3 px-4 font-bold text-slate-900 bg-white sticky left-0"
                        >
                          {item.itemName}
                        </th>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${getCategoryBadgeClasses(
                              item.category
                            )}`}
                          >
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                          {item.codeOrColor}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{item.specOrSize}</td>
                        <td
                          className={`py-3 px-4 font-mono font-black ${
                            isLow ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {item.stock.toLocaleString()} {item.unit}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          ≤ {item.lowStockThreshold} {item.unit}
                        </td>
                        <td className="py-3 px-4">
                          {isLow ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> LOW STOCK WARNING
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Optimal Stock
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5 print:hidden">
                          <button
                            type="button"
                            onClick={() => {
                              setIssueItemId(item.id);
                              setSubTab('issueMaterial');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 font-bold text-[11px] transition cursor-pointer"
                          >
                            Issue
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRestockItemId(item.id);
                              setEditThresholdValue(item.lowStockThreshold);
                              setSubTab('stockManage');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 font-bold text-[11px] transition cursor-pointer"
                          >
                            + Restock
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item)}
                            aria-label={`Delete ${item.itemName}`}
                            className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer align-middle"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
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
      {/* TAB 2: ISSUED & RESTOCK RECORD SHEET */}
      {/* ================================================================= */}
      {subTab === 'usageLog' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 print:border-none print:shadow-none print:p-0">
          <div className="border-b-2 border-black pb-3 mb-4 flex flex-wrap justify-between items-center gap-3">
            <div>
              <h2 className="text-xl font-black text-black uppercase tracking-tight">
                DINUSHA EMBROIDERY
              </h2>
              <p className="text-xs font-bold text-slate-800 uppercase">
                NORMAL INVENTORY — MATERIAL ISSUE &amp; RESTOCK RECORD SHEET
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-800">
              <label className="flex items-center gap-1.5">
                Store Incharge:
                <input
                  type="text"
                  name="store_incharge"
                  value={storeIncharge}
                  onChange={(e) => setStoreIncharge(e.target.value)}
                  className="border-b border-black font-bold w-28 px-1 focus:outline-hidden bg-transparent"
                />
              </label>
              <label className="flex items-center gap-1.5">
                Week No:
                <input
                  type="text"
                  name="week_no"
                  value={weekNo}
                  onChange={(e) => setWeekNo(e.target.value)}
                  className="border-b border-black font-bold w-16 px-1 text-center focus:outline-hidden bg-transparent"
                />
              </label>
            </div>
          </div>

          <search className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor={`${uid}-log-date`}
                className="text-xs font-bold text-slate-700 flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5 text-slate-500" />
                Filter Date:
              </label>
              <input
                id={`${uid}-log-date`}
                name="log_date"
                type="date"
                value={logSearchDate}
                onChange={(e) => setLogSearchDate(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold"
              />
              <select
                aria-label="Filter by material category"
                name="log_category"
                value={logCategoryFilter}
                onChange={(e) =>
                  setLogCategoryFilter(e.target.value as 'ALL' | NormalInventoryCategory)
                }
                className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700"
              >
                <option value="ALL">All Categories</option>
                {MATERIAL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {(logSearchDate || logCategoryFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setLogSearchDate('');
                    setLogCategoryFilter('ALL');
                  }}
                  className="text-xs font-bold text-rose-600 hover:underline px-2 cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Showing {filteredLogs.length} movement records
            </span>
          </search>

          <div
            tabIndex={0}
            role="region"
            aria-label="Material Issue and Restock Ledger"
            className="overflow-x-auto"
          >
            <table className="w-full text-center text-xs border-collapse border border-black">
              <thead className="bg-slate-100 text-black font-bold uppercase text-[11px]">
                <tr>
                  <th className="border border-black p-2">Date &amp; Time</th>
                  <th className="border border-black p-2">Category</th>
                  <th className="border border-black p-2">Material Name &amp; Spec</th>
                  <th className="border border-black p-2">Code / Color</th>
                  <th className="border border-black p-2">Movement</th>
                  <th className="border border-black p-2">Qty</th>
                  <th className="border border-black p-2">Balance</th>
                  <th className="border border-black p-2">Operator / Person</th>
                  <th className="border border-black p-2">Machine / Section</th>
                  <th className="border border-black p-2">Style No</th>
                  <th className="border border-black p-2">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="border border-black p-6 text-slate-400 font-semibold">
                      No material issue or restock records found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="border border-black p-2 font-mono">
                        {log.date} <span className="text-slate-500">{log.time}</span>
                      </td>
                      <td className="border border-black p-2 font-bold">{log.category}</td>
                      <td className="border border-black p-2 font-bold text-left">
                        {log.itemName}{' '}
                        <span className="text-[10px] text-slate-500 font-normal">
                          ({log.specOrSize})
                        </span>
                      </td>
                      <td className="border border-black p-2 font-mono">{log.codeOrColor}</td>
                      <td className="border border-black p-2 font-extrabold">
                        {log.movementType === 'ISSUED' ? (
                          <span className="text-rose-700 inline-flex items-center gap-0.5">
                            <ArrowUpRight className="w-3 h-3" /> ISSUED
                          </span>
                        ) : (
                          <span className="text-emerald-700 inline-flex items-center gap-0.5">
                            <ArrowDownLeft className="w-3 h-3" /> {log.movementType}
                          </span>
                        )}
                      </td>
                      <td
                        className={`border border-black p-2 font-mono font-black ${
                          log.movementType === 'ISSUED' ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {log.movementType === 'ISSUED' ? `-${log.qty}` : `+${log.qty}`} {log.unit}
                      </td>
                      <td className="border border-black p-2 font-mono font-bold">
                        {log.balanceAfter} {log.unit}
                      </td>
                      <td className="border border-black p-2 font-semibold">{log.epfOrPerson}</td>
                      <td className="border border-black p-2 font-bold">{log.machineOrSection}</td>
                      <td className="border border-black p-2">{log.styleNo}</td>
                      <td className="border border-black p-2 text-left">{log.remarks}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: ISSUE MATERIAL TO FLOOR */}
      {/* ================================================================= */}
      {subTab === 'issueMaterial' && (
        <form
          onSubmit={handleIssueMaterialSubmit}
          aria-labelledby={`${uid}-issue-heading`}
          className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden max-w-4xl mx-auto"
        >
          <div className="bg-emerald-900 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ArrowUpRight className="w-5 h-5 text-emerald-300" />
              <div>
                <h2 id={`${uid}-issue-heading`} className="text-sm font-extrabold uppercase">
                  Issue Factory Material to Production Floor
                </h2>
                <p className="text-[11px] text-emerald-200">
                  Issue Backing, Double Side Tape, Bobbin, or Thread Cones to an Operator &amp; Machine.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor={`${uid}-issue-item`}
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Select Material (Backing / Double Side / Bobbin / Thread) *
              </label>
              <select
                id={`${uid}-issue-item`}
                name="issue_item_id"
                value={issueItemId}
                onChange={(e) => setIssueItemId(Number(e.target.value))}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900"
              >
                <option value={0}>
                  {items.length === 0
                    ? '-- Add Material in New Material & Restock First --'
                    : '-- Select Material --'}
                </option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    [{item.category}] {item.itemName} ({item.codeOrColor}) — In Stock: {item.stock}{' '}
                    {item.unit} {item.stock <= item.lowStockThreshold ? '⚠️ LOW' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor={`${uid}-issue-qty`}
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Quantity to Issue *
              </label>
              <input
                id={`${uid}-issue-qty`}
                name="issue_qty"
                type="number"
                min={1}
                value={issueQty}
                onChange={(e) => setIssueQty(Math.max(1, Number(e.target.value) || 1))}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-black text-rose-700"
              />
            </div>

            <div>
              <label
                htmlFor={`${uid}-issue-date`}
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Date *
              </label>
              <input
                id={`${uid}-issue-date`}
                name="issue_date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold"
              />
            </div>

            <div>
              <label
                htmlFor={`${uid}-issue-time`}
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Time *
              </label>
              <input
                id={`${uid}-issue-time`}
                name="issue_time"
                type="time"
                value={issueTime}
                onChange={(e) => setIssueTime(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold"
              />
            </div>

            <div>
              <label
                htmlFor={`${uid}-issue-epf`}
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Issued To (Operator / Staff) *
              </label>
              <select
                id={`${uid}-issue-epf`}
                name="issue_epf"
                value={issueEpf}
                onChange={(e) => setIssueEpf(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold"
              >
                <option value="">-- Select Employee --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={`EPF #${emp.epfNo} - ${emp.fullName}`}>
                    EPF #{emp.epfNo} - {emp.fullName} ({emp.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor={`${uid}-issue-mc`}
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Machine / Floor Section *
              </label>
              <select
                id={`${uid}-issue-mc`}
                name="issue_machine"
                value={issueMachine}
                onChange={(e) => setIssueMachine(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold"
              >
                <option value="">-- Select Machine / Section --</option>
                {machineOptions.map((mc) => (
                  <option key={mc} value={mc}>
                    {mc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor={`${uid}-issue-style`}
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Style No (Optional)
              </label>
              {styleOptions.length > 0 ? (
                <select
                  id={`${uid}-issue-style`}
                  name="issue_style"
                  value={issueStyle}
                  onChange={(e) => setIssueStyle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold"
                >
                  <option value="">-- General Floor Usage --</option>
                  {styleOptions.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`${uid}-issue-style`}
                  name="issue_style"
                  type="text"
                  placeholder="e.g. ST-104"
                  value={issueStyle}
                  onChange={(e) => setIssueStyle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold"
                />
              )}
            </div>

            <div>
              <label
                htmlFor={`${uid}-issue-remarks`}
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Remarks / Purpose
              </label>
              <input
                id={`${uid}-issue-remarks`}
                name="issue_remarks"
                type="text"
                placeholder="e.g. Morning shift backing roll"
                value={issueRemarks}
                onChange={(e) => setIssueRemarks(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm transition cursor-pointer"
              >
                Issue Material &amp; Deduct Stock
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ================================================================= */}
      {/* TAB 4: NEW MATERIAL & BULK RESTOCK */}
      {/* ================================================================= */}
      {subTab === 'stockManage' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Register New Material Specification */}
          <form
            onSubmit={handleSaveNewMaterial}
            aria-labelledby={`${uid}-new-mat-heading`}
            className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden"
          >
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-amber-400" />
              <h3 id={`${uid}-new-mat-heading`} className="text-sm font-bold">
                Register New Factory Material (Backing / Bobbin / Thread)
              </h3>
            </div>

            <div className="p-5 space-y-3.5">
              {/* 1-Click Quick Templates */}
              <div>
                <span className="block text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 mb-1.5">
                  1-Click Quick Material Templates:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_MATERIAL_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-800 border border-indigo-200 text-[11px] font-bold transition cursor-pointer"
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`${uid}-new-cat`}
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Material Category *
                  </label>
                  <select
                    id={`${uid}-new-cat`}
                    name="new_category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as NormalInventoryCategory)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-bold"
                  >
                    {MATERIAL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-new-unit`}
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Stock Unit *
                  </label>
                  <select
                    id={`${uid}-new-unit`}
                    name="new_unit"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value as NormalInventoryUnit)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-bold"
                  >
                    {MATERIAL_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor={`${uid}-new-name`}
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Material Name *
                </label>
                <input
                  id={`${uid}-new-name`}
                  name="new_item_name"
                  type="text"
                  required
                  placeholder="e.g. Tear-Away Backing Roll / Double Side Tape / Bobbin Thread"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`${uid}-new-code`}
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Code / Color / GSM
                  </label>
                  <input
                    id={`${uid}-new-code`}
                    name="new_code"
                    type="text"
                    placeholder="e.g. White 40GSM / Col #1001"
                    value={newCodeOrColor}
                    onChange={(e) => setNewCodeOrColor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-bold"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-new-spec`}
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Size / Specification
                  </label>
                  <input
                    id={`${uid}-new-spec`}
                    name="new_spec"
                    type="text"
                    placeholder="e.g. 36 inch x 100 Yards / 5000m"
                    value={newSpecOrSize}
                    onChange={(e) => setNewSpecOrSize(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`${uid}-new-stock`}
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Initial Stock ({newUnit})
                  </label>
                  <input
                    id={`${uid}-new-stock`}
                    name="new_stock"
                    type="number"
                    min={0}
                    value={newStock}
                    onChange={(e) => setNewStock(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-mono font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-new-threshold`}
                    className="block text-xs font-bold text-rose-700 mb-1"
                  >
                    Low Stock Alert Threshold ({newUnit}) *
                  </label>
                  <input
                    id={`${uid}-new-threshold`}
                    name="new_threshold"
                    type="number"
                    min={0}
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full bg-rose-50/60 border border-rose-300 rounded-xl p-2 text-xs font-mono font-bold text-rose-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
              >
                Save Material to Normal Inventory
              </button>
            </div>
          </form>

          {/* Bulk Restock & Low-Stock Threshold Tuning */}
          <div className="space-y-5">
            <form
              onSubmit={handleRestockSubmit}
              aria-labelledby={`${uid}-restock-heading`}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden"
            >
              <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center gap-2">
                <PackagePlus className="w-4 h-4 text-emerald-400" />
                <h3 id={`${uid}-restock-heading`} className="text-sm font-bold">
                  Bulk Restock Existing Material
                </h3>
              </div>

              <div className="p-5 space-y-3.5">
                <div>
                  <label
                    htmlFor={`${uid}-restock-item`}
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Select Material Item
                  </label>
                  <select
                    id={`${uid}-restock-item`}
                    name="restock_item_id"
                    value={restockItemId}
                    onChange={(e) => {
                      const nextId = Number(e.target.value);
                      setRestockItemId(nextId);
                      const found = items.find((i) => i.id === nextId);
                      if (found) setEditThresholdValue(found.lowStockThreshold);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800"
                  >
                    <option value={0}>
                      {items.length === 0
                        ? '-- Register a Material First --'
                        : '-- Select Material --'}
                    </option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        [{item.category}] {item.itemName} ({item.codeOrColor}) — Current:{' '}
                        {item.stock} {item.unit}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor={`${uid}-restock-qty`}
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Quantity to Add
                    </label>
                    <input
                      id={`${uid}-restock-qty`}
                      name="restock_qty"
                      type="number"
                      min={1}
                      value={restockQty}
                      onChange={(e) => setRestockQty(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-black text-emerald-700"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`${uid}-restock-rem`}
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Supplier / GRN Note
                    </label>
                    <input
                      id={`${uid}-restock-rem`}
                      name="restock_remarks"
                      type="text"
                      placeholder="e.g. New shipment received"
                      value={restockRemarks}
                      onChange={(e) => setRestockRemarks(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                >
                  Add to Material Inventory Stock
                </button>
              </div>
            </form>

            {/* Adjust Low Stock Alert Threshold for Selected Material */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-700">
                <SlidersHorizontal className="w-4 h-4 text-rose-500" />
                Update Low-Stock Warning Threshold
              </div>
              <p className="text-[11px] text-slate-500">
                When stock for the selected material falls to or below this threshold, a red{' '}
                <strong className="text-rose-700">LOW STOCK</strong> alert is displayed on the card and header.
              </p>
              <div className="flex items-center gap-2">
                <label htmlFor={`${uid}-edit-threshold`} className="sr-only">
                  Low Stock Threshold
                </label>
                <input
                  id={`${uid}-edit-threshold`}
                  name="edit_threshold"
                  type="number"
                  min={0}
                  value={editThresholdValue}
                  onChange={(e) =>
                    setEditThresholdValue(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="w-36 bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-mono font-bold text-rose-700"
                />
                <button
                  type="button"
                  onClick={handleUpdateThreshold}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer"
                >
                  Update Threshold
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
