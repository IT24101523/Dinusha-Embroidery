"use client";

import React, { useState } from "react";
import { Cpu, Edit2, Trash2 } from "lucide-react";
import { dialog } from "@/components/ui/dialog";

interface MachineItem {
  id: string;
  name: string;
  machine_number: number;
  heads: number;
  speed_spm: number;
  brand: string;
  embroidery_types: string[];
  status: string;
}

interface MachineCrudProps {
  machines: MachineItem[];
  onRefresh: () => void;
}

const EMBROIDERY_TYPES = ["Normal", "Chenille", "Sequence"];

export function MachineCrud({ machines, onRefresh }: MachineCrudProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [heads, setHeads] = useState(15);
  const [speedSpm, setSpeedSpm] = useState(1000);
  const [brand, setBrand] = useState("Tajima");
  const [types, setTypes] = useState<string[]>(["Normal"]);
  const [status, setStatus] = useState("Active");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setHeads(15);
    setSpeedSpm(1000);
    setBrand("Tajima");
    setTypes(["Normal"]);
    setStatus("Active");
  };

  const handleEditClick = (m: MachineItem) => {
    setEditingId(m.id);
    setName(m.name);
    setHeads(m.heads);
    setSpeedSpm(m.speed_spm);
    setBrand(m.brand);
    setTypes(Array.isArray(m.embroidery_types) ? m.embroidery_types : ["Normal"]);
    setStatus(m.status === "MAINTENANCE" ? "Maintenance" : "Active");
  };

  const handleTypeToggle = (type: string) => {
    if (types.includes(type)) {
      if (types.length === 1) {
        dialog.toast("Select at least one embroidery type", "warning", "Validation");
        return;
      }
      setTypes(types.filter((t) => t !== type));
    } else {
      setTypes([...types, type]);
    }
  };

  const handleDeleteClick = async (m: MachineItem) => {
    const confirmed = await dialog.confirm({
      title: "Delete Machine",
      message: `Are you sure you want to delete ${m.name} from the active factory inventory?`,
      confirmText: "Delete Machine",
      variant: "danger",
    });

    if (confirmed) {
      try {
        const res = await fetch(`/api/master-data/machines/${m.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete machine");
        dialog.toast("Machine removed from inventory", "info", "Deleted");
        onRefresh();
      } catch {
        dialog.toast("Failed to delete machine", "danger", "Error");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (types.length === 0) {
      dialog.toast("Select at least one embroidery type", "warning", "Validation");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingId ? `/api/master-data/machines/${editingId}` : "/api/master-data/machines";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          heads,
          speedSpm,
          brand,
          types,
          status: status === "Maintenance" ? "MAINTENANCE" : "RUNNING",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        dialog.toast(data.error || "Failed to save machine", "danger", "Error");
        return;
      }

      dialog.toast(
        editingId ? "Machine configuration updated" : "New machine registered into inventory",
        "success",
        "Saved"
      );
      resetForm();
      onRefresh();
    } catch {
      dialog.toast("Error communicating with server", "danger", "Network Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Form */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1 h-fit">
        <h3 className="font-extrabold mb-5 text-sm uppercase text-slate-500 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-persian-600" />
          {editingId ? "EDIT MACHINE" : "REGISTER MACHINE"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Machine Identifier / Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Machine 14"
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:border-persian-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Head Count *</label>
              <input
                type="number"
                min="1"
                required
                value={heads}
                onChange={(e) => setHeads(parseInt(e.target.value) || 1)}
                placeholder="15"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:border-persian-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Speed (SPM) *</label>
              <input
                type="number"
                min="100"
                required
                value={speedSpm}
                onChange={(e) => setSpeedSpm(parseInt(e.target.value) || 1000)}
                placeholder="1000"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:border-persian-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Brand *</label>
            <input
              type="text"
              required
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Tajima"
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:border-persian-500 outline-none"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <label className="block text-xs font-bold text-slate-700 mb-2.5">
              Supported Embroidery Types *
            </label>
            <div className="flex flex-wrap gap-4">
              {EMBROIDERY_TYPES.map((t) => (
                <label
                  key={t}
                  className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer hover:text-persian-600 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={types.includes(t)}
                    onChange={() => handleTypeToggle(t)}
                    className="w-4 h-4 text-persian-600 rounded"
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Operational Status *</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:border-persian-500 outline-none cursor-pointer"
            >
              <option value="Active">Active (Running)</option>
              <option value="Maintenance">Maintenance (Idle)</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-persian-900 text-white font-bold p-3 rounded-lg text-sm hover:bg-persian-800 shadow-md transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : editingId ? "Update Machine" : "Save Machine"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="bg-slate-200 text-slate-700 font-bold px-4 py-3 rounded-lg text-sm hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Right Table */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
        <h3 className="font-extrabold mb-5 text-sm uppercase text-slate-500">
          REGISTERED MACHINE INVENTORY ({machines.length} Units)
        </h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-4">MACHINE NAME</th>
                <th className="p-4">BRAND</th>
                <th className="p-4">HEADS</th>
                <th className="p-4">SPEED</th>
                <th className="p-4">CAPABILITIES</th>
                <th className="p-4">STATUS</th>
                <th className="p-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {machines.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="p-4 font-black text-slate-900">{m.name}</td>
                  <td className="p-4 font-semibold text-slate-700">{m.brand}</td>
                  <td className="p-4 font-bold text-persian-800">{m.heads} Heads</td>
                  <td className="p-4 font-mono text-slate-600">{m.speed_spm} SPM</td>
                  <td className="p-4">
                    <div className="flex gap-1 flex-wrap">
                      {(m.embroidery_types || []).map((t) => (
                        <span key={t} className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded font-semibold">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    {m.status === "RUNNING" || m.status === "Active" ? (
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded border border-emerald-200">
                        Active
                      </span>
                    ) : m.status === "SETUP" ? (
                      <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded border border-amber-200">
                        Setup
                      </span>
                    ) : (
                      <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2 py-0.5 rounded border border-rose-200">
                        Maintenance
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditClick(m)}
                        className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-bold transition-colors"
                        title="Edit machine"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(m)}
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-colors"
                        title="Delete machine"
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
    </div>
  );
}
