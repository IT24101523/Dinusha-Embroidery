"use client";

import React, { useState } from "react";
import { Plus, Trash2, Eye, Edit2, Layers } from "lucide-react";
import { dialog } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { ViewStyleModal, FullStyleData } from "./view-style-modal";

interface StyleCrudProps {
  styles: FullStyleData[];
  companies: Array<{ id: string; name: string }>;
  onRefresh: () => void;
}

const BRANDS = ["Madeira", "Gunold", "Isacord", "Coats", "Marathon", "Simthread", "Generic"];
const BACKINGS = [
  "Tearaway (Standard)", "Tearaway (Heavy)", "Cutaway (Standard)", "Cutaway (Heavy)", "Washaway", "Peel and Stick"
];
const NEEDLES = ["DBxK5 65/9", "DBxK5 70/10", "DBxK5 75/11", "DBxK5 80/12", "DBxK5 90/14"];
const CONES = [2500, 3000, 5000, 10000];
const FABRICS = ["White", "Black", "Navy Blue", "Royal Blue", "Red", "Pink", "Grey", "Charcoal", "Green", "Yellow", "Other"];
const CURRENCIES = ["LKR", "USD", "EUR", "GBP"];

export function StyleCrud({ styles, companies, onRefresh }: StyleCrudProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [company, setCompany] = useState(companies[0]?.name || "Nike Apparel");
  const [name, setName] = useState("");
  const [fabric, setFabric] = useState("White");
  const [target, setTarget] = useState(20);
  const [currency, setCurrency] = useState("LKR");
  const [price, setPrice] = useState(150.00);
  const [qty, setQty] = useState(1000);

  const [parts, setParts] = useState<Array<{
    name: string;
    qty: number;
    backing: string;
    needle: string;
    threads: Array<{
      color: string;
      shade: string;
      brand: string;
      mLen: number;
      cLen: number;
    }>;
  }>>([
    {
      name: "Front Logo",
      qty: 1,
      backing: "Tearaway (Standard)",
      needle: "DBxK5 75/11",
      threads: [{ color: "White", shade: "1001", brand: "Madeira", mLen: 20, cLen: 5000 }],
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingStyle, setViewingStyle] = useState<FullStyleData | null>(null);

  const addPart = () => {
    setParts((prev) => [
      ...prev,
      {
        name: "",
        qty: 1,
        backing: "Tearaway (Standard)",
        needle: "DBxK5 75/11",
        threads: [{ color: "", shade: "", brand: "Madeira", mLen: 0, cLen: 5000 }],
      },
    ]);
  };

  const removePart = (pIdx: number) => {
    setParts((prev) => prev.filter((_, i) => i !== pIdx));
  };

  const addThread = (pIdx: number) => {
    setParts((prev) =>
      prev.map((p, i) =>
        i === pIdx
          ? {
              ...p,
              threads: [...p.threads, { color: "", shade: "", brand: "Madeira", mLen: 0, cLen: 5000 }],
            }
          : p
      )
    );
  };

  const removeThread = (pIdx: number, tIdx: number) => {
    setParts((prev) =>
      prev.map((p, i) =>
        i === pIdx
          ? {
              ...p,
              threads: p.threads.filter((_, ti) => ti !== tIdx),
            }
          : p
      )
    );
  };

  const updatePartField = (pIdx: number, field: string, val: string | number) => {
    setParts((prev) =>
      prev.map((p, i) => (i === pIdx ? { ...p, [field]: val } : p))
    );
  };

  const updateThreadField = (pIdx: number, tIdx: number, field: string, val: string | number) => {
    setParts((prev) =>
      prev.map((p, i) => {
        if (i !== pIdx) return p;
        const newThreads = p.threads.map((t, ti) => (ti === tIdx ? { ...t, [field]: val } : t));
        return { ...p, threads: newThreads };
      })
    );
  };

  const resetForm = () => {
    setEditingId(null);
    setCode("");
    setCompany(companies[0]?.name || "Nike Apparel");
    setName("");
    setFabric("White");
    setTarget(20);
    setCurrency("LKR");
    setPrice(150.00);
    setQty(1000);
    setParts([
      {
        name: "Front Logo",
        qty: 1,
        backing: "Tearaway (Standard)",
        needle: "DBxK5 75/11",
        threads: [{ color: "White", shade: "1001", brand: "Madeira", mLen: 20, cLen: 5000 }],
      },
    ]);
  };

  const handleEditClick = (st: FullStyleData) => {
    setEditingId(st.id);
    setCode(st.code);
    setCompany(st.company);
    setName(st.name);
    setFabric(st.fabric || "White");
    setTarget(st.target || 20);
    setCurrency(st.currency || "LKR");
    setPrice(st.price || 0);
    setQty(st.qty || 1000);
    setParts(
      st.parts.map((p) => ({
        name: p.name,
        qty: p.qty,
        backing: p.backing,
        needle: p.needle,
        threads: p.threads.map((t) => ({
          color: t.color,
          shade: t.shade,
          brand: t.brand,
          mLen: t.mLen,
          cLen: t.cLen,
        })),
      }))
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = async (st: FullStyleData) => {
    const confirmed = await dialog.confirm({
      title: "Delete Style Master",
      message: `Are you sure you want to delete style '${st.name}' (${st.code}) and all its associated parts and thread matrices?`,
      confirmText: "Delete Master",
      variant: "danger",
    });

    if (confirmed) {
      try {
        const res = await fetch(`/api/master-data/styles/${st.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
        dialog.toast("Style removed successfully", "info", "Deleted");
        onRefresh();
      } catch {
        dialog.toast("Failed to delete style", "danger", "Error");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parts.length === 0) {
      dialog.toast("Add at least one garment part.", "warning", "Validation Error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        code,
        company,
        name,
        fabric,
        target,
        currency,
        price,
        qty,
        parts,
      };

      const url = editingId ? `/api/master-data/styles/${editingId}` : "/api/master-data/styles";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        dialog.toast(data.error || "Failed to save style", "danger", "Error");
        return;
      }

      dialog.toast(
        editingId ? "Style specification updated" : "Master style created successfully",
        "success",
        "Saved"
      );
      resetForm();
      onRefresh();
    } catch {
      dialog.toast("Failed to communicate with database", "danger", "Network Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Register / Edit Style Hierarchy Form */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-extrabold mb-5 text-sm uppercase text-slate-500 flex items-center gap-2">
          <Layers className="w-4 h-4 text-persian-500" />
          {editingId ? "Edit Style Hierarchy" : "Register Style Hierarchy"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Style Code *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ST-102"
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold outline-none focus:border-persian-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Client / Company *</label>
              <select
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold outline-none focus:border-persian-500"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Style Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Track Jacket Logo"
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold outline-none focus:border-persian-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Fabric Color *</label>
              <select
                value={fabric}
                onChange={(e) => setFabric(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold outline-none focus:border-persian-500"
              >
                {FABRICS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target / Hour *</label>
              <input
                type="number"
                min="1"
                required
                value={target}
                onChange={(e) => setTarget(parseInt(e.target.value) || 20)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold outline-none focus:border-persian-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Currency *</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-persian-500"
              >
                {CURRENCIES.map((cur) => (
                  <option key={cur} value={cur}>
                    {cur}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-800 mb-1">Garment Price *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full p-2 bg-white border border-emerald-300 rounded-lg text-sm font-black text-emerald-700 outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Total Order Qty *</label>
              <input
                type="number"
                min="1"
                required
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value) || 1000)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-persian-800 outline-none focus:border-persian-500 border-l-4 border-l-persian-500"
              />
            </div>
          </div>

          {/* Parts Builder */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-bold text-slate-700">Style Parts & Thread Matrices</h4>
              <button
                type="button"
                onClick={addPart}
                className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Garment Part
              </button>
            </div>

            <div className="space-y-4">
              {parts.map((part, pIdx) => (
                <div key={pIdx} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div className="bg-slate-100 p-3 border-b border-slate-200 flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Part Location</label>
                      <input
                        type="text"
                        required
                        value={part.name}
                        onChange={(e) => updatePartField(pIdx, "name", e.target.value)}
                        placeholder="e.g. Front Logo"
                        className="w-full p-1.5 border border-slate-300 rounded text-sm font-bold bg-white outline-none"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Part Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={part.qty}
                        onChange={(e) => updatePartField(pIdx, "qty", parseFloat(e.target.value) || 1)}
                        className="w-full p-1.5 border border-slate-300 rounded text-sm font-bold text-persian-700 bg-persian-50 outline-none"
                      />
                    </div>
                    <div className="w-48">
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Backing Required</label>
                      <select
                        value={part.backing}
                        onChange={(e) => updatePartField(pIdx, "backing", e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-xs font-semibold bg-white outline-none"
                      >
                        {BACKINGS.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-36">
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Needle Spec</label>
                      <select
                        value={part.needle}
                        onChange={(e) => updatePartField(pIdx, "needle", e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-xs font-semibold bg-white outline-none"
                      >
                        {NEEDLES.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePart(pIdx)}
                      className="bg-rose-100 text-rose-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-rose-200 mb-[2px] transition-colors"
                      title="Remove Part"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Threads table */}
                  <div className="overflow-x-auto p-3">
                    <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
                      <thead className="text-slate-500 text-[10px] uppercase font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2 w-1/6">Thread Color</th>
                          <th className="p-2 w-1/6">Shade #</th>
                          <th className="p-2 w-1/6">Brand</th>
                          <th className="p-2 bg-blue-50/50 w-24">Mach. Len(m)</th>
                          <th className="p-2 bg-blue-50/50 w-24">Cone Size(m)</th>
                          <th className="p-2 text-center bg-persian-50 w-24 font-bold text-persian-800">Req. Cones</th>
                          <th className="p-2 w-10 text-center">Del</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {part.threads.map((thread, tIdx) => {
                          const reqCones = (((thread.mLen * 1.5) * part.qty * qty) / thread.cLen).toFixed(2);

                          return (
                            <tr key={tIdx} className="hover:bg-slate-50">
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  required
                                  value={thread.color}
                                  onChange={(e) => updateThreadField(pIdx, tIdx, "color", e.target.value)}
                                  placeholder="Color"
                                  className="w-full p-1.5 border border-slate-200 rounded text-xs outline-none"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  required
                                  value={thread.shade}
                                  onChange={(e) => updateThreadField(pIdx, tIdx, "shade", e.target.value)}
                                  placeholder="Shade #"
                                  className="w-full p-1.5 border border-slate-200 rounded text-xs font-mono outline-none"
                                />
                              </td>
                              <td className="p-1.5">
                                <select
                                  value={thread.brand}
                                  onChange={(e) => updateThreadField(pIdx, tIdx, "brand", e.target.value)}
                                  className="w-full p-1.5 border border-slate-200 rounded text-xs bg-white outline-none"
                                >
                                  {BRANDS.map((br) => (
                                    <option key={br} value={br}>{br}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-1.5 bg-blue-50 border-l border-slate-200">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={thread.mLen}
                                  onChange={(e) => updateThreadField(pIdx, tIdx, "mLen", parseFloat(e.target.value) || 0)}
                                  className="w-full p-1.5 border border-blue-300 rounded text-xs font-bold text-blue-800 outline-none"
                                />
                              </td>
                              <td className="p-1.5 bg-blue-50">
                                <select
                                  value={thread.cLen}
                                  onChange={(e) => updateThreadField(pIdx, tIdx, "cLen", parseFloat(e.target.value) || 5000)}
                                  className="w-full p-1.5 border border-blue-300 rounded text-xs font-bold text-blue-800 bg-white outline-none"
                                >
                                  {CONES.map((cn) => (
                                    <option key={cn} value={cn}>{cn}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-1.5 bg-persian-50 text-center font-black text-persian-800 text-sm border-x border-slate-200">
                                {reqCones}
                              </td>
                              <td className="p-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeThread(pIdx, tIdx)}
                                  className="text-rose-400 hover:text-rose-600 p-1"
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
                      <Plus className="w-3.5 h-3.5" /> Add Thread
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-slate-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-persian-900 text-white font-bold px-8 py-3 rounded-xl text-sm hover:bg-persian-800 shadow-md transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : editingId ? "Update Master Style" : "Save Master Style"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="bg-slate-200 text-slate-700 font-bold px-8 py-3 rounded-xl text-sm hover:bg-slate-300 transition-colors"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 2. Style Master Directory Table */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-extrabold mb-5 text-sm uppercase text-slate-500">
          Style Master Directory ({styles.length} Styles)
        </h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-4">Code</th>
                <th className="p-4">Company</th>
                <th className="p-4">Style Name</th>
                <th className="p-4">Fabric</th>
                <th className="p-4">Garment Price</th>
                <th className="p-4">Composition</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {styles.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="p-4 font-mono font-bold text-persian-800">{s.code}</td>
                  <td className="p-4 font-semibold text-slate-700">{s.company}</td>
                  <td className="p-4 font-extrabold text-slate-900">{s.name}</td>
                  <td className="p-4">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-semibold text-slate-700">
                      {s.fabric}
                    </span>
                  </td>
                  <td className="p-4 font-black text-emerald-700">
                    {formatCurrency(s.price, s.currency)}
                  </td>
                  <td className="p-4 text-xs text-slate-500">
                    {s.parts.length} Parts ({s.parts.reduce((acc, p) => acc + p.threads.length, 0)} Threads)
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* STRICT Rule 6: View modal opened from main action button */}
                      <button
                        type="button"
                        onClick={() => setViewingStyle(s)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-persian-700 hover:bg-blue-100 text-xs font-bold transition-colors flex items-center gap-1"
                        title="View read-only specification"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>

                      {/* Editing triggered from main action button */}
                      <button
                        type="button"
                        onClick={() => handleEditClick(s)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-bold transition-colors flex items-center gap-1"
                        title="Edit master style"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteClick(s)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-colors flex items-center gap-1"
                        title="Delete master style"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Read-Only View Modal (Strict Rule 6) */}
      <ViewStyleModal
        style={viewingStyle}
        isOpen={!!viewingStyle}
        onClose={() => setViewingStyle(null)}
      />
    </div>
  );
}
