'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { EmployeeEntity, PayrollCalculationBreakdown } from '@/modules/payroll/domain/entities';
import { calculateSalaryForEmployee } from '@/modules/payroll/domain/calculator';
import { fetchMonthlyRecordsAction } from '@/actions/payroll';
import {
  Printer,
  Calendar,
  CheckSquare,
  Square,
  Scissors,
  Search,
  FileText,
} from 'lucide-react';

interface PayslipPrintManagerProps {
  employees: EmployeeEntity[];
}

export function PayslipPrintManager({ employees }: PayslipPrintManagerProps) {
  const [month, setMonth] = useState<string>('October 2026');
  const [selectedIds, setSelectedIds] = useState<string[]>(() => employees.map((e) => e.id));
  const [savedRecords, setSavedRecords] = useState<Record<string, PayrollCalculationBreakdown>>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [, setLoading] = useState<boolean>(false);

  // Load saved monthly records from database whenever month changes
  useEffect(() => {
    let isMounted = true;
    async function loadMonthlyRecords() {
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

    loadMonthlyRecords();
    return () => {
      isMounted = false;
    };
  }, [month]);

  // Compute breakdown for all selected employees (either saved from DB, or dynamic default)
  const payslipsToPrint: PayrollCalculationBreakdown[] = useMemo(() => {
    return employees
      .filter((emp) => selectedIds.includes(emp.id))
      .map((emp) => {
        if (savedRecords[emp.id]) {
          return savedRecords[emp.id];
        }

        // Calculate sample/default breakdown if not explicitly saved yet
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
  }, [employees, selectedIds, savedRecords, month]);

  // Group into pairs of 2 for A4 pages (2 payslips per sheet)
  const pairedSheets = useMemo(() => {
    const pairs: [PayrollCalculationBreakdown, PayrollCalculationBreakdown | null][] = [];
    for (let i = 0; i < payslipsToPrint.length; i += 2) {
      pairs.push([payslipsToPrint[i], payslipsToPrint[i + 1] || null]);
    }
    return pairs;
  }, [payslipsToPrint]);

  const totalBatchNet = useMemo(() => {
    return payslipsToPrint.reduce((sum, p) => sum + (p.net || 0), 0);
  }, [payslipsToPrint]);

  // Toggle selection
  const handleToggleSelectAll = () => {
    if (selectedIds.length === employees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(employees.map((e) => e.id));
    }
  };

  const handleToggleEmployee = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatLkr = (num: number) => {
    return (num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(e.epfNo).includes(searchTerm) ||
      e.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Print Control & Management Studio (Hidden during Print) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden print:hidden">
        {/* Dark Studio Command Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight text-white">
                PAYSLIP PRINT STUDIO
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-200 border border-amber-400/30 flex items-center gap-1">
                <Scissors className="w-3 h-3" />
                2 Payslips Per A4 Sheet
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Select staff below to batch print 2 official bilingual payslips per A4 page with center cut guide.
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
                <option value="November 2026" className="text-slate-900">November 2026 (නොවැම්බර්)</option>
                <option value="December 2026" className="text-slate-900">December 2026 (දෙසැම්බර්)</option>
                <option value="August 2026" className="text-slate-900">August 2026 (අගෝස්තු)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              disabled={payslipsToPrint.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs sm:text-sm transition flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Batch ({pairedSheets.length} A4 Pages)
            </button>
          </div>
        </div>

        {/* Summary Stat Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-5 pt-4">
          <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Selected Staff</span>
            <span className="text-sm font-mono font-extrabold text-indigo-700">
              {selectedIds.length} / {employees.length}
            </span>
          </div>
          <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">A4 Sheets (2-Up)</span>
            <span className="text-sm font-mono font-extrabold text-amber-700">
              {pairedSheets.length} Sheets
            </span>
          </div>
          <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Total Batch Net Pay</span>
            <span className="text-sm font-mono font-black text-emerald-900">
              LKR {formatLkr(totalBatchNet)}
            </span>
          </div>
        </div>

        {/* Employee Selection Toolbar & Grid */}
        <div className="p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer"
            >
              {selectedIds.length === employees.length ? (
                <CheckSquare className="w-4 h-4 text-indigo-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              {selectedIds.length === employees.length ? 'Deselect All' : 'Select All Employees'}
            </button>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="search"
                placeholder="Search by EPF or Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50/70 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 max-h-56 overflow-y-auto p-2 border border-slate-200/80 rounded-2xl bg-slate-50/70 scrollbar-thin">
            {filteredEmployees.map((emp) => {
              const isSelected = selectedIds.includes(emp.id);
              const isSaved = Boolean(savedRecords[emp.id]);

              return (
                <label
                  key={emp.id}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition select-none ${
                    isSelected
                      ? 'bg-indigo-50/90 border-indigo-300 text-indigo-950 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/80'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleEmployee(emp.id)}
                    className="w-3.5 h-3.5 text-indigo-600 rounded-xs focus:ring-indigo-500 shrink-0"
                  />
                  {emp.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={emp.photoUrl}
                      alt={emp.fullName}
                      className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {(emp.initials || emp.fullName || '?').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono font-bold text-[11px] truncate">
                        #{emp.epfNo}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded-sm text-[9px] font-bold uppercase ${
                          isSaved
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {isSaved ? 'Saved' : 'Default'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 truncate font-medium">
                      {emp.fullName}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Printable Output Container */}
      <div className="space-y-8 print:space-y-0">
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @page {
                size: A4 portrait;
                margin: 5mm 7mm 5mm 7mm;
              }
              @media print {
                html, body {
                  background: white !important;
                  color: black !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  height: auto !important;
                  overflow: visible !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .print\\:hidden {
                  display: none !important;
                }
                .a4-sheet-container {
                  display: block !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  height: auto !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  border: none !important;
                  box-shadow: none !important;
                  break-inside: avoid !important;
                  page-break-inside: avoid !important;
                  break-after: page !important;
                  page-break-after: always !important;
                }
                .a4-sheet-container:last-child {
                  break-after: auto !important;
                  page-break-after: auto !important;
                }
                .payslip-half-block {
                  break-inside: avoid !important;
                  page-break-inside: avoid !important;
                }
              }
            `,
          }}
        />

        {pairedSheets.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center max-w-md mx-auto print:hidden">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No Employees Selected</h3>
            <p className="text-xs text-slate-500 mt-1">
              Please select one or more employees from the checkbox list above to generate payslips.
            </p>
          </div>
        ) : (
          pairedSheets.map((pair, sheetIndex) => {
            const topSlip = pair[0];
            const bottomSlip = pair[1];

            return (
              <div
                key={`sheet-${sheetIndex}`}
                className="a4-sheet-container bg-white rounded-2xl border border-slate-300/90 shadow-lg ring-1 ring-slate-200/60 max-w-4xl mx-auto p-4 sm:p-6 mb-8 relative"
              >
                {/* On-Screen Sheet Badge */}
                <div className="print:hidden flex justify-between items-center text-[11px] font-bold text-slate-400 pb-2 mb-3 border-b border-slate-200">
                  <span>A4 Sheet #{sheetIndex + 1} of {pairedSheets.length} (2-Up Format)</span>
                  <span>
                    Top: EPF {topSlip.epfNo} {topSlip.name} | Bottom:{' '}
                    {bottomSlip ? `EPF ${bottomSlip.epfNo} ${bottomSlip.name}` : '(Half blank)'}
                  </span>
                </div>

                {/* Top Payslip (Slip 1 of 2 on this A4 sheet) */}
                <div className="payslip-half-block">
                  <PayslipSingleItem record={topSlip} formatLkr={formatLkr} />
                </div>

                {/* Cutting Guide Line in the middle of A4 Sheet */}
                <div className="my-2 border-t-2 border-dashed border-slate-400 relative text-center flex items-center justify-center">
                  <span className="bg-white px-3 text-[10px] text-slate-500 font-mono flex items-center gap-1.5 -mt-2">
                    <Scissors className="w-3 h-3 text-slate-600" />
                    <span>කැපීම සඳහා සලකුණ / Cut Here (Center of A4 Sheet)</span>
                  </span>
                </div>

                {/* Bottom Payslip (Slip 2 of 2 on this A4 sheet) */}
                <div className="payslip-half-block">
                  {bottomSlip ? (
                    <PayslipSingleItem record={bottomSlip} formatLkr={formatLkr} />
                  ) : (
                    <div className="h-64 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-400 print:hidden">
                      Empty second slot on this A4 page
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/**
 * Compact Single Payslip item designed to fit precisely 2-up per A4 portrait page
 */
function PayslipSingleItem({
  record,
  formatLkr,
}: {
  record: PayrollCalculationBreakdown;
  formatLkr: (n: number) => string;
}) {
  return (
    <div className="font-sans text-black border border-black p-3 text-[11px] leading-tight bg-white">
      {/* Title */}
      <div className="text-center border-b border-black pb-1 mb-2">
        <h2 className="text-base font-black tracking-wide text-black font-serif">
          වැටුප් පත්‍රිකාව ({record.month})
        </h2>
      </div>

      {/* Top Meta Info Grid (Exact layout as Image 2) */}
      <div className="border border-black mb-2 text-[10px]">
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-black">
              <td className="w-1/4 py-0.5 px-2 font-bold border-r border-black bg-slate-50">
                නම
              </td>
              <td className="w-1/4 py-0.5 px-2 font-semibold border-r border-black truncate">
                {record.name}
              </td>
              <td colSpan={2} className="w-1/2 py-0.5 px-2 font-bold text-center bg-slate-50">
                කර්මාන්ත ශාලාව විසින් සේවකයා වෙත කරන ගෙවීම්
              </td>
            </tr>

            <tr className="border-b border-black">
              <td className="py-0.5 px-2 font-bold border-r border-black bg-slate-50">
                මාසය
              </td>
              <td className="py-0.5 px-2 border-r border-black font-medium">
                {record.month}
              </td>
              <td className="w-1/4 py-0.5 px-2 font-bold border-r border-black bg-slate-50">
                සේ.භා.අ 3%
              </td>
              <td className="w-1/4 py-0.5 px-2 text-right font-mono font-bold">
                {formatLkr(record.etf3)}
              </td>
            </tr>

            <tr className="border-b border-black">
              <td className="py-0.5 px-2 font-bold border-r border-black bg-slate-50">
                සේ.අ.අ අංකය
              </td>
              <td className="py-0.5 px-2 border-r border-black font-mono font-black text-xs">
                {record.epfNo}
              </td>
              <td className="py-0.5 px-2 font-bold border-r border-black bg-slate-50">
                සේ.අ.අ 12%
              </td>
              <td className="py-0.5 px-2 text-right font-mono font-bold">
                {formatLkr(record.epf12)}
              </td>
            </tr>

            <tr className="border-b border-black">
              <td className="py-0.5 px-2 font-bold border-r border-black bg-slate-50">
                තනතුර
              </td>
              <td className="py-0.5 px-2 border-r border-black truncate font-medium">
                {record.role}
              </td>
              <td colSpan={2} className="border-black"></td>
            </tr>

            <tr className="border-b border-black">
              <td className="py-0.5 px-2 font-bold border-r border-black bg-slate-50">
                දෙපාර්තමේන්තුව
              </td>
              <td className="py-0.5 px-2 border-r border-black font-medium">
                {record.department || 'නිෂ්පාදන අංශය'}
              </td>
              <td colSpan={2} className="border-black"></td>
            </tr>

            <tr className="border-b border-black">
              <td className="py-0.5 px-2 font-bold border-r border-black bg-slate-50">
                ශ්‍රේණිය
              </td>
              <td className="py-0.5 px-2 border-r border-black font-medium">
                {record.grade || '-'}
              </td>
              <td colSpan={2} className="border-black"></td>
            </tr>

            <tr className="border-b border-black">
              <td className="py-0.5 px-2 font-bold border-r border-black bg-slate-50">
                සේවක බැංකුව
              </td>
              <td className="py-0.5 px-2 border-r border-black font-medium">
                {record.bankName || '-'}
              </td>
              <td colSpan={2} className="border-black"></td>
            </tr>

            <tr>
              <td className="py-0.5 px-2 font-bold border-r border-black bg-slate-50">
                ගිණුම් අංකය
              </td>
              <td className="py-0.5 px-2 border-r border-black font-mono font-semibold">
                {record.accountNo || '-'}
              </td>
              <td colSpan={2} className="border-black"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Two Columns: Earnings (එකතු කිරීම්) & Deductions (අඩුකිරීම්) */}
      <div className="grid grid-cols-2 gap-4 text-[10px]">
        {/* Earnings */}
        <div>
          <div className="text-center font-bold border-b border-black pb-0.5 mb-1.5">
            එකතු කිරීම්
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span>මූලික වැටුප</span>
              <span className="font-mono font-semibold">{formatLkr(record.basic)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span>නිෂ්පාදන දීමනාව</span>
              <span className="font-mono font-semibold">{formatLkr(record.prodAllow)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span>ශ්‍රේණිගත දීමනාව</span>
              <span className="font-mono font-semibold">{formatLkr(record.gradeAllow)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span>පැමිණීමේ දීමනාව</span>
              <span className="font-mono font-semibold">{formatLkr(record.attAllow)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span>ප්‍රවාහන දීමනාව</span>
              <span className="font-mono font-semibold">{formatLkr(record.transAllow)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span>රාත්‍රී දීමනාව</span>
              <span className="font-mono font-semibold">{formatLkr(record.nightAllow)}</span>
            </div>

            {/* Normal OT */}
            <div className="flex justify-between items-center">
              <span>සාමාන්‍ය අතිකාල දීමනාව</span>
              <div className="flex items-center gap-1.5">
                <span className="inline-block border border-black px-1.5 py-0.2 text-[9px] font-mono font-bold bg-slate-50 min-w-10 text-center">
                  {record.otHours}
                </span>
                <span className="font-mono font-semibold min-w-14 text-right">
                  {formatLkr(record.otAmt)}
                </span>
              </div>
            </div>

            {/* Double OT */}
            <div className="flex justify-between items-center">
              <span>ද්විත්ව අතිකාල දීමනාව</span>
              <div className="flex items-center gap-1.5">
                <span className="inline-block border border-black px-1.5 py-0.2 text-[9px] font-mono font-bold bg-slate-50 min-w-10 text-center">
                  {record.sotHours}
                </span>
                <span className="font-mono font-semibold min-w-14 text-right">
                  {formatLkr(record.sotAmt)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span>ත්‍රිත්ව අතිකාල දීමනාව</span>
              <span className="font-mono font-semibold">{formatLkr(record.totAmt)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span>පොහෝය දින</span>
              <span className="font-mono font-semibold">{formatLkr(record.poyaDayAmt)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span>ඉරිදා ගෙවීම්</span>
              <span className="font-mono font-semibold">{formatLkr(record.sundayAmt)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span>විශේෂ නිවාඩු</span>
              <span className="font-mono font-semibold">{formatLkr(record.specialLeaveAmt)}</span>
            </div>
          </div>

          <div className="mt-2 pt-1 border-t border-b border-black flex justify-between items-center font-bold text-[11px]">
            <span>දළ වැටුප</span>
            <span className="font-mono font-black">{formatLkr(record.gross)}</span>
          </div>
        </div>

        {/* Deductions */}
        <div>
          <div className="text-center font-bold border-b border-black pb-0.5 mb-1.5">
            අඩුකිරීම්
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold">දළ වැටුප</span>
              <span className="font-mono font-semibold">{formatLkr(record.gross)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span>සේ.අ.අ 8%</span>
              <span className="font-mono font-semibold">{formatLkr(record.epf8)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span>ප්‍රමාද හා වේලාසන පිටවීම</span>
              <div className="flex items-center gap-1.5">
                <span className="inline-block border border-black px-1 py-0.2 text-[9px] font-mono font-bold bg-slate-50 min-w-8 text-center">
                  {record.lateHours}
                </span>
                <span className="font-mono font-semibold min-w-14 text-right">
                  {formatLkr(record.lateDeduction)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span>වැටුප් රහිත නිවාඩු (දින)</span>
              <div className="flex items-center gap-1.5">
                <span className="inline-block border border-black px-1 py-0.2 text-[9px] font-mono font-bold bg-slate-50 min-w-8 text-center">
                  {record.unpaidDays}
                </span>
                <span className="font-mono font-semibold min-w-14 text-right">
                  {formatLkr(record.unpaidDeduction)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span>වැටුප් අත්තිකාරම්</span>
              <span className="font-mono font-semibold">{formatLkr(record.advance)}</span>
            </div>
          </div>

          <div className="mt-6 pt-1 border-t border-black flex justify-between items-center font-bold text-[11px]">
            <span>මුළු අඩුකිරීම්</span>
            <span className="font-mono font-black">{formatLkr(record.totalDeductions)}</span>
          </div>
        </div>
      </div>

      {/* Final Net Pay Row */}
      <div className="mt-3 pt-2 border-t border-black flex justify-between items-center text-xs">
        <div className="font-bold text-slate-800">
          දළ වැටුප: <span className="font-mono font-bold ml-1">{formatLkr(record.gross)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-black text-sm">ශුද්ධ වැටුප:</span>
          <span className="font-mono font-black text-base border-b-2 border-double border-black pb-0.5">
            {formatLkr(record.net)}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 pt-1 text-center text-[10px] font-semibold border-t border-slate-300">
        <span>ඔබගේ සේවය සඳහා ස්තූතියි</span> —{' '}
        <span className="font-mono text-[9px] text-slate-700">දුරකථන - 0760958645 / 0332258961</span>
      </div>
    </div>
  );
}
