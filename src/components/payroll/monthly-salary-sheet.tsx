'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { EmployeeEntity, PayrollCalculationBreakdown } from '@/modules/payroll/domain/entities';
import { fetchMonthlyRecordsAction, updateSalaryPaymentStatusAction } from '@/actions/payroll';
import { exportToExcel } from '@/modules/payroll/domain/epf-etf-utils';
import { AdminUnlockModal } from './admin-unlock-modal';
import {
  Printer,
  Calendar,
  FileSpreadsheet,
  Loader2,
  BadgeCheck,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface MonthlySalarySheetProps {
  employees: EmployeeEntity[];
}

export function MonthlySalarySheet({ employees }: MonthlySalarySheetProps) {
  const [month, setMonth] = useState<string>('October 2026');
  const [savedRecords, setSavedRecords] = useState<Record<string, PayrollCalculationBreakdown>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [actionEmpId, setActionEmpId] = useState<string | null>(null);
  const [unlockTarget, setUnlockTarget] = useState<PayrollCalculationBreakdown | null>(null);
  const [unlockLoading, setUnlockLoading] = useState<boolean>(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  useEffect(() => {
    let isMounted = true;
    async function loadRecords() {
      setLoading(true);
      setStatusMsg(null);
      setSavedRecords({});
      const res = await fetchMonthlyRecordsAction(month);
      if (isMounted) {
        if (res.success && res.data) {
          const map: Record<string, PayrollCalculationBreakdown> = {};
          res.data.forEach((r) => {
            map[r.employeeId] = r;
          });
          setSavedRecords(map);
        }
        setLoading(false);
      }
    }

    loadRecords();
    return () => {
      isMounted = false;
    };
  }, [month]);

  // Show ONLY employees whose monthly salary has actually been calculated & saved for the selected month
  const rows = useMemo(() => {
    return employees
      .filter((e) => e.isActive && Boolean(savedRecords[e.id]))
      .sort((a, b) => a.epfNo - b.epfNo)
      .map((emp) => savedRecords[emp.id]);
  }, [employees, savedRecords]);

  // Totals calculations
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        basic: acc.basic + r.basic,
        prodAllow: acc.prodAllow + r.prodAllow,
        gradeAllow: acc.gradeAllow + r.gradeAllow,
        attAllow: acc.attAllow + r.attAllow,
        transAllow: acc.transAllow + r.transAllow,
        otHours: acc.otHours + r.otHours,
        otAmt: acc.otAmt + r.otAmt,
        sotHours: acc.sotHours + r.sotHours,
        sotAmt: acc.sotAmt + r.sotAmt,
        gross: acc.gross + r.gross,
        epf8: acc.epf8 + r.epf8,
        lateDeduction: acc.lateDeduction + r.lateDeduction,
        unpaidDeduction: acc.unpaidDeduction + r.unpaidDeduction,
        net: acc.net + r.net,
      }),
      {
        basic: 0,
        prodAllow: 0,
        gradeAllow: 0,
        attAllow: 0,
        transAllow: 0,
        otHours: 0,
        otAmt: 0,
        sotHours: 0,
        sotAmt: 0,
        gross: 0,
        epf8: 0,
        lateDeduction: 0,
        unpaidDeduction: 0,
        net: 0,
      }
    );
  }, [rows]);

  const handleExportExcel = () => {
    const excelData: Record<string, unknown>[] = rows.map((r) => ({
      NO: r.epfNo,
      Name: r.name,
      'Basic+Bud': r.basic,
      'Allowance (Production)': r.prodAllow,
      'Allowance (Grade)': r.gradeAllow,
      'Att All': r.attAllow,
      'Transport Allowance': r.transAllow,
      'Over Hour': r.otHours,
      Over: r.otAmt,
      'SP H': r.sotHours,
      'Sp O.T': r.sotAmt,
      'Gross sal': r.gross,
      'EPF 8%': r.epf8,
      'Late& Early(mm)': r.lateHours,
      'Late & Early': r.lateDeduction,
      'No Pay Hours': r.unpaidDays,
      'No Pay': r.unpaidDeduction,
      'Net Sal': r.net,
      Sign: '',
    }));

    // Add TOTAL summary row (only Net Sal total as requested)
    excelData.push({
      NO: '',
      Name: 'TOTAL',
      'Basic+Bud': '',
      'Allowance (Production)': '',
      'Allowance (Grade)': '',
      'Att All': '',
      'Transport Allowance': '',
      'Over Hour': '',
      Over: '',
      'SP H': '',
      'Sp O.T': '',
      'Gross sal': '',
      'EPF 8%': '',
      'Late& Early(mm)': '',
      'Late & Early': '',
      'No Pay Hours': '',
      'No Pay': '',
      'Net Sal': totals.net,
      Sign: '',
    });

    exportToExcel(
      [{ name: 'Salary Sheet', data: excelData }],
      `Dinusha_Embroidery_Salary_Sheet_${month.replace(/\s+/g, '_')}`
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const formatLkr = (num: number) => {
    return (num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const paidCount = useMemo(
    () => rows.filter((r) => r.status === 'PAID').length,
    [rows]
  );

  const handleMarkPaid = async (row: PayrollCalculationBreakdown) => {
    setStatusMsg(null);
    setActionEmpId(row.employeeId);
    const res = await updateSalaryPaymentStatusAction({
      employeeId: row.employeeId,
      month,
      targetStatus: 'PAID',
    });
    setActionEmpId(null);

    if (res.success && res.data) {
      setSavedRecords((prev) => ({ ...prev, [row.employeeId]: res.data! }));
      setStatusMsg({
        type: 'success',
        text: `Marked ${row.name}'s ${month} salary as PAID & locked. Further edits now require Admin Authorization.`,
      });
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Failed to update payment status.' });
    }
  };

  const handleAdminUnlock = async (adminPin: string, adminReason: string) => {
    if (!unlockTarget) return;
    setUnlockError(null);
    setUnlockLoading(true);
    const res = await updateSalaryPaymentStatusAction({
      employeeId: unlockTarget.employeeId,
      month,
      targetStatus: 'APPROVED',
      adminPin,
      adminReason,
    });
    setUnlockLoading(false);

    if (res.success && res.data) {
      setSavedRecords((prev) => ({ ...prev, [unlockTarget.employeeId]: res.data! }));
      setStatusMsg({
        type: 'success',
        text: `Unlocked ${unlockTarget.name}'s ${month} salary via Admin Approval ("${adminReason}").`,
      });
      setUnlockTarget(null);
    } else {
      setUnlockError(res.error || 'Admin authorization failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Bar & Summary Strip (hidden during print) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden print:hidden">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight text-white">
                MONTHLY MASTER SALARY SHEET (2026)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/30 text-indigo-100 border border-indigo-400/40">
                {month}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Factory master wage ledger with employee signature columns &amp; allowance breakdown
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-white/15 text-xs font-semibold text-white">
              <Calendar className="w-4 h-4 text-indigo-300" />
              <span className="text-slate-300">Month:</span>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="bg-transparent border-none text-white font-bold focus:outline-hidden cursor-pointer"
              >
                <option value="October 2026" className="text-slate-900">October 2026</option>
                <option value="September 2026" className="text-slate-900">September 2026</option>
                <option value="August 2026" className="text-slate-900">August 2026</option>
                <option value="July 2026" className="text-slate-900">July 2026</option>
                <option value="November 2026" className="text-slate-900">November 2026</option>
                <option value="December 2026" className="text-slate-900">December 2026</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Download Excel (.xlsx)
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Sheet (Landscape)
            </button>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-50/70">
          <div className="bg-white rounded-xl border border-slate-200/80 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Calculated Salaries
            </span>
            <span className="text-lg font-mono font-black text-slate-900">
              {rows.length} <span className="text-xs font-semibold text-emerald-700">({paidCount} Paid)</span>
            </span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200/80 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Basic + Bud
            </span>
            <span className="text-lg font-mono font-black text-slate-900">
              LKR {formatLkr(totals.basic)}
            </span>
          </div>
          <div className="bg-white rounded-xl border border-amber-200/80 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
              Total Gross Payroll
            </span>
            <span className="text-lg font-mono font-black text-amber-900">
              LKR {formatLkr(totals.gross)}
            </span>
          </div>
          <div className="bg-emerald-50/70 rounded-xl border border-emerald-200 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
              Total Net Payroll
            </span>
            <span className="text-lg font-mono font-black text-emerald-900">
              LKR {formatLkr(totals.net)}
            </span>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-2xl text-sm flex items-center gap-3 shadow-xs border print:hidden ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{statusMsg.text}</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center p-6 text-slate-500 text-xs gap-2 print:hidden">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          Loading payroll data for {month}...
        </div>
      )}

      {/* Full-Width Official Master Salary Sheet (Optimized for A4 Landscape Print) */}
      <div className="salary-sheet-container bg-white p-6 rounded-xl border border-slate-300 shadow-sm overflow-x-auto print:w-full print:border-none print:shadow-none print:p-0 print:m-0 print:overflow-visible">
        <style dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: A4 landscape;
              margin: 5mm;
            }
            @media print {
              html, body {
                width: 100% !important;
                background: white !important;
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print\\:hidden {
                display: none !important;
              }
              .salary-sheet-container {
                width: 100% !important;
                max-width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
                overflow: visible !important;
              }
              .salary-sheet-table {
                width: 100% !important;
                table-layout: fixed !important;
                border-collapse: collapse !important;
              }
              .salary-sheet-table th {
                font-size: 6.8pt !important;
                padding: 2px 1px !important;
                line-height: 1.1 !important;
                background-color: #f1f5f9 !important;
                -webkit-print-color-adjust: exact !important;
              }
              .salary-sheet-table td {
                font-size: 7.2pt !important;
                padding: 2px 1px !important;
                line-height: 1.1 !important;
              }
              .salary-sheet-header h1 {
                font-size: 14pt !important;
                margin-bottom: 1px !important;
              }
              .salary-sheet-header h2 {
                font-size: 9.5pt !important;
                margin-bottom: 1px !important;
              }
              .salary-sheet-header h3 {
                font-size: 11pt !important;
                margin-bottom: 1px !important;
              }
              .salary-sheet-header h4 {
                font-size: 9.5pt !important;
                margin-bottom: 4px !important;
              }
            }
          `
        }} />

        {/* Sheet Headers matching Image 1 */}
        <div className="salary-sheet-header text-center space-y-0.5 mb-3 print:mb-2">
          <h1 className="text-xl sm:text-2xl font-black tracking-widest text-black font-serif uppercase">
            DINUSHA EMBROIDERY
          </h1>
          <h2 className="text-sm sm:text-base font-bold text-black font-serif">Weliweriya</h2>
          <h3 className="text-lg sm:text-xl font-black text-black font-serif">2026 Salary sheet</h3>
          <h4 className="text-sm sm:text-base font-bold text-black tracking-wider uppercase underline">
            {month.toUpperCase()}
          </h4>
        </div>

        {/* Master Table - 19 printable columns + inline on-screen Payment Status column */}
        <table className="salary-sheet-table w-full text-left border-collapse border border-black text-[10px] leading-tight table-auto print:table-fixed">
          <thead>
            <tr className="bg-slate-100 text-black font-bold border-b border-black text-center">
              <th className="border border-black py-1 px-0.5 w-[3%]">NO</th>
              <th className="border border-black py-1 px-1 text-left w-[12%]">Name</th>
              <th className="border border-black py-1 px-0.5 w-[5.5%]">Basic+Bud</th>
              <th className="border border-black py-1 px-0.5 w-[5.5%]">
                Allowance <br />(Production)
              </th>
              <th className="border border-black py-1 px-0.5 w-[5.5%]">
                Allowance <br />(Grade)
              </th>
              <th className="border border-black py-1 px-0.5 w-[4.5%]">Att All</th>
              <th className="border border-black py-1 px-0.5 w-[5%]">
                Transport <br />Allowance
              </th>
              <th className="border border-black py-1 px-0.5 w-[4.5%]">Over Hour</th>
              <th className="border border-black py-1 px-0.5 w-[5%]">Over</th>
              <th className="border border-black py-1 px-0.5 w-[4%]">SP H</th>
              <th className="border border-black py-1 px-0.5 w-[4.5%]">Sp O.T</th>
              <th className="border border-black py-1 px-0.5 w-[6%]">Gross sal</th>
              <th className="border border-black py-1 px-0.5 w-[5%]">EPF 8%</th>
              <th className="border border-black py-1 px-0.5 w-[4.5%]">Late& Early(mm)</th>
              <th className="border border-black py-1 px-0.5 w-[5%]">Late & Early</th>
              <th className="border border-black py-1 px-0.5 w-[4%]">No Pay Hours</th>
              <th className="border border-black py-1 px-0.5 w-[5%]">No Pay</th>
              <th className="border border-black py-1 px-0.5 w-[6.5%] font-black">Net Sal</th>
              <th className="border border-black py-1 px-1 w-[10%]">Sign</th>
              <th className="border border-black py-1 px-2 text-center print:hidden whitespace-nowrap">
                Salary Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black font-mono text-[9.5px]">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={20}
                  className="border border-black py-10 px-4 text-center font-sans text-xs text-slate-600 bg-slate-50/70"
                >
                  {loading
                    ? `Loading calculated salaries for ${month}...`
                    : `No salaries have been calculated and saved for ${month} yet. Open the Salary Calculator tab to calculate & save salaries for this month.`}
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const isPaid = r.status === 'PAID';
                const isBusy = actionEmpId === r.employeeId;

                return (
                  <tr
                    key={r.employeeId}
                    className={isPaid ? 'bg-emerald-50/25 hover:bg-emerald-50/40' : 'hover:bg-slate-50'}
                  >
                    <td className="border border-black py-0.5 px-0.5 text-center font-bold">{r.epfNo}</td>
                    <td
                      className="border border-black py-0.5 px-1 font-sans font-medium text-left truncate"
                      title={r.name}
                    >
                      {r.name}
                    </td>
                    <td className="border border-black py-0.5 px-0.5 text-right">{formatLkr(r.basic)}</td>
                    <td className="border border-black py-0.5 px-0.5 text-right">{formatLkr(r.prodAllow)}</td>
                    <td className="border border-black py-0.5 px-0.5 text-right">{formatLkr(r.gradeAllow)}</td>
                    <td className="border border-black py-0.5 px-0.5 text-right">{formatLkr(r.attAllow)}</td>
                    <td className="border border-black py-0.5 px-0.5 text-right">{formatLkr(r.transAllow)}</td>
                    <td className="border border-black py-0.5 px-0.5 text-center font-semibold">
                      {r.otHours.toFixed(2)}
                    </td>
                    <td className="border border-black py-0.5 px-0.5 text-right">{formatLkr(r.otAmt)}</td>
                    <td className="border border-black py-0.5 px-0.5 text-center">{r.sotHours.toFixed(2)}</td>
                    <td className="border border-black py-0.5 px-0.5 text-right">{formatLkr(r.sotAmt)}</td>
                    <td className="border border-black py-0.5 px-0.5 text-right font-bold bg-amber-50/30">
                      {formatLkr(r.gross)}
                    </td>
                    <td className="border border-black py-0.5 px-0.5 text-right">{formatLkr(r.epf8)}</td>
                    <td className="border border-black py-0.5 px-0.5 text-center">{r.lateHours.toFixed(2)}</td>
                    <td className="border border-black py-0.5 px-0.5 text-right">{formatLkr(r.lateDeduction)}</td>
                    <td className="border border-black py-0.5 px-0.5 text-center">{r.unpaidDays.toFixed(2)}</td>
                    <td className="border border-black py-0.5 px-0.5 text-right">{formatLkr(r.unpaidDeduction)}</td>
                    <td className="border border-black py-0.5 px-0.5 text-right font-black text-black bg-emerald-50/40 text-[10px]">
                      {formatLkr(r.net)}
                    </td>
                    <td className="border border-black py-0.5 px-1"></td>
                    <td className="border border-black py-1 px-1.5 text-center font-sans print:hidden whitespace-nowrap">
                      {isPaid ? (
                        <div className="inline-flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                            <Lock className="w-3 h-3" />
                            PAID
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setUnlockError(null);
                              setUnlockTarget(r);
                            }}
                            title="Admin Approval Required to Unlock"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold transition cursor-pointer"
                          >
                            <Unlock className="w-3 h-3" />
                            Unlock
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleMarkPaid(r)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          {isBusy ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <BadgeCheck className="w-3 h-3" />
                          )}
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}

            {/* Bottom Total Summary Row - Only Net Sal total shown */}
            <tr className="bg-slate-200 font-bold border-t-2 border-black text-black text-[9.5px]">
              <td colSpan={17} className="border border-black py-1.5 px-2 text-right font-black uppercase tracking-wider">
                TOTAL NET SALARY ({rows.length} Calculated)
              </td>
              <td className="border border-black py-1.5 px-0.5 text-right font-black text-emerald-950 bg-emerald-100/60 text-[10.5px]">
                {formatLkr(totals.net)}
              </td>
              <td className="border border-black py-1.5 px-1"></td>
              <td className="border border-black py-1.5 px-1.5 text-center font-sans text-[10px] font-bold text-slate-700 print:hidden whitespace-nowrap">
                {paidCount} / {rows.length} Paid
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {unlockTarget && (
        <AdminUnlockModal
          isOpen={!!unlockTarget}
          employeeName={unlockTarget.name}
          epfNo={unlockTarget.epfNo}
          month={month}
          netSalary={unlockTarget.net}
          loading={unlockLoading}
          errorMsg={unlockError}
          onClose={() => setUnlockTarget(null)}
          onConfirm={handleAdminUnlock}
        />
      )}
    </div>
  );
}
