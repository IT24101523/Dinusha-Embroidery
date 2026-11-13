'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { EmployeeEntity, PayrollCalculationBreakdown } from '@/modules/payroll/domain/entities';
import { fetchMonthlyRecordsAction } from '@/actions/payroll';
import { generateEpfEtfData, exportToExcel } from '@/modules/payroll/domain/epf-etf-utils';
import { FileSpreadsheet, Calendar, Printer, Loader2, ShieldCheck } from 'lucide-react';

interface EtfReturnProps {
  employees: EmployeeEntity[];
}

export function EtfReturn({ employees }: EtfReturnProps) {
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

  // Generate standardized ETF return rows matching Image 2
  const etfRows = useMemo(() => {
    return generateEpfEtfData(employees, savedRecords, month);
  }, [employees, savedRecords, month]);

  const totalEtf = useMemo(() => {
    return etfRows.reduce((sum, r) => sum + r.etf3, 0);
  }, [etfRows]);

  const handleExportExcel = () => {
    const excelData = etfRows.map((r) => ({
      'Member Number': r.memberNo,
      Initials: r.initials,
      Surname: r.surname,
      'NIC Number': r.nic,
      'Monthly Contribution': r.etf3,
    }));

    // Append TOTAL row
    excelData.push({
      'Member Number': 0,
      Initials: '',
      Surname: 'TOTAL',
      'NIC Number': '',
      'Monthly Contribution': totalEtf,
    });

    exportToExcel(
      [{ name: 'ETF Return', data: excelData }],
      `ETF_Return_${month.replace(/\s+/g, '_')}_Dinusha_Embroidery`
    );
  };

  const formatLkr = (num: number) => {
    return (num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">
                EMPLOYEES’ TRUST FUND (ETF 3%) RETURN
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                {month}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Official monthly ETF contribution schedule & Excel upload format (Image 2)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>Month:</span>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-transparent border-none text-slate-900 font-bold focus:outline-hidden"
            >
              <option value="October 2026">October 2026 (ඔක්තෝබර්)</option>
              <option value="September 2026">September 2026 (සැප්තැම්බර්)</option>
              <option value="August 2026">August 2026 (අගෝස්තු)</option>
              <option value="July 2026">July 2026 (ජූලි)</option>
              <option value="November 2026">November 2026 (නොවැම්බර්)</option>
              <option value="December 2026">December 2026 (දෙසැම්බර්)</option>
            </select>
          </div>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition flex items-center gap-2 shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Generate ETF Excel (.xlsx)
          </button>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition flex items-center gap-2 shadow-xs"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            Print ETF Return
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center p-4 text-slate-500 text-xs gap-2 print:hidden">
          <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
          Loading ETF contribution data for {month}...
        </div>
      )}

      {/* ETF Table matching Image 2 */}
      <div className="bg-white p-6 rounded-xl border border-slate-300 shadow-sm overflow-x-auto print:border-none print:shadow-none print:p-0">
        <style jsx global>{`
          @page {
            size: A4 portrait;
            margin: 10mm;
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

        {/* Header Information */}
        <div className="mb-4 pb-2 border-b-2 border-slate-800 flex justify-between items-end">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-wide">
              Dinusha Embroidery — ETF Monthly Return
            </h2>
            <p className="text-xs text-slate-600">
              Registration No: <strong>1G 014585</strong> | Location: <strong>Weliweriya</strong>
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 block uppercase font-bold">Contribution Month</span>
            <span className="text-sm font-extrabold text-slate-900">{month}</span>
          </div>
        </div>

        {/* Table Replica of Image 2 */}
        <table className="w-full border-collapse border border-slate-700 text-xs">
          <thead>
            <tr className="bg-slate-500 text-black font-extrabold text-left border-b-2 border-slate-700">
              <th className="border border-slate-700 py-2.5 px-3 w-32 font-black">Member Number</th>
              <th className="border border-slate-700 py-2.5 px-3 w-40 font-black">Initials</th>
              <th className="border border-slate-700 py-2.5 px-3 font-black">Surname</th>
              <th className="border border-slate-700 py-2.5 px-3 w-48 font-black">NIC Number</th>
              <th className="border border-slate-700 py-2.5 px-3 w-44 text-right font-black">
                Monthly Contribution
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 font-mono text-slate-900 text-[11px]">
            {etfRows.map((r) => (
              <tr key={r.memberNo} className="hover:bg-slate-50 transition">
                <td className="border border-slate-400 py-2 px-3 font-bold text-slate-900">
                  {r.memberNo}
                </td>
                <td className="border border-slate-400 py-2 px-3 tracking-widest font-bold">
                  {r.initials || '-'}
                </td>
                <td className="border border-slate-400 py-2 px-3 font-bold tracking-wide">
                  {r.surname}
                </td>
                <td className="border border-slate-400 py-2 px-3 font-semibold text-slate-700">
                  {r.nic}
                </td>
                <td className="border border-slate-400 py-2 px-3 text-right font-black">
                  {formatLkr(r.etf3)}
                </td>
              </tr>
            ))}

            {/* Total Row */}
            <tr className="bg-slate-200 font-bold border-t-2 border-slate-800 text-black">
              <td colSpan={4} className="border border-slate-700 py-3 px-3 text-right font-black text-xs uppercase">
                TOTAL ETF 3% REMITTANCE ({etfRows.length} Members):
              </td>
              <td className="border border-slate-700 py-3 px-3 text-right font-black text-sm text-amber-900 font-mono">
                LKR {formatLkr(totalEtf)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
