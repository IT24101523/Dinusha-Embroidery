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
} from 'lucide-react';

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

interface Company {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
}

interface Machine {
  id: string;
  name: string;
  heads: number;
  speed: number;
  brand: string;
  types: string[];
  status: 'Active' | 'Maintenance';
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

  // Master Data State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [styles, setStyles] = useState<MasterStyle[]>([]);
  const [selectedStyleForSheet, setSelectedStyleForSheet] = useState<MasterStyle | null>(null);

  // Style Form Draft State
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
  const [styleCode, setStyleCode] = useState('');
  const [styleCompany, setStyleCompany] = useState('Nike Apparel');
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
      threads: [{ color: 'Navy', shade: '1842', brand: 'Madeira', mLen: 45, cLen: 5000 }],
    },
  ]);

  // Company Form State
  const [compName, setCompName] = useState('');
  const [compContact, setCompContact] = useState('');
  const [compEmail, setCompEmail] = useState('');
  const [compPhone, setCompPhone] = useState('');
  const [editingCompId, setEditingCompId] = useState<string | null>(null);

  // Machine Form State
  const [machName, setMachName] = useState('');
  const [machHeads, setMachHeads] = useState(15);
  const [machSpeed, setMachSpeed] = useState(1000);
  const [machBrand, setMachBrand] = useState('Tajima');
  const [machTypes, setMachTypes] = useState<string[]>(['Normal']);
  const [machStatus, setMachStatus] = useState<'Active' | 'Maintenance'>('Active');
  const [editingMachId, setEditingMachId] = useState<string | null>(null);

  // Initial Load from localStorage or seeds
  useEffect(() => {
    const savedComps = localStorage.getItem('dinusha_companies_master');
    if (savedComps) {
      setCompanies(JSON.parse(savedComps));
    } else {
      const initialComps: Company[] = [
        { id: 'c1', name: 'Nike Apparel', contact: 'John Doe', email: 'john@nike.lk', phone: '011 234 5678' },
        { id: 'c2', name: 'Motif Brand', contact: 'Kamal Perera', email: 'kamal@motifstyles.com', phone: '077 345 6789' },
        { id: 'c3', name: 'Tesco Sri Lanka', contact: 'Sarah Jenkins', email: 'sarah.j@tesco.lk', phone: '011 555 4321' },
        { id: 'c4', name: 'Adidas Sportswear', contact: 'Mark Evans', email: 'mark@adidas.com', phone: '071 888 9900' },
      ];
      setCompanies(initialComps);
      localStorage.setItem('dinusha_companies_master', JSON.stringify(initialComps));
    }

    const savedMachs = localStorage.getItem('dinusha_machines_v2');
    if (savedMachs) {
      setMachines(JSON.parse(savedMachs));
    } else {
      const initialMachs: Machine[] = Array.from({ length: 13 }, (_, i) => ({
        id: `m-${i + 1}`,
        name: `Machine ${(i + 1).toString().padStart(2, '0')}`,
        heads: i % 2 === 0 ? 15 : 20,
        speed: 1000,
        brand: i === 1 ? 'Barudan' : 'Tajima',
        types: i % 3 === 0 ? ['Normal', 'Sequence'] : ['Normal'],
        status: 'Active',
      }));
      setMachines(initialMachs);
      localStorage.setItem('dinusha_machines_v2', JSON.stringify(initialMachs));
    }

    const savedStyles = localStorage.getItem('dinusha_styles_v3');
    if (savedStyles) {
      setStyles(JSON.parse(savedStyles));
    } else {
      const initialStyles: MasterStyle[] = [
        {
          id: 's-1',
          code: 'NIK-102',
          company: 'Nike Apparel',
          name: 'Track Jacket Logo #102',
          fabric: 'Navy Blue',
          target: 20,
          currency: 'USD',
          price: 1.2,
          qty: 2000,
          parts: [
            {
              name: 'Chest Swoosh',
              qty: 1,
              backing: 'Tearaway (Standard)',
              needle: 'DBxK5 75/11',
              threads: [
                { color: 'White', shade: '1801', brand: 'Madeira', mLen: 38.5, cLen: 5000 },
                { color: 'Silver', shade: '1918', brand: 'Madeira', mLen: 12.0, cLen: 5000 },
              ],
            },
          ],
        },
        {
          id: 's-2',
          code: 'MOT-088',
          company: 'Motif Brand',
          name: 'Chest Badge #88',
          fabric: 'Black',
          target: 25,
          currency: 'LKR',
          price: 150.0,
          qty: 1500,
          parts: [
            {
              name: 'Badge Center',
              qty: 1,
              backing: 'Cutaway (Standard)',
              needle: 'DBxK5 75/11',
              threads: [
                { color: 'Gold', shade: '1725', brand: 'Gunold', mLen: 52.0, cLen: 3000 },
                { color: 'Red', shade: '1637', brand: 'Madeira', mLen: 18.0, cLen: 5000 },
              ],
            },
          ],
        },
        {
          id: 's-3',
          code: 'TES-502',
          company: 'Tesco Sri Lanka',
          name: 'Floral Embroidery #502',
          fabric: 'White',
          target: 18,
          currency: 'GBP',
          price: 0.85,
          qty: 1800,
          parts: [
            {
              name: 'Floral Petals',
              qty: 2,
              backing: 'Tearaway (Standard)',
              needle: 'DBxK5 65/9',
              threads: [
                { color: 'Pink', shade: '1815', brand: 'Madeira', mLen: 42.0, cLen: 5000 },
                { color: 'Leaf Green', shade: '1902', brand: 'Madeira', mLen: 28.5, cLen: 5000 },
              ],
            },
          ],
        },
      ];
      setStyles(initialStyles);
      localStorage.setItem('dinusha_styles_v3', JSON.stringify(initialStyles));
    }
  }, []);

  // Save Handlers
  const persistStyles = (updated: MasterStyle[]) => {
    setStyles(updated);
    localStorage.setItem('dinusha_styles_v3', JSON.stringify(updated));
  };

  const persistCompanies = (updated: Company[]) => {
    setCompanies(updated);
    localStorage.setItem('dinusha_companies_master', JSON.stringify(updated));
  };

  const persistMachines = (updated: Machine[]) => {
    setMachines(updated);
    localStorage.setItem('dinusha_machines_v2', JSON.stringify(updated));
  };

  // Parts Builder Operations
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

  // Style Submit
  const handleStyleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!styleCode || !styleName) {
      alert('Please fill in Style Code and Style Name.');
      return;
    }
    if (draftParts.length === 0) {
      alert('Please add at least one garment part.');
      return;
    }

    const newStyle: MasterStyle = {
      id: editingStyleId || `s-${Date.now()}`,
      code: styleCode,
      company: styleCompany,
      name: styleName,
      fabric: styleFabric,
      target: styleTarget,
      currency: styleCurrency,
      price: stylePrice,
      qty: styleQty,
      parts: draftParts,
    };

    if (editingStyleId) {
      persistStyles(styles.map((s) => (s.id === editingStyleId ? newStyle : s)));
    } else {
      persistStyles([newStyle, ...styles]);
    }

    resetStyleForm();
  };

  const editStyle = (style: MasterStyle) => {
    setEditingStyleId(style.id);
    setStyleCode(style.code);
    setStyleCompany(style.company);
    setStyleName(style.name);
    setStyleFabric(style.fabric);
    setStyleTarget(style.target);
    setStyleCurrency(style.currency);
    setStylePrice(style.price);
    setStyleQty(style.qty);
    setDraftParts(JSON.parse(JSON.stringify(style.parts)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteStyle = (id: string) => {
    if (confirm('Are you sure you want to delete this master style?')) {
      persistStyles(styles.filter((s) => s.id !== id));
    }
  };

  const resetStyleForm = () => {
    setEditingStyleId(null);
    setStyleCode('');
    setStyleName('');
    setStyleFabric('White');
    setStylePrice(150.0);
    setStyleTarget(20);
    setDraftParts([
      {
        name: 'Front Logo',
        qty: 1,
        backing: 'Tearaway (Standard)',
        needle: 'DBxK5 75/11',
        threads: [{ color: '', shade: '', brand: 'Madeira', mLen: 0, cLen: 5000 }],
      },
    ]);
  };

  // Company Submit
  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName) return;

    const companyData: Company = {
      id: editingCompId || `c-${Date.now()}`,
      name: compName,
      contact: compContact,
      email: compEmail,
      phone: compPhone,
    };

    if (editingCompId) {
      persistCompanies(companies.map((c) => (c.id === editingCompId ? companyData : c)));
    } else {
      persistCompanies([...companies, companyData]);
    }

    setEditingCompId(null);
    setCompName('');
    setCompContact('');
    setCompEmail('');
    setCompPhone('');
  };

  // Machine Submit
  const handleMachineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!machName) return;

    const machineData: Machine = {
      id: editingMachId || `m-${Date.now()}`,
      name: machName,
      heads: machHeads,
      speed: machSpeed,
      brand: machBrand,
      types: machTypes.length > 0 ? machTypes : ['Normal'],
      status: machStatus,
    };

    if (editingMachId) {
      persistMachines(machines.map((m) => (m.id === editingMachId ? machineData : m)));
    } else {
      persistMachines([...machines, machineData]);
    }

    setEditingMachId(null);
    setMachName('');
    setMachHeads(15);
    setMachSpeed(1000);
    setMachBrand('Tajima');
    setMachTypes(['Normal']);
    setMachStatus('Active');
  };

  // Print Strike-Off Sheet
  const openStrikeOffSheet = (style: MasterStyle) => {
    setSelectedStyleForSheet(style);
    setActiveTab('sheet');
  };

  return (
    <div className="space-y-6">
      {/* Top Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs no-print">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('styles')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'styles'
                ? 'bg-persian-800 text-white shadow-md shadow-persian-800/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Shirt className="w-4 h-4" />
            <span>Style & Parts Master</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {styles.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('companies')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'companies'
                ? 'bg-persian-800 text-white shadow-md shadow-persian-800/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Clients & Companies</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {companies.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('machines')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'machines'
                ? 'bg-persian-800 text-white shadow-md shadow-persian-800/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Machine Fleet</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {machines.length}
            </span>
          </button>
        </div>

        {selectedStyleForSheet && (
          <button
            onClick={() => setActiveTab('sheet')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'sheet'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Active Strike-Off: {selectedStyleForSheet.code}</span>
          </button>
        )}
      </div>

      {/* ============================================================== */}
      {/* 1. STYLES & PARTS TAB */}
      {/* ============================================================== */}
      {activeTab === 'styles' && (
        <div className="space-y-6">
          {/* Style Registration / Editor Form */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Shirt className="w-5 h-5 text-persian-600" />
                <h3 className="font-black text-sm uppercase text-slate-800">
                  {editingStyleId ? 'Edit Master Style Hierarchy' : 'Register Master Style & Parts'}
                </h3>
              </div>
              {editingStyleId && (
                <button
                  type="button"
                  onClick={resetStyleForm}
                  className="text-xs text-rose-600 hover:underline font-bold"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleStyleSubmit} className="space-y-6">
              {/* Header Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Style Code *
                  </label>
                  <input
                    type="text"
                    value={styleCode}
                    onChange={(e) => setStyleCode(e.target.value)}
                    placeholder="e.g. NIK-102"
                    required
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-persian-800 outline-none focus:border-persian-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Company *
                  </label>
                  <select
                    value={styleCompany}
                    onChange={(e) => setStyleCompany(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-persian-500"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
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
                    Fabric Color
                  </label>
                  <select
                    value={styleFabric}
                    onChange={(e) => setStyleFabric(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-persian-500"
                  >
                    {DROPDOWNS.fabrics.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Target/Hr *
                  </label>
                  <input
                    type="number"
                    value={styleTarget}
                    onChange={(e) => setStyleTarget(parseInt(e.target.value) || 0)}
                    required
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Currency & Price *
                  </label>
                  <div className="flex gap-1">
                    <select
                      value={styleCurrency}
                      onChange={(e) => setStyleCurrency(e.target.value)}
                      className="w-16 p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold outline-none"
                    >
                      {DROPDOWNS.currencies.map((curr) => (
                        <option key={curr} value={curr}>
                          {curr}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      value={stylePrice}
                      onChange={(e) => setStylePrice(parseFloat(e.target.value) || 0)}
                      required
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-emerald-700 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Order Qty *
                  </label>
                  <input
                    type="number"
                    value={styleQty}
                    onChange={(e) => setStyleQty(parseInt(e.target.value) || 0)}
                    required
                    className="w-full p-2 bg-white border border-persian-300 rounded-xl text-xs font-black text-persian-800 outline-none"
                  />
                </div>
              </div>

              {/* Parts Builder */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-xs uppercase text-slate-700">
                      Garment Parts & Dynamic Thread Matrices
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Formula: Required Cones = ((Machine Length × 1.5) × Part Qty × Total Order
                      Qty) / Cone Size
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addPart}
                    className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Garment Part</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {draftParts.map((part, pIdx) => (
                    <div
                      key={pIdx}
                      className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs"
                    >
                      {/* Part Top Row */}
                      <div className="bg-slate-100/80 p-3.5 border-b border-slate-200 flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">
                            Part Location / Name
                          </label>
                          <input
                            type="text"
                            value={part.name}
                            onChange={(e) => updatePartField(pIdx, 'name', e.target.value)}
                            placeholder="e.g. Front Logo"
                            className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
                          />
                        </div>

                        <div className="w-24">
                          <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">
                            Part Qty
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={part.qty}
                            onChange={(e) =>
                              updatePartField(pIdx, 'qty', parseInt(e.target.value) || 1)
                            }
                            className="w-full p-2 bg-persian-50 border border-persian-200 rounded-xl text-xs font-black text-persian-800 outline-none"
                          />
                        </div>

                        <div className="w-48">
                          <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">
                            Backing Required
                          </label>
                          <select
                            value={part.backing}
                            onChange={(e) => updatePartField(pIdx, 'backing', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                          >
                            {DROPDOWNS.backings.map((b) => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-40">
                          <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">
                            Needle Spec
                          </label>
                          <select
                            value={part.needle}
                            onChange={(e) => updatePartField(pIdx, 'needle', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                          >
                            {DROPDOWNS.needles.map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => removePart(pIdx)}
                          className="bg-rose-50 text-rose-700 hover:bg-rose-100 p-2.5 rounded-xl border border-rose-200 text-xs font-bold transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Thread Matrix Table */}
                      <div className="p-3.5 overflow-x-auto">
                        <table className="w-full text-left text-xs whitespace-nowrap min-w-[700px]">
                          <thead className="text-[10px] font-extrabold uppercase text-slate-500 border-b border-slate-200">
                            <tr>
                              <th className="p-2 w-1/5">Thread Color</th>
                              <th className="p-2 w-1/5">Shade #</th>
                              <th className="p-2 w-1/5">Brand</th>
                              <th className="p-2 bg-blue-50/70 w-28">Mach. Len (m)</th>
                              <th className="p-2 bg-blue-50/70 w-28">Cone Size (m)</th>
                              <th className="p-2 bg-persian-50 text-center w-28 font-bold text-persian-900">
                                Req. Cones
                              </th>
                              <th className="p-2 text-center w-12">Del</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {part.threads.map((thread, tIdx) => {
                              const reqCones = (
                                (thread.mLen * 1.5 * part.qty * styleQty) /
                                (thread.cLen || 5000)
                              ).toFixed(2);

                              return (
                                <tr key={tIdx} className="hover:bg-slate-50/70">
                                  <td className="p-1.5">
                                    <input
                                      type="text"
                                      value={thread.color}
                                      onChange={(e) =>
                                        updateThread(pIdx, tIdx, 'color', e.target.value)
                                      }
                                      placeholder="Color name"
                                      className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                                    />
                                  </td>
                                  <td className="p-1.5">
                                    <input
                                      type="text"
                                      value={thread.shade}
                                      onChange={(e) =>
                                        updateThread(pIdx, tIdx, 'shade', e.target.value)
                                      }
                                      placeholder="Shade #"
                                      className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                                    />
                                  </td>
                                  <td className="p-1.5">
                                    <select
                                      value={thread.brand}
                                      onChange={(e) =>
                                        updateThread(pIdx, tIdx, 'brand', e.target.value)
                                      }
                                      className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white"
                                    >
                                      {DROPDOWNS.brands.map((b) => (
                                        <option key={b} value={b}>
                                          {b}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="p-1.5 bg-blue-50/40">
                                    <input
                                      type="number"
                                      step="0.1"
                                      value={thread.mLen}
                                      onChange={(e) =>
                                        updateThread(
                                          pIdx,
                                          tIdx,
                                          'mLen',
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="w-full p-2 border border-blue-200 rounded-lg text-xs font-bold text-blue-900 bg-white"
                                    />
                                  </td>
                                  <td className="p-1.5 bg-blue-50/40">
                                    <select
                                      value={thread.cLen}
                                      onChange={(e) =>
                                        updateThread(
                                          pIdx,
                                          tIdx,
                                          'cLen',
                                          parseInt(e.target.value) || 5000
                                        )
                                      }
                                      className="w-full p-2 border border-blue-200 rounded-lg text-xs font-bold text-blue-900 bg-white"
                                    >
                                      {DROPDOWNS.cones.map((c) => (
                                        <option key={c} value={c}>
                                          {c}m
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="p-1.5 bg-persian-50/80 text-center font-black text-persian-900 text-sm">
                                    {reqCones}
                                  </td>
                                  <td className="p-1.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => removeThread(pIdx, tIdx)}
                                      className="text-slate-400 hover:text-rose-600 p-1"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        <button
                          type="button"
                          onClick={() => addThread(pIdx)}
                          className="mt-2 text-[11px] font-bold text-persian-600 hover:text-persian-800 flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Thread Row</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="bg-persian-800 hover:bg-persian-700 text-white font-bold px-8 py-3 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all"
                >
                  {editingStyleId ? 'Update Master Style' : 'Save Master Style'}
                </button>
              </div>
            </form>
          </div>

          {/* Style Directory Table */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-black text-sm uppercase text-slate-800">
              Style Master Catalog Directory
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4">Style Code</th>
                    <th className="p-4">Company</th>
                    <th className="p-4">Style Name</th>
                    <th className="p-4">Fabric</th>
                    <th className="p-4">Unit Price</th>
                    <th className="p-4">Composition</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {styles.map((style) => {
                    const totalThreads = style.parts.reduce(
                      (acc, p) => acc + p.threads.length,
                      0
                    );
                    return (
                      <tr key={style.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 font-black text-persian-800 font-mono text-sm">
                          {style.code}
                        </td>
                        <td className="p-4 font-bold text-slate-700">{style.company}</td>
                        <td className="p-4 font-medium text-slate-800">{style.name}</td>
                        <td className="p-4 text-slate-600">{style.fabric}</td>
                        <td className="p-4 font-black text-emerald-700 font-mono">
                          {style.currency} {style.price.toFixed(2)}
                        </td>
                        <td className="p-4 text-slate-500 font-mono text-[11px]">
                          {style.parts.length} Part(s) • {totalThreads} Thread(s)
                        </td>
                        <td className="p-4 text-center space-x-2">
                          <button
                            onClick={() => openStrikeOffSheet(style)}
                            className="bg-persian-50 hover:bg-persian-100 text-persian-800 font-bold px-3 py-1.5 rounded-lg border border-persian-200 text-xs transition-colors inline-flex items-center gap-1"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Strike-Off Sheet</span>
                          </button>
                          <button
                            onClick={() => editStyle(style)}
                            className="text-slate-400 hover:text-persian-700 p-1.5 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteStyle(style.id)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* ============================================================== */}
      {/* 2. CLIENTS / COMPANIES TAB */}
      {/* ============================================================== */}
      {activeTab === 'companies' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 lg:col-span-1 h-fit space-y-4">
            <h3 className="font-black text-sm uppercase text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-persian-600" />
              <span>{editingCompId ? 'Edit Client Company' : 'Add Client Company'}</span>
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
                  placeholder="e.g. Nike Apparel"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-persian-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contact Person *
                </label>
                <input
                  type="text"
                  value={compContact}
                  onChange={(e) => setCompContact(e.target.value)}
                  placeholder="Representative name"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-persian-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={compEmail}
                  onChange={(e) => setCompEmail(e.target.value)}
                  placeholder="contact@company.com"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-persian-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={compPhone}
                  onChange={(e) => setCompPhone(e.target.value)}
                  placeholder="+94 11 234 5678"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-persian-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-persian-800 hover:bg-persian-700 text-white font-bold p-3 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all"
                >
                  {editingCompId ? 'Update Client' : 'Register Client'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 lg:col-span-2 space-y-4">
            <h3 className="font-black text-sm uppercase text-slate-800">Registered Client Directory</h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4">Company Name</th>
                    <th className="p-4">Contact Person</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {companies.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="p-4 font-black text-persian-900 text-sm">{c.name}</td>
                      <td className="p-4 font-semibold text-slate-700">{c.contact}</td>
                      <td className="p-4 font-mono text-blue-600">{c.email || '-'}</td>
                      <td className="p-4 font-mono text-slate-600">{c.phone || '-'}</td>
                      <td className="p-4 text-center space-x-2">
                        <button
                          onClick={() => {
                            setEditingCompId(c.id);
                            setCompName(c.name);
                            setCompContact(c.contact);
                            setCompEmail(c.email);
                            setCompPhone(c.phone);
                          }}
                          className="text-slate-400 hover:text-persian-700 p-1"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete client?')) {
                              persistCompanies(companies.filter((item) => item.id !== c.id));
                            }
                          }}
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
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. MACHINE INVENTORY TAB */}
      {/* ============================================================== */}
      {activeTab === 'machines' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 lg:col-span-1 h-fit space-y-4">
            <h3 className="font-black text-sm uppercase text-slate-800 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-persian-600" />
              <span>{editingMachId ? 'Edit Machine Unit' : 'Register Machine Unit'}</span>
            </h3>

            <form onSubmit={handleMachineSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Machine Identifier *
                </label>
                <input
                  type="text"
                  value={machName}
                  onChange={(e) => setMachName(e.target.value)}
                  placeholder="e.g. Machine 14"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-persian-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Head Count *
                  </label>
                  <input
                    type="number"
                    value={machHeads}
                    onChange={(e) => setMachHeads(parseInt(e.target.value) || 0)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Speed (SPM) *
                  </label>
                  <input
                    type="number"
                    value={machSpeed}
                    onChange={(e) => setMachSpeed(parseInt(e.target.value) || 0)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Brand *</label>
                <input
                  type="text"
                  value={machBrand}
                  onChange={(e) => setMachBrand(e.target.value)}
                  placeholder="e.g. Tajima"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Supported Capabilities
                </label>
                <div className="flex gap-4">
                  {['Normal', 'Chenille', 'Sequence'].map((t) => (
                    <label key={t} className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={machTypes.includes(t)}
                        onChange={(e) => {
                          if (e.target.checked) setMachTypes([...machTypes, t]);
                          else setMachTypes(machTypes.filter((item) => item !== t));
                        }}
                        className="rounded text-persian-600"
                      />
                      <span>{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={machStatus}
                  onChange={(e) => setMachStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-persian-800 hover:bg-persian-700 text-white font-bold p-3 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all"
              >
                {editingMachId ? 'Update Machine' : 'Save Machine'}
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 lg:col-span-2 space-y-4">
            <h3 className="font-black text-sm uppercase text-slate-800">
              13-Machine Fleet Inventory
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4">Machine Unit</th>
                    <th className="p-4">Brand</th>
                    <th className="p-4">Heads</th>
                    <th className="p-4">Max Speed</th>
                    <th className="p-4">Capabilities</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {machines.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="p-4 font-black text-slate-800">{m.name}</td>
                      <td className="p-4 font-semibold text-slate-600">{m.brand}</td>
                      <td className="p-4 font-mono">{m.heads} Heads</td>
                      <td className="p-4 font-mono">{m.speed} SPM</td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          {m.types.map((t) => (
                            <span
                              key={t}
                              className="bg-persian-100 text-persian-800 text-[10px] font-bold px-2 py-0.5 rounded"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                            m.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="p-4 text-center space-x-2">
                        <button
                          onClick={() => {
                            setEditingMachId(m.id);
                            setMachName(m.name);
                            setMachHeads(m.heads);
                            setMachSpeed(m.speed);
                            setMachBrand(m.brand);
                            setMachTypes(m.types);
                            setMachStatus(m.status);
                          }}
                          className="text-slate-400 hover:text-persian-700 p-1"
                        >
                          <Edit3 className="w-4 h-4" />
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
      {/* 4. PHYSICAL STRIKE-OFF SUBMISSION SHEET TAB (PRINTABLE A4) */}
      {/* ============================================================== */}
      {activeTab === 'sheet' && selectedStyleForSheet && (
        <div className="space-y-6">
          <div className="flex items-center justify-between no-print bg-white p-4 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('styles')}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Style Master</span>
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 bg-persian-800 hover:bg-persian-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 Strike-Off Sheet</span>
            </button>
          </div>

          {/* Printable A4 Sheet Container */}
          <div className="printable-area max-w-4xl mx-auto space-y-12">
            {selectedStyleForSheet.parts.map((part, pIdx) => {
              const currentDate = new Date().toLocaleDateString('en-GB');

              return (
                <div
                  key={pIdx}
                  className="print-page bg-white text-black mx-auto w-[210mm] min-h-[297mm] border-[2px] border-black p-0 box-border flex flex-col shadow-xl relative"
                >
                  {/* Header Title */}
                  <div className="flex h-[85px] border-b-[2px] border-black">
                    <div className="flex-1 px-5 flex flex-col justify-center border-r-[2px] border-black">
                      <h1 className="text-3xl font-serif font-black uppercase tracking-wide leading-none">
                        DINUSHA
                      </h1>
                      <h2 className="text-[10px] font-bold uppercase tracking-widest mt-1">
                        Embroidery (Pvt) Ltd • Weliweriya
                      </h2>
                    </div>
                    <div className="w-[140px] flex items-center justify-center p-2">
                      <div className="w-16 h-16 rounded-full border-[2px] border-slate-700 flex items-center justify-center font-serif italic text-lg font-bold">
                        Dinusha
                      </div>
                    </div>
                  </div>

                  {/* Document Title */}
                  <div className="border-b-[2px] border-black text-center py-2 bg-slate-50">
                    <h2 className="text-base font-bold font-serif uppercase tracking-wider">
                      Embellishment Strike Off Submission Sheet
                    </h2>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 border-b-[2px] border-black text-xs">
                    <div className="border-r-[2px] border-black">
                      <div className="flex border-b border-black h-7 items-center">
                        <div className="w-32 pl-2 font-bold border-r border-black h-full flex items-center">
                          Customer
                        </div>
                        <div className="px-3 font-semibold uppercase text-xs truncate">
                          {selectedStyleForSheet.company}
                        </div>
                      </div>
                      <div className="flex border-b border-black h-7 items-center">
                        <div className="w-32 pl-2 font-bold border-r border-black h-full flex items-center">
                          Style No
                        </div>
                        <div className="px-3 font-bold font-mono text-xs">
                          {selectedStyleForSheet.code}
                        </div>
                      </div>
                      <div className="flex border-b border-black h-7 items-center">
                        <div className="w-32 pl-2 font-bold border-r border-black h-full flex items-center">
                          Graphic Name
                        </div>
                        <div className="px-3 font-semibold text-xs truncate">
                          {selectedStyleForSheet.name} — {part.name}
                        </div>
                      </div>
                      <div className="flex border-b border-black h-7 items-center">
                        <div className="w-32 pl-2 font-bold border-r border-black h-full flex items-center">
                          Fabric Color
                        </div>
                        <div className="px-3 font-semibold text-xs">
                          {selectedStyleForSheet.fabric}
                        </div>
                      </div>
                      <div className="flex h-7 items-center">
                        <div className="w-32 pl-2 font-bold border-r border-black h-full flex items-center">
                          Date
                        </div>
                        <div className="px-3 font-mono font-semibold text-xs">
                          {currentDate}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex border-b border-black h-7 items-center">
                        <div className="w-32 pl-2 font-bold border-r border-black h-full flex items-center">
                          Technique
                        </div>
                        <div className="px-3 font-semibold text-xs">Embroidery (Multi-Head)</div>
                      </div>
                      <div className="flex border-b border-black h-7 items-center">
                        <div className="w-32 pl-2 font-bold border-r border-black h-full flex items-center">
                          Target Output
                        </div>
                        <div className="px-3 font-bold text-xs">
                          {selectedStyleForSheet.target} Pcs/Hour
                        </div>
                      </div>
                      <div className="flex border-b border-black h-7 items-center">
                        <div className="w-32 pl-2 font-bold border-r border-black h-full flex items-center">
                          Total Order
                        </div>
                        <div className="px-3 font-mono font-bold text-xs">
                          {selectedStyleForSheet.qty.toLocaleString()} Pcs
                        </div>
                      </div>
                      <div className="flex border-b border-black h-7 items-center">
                        <div className="w-32 pl-2 font-bold border-r border-black h-full flex items-center">
                          Submission No
                        </div>
                        <div className="px-3 font-mono text-xs">SUB-01</div>
                      </div>
                      <div className="flex h-7 items-center">
                        <div className="w-32 pl-2 font-bold border-r border-black h-full flex items-center">
                          Price
                        </div>
                        <div className="px-3 font-mono font-bold text-xs">
                          {selectedStyleForSheet.currency}{' '}
                          {selectedStyleForSheet.price.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex flex-1">
                    {/* Left Swatch Attach Area */}
                    <div className="flex-1 relative bg-white flex flex-col items-center justify-center p-8 border-r-[2px] border-black">
                      <div className="border-2 border-dashed border-slate-300 w-full h-[380px] rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-slate-50/50">
                        <span className="text-slate-300 text-2xl font-bold uppercase tracking-wider select-none">
                          Attach Strike-Off Sample Here
                        </span>
                        <span className="text-slate-400 text-xs mt-2 font-mono">
                          {part.name} (Qty: {part.qty})
                        </span>
                      </div>
                    </div>

                    {/* Right Specifications Column */}
                    <div className="w-[240px] flex flex-col">
                      <div className="text-center p-1.5 border-b border-black text-xs font-bold bg-slate-100">
                        Thread Colours
                      </div>
                      <div className="flex text-xs border-b border-black text-center font-bold">
                        <div className="w-1/2 border-r border-black p-1">Shade No</div>
                        <div className="w-1/2 p-1">Sample</div>
                      </div>

                      {/* 14 Thread Shade Slots */}
                      <div className="flex-col border-b-[2px] border-black bg-white">
                        {Array.from({ length: 14 }).map((_, tIdx) => {
                          const thread = part.threads[tIdx];
                          return (
                            <div
                              key={tIdx}
                              className="flex border-b border-black h-[22px] last:border-b-0"
                            >
                              <div className="w-1/2 border-r border-black px-1.5 text-[10px] font-mono flex items-center font-bold">
                                {thread ? thread.shade : ''}
                              </div>
                              <div className="w-1/2 px-1.5 text-[10px] flex items-center text-slate-700 truncate">
                                {thread ? thread.color : ''}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Backing & Needle Details */}
                      <div className="text-xs bg-white border-b-[2px] border-black">
                        <div className="flex flex-col border-b border-black">
                          <div className="px-2 py-0.5 font-bold border-b border-black bg-slate-50 text-[10px] uppercase text-center">
                            Backing Type
                          </div>
                          <div className="p-2 text-center font-semibold text-[11px]">
                            {part.backing}
                          </div>
                        </div>

                        <div className="flex flex-col border-b border-black">
                          <div className="px-2 py-0.5 font-bold border-b border-black bg-slate-50 text-[10px] uppercase text-center">
                            Needle Size
                          </div>
                          <div className="p-2 text-center font-bold text-[11px]">
                            {part.needle}
                          </div>
                        </div>
                      </div>

                      {/* Sign-off Block */}
                      <div className="p-4 bg-white flex-1 flex flex-col justify-end">
                        <div className="text-xs text-center space-y-4">
                          <span className="font-bold block">Approved By:</span>
                          <div className="border-b border-dotted border-black w-36 mx-auto" />
                          <span className="text-[10px] text-slate-500 block">
                            Factory Quality Manager
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
