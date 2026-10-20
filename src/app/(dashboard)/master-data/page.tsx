'use client';

import React, { useState, useEffect } from 'react';
import {
  Shirt,
  Building2,
  Cpu,
  FileSpreadsheet,
  Plus,
  Trash2,
  Printer,
  Edit3,
  CheckCircle2,
  Calculator,
  Search,
  Sparkles,
  Layers,
  ArrowLeft,
  X,
  Database,
  RefreshCw,
} from 'lucide-react';
import {
  fetchDbMachines,
  fetchDbClients,
  fetchDbStyles,
  createDbMachine,
  deleteDbMachine,
  createDbClient,
  deleteDbClient,
  createDbStyle,
  deleteDbStyle,
  type DbMachine,
  type DbClient,
  type DbStyle,
} from '@/actions/master-data';

interface ThreadRow {
  color: string;
  shade: string;
  brand: string;
  mLen: number;
  cLen: number;
}

interface PartItem {
  name: string;
  qty: number;
  backing: string;
  needle: string;
  threads: ThreadRow[];
}

interface MasterStyle {
  id: string;
  code: string;
  company: string;
  name: string;
  fabric: string;
  target: number;
  currency: string;
  price: number;
  qty: number;
  parts: PartItem[];
}

const DROPDOWNS = {
  brands: ['Madeira', 'Gunold', 'Isacord', 'Coats', 'Marathon', 'Simthread', 'Generic'],
  backings: [
    'Tearaway (Standard)',
    'Tearaway (Heavy)',
    'Cutaway (Standard)',
    'Cutaway (Heavy)',
    'Washaway',
    'Peel and Stick',
  ],
  needles: ['DBxK5 65/9', 'DBxK5 70/10', 'DBxK5 75/11', 'DBxK5 80/12', 'DBxK5 90/14'],
  cones: [2500, 3000, 5000, 10000],
  fabrics: [
    'White',
    'Black',
    'Navy Blue',
    'Royal Blue',
    'Red',
    'Pink',
    'Grey',
    'Charcoal',
    'Green',
    'Yellow',
    'Other',
  ],
  currencies: ['LKR', 'USD', 'EUR', 'GBP'],
};

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<'styles' | 'companies' | 'machines' | 'sheet'>('styles');
  const [isLoading, setIsLoading] = useState(true);

  // Real Database State (Starts completely empty)
  const [companies, setCompanies] = useState<DbClient[]>([]);
  const [machines, setMachines] = useState<DbMachine[]>([]);
  const [styles, setStyles] = useState<MasterStyle[]>([]);
  const [selectedStyleForSheet, setSelectedStyleForSheet] = useState<MasterStyle | null>(null);

  // Style Form Draft State
  const [styleCode, setStyleCode] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [styleName, setStyleName] = useState('');
  const [styleFabric, setStyleFabric] = useState('White');
  const [styleTarget, setStyleTarget] = useState(20);
  const [styleCurrency, setStyleCurrency] = useState('LKR');
  const [stylePrice, setStylePrice] = useState(150.0);
  const [styleQty, setStyleQty] = useState(1000);
  const [draftParts, setDraftParts] = useState<PartItem[]>([
    {
      name: 'Front Logo',
      qty: 1,
      backing: 'Tearaway (Standard)',
      needle: 'DBxK5 75/11',
      threads: [{ color: '', shade: '', brand: 'Madeira', mLen: 0, cLen: 5000 }],
    },
  ]);

  // Company Form State
  const [compName, setCompName] = useState('');
  const [compColorScheme, setCompColorScheme] = useState('indigo');

  // Machine Form State
  const [machNumber, setMachNumber] = useState<number>(1);
  const [machName, setMachName] = useState('');
  const [machHeads, setMachHeads] = useState(15);
  const [machSpeed, setMachSpeed] = useState(1000);
  const [machBrand, setMachBrand] = useState('Tajima');
  const [machStatus, setMachStatus] = useState<'RUNNING' | 'SETUP' | 'MAINTENANCE' | 'IDLE'>('IDLE');

  // Load Real Data from Supabase
  const loadDatabaseData = async () => {
    setIsLoading(true);
    try {
      const [dbMachs, dbClis, dbStys] = await Promise.all([
        fetchDbMachines(),
        fetchDbClients(),
        fetchDbStyles(),
      ]);

      setMachines(dbMachs);
      setCompanies(dbClis);

      if (dbClis.length > 0 && !selectedClientId) {
        setSelectedClientId(dbClis[0].id);
      }

      // Map DB styles to UI format
      const mappedStyles: MasterStyle[] = dbStys.map((s) => ({
        id: s.id,
        code: s.style_name.split(' ')[0] || s.id.slice(0, 6).toUpperCase(),
        company: s.client?.name || 'Unassigned',
        name: s.style_name,
        fabric: 'Standard',
        target: s.target_per_hour || 20,
        currency: 'LKR',
        price: 150,
        qty: 1000,
        parts: [
          {
            name: 'Main Artwork',
            qty: 1,
            backing: 'Tearaway (Standard)',
            needle: 'DBxK5 75/11',
            threads: [{ color: 'Primary', shade: '1001', brand: 'Madeira', mLen: 25, cLen: 5000 }],
          },
        ],
      }));

      setStyles(mappedStyles);
    } catch (err) {
      console.error('Error loading Supabase master data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatabaseData();
  }, []);

  // Parts Builder
  const addPart = () => {
    setDraftParts([
      ...draftParts,
      {
        name: `Part ${draftParts.length + 1}`,
        qty: 1,
        backing: 'Tearaway (Standard)',
        needle: 'DBxK5 75/11',
        threads: [{ color: '', shade: '', brand: 'Madeira', mLen: 0, cLen: 5000 }],
      },
    ]);
  };

  const removePart = (pIdx: number) => {
    setDraftParts(draftParts.filter((_, idx) => idx !== pIdx));
  };

  const addThread = (pIdx: number) => {
    const updated = [...draftParts];
    updated[pIdx].threads.push({ color: '', shade: '', brand: 'Madeira', mLen: 0, cLen: 5000 });
    setDraftParts(updated);
  };

  const removeThread = (pIdx: number, tIdx: number) => {
    const updated = [...draftParts];
    updated[pIdx].threads = updated[pIdx].threads.filter((_, idx) => idx !== tIdx);
    setDraftParts(updated);
  };

  const updateThread = (pIdx: number, tIdx: number, field: keyof ThreadRow, value: any) => {
    const updated = [...draftParts];
    updated[pIdx].threads[tIdx] = {
      ...updated[pIdx].threads[tIdx],
      [field]: value,
    };
    setDraftParts(updated);
  };

  const updatePartField = (pIdx: number, field: keyof PartItem, value: any) => {
    const updated = [...draftParts];
    updated[pIdx] = {
      ...updated[pIdx],
      [field]: value,
    };
    setDraftParts(updated);
  };

  // Submit Style directly to Supabase
  const handleStyleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!styleName || !selectedClientId) {
      alert('Please fill in Style Name and select a Client Company.');
      return;
    }

    try {
      await createDbStyle({
        client_id: selectedClientId,
        style_name: styleCode ? `${styleCode} - ${styleName}` : styleName,
        target_per_hour: styleTarget,
      });

      setStyleCode('');
      setStyleName('');
      await loadDatabaseData();
    } catch (err: any) {
      alert(`Error saving style to database: ${err.message}`);
    }
  };

  const handleDeleteStyle = async (id: string) => {
    if (confirm('Delete this style from Supabase database?')) {
      try {
        await deleteDbStyle(id);
        await loadDatabaseData();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Submit Client directly to Supabase
  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName) return;

    try {
      await createDbClient(compName, compColorScheme);
      setCompName('');
      await loadDatabaseData();
    } catch (err: any) {
      alert(`Error saving client to database: ${err.message}`);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (confirm('Delete this client from Supabase database?')) {
      try {
        await deleteDbClient(id);
        await loadDatabaseData();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Submit Machine directly to Supabase
  const handleMachineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machName) return;

    try {
      await createDbMachine({
        machine_number: machNumber,
        machine_name: machName,
        brand: machBrand,
        heads: machHeads,
        speed: machSpeed,
        status: machStatus,
      });

      setMachNumber(machNumber + 1);
      setMachName('');
      await loadDatabaseData();
    } catch (err: any) {
      alert(`Error saving machine to database: ${err.message}`);
    }
  };

  const handleDeleteMachine = async (id: string) => {
    if (confirm('Delete this machine from Supabase database?')) {
      try {
        await deleteDbMachine(id);
        await loadDatabaseData();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const openStrikeOffSheet = (style: MasterStyle) => {
    setSelectedStyleForSheet(style);
    setActiveTab('sheet');
  };

  return (
    <div className="space-y-6">
      {/* Live DB Sync Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs no-print">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('styles')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'styles'
                ? 'bg-persian-800 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Shirt className="w-4 h-4" />
            <span>Styles Master</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
              {styles.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('companies')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'companies'
                ? 'bg-persian-800 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Clients & Companies</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
              {companies.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('machines')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'machines'
                ? 'bg-persian-800 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Machines Fleet</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
              {machines.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadDatabaseData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync DB</span>
          </button>

          <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
            <Database className="w-3 h-3 text-emerald-600" />
            <span>Live Supabase Connected</span>
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. STYLES MASTER TAB */}
      {/* ============================================================== */}
      {activeTab === 'styles' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm uppercase text-slate-800 flex items-center gap-2">
                <Shirt className="w-4 h-4 text-persian-600" />
                <span>Register New Master Style (Saves to Supabase Database)</span>
              </h3>
            </div>

            <form onSubmit={handleStyleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Client Company *
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    required
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-persian-500"
                  >
                    {companies.length === 0 ? (
                      <option value="">No clients found — Add client first</option>
                    ) : (
                      companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Style Code / Prefix
                  </label>
                  <input
                    type="text"
                    value={styleCode}
                    onChange={(e) => setStyleCode(e.target.value)}
                    placeholder="e.g. NIK-102"
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-persian-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Style Name *
                  </label>
                  <input
                    type="text"
                    value={styleName}
                    onChange={(e) => setStyleName(e.target.value)}
                    placeholder="e.g. Track Jacket Chest Logo"
                    required
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-persian-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Target Pcs / Hour
                  </label>
                  <input
                    type="number"
                    value={styleTarget}
                    onChange={(e) => setStyleTarget(parseInt(e.target.value) || 20)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={companies.length === 0}
                className="bg-persian-800 hover:bg-persian-700 disabled:bg-slate-300 text-white font-bold px-8 py-3 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all"
              >
                Save Style to Database
              </button>
            </form>
          </div>

          {/* Directory Table */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-black text-sm uppercase text-slate-800">
              Live Database Styles Catalog ({styles.length})
            </h3>

            {styles.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
                <Shirt className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-500">
                  No styles found in the Supabase database.
                </p>
                <p className="text-[11px] text-slate-400">
                  Create a client company first, then register your real style using the form above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-4">Style Name</th>
                      <th className="p-4">Client Company</th>
                      <th className="p-4">Target / Hr</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {styles.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-4 font-bold text-slate-900 font-sans">{s.name}</td>
                        <td className="p-4 text-slate-600">{s.company}</td>
                        <td className="p-4 font-black text-persian-800">{s.target} Pcs</td>
                        <td className="p-4 text-center space-x-2">
                          <button
                            onClick={() => openStrikeOffSheet(s)}
                            className="bg-persian-50 text-persian-800 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-persian-100"
                          >
                            Strike-Off Sheet
                          </button>
                          <button
                            onClick={() => handleDeleteStyle(s.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. CLIENTS TAB */}
      {/* ============================================================== */}
      {activeTab === 'companies' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 lg:col-span-1 h-fit space-y-4">
            <h3 className="font-black text-sm uppercase text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-persian-600" />
              <span>Register Real Client Company</span>
            </h3>

            <form onSubmit={handleCompanySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  placeholder="e.g. MAS Holdings / Brandix"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-persian-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Color Tag Code
                </label>
                <select
                  value={compColorScheme}
                  onChange={(e) => setCompColorScheme(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                >
                  <option value="indigo">Indigo Blue</option>
                  <option value="emerald">Emerald Green</option>
                  <option value="amber">Amber Gold</option>
                  <option value="purple">Purple</option>
                  <option value="slate">Slate Grey</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-persian-800 hover:bg-persian-700 text-white font-bold p-3 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all"
              >
                Save Client to Database
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 lg:col-span-2 space-y-4">
            <h3 className="font-black text-sm uppercase text-slate-800">
              Live Database Client Directory ({companies.length})
            </h3>

            {companies.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
                <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-500">
                  No client companies registered in Supabase.
                </p>
                <p className="text-[11px] text-slate-400">
                  Register your first real client company using the form on the left.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-4">Company Name</th>
                      <th className="p-4">Color Tag</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {companies.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="p-4 font-black text-persian-900 text-sm">{c.name}</td>
                        <td className="p-4">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase">
                            {c.color_scheme}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDeleteClient(c.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. MACHINES TAB */}
      {/* ============================================================== */}
      {activeTab === 'machines' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 lg:col-span-1 h-fit space-y-4">
            <h3 className="font-black text-sm uppercase text-slate-800 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-persian-600" />
              <span>Register Real Machine Unit</span>
            </h3>

            <form onSubmit={handleMachineSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Machine # *
                  </label>
                  <input
                    type="number"
                    value={machNumber}
                    onChange={(e) => setMachNumber(parseInt(e.target.value) || 1)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Machine Name *
                  </label>
                  <input
                    type="text"
                    value={machName}
                    onChange={(e) => setMachName(e.target.value)}
                    placeholder="Machine 01"
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Heads</label>
                  <input
                    type="number"
                    value={machHeads}
                    onChange={(e) => setMachHeads(parseInt(e.target.value) || 15)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Speed SPM</label>
                  <input
                    type="number"
                    value={machSpeed}
                    onChange={(e) => setMachSpeed(parseInt(e.target.value) || 1000)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Brand</label>
                <input
                  type="text"
                  value={machBrand}
                  onChange={(e) => setMachBrand(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-persian-800 hover:bg-persian-700 text-white font-bold p-3 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all"
              >
                Save Machine to Database
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 lg:col-span-2 space-y-4">
            <h3 className="font-black text-sm uppercase text-slate-800">
              Live Database Machine Fleet ({machines.length})
            </h3>

            {machines.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
                <Cpu className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-500">
                  No machines registered in Supabase database.
                </p>
                <p className="text-[11px] text-slate-400">
                  Register your factory machines using the form on the left.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-4">#</th>
                      <th className="p-4">Machine Name</th>
                      <th className="p-4">Brand</th>
                      <th className="p-4">Heads</th>
                      <th className="p-4">Speed</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {machines.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="p-4 font-bold text-persian-800">{m.machine_number}</td>
                        <td className="p-4 font-sans font-bold text-slate-900">{m.machine_name}</td>
                        <td className="p-4 text-slate-600 font-sans">{m.brand || '-'}</td>
                        <td className="p-4">{m.heads || '-'}</td>
                        <td className="p-4">{m.speed || '-'} SPM</td>
                        <td className="p-4">
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            {m.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDeleteMachine(m.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. STRIKE OFF SHEET */}
      {activeTab === 'sheet' && selectedStyleForSheet && (
        <div className="space-y-6">
          <div className="flex items-center justify-between no-print bg-white p-4 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('styles')}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Styles</span>
            </button>
            <button
              onClick={() => window.print()}
              className="bg-persian-800 text-white font-bold text-xs px-4 py-2 rounded-xl"
            >
              Print Strike-Off Sheet
            </button>
          </div>

          <div className="printable-area max-w-4xl mx-auto bg-white border-2 border-black p-8 text-black">
            <h1 className="text-2xl font-serif font-black uppercase">DINUSHA EMBROIDERY</h1>
            <p className="text-xs uppercase font-bold">Embellishment Strike Off Submission Sheet</p>
            <div className="mt-4 p-4 border border-black font-mono text-xs">
              <p>Style: {selectedStyleForSheet.name}</p>
              <p>Client: {selectedStyleForSheet.company}</p>
              <p>Target: {selectedStyleForSheet.target} Pcs/Hr</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
