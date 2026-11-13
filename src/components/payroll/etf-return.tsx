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

  const totalBasicEarnings = useMemo(() => {
    return etfRows.reduce((sum, r) => sum + r.basicEarnings, 0);
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
      {/* Top Studio Header & Summary Cards (Hidden on Print) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden print:hidden">
        <div className="bg-gradient-to-r from-slate-900 via-amber-950/90 to-slate-900 text-white p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-white">
                  EMPLOYEES&apos; TRUST FUND (ETF 3%) RETURN
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-200 border border-amber-400/30">
                  {month}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Official monthly ETF 3% statutory remittance schedule &amp; Excel generator
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-white/15 text-xs font-semibold text-white">
              <Calendar className="w-4 h-4 text-amber-300" />
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
              Generate ETF Excel (.xlsx)
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print ETF Return
            </button>
          </div>
        </div>

        {/* 3 Executive Stat Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50/70">
          <div className="bg-white rounded-xl border border-slate-200/80 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Contributing Members
            </span>
            <span className="text-lg font-mono font-black text-slate-900">
              {etfRows.length} Members
            </span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200/80 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Contributory Earnings
            </span>
            <span className="text-lg font-mono font-black text-slate-900">
              LKR {formatLkr(totalBasicEarnings)}
            </span>
          </div>
          <div className="bg-amber-50/70 rounded-xl border border-amber-200 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
              Total ETF 3% Remittance
            </span>
            <span className="text-lg font-mono font-black text-amber-950">
              LKR {formatLkr(totalEtf)}
            </span>
          </div>
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
