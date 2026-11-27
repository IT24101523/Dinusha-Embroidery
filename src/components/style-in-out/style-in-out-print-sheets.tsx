'use client';

import React, { useState } from 'react';
import {
  StyleBundleEntity,
  StyleDespatchEntity,
} from '@/actions/style-in-out';
import { Printer, X, FileText, ShieldCheck, ClipboardCheck, BarChart3 } from 'lucide-react';

export type PrintDocKind =
  | 'despatchNote'
  | 'gatePass'
  | 'bundleCheckList'
  | 'reconciliationSummary';

export interface StyleReconciliationSummaryData {
  styleCode: string;
  styleName: string;
  companyName: string;
  generatedDate: string;
  orderQty: number;
  totalInQty: number;
  totalOutQty: number;
  totalInHouseQty: number;
  totalReadyQty: number;
  totalEd: number;
  totalMd: number;
  sizeRows: Array<{
    size: string;
    orderQty: number;
    inQty: number;
    variance: number; // positive = EXTRA, negative = SHORT/PENDING
    outQty: number;
    edQty: number;
    mdQty: number;
    inHouseBalance: number;
  }>;
  partRows: Array<{
    partName: string;
    orderQty: number;
    inQty: number;
    variance: number;
    outQty: number;
    inHouseBalance: number;
  }>;
  inBatches: Array<{
    batchNo: string;
    receivedDate: string;
    cutNo: string;
    partsNote: string;
    bundleCount: number;
    totalQty: number;
    remarks: string;
  }>;
  outDespatches: Array<{
    despatchNo: string;
    gatepassNo: string;
    despatchDate: string;
    toPerson: string;
    bundleCount: number;
    totalQty: number;
    totalEd: number;
    totalMd: number;
    remarks: string;
  }>;
}

export interface StyleInOutPrintPayload {
  initialDoc: PrintDocKind;
  despatch?: StyleDespatchEntity | null;
  bundles: StyleBundleEntity[];
  summaryData?: StyleReconciliationSummaryData | null;
  checklistMeta?: {
    serialNo: string;
    date: string;
    plant: string;
    styleLabel: string;
    mdStatus: 'PASS' | 'FAIL' | 'PENDING';
    checkedBy: string;
    authorizedBy: string;
    directionLabel?: string;
  };
}

interface StyleInOutPrintModalProps {
  payload: StyleInOutPrintPayload | null;
  onClose: () => void;
}

export function StyleInOutPrintModal({ payload, onClose }: StyleInOutPrintModalProps) {
  const [activeDoc, setActiveDoc] = useState<PrintDocKind>(
    payload?.initialDoc || 'despatchNote'
  );

  React.useEffect(() => {
    if (payload?.initialDoc) {
      setActiveDoc(payload.initialDoc);
    }
  }, [payload]);

  if (!payload) return null;

  const { despatch, bundles, checklistMeta, summaryData } = payload;
  const hasDespatch = Boolean(despatch);
  const hasSummary = Boolean(summaryData);

  // Totals
  const totalTagQty = bundles.reduce((sum, b) => sum + b.tagQty, 0);
  const totalGoodQty = bundles.reduce((sum, b) => sum + (b.goodQty || b.tagQty), 0);
  const totalEd = bundles.reduce((sum, b) => sum + b.edQty, 0);
  const totalMd = bundles.reduce((sum, b) => sum + b.mdQty, 0);

  const uniqueStyles = Array.from(
    new Set(
      bundles.map((b) => (b.styleCode ? `${b.styleCode} - ${b.styleName}` : b.styleName)).filter(Boolean)
    )
  );

  const effectiveChecklist = checklistMeta || {
    serialNo: despatch?.checklistNo || despatch?.despatchNo || '001',
    date: despatch?.despatchDate || bundles[0]?.receivedDate || new Date().toISOString().split('T')[0],
    plant: despatch?.companyName || bundles[0]?.companyName || '',
    styleLabel: uniqueStyles.join(', '),
    mdStatus: despatch?.mdStatus || (bundles.some((b) => b.mdStatus === 'FAIL') ? 'FAIL' : bundles.some((b) => b.mdStatus === 'PASS') ? 'PASS' : 'PENDING'),
    checkedBy: despatch?.checkedBy || bundles[0]?.checkedBy || '',
    authorizedBy: despatch?.authorizedBy || '',
    directionLabel: hasDespatch ? 'OUTGOING DESPATCH' : 'INCOMING / QC CHECK',
  };

  // Pad rows to look like an official printed book sheet (at least 14 rows)
  const minRows = 14;
  const emptyRowCount = Math.max(0, minRows - bundles.length);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-start overflow-y-auto p-4 sm:p-6 print:static print:inset-auto print:z-auto print:bg-white print:p-0 print:block"
      role="dialog"
      aria-modal="true"
      aria-label="Print Factory Document"
    >
      {/* Top Action Toolbar (Hidden when printing) */}
      <div className="w-full max-w-[900px] bg-slate-900 text-white rounded-2xl px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-xl border border-slate-700 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          {hasDespatch && (
            <>
              <button
                type="button"
                onClick={() => setActiveDoc('despatchNote')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition cursor-pointer ${
                  activeDoc === 'despatchNote'
                    ? 'bg-persian-500 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Despatch Note
              </button>
              <button
                type="button"
                onClick={() => setActiveDoc('gatePass')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition cursor-pointer ${
                  activeDoc === 'gatePass'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Factory Gate Pass
              </button>
            </>
          )}
          {hasSummary && (
            <button
              type="button"
              onClick={() => setActiveDoc('reconciliationSummary')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition cursor-pointer ${
                activeDoc === 'reconciliationSummary'
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              In / Out Summary
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveDoc('bundleCheckList')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition cursor-pointer ${
              activeDoc === 'bundleCheckList'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            Bundle Check List (Yellow Sheet)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-1.5 rounded-xl bg-white text-slate-950 hover:bg-slate-100 text-xs font-black inline-flex items-center gap-1.5 cursor-pointer transition shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print Document
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white transition cursor-pointer"
            aria-label="Close print preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* DOCUMENT 1: OFFICIAL DESPATCH NOTE (Matches Physical Book Layout) */}
      {/* ================================================================= */}
      {activeDoc === 'despatchNote' && despatch && (
        <div className="w-full max-w-[900px] bg-white text-black rounded-xl shadow-2xl border border-slate-300 p-6 sm:p-8 print:shadow-none print:border-none print:rounded-none print:max-w-none print:p-4">
          {/* Header */}
          <div className="relative text-center border-b-2 border-black pb-3">
            <div className="absolute right-0 top-0 text-right">
              <div className="text-[10px] font-bold uppercase text-slate-600">Despatch No.</div>
              <div className="text-xl font-black font-mono tracking-wider text-rose-700 print:text-black">
                {despatch.despatchNo}
              </div>
              <div className="text-[10px] font-mono font-bold text-slate-700 mt-0.5">
                GP: {despatch.gatepassNo}
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-wide uppercase">
              DINUSHA EMBROIDERY
            </h1>
            <p className="text-xs font-bold tracking-wide mt-0.5">
              No. 177/5, NEW KANDY ROAD, WELIVERIYA WEST, WELIVERIYA
            </p>
            <p className="text-xs font-semibold">
              Tel: 0760 958 645 / 033 2256157 &nbsp;|&nbsp; E-MAIL : dinushaemb@gmail.com
            </p>
            <div className="mt-2 inline-block px-5 py-0.5 border-2 border-black text-base font-black tracking-widest uppercase">
              DESPATCH NOTE
            </div>
          </div>

          {/* TO & Date Row */}
          <div className="grid grid-cols-12 gap-3 py-3 text-sm">
            <div className="col-span-8 flex items-baseline gap-2">
              <span className="font-black uppercase shrink-0">TO:</span>
              <span className="flex-1 border-b border-dotted border-black font-bold px-2">
                {despatch.toPerson
                  ? `${despatch.toPerson} — ${despatch.companyName}`
                  : despatch.companyName}
              </span>
            </div>
            <div className="col-span-4 flex items-baseline gap-2">
              <span className="font-black shrink-0">Date:</span>
              <span className="flex-1 border-b border-dotted border-black font-mono font-bold px-2 text-center">
                {despatch.despatchDate}
              </span>
            </div>
          </div>

          {/* Despatch Table */}
          <table className="w-full border-collapse border-2 border-black text-xs">
            <thead>
              <tr className="bg-slate-100 print:bg-slate-100">
                <th rowSpan={2} className="border border-black px-2 py-1.5 font-black text-center w-[18%]">
                  Style No.
                </th>
                <th colSpan={3} className="border border-black px-2 py-1 font-black text-center">
                  Description
                </th>
                <th rowSpan={2} className="border border-black px-2 py-1.5 font-black text-center w-[11%]">
                  Qty.
                </th>
                <th colSpan={2} className="border border-black px-2 py-1 font-black text-center w-[14%]">
                  Damage
                </th>
                <th rowSpan={2} className="border border-black px-2 py-1.5 font-black text-center w-[20%]">
                  Remarks
                </th>
              </tr>
              <tr className="bg-slate-50">
                <th className="border border-black px-2 py-1 font-bold text-center w-[10%]">
                  Job / Cut No.
                </th>
                <th className="border border-black px-2 py-1 font-bold text-center w-[13%]">
                  Bun. No
                </th>
                <th className="border border-black px-2 py-1 font-bold text-center w-[14%]">
                  Size
                </th>
                <th className="border border-black px-1.5 py-1 font-bold text-center">E.D</th>
                <th className="border border-black px-1.5 py-1 font-bold text-center">M.D</th>
              </tr>
            </thead>
            <tbody>
              {bundles.map((b, idx) => {
                const prev = idx > 0 ? bundles[idx - 1] : null;
                const styleDisplay = b.styleCode
                  ? `${b.styleCode} ${b.styleName}`.trim()
                  : b.styleName;
                const prevStyleDisplay = prev
                  ? prev.styleCode
                    ? `${prev.styleCode} ${prev.styleName}`.trim()
                    : prev.styleName
                  : '';
                const showStyle = idx === 0 || styleDisplay !== prevStyleDisplay;

                return (
                  <tr key={b.id} className="h-7">
                    <td className="border border-black px-2 py-1 font-bold text-center">
                      {showStyle ? styleDisplay : ''}
                      {b.partName && (
                        <div className="text-[9.5px] font-semibold text-slate-700 print:text-black">
                          [{b.partName}]
                        </div>
                      )}
                    </td>
                    <td className="border border-black px-2 py-1 font-mono font-bold text-center">
                      {b.jobNo || b.cutNo || '-'}
                    </td>
                    <td className="border border-black px-2 py-1 font-mono font-bold text-center">
                      {b.bundleNo}
                    </td>
                    <td className="border border-black px-2 py-1 font-mono font-bold text-center">
                      {b.size}
                    </td>
                    <td className="border border-black px-2 py-1 font-mono font-black text-center">
                      {b.goodQty || b.tagQty}
                    </td>
                    <td className="border border-black px-1.5 py-1 font-mono text-center">
                      {b.edQty > 0 ? b.edQty : ''}
                    </td>
                    <td className="border border-black px-1.5 py-1 font-mono text-center">
                      {b.mdQty > 0 ? b.mdQty : ''}
                    </td>
                    <td className="border border-black px-2 py-1 text-[11px]">
                      {b.remarks}
                    </td>
                  </tr>
                );
              })}

              {Array.from({ length: emptyRowCount }).map((_, idx) => (
                <tr key={`empty-dn-${idx}`} className="h-7">
                  <td className="border border-black px-2 py-1">&nbsp;</td>
                  <td className="border border-black px-2 py-1">&nbsp;</td>
                  <td className="border border-black px-2 py-1">&nbsp;</td>
                  <td className="border border-black px-2 py-1">&nbsp;</td>
                  <td className="border border-black px-2 py-1">&nbsp;</td>
                  <td className="border border-black px-2 py-1">&nbsp;</td>
                  <td className="border border-black px-2 py-1">&nbsp;</td>
                  <td className="border border-black px-2 py-1">&nbsp;</td>
                </tr>
              ))}

              {/* Total Row */}
              <tr className="bg-slate-100 font-black">
                <td colSpan={4} className="border-2 border-black px-3 py-2 text-right uppercase">
                  Total ({bundles.length} Bundles)
                </td>
                <td className="border-2 border-black px-2 py-2 font-mono text-sm text-center">
                  {totalGoodQty.toLocaleString()} pcs
                </td>
                <td className="border-2 border-black px-1.5 py-2 font-mono text-center">
                  {totalEd > 0 ? totalEd : '-'}
                </td>
                <td className="border-2 border-black px-1.5 py-2 font-mono text-center">
                  {totalMd > 0 ? totalMd : '-'}
                </td>
                <td className="border-2 border-black px-2 py-2 text-[10px]">
                  {despatch.remarks || `MD: ${despatch.mdStatus}`}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Signature Footer */}
          <div className="grid grid-cols-4 gap-6 mt-12 pt-4 text-center text-xs">
            <div>
              <div className="min-h-[20px] font-bold text-slate-800">{despatch.checkedBy}</div>
              <div className="border-t border-dotted border-black pt-1 font-bold">Checked by</div>
            </div>
            <div>
              <div className="min-h-[20px] font-bold text-slate-800">{despatch.despatchedBy}</div>
              <div className="border-t border-dotted border-black pt-1 font-bold">Despatched by</div>
            </div>
            <div>
              <div className="min-h-[20px] font-bold text-slate-800">{despatch.authorizedBy}</div>
              <div className="border-t border-dotted border-black pt-1 font-bold">Authorized by</div>
            </div>
            <div>
              <div className="min-h-[20px] font-bold text-slate-800">{despatch.receivedBy}</div>
              <div className="border-t border-dotted border-black pt-1 font-bold">Received by</div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* DOCUMENT 2: FACTORY GATE PASS (Linked to Despatch Out)            */}
      {/* ================================================================= */}
      {activeDoc === 'gatePass' && despatch && (
        <div className="w-full max-w-[900px] bg-white text-black rounded-xl shadow-2xl border border-slate-300 p-6 sm:p-8 print:shadow-none print:border-none print:rounded-none print:max-w-none print:p-4">
          <div className="flex items-start justify-between border-b-2 border-black pb-3">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-wide">
                DINUSHA EMBROIDERY INTERNATIONAL (PVT) LTD
              </h1>
              <p className="text-xs font-bold mt-0.5">
                No. 177/5, New Kandy Road, Weliveriya West, Weliveriya
              </p>
              <p className="text-xs">Tel: 0760 958 645 / 033 2256157 • Email: dinushaemb@gmail.com</p>
            </div>
            <div className="text-right border-2 border-black px-4 py-2 rounded-lg">
              <div className="text-[10px] font-black uppercase tracking-wider">FACTORY GATE PASS</div>
              <div className="text-xl font-black font-mono text-emerald-800 print:text-black">
                {despatch.gatepassNo}
              </div>
              <div className="text-[10px] font-mono font-bold">
                Ref DN: {despatch.despatchNo}
              </div>
            </div>
          </div>

          {/* Gate Pass Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4 p-3 border-2 border-black rounded-lg text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-600 block">Date</span>
              <span className="font-mono font-black text-sm">{despatch.despatchDate}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-600 block">
                Client / Destination Factory
              </span>
              <span className="font-black text-sm">{despatch.companyName}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-600 block">
                Recipient / Attention
              </span>
              <span className="font-bold text-sm">{despatch.toPerson || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-600 block">
                Vehicle Number
              </span>
              <span className="font-mono font-black text-sm uppercase">
                {despatch.vehicleNo || '________________'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-600 block">
                Driver / Carrier Name
              </span>
              <span className="font-bold text-sm">
                {despatch.driverName || '________________'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-600 block">
                Metal Detector &amp; QC Status
              </span>
              <span className="inline-block px-2 py-0.5 border border-black font-black font-mono text-xs mt-0.5">
                MD {despatch.mdStatus} • {bundles.length} BUNDLES
              </span>
            </div>
          </div>

          <p className="text-xs font-bold mb-2">
            Please allow the bearer to take out the following checked embroidery goods from the factory premises:
          </p>

          {/* Items Summary Table */}
          <table className="w-full border-collapse border-2 border-black text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-black px-2 py-1.5 font-black text-center">#</th>
                <th className="border border-black px-2 py-1.5 font-black text-left">Style No &amp; Name</th>
                <th className="border border-black px-2 py-1.5 font-black text-center">Cut / Job</th>
                <th className="border border-black px-2 py-1.5 font-black text-center">Bundle No</th>
                <th className="border border-black px-2 py-1.5 font-black text-center">No Range</th>
                <th className="border border-black px-2 py-1.5 font-black text-center">Size</th>
                <th className="border border-black px-2 py-1.5 font-black text-center">Good Qty</th>
                <th className="border border-black px-2 py-1.5 font-black text-center">E.D / M.D</th>
                <th className="border border-black px-2 py-1.5 font-black text-left">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {bundles.map((b, idx) => (
                <tr key={b.id}>
                  <td className="border border-black px-2 py-1 font-mono text-center">{idx + 1}</td>
                  <td className="border border-black px-2 py-1 font-bold">
                    {b.styleCode ? `${b.styleCode} - ${b.styleName}` : b.styleName}
                    {b.partName && (
                      <div className="text-[10px] font-semibold text-slate-600 print:text-black">
                        Part: {b.partName}
                      </div>
                    )}
                  </td>
                  <td className="border border-black px-2 py-1 font-mono text-center">
                    {b.jobNo || b.cutNo || '-'}
                  </td>
                  <td className="border border-black px-2 py-1 font-mono font-bold text-center">
                    {b.bundleNo}
                  </td>
                  <td className="border border-black px-2 py-1 font-mono text-center">
                    {b.noRange || '-'}
                  </td>
                  <td className="border border-black px-2 py-1 font-mono font-bold text-center">
                    {b.size}
                  </td>
                  <td className="border border-black px-2 py-1 font-mono font-black text-center">
                    {b.goodQty || b.tagQty}
                  </td>
                  <td className="border border-black px-2 py-1 font-mono text-center">
                    {b.edQty}/{b.mdQty}
                  </td>
                  <td className="border border-black px-2 py-1 text-[11px]">{b.remarks || '-'}</td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-black">
                <td colSpan={6} className="border-2 border-black px-3 py-2 text-right uppercase">
                  Grand Total ({bundles.length} Bundles)
                </td>
                <td className="border-2 border-black px-2 py-2 font-mono text-sm text-center">
                  {totalGoodQty.toLocaleString()} pcs
                </td>
                <td className="border-2 border-black px-2 py-2 font-mono text-center">
                  {totalEd}/{totalMd}
                </td>
                <td className="border-2 border-black px-2 py-2 text-[10px]">
                  CL No: {despatch.checklistNo || '-'}
                </td>
              </tr>
            </tbody>
          </table>

          {despatch.remarks && (
            <div className="mt-3 p-2.5 border border-black text-xs">
              <strong>Gate Remarks:</strong> {despatch.remarks}
            </div>
          )}

          {/* Gate Pass Signatures */}
          <div className="grid grid-cols-4 gap-6 mt-12 pt-4 text-center text-xs">
            <div>
              <div className="min-h-[20px] font-bold">{despatch.despatchedBy}</div>
              <div className="border-t border-black pt-1 font-bold">Despatched By</div>
            </div>
            <div>
              <div className="min-h-[20px] font-bold">{despatch.authorizedBy}</div>
              <div className="border-t border-black pt-1 font-bold">Authorized By</div>
            </div>
            <div>
              <div className="min-h-[20px]">&nbsp;</div>
              <div className="border-t border-black pt-1 font-bold">Security / Gate Out Time</div>
            </div>
            <div>
              <div className="min-h-[20px] font-bold">{despatch.receivedBy}</div>
              <div className="border-t border-black pt-1 font-bold">Driver / Receiver Sign</div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* DOCUMENT 3: YELLOW BUNDLE CHECK LIST (Matches Physical Yellow Pad) */}
      {/* ================================================================= */}
      {activeDoc === 'bundleCheckList' && (
        <div className="w-full max-w-[900px] bg-amber-50/90 print:bg-white text-black rounded-xl shadow-2xl border-2 border-amber-300 p-6 sm:p-8 print:shadow-none print:border-none print:rounded-none print:max-w-none print:p-4">
          {/* Header Banner */}
          <div className="flex items-center justify-between border-b-2 border-black pb-2">
            <div className="px-3 py-1.5 bg-black text-white font-black tracking-widest text-sm uppercase">
              DINUSHA
            </div>
            <div className="text-center flex-1 px-3">
              <h1 className="text-lg sm:text-xl font-black tracking-wide uppercase">
                DINUSHA EMBROIDERY INTERNATIONAL (PVT) LTD
              </h1>
              <p className="text-[10.5px] font-bold">
                NO 177/5, NEW KANDY ROAD, WELIVERIYA WEST, WELIVERIYA.
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-black font-mono text-rose-700 print:text-black">
                {effectiveChecklist.serialNo}
              </div>
              {effectiveChecklist.directionLabel && (
                <div className="text-[9px] font-bold uppercase tracking-wider">
                  {effectiveChecklist.directionLabel}
                </div>
              )}
            </div>
          </div>

          {/* Title Bar */}
          <div className="border-x-2 border-b-2 border-black text-center py-1 font-black text-sm tracking-widest uppercase bg-amber-100/80 print:bg-slate-100">
            BUNDLE CHECK LIST
          </div>

          {/* Info + MD PASS / MD FAIL Block */}
          <div className="grid grid-cols-12 border-x-2 border-b-2 border-black text-xs">
            <div className="col-span-7 border-r-2 border-black p-2 space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="font-black w-14">DATE</span>
                <span className="font-mono font-bold border-b border-dotted border-black flex-1">
                  {effectiveChecklist.date}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-black w-14">PLANT</span>
                <span className="font-bold border-b border-dotted border-black flex-1">
                  {effectiveChecklist.plant}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-black w-14">STYLE</span>
                <span className="font-bold border-b border-dotted border-black flex-1">
                  {effectiveChecklist.styleLabel}
                  {(() => {
                    const distinctParts = Array.from(
                      new Set(bundles.map((b) => (b.partName || '').trim()).filter(Boolean))
                    );
                    return distinctParts.length > 0 ? `  |  PART: ${distinctParts.join(', ')}` : '';
                  })()}
                </span>
              </div>
            </div>

            <div className="col-span-5 grid grid-cols-4">
              <div className="border-r border-black p-2 flex items-center justify-center text-center font-black leading-tight">
                MD<br />PASS
              </div>
              <div className="border-r-2 border-black p-2 flex items-center justify-center text-2xl font-black text-emerald-700 print:text-black">
                {effectiveChecklist.mdStatus === 'PASS' ? '✓' : ''}
              </div>
              <div className="border-r border-black p-2 flex items-center justify-center text-center font-black leading-tight">
                MD<br />FAIL
              </div>
              <div className="p-2 flex items-center justify-center text-2xl font-black text-rose-700 print:text-black">
                {effectiveChecklist.mdStatus === 'FAIL' ? '✗' : ''}
              </div>
            </div>
          </div>

          {/* Yellow Sheet Columns Table */}
          <table className="w-full border-collapse border-x-2 border-b-2 border-black text-xs">
            <thead>
              <tr className="bg-amber-100/70 print:bg-slate-100">
                <th rowSpan={2} className="border border-black px-2 py-1 font-black text-center w-[11%]">
                  CUT NO
                </th>
                <th rowSpan={2} className="border border-black px-2 py-1 font-black text-center w-[13%]">
                  BUNDLE<br />NO
                </th>
                <th rowSpan={2} className="border border-black px-2 py-1 font-black text-center w-[18%]">
                  NO RANGE
                </th>
                <th rowSpan={2} className="border border-black px-2 py-1 font-black text-center w-[11%]">
                  SIZE
                </th>
                <th colSpan={2} className="border border-black px-2 py-1 font-black text-center w-[18%]">
                  QTY
                </th>
                <th rowSpan={2} className="border border-black px-1.5 py-1 font-black text-center w-[6%]">
                  MD
                </th>
                <th rowSpan={2} className="border border-black px-1.5 py-1 font-black text-center w-[6%]">
                  ED
                </th>
                <th rowSpan={2} className="border border-black px-2 py-1 font-black text-center w-[17%]">
                  REMARKS
                </th>
              </tr>
              <tr className="bg-amber-100/50 print:bg-slate-50">
                <th className="border border-black px-2 py-0.5 font-bold text-center">TAG</th>
                <th className="border border-black px-2 py-0.5 font-bold text-center">GOOD</th>
              </tr>
            </thead>
            <tbody>
              {bundles.map((b) => (
                <tr key={b.id} className="h-7">
                  <td className="border border-black px-2 py-0.5 font-mono font-bold text-center">
                    {b.cutNo || b.jobNo || '-'}
                  </td>
                  <td className="border border-black px-2 py-0.5 font-mono font-black text-center">
                    {b.bundleNo}
                  </td>
                  <td className="border border-black px-2 py-0.5 font-mono text-center">
                    {b.noRange}
                  </td>
                  <td className="border border-black px-2 py-0.5 font-mono font-bold text-center">
                    {b.size}
                  </td>
                  <td className="border border-black px-2 py-0.5 font-mono font-bold text-center">
                    {b.tagQty}
                  </td>
                  <td className="border border-black px-2 py-0.5 font-mono font-black text-center">
                    {b.goodQty}
                  </td>
                  <td className="border border-black px-1 py-0.5 font-mono text-center">
                    {b.mdQty > 0 ? b.mdQty : ''}
                  </td>
                  <td className="border border-black px-1 py-0.5 font-mono text-center">
                    {b.edQty > 0 ? b.edQty : ''}
                  </td>
                  <td className="border border-black px-2 py-0.5 text-[11px]">{b.remarks}</td>
                </tr>
              ))}

              {Array.from({ length: emptyRowCount }).map((_, idx) => (
                <tr key={`empty-cl-${idx}`} className="h-7">
                  <td className="border border-black">&nbsp;</td>
                  <td className="border border-black">&nbsp;</td>
                  <td className="border border-black">&nbsp;</td>
                  <td className="border border-black">&nbsp;</td>
                  <td className="border border-black">&nbsp;</td>
                  <td className="border border-black">&nbsp;</td>
                  <td className="border border-black">&nbsp;</td>
                  <td className="border border-black">&nbsp;</td>
                  <td className="border border-black">&nbsp;</td>
                </tr>
              ))}

              {/* Totals Row */}
              <tr className="bg-amber-100/80 print:bg-slate-100 font-black">
                <td colSpan={4} className="border-2 border-black px-3 py-1.5 text-right uppercase">
                  TOTAL ({bundles.length} BUNDLES)
                </td>
                <td className="border-2 border-black px-2 py-1.5 font-mono text-sm text-center">
                  {totalTagQty}
                </td>
                <td className="border-2 border-black px-2 py-1.5 font-mono text-sm text-center">
                  {totalGoodQty}
                </td>
                <td className="border-2 border-black px-1 py-1.5 font-mono text-center">
                  {totalMd > 0 ? totalMd : ''}
                </td>
                <td className="border-2 border-black px-1 py-1.5 font-mono text-center">
                  {totalEd > 0 ? totalEd : ''}
                </td>
                <td className="border-2 border-black px-2 py-1.5">&nbsp;</td>
              </tr>
            </tbody>
          </table>

          {/* Bottom Checked By / Authorized By Boxes */}
          <div className="grid grid-cols-2 gap-6 mt-6 text-xs">
            <div className="border-2 border-black flex">
              <div className="px-3 py-2 font-black border-r-2 border-black bg-amber-100/60 print:bg-slate-50 uppercase">
                CHECKED BY
              </div>
              <div className="flex-1 px-3 py-2 font-bold">{effectiveChecklist.checkedBy}</div>
            </div>
            <div className="border-2 border-black flex">
              <div className="px-3 py-2 font-black border-r-2 border-black bg-amber-100/60 print:bg-slate-50 uppercase">
                AUTHORIZED BY
              </div>
              <div className="flex-1 px-3 py-2 font-bold">{effectiveChecklist.authorizedBy}</div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* DOCUMENT 4: STYLE IN & OUT RECONCILIATION SUMMARY (EXTRA / SHORT) */}
      {/* ================================================================= */}
      {activeDoc === 'reconciliationSummary' && summaryData && (
        <div className="w-full max-w-[900px] bg-white text-black rounded-xl shadow-2xl border border-slate-300 p-6 sm:p-8 print:shadow-none print:border-none print:rounded-none print:max-w-none print:p-4 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-black pb-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide">
                DINUSHA EMBROIDERY INTERNATIONAL (PVT) LTD
              </h1>
              <p className="text-xs font-bold">
                No. 177/5, New Kandy Road, Weliveriya West, Weliveriya • Tel: 0760 958 645 / 033 2256157
              </p>
              <div className="mt-1.5 inline-block px-3 py-0.5 bg-slate-900 text-white print:bg-white print:text-black print:border print:border-black text-xs font-black tracking-widest uppercase">
                STYLE IN &amp; OUT RECONCILIATION SUMMARY
              </div>
            </div>
            <div className="text-right text-xs">
              <div className="font-bold text-slate-600">Date: {summaryData.generatedDate}</div>
              <div className="font-black text-base mt-0.5">
                {summaryData.styleCode
                  ? `${summaryData.styleCode} — ${summaryData.styleName}`
                  : summaryData.styleName}
              </div>
              <div className="font-bold text-slate-700">{summaryData.companyName}</div>
            </div>
          </div>

          {/* Top Summary Strip */}
          {(() => {
            const overallVar = summaryData.totalInQty - summaryData.orderQty;
            const factoryBal = Math.max(
              0,
              summaryData.totalInQty -
                summaryData.totalOutQty -
                summaryData.totalEd -
                summaryData.totalMd
            );
            return (
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                <div className="border-2 border-black p-2 rounded">
                  <div className="text-[9px] font-bold uppercase text-slate-600">Style Order Qty</div>
                  <div className="text-base font-black font-mono">
                    {summaryData.orderQty.toLocaleString()}
                  </div>
                </div>
                <div className="border-2 border-black p-2 rounded">
                  <div className="text-[9px] font-bold uppercase text-slate-600">Total Cut-In</div>
                  <div className="text-base font-black font-mono">
                    {summaryData.totalInQty.toLocaleString()}
                  </div>
                </div>
                <div
                  className={`border-2 border-black p-2 rounded ${
                    overallVar > 0
                      ? 'bg-amber-100 print:bg-slate-100'
                      : overallVar < 0
                      ? 'bg-rose-50 print:bg-white'
                      : 'bg-emerald-50 print:bg-white'
                  }`}
                >
                  <div className="text-[9px] font-bold uppercase text-slate-700">
                    Extra / Short (In)
                  </div>
                  <div className="text-base font-black font-mono">
                    {overallVar > 0
                      ? `+${overallVar.toLocaleString()} EXTRA`
                      : overallVar < 0
                      ? `${overallVar.toLocaleString()} SHORT`
                      : '0 EXACT'}
                  </div>
                </div>
                <div className="border-2 border-black p-2 rounded bg-indigo-50 print:bg-white">
                  <div className="text-[9px] font-bold uppercase text-indigo-800 print:text-black">
                    Total Sent Out
                  </div>
                  <div className="text-base font-black font-mono">
                    {summaryData.totalOutQty.toLocaleString()}
                  </div>
                </div>
                <div className="border-2 border-black p-2 rounded">
                  <div className="text-[9px] font-bold uppercase text-slate-600">Damage (ED/MD)</div>
                  <div className="text-base font-black font-mono">
                    {summaryData.totalEd}/{summaryData.totalMd}
                  </div>
                </div>
                <div className="border-2 border-black p-2 rounded">
                  <div className="text-[9px] font-bold uppercase text-slate-600">In Factory Bal.</div>
                  <div className="text-base font-black font-mono">
                    {factoryBal.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Size-Wise In / Extra-Short / Out Breakdown */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider mb-1.5">
              1. Size-Wise In, Extra / Short &amp; Dispatched Out Summary
            </h3>
            <table className="w-full border-collapse border-2 border-black text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-black px-2 py-1.5 text-center font-black">Size</th>
                  <th className="border border-black px-2 py-1.5 text-right font-black">Order Qty</th>
                  <th className="border border-black px-2 py-1.5 text-right font-black">Total Cut-In</th>
                  <th className="border border-black px-2 py-1.5 text-center font-black">
                    In Variance (+Extra / -Short)
                  </th>
                  <th className="border border-black px-2 py-1.5 text-right font-black">Sent Out</th>
                  <th className="border border-black px-2 py-1.5 text-center font-black">E.D / M.D</th>
                  <th className="border border-black px-2 py-1.5 text-right font-black">In-House Bal.</th>
                </tr>
              </thead>
              <tbody>
                {summaryData.sizeRows.map((sr) => (
                  <tr key={sr.size}>
                    <td className="border border-black px-2 py-1 font-mono font-black text-center">
                      {sr.size}
                    </td>
                    <td className="border border-black px-2 py-1 font-mono text-right">
                      {sr.orderQty.toLocaleString()}
                    </td>
                    <td className="border border-black px-2 py-1 font-mono font-bold text-right">
                      {sr.inQty.toLocaleString()}
                    </td>
                    <td
                      className={`border border-black px-2 py-1 font-mono font-black text-center ${
                        sr.variance > 0
                          ? 'bg-amber-100 text-amber-950 print:bg-slate-100 print:text-black'
                          : sr.variance < 0
                          ? 'text-rose-700 print:text-black'
                          : 'text-emerald-700 print:text-black'
                      }`}
                    >
                      {sr.variance > 0
                        ? `+${sr.variance} EXTRA`
                        : sr.variance < 0
                        ? `${sr.variance} Short`
                        : '✓ Exact'}
                    </td>
                    <td className="border border-black px-2 py-1 font-mono font-black text-right">
                      {sr.outQty.toLocaleString()}
                    </td>
                    <td className="border border-black px-2 py-1 font-mono text-center">
                      {sr.edQty}/{sr.mdQty}
                    </td>
                    <td className="border border-black px-2 py-1 font-mono font-bold text-right">
                      {sr.inHouseBalance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Part-Wise Breakdown (for multi-part styles like 6 parts) */}
          {summaryData.partRows.length > 0 && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider mb-1.5">
                2. Part-Wise In, Extra / Short &amp; Dispatched Out Summary
              </h3>
              <table className="w-full border-collapse border-2 border-black text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-black px-2 py-1.5 text-left font-black">Part Name</th>
                    <th className="border border-black px-2 py-1.5 text-right font-black">Order Qty</th>
                    <th className="border border-black px-2 py-1.5 text-right font-black">Total Cut-In</th>
                    <th className="border border-black px-2 py-1.5 text-center font-black">
                      In Variance (+Extra / -Short)
                    </th>
                    <th className="border border-black px-2 py-1.5 text-right font-black">Sent Out</th>
                    <th className="border border-black px-2 py-1.5 text-right font-black">In-House Bal.</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryData.partRows.map((pr) => (
                    <tr key={pr.partName}>
                      <td className="border border-black px-2 py-1 font-bold">{pr.partName}</td>
                      <td className="border border-black px-2 py-1 font-mono text-right">
                        {pr.orderQty.toLocaleString()}
                      </td>
                      <td className="border border-black px-2 py-1 font-mono font-bold text-right">
                        {pr.inQty.toLocaleString()}
                      </td>
                      <td className="border border-black px-2 py-1 font-mono font-black text-center">
                        {pr.variance > 0
                          ? `+${pr.variance} EXTRA`
                          : pr.variance < 0
                          ? `${pr.variance} Short`
                          : '✓ Exact'}
                      </td>
                      <td className="border border-black px-2 py-1 font-mono font-black text-right">
                        {pr.outQty.toLocaleString()}
                      </td>
                      <td className="border border-black px-2 py-1 font-mono font-bold text-right">
                        {pr.inHouseBalance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Partial Batches & Dispatched Notes Logs Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider mb-1.5">
                Cut-In Partial Batches ({summaryData.inBatches.length})
              </h3>
              <table className="w-full border-collapse border border-black text-[11px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-black px-1.5 py-1">Batch / Date</th>
                    <th className="border border-black px-1.5 py-1">Cut / Part</th>
                    <th className="border border-black px-1.5 py-1 text-right">In Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryData.inBatches.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="border border-black p-2 text-center text-slate-500">
                        No cut-in batches yet
                      </td>
                    </tr>
                  ) : (
                    summaryData.inBatches.map((ib) => (
                      <tr key={ib.batchNo}>
                        <td className="border border-black px-1.5 py-1 font-mono">
                          <strong>{ib.batchNo}</strong> ({ib.receivedDate})
                        </td>
                        <td className="border border-black px-1.5 py-1">
                          Cut {ib.cutNo || '-'} • {ib.partsNote || 'All'}
                          {ib.remarks && (
                            <div className="text-[9.5px] font-bold text-amber-800 print:text-black">
                              {ib.remarks}
                            </div>
                          )}
                        </td>
                        <td className="border border-black px-1.5 py-1 font-mono font-bold text-right">
                          {ib.totalQty} ({ib.bundleCount}b)
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-wider mb-1.5">
                Dispatched Out / Gate Passes ({summaryData.outDespatches.length})
              </h3>
              <table className="w-full border-collapse border border-black text-[11px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-black px-1.5 py-1">DN / GP / Date</th>
                    <th className="border border-black px-1.5 py-1">To</th>
                    <th className="border border-black px-1.5 py-1 text-right">Out Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryData.outDespatches.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="border border-black p-2 text-center text-slate-500">
                        No despatches sent yet
                      </td>
                    </tr>
                  ) : (
                    summaryData.outDespatches.map((od) => (
                      <tr key={od.despatchNo}>
                        <td className="border border-black px-1.5 py-1 font-mono">
                          <strong>{od.despatchNo}</strong> / {od.gatepassNo} ({od.despatchDate})
                        </td>
                        <td className="border border-black px-1.5 py-1">{od.toPerson || '-'}</td>
                        <td className="border border-black px-1.5 py-1 font-mono font-bold text-right">
                          {od.totalQty} ({od.bundleCount}b)
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Signatures */}
          <div className="grid grid-cols-3 gap-6 mt-10 pt-4 text-center text-xs">
            <div className="border-t border-black pt-1 font-bold">Prepared By</div>
            <div className="border-t border-black pt-1 font-bold">Checked By</div>
            <div className="border-t border-black pt-1 font-bold">Authorized By</div>
          </div>
        </div>
      )}
    </div>
  );
}
