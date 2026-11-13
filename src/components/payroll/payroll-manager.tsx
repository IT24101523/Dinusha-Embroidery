'use client';

import React, { useState } from 'react';
import { EmployeeEntity } from '@/modules/payroll/domain/entities';
import { EmployeeCrud } from './employee-crud';
import { SalaryCalculator } from './salary-calculator';
import { PayslipPrintManager } from './payslip-print-manager';
import { MonthlySalarySheet } from './monthly-salary-sheet';
import { EtfReturn } from './etf-return';
import { EpfFormC } from './epf-form-c';
import {
  Users,
  Calculator,
  Printer,
  Table2,
  ShieldCheck,
  FileCheck2,
} from 'lucide-react';

interface PayrollManagerProps {
  initialEmployees: EmployeeEntity[];
}

export function PayrollManager({ initialEmployees }: PayrollManagerProps) {
  const [activeTab, setActiveTab] = useState<
    'employees' | 'calculator' | 'printManager' | 'salarySheet' | 'etf' | 'epf'
  >('employees');
  const [employees, setEmployees] = useState<EmployeeEntity[]>(initialEmployees);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-500 selection:text-white print:block print:min-h-0 print:bg-white">
      {/* Top Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-700 text-white flex items-center justify-center font-black text-xl shadow-xs">
              D
            </div>
            <div>
              <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">
                Dinusha Embroidery
              </span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                HR & Payroll Suite
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1">
            <button
              onClick={() => setActiveTab('employees')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'employees'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Employees</span>
            </button>

            <button
              onClick={() => setActiveTab('calculator')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'calculator'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Calculator</span>
            </button>

            <button
              onClick={() => setActiveTab('printManager')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'printManager'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Payslips (2/A4)</span>
            </button>

            <button
              onClick={() => setActiveTab('salarySheet')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'salarySheet'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>Salary Sheet</span>
            </button>

            <button
              onClick={() => setActiveTab('etf')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'etf'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ETF (3%)</span>
            </button>

            <button
              onClick={() => setActiveTab('epf')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'epf'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>EPF & Form C</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full print:max-w-none print:w-full print:p-0 print:m-0">
        {activeTab === 'employees' && (
          <EmployeeCrud
            initialEmployees={employees}
            onEmployeesChange={(updated) => setEmployees(updated)}
          />
        )}

        {activeTab === 'calculator' && (
          <SalaryCalculator employees={employees} />
        )}

        {activeTab === 'printManager' && (
          <PayslipPrintManager employees={employees} />
        )}

        {activeTab === 'salarySheet' && (
          <MonthlySalarySheet employees={employees} />
        )}

        {activeTab === 'etf' && (
          <EtfReturn employees={employees} />
        )}

        {activeTab === 'epf' && (
          <EpfFormC employees={employees} />
        )}
      </main>
    </div>
  );
}
