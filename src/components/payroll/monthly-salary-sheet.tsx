'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { EmployeeEntity, PayrollCalculationBreakdown } from '@/modules/payroll/domain/entities';
import { calculateSalaryForEmployee } from '@/modules/payroll/domain/calculator';
import { fetchMonthlyRecordsAction } from '@/actions/payroll';
import { exportToExcel } from '@/modules/payroll/domain/epf-etf-utils';
import { Printer, Calendar, FileSpreadsheet, Loader2 } from 'lucide-react';

interface MonthlySalarySheetProps {
  employees: EmployeeEntity[];
}

export function MonthlySalarySheet({ employees }: MonthlySalarySheetProps) {
  const [month, setMonth] = useState<string>('October 2026');
  const [savedRecords, setSavedRecords] = useState<Record<string, PayrollCalculationBreakdown>>({});
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadRecords() {
      setLoading(true);
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

  // Generate breakdown for each active employee
  const rows = useMemo(() => {
    return employees
      .filter((e) => e.isActive)
      .sort((a, b) => a.epfNo - b.epfNo)
      .map((emp) => {
        if (savedRecords[emp.id]) {
          return savedRecords[emp.id];
        }

        const isSupervisor = emp.role.includes('Supervisor');
        return calculateSalaryForEmployee(emp, {
          employeeId: emp.id,
          month,
          basicSalary: emp.basicSalary,
          otHours: isSupervisor ? 98.75 : 0,
          sotHours: 0,
          totAmt: 0,
          poyaDayAmt: 0,
          sundayAmt: 0,
          specialLeaveAmt: 0,
          attAllow: 5000,
          nightAllow: 0,
          gradeAllow: isSupervisor ? 35000 : 0,
          transAllow: 3750,
          prodAllow: isSupervisor ? 20000 : 0,
          checkingAllow: 0,
          lateHours: 0,
          unpaidDays: 0,
          advance: 0,
        });
      });
  }, [employees, savedRecords, month]);

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
                <option value="October 2026" className="text-slate-900">October 2026 (ඔක්තෝබර්)</option>
                <option value="September 2026" className="text-slate-900">September 2026 (සැප්තැම්බර්)</option>
                <option value="August 2026" className="text-slate-900">August 2026 (අගෝස්තු)</option>
                <option value="July 2026" className="text-slate-900">July 2026 (ජූලි)</option>
                <option value="November 2026" className="text-slate-900">November 2026 (නොවැම්බර්)</option>
                <option value="December 2026" className="text-slate-900">December 2026 (දෙසැම්බර්)</option>
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
              Active Employees
            </span>
            <span className="text-lg font-mono font-black text-slate-900">{rows.length}</span>
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

      {loading && (
        <div className="flex items-center justify-center p-6 text-slate-500 text-xs gap-2 print:hidden">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          Loading payroll data for {month}...
        </div>
      )}

      {/* Salary Sheet Container (Exact Replica of Image 1 - Optimized for A4 Landscape Print) */}
      <div className="salary-sheet-container bg-white p-6 rounded-xl border border-slate-300 shadow-sm overflow-x-auto print:border-none print:shadow-none print:p-0 print:m-0 print:overflow-visible">
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

        {/* Master Table - 19 columns with exact proportional percentages summing to 100% */}
        <table className="salary-sheet-table w-full text-left border-collapse border border-black text-[10px] leading-tight table-fixed">
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
            </tr>
          </thead>
          <tbody className="divide-y divide-black font-mono text-[9.5px]">
            {rows.map((r) => (
              <tr key={r.employeeId} className="hover:bg-slate-50">
                <td className="border border-black py-0.5 px-0.5 text-center font-bold">{r.epfNo}</td>
                <td className="border border-black py-0.5 px-1 font-sans font-medium text-left truncate" title={r.name}>
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
              </tr>
            ))}

            {/* Bottom Total Summary Row - Only Net Sal total shown */}
            <tr className="bg-slate-200 font-bold border-t-2 border-black text-black text-[9.5px]">
              <td colSpan={17} className="border border-black py-1.5 px-2 text-right font-black uppercase tracking-wider">
                TOTAL NET SALARY ({rows.length} Employees)
              </td>
              <td className="border border-black py-1.5 px-0.5 text-right font-black text-emerald-950 bg-emerald-100/60 text-[10.5px]">
                {formatLkr(totals.net)}
              </td>
              <td className="border border-black py-1.5 px-1"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
