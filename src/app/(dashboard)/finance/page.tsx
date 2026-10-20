'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  PieChart,
  Factory,
  Boxes,
  Receipt,
  DollarSign,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Trash2,
  Image as ImageIcon,
  X,
  FileSpreadsheet,
  Coins,
  ShieldCheck,
} from 'lucide-react';

interface RevenueLog {
  id: string;
  date: string;
  machine: string;
  styleCode: string;
  qty: number;
}

interface CogsLog {
  id: string;
  date: string;
  category: string;
  desc: string;
  amount: number;
}

interface OpexLog {
  id: string;
  date: string;
  category: string;
  desc: string;
  amount: number;
  billBase64: string | null;
}

const DUMMY_BASE64 =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjRmYSIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzAwMmQ2MiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zIj5GYWN0b3J5IFJlY2VpcHQgU2FtcGxlPC90ZXh0Pjwvc3ZnPg==';

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'revenue' | 'cogs' | 'opex'>('dashboard');

  // Filter State
  const [filterType, setFilterType] = useState<'monthly' | 'weekly' | 'daily'>('monthly');
  const [filterMonth, setFilterMonth] = useState('2026-09');
  const [filterWeek, setFilterWeek] = useState(1);
  const [filterDate, setFilterDate] = useState('2026-09-01');

  // Exchange Rates (LKR)
  const [rateUSD, setRateUSD] = useState(300.0);
  const [rateEUR, setRateEUR] = useState(330.0);
  const [rateGBP, setRateGBP] = useState(385.0);

  // Data Stores
  const [revenueLogs, setRevenueLogs] = useState<RevenueLog[]>([]);
  const [cogsLogs, setCogsLogs] = useState<CogsLog[]>([]);
  const [opexLogs, setOpexLogs] = useState<OpexLog[]>([]);

  // Form State - COGS
  const [cogsDate, setCogsDate] = useState('2026-09-01');
  const [cogsCategory, setCogsCategory] = useState('Embroidery Threads');
  const [cogsDesc, setCogsDesc] = useState('');
  const [cogsAmount, setCogsAmount] = useState<number>(0);

  // Form State - OPEX
  const [opexDate, setOpexDate] = useState('2026-09-02');
  const [opexCategory, setOpexCategory] = useState('Meals and Entertainment');
  const [opexDesc, setOpexDesc] = useState('');
  const [opexAmount, setOpexAmount] = useState<number>(0);
  const [opexBase64, setOpexBase64] = useState<string | null>(null);

  // Modal State for Image Receipt
  const [modalImage, setModalImage] = useState<string | null>(null);

  useEffect(() => {
    const savedRev = localStorage.getItem('dinusha_revenue_logs_v4');
    const savedCogs = localStorage.getItem('dinusha_cogs_logs_v4');
    const savedOpex = localStorage.getItem('dinusha_opex_logs_v4');

    if (savedRev) setRevenueLogs(JSON.parse(savedRev));
    else {
      const initialRev: RevenueLog[] = [
        { id: 'r1', date: '2026-09-01', machine: 'Machine 01', styleCode: 'NIK-102', qty: 1500 },
        { id: 'r2', date: '2026-09-02', machine: 'Machine 02', styleCode: 'TES-502', qty: 2200 },
        { id: 'r3', date: '2026-09-08', machine: 'Machine 01', styleCode: 'MOT-088', qty: 3500 },
        { id: 'r4', date: '2026-09-12', machine: 'Machine 02', styleCode: 'NIK-102', qty: 1800 },
        { id: 'r5', date: '2026-09-22', machine: 'Machine 01', styleCode: 'TES-502', qty: 2500 },
      ];
      setRevenueLogs(initialRev);
      localStorage.setItem('dinusha_revenue_logs_v4', JSON.stringify(initialRev));
    }

    if (savedCogs) setCogsLogs(JSON.parse(savedCogs));
    else {
      const initialCogs: CogsLog[] = [
        { id: 'c1', date: '2026-09-01', category: 'Embroidery Threads', desc: 'Madeira Polyneon 50 Cones', amount: 45000 },
        { id: 'c2', date: '2026-09-04', category: 'Backing (Tearaway/Cutaway)', desc: 'Tearaway Standard 5 Rolls', amount: 22000 },
        { id: 'c3', date: '2026-09-08', category: 'Needles', desc: 'DBxK5 75/11 (100 Pcs)', amount: 8500 },
      ];
      setCogsLogs(initialCogs);
      localStorage.setItem('dinusha_cogs_logs_v4', JSON.stringify(initialCogs));
    }

    if (savedOpex) setOpexLogs(JSON.parse(savedOpex));
    else {
      const initialOpex: OpexLog[] = [
        { id: 'o1', date: '2026-09-02', category: 'Meals and Entertainment', desc: 'Keells Factory Groceries', amount: 18500, billBase64: DUMMY_BASE64 },
        { id: 'o2', date: '2026-09-05', category: 'Repairs and Maintenance', desc: 'Tajima Routine Maintenance Service', amount: 45000, billBase64: null },
        { id: 'o3', date: '2026-09-10', category: 'IT and Internet Expenses', desc: 'SLT Dialog Fiber Bill', amount: 8500, billBase64: DUMMY_BASE64 },
        { id: 'o4', date: '2026-09-15', category: 'Automobile Expense', desc: 'Factory Lorry Diesel', amount: 12000, billBase64: null },
      ];
      setOpexLogs(initialOpex);
      localStorage.setItem('dinusha_opex_logs_v4', JSON.stringify(initialOpex));
    }
  }, []);

  const persistCogs = (updated: CogsLog[]) => {
    setCogsLogs(updated);
    localStorage.setItem('dinusha_cogs_logs_v4', JSON.stringify(updated));
  };

  const persistOpex = (updated: OpexLog[]) => {
    setOpexLogs(updated);
    localStorage.setItem('dinusha_opex_logs_v4', JSON.stringify(updated));
  };

  // Date In Filter Check
  const isDateInFilter = (dateStr: string) => {
    if (filterType === 'monthly') {
      return dateStr.startsWith(filterMonth);
    }
    if (filterType === 'weekly') {
      if (!dateStr.startsWith(filterMonth)) return false;
      const day = parseInt(dateStr.split('-')[2], 10);
      if (filterWeek === 1 && day >= 1 && day <= 7) return true;
      if (filterWeek === 2 && day >= 8 && day <= 14) return true;
      if (filterWeek === 3 && day >= 15 && day <= 21) return true;
      if (filterWeek === 4 && day >= 22 && day <= 28) return true;
      if (filterWeek === 5 && day >= 29) return true;
      return false;
    }
    if (filterType === 'daily') {
      return dateStr === filterDate;
    }
    return true;
  };

  const getProrationFactor = () => {
    if (filterType === 'monthly') return 1.0;
    if (filterType === 'daily') return 1 / 30;
    if (filterType === 'weekly') return filterWeek >= 1 && filterWeek <= 4 ? 7 / 30 : 2 / 30;
    return 1.0;
  };

  // Currency Converter
  const getExchangeRate = (curr: string) => {
    if (curr === 'USD') return rateUSD;
    if (curr === 'EUR') return rateEUR;
    if (curr === 'GBP') return rateGBP;
    return 1;
  };

  // Mock Style Prices for conversion
  const stylePrices: Record<string, { price: number; curr: string; name: string }> = {
    'NIK-102': { price: 1.2, curr: 'USD', name: 'Nike Track Jacket' },
    'TES-502': { price: 0.85, curr: 'GBP', name: 'Tesco Floral' },
    'MOT-088': { price: 150.0, curr: 'LKR', name: 'Motif Chest Badge' },
  };

  // Form Submissions
  const handleSaveCogs = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cogsAmount) return;

    const newLog: CogsLog = {
      id: `c-${Date.now()}`,
      date: cogsDate,
      category: cogsCategory,
      desc: cogsDesc,
      amount: cogsAmount,
    };

    persistCogs([newLog, ...cogsLogs]);
    setCogsDesc('');
    setCogsAmount(0);
  };

  const handleSaveOpex = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opexAmount) return;

    const newLog: OpexLog = {
      id: `o-${Date.now()}`,
      date: opexDate,
      category: opexCategory,
      desc: opexDesc,
      amount: opexAmount,
      billBase64: opexBase64,
    };

    persistOpex([newLog, ...opexLogs]);
    setOpexDesc('');
    setOpexAmount(0);
    setOpexBase64(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setOpexBase64(ev.target?.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // Calculations
  const filteredRev = revenueLogs.filter((l) => isDateInFilter(l.date));
  const filteredCogs = cogsLogs.filter((l) => isDateInFilter(l.date));
  const filteredOpex = opexLogs.filter((l) => isDateInFilter(l.date));

  let totalRevLKR = 0;
  let totalPieces = 0;
  const styleRevTotals: Record<string, { rev: number; qty: number }> = {};
  const machRevTotals: Record<string, number> = {};

  filteredRev.forEach((r) => {
    const s = stylePrices[r.styleCode] || { price: 150, curr: 'LKR', name: r.styleCode };
    const gross = r.qty * s.price * getExchangeRate(s.curr);
    totalRevLKR += gross;
    totalPieces += r.qty;

    if (!styleRevTotals[r.styleCode]) styleRevTotals[r.styleCode] = { rev: 0, qty: 0 };
    styleRevTotals[r.styleCode].rev += gross;
    styleRevTotals[r.styleCode].qty += r.qty;

    machRevTotals[r.machine] = (machRevTotals[r.machine] || 0) + gross;
  });

  const totalCogsLKR = filteredCogs.reduce((acc, c) => acc + c.amount, 0);
  const totalOpexLKR = filteredOpex.reduce((acc, o) => acc + o.amount, 0);

  // Prorated Factory Labor Base (37,000 * 14 employees approx 518,000 LKR)
  const baseMonthlyLabor = 518000;
  const appliedLabor = baseMonthlyLabor * getProrationFactor();

  const directCosts = totalCogsLKR + appliedLabor;
  const netProfit = totalRevLKR - directCosts - totalOpexLKR;
  const marginPct = totalRevLKR > 0 ? ((netProfit / totalRevLKR) * 100).toFixed(1) : '0';

  // Overhead Breakdown
  const opexBreakdown: Record<string, number> = {};
  filteredOpex.forEach((o) => {
    opexBreakdown[o.category] = (opexBreakdown[o.category] || 0) + o.amount;
  });

  return (
    <div className="space-y-6">
      {/* Global Filter Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-persian-50 text-persian-700 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm uppercase text-slate-800">
              Financial Governance & P&L Executive Ledger
            </h3>
            <p className="text-xs text-slate-500">
              Multi-Currency Revenue • Dynamic Labor Proration • COGS & OPEX
            </p>
          </div>
        </div>

        {/* Dynamic Period Filter Controls */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
          <Calendar className="w-4 h-4 text-slate-400 ml-2" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="p-2 bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="monthly">Monthly View</option>
            <option value="weekly">Weekly View</option>
            <option value="daily">Daily View</option>
          </select>

          <span className="w-px h-5 bg-slate-300" />

          {filterType === 'monthly' && (
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="p-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-persian-800 outline-none"
            />
          )}

          {filterType === 'weekly' && (
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="p-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-persian-800 outline-none"
              />
              <select
                value={filterWeek}
                onChange={(e) => setFilterWeek(parseInt(e.target.value))}
                className="p-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-persian-800 outline-none"
              >
                <option value={1}>Week 1 (1st - 7th)</option>
                <option value={2}>Week 2 (8th - 14th)</option>
                <option value={3}>Week 3 (15th - 21st)</option>
                <option value={4}>Week 4 (22nd - 28th)</option>
                <option value={5}>Week 5 (29th+)</option>
              </select>
            </div>
          )}

          {filterType === 'daily' && (
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="p-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-persian-800 outline-none"
            />
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 no-print">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'dashboard'
              ? 'bg-persian-800 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>P&L Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('revenue')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'revenue'
              ? 'bg-persian-800 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Factory className="w-3.5 h-3.5" />
          <span>Machine Revenue</span>
        </button>

        <button
          onClick={() => setActiveTab('cogs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'cogs'
              ? 'bg-persian-800 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Material Costs (COGS)</span>
        </button>

        <button
          onClick={() => setActiveTab('opex')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'opex'
              ? 'bg-persian-800 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>OPEX & Bills Ledger</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 1. P&L DASHBOARD */}
      {/* ============================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs border-l-4 border-l-blue-600 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Gross Factory Revenue
              </span>
              <h4 className="text-2xl font-black text-slate-900 font-mono">
                LKR {totalRevLKR.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">Total period output</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs border-l-4 border-l-rose-500 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Direct Labor & Materials
              </span>
              <h4 className="text-2xl font-black text-rose-700 font-mono">
                LKR {directCosts.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                COGS + {filterType === 'monthly' ? 'Full Month' : 'Prorated'} Payroll
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs border-l-4 border-l-amber-500 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Factory Overheads (OPEX)
              </span>
              <h4 className="text-2xl font-black text-amber-700 font-mono">
                LKR {totalOpexLKR.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">Bills & maintenance</p>
            </div>

            <div className="bg-persian-900 p-5 rounded-3xl border border-persian-800 shadow-lg text-white space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 block">
                Net Factory Profit
              </span>
              <h4
                className={`text-2xl font-black font-mono ${
                  netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                LKR {netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h4>
              <p className="text-xs font-bold text-amber-300">Net Margin: {marginPct}%</p>
            </div>
          </div>

          {/* Details Dual Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Overhead Distribution */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
              <h4 className="font-black text-xs uppercase text-slate-700 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-persian-600" />
                <span>Overhead Cost Distribution</span>
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-right">Amount (LKR)</th>
                      <th className="p-3 text-right">% of OPEX</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.keys(opexBreakdown).map((cat) => {
                      const amt = opexBreakdown[cat];
                      const pct =
                        totalOpexLKR > 0 ? ((amt / totalOpexLKR) * 100).toFixed(1) : '0';

                      return (
                        <tr key={cat} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-800">{cat}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-700">
                            {amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right">
                            <span className="font-bold text-amber-600">{pct}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Revenue Generating Styles */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
              <h4 className="font-black text-xs uppercase text-slate-700 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Top Revenue Generating Styles</span>
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Style Code</th>
                      <th className="p-3 text-center">Volume (Pcs)</th>
                      <th className="p-3 text-right">Gross Income (LKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.keys(styleRevTotals).map((code) => {
                      const item = styleRevTotals[code];
                      return (
                        <tr key={code} className="hover:bg-slate-50">
                          <td className="p-3 font-black text-persian-800 font-mono">{code}</td>
                          <td className="p-3 text-center font-bold text-slate-700">
                            {item.qty.toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-black text-emerald-700 font-mono">
                            {item.rev.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. MACHINE REVENUE */}
      {/* ============================================================== */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          {/* Global Exchange Rates Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-6">
            <span className="text-xs font-black uppercase text-slate-600 flex items-center gap-2">
              <Coins className="w-4 h-4 text-persian-600" />
              <span>Global Currency Rates</span>
            </span>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-600">1 USD =</span>
              <input
                type="number"
                value={rateUSD}
                onChange={(e) => setRateUSD(parseFloat(e.target.value) || 300)}
                className="w-20 p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-persian-800 text-center"
              />
              <span className="font-bold text-slate-600">LKR</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-600">1 EUR =</span>
              <input
                type="number"
                value={rateEUR}
                onChange={(e) => setRateEUR(parseFloat(e.target.value) || 330)}
                className="w-20 p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-persian-800 text-center"
              />
              <span className="font-bold text-slate-600">LKR</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-600">1 GBP =</span>
              <input
                type="number"
                value={rateGBP}
                onChange={(e) => setRateGBP(parseFloat(e.target.value) || 385)}
                className="w-20 p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-persian-800 text-center"
              />
              <span className="font-bold text-slate-600">LKR</span>
            </div>
          </div>

          {/* Revenue Ledger Table */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <h4 className="font-black text-sm uppercase text-slate-800">
              Machine Revenue Output Ledger
            </h4>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Machine</th>
                    <th className="p-3.5">Style</th>
                    <th className="p-3.5">Unit Price</th>
                    <th className="p-3.5 text-center">Output (Pcs)</th>
                    <th className="p-3.5 text-right">Gross Income (LKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredRev.map((log) => {
                    const s = stylePrices[log.styleCode] || { price: 150, curr: 'LKR' };
                    const gross = log.qty * s.price * getExchangeRate(s.curr);

                    return (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="p-3.5 text-slate-500">{log.date}</td>
                        <td className="p-3.5 font-bold font-sans text-slate-800">{log.machine}</td>
                        <td className="p-3.5 font-black text-persian-800">{log.styleCode}</td>
                        <td className="p-3.5 text-slate-600">
                          {s.curr} {s.price.toFixed(2)}
                        </td>
                        <td className="p-3.5 text-center font-bold font-sans">
                          {log.qty.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right font-black text-emerald-700">
                          LKR {gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
      {/* 3. MATERIAL COSTS (COGS) */}
      {/* ============================================================== */}
      {activeTab === 'cogs' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 lg:col-span-1 h-fit space-y-4">
            <h4 className="font-black text-sm uppercase text-slate-800 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-amber-500" />
              <span>Log Material Purchase (COGS)</span>
            </h4>

            <form onSubmit={handleSaveCogs} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={cogsDate}
                  onChange={(e) => setCogsDate(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                <select
                  value={cogsCategory}
                  onChange={(e) => setCogsCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                >
                  <option value="Embroidery Threads">Embroidery Threads</option>
                  <option value="Backing (Tearaway/Cutaway)">Backing (Tearaway/Cutaway)</option>
                  <option value="Needles">Needles</option>
                  <option value="Chemicals & Sprays">Chemicals & Sprays</option>
                  <option value="Packaging Materials">Packaging Materials</option>
                  <option value="Other Raw Materials">Other Raw Materials</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supplier / Description *
                </label>
                <input
                  type="text"
                  value={cogsDesc}
                  onChange={(e) => setCogsDesc(e.target.value)}
                  placeholder="e.g. Madeira Thread Cones"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Total Amount (LKR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cogsAmount}
                  onChange={(e) => setCogsAmount(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-amber-800 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold p-3 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all"
              >
                Save Material Cost
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 lg:col-span-2 space-y-4">
            <h4 className="font-black text-sm uppercase text-slate-800">Direct Material Purchases</h4>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Supplier / Description</th>
                    <th className="p-3.5 text-right">Amount (LKR)</th>
                    <th className="p-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCogs.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-mono text-slate-500">{c.date}</td>
                      <td className="p-3.5 font-bold text-slate-800">{c.category}</td>
                      <td className="p-3.5 text-slate-600">{c.desc}</td>
                      <td className="p-3.5 text-right font-mono font-black text-amber-700">
                        {c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => {
                            if (confirm('Delete record?')) {
                              persistCogs(cogsLogs.filter((item) => item.id !== c.id));
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. OPEX & BILLS LEDGER */}
      {/* ============================================================== */}
      {activeTab === 'opex' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 lg:col-span-1 h-fit space-y-4">
            <h4 className="font-black text-sm uppercase text-slate-800 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-rose-500" />
              <span>Log General Factory Expense</span>
            </h4>

            <form onSubmit={handleSaveOpex} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={opexDate}
                  onChange={(e) => setOpexDate(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                <select
                  value={opexCategory}
                  onChange={(e) => setOpexCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                >
                  <option value="Advertising And Marketing">Advertising And Marketing</option>
                  <option value="Automobile Expense">Automobile Expense</option>
                  <option value="Bank Fees and Charges">Bank Fees and Charges</option>
                  <option value="IT and Internet Expenses">IT and Internet Expenses</option>
                  <option value="Janitorial Expense">Janitorial Expense</option>
                  <option value="Meals and Entertainment">Meals and Entertainment</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Repairs and Maintenance">Repairs and Maintenance</option>
                  <option value="Telephone Expense">Telephone Expense</option>
                  <option value="Travel Expense">Travel Expense</option>
                  <option value="Other Expenses">Other Expenses</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Vendor / Description *
                </label>
                <input
                  type="text"
                  value={opexDesc}
                  onChange={(e) => setOpexDesc(e.target.value)}
                  placeholder="e.g. Keells Grocery for Workers"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Total Amount (LKR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={opexAmount}
                  onChange={(e) => setOpexAmount(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-rose-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Attach Receipt Image (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-rose-700 hover:bg-rose-800 text-white font-bold p-3 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all"
              >
                Save Expense Record
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 lg:col-span-2 space-y-4">
            <h4 className="font-black text-sm uppercase text-slate-800">OPEX & Bills Ledger</h4>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Vendor / Description</th>
                    <th className="p-3.5 text-right">Amount (LKR)</th>
                    <th className="p-3.5 text-center">Receipt</th>
                    <th className="p-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOpex.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-mono text-slate-500">{o.date}</td>
                      <td className="p-3.5 font-bold text-slate-800">{o.category}</td>
                      <td className="p-3.5 text-slate-600">{o.desc}</td>
                      <td className="p-3.5 text-right font-mono font-black text-rose-700">
                        {o.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-center">
                        {o.billBase64 ? (
                          <button
                            onClick={() => setModalImage(o.billBase64)}
                            className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-persian-600" />
                            <span>View</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-300 italic">No File</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => {
                            if (confirm('Delete record?')) {
                              persistOpex(opexLogs.filter((item) => item.id !== o.id));
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Receipt Image */}
      {modalImage && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-xl w-full space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-bold text-xs uppercase text-slate-800">Attached Bill / Receipt</h4>
              <button
                onClick={() => setModalImage(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-100 rounded-2xl p-4 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={modalImage}
                alt="Receipt"
                className="max-h-[60vh] max-w-full rounded-xl shadow-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
