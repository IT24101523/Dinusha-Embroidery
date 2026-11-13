'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { EmployeeEntity, PayrollCalculationBreakdown } from '@/modules/payroll/domain/entities';
import { fetchMonthlyRecordsAction } from '@/actions/payroll';
import { generateEpfEtfData, exportToExcel } from '@/modules/payroll/domain/epf-etf-utils';
import {
  FileSpreadsheet,
  Calendar,
  Printer,
  FileCheck2,
  TableProperties,
  Loader2,
} from 'lucide-react';

interface EpfFormCProps {
  employees: EmployeeEntity[];
}

export function EpfFormC({ employees }: EpfFormCProps) {
  const [month, setMonth] = useState<string>('October 2026');
  const [viewMode, setViewMode] = useState<'formC' | 'excelReturn'>('formC');
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

  // Compute EPF rows matching Image 3 & 4
  const epfRows = useMemo(() => {
    return generateEpfEtfData(employees, savedRecords, month);
  }, [employees, savedRecords, month]);

  // Totals
  const totals = useMemo(() => {
    return epfRows.reduce(
      (acc, r) => ({
        totalEpf20: acc.totalEpf20 + r.totalEpf20,
        epf12: acc.epf12 + r.epf12,
        epf8: acc.epf8 + r.epf8,
        basicEarnings: acc.basicEarnings + r.basicEarnings,
      }),
      { totalEpf20: 0, epf12: 0, epf8: 0, basicEarnings: 0 }
    );
  }, [epfRows]);

  // Excel Export matching Image 3 (EPF e-Return submission format)
  const handleExportEpfExcel = () => {
    const excelData = epfRows.map((r) => ({
      'NIC Number': r.nic,
      Surname: r.surname,
      initials: r.initials,
      'Member Number': r.memberNo,
      'Total Contribution': r.totalEpf20,
      "Employer's Contribution": r.epf12,
      "Member's Contribution": r.epf8,
      'Total Earnings': r.basicEarnings,
      'Member Status E=Extg. N=New': r.status,
      Zone: r.zone,
      'Employer Number': r.employerNumber,
      'Contribution Period (YYYYMM)': r.period,
      'Data Submission Number': 1,
      'No.of days worked': r.daysWorked.toFixed(2),
      'Occupation Classification Grade': '',
    }));

    exportToExcel(
      [{ name: 'EPF e-Return', data: excelData }],
      `EPF_C_Return_${month.replace(/\s+/g, '_')}_14585`
    );
  };

  // Excel Export matching Image 4 (Form C layout)
  const handleExportFormCExcel = () => {
    const excelData = epfRows.map((r, index) => ({
      No: index + 1,
      "Employee's Name": r.formCName,
      'National Id. No.': r.nic,
      'Member No': r.memberNo,
      'Total Contributions (Rs.)': r.totalEpf20,
      'Employer (12%)': r.epf12,
      'Employee (8%)': r.epf8,
      'Total Earnings / Pay': r.basicEarnings,
    }));

    excelData.push({
      No: 0,
      "Employee's Name": 'TOTAL',
      'National Id. No.': '',
      'Member No': 0,
      'Total Contributions (Rs.)': totals.totalEpf20,
      'Employer (12%)': totals.epf12,
      'Employee (8%)': totals.epf8,
      'Total Earnings / Pay': totals.basicEarnings,
    });

    exportToExcel(
      [{ name: 'Form C', data: excelData }],
      `FORM_C_EPF_${month.replace(/\s+/g, '_')}_1G_014585`
    );
  };

  const formatLkr = (num: number) => {
    return (num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {/* Control Studio & Statutory Summary Strip (Hidden on Print) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden print:hidden">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight text-white">
                EMPLOYEES&apos; PROVIDENT FUND (EPF) &amp; FORM C
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/30 text-indigo-100 border border-indigo-400/40">
                {month}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Official Form C (EPF Act No. 15 of 1958) &amp; Central Bank e-Return Excel generator
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-white/10 rounded-xl border border-white/15 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('formC')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'formC'
                    ? 'bg-white text-indigo-950 shadow-xs font-bold'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                Official FORM C View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('excelReturn')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'excelReturn'
                    ? 'bg-white text-indigo-950 shadow-xs font-bold'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                <TableProperties className="w-3.5 h-3.5" />
                EPF e-Return Table View
              </button>
            </div>

            {/* Month Selector */}
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

            {/* Action Buttons */}
            <button
              type="button"
              onClick={viewMode === 'formC' ? handleExportFormCExcel : handleExportEpfExcel}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {viewMode === 'formC' ? 'Download Form C Excel' : 'Download e-Return Excel'}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Form C (A4)
            </button>
          </div>
        </div>

        {/* 4 Summary Stat Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-50/70">
          <div className="bg-white rounded-xl border border-slate-200/80 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Total EPF Members
            </span>
            <span className="text-lg font-mono font-black text-slate-900">
              {epfRows.length} Staff
            </span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200/80 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Employer Share (12%)
            </span>
            <span className="text-lg font-mono font-black text-slate-900">
              LKR {formatLkr(totals.epf12)}
            </span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200/80 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Employee Share (8%)
            </span>
            <span className="text-lg font-mono font-black text-slate-900">
              LKR {formatLkr(totals.epf8)}
            </span>
          </div>
          <div className="bg-indigo-50/70 rounded-xl border border-indigo-200 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 block">
              Total Remittance (20%)
            </span>
            <span className="text-lg font-mono font-black text-indigo-950">
              LKR {formatLkr(totals.totalEpf20)}
            </span>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center p-4 text-slate-500 text-xs gap-2 print:hidden">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          Loading EPF data for {month}...
        </div>
      )}

      {/* VIEW MODE 1: OFFICIAL FORM C (Exact replica of Image 4) */}
      {viewMode === 'formC' && (
        <div className="bg-white p-6 sm:p-10 rounded-xl border border-slate-300 shadow-sm overflow-x-auto print:border-none print:shadow-none print:p-0 max-w-5xl mx-auto">
          <style jsx global>{`
            @page {
              size: A4 portrait;
              margin: 8mm;
            }
            @media print {
              body {
                background: white !important;
              }
              .print\\:hidden {
                display: none !important;
              }
            }
          `}</style>

          {/* Header Title (Matches Image 4) */}
          <div className="text-center mb-4">
            <h1 className="text-2xl font-black text-black tracking-wide font-sans">FORM C</h1>
            <h2 className="text-sm font-bold text-black font-sans">EPF Act No. 15 of 1958</h2>
          </div>

          {/* Metadata & Remittance Summary Box (Matches Image 4 top section) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mb-4 text-xs font-sans">
            {/* Left metadata */}
            <div className="sm:col-span-7 space-y-1">
              <div>
                <span className="font-bold">EPF Registration No:</span>{' '}
                <strong className="font-black text-sm">1G 014585</strong>
              </div>
              <div>
                <span className="font-bold">Month and Year of Contribution:</span>{' '}
                <strong className="font-bold">{month}</strong>
              </div>
              <div>
                <span className="font-bold">Employer Name:</span> Dinusha Embroidery (Pvt) Ltd
              </div>
            </div>

            {/* Right Remittance Summary Table */}
            <div className="sm:col-span-5">
              <table className="w-full border-collapse border-2 border-black text-xs font-mono font-bold">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="py-1 px-3 border-r border-black font-sans bg-slate-50">
                      Contributions:
                    </td>
                    <td className="py-1 px-3 text-right text-sm">
                      {formatLkr(totals.totalEpf20)}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="py-1 px-3 border-r border-black font-sans bg-slate-50">
                      Surcharges:
                    </td>
                    <td className="py-1 px-3 text-right">-</td>
                  </tr>
                  <tr className="bg-slate-100">
                    <td className="py-1 px-3 border-r border-black font-sans font-black">
                      Total Remittance:
                    </td>
                    <td className="py-1 px-3 text-right font-black text-sm text-black">
                      {formatLkr(totals.totalEpf20)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Form C Table (Exact replica of Image 4) */}
          <table className="w-full border-collapse border-2 border-black text-xs font-sans">
            <thead>
              <tr className="bg-slate-100 text-black font-bold border-b-2 border-black text-center">
                <th className="border border-black py-2 px-1.5 w-10">No</th>
                <th className="border border-black py-2 px-3 text-left">Employee&apos;s Name</th>
                <th className="border border-black py-2 px-2 w-32">National Id. No.</th>
                <th className="border border-black py-2 px-2 w-20">Member No</th>
                <th className="border border-black py-2 px-2 w-32 text-right">
                  Total Contributions (Rs.)
                </th>
                <th className="border border-black py-2 px-2 w-28 text-right">Employer (12%)</th>
                <th className="border border-black py-2 px-2 w-28 text-right">Employee (8%)</th>
                <th className="border border-black py-2 px-2 w-28 text-right">
                  Total Earnings / Pay
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black font-mono text-[11px] text-black">
              {epfRows.map((r, index) => (
                <tr key={r.memberNo} className="hover:bg-slate-50">
                  <td className="border border-black py-1.5 px-1.5 text-center font-bold">
                    {index + 1}
                  </td>
                  <td className="border border-black py-1.5 px-3 font-sans font-bold text-left tracking-wide">
                    {r.formCName}
                  </td>
                  <td className="border border-black py-1.5 px-2 text-center text-slate-700">
                    {r.nic}
                  </td>
                  <td className="border border-black py-1.5 px-2 text-center font-bold">
                    {r.memberNo}
                  </td>
                  <td className="border border-black py-1.5 px-2 text-right font-black">
                    {formatLkr(r.totalEpf20)}
                  </td>
                  <td className="border border-black py-1.5 px-2 text-right">
                    {formatLkr(r.epf12)}
                  </td>
                  <td className="border border-black py-1.5 px-2 text-right">
                    {formatLkr(r.epf8)}
                  </td>
                  <td className="border border-black py-1.5 px-2 text-right text-slate-600">
                    {formatLkr(r.basicEarnings)}
                  </td>
                </tr>
              ))}

              {/* Total Row matching Image 4 */}
              <tr className="bg-slate-200 font-bold border-t-2 border-black text-black text-xs">
                <td colSpan={4} className="border border-black py-2.5 px-3 text-right font-black uppercase">
                  TOTAL
                </td>
                <td className="border border-black py-2.5 px-2 text-right font-black text-sm">
                  {formatLkr(totals.totalEpf20)}
                </td>
                <td className="border border-black py-2.5 px-2 text-right font-black text-sm">
                  {formatLkr(totals.epf12)}
                </td>
                <td className="border border-black py-2.5 px-2 text-right font-black text-sm">
                  {formatLkr(totals.epf8)}
                </td>
                <td className="border border-black py-2.5 px-2 text-right font-black text-sm text-slate-700">
                  {formatLkr(totals.basicEarnings)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW MODE 2: EPF e-RETURN TABLE (Exact replica of Image 3) */}
      {viewMode === 'excelReturn' && (
        <div className="bg-white p-6 rounded-xl border border-slate-300 shadow-sm overflow-x-auto print:border-none print:shadow-none print:p-0">
          <div className="mb-3 flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700">
              EPF Central Bank Electronic Data Submission Format (Image 3)
            </span>
            <span className="text-slate-500">Total Rows: {epfRows.length}</span>
          </div>

          <table className="w-full border-collapse border border-blue-900 text-[11px] leading-tight">
            <thead>
              <tr className="bg-blue-950 text-white font-semibold text-center border-b border-blue-900">
                <th className="border border-blue-900 py-2 px-2 text-left">NIC Number</th>
                <th className="border border-blue-900 py-2 px-2 text-left">Surname</th>
                <th className="border border-blue-900 py-2 px-2">initials</th>
                <th className="border border-blue-900 py-2 px-2">Member Number</th>
                <th className="border border-blue-900 py-2 px-2 text-right">Total Contribution</th>
                <th className="border border-blue-900 py-2 px-2 text-right">Employer&apos;s Contribution</th>
                <th className="border border-blue-900 py-2 px-2 text-right">Member&apos;s Contribution</th>
                <th className="border border-blue-900 py-2 px-2 text-right">Total Earnings</th>
                <th className="border border-blue-900 py-2 px-1 text-center">Member Status</th>
                <th className="border border-blue-900 py-2 px-1">Zone</th>
                <th className="border border-blue-900 py-2 px-2">Employer Number</th>
                <th className="border border-blue-900 py-2 px-2">Contribution Period</th>
                <th className="border border-blue-900 py-2 px-1">Data Submission</th>
                <th className="border border-blue-900 py-2 px-2">No.of days worked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[10px]">
              {epfRows.map((r) => (
                <tr key={r.memberNo} className="hover:bg-slate-50">
                  <td className="border border-slate-300 py-1.5 px-2 font-semibold">{r.nic}</td>
                  <td className="border border-slate-300 py-1.5 px-2 font-bold font-sans">{r.surname}</td>
                  <td className="border border-slate-300 py-1.5 px-2 text-center tracking-widest">{r.initials}</td>
                  <td className="border border-slate-300 py-1.5 px-2 text-center font-bold">{r.memberNo}</td>
                  <td className="border border-slate-300 py-1.5 px-2 text-right font-black">{r.totalEpf20.toFixed(2)}</td>
                  <td className="border border-slate-300 py-1.5 px-2 text-right">{r.epf12.toFixed(2)}</td>
                  <td className="border border-slate-300 py-1.5 px-2 text-right">{r.epf8.toFixed(2)}</td>
                  <td className="border border-slate-300 py-1.5 px-2 text-right">{r.basicEarnings.toFixed(2)}</td>
                  <td className="border border-slate-300 py-1.5 px-1 text-center font-bold text-indigo-700">{r.status}</td>
                  <td className="border border-slate-300 py-1.5 px-1 text-center">{r.zone}</td>
                  <td className="border border-slate-300 py-1.5 px-2 text-center">{r.employerNumber}</td>
                  <td className="border border-slate-300 py-1.5 px-2 text-center">{r.period}</td>
                  <td className="border border-slate-300 py-1.5 px-1 text-center">1</td>
                  <td className="border border-slate-300 py-1.5 px-2 text-center">{r.daysWorked.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

