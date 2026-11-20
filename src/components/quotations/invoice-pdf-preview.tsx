'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  CreditCard,
  Download,
  Edit3,
  Lock,
  Unlock,
  X,
} from 'lucide-react';
import type { BillingInvoice, BillingQuote } from '@/actions/billing';

interface DocumentPreviewModalProps {
  doc:
    | { kind: 'INVOICE'; data: BillingInvoice }
    | { kind: 'QUOTE'; data: BillingQuote }
    | null;
  isPaidLocked?: boolean;
  isEditApproved?: boolean;
  onClose: () => void;
  onEdit: () => void;
  onConvertToInvoice?: (quote: BillingQuote) => void;
  onRecordPayment?: (
    invoice: BillingInvoice,
    newAmountPaid: number,
    paymentMethod: string,
    paymentReference: string
  ) => void;
}

function formatLKR(val: number): string {
  return `LKR ${Number(val || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function DocumentPreviewModal({
  doc,
  isPaidLocked = false,
  isEditApproved = false,
  onClose,
  onEdit,
  onConvertToInvoice,
  onRecordPayment,
}: DocumentPreviewModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const [paymentInput, setPaymentInput] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [payRef, setPayRef] = useState('');
  const [showPaymentBox, setShowPaymentBox] = useState(false);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (doc && !dlg.open) {
      dlg.showModal();
      setShowPaymentBox(false);
      if (doc.kind === 'INVOICE') {
        setPaymentInput(String(doc.data.balanceDue > 0 ? doc.data.balanceDue : 0));
        setPayMethod(doc.data.paymentMethod || 'Cash');
        setPayRef(doc.data.paymentReference || '');
      }
    } else if (!doc && dlg.open) {
      dlg.close();
    }
  }, [doc]);

  if (!doc) return null;

  const isInvoice = doc.kind === 'INVOICE';
  const inv = isInvoice ? doc.data : null;
  const qt = !isInvoice ? doc.data : null;
  const item = doc.data;

  const isTaxDoc =
    Boolean(item.isTaxInvoice) ||
    item.lineItems.some((l) => (Number(l.taxPercent) || 0) > 0);

  const docNumber = isInvoice ? inv!.invoiceNumber : qt!.quoteNumber;
  const docDate = isInvoice ? inv!.invoiceDate : qt!.quoteDate;
  const secondaryDateLabel = isInvoice ? 'Due Date' : 'Expiry Date';
  const secondaryDate = isInvoice ? inv!.dueDate : qt!.expiryDate || '—';
  const refLabel = isInvoice ? 'Order / Style #' : 'Reference #';
  const refValue = isInvoice ? inv!.orderNumber || '—' : qt!.referenceNumber || '—';

  const baseSubTotal = item.lineItems.reduce(
    (s, l) => s + (Number(l.qty) || 0) * (Number(l.rate) || 0),
    0
  );
  const computedTaxTotal =
    item.taxTotal ??
    item.lineItems.reduce(
      (s, l) =>
        s + ((Number(l.qty) || 0) * (Number(l.rate) || 0) * (Number(l.taxPercent) || 0)) / 100,
      0
    );

  const discountAmt =
    item.discountType === 'PERCENT'
      ? (baseSubTotal * (Number(item.discountValue) || 0)) / 100
      : Number(item.discountValue) || 0;

  const handlePrintOrDownloadPdf = () => {
    if (!printAreaRef.current) return;
    const htmlContent = printAreaRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=960,height=800');
    if (!win) {
      window.print();
      return;
    }
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${docNumber} - Dinusha Embroidery</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #0f172a; background: #fff; }
  </style>
</head>
<body class="p-4">
  ${htmlContent}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 350);
    };
  </script>
</body>
</html>`);
    win.document.close();
  };

  const handleApplyPayment = (addAmount: number) => {
    if (!inv || !onRecordPayment) return;
    const nextPaid = Math.min(inv.totalAmount, Math.max(0, inv.amountPaid + addAmount));
    onRecordPayment(
      inv,
      Math.round(nextPaid * 100) / 100,
      payMethod || 'Cash',
      payRef.trim()
    );
    setShowPaymentBox(false);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="doc-preview-title"
      onClose={onClose}
      className="m-auto w-full max-w-5xl rounded-3xl bg-slate-100 p-0 shadow-2xl border border-slate-300 backdrop:bg-slate-950/60 backdrop:backdrop-blur-xs"
    >
      <div className="flex flex-col max-h-[92vh]">
        {/* TOP ACTION BAR */}
        <div className="bg-[#001a3d] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-xs font-black tracking-wider uppercase text-blue-200">
              {isInvoice ? (isTaxDoc ? 'Tax Invoice' : 'Commercial Invoice') : 'Official Quotation'}
            </span>
            <h2 id="doc-preview-title" className="text-base font-black tracking-tight">
              {docNumber} — {item.customerName}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isInvoice && onRecordPayment && inv!.balanceDue > 0 && (
              <button
                type="button"
                onClick={() => setShowPaymentBox((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Record Payment
              </button>
            )}

            {!isInvoice && onConvertToInvoice && qt && (
              <button
                type="button"
                onClick={() => onConvertToInvoice(qt)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
              >
                Convert to Invoice <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onEdit}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                isInvoice && isPaidLocked && !isEditApproved
                  ? 'bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border border-amber-400/40'
                  : 'bg-white/15 hover:bg-white/25 text-white'
              }`}
            >
              {isInvoice && isPaidLocked && !isEditApproved ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  Paid Locked (Request Admin Edit)
                </>
              ) : isInvoice && isEditApproved ? (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-300" />
                  Edit (Admin Approved)
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrintOrDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download / Print PDF
            </button>

            <button
              type="button"
              aria-label="Close document preview"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-600 text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* RECORD PAYMENT DRAWER (FOR INVOICES) */}
        {isInvoice && showPaymentBox && inv && (
          <div className="bg-emerald-950 text-white px-6 py-3.5 border-b border-emerald-800 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider">
                Record Customer Payment for {inv.invoiceNumber}
              </p>
              <p className="text-[11px] text-emerald-100/80">
                Total: {formatLKR(inv.totalAmount)} • Already Paid: {formatLKR(inv.amountPaid)} •{' '}
                <span className="font-bold text-white">Balance Due: {formatLKR(inv.balanceDue)}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Card / Online">Card / Online</option>
              </select>
              <input
                type="text"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="Cheque # / Bank Ref..."
                className="w-36 px-2.5 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-semibold outline-none"
              />
              {inv.amountPaid === 0 && (
                <button
                  type="button"
                  onClick={() => handleApplyPayment(inv.totalAmount * 0.5)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-xs font-bold border border-emerald-600 cursor-pointer"
                >
                  + Record 50% Advance ({formatLKR(inv.totalAmount * 0.5)})
                </button>
              )}
              <button
                type="button"
                onClick={() => handleApplyPayment(inv.balanceDue)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black cursor-pointer"
              >
                Mark Full Balance Paid ({formatLKR(inv.balanceDue)})
              </button>
              <div className="flex items-center gap-1.5 bg-emerald-900/90 p-1 rounded-xl border border-emerald-700">
                <input
                  type="number"
                  step="0.01"
                  value={paymentInput}
                  onChange={(e) => setPaymentInput(e.target.value)}
                  className="w-28 px-2 py-1 rounded-lg bg-white text-slate-900 text-xs font-bold outline-none"
                  placeholder="Amount LKR"
                />
                <button
                  type="button"
                  onClick={() => handleApplyPayment(parseFloat(paymentInput) || 0)}
                  className="px-2.5 py-1 rounded-lg bg-white text-emerald-950 text-xs font-bold hover:bg-emerald-100 cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SCROLLABLE A4 DOCUMENT SHEET */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center">
          <div
            ref={printAreaRef}
            className="bg-white w-full max-w-[840px] rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-10 space-y-7 text-slate-800"
          >
            {/* LETTERHEAD */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b-2 border-slate-900">
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/dinusha-logo.jpg"
                  alt="Dinusha Embroidery Logo"
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#002d62]"
                />
                <div>
                  <h1 className="text-xl font-black tracking-tight text-[#001a3d] uppercase">
                    Dinusha Embroidery
                  </h1>
                  <p className="text-xs font-semibold text-slate-600">
                    Industrial Multi-Head Computerized Embroidery &amp; Uniform Manufacturing
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    177/5 New Kandy Rd, Weliweriya, Sri Lanka • Tel: (+94) 77 774 8849
                  </p>
                  {item.supplierTaxNo && (
                    <p className="text-[11px] font-bold text-[#002d62] mt-0.5">
                      TIN / VAT Reg. No: {item.supplierTaxNo}
                    </p>
                  )}
                </div>
              </div>

              <div className="sm:text-right">
                <span className="inline-block text-2xl sm:text-3xl font-black tracking-tight text-[#002d62] uppercase">
                  {isInvoice ? (isTaxDoc ? 'TAX INVOICE' : 'INVOICE') : 'QUOTATION'}
                </span>
                <p className="text-sm font-black text-slate-900 mt-0.5"># {docNumber}</p>
                {isInvoice && inv && (
                  <div className="mt-2">
                    <span
                      className={`inline-block px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase ${
                        inv.balanceDue <= 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.amountPaid > 0
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {inv.balanceDue <= 0
                        ? 'PAID IN FULL'
                        : inv.amountPaid > 0
                        ? 'PARTIALLY PAID'
                        : inv.status}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* BILL TO & DOCUMENT META */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  {isInvoice ? 'Bill To' : 'Prepared For'}
                </p>
                <p className="text-base font-black text-slate-900">{item.customerName}</p>
                {item.companyName && item.companyName !== item.customerName && (
                  <p className="text-xs font-bold text-slate-700">{item.companyName}</p>
                )}
                {item.billingAddress && (
                  <p className="text-xs text-slate-600 whitespace-pre-line">{item.billingAddress}</p>
                )}
                {(item.customerPhone || item.customerEmail) && (
                  <p className="text-[11px] text-slate-500">
                    {item.customerPhone ? `Tel: ${item.customerPhone}` : ''}
                    {item.customerPhone && item.customerEmail ? ' • ' : ''}
                    {item.customerEmail ? item.customerEmail : ''}
                  </p>
                )}
                {item.customerTaxNo && (
                  <p className="text-xs font-bold text-slate-800 pt-0.5">
                    Customer TIN / VAT No: {item.customerTaxNo}
                  </p>
                )}
                {item.subject && (
                  <p className="text-xs font-semibold text-[#1c39bb] pt-1">
                    Subject: {item.subject}
                  </p>
                )}
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">
                    {isInvoice ? 'Invoice Date:' : 'Quote Date:'}
                  </span>
                  <span className="font-bold text-slate-900">{docDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">{secondaryDateLabel}:</span>
                  <span className="font-bold text-slate-900">{secondaryDate}</span>
                </div>
                {isInvoice && inv?.paymentTerms && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Terms:</span>
                    <span className="font-bold text-slate-800">{inv.paymentTerms}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">{refLabel}</span>
                  <span className="font-bold text-slate-800">{refValue}</span>
                </div>
                {isInvoice && inv && (
                  <div className="flex justify-between pt-1.5 border-t border-slate-200">
                    <span className="text-slate-700 font-extrabold">Balance Due:</span>
                    <span className="font-black text-[#002d62]">{formatLKR(inv.balanceDue)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* CLEAN ZOHO-STYLE LINE ITEMS TABLE */}
            <div className="rounded-xl border border-slate-300 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#001a3d] text-white uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3 w-10">#</th>
                    <th className="p-3">Item &amp; Description</th>
                    <th className="p-3 text-center w-28">Qty</th>
                    <th className="p-3 text-right w-32">Rate (LKR)</th>
                    {isTaxDoc && <th className="p-3 text-right w-28">Tax</th>}
                    <th className="p-3 text-right w-36">Amount (LKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {item.lineItems.map((line, idx) => {
                    const lineBase = (Number(line.qty) || 0) * (Number(line.rate) || 0);
                    const lineTaxAmt = (lineBase * (Number(line.taxPercent) || 0)) / 100;
                    return (
                      <tr key={line.id || idx} className="align-top">
                        <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            {line.styleCode && (
                              <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 font-extrabold text-[10px]">
                                {line.styleCode}
                              </span>
                            )}
                            <span className="font-bold text-slate-900">{line.itemName}</span>
                          </div>
                          {line.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5">{line.description}</p>
                          )}
                        </td>
                        <td className="p-3 text-center font-black text-slate-900">
                          {Number(line.qty).toLocaleString()}{' '}
                          <span className="text-[10px] font-normal text-slate-500">{line.unit}</span>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-700">
                          {Number(line.rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        {isTaxDoc && (
                          <td className="p-3 text-right font-mono text-slate-600">
                            {Number(line.taxPercent) > 0
                              ? `${line.taxPercent}% (${lineTaxAmt.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })})`
                              : '0%'}
                          </td>
                        )}
                        <td className="p-3 text-right font-black text-slate-900 tabular-nums">
                          {Number(line.amount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* TOTALS & NOTES */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-7 space-y-4 text-xs">
                {item.customerNotes && (
                  <div>
                    <p className="text-[10px] font-extrabold uppercase text-slate-400 mb-1">
                      Customer Notes
                    </p>
                    <p className="text-slate-600 whitespace-pre-line">{item.customerNotes}</p>
                  </div>
                )}
                {item.termsAndConditions && (
                  <div>
                    <p className="text-[10px] font-extrabold uppercase text-slate-400 mb-1">
                      Terms &amp; Conditions
                    </p>
                    <p className="text-[11px] text-slate-600 whitespace-pre-line leading-relaxed">
                      {item.termsAndConditions}
                    </p>
                  </div>
                )}
              </div>

              <div className="md:col-span-5 bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span className="font-semibold">Sub Total</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {formatLKR(baseSubTotal)}
                  </span>
                </div>
                {isTaxDoc && (
                  <div className="flex justify-between text-slate-600">
                    <span className="font-semibold">Tax (VAT / SSCL)</span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      + {formatLKR(computedTaxTotal)}
                    </span>
                  </div>
                )}
                {discountAmt > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span className="font-semibold">
                      Discount {item.discountType === 'PERCENT' ? `(${item.discountValue}%)` : ''}
                    </span>
                    <span className="font-bold text-rose-600 tabular-nums">
                      - {formatLKR(discountAmt)}
                    </span>
                  </div>
                )}
                {item.shippingCharges > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span className="font-semibold">Shipping / Delivery Charges</span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {formatLKR(item.shippingCharges)}
                    </span>
                  </div>
                )}
                {item.adjustmentAmount !== 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span className="font-semibold">{item.adjustmentLabel || 'Adjustment'}</span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {formatLKR(item.adjustmentAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2.5 border-t border-slate-300 text-sm">
                  <span className="font-black text-slate-900">Total (LKR)</span>
                  <span className="font-black text-[#001a3d] tabular-nums">
                    {formatLKR(item.totalAmount)}
                  </span>
                </div>
                {isInvoice && inv && (
                  <>
                    <div className="flex justify-between text-emerald-700 pt-1">
                      <span className="font-bold">
                        Payments Received
                        {inv.paymentMethod ? ` (${inv.paymentMethod})` : ''}
                      </span>
                      <span className="font-bold tabular-nums">(-) {formatLKR(inv.amountPaid)}</span>
                    </div>
                    {inv.paymentReference && (
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Payment Ref / Cheque #:</span>
                        <span className="font-semibold text-slate-700">{inv.paymentReference}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-slate-300 text-sm bg-white p-2.5 rounded-xl">
                      <span className="font-black text-slate-900">Balance Due (LKR)</span>
                      <span className="font-black text-rose-700 tabular-nums">
                        {formatLKR(inv.balanceDue)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* SIGNATURE FOOTER */}
            <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-[11px] text-slate-500">
              <div>
                <p className="font-bold text-slate-700">Thank you for your business!</p>
                <p>Dinusha Embroidery • Weliweriya, Sri Lanka</p>
              </div>
              <div className="text-center">
                <div className="w-44 border-b border-slate-400 mb-1" />
                <p className="font-bold text-slate-700">Authorized Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
