'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { EmployeeEntity, PayrollCalculationBreakdown } from '@/modules/payroll/domain/entities';
import { calculateSalaryForEmployee } from '@/modules/payroll/domain/calculator';
import { fetchSalaryRecordAction } from '@/actions/payroll';
import { Printer, ArrowLeft, User, Calendar, Loader2 } from 'lucide-react';

interface SinhalaPayslipProps {
  initialRecord?: PayrollCalculationBreakdown | null;
  employees: EmployeeEntity[];
  onBack?: () => void;
}

export function SinhalaPayslip({ initialRecord, employees, onBack }: SinhalaPayslipProps) {
  const [selectedEmpId, setSelectedEmpId] = useState<string>(
    initialRecord?.employeeId || employees[0]?.id || ''
  );
  const [month, setMonth] = useState<string>(initialRecord?.month || 'October 2026');
  const [record, setRecord] = useState<PayrollCalculationBreakdown | null>(initialRecord || null);
  const [loading, setLoading] = useState(false);

  const currentEmployee = useMemo(() => {
    return employees.find((e) => e.id === selectedEmpId) || employees[0] || null;
  }, [employees, selectedEmpId]);

  // Load saved record from DB, or dynamically calculate defaults for selected employee
  useEffect(() => {
    if (!currentEmployee) return;

    let isMounted = true;
    async function loadRecord() {
      setLoading(true);
      const res = await fetchSalaryRecordAction(currentEmployee!.id, month);
      if (isMounted) {
        if (res.success && res.data) {
          setRecord(res.data);
        } else {
          // Calculate standard sample breakdown matching Image 2 defaults
          const isSupervisor = currentEmployee!.role.includes('Supervisor');
          const sample = calculateSalaryForEmployee(currentEmployee!, {
            employeeId: currentEmployee!.id,
            month,
            basicSalary: currentEmployee!.basicSalary,
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
          setRecord(sample);
        }
        setLoading(false);
      }
    }

    loadRecord();
    return () => {
      isMounted = false;
    };
  }, [currentEmployee, month]);

  const handlePrint = () => {
    window.print();
  };

  const formatLkr = (num: number) => {
    return (num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (!currentEmployee || !record) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
        <p className="text-slate-600">No employees found. Please register an employee first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls Bar (hidden during print) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs print:hidden flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Sinhala Payslip View (වැටුප් පත්‍රිකාව)
            </h2>
            <p className="text-xs text-slate-500">
              Direct preview & official print format matching Dinusha factory template
            </p>
          </div>
        </div>

        {/* Quick Employee & Month Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
            <User className="w-4 h-4 text-slate-400 ml-1" />
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="text-xs font-semibold bg-transparent border-none text-slate-800 focus:outline-hidden"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  EPF {emp.epfNo} - {emp.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-400 ml-1" />
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="text-xs font-semibold bg-transparent border-none text-slate-800 focus:outline-hidden"
            >
              <option value="October 2026">October 2026 (ඔක්තෝබර්)</option>
              <option value="September 2026">September 2026 (සැප්තැම්බර්)</option>
              <option value="November 2026">November 2026 (නොවැම්බර්)</option>
              <option value="December 2026">December 2026 (දෙසැම්බර්)</option>
              <option value="August 2026">August 2026 (අගෝස්තු)</option>
            </select>
          </div>

          <button
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm transition flex items-center gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            Print Official Payslip (A4)
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center p-4 text-slate-500 text-xs gap-2 print:hidden">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          Loading payslip data for {currentEmployee.fullName}...
        </div>
      )}

      {/* Payslip Document Container (Exact replica of Image 2) */}
      <div className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-300 shadow-sm max-w-4xl mx-auto font-sans print:border-none print:shadow-none print:p-0 print:max-w-none text-slate-900">
        <style jsx global>{`
          @media print {
            body {
              background: white !important;
              color: black !important;
            }
            .print\\:hidden {
              display: none !important;
            }
          }
        `}</style>

        {/* Title */}
        <div className="text-center border-b-2 border-black pb-2 mb-4">
          <h1 className="text-2xl font-black tracking-wide text-black font-serif">
            වැටුප් පත්‍රිකාව (2026)
          </h1>
        </div>

        {/* Top Info Grid (Exact table layout as Image 2) */}
        <div className="border border-black mb-6 text-sm">
          <table className="w-full border-collapse">
            <tbody>
              {/* Row 1: Name & Employer Contributions Header */}
              <tr className="border-b border-black">
                <td className="w-1/4 py-1.5 px-3 font-bold border-r border-black bg-slate-50">
                  නම
                </td>
                <td className="w-1/4 py-1.5 px-3 font-semibold border-r border-black">
                  {record.name}
                </td>
                <td colSpan={2} className="w-1/2 py-1.5 px-3 font-bold text-center bg-slate-50">
                  කර්මාන්ත ශාලාව විසින් සේවකයා වෙත කරන ගෙවීම්
                </td>
              </tr>

              {/* Row 2: Month & ETF 3% */}
              <tr className="border-b border-black">
                <td className="py-1.5 px-3 font-bold border-r border-black bg-slate-50">
                  මාසය
                </td>
                <td className="py-1.5 px-3 border-r border-black font-medium">
                  {record.month}
                </td>
                <td className="w-1/4 py-1.5 px-3 font-bold border-r border-black bg-slate-50">
                  සේ.භා.අ 3%
                </td>
                <td className="w-1/4 py-1.5 px-3 text-right font-mono font-bold">
                  {formatLkr(record.etf3)}
                </td>
              </tr>

              {/* Row 3: EPF No & EPF 12% */}
              <tr className="border-b border-black">
                <td className="py-1.5 px-3 font-bold border-r border-black bg-slate-50">
                  සේ.අ.අ අංකය
                </td>
                <td className="py-1.5 px-3 border-r border-black font-mono font-bold text-base">
                  {record.epfNo}
                </td>
                <td className="py-1.5 px-3 font-bold border-r border-black bg-slate-50">
                  සේ.අ.අ 12%
                </td>
                <td className="py-1.5 px-3 text-right font-mono font-bold">
                  {formatLkr(record.epf12)}
                </td>
              </tr>

              {/* Row 4: Designation */}
              <tr className="border-b border-black">
                <td className="py-1.5 px-3 font-bold border-r border-black bg-slate-50">
                  තනතුර
                </td>
                <td className="py-1.5 px-3 border-r border-black font-medium">
                  {record.role}
                </td>
                <td colSpan={2} className="border-black"></td>
              </tr>

              {/* Row 5: Department */}
              <tr className="border-b border-black">
                <td className="py-1.5 px-3 font-bold border-r border-black bg-slate-50">
                  දෙපාර්තමේන්තුව
                </td>
                <td className="py-1.5 px-3 border-r border-black font-medium">
                  {record.department || 'නිෂ්පාදන අංශය'}
                </td>
                <td colSpan={2} className="border-black"></td>
              </tr>

              {/* Row 6: Grade */}
              <tr className="border-b border-black">
                <td className="py-1.5 px-3 font-bold border-r border-black bg-slate-50">
                  ශ්‍රේණිය
                </td>
                <td className="py-1.5 px-3 border-r border-black font-medium">
                  {record.grade || '-'}
                </td>
                <td colSpan={2} className="border-black"></td>
              </tr>

              {/* Row 7: Employee Bank */}
              <tr className="border-b border-black">
                <td className="py-1.5 px-3 font-bold border-r border-black bg-slate-50">
                  සේවක බැංකුව
                </td>
                <td className="py-1.5 px-3 border-r border-black font-medium">
                  {record.bankName || '-'}
                </td>
                <td colSpan={2} className="border-black"></td>
              </tr>

              {/* Row 8: Account Number */}
              <tr>
                <td className="py-1.5 px-3 font-bold border-r border-black bg-slate-50">
                  ගිණුම් අංකය
                </td>
                <td className="py-1.5 px-3 border-r border-black font-mono font-semibold">
                  {record.accountNo || '-'}
                </td>
                <td colSpan={2} className="border-black"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Two Columns: Earnings (එකතු කිරීම්) & Deductions (අඩුකිරීම්) */}
        <div className="grid grid-cols-2 gap-8 text-sm">
          {/* Left Column: Earnings */}
          <div>
            <div className="text-center font-bold text-base border-b-2 border-black pb-1 mb-3">
              එකතු කිරීම්
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center py-1">
                <span>මූලික වැටුප</span>
                <span className="font-mono font-semibold">{formatLkr(record.basic)}</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span>නිෂ්පාදන දීමනාව</span>
                <span className="font-mono font-semibold">{formatLkr(record.prodAllow)}</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span>ශ්‍රේණිගත දීමනාව</span>
                <span className="font-mono font-semibold">{formatLkr(record.gradeAllow)}</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span>පැමිණීමේ දීමනාව</span>
                <span className="font-mono font-semibold">{formatLkr(record.attAllow)}</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span>ප්‍රවාහන දීමනාව</span>
                <span className="font-mono font-semibold">{formatLkr(record.transAllow)}</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span>රාත්‍රී දීමනාව</span>
                <span className="font-mono font-semibold">{formatLkr(record.nightAllow)}</span>
              </div>

              {/* Normal OT */}
              <div className="flex justify-between items-center py-1">
                <span>සාමාන්‍ය අතිකාල දීමනාව</span>
                <div className="flex items-center gap-3">
                  <span className="inline-block border border-black px-2 py-0.5 text-xs font-mono font-bold bg-slate-50 min-w-14 text-center">
                    {record.otHours}
                  </span>
                  <span className="font-mono font-semibold min-w-20 text-right">
                    {formatLkr(record.otAmt)}
                  </span>
                </div>
              </div>

              {/* Double OT */}
              <div className="flex justify-between items-center py-1">
                <span>ද්විත්ව අතිකාල දීමනාව</span>
                <div className="flex items-center gap-3">
                  <span className="inline-block border border-black px-2 py-0.5 text-xs font-mono font-bold bg-slate-50 min-w-14 text-center">
                    {record.sotHours}
                  </span>
                  <span className="font-mono font-semibold min-w-20 text-right">
                    {formatLkr(record.sotAmt)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center py-1">
                <span>ත්‍රිත්ව අතිකාල දීමනාව</span>
                <span className="font-mono font-semibold">{formatLkr(record.totAmt)}</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span>පොහෝය දින</span>
                <span className="font-mono font-semibold">{formatLkr(record.poyaDayAmt)}</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span>ඉරිදා ගෙවීම්</span>
                <span className="font-mono font-semibold">{formatLkr(record.sundayAmt)}</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span>විශේෂ නිවාඩු</span>
                <span className="font-mono font-semibold">{formatLkr(record.specialLeaveAmt)}</span>
              </div>
            </div>

            {/* Gross Earning Total */}
            <div className="mt-4 pt-2 border-t-2 border-b-2 border-black flex justify-between items-center py-1 font-bold text-base">
              <span>දළ වැටුප</span>
              <span className="font-mono font-black">{formatLkr(record.gross)}</span>
            </div>
          </div>

          {/* Right Column: Deductions */}
          <div>
            <div className="text-center font-bold text-base border-b-2 border-black pb-1 mb-3">
              අඩුකිරීම්
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center py-1">
                <span className="font-bold">දළ වැටුප</span>
                <span className="font-mono font-semibold">{formatLkr(record.gross)}</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span>සේ.අ.අ 8%</span>
                <span className="font-mono font-semibold">{formatLkr(record.epf8)}</span>
              </div>

              {/* Late Hours */}
              <div className="flex justify-between items-center py-1">
                <span>ප්‍රමාද හා වේලාසන පිටවීම</span>
                <div className="flex items-center gap-3">
                  <span className="inline-block border border-black px-2 py-0.5 text-xs font-mono font-bold bg-slate-50 min-w-12 text-center">
                    {record.lateHours}
                  </span>
                  <span className="font-mono font-semibold min-w-20 text-right">
                    {formatLkr(record.lateDeduction)}
                  </span>
                </div>
              </div>

              {/* Unpaid Leave */}
              <div className="flex justify-between items-center py-1">
                <span>වැටුප් රහිත නිවාඩු (දින)</span>
                <div className="flex items-center gap-3">
                  <span className="inline-block border border-black px-2 py-0.5 text-xs font-mono font-bold bg-slate-50 min-w-12 text-center">
                    {record.unpaidDays}
                  </span>
                  <span className="font-mono font-semibold min-w-20 text-right">
                    {formatLkr(record.unpaidDeduction)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center py-1">
                <span>වැටුප් අත්තිකාරම්</span>
                <span className="font-mono font-semibold">{formatLkr(record.advance)}</span>
              </div>
            </div>

            {/* Total Deductions Line */}
            <div className="mt-20 pt-2 border-t-2 border-black flex justify-between items-center py-1 font-bold text-base">
              <span>මුළු අඩුකිරීම්</span>
              <span className="font-mono font-black">{formatLkr(record.totalDeductions)}</span>
            </div>
          </div>
        </div>

        {/* Final Net Pay Row (Double underline) */}
        <div className="mt-8 pt-4 border-t-2 border-black flex justify-between items-center text-lg">
          <div className="font-black text-slate-800">
            දළ වැටුප: <span className="font-mono font-bold ml-2">{formatLkr(record.gross)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-black text-xl">ශුද්ධ වැටුප:</span>
            <span className="font-mono font-black text-2xl border-b-4 border-double border-black pb-0.5">
              {formatLkr(record.net)}
            </span>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 pt-4 text-center text-sm font-semibold border-t border-slate-300 space-y-1">
          <p className="text-black">ඔබගේ සේවය සඳහා ස්තූතියි</p>
          <p className="text-xs font-mono text-slate-700">
            දුරකථන - 0760958645 / 0332258961
          </p>
        </div>
      </div>
    </div>
  );
}
