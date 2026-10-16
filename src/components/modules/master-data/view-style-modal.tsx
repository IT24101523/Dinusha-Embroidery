"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { Shirt, Eye } from "lucide-react";
import { formatNumber, formatCurrency } from "@/lib/utils";

export interface FullStyleData {
  id: string;
  code: string;
  company: string;
  name: string;
  fabric: string;
  target: number;
  currency: string;
  price: number;
  qty: number;
  parts: Array<{
    id?: string;
    name: string;
    qty: number;
    backing: string;
    needle: string;
    threads: Array<{
      id?: string;
      color: string;
      shade: string;
      brand: string;
      mLen: number;
      cLen: number;
      reqCones: number;
    }>;
  }>;
}

interface ViewStyleModalProps {
  style: FullStyleData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ViewStyleModal({ style, isOpen, onClose }: ViewStyleModalProps) {
  if (!style) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Style Specification: ${style.code}`}
      subtitle={`${style.company} — ${style.name}`}
      icon={<Shirt className="w-5 h-5 text-persian-600" />}
      maxWidth="4xl"
      footer={
        <div className="flex justify-end w-full">
          {/* STRICT Rule 6: View modals are read-only. NEVER place an Edit button inside a View modal */}
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-sm transition-all"
          >
            Close View
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Style Summary Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Style Code</span>
            <span className="font-extrabold text-persian-900 text-sm">{style.code}</span>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Client / Buyer</span>
            <span className="font-bold text-slate-800">{style.company}</span>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Fabric Color</span>
            <span className="font-bold text-slate-800">{style.fabric}</span>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Target / Hour</span>
            <span className="font-bold text-slate-800">{style.target} Pcs/hr</span>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Garment Price</span>
            <span className="font-extrabold text-emerald-700 text-sm">
              {formatCurrency(style.price, style.currency)}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Total Order Qty</span>
            <span className="font-black text-persian-800 text-sm">
              {formatNumber(style.qty)} Pcs
            </span>
          </div>
        </div>

        {/* Garment Parts and Thread Matrices */}
        <div className="space-y-4">
          <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-persian-600" />
            Registered Garment Parts & Thread Consumption
          </h4>

          {style.parts.map((part, pIdx) => (
            <div key={pIdx} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="bg-slate-100 p-3 border-b border-slate-200 flex flex-wrap gap-4 text-xs font-semibold">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 mr-1.5">Part:</span>
                  <strong className="text-slate-800 font-extrabold">{part.name}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 mr-1.5">Qty / Garment:</span>
                  <span className="bg-persian-50 text-persian-800 px-2 py-0.5 rounded font-bold">{part.qty}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 mr-1.5">Backing:</span>
                  <span className="text-slate-700">{part.backing}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 mr-1.5">Needle Spec:</span>
                  <span className="text-slate-700 font-mono">{part.needle}</span>
                </div>
              </div>

              <div className="overflow-x-auto p-3">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="text-slate-500 text-[10px] uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2">Thread Color</th>
                      <th className="p-2">Shade #</th>
                      <th className="p-2">Brand</th>
                      <th className="p-2 bg-blue-50/50">Machine Length</th>
                      <th className="p-2 bg-blue-50/50">Cone Size</th>
                      <th className="p-2 text-center bg-persian-50 font-black text-persian-800">Req. Cones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {part.threads.map((t, tIdx) => (
                      <tr key={tIdx} className="hover:bg-slate-50">
                        <td className="p-2 font-bold text-slate-800">{t.color}</td>
                        <td className="p-2 font-mono text-slate-600">{t.shade}</td>
                        <td className="p-2 text-slate-600">{t.brand}</td>
                        <td className="p-2 bg-blue-50/30 text-blue-800 font-semibold">{t.mLen} m</td>
                        <td className="p-2 bg-blue-50/30 text-blue-800 font-semibold">{t.cLen} m</td>
                        <td className="p-2 text-center bg-persian-50 font-black text-persian-800">
                          {t.reqCones.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
