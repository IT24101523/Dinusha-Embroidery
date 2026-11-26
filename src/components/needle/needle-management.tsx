'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { EmployeeEntity } from '@/modules/payroll/domain/entities';
import { MachineEntity, StyleMasterEntity } from '@/actions/production';
import type { UserRole } from '@/db/schema/users';
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
  Pencil,
  Trash2,
  ArrowRight,
  Clock,
  SlidersHorizontal,
  X,
  Check,
  Save,
  FolderOpen,
} from 'lucide-react';

const DEFAULT_LOW_STOCK_QTY = 200;
const MAX_STOCK_LIMIT = 50000;
const MAX_RESTOCK_QTY = 50000;
const STORAGE_TYPES_KEY = 'dinusha_needle_types_v2';
const STORAGE_LOGS_KEY = 'dinusha_needle_logs_v2';
const STORAGE_CLN_DOCS_KEY = 'dinusha_needle_cln_docs_v1';
const STORAGE_ADMIN_ADJUSTMENTS_KEY = 'dinusha_needle_admin_adjustments_v1';

const ADJUSTMENT_REASON_PRESETS = [
  'Physical Stock Audit Correction',
  'Data Entry Mistake Fix',
  'Damaged / Unusable Box Removed',
  'Opening Balance Recount',
];

const SYSTEM_PRESETS = ['DB X K5', 'DB X 1', 'DP X 5', 'UY 128 GAS', 'TV X 7'];
const SIZE_PRESETS = ['65/9', '70/10', '75/11', '80/12', '90/14', '100/16'];
const POINT_PRESETS = ['FFG/SES', 'RG', 'R', 'SAN 1', 'GEBEDUR'];
const LOW_STOCK_QUICK_QTYS = [50, 100, 200, 300, 500];
const RESTOCK_QUICK_QTYS = [50, 100, 200, 500, 1000];

function getCurrentTimeHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function getLowStockThreshold(n: Pick<NeedleTypeItem, 'lowStockQty'>): number {
  return typeof n.lowStockQty === 'number' && Number.isFinite(n.lowStockQty) && n.lowStockQty >= 0
    ? n.lowStockQty
    : DEFAULT_LOW_STOCK_QTY;
}

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
  lowStockQty: number;
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

export interface ClnSavedDoc {
  id: number;
  docNo: string;
  savedAt: string;
  date: string;
  brokenTime: string;
  letterIssueTime: string;
  needleIssueTime: string;
  section: string;
  production: string;
  needleSpec: string;
  epf: string;
  style: string;
  operation: string;
  machine: string;
  q1Mechanic: string;
  q1Answer: '' | 'Yes' | 'No';
  q2Mechanic: string;
  q2Answer: '' | 'Yes' | 'No';
  q3Answer: '' | 'Yes' | 'No';
  metalQty: number;
  q5Answer: '' | 'Yes' | 'No';
  searchTime: string;
  revNo: string;
  revDate: string;
}

export interface NeedleStockAdjustmentLog {
  id: number;
  adjustedAt: string;
  needleId: number;
  needleLabel: string;
  previousQty: number;
  newQty: number;
  diff: number;
  reason: string;
  adjustedBy: string;
}

const DEFAULT_NEEDLE_TYPES: NeedleTypeItem[] = [];

const DEFAULT_RECORD_LOGS: NeedleRecordLog[] = [];

export type NeedleSubTab =
  | 'inventory'
  | 'recordSheet'
  | 'cln'
  | 'switchNeedle'
  | 'recordBroken'
  | 'newNeedleType'
  | 'restockNeedle';

interface NeedleManagementProps {
  employees: EmployeeEntity[];
  machines?: MachineEntity[];
  styles?: StyleMasterEntity[];
  externalSubTab?: NeedleSubTab;
  userRole?: UserRole | null;
  userLabel?: string | null;
}

export function NeedleManagement({
  employees,
  machines = [],
  styles = [],
  externalSubTab,
  userRole = null,
  userLabel = null,
}: NeedleManagementProps) {
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const [subTab, setSubTab] = useState<NeedleSubTab>(externalSubTab || 'inventory');

  useEffect(() => {
    if (externalSubTab) setSubTab(externalSubTab);
  }, [externalSubTab]);
  const [needleTypes, setNeedleTypes] = useState<NeedleTypeItem[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_NEEDLE_TYPES;
    try {
      const saved = localStorage.getItem(STORAGE_TYPES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Array<Partial<NeedleTypeItem>>;
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((n, idx) => ({
            id: typeof n.id === 'number' ? n.id : Date.now() + idx,
            system: String(n.system || ''),
            size: String(n.size || ''),
            ref: String(n.ref || '-'),
            point: String(n.point || '-'),
            stock: Math.max(0, Number(n.stock) || 0),
            lowStockQty:
              typeof n.lowStockQty === 'number' && Number.isFinite(n.lowStockQty) && n.lowStockQty >= 0
                ? n.lowStockQty
                : DEFAULT_LOW_STOCK_QTY,
          }));
        }
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

  // Super Admin direct stock qty edit modal & audit log
  const stockEditDialogRef = useRef<HTMLDialogElement | null>(null);
  const [editingStockNeedle, setEditingStockNeedle] = useState<NeedleTypeItem | null>(null);
  const [editStockQtyInput, setEditStockQtyInput] = useState<string>('0');
  const [editStockReasonInput, setEditStockReasonInput] = useState<string>('');
  const [adminAdjustments, setAdminAdjustments] = useState<NeedleStockAdjustmentLog[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_ADMIN_ADJUSTMENTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as NeedleStockAdjustmentLog[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore storage errors
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ADMIN_ADJUSTMENTS_KEY, JSON.stringify(adminAdjustments));
    } catch {
      // Ignore storage errors
    }
  }, [adminAdjustments]);

  // Inventory Directory filters & inline low-stock edit / delete confirmation
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<'ALL' | 'LOW' | 'OK'>('ALL');
  const [editingThresholdId, setEditingThresholdId] = useState<number | null>(null);
  const [editingThresholdVal, setEditingThresholdVal] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Record Broken / Blunt form (all parts must be traced; missing parts go to CLN tab)
  const todayStr = new Date().toISOString().split('T')[0];
  const [brokenDate, setBrokenDate] = useState(todayStr);
  const [brokenStyle, setBrokenStyle] = useState('');
  const [brokenEpf, setBrokenEpf] = useState('');
  const [brokenMc, setBrokenMc] = useState('');
  const [brokenSeam, setBrokenSeam] = useState('');
  const [brokenNeedleId, setBrokenNeedleId] = useState<number>(0);
  const [brokenTime, setBrokenTime] = useState(() => getCurrentTimeHHMM());
  const [brokenActionType, setBrokenActionType] = useState<'BROKEN' | 'BLUNT'>('BROKEN');

  // New Needle Type form
  const [newSystem, setNewSystem] = useState('');
  const [newSize, setNewSize] = useState('');
  const [newRef, setNewRef] = useState('');
  const [newPoint, setNewPoint] = useState('');
  const [newStock, setNewStock] = useState(0);
  const [newLowStockQty, setNewLowStockQty] = useState(DEFAULT_LOW_STOCK_QTY);

  // Bulk Restock form
  const [restockNeedleId, setRestockNeedleId] = useState<number>(0);
  const [restockQty, setRestockQty] = useState(0);
  const [restockCustomLowQty, setRestockCustomLowQty] = useState<string>('');

  // CLN Form fields (100% matching official CLN-01 form)
  const [savedClnDocs, setSavedClnDocs] = useState<ClnSavedDoc[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_CLN_DOCS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ClnSavedDoc[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore storage errors
    }
    return [];
  });
  const [editingClnDocId, setEditingClnDocId] = useState<number | null>(null);
  const [clnSearchQuery, setClnSearchQuery] = useState('');
  const [clnDateFilter, setClnDateFilter] = useState('');
  const [confirmDeleteClnId, setConfirmDeleteClnId] = useState<number | null>(null);

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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CLN_DOCS_KEY, JSON.stringify(savedClnDocs));
    } catch {
      // Ignore storage errors
    }
  }, [savedClnDocs]);

  const lowStockItems = useMemo(
    () => needleTypes.filter((n) => n.stock <= getLowStockThreshold(n)),
    [needleTypes]
  );

  const lowStockCount = lowStockItems.length;

  const outOfStockCount = useMemo(
    () => needleTypes.filter((n) => n.stock <= 0).length,
    [needleTypes]
  );

  const totalStockPcs = useMemo(
    () => needleTypes.reduce((sum, n) => sum + (n.stock || 0), 0),
    [needleTypes]
  );

  const todayLogsCount = useMemo(
    () => recordLogs.filter((r) => r.date === todayStr).length,
    [recordLogs, todayStr]
  );

  const filteredNeedleTypes = useMemo(() => {
    const q = inventorySearch.trim().toLowerCase();
    return needleTypes.filter((n) => {
      const isLow = n.stock <= getLowStockThreshold(n);
      if (inventoryStatusFilter === 'LOW' && !isLow) return false;
      if (inventoryStatusFilter === 'OK' && isLow) return false;
      if (q) {
        const match =
          n.system.toLowerCase().includes(q) ||
          n.size.toLowerCase().includes(q) ||
          n.ref.toLowerCase().includes(q) ||
          n.point.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [needleTypes, inventorySearch, inventoryStatusFilter]);

  const duplicateNewSpec = useMemo(() => {
    const sys = newSystem.trim().toLowerCase();
    const sz = newSize.trim().toLowerCase();
    if (!sys || !sz) return null;
    return (
      needleTypes.find(
        (n) => n.system.toLowerCase() === sys && n.size.toLowerCase() === sz
      ) || null
    );
  }, [needleTypes, newSystem, newSize]);

  const selectedRestockNeedle = useMemo(
    () => needleTypes.find((n) => n.id === restockNeedleId) || null,
    [needleTypes, restockNeedleId]
  );

  const selectedSwitchCarried = useMemo(
    () => needleTypes.find((n) => n.id === switchCarriedId) || null,
    [needleTypes, switchCarriedId]
  );

  const selectedSwitchRequested = useMemo(
    () => needleTypes.find((n) => n.id === switchRequestedId) || null,
    [needleTypes, switchRequestedId]
  );

  const selectedBrokenNeedle = useMemo(
    () => needleTypes.find((n) => n.id === brokenNeedleId) || null,
    [needleTypes, brokenNeedleId]
  );

  const startEditLowStockThreshold = (n: NeedleTypeItem) => {
    setEditingThresholdId(n.id);
    setEditingThresholdVal(String(getLowStockThreshold(n)));
  };

  const commitLowStockThreshold = (n: NeedleTypeItem) => {
    const parsed = Math.floor(Number(editingThresholdVal));
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_STOCK_LIMIT) {
      showError(`Low Stock Alert Qty must be between 0 and ${MAX_STOCK_LIMIT.toLocaleString()} Pcs.`);
      return;
    }
    setNeedleTypes((prev) =>
      prev.map((item) => (item.id === n.id ? { ...item, lowStockQty: parsed } : item))
    );
    setEditingThresholdId(null);
    showSuccess(
      `Updated Low Stock Alert Qty for ${n.system} (${n.size}) to ≤ ${parsed.toLocaleString()} Pcs.`
    );
  };

  const handleDeleteNeedleType = (n: NeedleTypeItem) => {
    setNeedleTypes((prev) => prev.filter((item) => item.id !== n.id));
    if (restockNeedleId === n.id) setRestockNeedleId(0);
    if (switchCarriedId === n.id) setSwitchCarriedId(0);
    if (switchRequestedId === n.id) setSwitchRequestedId(0);
    if (brokenNeedleId === n.id) setBrokenNeedleId(0);
    setConfirmDeleteId(null);
    showSuccess(`Removed needle specification ${n.system} (${n.size}).`);
  };

  const jumpToRestockNeedle = (n: NeedleTypeItem) => {
    setRestockNeedleId(n.id);
    setRestockCustomLowQty(String(getLowStockThreshold(n)));
    setStatusMsg(null);
    setSubTab('restockNeedle');
  };

  const openSuperAdminStockEdit = (n: NeedleTypeItem) => {
    if (!isSuperAdmin) return;
    setEditingStockNeedle(n);
    setEditStockQtyInput(String(n.stock));
    setEditStockReasonInput('');
    if (stockEditDialogRef.current && !stockEditDialogRef.current.open) {
      stockEditDialogRef.current.showModal();
    }
  };

  const closeSuperAdminStockEdit = () => {
    if (stockEditDialogRef.current && stockEditDialogRef.current.open) {
      stockEditDialogRef.current.close();
    }
    setEditingStockNeedle(null);
    setEditStockQtyInput('0');
    setEditStockReasonInput('');
  };

  const handleConfirmSuperAdminStockEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin || !editingStockNeedle) return;

    const parsedQty = Math.floor(Number(editStockQtyInput.trim()));
    if (!Number.isFinite(parsedQty) || parsedQty < 0 || parsedQty > MAX_STOCK_LIMIT * 2) {
      showError(
        `Needle stock qty must be between 0 and ${(MAX_STOCK_LIMIT * 2).toLocaleString()} Pcs.`
      );
      return;
    }

    const reasonTrim = editStockReasonInput.trim();
    if (reasonTrim.length < 3) {
      showError('Please enter a short reason (at least 3 characters) for this manual qty edit.');
      return;
    }

    const prevQty = editingStockNeedle.stock;
    if (parsedQty === prevQty) {
      closeSuperAdminStockEdit();
      return;
    }

    const targetId = editingStockNeedle.id;
    const label = `${editingStockNeedle.system} (${editingStockNeedle.size})`;

    setNeedleTypes((prev) =>
      prev.map((item) => (item.id === targetId ? { ...item, stock: parsedQty } : item))
    );

    const logEntry: NeedleStockAdjustmentLog = {
      id: Date.now(),
      adjustedAt: new Date().toLocaleString(),
      needleId: targetId,
      needleLabel: label,
      previousQty: prevQty,
      newQty: parsedQty,
      diff: parsedQty - prevQty,
      reason: reasonTrim,
      adjustedBy: userLabel || 'Super Admin',
    };
    setAdminAdjustments((prev) => [logEntry, ...prev].slice(0, 50));

    closeSuperAdminStockEdit();
    showSuccess(
      `Super Admin Override: Updated ${label} stock from ${prevQty.toLocaleString()} Pcs to ${parsedQty.toLocaleString()} Pcs (${
        parsedQty - prevQty >= 0 ? `+${parsedQty - prevQty}` : parsedQty - prevQty
      }).`
    );
  };

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

  const machineOptions = useMemo(() => {
    if (machines && machines.length > 0) {
      return machines.map((m) => m.name);
    }
    return MACHINE_OPTIONS;
  }, [machines]);

  const styleOptions = useMemo(() => {
    if (!styles || styles.length === 0) return [];
    return styles.map((s) => (s.code ? `${s.code} - ${s.name}` : s.name));
  }, [styles]);

  const operationOptions = useMemo(() => {
    const partNames = styles.flatMap((s) => s.parts.map((p) => p.name).filter(Boolean));
    return Array.from(new Set([...partNames, ...OPERATION_OPTIONS]));
  }, [styles]);

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

    const lowQtyCount = Math.floor(Number(newLowStockQty));
    if (!Number.isFinite(lowQtyCount) || lowQtyCount < 0 || lowQtyCount > MAX_STOCK_LIMIT) {
      showError(
        `Low Stock Alert Qty must be between 0 and ${MAX_STOCK_LIMIT.toLocaleString()} Pcs.`
      );
      return;
    }

    const item: NeedleTypeItem = {
      id: Date.now(),
      system: sys,
      size: sz,
      ref: refCode || '-',
      point: pt || '-',
      stock: stockCount,
      lowStockQty: lowQtyCount,
    };

    setNeedleTypes((prev) => [...prev, item]);
    setNewSystem('');
    setNewSize('');
    setNewRef('');
    setNewPoint('');
    setNewStock(0);
    setNewLowStockQty(DEFAULT_LOW_STOCK_QTY);
    showSuccess(
      `Registered ${item.system} (${item.size}) with ${item.stock.toLocaleString()} Pcs (Low Stock Alert ≤ ${item.lowStockQty.toLocaleString()} Pcs).`
    );
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

    let nextLowThreshold = getLowStockThreshold(target);
    if (restockCustomLowQty.trim() !== '') {
      const parsedLow = Math.floor(Number(restockCustomLowQty));
      if (!Number.isFinite(parsedLow) || parsedLow < 0 || parsedLow > MAX_STOCK_LIMIT) {
        showError(
          `Low Stock Alert Qty must be between 0 and ${MAX_STOCK_LIMIT.toLocaleString()} Pcs.`
        );
        return;
      }
      nextLowThreshold = parsedLow;
    }

    const updatedStock = target.stock + qty;
    setNeedleTypes((prev) =>
      prev.map((n) =>
        n.id === restockNeedleId
          ? { ...n, stock: updatedStock, lowStockQty: nextLowThreshold }
          : n
      )
    );
    setRestockQty(0);
    showSuccess(
      `Restocked +${qty.toLocaleString()} Pcs to ${target.system} (${target.size}) — New Stock: ${updatedStock.toLocaleString()} Pcs (Alert ≤ ${nextLowThreshold.toLocaleString()}).`
    );
    setSubTab('inventory');
  };

  const filteredClnDocs = useMemo(() => {
    const q = clnSearchQuery.trim().toLowerCase();
    return savedClnDocs.filter((doc) => {
      if (clnDateFilter && doc.date !== clnDateFilter) return false;
      if (q) {
        const hay = `${doc.docNo} ${doc.style} ${doc.epf} ${doc.machine} ${doc.needleSpec} ${doc.section}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [savedClnDocs, clnSearchQuery, clnDateFilter]);

  const activeEditingClnDoc = useMemo(
    () => savedClnDocs.find((d) => d.id === editingClnDocId) || null,
    [savedClnDocs, editingClnDocId]
  );

  const validateClnForm = (): string | null => {
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
      return `CLN-01: Please complete: ${missing.join(', ')}.`;
    }
    if (clnMetalQty < 0 || clnMetalQty > 10000) {
      return 'CLN-01: Quantity of metal detected must be between 0 and 10,000.';
    }
    return null;
  };

  const handleNewBlankCln = () => {
    setEditingClnDocId(null);
    setClnDate(todayStr);
    setClnBrokenTime('');
    setClnLetterIssueTime('');
    setClnNeedleIssueTime('');
    setClnSection('');
    setClnProduction('');
    setClnNeedleSpec('');
    setClnEpf('');
    setClnStyle('');
    setClnOperation('');
    setClnMachine('');
    setClnQ1Mechanic('');
    setClnQ1Answer('');
    setClnQ2Mechanic('');
    setClnQ2Answer('');
    setClnQ3Answer('');
    setClnMetalQty(0);
    setClnQ5Answer('');
    setClnSearchTime('');
    setClnRevNo('');
    setClnRevDate('');
    setStatusMsg(null);
  };

  const handleLoadClnDoc = (doc: ClnSavedDoc, silent = false) => {
    setEditingClnDocId(doc.id);
    setClnDate(doc.date);
    setClnBrokenTime(doc.brokenTime);
    setClnLetterIssueTime(doc.letterIssueTime);
    setClnNeedleIssueTime(doc.needleIssueTime);
    setClnSection(doc.section);
    setClnProduction(doc.production);
    setClnNeedleSpec(doc.needleSpec);
    setClnEpf(doc.epf);
    setClnStyle(doc.style);
    setClnOperation(doc.operation);
    setClnMachine(doc.machine);
    setClnQ1Mechanic(doc.q1Mechanic);
    setClnQ1Answer(doc.q1Answer);
    setClnQ2Mechanic(doc.q2Mechanic);
    setClnQ2Answer(doc.q2Answer);
    setClnQ3Answer(doc.q3Answer);
    setClnMetalQty(doc.metalQty);
    setClnQ5Answer(doc.q5Answer);
    setClnSearchTime(doc.searchTime);
    setClnRevNo(doc.revNo);
    setClnRevDate(doc.revDate);
    if (!silent) {
      showSuccess(`Loaded saved checklist ${doc.docNo} (${doc.date} • ${doc.style}).`);
    }
  };

  const handleSaveClnDoc = (andPrint = false): boolean => {
    const err = validateClnForm();
    if (err) {
      showError(err);
      return false;
    }

    const nowIso = new Date().toISOString();
    const existing = editingClnDocId
      ? savedClnDocs.find((d) => d.id === editingClnDocId)
      : undefined;

    let docNo = existing?.docNo || '';
    if (!docNo) {
      const dateCompact = clnDate.replaceAll('-', '');
      const sameDayCount = savedClnDocs.filter((d) => d.date === clnDate).length + 1;
      docNo = `CLN-${dateCompact}-${String(sameDayCount).padStart(2, '0')}`;
      let suffix = sameDayCount;
      while (savedClnDocs.some((d) => d.docNo === docNo)) {
        suffix += 1;
        docNo = `CLN-${dateCompact}-${String(suffix).padStart(2, '0')}`;
      }
    }

    const nextDoc: ClnSavedDoc = {
      id: existing ? existing.id : Date.now(),
      docNo,
      savedAt: nowIso,
      date: clnDate,
      brokenTime: clnBrokenTime,
      letterIssueTime: clnLetterIssueTime,
      needleIssueTime: clnNeedleIssueTime,
      section: clnSection,
      production: clnProduction,
      needleSpec: clnNeedleSpec,
      epf: clnEpf,
      style: clnStyle.trim(),
      operation: clnOperation,
      machine: clnMachine,
      q1Mechanic: clnQ1Mechanic.trim(),
      q1Answer: clnQ1Answer,
      q2Mechanic: clnQ2Mechanic.trim(),
      q2Answer: clnQ2Answer,
      q3Answer: clnQ3Answer,
      metalQty: clnMetalQty,
      q5Answer: clnQ5Answer,
      searchTime: clnSearchTime,
      revNo: clnRevNo.trim(),
      revDate: clnRevDate.trim(),
    };

    setSavedClnDocs((prev) =>
      existing ? prev.map((d) => (d.id === existing.id ? nextDoc : d)) : [nextDoc, ...prev]
    );
    setEditingClnDocId(nextDoc.id);

    if (andPrint) {
      setStatusMsg(null);
      setTimeout(() => {
        window.print();
      }, 80);
    } else {
      showSuccess(
        existing
          ? `Updated saved checklist ${nextDoc.docNo}.`
          : `Saved CLN-01 checklist ${nextDoc.docNo} to archive list.`
      );
    }
    return true;
  };

  const handlePrintSavedClnDoc = (doc: ClnSavedDoc) => {
    handleLoadClnDoc(doc, true);
    setStatusMsg(null);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDeleteClnDoc = (doc: ClnSavedDoc) => {
    setSavedClnDocs((prev) => prev.filter((d) => d.id !== doc.id));
    if (editingClnDocId === doc.id) {
      setEditingClnDocId(null);
    }
    setConfirmDeleteClnId(null);
    showSuccess(`Deleted saved checklist ${doc.docNo}.`);
  };

  const handlePrintActiveView = () => {
    if (subTab === 'cln') {
      handleSaveClnDoc(true);
      return;
    }
    setStatusMsg(null);
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Studio Command Header */}
      <div className="bg-persian-800 text-white rounded-2xl p-5 shadow-md border border-persian-900 space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 text-amber-300 flex items-center justify-center shrink-0 shadow-inner">
              <Pin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight uppercase">
                  Needle &amp; Safety Studio
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Tesco Audit Compliant
                </span>
              </div>
              <p className="text-xs text-blue-200/90 mt-0.5">
                Groz-Beckert needle inventory, custom low-stock alerts, broken/switch tracking &amp; CLN-01 safety checklist.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {lowStockCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStatusMsg(null);
                  setSubTab('restockNeedle');
                }}
                className="px-3 py-2 rounded-xl bg-rose-500/25 hover:bg-rose-500/35 border border-rose-300/40 text-rose-100 text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
                <span>{lowStockCount} Low Stock — Restock</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrintActiveView}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-persian-950 font-extrabold text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Active View
            </button>
          </div>
        </div>

        {/* 4-Card KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          <div className="bg-persian-900/60 border border-persian-700/70 rounded-xl px-3.5 py-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-200/80">
              Total Needles in Stock
            </div>
            <div className="text-lg font-mono font-black text-white mt-0.5">
              {totalStockPcs.toLocaleString()} <span className="text-xs font-sans font-semibold text-blue-200">Pcs</span>
            </div>
          </div>
          <div className="bg-persian-900/60 border border-persian-700/70 rounded-xl px-3.5 py-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-200/80">
              Registered Specs
            </div>
            <div className="text-lg font-mono font-black text-white mt-0.5">
              {needleTypes.length} <span className="text-xs font-sans font-semibold text-blue-200">Types</span>
            </div>
          </div>
          <div
            className={`rounded-xl px-3.5 py-2.5 border ${
              lowStockCount > 0
                ? 'bg-rose-950/60 border-rose-400/50'
                : 'bg-persian-900/60 border-persian-700/70'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-200/80">
              Low / Out of Stock
            </div>
            <div
              className={`text-lg font-mono font-black mt-0.5 ${
                lowStockCount > 0 ? 'text-rose-300' : 'text-emerald-300'
              }`}
            >
              {lowStockCount}{' '}
              <span className="text-xs font-sans font-semibold opacity-80">
                ({outOfStockCount} Empty)
              </span>
            </div>
          </div>
          <div className="bg-persian-900/60 border border-persian-700/70 rounded-xl px-3.5 py-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-200/80">
              Today&apos;s Floor Records
            </div>
            <div className="text-lg font-mono font-black text-amber-300 mt-0.5">
              {todayLogsCount}{' '}
              <span className="text-xs font-sans font-semibold text-blue-200">
                ({recordLogs.length} Total)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs (Clean & Dedicated Tabs for New Needle Type vs Restock) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-2 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'inventory', label: 'Stock Directory', icon: Boxes, badge: needleTypes.length },
              { id: 'newNeedleType', label: 'New Needle Type', icon: PlusCircle },
              {
                id: 'restockNeedle',
                label: 'Restock Inventory',
                icon: PackagePlus,
                alertBadge: lowStockCount > 0 ? lowStockCount : undefined,
              },
              { id: 'switchNeedle', label: 'Switch Needle', icon: RefreshCw },
              { id: 'recordBroken', label: 'Record Broken', icon: AlertTriangle },
              { id: 'recordSheet', label: 'Broken & Issued Sheet', icon: FileText },
              {
                id: 'cln',
                label: 'Missing Checklist (CLN)',
                icon: ShieldAlert,
                badge: savedClnDocs.length,
              },
            ] as Array<{
              id: NeedleSubTab;
              label: string;
              icon: React.ComponentType<{ className?: string }>;
              badge?: number;
              alertBadge?: number;
            }>
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
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                  active
                    ? 'bg-persian-800 text-white border-persian-900 shadow-xs'
                    : tab.id === 'restockNeedle' && lowStockCount > 0
                      ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                      : tab.id === 'newNeedleType'
                        ? 'bg-indigo-50/70 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
                        : 'bg-white text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
                {typeof tab.alertBadge === 'number' && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-600 text-white">
                    {tab.alertBadge} Low
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Banner */}
      {statusMsg && (
        <div
          role={statusMsg.type === 'error' ? 'alert' : 'status'}
          className={`px-4 py-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 print:hidden ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            aria-label="Dismiss notification"
            className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
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
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Boxes className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-extrabold text-slate-900">
                  No Needle Types Registered Yet
                </h3>
                <p className="text-xs text-slate-500">
                  Start by registering your factory needle specifications (System, Size, Initial Stock &amp; Low Stock Alert Qty) in the New Needle Type tab.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubTab('newNeedleType')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-persian-800 hover:bg-persian-600 text-white text-xs font-extrabold transition shadow-sm cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Register First Needle Type
              </button>
            </div>
          ) : (
            <>
              {/* Search, Filter & Quick Actions Bar */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search system, size, ref, point..."
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-persian-500"
                    />
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    {(
                      [
                        { id: 'ALL', label: `All (${needleTypes.length})` },
                        { id: 'LOW', label: `Low Stock (${lowStockCount})` },
                        { id: 'OK', label: `Optimal (${needleTypes.length - lowStockCount})` },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setInventoryStatusFilter(f.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          inventoryStatusFilter === f.id
                            ? 'bg-white text-persian-800 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSubTab('newNeedleType')}
                    className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>New Needle Type</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubTab('restockNeedle')}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <PackagePlus className="w-3.5 h-3.5" />
                    <span>Restock Stock</span>
                  </button>
                </div>
              </div>

              {/* Modern Visual Stock Cards */}
              {filteredNeedleTypes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                  No needle specs match your current search / filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                  {filteredNeedleTypes.map((n) => {
                    const threshold = getLowStockThreshold(n);
                    const isEmpty = n.stock <= 0;
                    const isLow = n.stock <= threshold;
                    const progressTarget = Math.max(threshold * 2, 100);
                    const healthPct = Math.min(100, Math.round((n.stock / progressTarget) * 100));

                    return (
                      <div
                        key={n.id}
                        className={`bg-white p-4 rounded-2xl border shadow-xs flex flex-col justify-between transition hover:shadow-md ${
                          isEmpty
                            ? 'border-rose-400 ring-2 ring-rose-100'
                            : isLow
                              ? 'border-amber-300 ring-2 ring-amber-50'
                              : 'border-slate-200/90'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1.5 mb-2">
                            <span className="bg-persian-800 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wide">
                              {n.system}
                            </span>
                            {isEmpty ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-600 text-white uppercase">
                                Out of Stock
                              </span>
                            ) : isLow ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300 uppercase">
                                Low Stock
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                                Optimal
                              </span>
                            )}
                          </div>
                          <h4 className="font-black text-slate-900 text-base leading-tight">
                            Size {n.size}
                          </h4>
                          <div className="text-[11px] font-semibold text-slate-500 mt-0.5 flex items-center justify-between gap-1">
                            <span className="truncate">Point: {n.point}</span>
                            <span className="font-mono text-[10px] text-slate-400 shrink-0">
                              Ref: {n.ref}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3.5 space-y-2">
                          <div className="flex items-baseline justify-between">
                            <span className="text-[10px] font-bold uppercase text-slate-400">
                              Available
                            </span>
                            <span
                              className={`text-xl font-mono font-black ${
                                isEmpty
                                  ? 'text-rose-600'
                                  : isLow
                                    ? 'text-amber-600'
                                    : 'text-emerald-700'
                              }`}
                            >
                              {n.stock.toLocaleString()}{' '}
                              <span className="text-[10px] font-sans font-bold text-slate-400">
                                Pcs
                              </span>
                            </span>
                          </div>

                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/70">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isEmpty
                                  ? 'bg-rose-600'
                                  : isLow
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.max(healthPct, isEmpty ? 0 : 8)}%` }}
                            />
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                            <span className="text-[10px] font-bold text-slate-500 font-mono">
                              Alert ≤ {threshold.toLocaleString()}
                            </span>
                            <div className="flex items-center gap-1">
                              {isSuperAdmin && (
                                <button
                                  type="button"
                                  onClick={() => openSuperAdminStockEdit(n)}
                                  title="Super Admin: Direct Edit Current Qty"
                                  className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-500 text-amber-800 hover:text-white border border-amber-300 text-[10px] font-extrabold transition cursor-pointer inline-flex items-center gap-0.5"
                                >
                                  <Pencil className="w-2.5 h-2.5" />
                                  <span>Edit</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => jumpToRestockNeedle(n)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${
                                  isLow
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                    : 'bg-slate-100 hover:bg-persian-800 hover:text-white text-slate-700'
                                }`}
                              >
                                + Restock
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Detailed Needle Inventory Ledger */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-persian-600" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      Detailed Needle Inventory Ledger
                    </h3>
                    {isSuperAdmin && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1 print:hidden">
                        <ShieldCheck className="w-3 h-3 text-amber-700" />
                        Super Admin Qty Edit Enabled
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Click any Low Stock Qty to adjust its alert threshold • Showing {filteredNeedleTypes.length} of {needleTypes.length}
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
                        <th className="py-3 px-4">Low Stock Alert Qty</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right print:hidden">Quick Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredNeedleTypes.map((n) => {
                        const threshold = getLowStockThreshold(n);
                        const isEmpty = n.stock <= 0;
                        const isLow = n.stock <= threshold;
                        const isEditingThreshold = editingThresholdId === n.id;
                        const isConfirmingDelete = confirmDeleteId === n.id;

                        return (
                          <tr key={n.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                              {n.ref}
                            </td>
                            <td className="py-3 px-4 font-extrabold text-slate-900">{n.system}</td>
                            <td className="py-3 px-4 font-extrabold text-slate-800">{n.size}</td>
                            <td className="py-3 px-4 text-slate-600 font-medium">{n.point}</td>
                            <td
                              className={`py-3 px-4 font-mono font-black ${
                                isEmpty
                                  ? 'text-rose-600'
                                  : isLow
                                    ? 'text-amber-600'
                                    : 'text-emerald-700'
                              }`}
                            >
                              {n.stock.toLocaleString()} Pcs
                            </td>
                            <td className="py-3 px-4">
                              {isEditingThreshold ? (
                                <div className="inline-flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    max={MAX_STOCK_LIMIT}
                                    autoFocus
                                    value={editingThresholdVal}
                                    onFocus={(e) => e.currentTarget.select()}
                                    onChange={(e) => setEditingThresholdVal(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        commitLowStockThreshold(n);
                                      } else if (e.key === 'Escape') {
                                        setEditingThresholdId(null);
                                      }
                                    }}
                                    className="w-20 px-2 py-1 rounded-lg border-2 border-persian-500 bg-white font-mono font-bold text-xs text-persian-900 outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => commitLowStockThreshold(n)}
                                    aria-label="Save alert threshold"
                                    className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingThresholdId(null)}
                                    aria-label="Cancel threshold edit"
                                    className="p-1 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => startEditLowStockThreshold(n)}
                                  title="Click to edit Low Stock Alert Qty"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 font-mono font-bold transition cursor-pointer"
                                >
                                  <span>≤ {threshold.toLocaleString()} Pcs</span>
                                  <Pencil className="w-3 h-3 text-slate-400" />
                                </button>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {isEmpty ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                                  OUT OF STOCK
                                </span>
                              ) : isLow ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                                  LOW STOCK
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Optimal Stock
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right print:hidden">
                              <div className="inline-flex items-center gap-1.5">
                                {isSuperAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => openSuperAdminStockEdit(n)}
                                    title="Super Admin: Direct Edit Current Stock Qty"
                                    className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-500 text-amber-900 hover:text-white border border-amber-300 font-extrabold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    <span>Edit Qty</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => jumpToRestockNeedle(n)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-200 font-bold text-[11px] transition cursor-pointer"
                                >
                                  + Restock
                                </button>
                                {isConfirmingDelete ? (
                                  <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-300 rounded-lg px-2 py-0.5">
                                    <span className="text-[10px] font-extrabold text-rose-800">
                                      Delete?
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteNeedleType(n)}
                                      className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                                    >
                                      Yes
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(n.id)}
                                    aria-label={`Delete ${n.system} ${n.size}`}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Super Admin Manual Qty Adjustment Audit Trail */}
              {isSuperAdmin && adminAdjustments.length > 0 && (
                <div className="bg-white rounded-2xl border border-amber-200 shadow-xs overflow-hidden print:hidden">
                  <div className="px-5 py-3 border-b border-amber-100 bg-amber-50/70 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-700" />
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-950">
                        Super Admin Manual Qty Adjustment History ({adminAdjustments.length})
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-amber-800">
                      Visible to Super Admin Only
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-52 overflow-y-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-4">Date &amp; Time</th>
                          <th className="py-2 px-4">Needle Spec</th>
                          <th className="py-2 px-4">Old → New Qty</th>
                          <th className="py-2 px-4">Reason</th>
                          <th className="py-2 px-4">Adjusted By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {adminAdjustments.map((adj) => (
                          <tr key={adj.id} className="hover:bg-slate-50">
                            <td className="py-2 px-4 font-mono text-[11px] text-slate-600">
                              {adj.adjustedAt}
                            </td>
                            <td className="py-2 px-4 font-bold text-slate-900">
                              {adj.needleLabel}
                            </td>
                            <td className="py-2 px-4 font-mono font-extrabold">
                              <span className="text-slate-500">
                                {adj.previousQty.toLocaleString()}
                              </span>{' '}
                              →{' '}
                              <span className="text-persian-800">
                                {adj.newQty.toLocaleString()} Pcs
                              </span>{' '}
                              <span
                                className={`ml-1 text-[10px] px-1.5 py-0.2 rounded ${
                                  adj.diff >= 0
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {adj.diff >= 0 ? `+${adj.diff}` : adj.diff}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-slate-700 font-medium">{adj.reason}</td>
                            <td className="py-2 px-4 text-slate-500 font-semibold">
                              {adj.adjustedBy}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
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
        <div className="space-y-5">
          {/* Saved CLN-01 Documents Archive List (Hidden on Print) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden print:hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-persian-50 text-persian-700 flex items-center justify-center">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    Saved CLN-01 Missing Needle Checklists ({savedClnDocs.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Save karapu hama CLN-01 document ekakma methana thiyenawa — ona welawaka select karala load / print karanna
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search Doc No, Style, EPF..."
                    value={clnSearchQuery}
                    onChange={(e) => setClnSearchQuery(e.target.value)}
                    className="pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-persian-500 w-48"
                  />
                </div>
                <input
                  type="date"
                  value={clnDateFilter}
                  onChange={(e) => setClnDateFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold outline-none focus:border-persian-500"
                />
                {(clnSearchQuery || clnDateFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setClnSearchQuery('');
                      setClnDateFilter('');
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNewBlankCln}
                  className="px-3.5 py-1.5 rounded-xl bg-persian-800 hover:bg-persian-600 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>New Blank CLN</span>
                </button>
              </div>
            </div>

            {savedClnDocs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Thama saved CLN-01 documents na. Pahala checklist eka fill karala{' '}
                <strong>Save CLN Document</strong> click kalama methanata add wenawa.
              </div>
            ) : filteredClnDocs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No saved CLN documents match your search / date filter.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-4">Doc No</th>
                      <th className="py-2.5 px-4">Date &amp; Time</th>
                      <th className="py-2.5 px-4">Style &amp; Machine</th>
                      <th className="py-2.5 px-4">Operator &amp; Needle</th>
                      <th className="py-2.5 px-4">Search / Metal</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClnDocs.map((doc) => {
                      const isLoaded = editingClnDocId === doc.id;
                      const isConfirmDel = confirmDeleteClnId === doc.id;
                      return (
                        <tr
                          key={doc.id}
                          className={`transition ${
                            isLoaded ? 'bg-indigo-50/80' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-2.5 px-4 font-mono font-extrabold text-persian-800">
                            <div className="flex items-center gap-1.5">
                              <span>{doc.docNo}</span>
                              {isLoaded && (
                                <span className="px-1.5 py-0.2 rounded bg-persian-800 text-white text-[9px] font-bold font-sans uppercase">
                                  Loaded
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-700">
                            <div className="font-bold">{doc.date}</div>
                            <div className="text-[10px] text-slate-400">
                              Broken: {doc.brokenTime || '—'}
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="font-bold text-slate-900">{doc.style}</div>
                            <div className="text-[10px] text-slate-500">
                              {doc.machine} • {doc.section}
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-slate-800">{doc.epf}</div>
                            <div className="text-[10px] font-mono text-indigo-700">
                              {doc.needleSpec}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-[11px]">
                            <div className="font-semibold text-slate-700">
                              Search: {doc.searchTime}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Metal Qty: {doc.metalQty}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleLoadClnDoc(doc)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 font-bold text-[11px] transition cursor-pointer"
                              >
                                View / Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePrintSavedClnDoc(doc)}
                                className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-persian-950 font-extrabold text-[11px] inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Print</span>
                              </button>
                              {isConfirmDel ? (
                                <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-300 rounded-lg px-2 py-0.5">
                                  <span className="text-[10px] font-extrabold text-rose-800">
                                    Del?
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteClnDoc(doc)}
                                    className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteClnId(null)}
                                    className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteClnId(doc.id)}
                                  aria-label={`Delete ${doc.docNo}`}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Active CLN-01 Save / Print Toolbar (Hidden on Print) */}
          <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200/90 shadow-xs px-4 py-3 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-2">
              {activeEditingClnDoc ? (
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-800 border border-indigo-200 font-mono">
                  Viewing / Editing: {activeEditingClnDoc.docNo}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                  New Unsaved CLN-01 Document
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleNewBlankCln}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                + New Blank
              </button>
              <button
                type="button"
                onClick={() => handleSaveClnDoc(false)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{activeEditingClnDoc ? 'Update Saved CLN' : 'Save CLN Document'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveClnDoc(true)}
                className="px-4 py-2 rounded-xl bg-persian-800 hover:bg-persian-600 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-amber-300" />
                <span>Save &amp; Print CLN</span>
              </button>
            </div>
          </div>

          {/* Official Printable CLN-01 Sheet */}
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
                      {clnEpf &&
                        !employees.some((emp) => `EPF ${emp.epfNo} - ${emp.fullName}` === clnEpf) && (
                          <option value={clnEpf}>{clnEpf}</option>
                        )}
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
                    {styleOptions.length > 0 ? (
                      <select
                        value={clnStyle}
                        onChange={(e) => setClnStyle(e.target.value)}
                        className="cln-select w-full text-center font-bold bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-[11px]"
                      >
                        <option value="">-- Select Style --</option>
                        {clnStyle && !styleOptions.includes(clnStyle) && (
                          <option value={clnStyle}>{clnStyle}</option>
                        )}
                        {styleOptions.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        maxLength={60}
                        placeholder="Enter Style No"
                        value={clnStyle}
                        onChange={(e) => setClnStyle(e.target.value)}
                        className="w-full text-center font-bold bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 print:border-none print:bg-transparent"
                      />
                    )}
                  </td>
                  <td className="w-1/3 border-r border-black p-1.5 align-top">
                    <div className="font-bold text-center mb-1">Operation</div>
                    <select
                      value={clnOperation}
                      onChange={(e) => setClnOperation(e.target.value)}
                      className="cln-select w-full text-center font-bold bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-[11px]"
                    >
                      <option value="">-- Select Operation --</option>
                      {clnOperation && !operationOptions.includes(clnOperation) && (
                        <option value={clnOperation}>{clnOperation}</option>
                      )}
                      {operationOptions.map((op) => (
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
                      {clnMachine && !machineOptions.includes(clnMachine) && (
                        <option value={clnMachine}>{clnMachine}</option>
                      )}
                      {machineOptions.map((mc) => (
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
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 4: SWITCH NEEDLE (ERROR-PROOF STEPPED DESIGN) */}
      {/* ================================================================= */}
      {subTab === 'switchNeedle' && (
        <div className="max-w-3xl mx-auto">
          {needleTypes.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center space-y-3">
              <RefreshCw className="w-9 h-9 text-slate-300 mx-auto" />
              <h3 className="text-sm font-extrabold text-slate-800">
                Register Needle Types Before Switching
              </h3>
              <p className="text-xs text-slate-500">
                Stock Directory eke needle specs add karala inna one switch action ekak karanna.
              </p>
              <button
                type="button"
                onClick={() => setSubTab('newNeedleType')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-persian-800 text-white text-xs font-bold cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Add Needle Type
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSwitchNeedle}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-soft overflow-hidden"
            >
              <div className="bg-persian-800 text-white px-5 py-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold">Switch Needle (Size / Type Swap)</h3>
                    <p className="text-[11px] text-blue-200">
                      Returned old needle (+1 In) • Issued new needle (-1 Out) • Auto-logged to Record Sheet
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Step 1: Operator & Job Context */}
                <div className="space-y-3">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-persian-800 text-white text-[10px] flex items-center justify-center">
                      1
                    </span>
                    Operator, Machine &amp; Style Details
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Operator EPF / Name *
                      </label>
                      <select
                        value={switchOperator}
                        onChange={(e) => setSwitchOperator(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-persian-500"
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
                        Machine Number *
                      </label>
                      <select
                        value={switchMachine}
                        onChange={(e) => setSwitchMachine(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-persian-500"
                      >
                        <option value="">-- Select Machine --</option>
                        {machineOptions.map((mc) => (
                          <option key={mc} value={mc}>
                            {mc}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Style Number *
                      </label>
                      {styleOptions.length > 0 ? (
                        <select
                          value={switchStyle}
                          onChange={(e) => setSwitchStyle(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-persian-500"
                        >
                          <option value="">-- Select Style --</option>
                          {styleOptions.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          maxLength={60}
                          required
                          placeholder="Enter Style No."
                          value={switchStyle}
                          onChange={(e) => setSwitchStyle(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-persian-500"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Seam Location *
                      </label>
                      <select
                        value={switchSeam}
                        onChange={(e) => setSwitchSeam(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-persian-500"
                      >
                        <option value="">-- Select Seam Location --</option>
                        {operationOptions.map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Step 2: Needle Swap */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-persian-800 text-white text-[10px] flex items-center justify-center">
                      2
                    </span>
                    Select Needles to Swap
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                      <label className="block text-xs font-extrabold text-amber-900">
                        Old Needle Returned (+1 Stock In) *
                      </label>
                      <select
                        value={switchCarriedId}
                        onChange={(e) => setSwitchCarriedId(Number(e.target.value))}
                        className="w-full bg-white border border-amber-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none"
                      >
                        <option value={0}>-- Select Returned Needle --</option>
                        {needleTypes.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.system} — Size {n.size} (Stock: {n.stock})
                          </option>
                        ))}
                      </select>
                      {selectedSwitchCarried && (
                        <div className="text-[11px] font-mono font-bold text-amber-800">
                          Stock: {selectedSwitchCarried.stock} →{' '}
                          {selectedSwitchRequested?.id === selectedSwitchCarried.id
                            ? `${selectedSwitchCarried.stock} (Same type)`
                            : `${selectedSwitchCarried.stock + 1} Pcs (+1)`}
                        </div>
                      )}
                    </div>

                    <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                      <label className="block text-xs font-extrabold text-emerald-900">
                        New Needle Issued (-1 Stock Out) *
                      </label>
                      <select
                        value={switchRequestedId}
                        onChange={(e) => setSwitchRequestedId(Number(e.target.value))}
                        className="w-full bg-white border border-emerald-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none"
                      >
                        <option value={0}>-- Select New Needle --</option>
                        {needleTypes.map((n) => (
                          <option key={n.id} value={n.id} disabled={n.stock <= 0}>
                            {n.system} — Size {n.size} (
                            {n.stock <= 0 ? 'OUT OF STOCK' : `Stock: ${n.stock}`})
                          </option>
                        ))}
                      </select>
                      {selectedSwitchRequested && (
                        <div className="text-[11px] font-mono font-bold text-emerald-800">
                          Stock: {selectedSwitchRequested.stock} →{' '}
                          {selectedSwitchCarried?.id === selectedSwitchRequested.id
                            ? `${selectedSwitchRequested.stock} (Same type)`
                            : `${Math.max(0, selectedSwitchRequested.stock - 1)} Pcs (-1)`}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedSwitchCarried &&
                    selectedSwitchRequested &&
                    selectedSwitchCarried.id === selectedSwitchRequested.id && (
                      <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl px-3.5 py-2.5 text-xs font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          Note: Returned needle ha Requested needle dekama ekama type ekai ({selectedSwitchCarried.system} {selectedSwitchCarried.size}) — stock wenas wenne na.
                        </span>
                      </div>
                    )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Confirm Switch &amp; Log to Record Sheet</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 5: RECORD BROKEN / BLUNT NEEDLE (TRACED ONLY) */}
      {/* ================================================================= */}
      {subTab === 'recordBroken' && (
        <div className="max-w-4xl mx-auto">
          {needleTypes.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center space-y-3">
              <AlertTriangle className="w-9 h-9 text-slate-300 mx-auto" />
              <h3 className="text-sm font-extrabold text-slate-800">
                Register Needle Types First
              </h3>
              <p className="text-xs text-slate-500">
                Broken / Blunt needle record karanna kalin Stock Directory eke needle spec ekak register karanna.
              </p>
              <button
                type="button"
                onClick={() => setSubTab('newNeedleType')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-persian-800 text-white text-xs font-bold cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Add Needle Type
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleBrokenRecord}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-soft overflow-hidden"
            >
              <div className="bg-persian-800 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/25 text-amber-300 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold">
                      Record Broken / Blunt Needle (All Parts Traced)
                    </h3>
                    <p className="text-[11px] text-blue-200">
                      Needle piece ekak missing nam Missing Checklist (CLN) tab eka use karanna.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-persian-900/70 p-1 rounded-xl border border-persian-700">
                  {(['BROKEN', 'BLUNT'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setBrokenActionType(t)}
                      className={`px-3.5 py-1.5 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${
                        brokenActionType === t
                          ? t === 'BROKEN'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-amber-400 text-persian-950 shadow-xs'
                          : 'text-blue-200 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
                    <input
                      type="date"
                      max={todayStr}
                      value={brokenDate}
                      onChange={(e) => setBrokenDate(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold outline-none focus:border-persian-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Incident Time *
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="time"
                        value={brokenTime}
                        onChange={(e) => setBrokenTime(e.target.value)}
                        required
                        className="flex-1 bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold outline-none focus:border-persian-500"
                      />
                      <button
                        type="button"
                        onClick={() => setBrokenTime(getCurrentTimeHHMM())}
                        title="Set current time"
                        className="px-2.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Now
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Operator EPF / Name *
                    </label>
                    <select
                      value={brokenEpf}
                      onChange={(e) => setBrokenEpf(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-persian-500"
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
                      Machine Number *
                    </label>
                    <select
                      value={brokenMc}
                      onChange={(e) => setBrokenMc(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-persian-500"
                    >
                      <option value="">-- Select Machine --</option>
                      {machineOptions.map((mc) => (
                        <option key={mc} value={mc}>
                          {mc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Style No. *
                    </label>
                    {styleOptions.length > 0 ? (
                      <select
                        value={brokenStyle}
                        onChange={(e) => setBrokenStyle(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-persian-500"
                      >
                        <option value="">-- Select Style --</option>
                        {styleOptions.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        maxLength={60}
                        required
                        placeholder="Enter Style No."
                        value={brokenStyle}
                        onChange={(e) => setBrokenStyle(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-persian-500"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Seam Location *
                    </label>
                    <select
                      value={brokenSeam}
                      onChange={(e) => setBrokenSeam(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-persian-500"
                    >
                      <option value="">-- Select Seam Location --</option>
                      {operationOptions.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Replacement Needle Spec (-1 Pc from Stock) *
                    </label>
                    <select
                      value={brokenNeedleId}
                      onChange={(e) => setBrokenNeedleId(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-persian-500"
                    >
                      <option value={0}>-- Select Needle Spec --</option>
                      {needleTypes.map((n) => (
                        <option key={n.id} value={n.id} disabled={n.stock <= 0}>
                          {n.system} — Size {n.size} (
                          {n.stock <= 0 ? 'OUT OF STOCK' : `Stock: ${n.stock} Pcs`})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Live Stock Impact Preview */}
                {selectedBrokenNeedle && (
                  <div
                    className={`rounded-xl border p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs font-bold ${
                      selectedBrokenNeedle.stock - 1 <= getLowStockThreshold(selectedBrokenNeedle)
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>
                      Stock Impact for {selectedBrokenNeedle.system} ({selectedBrokenNeedle.size}):{' '}
                      <strong className="font-mono">
                        {selectedBrokenNeedle.stock} → {Math.max(0, selectedBrokenNeedle.stock - 1)}{' '}
                        Pcs
                      </strong>
                    </span>
                    <span className="font-mono text-[11px]">
                      Low Stock Alert: ≤ {getLowStockThreshold(selectedBrokenNeedle)} Pcs
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-end pt-1">
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-persian-800 hover:bg-persian-600 text-white text-xs font-extrabold shadow-sm transition cursor-pointer"
                  >
                    Save {brokenActionType} Record (Traced) &amp; Deduct 1 Pc
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 6: REGISTER NEW NEEDLE TYPE (DEDICATED TAB + LOW STOCK QTY) */}
      {/* ================================================================= */}
      {subTab === 'newNeedleType' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Clean Guided Registration Form */}
          <form
            onSubmit={handleSaveNewType}
            className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-soft overflow-hidden"
          >
            <div className="bg-persian-800 text-white px-5 py-4 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
                <PlusCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold">Register New Needle Type</h3>
                <p className="text-[11px] text-blue-200">
                  Preset buttons click karala ho type karala accurate widihata add karanna
                </p>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* System & Size with Quick Presets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-700">
                    Needle System *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={30}
                    placeholder="e.g. DB X K5"
                    value={newSystem}
                    onChange={(e) => setNewSystem(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-persian-500"
                  />
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {SYSTEM_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNewSystem(preset)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition cursor-pointer ${
                          newSystem === preset
                            ? 'bg-persian-800 text-white border-persian-900'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-700">
                    Size / Nm *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    placeholder="e.g. 75/11"
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-persian-500"
                  />
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {SIZE_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNewSize(preset)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition cursor-pointer ${
                          newSize === preset
                            ? 'bg-persian-800 text-white border-persian-900'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Instant Duplicate Warning */}
              {duplicateNewSpec && (
                <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      &ldquo;{duplicateNewSpec.system} ({duplicateNewSpec.size})&rdquo; danatamath register karala thiyenne (Stock: {duplicateNewSpec.stock} Pcs).
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToRestockNeedle(duplicateNewSpec)}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Go to Restock</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Ref Code & Point Variant */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                    Ref / Box Code (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={30}
                    placeholder="e.g. 785965"
                    value={newRef}
                    onChange={(e) => setNewRef(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold outline-none focus:border-persian-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-700">
                    Point Variant (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={30}
                    placeholder="e.g. FFG/SES"
                    value={newPoint}
                    onChange={(e) => setNewPoint(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-persian-500"
                  />
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {POINT_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNewPoint(preset)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition cursor-pointer ${
                          newPoint === preset
                            ? 'bg-persian-800 text-white border-persian-900'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Initial Stock & Custom Low Stock Alert Qty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-1.5">
                  <label className="block text-xs font-extrabold text-emerald-900">
                    Opening / Initial Stock (Pcs) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={MAX_STOCK_LIMIT}
                    value={newStock}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setNewStock(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full bg-white border border-emerald-300 rounded-xl p-2.5 text-sm font-mono font-black text-emerald-800 outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] font-semibold text-emerald-700">
                    Dan store eke thiyana needle pcs gana enter karanna.
                  </p>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-1.5">
                  <label className="block text-xs font-extrabold text-amber-950">
                    Low Stock Alert Qty (Pcs) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={MAX_STOCK_LIMIT}
                    value={newLowStockQty}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setNewLowStockQty(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full bg-white border border-amber-300 rounded-xl p-2.5 text-sm font-mono font-black text-amber-900 outline-none focus:border-amber-600"
                  />
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {LOW_STOCK_QUICK_QTYS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setNewLowStockQty(q)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border transition cursor-pointer ${
                          newLowStockQty === q
                            ? 'bg-amber-600 text-white border-amber-700'
                            : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        ≤{q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={Boolean(duplicateNewSpec) || !newSystem.trim() || !newSize.trim()}
                className="w-full py-3 rounded-xl bg-persian-800 hover:bg-persian-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Save New Needle Specification</span>
              </button>
            </div>
          </form>

          {/* Right: Live Card Preview & Existing Specs Reference */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Live Stock Card Preview
              </h4>
              <div
                className={`p-4 rounded-2xl border ${
                  newStock <= 0
                    ? 'border-rose-300 bg-rose-50/30'
                    : newStock <= newLowStockQty
                      ? 'border-amber-300 bg-amber-50/30'
                      : 'border-emerald-200 bg-emerald-50/20'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="bg-persian-800 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md uppercase">
                    {newSystem.trim() || 'SYSTEM CODE'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      newStock <= 0
                        ? 'bg-rose-600 text-white'
                        : newStock <= newLowStockQty
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {newStock <= 0
                      ? 'Out of Stock'
                      : newStock <= newLowStockQty
                        ? 'Low Stock Alert'
                        : 'Optimal Stock'}
                  </span>
                </div>
                <div className="text-base font-black text-slate-900">
                  Size {newSize.trim() || '75/11'}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between mt-0.5">
                  <span>Point: {newPoint.trim() || '-'}</span>
                  <span className="font-mono text-[10px]">Ref: {newRef.trim() || '-'}</span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 font-mono">
                    Alert ≤ {newLowStockQty.toLocaleString()} Pcs
                  </span>
                  <span className="text-lg font-mono font-black text-slate-900">
                    {newStock.toLocaleString()} <span className="text-xs font-sans text-slate-500">Pcs</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  Already Registered ({needleTypes.length})
                </h4>
                <span className="text-[10px] font-semibold text-slate-400">Avoid Duplicates</span>
              </div>
              {needleTypes.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No specs registered yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {needleTypes.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/70 text-xs"
                    >
                      <div className="font-bold text-slate-800 truncate">
                        {n.system} — <span className="text-persian-800">{n.size}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                        <span className="font-bold text-slate-700">{n.stock} Pcs</span>
                        <span className="text-slate-400">(≤{getLowStockThreshold(n)})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 7: RESTOCK NEEDLE INVENTORY (DEDICATED TAB) */}
      {/* ================================================================= */}
      {subTab === 'restockNeedle' && (
        <div className="space-y-5">
          {needleTypes.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center space-y-3">
              <PackagePlus className="w-9 h-9 text-slate-300 mx-auto" />
              <h3 className="text-sm font-extrabold text-slate-800">
                No Needle Types to Restock
              </h3>
              <p className="text-xs text-slate-500">
                Restock karanna kalin New Needle Type tab eken needle specification ekak add karanna.
              </p>
              <button
                type="button"
                onClick={() => setSubTab('newNeedleType')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-persian-800 text-white text-xs font-bold cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Register New Needle Type
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left: Restock Form */}
              <form
                onSubmit={handleRestock}
                className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-soft overflow-hidden"
              >
                <div className="bg-emerald-700 text-white px-5 py-4 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/15 text-emerald-100 flex items-center justify-center">
                    <PackagePlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold">Restock Needle Inventory</h3>
                    <p className="text-[11px] text-emerald-100">
                      Needle spec eka thorala aluthin ena stock gana add karanna — before/after live preview ekka
                    </p>
                  </div>
                </div>

                <div className="p-5 space-y-5">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      1. Select Needle Type to Restock *
                    </label>
                    <select
                      value={restockNeedleId}
                      onChange={(e) => {
                        const nextId = Number(e.target.value);
                        setRestockNeedleId(nextId);
                        const found = needleTypes.find((n) => n.id === nextId);
                        setRestockCustomLowQty(found ? String(getLowStockThreshold(found)) : '');
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-emerald-600"
                    >
                      <option value={0}>-- Select Needle Type --</option>
                      {needleTypes.map((n) => {
                        const th = getLowStockThreshold(n);
                        const isLow = n.stock <= th;
                        return (
                          <option key={n.id} value={n.id}>
                            {isLow ? '⚠️ [LOW] ' : ''}
                            {n.system} — Size {n.size} (Current: {n.stock} Pcs • Alert ≤ {th})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold text-slate-700">
                      2. Quantity to Add (Pcs) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={MAX_RESTOCK_QTY}
                      value={restockQty}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => setRestockQty(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="Enter quantity to add"
                      className="w-full bg-emerald-50/60 border-2 border-emerald-300 rounded-xl p-3 text-base font-mono font-black text-emerald-900 outline-none focus:border-emerald-600"
                    />
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-500 mr-1">Quick Add:</span>
                      {RESTOCK_QUICK_QTYS.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setRestockQty((prev) => prev + q)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 border border-emerald-200 text-[11px] font-mono font-extrabold transition cursor-pointer"
                        >
                          +{q}
                        </button>
                      ))}
                      {restockQty > 0 && (
                        <button
                          type="button"
                          onClick={() => setRestockQty(0)}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Optional: Update Low Stock Alert Qty during Restock */}
                  {selectedRestockNeedle && (
                    <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-extrabold text-amber-950">
                          Low Stock Alert Qty (Optional Update)
                        </label>
                        <span className="text-[10px] font-mono font-bold text-amber-800">
                          Current: ≤ {getLowStockThreshold(selectedRestockNeedle)} Pcs
                        </span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={MAX_STOCK_LIMIT}
                        value={restockCustomLowQty}
                        onChange={(e) => setRestockCustomLowQty(e.target.value)}
                        className="w-full bg-white border border-amber-300 rounded-xl p-2 text-xs font-mono font-bold text-amber-900 outline-none focus:border-amber-600"
                      />
                    </div>
                  )}

                  {/* Live Before -> After Stock Confirmation Box */}
                  {selectedRestockNeedle && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2.5">
                        Live Stock Update Preview — {selectedRestockNeedle.system} ({selectedRestockNeedle.size})
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center items-center">
                        <div className="bg-white rounded-xl border border-slate-200 p-2.5">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">
                            Current
                          </span>
                          <span className="font-mono font-black text-base text-slate-800">
                            {selectedRestockNeedle.stock.toLocaleString()}
                          </span>
                        </div>
                        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-2.5">
                          <span className="text-[10px] font-bold text-emerald-700 block uppercase">
                            Adding
                          </span>
                          <span className="font-mono font-black text-base text-emerald-700">
                            +{restockQty.toLocaleString()}
                          </span>
                        </div>
                        <div className="bg-persian-800 text-white rounded-xl p-2.5">
                          <span className="text-[10px] font-bold text-blue-200 block uppercase">
                            New Total
                          </span>
                          <span className="font-mono font-black text-base text-amber-300">
                            {(selectedRestockNeedle.stock + restockQty).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!selectedRestockNeedle || restockQty <= 0}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <PackagePlus className="w-4 h-4" />
                    <span>
                      {selectedRestockNeedle && restockQty > 0
                        ? `Confirm Restock (+${restockQty.toLocaleString()} Pcs)`
                        : 'Select Needle & Enter Qty to Restock'}
                    </span>
                  </button>
                </div>
              </form>

              {/* Right: Low Stock Priority Queue (1-Click Select) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Low Stock Priority Queue ({lowStockItems.length})
                    </h4>
                    <span className="text-[10px] font-semibold text-slate-400">
                      Click to select
                    </span>
                  </div>

                  {lowStockItems.length === 0 ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center space-y-1">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                      <div className="text-xs font-extrabold text-emerald-900">
                        All Needle Stocks Are Healthy!
                      </div>
                      <p className="text-[11px] text-emerald-700">
                        Every registered needle type is above its Low Stock Alert Qty.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {lowStockItems.map((n) => {
                        const th = getLowStockThreshold(n);
                        const isSelected = restockNeedleId === n.id;
                        return (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              setRestockNeedleId(n.id);
                              setRestockCustomLowQty(String(th));
                              if (restockQty === 0) {
                                setRestockQty(Math.max(100, th * 2 - n.stock));
                              }
                            }}
                            className={`w-full text-left p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-emerald-50 border-2 border-emerald-500 shadow-xs'
                                : 'bg-rose-50/50 border-rose-200 hover:bg-rose-50'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-extrabold text-slate-900 truncate">
                                {n.system} — Size {n.size}
                              </div>
                              <div className="text-[10px] font-mono font-bold text-rose-700">
                                Stock: {n.stock} Pcs (Alert ≤ {th})
                              </div>
                            </div>
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold shrink-0 ${
                                isSelected
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-rose-600 text-white'
                              }`}
                            >
                              {isSelected ? 'Selected ✓' : 'Restock →'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* SUPER ADMIN ONLY MODAL: DIRECT EDIT NEEDLE STOCK QTY */}
      {/* ================================================================= */}
      {isSuperAdmin && (
        <dialog
          ref={stockEditDialogRef}
          onCancel={(e) => {
            e.preventDefault();
            closeSuperAdminStockEdit();
          }}
          className="m-auto rounded-2xl border-2 border-amber-300 shadow-2xl w-full max-w-md p-0 overflow-hidden bg-white text-slate-900"
        >
          {editingStockNeedle && (
            <form onSubmit={handleConfirmSuperAdminStockEdit}>
              <div className="bg-persian-800 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-sm">
                      Super Admin — Edit Current Needle Qty
                    </h2>
                    <p className="text-[11px] text-blue-200">
                      {editingStockNeedle.system} — Size {editingStockNeedle.size} (Ref:{' '}
                      {editingStockNeedle.ref})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeSuperAdminStockEdit}
                  aria-label="Close modal"
                  className="w-7 h-7 rounded-lg bg-persian-900/60 text-blue-200 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Current Stock Qty
                    </span>
                    <span className="font-mono font-black text-lg text-slate-800">
                      {editingStockNeedle.stock.toLocaleString()} Pcs
                    </span>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <span className="text-[10px] font-bold uppercase text-amber-700 block">
                      Difference
                    </span>
                    {(() => {
                      const nextNum = Math.floor(Number(editStockQtyInput) || 0);
                      const diff = nextNum - editingStockNeedle.stock;
                      return (
                        <span
                          className={`font-mono font-black text-lg ${
                            diff > 0
                              ? 'text-emerald-700'
                              : diff < 0
                                ? 'text-rose-700'
                                : 'text-slate-500'
                          }`}
                        >
                          {diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()} Pcs
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    New Corrected Stock Qty (Pcs) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={MAX_STOCK_LIMIT * 2}
                    autoFocus
                    required
                    value={editStockQtyInput}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setEditStockQtyInput(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-persian-400 rounded-xl p-2.5 text-base font-mono font-black text-persian-900 outline-none focus:border-persian-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-700">
                    Reason for Manual Qty Override *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    placeholder="e.g. Physical count audit mismatch"
                    value={editStockReasonInput}
                    onChange={(e) => setEditStockReasonInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-persian-500"
                  />
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {ADJUSTMENT_REASON_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setEditStockReasonInput(preset)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition cursor-pointer ${
                          editStockReasonInput === preset
                            ? 'bg-persian-800 text-white border-persian-900'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={closeSuperAdminStockEdit}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-sm transition cursor-pointer"
                  >
                    Confirm Qty Override
                  </button>
                </div>
              </div>
            </form>
          )}
        </dialog>
      )}
    </div>
  );
}
