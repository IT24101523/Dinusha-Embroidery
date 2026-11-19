'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Boxes,
  CalendarDays,
  CheckCircle2,
  Clock,
  Cloud,
  Database,
  DollarSign,
  Download,
  Factory,
  FileText,
  HardDrive,
  Image as ImageIcon,
  Landmark,
  Layers,
  Plus,
  Receipt,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  createFinanceCogsAction,
  createFinanceOpexAction,
  createFinanceRevenueAction,
  createFinanceSalaryAction,
  deleteFinanceRecordAction,
  fetchFinanceBundleAction,
  importErpPayrollMonthAction,
  toggleFinanceRevenueStatusAction,
  toggleFinanceSalaryStatusAction,
  type FinanceCogsLog,
  type FinanceOpexLog,
  type FinanceRevenueLog,
  type FinanceSalaryLog,
} from '@/actions/finance';
import { PnlComboChart, type MonthlyChartPoint } from './pnl-combo-chart';
import {
  COGS_CATEGORIES,
  OPEX_CATEGORIES,
  type FinanceStyleOption,
} from './finance-seed';

export type FinanceSubTab = 'dashboard' | 'revenue' | 'salary' | 'cogs' | 'expense';
type PeriodFilterType = 'monthly' | 'weekly' | 'daily';

interface ProductionStyleLite {
  code?: string;
  name?: string;
  price?: number | string | null;
  styleCode?: string;
  styleName?: string;
  unitPrice?: number | string | null;
  currency?: string | null;
}

interface ProductionMachineLite {
  name?: string;
  machineName?: string;
}

interface FinancialManagementProps {
  productionStyles?: ProductionStyleLite[];
  productionMachines?: ProductionMachineLite[];
  externalSubTab?: FinanceSubTab;
}

interface ToastItem {
  id: number;
  message: string;
  tone: 'success' | 'info' | 'danger';
}

interface ConfirmState {
  message: string;
  onConfirm: () => void;
}

const STORAGE_KEYS = {
  revenue: 'dinusha_revenue_logs_v3',
  salary: 'dinusha_payroll_v37_records_v3',
  cogs: 'dinusha_cogs_logs_v3',
  opex: 'dinusha_opex_logs_v3',
  rates: 'dinusha_fx_rates_v3',
};

function formatLKR(amount: number, decimals = 2): string {
  return `LKR ${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function formatCompactLKR(amount: number): string {
  const val = Number(amount || 0);
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}LKR ${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}LKR ${(abs / 1_000).toFixed(1)}k`;
  return `${sign}LKR ${abs.toFixed(0)}`;
}

function getSixMonthWindow(baseMonthStr: string): Array<{ ym: string; label: string }> {
  const [yStr, mStr] = baseMonthStr.split('-');
  const year = parseInt(yStr, 10) || 2026;
  const month = parseInt(mStr, 10) || 9;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const list: Array<{ ym: string; label: string }> = [];
  for (let offset = -2; offset <= 3; offset++) {
    const d = new Date(year, month - 1 + offset, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    list.push({ ym, label });
  }
  return list;
}

function safeReadStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback) && (!Array.isArray(parsed) || parsed.length === 0)) {
      return fallback;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function FinancialManagement({
  productionStyles = [],
  productionMachines = [],
  externalSubTab,
}: FinancialManagementProps) {
  const [activeSubTab, setActiveSubTab] = useState<FinanceSubTab>(externalSubTab || 'dashboard');

  useEffect(() => {
    if (externalSubTab) setActiveSubTab(externalSubTab);
  }, [externalSubTab]);
  const [cloudReady, setCloudReady] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isImportingPayroll, setIsImportingPayroll] = useState<boolean>(false);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentYm = useMemo(() => todayIso.slice(0, 7), [todayIso]);

  // Global period filter
  const [filterType, setFilterType] = useState<PeriodFilterType>('monthly');
  const [filterMonth, setFilterMonth] = useState<string>(currentYm);
  const [filterWeek, setFilterWeek] = useState<number>(1);
  const [filterDate, setFilterDate] = useState<string>(todayIso);

  // Exchange rates
  const [rateUSD, setRateUSD] = useState<number>(300);
  const [rateEUR, setRateEUR] = useState<number>(330);
  const [rateGBP, setRateGBP] = useState<number>(385);

  // Ledgers (real data only — no dummy seed data)
  const [revenueLogs, setRevenueLogs] = useState<FinanceRevenueLog[]>([]);
  const [salaryLogs, setSalaryLogs] = useState<FinanceSalaryLog[]>([]);
  const [erpPayrollLogs, setErpPayrollLogs] = useState<FinanceSalaryLog[]>([]);
  const [cogsLogs, setCogsLogs] = useState<FinanceCogsLog[]>([]);
  const [opexLogs, setOpexLogs] = useState<FinanceOpexLog[]>([]);

  // Forms
  const [revDate, setRevDate] = useState(todayIso);
  const [revMachine, setRevMachine] = useState('');
  const [revStyleCode, setRevStyleCode] = useState('');
  const [revQty, setRevQty] = useState('');
  const [revStatus, setRevStatus] = useState<'Received' | 'Pending'>('Received');

  const [salMonth, setSalMonth] = useState(currentYm);
  const [salName, setSalName] = useState('');
  const [salBasic, setSalBasic] = useState('');
  const [salOt, setSalOt] = useState('0');
  const [salEpf12, setSalEpf12] = useState('0');
  const [salEtf3, setSalEtf3] = useState('0');
  const [salManualOverride, setSalManualOverride] = useState(false);
  const [salStatus, setSalStatus] = useState<'Paid' | 'Pending'>('Paid');

  const [cogsDate, setCogsDate] = useState(todayIso);
  const [cogsCategory, setCogsCategory] = useState(COGS_CATEGORIES[0]);
  const [cogsDesc, setCogsDesc] = useState('');
  const [cogsAmount, setCogsAmount] = useState('');

  const [opexDate, setOpexDate] = useState(todayIso);
  const [opexCategory, setOpexCategory] = useState('Meals and Entertainment');
  const [opexDesc, setOpexDesc] = useState('');
  const [opexAmount, setOpexAmount] = useState('');
  const [opexBillDataUrl, setOpexBillDataUrl] = useState<string | null>(null);
  const opexFileRef = useRef<HTMLInputElement>(null);

  // Dialogs & Toasts
  const [receiptModalSrc, setReceiptModalSrc] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const receiptDialogRef = useRef<HTMLDialogElement>(null);
  const confirmDialogRef = useRef<HTMLDialogElement>(null);

  const pushToast = (message: string, tone: ToastItem['tone'] = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Live ERP Production Styles only (no dummy seed styles)
  const availableStyles: FinanceStyleOption[] = useMemo(() => {
    const map = new Map<string, FinanceStyleOption>();
    productionStyles.forEach((ps) => {
      const code = String(ps.code || ps.styleCode || '').trim();
      if (!code) return;
      const curRaw = String(ps.currency || 'LKR').toUpperCase();
      const currency: FinanceStyleOption['currency'] =
        curRaw === 'USD' || curRaw === 'EUR' || curRaw === 'GBP' ? curRaw : 'LKR';
      const parsedPrice = Number(ps.price ?? ps.unitPrice);
      map.set(code, {
        code,
        name: String(ps.name || ps.styleName || code),
        price: Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : 0,
        currency,
      });
    });
    return Array.from(map.values());
  }, [productionStyles]);

  const availableMachines: string[] = useMemo(() => {
    const set = new Set<string>();
    productionMachines.forEach((m) => {
      const n = String(m.name || m.machineName || '').trim();
      if (n) set.add(n);
    });
    return Array.from(set);
  }, [productionMachines]);

  useEffect(() => {
    if (!revMachine && availableMachines.length > 0) {
      setRevMachine(availableMachines[0]);
    }
  }, [availableMachines, revMachine]);

  useEffect(() => {
    if (!revStyleCode && availableStyles.length > 0) {
      setRevStyleCode(availableStyles[0].code);
    }
  }, [availableStyles, revStyleCode]);

  // Initial data load (Supabase real data -> fallback empty localStorage)
  useEffect(() => {
    let active = true;
    async function init() {
      const savedRates = safeReadStorage(STORAGE_KEYS.rates, { usd: 300, eur: 330, gbp: 385 });
      if (active) {
        setRateUSD(savedRates.usd || 300);
        setRateEUR(savedRates.eur || 330);
        setRateGBP(savedRates.gbp || 385);
      }

      const res = await fetchFinanceBundleAction();
      if (!active) return;

      if (res.success && res.data) {
        setErpPayrollLogs(res.data.erpPayrollLogs || []);
        if (res.data.cloudReady) {
          setCloudReady(true);
          setRevenueLogs(res.data.revenueLogs);
          setSalaryLogs(res.data.salaryLogs);
          setCogsLogs(res.data.cogsLogs);
          setOpexLogs(res.data.opexLogs);
        } else {
          setCloudReady(false);
          setRevenueLogs(safeReadStorage(STORAGE_KEYS.revenue, []));
          setSalaryLogs(safeReadStorage(STORAGE_KEYS.salary, []));
          setCogsLogs(safeReadStorage(STORAGE_KEYS.cogs, []));
          setOpexLogs(safeReadStorage(STORAGE_KEYS.opex, []));
        }
      }
      setIsLoading(false);
    }
    init();
    return () => {
      active = false;
    };
  }, []);

  // Persist localStorage whenever in local mode (or as backup cache)
  useEffect(() => {
    if (isLoading) return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.revenue, JSON.stringify(revenueLogs));
      window.localStorage.setItem(STORAGE_KEYS.salary, JSON.stringify(salaryLogs));
      window.localStorage.setItem(STORAGE_KEYS.cogs, JSON.stringify(cogsLogs));
      window.localStorage.setItem(STORAGE_KEYS.opex, JSON.stringify(opexLogs));
      window.localStorage.setItem(
        STORAGE_KEYS.rates,
        JSON.stringify({ usd: rateUSD, eur: rateEUR, gbp: rateGBP })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [revenueLogs, salaryLogs, cogsLogs, opexLogs, rateUSD, rateEUR, rateGBP, isLoading]);

  // Dialog synchronization
  useEffect(() => {
    const dlg = receiptDialogRef.current;
    if (!dlg) return;
    if (receiptModalSrc && !dlg.open) dlg.showModal();
    else if (!receiptModalSrc && dlg.open) dlg.close();
  }, [receiptModalSrc]);

  useEffect(() => {
    const dlg = confirmDialogRef.current;
    if (!dlg) return;
    if (confirmState && !dlg.open) dlg.showModal();
    else if (!confirmState && dlg.open) dlg.close();
  }, [confirmState]);

  const activeBaseMonth = useMemo(() => {
    if (filterType === 'daily') return filterDate.slice(0, 7) || '2026-09';
    return filterMonth || '2026-09';
  }, [filterType, filterDate, filterMonth]);

  useEffect(() => {
    setSalMonth(activeBaseMonth);
  }, [activeBaseMonth]);

  const getExchangeRate = (currency: string) => {
    if (currency === 'USD') return rateUSD || 300;
    if (currency === 'EUR') return rateEUR || 330;
    if (currency === 'GBP') return rateGBP || 385;
    return 1;
  };

  const calcRevenueLKR = (log: FinanceRevenueLog) => {
    const styleObj = availableStyles.find((s) => s.code === log.styleCode) || {
      price: 0,
      currency: 'LKR',
    };
    return Number(log.qty) * Number(styleObj.price) * getExchangeRate(styleObj.currency);
  };

  const isDateInFilter = (dateStr: string) => {
    if (!dateStr) return false;
    if (filterType === 'monthly') return dateStr.startsWith(filterMonth);
    if (filterType === 'daily') return dateStr === filterDate;
    if (filterType === 'weekly') {
      if (!dateStr.startsWith(filterMonth)) return false;
      const day = parseInt(dateStr.split('-')[2], 10);
      if (filterWeek === 1) return day >= 1 && day <= 7;
      if (filterWeek === 2) return day >= 8 && day <= 14;
      if (filterWeek === 3) return day >= 15 && day <= 21;
      if (filterWeek === 4) return day >= 22 && day <= 28;
      return day >= 29;
    }
    return true;
  };

  const prorationFactor = useMemo(() => {
    if (filterType === 'monthly') return 1;
    if (filterType === 'daily') return 1 / 30;
    return filterWeek >= 1 && filterWeek <= 4 ? 7 / 30 : 2 / 30;
  }, [filterType, filterWeek]);

  // Filtered aggregates
  const filteredRevenue = useMemo(
    () =>
      revenueLogs
        .filter((r) => isDateInFilter(r.date))
        .sort((a, b) => b.date.localeCompare(a.date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revenueLogs, filterType, filterMonth, filterWeek, filterDate]
  );

  const revenueMetrics = useMemo(() => {
    let totalRev = 0;
    let receivedRev = 0;
    let pendingRev = 0;
    let totalQty = 0;
    const machTotals: Record<string, number> = {};
    const styleTotals: Record<string, { rev: number; qty: number }> = {};

    filteredRevenue.forEach((log) => {
      const gross = calcRevenueLKR(log);
      totalRev += gross;
      if (log.paymentStatus === 'Received') receivedRev += gross;
      else pendingRev += gross;
      totalQty += log.qty;
      machTotals[log.machine] = (machTotals[log.machine] || 0) + gross;
      if (!styleTotals[log.styleCode]) styleTotals[log.styleCode] = { rev: 0, qty: 0 };
      styleTotals[log.styleCode].rev += gross;
      styleTotals[log.styleCode].qty += log.qty;
    });

    const topMachine =
      Object.entries(machTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
    const topStyle =
      Object.entries(styleTotals).sort((a, b) => b[1].rev - a[1].rev)[0]?.[0] || '-';

    return { totalRev, receivedRev, pendingRev, totalQty, topMachine, topStyle, styleTotals };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRevenue, rateUSD, rateEUR, rateGBP, availableStyles]);

  const combinedSalaryLogs = useMemo(() => {
    const seen = new Set(salaryLogs.map((s) => `${s.month}::${s.name.toLowerCase()}`));
    const merged = [...salaryLogs];
    erpPayrollLogs.forEach((erpRec) => {
      const key = `${erpRec.month}::${erpRec.name.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(erpRec);
      }
    });
    return merged;
  }, [salaryLogs, erpPayrollLogs]);

  const monthSalaries = useMemo(
    () => combinedSalaryLogs.filter((s) => s.month === activeBaseMonth),
    [combinedSalaryLogs, activeBaseMonth]
  );

  const salaryMetrics = useMemo(() => {
    let totalMonthlyLabor = 0;
    let totalBasicOt = 0;
    let totalEpfEtf = 0;
    let paidCount = 0;
    let pendingCount = 0;

    monthSalaries.forEach((r) => {
      const basicOt = (Number(r.basic) || 0) + (Number(r.ot) || 0);
      const epfEtf = (Number(r.epf12) || 0) + (Number(r.etf3) || 0);
      totalBasicOt += basicOt;
      totalEpfEtf += epfEtf;
      totalMonthlyLabor += basicOt + epfEtf;
      if (r.status === 'Paid') paidCount++;
      else pendingCount++;
    });

    return {
      totalMonthlyLabor,
      appliedLabor: totalMonthlyLabor * prorationFactor,
      totalBasicOt,
      totalEpfEtf,
      paidCount,
      pendingCount,
      staffCount: monthSalaries.length,
    };
  }, [monthSalaries, prorationFactor]);

  const filteredCogs = useMemo(
    () =>
      cogsLogs
        .filter((c) => isDateInFilter(c.date))
        .sort((a, b) => b.date.localeCompare(a.date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cogsLogs, filterType, filterMonth, filterWeek, filterDate]
  );

  const totalCogs = useMemo(
    () => filteredCogs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
    [filteredCogs]
  );

  const filteredOpex = useMemo(
    () =>
      opexLogs
        .filter((o) => isDateInFilter(o.date))
        .sort((a, b) => b.date.localeCompare(a.date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [opexLogs, filterType, filterMonth, filterWeek, filterDate]
  );

  const opexMetrics = useMemo(() => {
    let totalOpex = 0;
    const catTotals: Record<string, number> = {};
    filteredOpex.forEach((o) => {
      const amt = Number(o.amount) || 0;
      totalOpex += amt;
      catTotals[o.category] = (catTotals[o.category] || 0) + amt;
    });
    return { totalOpex, catTotals };
  }, [filteredOpex]);

  const cogsAndOpex = totalCogs + opexMetrics.totalOpex;
  const netProfit = revenueMetrics.totalRev - salaryMetrics.appliedLabor - cogsAndOpex;
  const profitMargin =
    revenueMetrics.totalRev > 0 ? ((netProfit / revenueMetrics.totalRev) * 100).toFixed(1) : '0.0';

  // 6-Month Combo Bar + Line Chart Data
  const chartData: MonthlyChartPoint[] = useMemo(() => {
    const win = getSixMonthWindow(activeBaseMonth);
    return win.map(({ ym, label }) => {
      let received = 0;
      let pending = 0;
      revenueLogs
        .filter((r) => r.date && r.date.startsWith(ym))
        .forEach((r) => {
          const amt = calcRevenueLKR(r);
          if (r.paymentStatus === 'Received') received += amt;
          else pending += amt;
        });

      const salaries = combinedSalaryLogs
        .filter((s) => s.month === ym)
        .reduce((acc, s) => acc + s.basic + s.ot + s.epf12 + s.etf3, 0);

      const mCogs = cogsLogs
        .filter((c) => c.date && c.date.startsWith(ym))
        .reduce((acc, c) => acc + c.amount, 0);

      const mOpex = opexLogs
        .filter((o) => o.date && o.date.startsWith(ym))
        .reduce((acc, o) => acc + o.amount, 0);

      const expectedRevenue = received + pending;
      const mCogsOpex = mCogs + mOpex;
      const mNetProfit = expectedRevenue - salaries - mCogsOpex;

      return {
        ym,
        label,
        received: Math.round(received),
        pending: Math.round(pending),
        expectedRevenue: Math.round(expectedRevenue),
        salaries: Math.round(salaries),
        cogsOpex: Math.round(mCogsOpex),
        netProfit: Math.round(mNetProfit),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBaseMonth, revenueLogs, combinedSalaryLogs, cogsLogs, opexLogs, rateUSD, rateEUR, rateGBP]);

  // --- CRUD Handlers ---
  const handleAddRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(revQty, 10);
    if (!revDate || !revStyleCode || isNaN(qty) || qty <= 0) return;

    const optimisticId = `rev-${Date.now()}`;
    const res = await createFinanceRevenueAction({
      date: revDate,
      machine: revMachine,
      styleCode: revStyleCode,
      qty,
      paymentStatus: revStatus,
    });

    const newItem: FinanceRevenueLog = res.data || {
      id: optimisticId,
      date: revDate,
      machine: revMachine,
      styleCode: revStyleCode,
      qty,
      paymentStatus: revStatus,
    };

    setRevenueLogs((prev) => [newItem, ...prev]);
    setRevQty('');
    pushToast(`Revenue logged (${revStatus})`);
  };

  const handleToggleRevenueStatus = async (item: FinanceRevenueLog) => {
    const nextStatus = item.paymentStatus === 'Received' ? 'Pending' : 'Received';
    setRevenueLogs((prev) =>
      prev.map((r) => (r.id === item.id ? { ...r, paymentStatus: nextStatus } : r))
    );
    await toggleFinanceRevenueStatusAction(item.id, nextStatus);
    pushToast(`Marked revenue as ${nextStatus}`, 'info');
  };

  const handleDeleteRevenue = (item: FinanceRevenueLog) => {
    setConfirmState({
      message: `Delete ${item.machine} (${item.styleCode}) revenue entry?`,
      onConfirm: async () => {
        setRevenueLogs((prev) => prev.filter((r) => r.id !== item.id));
        await deleteFinanceRecordAction('finance_revenue_logs', item.id);
        pushToast('Revenue entry deleted', 'danger');
      },
    });
  };

  const handleBasicChange = (val: string) => {
    setSalBasic(val);
    if (!salManualOverride) {
      const b = parseFloat(val) || 0;
      setSalEpf12((b * 0.12).toFixed(2));
      setSalEtf3((b * 0.03).toFixed(2));
    }
  };

  const handleToggleManualOverride = (checked: boolean) => {
    setSalManualOverride(checked);
    if (!checked) {
      const b = parseFloat(salBasic) || 0;
      setSalEpf12((b * 0.12).toFixed(2));
      setSalEtf3((b * 0.03).toFixed(2));
    }
  };

  const handleAddSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salMonth || !salName.trim()) return;
    const payload = {
      month: salMonth,
      name: salName.trim(),
      basic: parseFloat(salBasic) || 0,
      ot: parseFloat(salOt) || 0,
      epf12: parseFloat(salEpf12) || 0,
      etf3: parseFloat(salEtf3) || 0,
      status: salStatus,
    };

    const res = await createFinanceSalaryAction(payload);
    const newItem: FinanceSalaryLog = res.data || {
      id: `sal-${Date.now()}`,
      ...payload,
    };

    setSalaryLogs((prev) => [newItem, ...prev]);
    setSalName('');
    setSalBasic('');
    setSalOt('0');
    setSalEpf12('0');
    setSalEtf3('0');
    setSalManualOverride(false);
    pushToast(`Salary saved for ${payload.name}`);
  };

  const handleToggleSalaryStatus = async (item: FinanceSalaryLog) => {
    const nextStatus = item.status === 'Paid' ? 'Pending' : 'Paid';
    setSalaryLogs((prev) =>
      prev.map((s) => (s.id === item.id ? { ...s, status: nextStatus } : s))
    );
    await toggleFinanceSalaryStatusAction(item.id, nextStatus);
    pushToast(`Salary status changed to ${nextStatus}`, 'info');
  };

  const handleDeleteSalary = (item: FinanceSalaryLog) => {
    setConfirmState({
      message: `Delete salary record for ${item.name}?`,
      onConfirm: async () => {
        setSalaryLogs((prev) => prev.filter((s) => s.id !== item.id));
        await deleteFinanceRecordAction('finance_salary_logs', item.id);
        pushToast('Salary record deleted', 'danger');
      },
    });
  };

  const handleImportErpPayroll = async () => {
    setIsImportingPayroll(true);
    const res = await importErpPayrollMonthAction(activeBaseMonth);
    setIsImportingPayroll(false);
    if (!res.success || !res.data) {
      pushToast(res.error || 'Could not load ERP payroll records', 'danger');
      return;
    }
    if (res.data.length === 0) {
      pushToast(`No ERP payroll records found for ${activeBaseMonth}`, 'info');
      return;
    }

    const existingNames = new Set(
      salaryLogs.filter((s) => s.month === activeBaseMonth).map((s) => s.name)
    );
    const newRows = res.data.filter((r) => !existingNames.has(r.name));
    if (newRows.length === 0) {
      pushToast(`All ${res.data.length} ERP payroll records already imported`, 'info');
      return;
    }

    const created: FinanceSalaryLog[] = [];
    for (const row of newRows) {
      const saveRes = await createFinanceSalaryAction(row);
      created.push(
        saveRes.data || {
          id: `sal-erp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ...row,
        }
      );
    }

    setSalaryLogs((prev) => [...created, ...prev]);
    pushToast(`Imported ${created.length} payroll records for ${activeBaseMonth}`);
  };

  const handleAddCogs = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(cogsAmount);
    if (!cogsDate || !cogsDesc.trim() || isNaN(amount)) return;

    const payload = {
      date: cogsDate,
      category: cogsCategory,
      desc: cogsDesc.trim(),
      amount,
    };

    const res = await createFinanceCogsAction(payload);
    const newItem: FinanceCogsLog = res.data || { id: `cogs-${Date.now()}`, ...payload };
    setCogsLogs((prev) => [newItem, ...prev]);
    setCogsDesc('');
    setCogsAmount('');
    pushToast('Material purchase saved');
  };

  const handleDeleteCogs = (item: FinanceCogsLog) => {
    setConfirmState({
      message: `Delete material cost "${item.desc}"?`,
      onConfirm: async () => {
        setCogsLogs((prev) => prev.filter((c) => c.id !== item.id));
        await deleteFinanceRecordAction('finance_cogs_logs', item.id);
        pushToast('Material cost deleted', 'danger');
      },
    });
  };

  const handleOpexFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setOpexBillDataUrl(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setOpexBillDataUrl(typeof reader.result === 'string' ? reader.result : null);
    };
    reader.readAsDataURL(file);
  };

  const handleAddOpex = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(opexAmount);
    if (!opexDate || !opexDesc.trim() || isNaN(amount)) return;

    const payload = {
      date: opexDate,
      category: opexCategory,
      desc: opexDesc.trim(),
      amount,
      billBase64: opexBillDataUrl,
    };

    const res = await createFinanceOpexAction(payload);
    const newItem: FinanceOpexLog = res.data || { id: `opex-${Date.now()}`, ...payload };
    setOpexLogs((prev) => [newItem, ...prev]);
    setOpexDesc('');
    setOpexAmount('');
    setOpexBillDataUrl(null);
    if (opexFileRef.current) opexFileRef.current.value = '';
    pushToast('OPEX expense record saved');
  };

  const handleDeleteOpex = (item: FinanceOpexLog) => {
    setConfirmState({
      message: `Delete expense "${item.desc}"?`,
      onConfirm: async () => {
        setOpexLogs((prev) => prev.filter((o) => o.id !== item.id));
        await deleteFinanceRecordAction('finance_opex_logs', item.id);
        pushToast('Expense deleted', 'danger');
      },
    });
  };

  const subTabs: Array<{ id: FinanceSubTab; label: string; icon: React.ElementType }> = [
    { id: 'dashboard', label: 'P&L Dashboard', icon: TrendingUp },
    { id: 'revenue', label: 'Machine Revenue', icon: Factory },
    { id: 'salary', label: 'Staff Salaries', icon: Users },
    { id: 'cogs', label: 'Material Cost (COGS)', icon: Boxes },
    { id: 'expense', label: 'OPEX & Bills', icon: Receipt },
  ];

  return (
    <div className="space-y-6">
      {/* EXECUTIVE HEADER + PERIOD FILTER */}
      <div className="rounded-3xl bg-gradient-to-br from-[#001a3d] via-[#002d62] to-[#132ea0] p-5 sm:p-6 text-white shadow-lg border border-blue-900/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/10 text-blue-200 border border-white/15">
                <Landmark className="w-3 h-3 text-emerald-300" />
                Financial Governance & Revenue
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  cloudReady
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                    : 'bg-amber-500/20 text-amber-200 border-amber-400/30'
                }`}
              >
                {cloudReady ? (
                  <>
                    <Cloud className="w-3 h-3" /> Cloud Synced
                  </>
                ) : (
                  <>
                    <HardDrive className="w-3 h-3" /> Browser Storage Mode
                  </>
                )}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Factory P&amp;L, Receivables &amp; Cost Control
            </h2>
            <p className="text-xs text-blue-200/80">
              Combined revenue vs expense trends, machine output income, payroll (EPF/ETF), COGS &amp; OPEX bills.
            </p>
          </div>

          {/* DYNAMIC PERIOD FILTER */}
          <div className="flex flex-wrap items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/15">
            <CalendarDays className="w-4 h-4 text-blue-200 ml-1" />
            <select
              aria-label="Period View Type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as PeriodFilterType)}
              className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer pr-1 [&>option]:text-slate-900"
            >
              <option value="monthly">Monthly View</option>
              <option value="weekly">Weekly View</option>
              <option value="daily">Daily View</option>
            </select>
            <div className="w-px h-5 bg-white/20" />
            {filterType === 'monthly' && (
              <input
                type="month"
                aria-label="Filter Month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-white text-slate-900 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
              />
            )}
            {filterType === 'weekly' && (
              <div className="flex items-center gap-1.5">
                <input
                  type="month"
                  aria-label="Filter Month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="bg-white text-slate-900 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
                />
                <select
                  aria-label="Filter Week"
                  value={filterWeek}
                  onChange={(e) => setFilterWeek(Number(e.target.value))}
                  className="bg-white text-slate-900 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value={1}>Week 1 (1st–7th)</option>
                  <option value={2}>Week 2 (8th–14th)</option>
                  <option value={3}>Week 3 (15th–21st)</option>
                  <option value={4}>Week 4 (22nd–28th)</option>
                  <option value={5}>Week 5 (29th+)</option>
                </select>
              </div>
            )}
            {filterType === 'daily' && (
              <input
                type="date"
                aria-label="Filter Date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="bg-white text-slate-900 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
              />
            )}
          </div>
        </div>

        {/* SUB-TAB PILLS */}
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-white/15">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-white text-[#001a3d] shadow-md'
                    : 'bg-white/10 text-blue-100 hover:bg-white/20 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. P&L DASHBOARD */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* TOP 5 KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs border-l-4 border-l-emerald-500 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Received Income
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Collected
                  </span>
                </div>
                <p className="text-xl font-black text-emerald-700 tabular-nums">
                  {formatLKR(revenueMetrics.receivedRev)}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <p className="text-[11px] text-slate-400 font-semibold">Paid machine revenue</p>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('revenue')}
                  className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 hover:text-emerald-900 cursor-pointer shrink-0"
                >
                  View <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs border-l-4 border-l-blue-500 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Pending Income
                  </span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                    Receivable
                  </span>
                </div>
                <p className="text-xl font-black text-blue-700 tabular-nums">
                  {formatLKR(revenueMetrics.pendingRev)}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <p className="text-[11px] text-blue-600 font-semibold">
                  Expected:{' '}
                  <span className="font-extrabold text-slate-800">
                    {formatCompactLKR(revenueMetrics.totalRev)}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('revenue')}
                  className="inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-700 hover:text-blue-900 cursor-pointer shrink-0"
                >
                  View <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs border-l-4 border-l-rose-500 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Staff Salaries
                  </span>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                    {filterType === 'monthly' ? 'Full Month' : 'Prorated'}
                  </span>
                </div>
                <p className="text-xl font-black text-rose-700 tabular-nums">
                  {formatLKR(salaryMetrics.appliedLabor)}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <p className="text-[11px] text-rose-500 font-semibold">
                  {salaryMetrics.staffCount} Staff ({activeBaseMonth})
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('salary')}
                  className="inline-flex items-center gap-1 text-[11px] font-extrabold text-rose-700 hover:text-rose-900 cursor-pointer shrink-0"
                >
                  View <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs border-l-4 border-l-amber-500 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Materials &amp; OPEX
                  </span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    Direct + Bills
                  </span>
                </div>
                <p className="text-xl font-black text-amber-700 tabular-nums">
                  {formatLKR(cogsAndOpex)}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('cogs')}
                  className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-700 hover:text-amber-900 cursor-pointer"
                >
                  View COGS <ArrowUpRight className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('expense')}
                  className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-700 hover:text-amber-900 cursor-pointer"
                >
                  View OPEX <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#001a3d] to-[#0b2a5c] p-5 rounded-2xl border border-blue-900 shadow-md flex flex-col justify-between md:col-span-2 xl:col-span-1 text-white">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-extrabold text-blue-300 uppercase tracking-wider">
                    Net Factory Profit
                  </span>
                  <Wallet className="w-4 h-4 text-emerald-300" />
                </div>
                <p
                  className={`text-xl font-black tabular-nums ${
                    netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatLKR(netProfit)}
                </p>
              </div>
              <p className="text-[11px] font-semibold text-blue-200 mt-2">
                Net Profit Margin: <span className="font-black text-white">{profitMargin}%</span>
              </p>
            </div>
          </div>

          {/* ANIMATED BAR GRAPH SECTION */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200/90">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="font-extrabold text-sm uppercase text-[#002d62] flex items-center gap-2 tracking-wide">
                  <Sparkles className="w-4 h-4 text-[#1c39bb]" />
                  Monthly Income, Receivables &amp; Expenses Overview
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  6-month animated bar comparison around selected period (Values in LKR)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Received: <span className="font-black">{formatCompactLKR(revenueMetrics.receivedRev)}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] font-bold text-blue-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Pending: <span className="font-black">{formatCompactLKR(revenueMetrics.pendingRev)}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-violet-50 border border-violet-200 text-[11px] font-bold text-violet-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-600" />
                  Net Profit: <span className="font-black">{formatCompactLKR(netProfit)}</span>
                </div>
              </div>
            </div>

            <PnlComboChart
              data={chartData}
              activeMonth={activeBaseMonth}
              animationKey={`${activeBaseMonth}-${filterType}`}
            />
          </div>

          {/* BOTTOM ANALYTICS TABLES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/90">
              <h3 className="font-extrabold mb-4 text-xs uppercase text-slate-600 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" /> Overhead Cost Breakdown (OPEX)
              </h3>
              <div tabIndex={0} role="region" aria-label="Overhead Cost Breakdown" className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Expense Category</th>
                      <th className="p-3 text-right">Amount (LKR)</th>
                      <th className="p-3 text-right">% of OPEX</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {opexMetrics.totalOpex > 0 ? (
                      Object.entries(opexMetrics.catTotals)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cat, amt]) => {
                          const pct = ((amt / opexMetrics.totalOpex) * 100).toFixed(1);
                          return (
                            <tr key={cat} className="hover:bg-slate-50">
                              <td className="p-3 font-semibold text-slate-700">{cat}</td>
                              <td className="p-3 font-mono text-slate-700 text-right">
                                {amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-24 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="text-[11px] font-bold w-10 text-right">{pct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    ) : (
                      <tr>
                        <td colSpan={3} className="p-6 text-center text-slate-400">
                          No overhead expenses logged for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/90">
              <h3 className="font-extrabold mb-4 text-xs uppercase text-slate-600 flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-emerald-500" /> Top Revenue Generating Styles
              </h3>
              <div tabIndex={0} role="region" aria-label="Top Revenue Styles" className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Style Code</th>
                      <th className="p-3 text-center">Volume (Pcs)</th>
                      <th className="p-3 text-right">Gross Income (LKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.keys(revenueMetrics.styleTotals).length > 0 ? (
                      Object.entries(revenueMetrics.styleTotals)
                        .sort((a, b) => b[1].rev - a[1].rev)
                        .map(([code, data]) => {
                          const styleInfo = availableStyles.find((s) => s.code === code);
                          return (
                            <tr key={code} className="hover:bg-slate-50">
                              <td className="p-3">
                                <span className="font-bold text-slate-800 block">{code}</span>
                                <span className="text-[10px] text-slate-400">
                                  {styleInfo?.name || 'Custom Style'}
                                </span>
                              </td>
                              <td className="p-3 font-bold text-center text-slate-700">
                                {data.qty.toLocaleString()}
                              </td>
                              <td className="p-3 font-black text-emerald-700 text-right tabular-nums">
                                {data.rev.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })
                    ) : (
                      <tr>
                        <td colSpan={3} className="p-6 text-center text-slate-400">
                          No revenue logged for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. MACHINE REVENUE TAB */}
      {activeSubTab === 'revenue' && (
        <div className="space-y-6">
          {/* EXCHANGE RATES */}
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/90 flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="text-xs font-black text-slate-600 uppercase flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#1c39bb]" /> Global Exchange Rates
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
              1 USD =
              <input
                type="number"
                step="0.01"
                value={rateUSD}
                onChange={(e) => setRateUSD(parseFloat(e.target.value) || 0)}
                className="w-24 p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-[#002d62] outline-none focus:border-[#1c39bb]"
              />
              LKR
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
              1 EUR =
              <input
                type="number"
                step="0.01"
                value={rateEUR}
                onChange={(e) => setRateEUR(parseFloat(e.target.value) || 0)}
                className="w-24 p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-[#002d62] outline-none focus:border-[#1c39bb]"
              />
              LKR
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
              1 GBP =
              <input
                type="number"
                step="0.01"
                value={rateGBP}
                onChange={(e) => setRateGBP(parseFloat(e.target.value) || 0)}
                className="w-24 p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-[#002d62] outline-none focus:border-[#1c39bb]"
              />
              LKR
            </label>
          </div>

          {/* REVENUE KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-white">
              <p className="text-[10px] font-bold text-blue-300 uppercase mb-1">Total Period Revenue</p>
              <p className="text-xl font-black tabular-nums">{formatLKR(revenueMetrics.totalRev)}</p>
              <p className="text-[10px] text-slate-400 mt-1">Received + Pending</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl">
              <p className="text-[10px] font-bold text-emerald-700 uppercase mb-1">Received Income</p>
              <p className="text-xl font-black text-emerald-900 tabular-nums">
                {formatLKR(revenueMetrics.receivedRev)}
              </p>
              <p className="text-[10px] text-emerald-600 mt-1 font-semibold">Collected Payments</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl">
              <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">Pending (Receivable)</p>
              <p className="text-xl font-black text-blue-900 tabular-nums">
                {formatLKR(revenueMetrics.pendingRev)}
              </p>
              <p className="text-[10px] text-blue-600 mt-1 font-semibold">Enna Thiyana Income</p>
            </div>
            <div className="bg-white border border-slate-200 p-5 rounded-2xl">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Period Pieces</p>
              <p className="text-xl font-black text-slate-800 tabular-nums">
                {revenueMetrics.totalQty.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Top Machine: <span className="font-bold text-slate-700">{revenueMetrics.topMachine}</span>
              </p>
            </div>
            <div className="bg-white border border-slate-200 p-5 rounded-2xl">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Most Profitable Style</p>
              <p className="text-xl font-black text-[#002d62] truncate">{revenueMetrics.topStyle}</p>
              <p className="text-[10px] text-slate-400 mt-1">Highest gross earner</p>
            </div>
          </div>

          {/* LOG REVENUE FORM */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90">
            <h3 className="font-extrabold text-xs uppercase text-slate-600 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" /> Log Machine Revenue Entry
            </h3>
            <form
              onSubmit={handleAddRevenue}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={revDate}
                  onChange={(e) => setRevDate(e.target.value)}
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-[#1c39bb]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Machine *</label>
                <select
                  value={revMachine}
                  onChange={(e) => setRevMachine(e.target.value)}
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-[#1c39bb] cursor-pointer"
                >
                  {availableMachines.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Style Code *</label>
                <select
                  value={revStyleCode}
                  onChange={(e) => setRevStyleCode(e.target.value)}
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-[#1c39bb] cursor-pointer"
                >
                  {availableStyles.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} — {s.name} ({s.currency} {s.price.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Qty Produced *</label>
                <input
                  type="number"
                  min={1}
                  value={revQty}
                  onChange={(e) => setRevQty(e.target.value)}
                  placeholder="e.g. 1200"
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#1c39bb]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Status *</label>
                <select
                  value={revStatus}
                  onChange={(e) => setRevStatus(e.target.value as 'Received' | 'Pending')}
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-[#1c39bb] cursor-pointer"
                >
                  <option value="Received">Received (Paid)</option>
                  <option value="Pending">Pending (Receivable)</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-[#132ea0] hover:bg-[#002d62] text-white font-bold p-2.5 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
              >
                Add Revenue
              </button>
            </form>
          </div>

          {/* REVENUE LEDGER TABLE */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
              <h3 className="font-extrabold text-xs uppercase text-slate-600 flex items-center gap-2">
                <Database className="w-4 h-4 text-[#1c39bb]" /> Machine Revenue Ledger
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                Tip: Click any status badge to toggle Received / Pending
              </span>
            </div>
            <div
              tabIndex={0}
              role="region"
              aria-label="Machine Revenue Ledger"
              className="overflow-x-auto rounded-xl border border-slate-200 max-h-[540px]"
            >
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Machine</th>
                    <th className="p-3">Style Code</th>
                    <th className="p-3">Unit Price</th>
                    <th className="p-3 text-center">Qty Produced</th>
                    <th className="p-3 text-right">Gross Income (LKR)</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Del</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRevenue.length > 0 ? (
                    filteredRevenue.map((log) => {
                      const styleObj = availableStyles.find((s) => s.code === log.styleCode) || {
                        price: 0,
                        currency: 'LKR',
                      };
                      const grossLKR = calcRevenueLKR(log);
                      const isRec = log.paymentStatus === 'Received';
                      return (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-slate-500 font-mono text-[11px]">{log.date}</td>
                          <td className="p-3 font-bold text-slate-800">{log.machine}</td>
                          <td className="p-3">
                            <span className="bg-indigo-50 text-indigo-800 font-bold px-2 py-0.5 rounded text-[10px]">
                              {log.styleCode}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 text-[11px]">
                            {styleObj.currency} {Number(styleObj.price).toFixed(2)}
                          </td>
                          <td className="p-3 font-bold text-center">{log.qty.toLocaleString()}</td>
                          <td
                            className={`p-3 font-black text-right tabular-nums ${
                              isRec ? 'text-emerald-700' : 'text-blue-700'
                            }`}
                          >
                            {formatLKR(grossLKR)}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleRevenueStatus(log)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                                isRec
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                              }`}
                            >
                              {isRec ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <Clock className="w-3 h-3" />
                              )}
                              {log.paymentStatus}
                            </button>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              aria-label="Delete revenue entry"
                              onClick={() => handleDeleteRevenue(log)}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400">
                        No machine revenue logged for selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. STAFF SALARIES (PAYROLL) TAB */}
      {activeSubTab === 'salary' && (
        <div className="space-y-6">
          {/* SALARY KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl">
              <p className="text-[10px] font-bold text-rose-700 uppercase mb-1">Total Salary Expense</p>
              <p className="text-2xl font-black text-rose-900 tabular-nums">
                {formatLKR(salaryMetrics.totalMonthlyLabor)}
              </p>
              <p className="text-[10px] text-rose-600 mt-1 font-semibold">
                Employer Total Cost ({activeBaseMonth})
              </p>
            </div>
            <div className="bg-white border border-slate-200 p-5 rounded-2xl">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Basic + OT / Allowances</p>
              <p className="text-2xl font-black text-slate-800 tabular-nums">
                {formatLKR(salaryMetrics.totalBasicOt)}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Gross direct wages</p>
            </div>
            <div className="bg-white border border-slate-200 p-5 rounded-2xl">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                Employer EPF (12%) + ETF (3%)
              </p>
              <p className="text-2xl font-black text-[#002d62] tabular-nums">
                {formatLKR(salaryMetrics.totalEpfEtf)}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Statutory contributions</p>
            </div>
            <div className="bg-white border border-slate-200 p-5 rounded-2xl">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                Staff Count ({activeBaseMonth})
              </p>
              <p className="text-2xl font-black text-slate-800">{salaryMetrics.staffCount}</p>
              <p className="text-[10px] text-emerald-600 mt-1 font-semibold">
                {salaryMetrics.paidCount} Paid / {salaryMetrics.pendingCount} Pending
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SALARY FORM */}
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 lg:col-span-1 h-fit">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h3 className="font-extrabold text-xs uppercase text-slate-600 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-rose-500" /> Log Staff Salary
                </h3>
                <button
                  type="button"
                  disabled={isImportingPayroll}
                  onClick={handleImportErpPayroll}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold transition cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3 h-3" />
                  {isImportingPayroll ? 'Syncing...' : 'Sync ERP Payroll'}
                </button>
              </div>
              <form onSubmit={handleAddSalary} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Payroll Month *</label>
                  <input
                    type="month"
                    value={salMonth}
                    onChange={(e) => setSalMonth(e.target.value)}
                    required
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-[#002d62] outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Employee Name / ID *
                  </label>
                  <input
                    type="text"
                    value={salName}
                    onChange={(e) => setSalName(e.target.value)}
                    placeholder="e.g. Kamal Perera (EMP-04)"
                    required
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-rose-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Basic Salary (LKR) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={salBasic}
                      onChange={(e) => handleBasicChange(e.target.value)}
                      placeholder="35000"
                      required
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      OT &amp; Allowances
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={salOt}
                      onChange={(e) => setSalOt(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500">
                      Statutory Contributions
                    </span>
                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-[#1c39bb] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={salManualOverride}
                        onChange={(e) => handleToggleManualOverride(e.target.checked)}
                        className="rounded text-[#1c39bb]"
                      />
                      Manual Override
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Employer EPF (12%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={salEpf12}
                        readOnly={!salManualOverride}
                        onChange={(e) => setSalEpf12(e.target.value)}
                        className={`w-full p-2 rounded-xl text-xs font-bold outline-none border ${
                          salManualOverride
                            ? 'bg-white border-[#1c39bb] text-slate-800'
                            : 'bg-slate-100 border-slate-300 text-slate-600'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Employer ETF (3%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={salEtf3}
                        readOnly={!salManualOverride}
                        onChange={(e) => setSalEtf3(e.target.value)}
                        className={`w-full p-2 rounded-xl text-xs font-bold outline-none border ${
                          salManualOverride
                            ? 'bg-white border-[#1c39bb] text-slate-800'
                            : 'bg-slate-100 border-slate-300 text-slate-600'
                        }`}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Status *</label>
                  <select
                    value={salStatus}
                    onChange={(e) => setSalStatus(e.target.value as 'Paid' | 'Pending')}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-rose-500 cursor-pointer"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold p-2.5 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
                >
                  Save Staff Salary Record
                </button>
              </form>
            </div>

            {/* SALARY LEDGER TABLE */}
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 lg:col-span-2">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                <div>
                  <h3 className="font-extrabold text-xs uppercase text-slate-600 flex items-center gap-2">
                    <Users className="w-4 h-4 text-rose-500" /> Staff Payroll Ledger
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Showing records for <span className="font-bold text-[#1c39bb]">{activeBaseMonth}</span>
                  </p>
                </div>
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                  Total: {formatLKR(salaryMetrics.totalMonthlyLabor)}
                </span>
              </div>
              <div
                tabIndex={0}
                role="region"
                aria-label="Staff Payroll Ledger"
                className="overflow-x-auto rounded-xl border border-slate-200 max-h-[540px]"
              >
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="p-3">Employee</th>
                      <th className="p-3 text-right">Basic (LKR)</th>
                      <th className="p-3 text-right">OT &amp; Allow.</th>
                      <th className="p-3 text-right">EPF 12% + ETF 3%</th>
                      <th className="p-3 text-right">Employer Total</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthSalaries.length > 0 ? (
                      monthSalaries.map((rec) => {
                        const epfEtf = rec.epf12 + rec.etf3;
                        const empTotal = rec.basic + rec.ot + epfEtf;
                        const isPaid = rec.status === 'Paid';
                        return (
                          <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-bold text-slate-800">{rec.name}</td>
                            <td className="p-3 text-right font-mono text-slate-700">
                              {rec.basic.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-600">
                              {rec.ot.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-right font-mono text-[#002d62]">
                              {epfEtf.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-right font-black text-rose-700 tabular-nums">
                              {formatLKR(empTotal)}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleSalaryStatus(rec)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                                  isPaid
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                }`}
                              >
                                {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                {rec.status}
                              </button>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                aria-label="Delete salary record"
                                onClick={() => handleDeleteSalary(rec)}
                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">
                          No staff salary records found for {activeBaseMonth}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MATERIAL PURCHASES (COGS) TAB */}
      {activeSubTab === 'cogs' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 lg:col-span-1 h-fit">
            <h3 className="font-extrabold mb-4 text-xs uppercase text-slate-600 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-amber-500" /> Log Material Purchase (COGS)
            </h3>
            <form onSubmit={handleAddCogs} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={cogsDate}
                  onChange={(e) => setCogsDate(e.target.value)}
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Material Category *</label>
                <select
                  value={cogsCategory}
                  onChange={(e) => setCogsCategory(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-amber-500 cursor-pointer"
                >
                  {COGS_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Supplier / Details *</label>
                <input
                  type="text"
                  value={cogsDesc}
                  onChange={(e) => setCogsDesc(e.target.value)}
                  placeholder="e.g. Madeira Thread 50 Cones"
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Total Amount (LKR) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={cogsAmount}
                  onChange={(e) => setCogsAmount(e.target.value)}
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-amber-700 outline-none focus:border-amber-500"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold p-2.5 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
              >
                Save Material Cost
              </button>
            </form>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-xs uppercase text-slate-600">Direct Material Purchases</h3>
              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                Total: {formatLKR(totalCogs)}
              </span>
            </div>
            <div
              tabIndex={0}
              role="region"
              aria-label="Direct Material Purchases"
              className="overflow-x-auto rounded-xl border border-slate-200 max-h-[500px]"
            >
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Supplier &amp; Details</th>
                    <th className="p-3 text-right">Amount (LKR)</th>
                    <th className="p-3 text-center">Del</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCogs.length > 0 ? (
                    filteredCogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-500 font-mono text-[11px]">{log.date}</td>
                        <td className="p-3">
                          <span className="bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">
                            {log.category}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-700">{log.desc}</td>
                        <td className="p-3 font-bold text-amber-700 text-right tabular-nums">
                          {formatLKR(log.amount)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            aria-label="Delete material cost"
                            onClick={() => handleDeleteCogs(log)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        No materials purchased for selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. OPEX & BILLS LEDGER TAB */}
      {activeSubTab === 'expense' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 lg:col-span-1 h-fit">
            <h3 className="font-extrabold mb-4 text-xs uppercase text-slate-600 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-rose-500" /> Log General Expense
            </h3>
            <form onSubmit={handleAddOpex} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={opexDate}
                  onChange={(e) => setOpexDate(e.target.value)}
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Account Category *</label>
                <select
                  value={opexCategory}
                  onChange={(e) => setOpexCategory(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-rose-500 cursor-pointer"
                >
                  {OPEX_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Description / Vendor *
                </label>
                <input
                  type="text"
                  value={opexDesc}
                  onChange={(e) => setOpexDesc(e.target.value)}
                  placeholder="e.g. Keells Groceries"
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Total Amount (LKR) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={opexAmount}
                  onChange={(e) => setOpexAmount(e.target.value)}
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-rose-700 outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Attach Physical Bill/Receipt (Optional)
                </label>
                <input
                  ref={opexFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleOpexFileChange}
                  className="w-full text-[10px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold p-2.5 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
              >
                Save Expense Record
              </button>
            </form>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-xs uppercase text-slate-600">OPEX &amp; Bills Ledger</h3>
              <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                Total: {formatLKR(opexMetrics.totalOpex)}
              </span>
            </div>
            <div
              tabIndex={0}
              role="region"
              aria-label="OPEX and Bills Ledger"
              className="overflow-x-auto rounded-xl border border-slate-200 max-h-[500px]"
            >
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Amount (LKR)</th>
                    <th className="p-3 text-center">Attachment</th>
                    <th className="p-3 text-center">Del</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOpex.length > 0 ? (
                    filteredOpex.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-500 font-mono text-[11px]">{log.date}</td>
                        <td className="p-3 font-semibold text-slate-700">{log.category}</td>
                        <td className="p-3 text-slate-600">{log.desc}</td>
                        <td className="p-3 font-bold text-rose-700 text-right tabular-nums">
                          {formatLKR(log.amount)}
                        </td>
                        <td className="p-3 text-center">
                          {log.billBase64 ? (
                            <button
                              type="button"
                              onClick={() => setReceiptModalSrc(log.billBase64)}
                              className="inline-flex items-center gap-1 text-[10px] bg-slate-100 border border-slate-300 text-slate-700 px-2.5 py-1 rounded-lg font-bold hover:bg-slate-200 cursor-pointer"
                            >
                              <ImageIcon className="w-3 h-3 text-[#1c39bb]" /> View
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-300 italic">No File</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            aria-label="Delete expense record"
                            onClick={() => handleDeleteOpex(log)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
                        No expenses logged for selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* NATIVE RECEIPT VIEWER MODAL */}
      <dialog
        ref={receiptDialogRef}
        aria-labelledby="receipt-dialog-title"
        closedby="any"
        onClose={() => setReceiptModalSrc(null)}
        className="m-auto w-full max-w-2xl rounded-2xl bg-white p-0 shadow-2xl border border-slate-200 backdrop:bg-slate-900/55 backdrop:backdrop-blur-xs"
      >
        <div className="p-4 flex flex-col max-h-[82vh]">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
            <h3 id="receipt-dialog-title" className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1c39bb]" /> Attached Bill / Receipt
            </h3>
            <button
              type="button"
              aria-label="Close receipt viewer"
              onClick={() => setReceiptModalSrc(null)}
              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-auto flex justify-center bg-slate-100 rounded-xl p-3">
            {receiptModalSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={receiptModalSrc}
                alt="Attached bill or receipt"
                className="max-w-full object-contain rounded-lg"
              />
            )}
          </div>
        </div>
      </dialog>

      {/* NATIVE DELETE CONFIRMATION MODAL */}
      <dialog
        ref={confirmDialogRef}
        aria-labelledby="confirm-dialog-title"
        onClose={() => setConfirmState(null)}
        className="m-auto w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 backdrop:bg-slate-900/55 backdrop:backdrop-blur-xs"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 id="confirm-dialog-title" className="font-extrabold text-sm text-slate-800">
                Confirm Deletion
              </h3>
              <p className="text-xs text-slate-500 mt-1">{confirmState?.message}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              autoFocus
              onClick={() => setConfirmState(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                confirmState?.onConfirm();
                setConfirmState(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition-all cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      </dialog>

      {/* TOAST CONTAINER */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg border-l-4 text-xs font-semibold ${
              t.tone === 'success'
                ? 'bg-slate-900 text-white border-emerald-500'
                : t.tone === 'info'
                ? 'bg-[#002d62] text-white border-blue-400'
                : 'bg-rose-700 text-white border-rose-300'
            }`}
          >
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
