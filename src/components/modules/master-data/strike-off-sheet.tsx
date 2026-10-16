"use client";

import React, { useState } from "react";
import { Printer, ArrowLeft } from "lucide-react";
import { FullStyleData } from "./view-style-modal";
import { formatNumber } from "@/lib/utils";

interface StrikeOffSheetProps {
  styles: FullStyleData[];
  onBack: () => void;
}

export function StrikeOffSheet({ styles, onBack }: StrikeOffSheetProps) {
  const [selectedStyleId, setSelectedStyleId] = useState<string>(styles[0]?.id || "");

  const activeStyle = styles.find((s) => s.id === selectedStyleId) || styles[0];

  const handlePrint = () => {
    window.print();
  };

  if (!activeStyle) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-sm font-bold text-slate-500">No styles registered yet to generate strike-off sheets.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-persian-800 text-white rounded-xl text-xs font-bold"
        >
          Back to Styles
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Control Bar (Hidden during printing) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 no-print shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div>
            <h3 className="text-sm font-extrabold text-persian-800 uppercase">
              Strike-Off Submission Sheet Preview
            </h3>
            <p className="text-[11px] text-slate-400">Standard A4 Factory Approval Document</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedStyleId}
            onChange={(e) => setSelectedStyleId(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
          >
            {styles.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name} ({s.company})
              </option>
            ))}
          </select>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-4 h-4" /> Print Strike-Off
          </button>
        </div>
      </div>

      {/* Printable Area */}
      <div id="strikeOffPrintArea" className="space-y-8">
        {activeStyle.parts.map((part, pIdx) => (
          <div
            key={pIdx}
            className="print-page bg-white p-8 rounded-2xl border-2 border-slate-900 max-w-4xl mx-auto shadow-sm text-slate-900"
          >
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-4 text-center">
              <h1 className="text-2xl font-black uppercase tracking-wider">
                DINUSHA EMBROIDERY (PVT) LTD
              </h1>
              <p className="text-xs uppercase tracking-widest font-bold text-slate-600 mt-0.5">
                Weliweriya Industrial Zone, Sri Lanka • Tel: +94 33 225 1234
              </p>
              <div className="inline-block mt-2 px-4 py-1 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded">
                EMBROIDERY STRIKE-OFF SUBMISSION SHEET
              </div>
            </div>

            {/* Meta Table */}
            <div className="grid grid-cols-2 gap-4 my-6 text-xs font-medium">
              <div className="space-y-1.5 border p-3 rounded-lg border-slate-300 bg-slate-50/50">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500 uppercase">Buyer / Company:</span>
                  <span className="font-black text-slate-900">{activeStyle.company}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500 uppercase">Style Code:</span>
                  <span className="font-black text-persian-800">{activeStyle.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500 uppercase">Style Name:</span>
                  <span className="font-extrabold text-slate-900">{activeStyle.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500 uppercase">Order Quantity:</span>
                  <span className="font-bold text-slate-900">{formatNumber(activeStyle.qty)} Pcs</span>
                </div>
              </div>

              <div className="space-y-1.5 border p-3 rounded-lg border-slate-300 bg-slate-50/50">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500 uppercase">Garment Part:</span>
                  <span className="font-black text-slate-900">{part.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500 uppercase">Part Qty / Piece:</span>
                  <span className="font-bold text-slate-900">{part.qty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500 uppercase">Fabric Color:</span>
                  <span className="font-bold text-slate-900">{activeStyle.fabric}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500 uppercase">Backing & Needle:</span>
                  <span className="font-bold text-slate-900">{part.backing} • {part.needle}</span>
                </div>
              </div>
            </div>

            {/* Thread Matrix Table */}
            <div className="mb-6">
              <h4 className="text-xs font-black uppercase tracking-wider mb-2 text-slate-800 border-b border-slate-300 pb-1">
                Approved Thread Matrix & Sequence
              </h4>
              <table className="w-full text-left text-xs border border-slate-300">
                <thead className="bg-slate-100 text-slate-700 uppercase font-black border-b border-slate-300">
                  <tr>
                    <th className="p-2 border-r border-slate-300 w-12 text-center">#</th>
                    <th className="p-2 border-r border-slate-300">Thread Color</th>
                    <th className="p-2 border-r border-slate-300">Shade Code</th>
                    <th className="p-2 border-r border-slate-300">Brand</th>
                    <th className="p-2 border-r border-slate-300 text-right">Mach. Len (m)</th>
                    <th className="p-2 border-r border-slate-300 text-right">Cone Size (m)</th>
                    <th className="p-2 text-right">Req. Cones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {part.threads.map((t, idx) => (
                    <tr key={idx}>
                      <td className="p-2 text-center font-bold border-r border-slate-200">{idx + 1}</td>
                      <td className="p-2 font-bold border-r border-slate-200">{t.color}</td>
                      <td className="p-2 font-mono border-r border-slate-200">{t.shade}</td>
                      <td className="p-2 border-r border-slate-200">{t.brand}</td>
                      <td className="p-2 text-right font-medium border-r border-slate-200">{t.mLen} m</td>
                      <td className="p-2 text-right font-medium border-r border-slate-200">{t.cLen} m</td>
                      <td className="p-2 text-right font-black">{t.reqCones.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Physical Swatch Box */}
            <div className="border-2 border-dashed border-slate-400 rounded-xl p-8 mb-6 text-center bg-slate-50/50">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                [ Affix Physical Strike-Off Sample Swatch Here ]
              </p>
            </div>

            {/* Sign-off Boxes */}
            <div className="grid grid-cols-4 gap-3 text-center text-[10px] font-bold uppercase pt-3 border-t border-slate-300">
              <div className="border border-slate-300 p-3 rounded-lg flex flex-col justify-between h-24">
                <span>Production Manager</span>
                <span className="border-t border-slate-300 pt-1 text-slate-400">Signature & Date</span>
              </div>
              <div className="border border-slate-300 p-3 rounded-lg flex flex-col justify-between h-24">
                <span>Quality In-Charge</span>
                <span className="border-t border-slate-300 pt-1 text-slate-400">Signature & Date</span>
              </div>
              <div className="border border-slate-300 p-3 rounded-lg flex flex-col justify-between h-24">
                <span>Factory Manager</span>
                <span className="border-t border-slate-300 pt-1 text-slate-400">Approved</span>
              </div>
              <div className="border border-slate-300 p-3 rounded-lg flex flex-col justify-between h-24 bg-slate-50">
                <span>Buyer Representative</span>
                <span className="border-t border-slate-300 pt-1 text-slate-400">Accepted / Rejected</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
