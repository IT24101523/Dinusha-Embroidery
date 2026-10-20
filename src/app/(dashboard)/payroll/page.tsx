'use client';

import React, { useState, useEffect } from 'react';
import {
  Banknote,
  Users,
  UserCheck,
  ClipboardCheck,
  Calculator,
  FileText,
  TableProperties,
  CalendarDays,
  ShieldCheck,
  Plus,
  Trash2,
  Edit3,
  Printer,
  Sparkles,
  ChevronRight,
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface Employee {
  fName: string;
  fDob: string;
  fGender: string;
  fNic: string;
  fEpfNo: number;
  fAddress: string;
  fPhone: string;
  fEmergency: string;
  fRole: string;
  fBasic: number;
}

interface PayrollRecord {
  month: string;
  epfNo: number;
  name: string;
  nic: string;
  role: string;
  basic: number;
  prodAllow: number;
  gradeAllow: number;
  attAllow: number;
  transAllow: number;
  nightAllow: number;
  otHours: number;
  otAmt: number;
  sotHours: number;
  sotAmt: number;
  gross: number;
  epf8: number;
  epf12: number;
  etf3: number;
  lateHours: number;
  lateDeduction: number;
  unpaidHours: number;
  unpaidDeduction: number;
  advance: number;
  totalDeductions: number;
  net: number;
}

const CLIENT_COLORS: Record<string, { name: string; bg: string; text: string; badge: string }> = {
  Nike: { name: 'Nike', bg: 'bg-indigo-50', text: 'text-indigo-950', badge: 'bg-indigo-600' },
  Motif: { name: 'Motif', bg: 'bg-amber-50', text: 'text-amber-950', badge: 'bg-amber-600' },
  Tesco: { name: 'Tesco', bg: 'bg-emerald-50', text: 'text-emerald-950', badge: 'bg-emerald-600' },
  Adidas: { name: 'Adidas', bg: 'bg-purple-50', text: 'text-purple-950', badge: 'bg-purple-600' },
};

const INITIAL_EMPLOYEES: Employee[] = [
  { fName: 'G.A.S.N. Kumara', fDob: '1990-05-12', fGender: 'Male', fNic: '199013300123', fEpfNo: 17, fAddress: 'Weliweriya', fPhone: '0760958645', fEmergency: '0332258961', fRole: 'Production Supervisor', fBasic: 37000 },
  { fName: 'Hiruna', fDob: '1992-03-10', fGender: 'Female', fNic: '199256700123', fEpfNo: 55, fAddress: 'Weliweriya', fPhone: '0712345678', fEmergency: '0332258961', fRole: 'Machine operator', fBasic: 32000 },
  { fName: 'Shashini', fDob: '1995-06-14', fGender: 'Female', fNic: '199567800234', fEpfNo: 56, fAddress: 'Gampaha', fPhone: '0771234567', fEmergency: '0332258961', fRole: 'Machine operator', fBasic: 30000 },
  { fName: 'Prashan', fDob: '1994-10-18', fGender: 'Male', fNic: '199489000345', fEpfNo: 91, fAddress: 'Weliweriya', fPhone: '0789012345', fEmergency: '0332258961', fRole: 'Machine operator', fBasic: 30000 },
  { fName: 'Indika', fDob: '1991-07-22', fGender: 'Male', fNic: '199134500789', fEpfNo: 58, fAddress: 'Gampaha', fPhone: '0751112233', fEmergency: '0332258961', fRole: 'Machine operator', fBasic: 32000 },
  { fName: 'Nalin', fDob: '1989-01-15', fGender: 'Male', fNic: '198912300456', fEpfNo: 95, fAddress: 'Weliweriya', fPhone: '0779998877', fEmergency: '0332258961', fRole: 'Machine operator', fBasic: 34000 },
  { fName: 'Kamal', fDob: '1990-11-05', fGender: 'Male', fNic: '199023400567', fEpfNo: 60, fAddress: 'Weliweriya', fPhone: '0765554433', fEmergency: '0332258961', fRole: 'Machine operator', fBasic: 32000 },
  { fName: 'Danushka', fDob: '1994-09-05', fGender: 'Male', fNic: '199423400567', fEpfNo: 82, fAddress: 'Radawana', fPhone: '0704443322', fEmergency: '0332258961', fRole: 'Machine operator', fBasic: 31000 },
  { fName: 'Malith', fDob: '1993-12-01', fGender: 'Male', fNic: '199334500890', fEpfNo: 86, fAddress: 'Weliweriya', fPhone: '0785556677', fEmergency: '0332258961', fRole: 'Machine operator', fBasic: 30000 },
  { fName: 'Hiruni', fDob: '1996-04-12', fGender: 'Female', fNic: '199645600901', fEpfNo: 85, fAddress: 'Gampaha', fPhone: '0716667788', fEmergency: '0332258961', fRole: 'Machine operator', fBasic: 31000 },
  { fName: 'Sanjula', fDob: '1997-08-20', fGender: 'Male', fNic: '199756700123', fEpfNo: 87, fAddress: 'Weliweriya', fPhone: '0727778899', fEmergency: '0332258961', fRole: 'Machine operator', fBasic: 30000 },
  { fName: 'Chamodh', fDob: '1995-02-18', fGender: 'Male', fNic: '199567800234', fEpfNo: 96, fAddress: 'Weliweriya', fPhone: '0748889900', fEmergency: '0332258961', fRole: 'Machine operator', fBasic: 30000 },
  { fName: 'Priyantha', fDob: '1988-04-10', fGender: 'Male', fNic: '198845600111', fEpfNo: 101, fAddress: 'Weliweriya', fPhone: '0771122334', fEmergency: '0332258961', fRole: 'Final quality Checker', fBasic: 35000 },
  { fName: 'Nadeesha', fDob: '1992-09-15', fGender: 'Female', fNic: '199245600222', fEpfNo: 102, fAddress: 'Gampaha', fPhone: '0712233445', fEmergency: '0332258961', fRole: 'Checker', fBasic: 31000 },
];

export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState<
    | 'employees'
    | 'prodAttendance'
    | 'qualAttendance'
    | 'incentive'
    | 'calculator'
    | 'payslip'
    | 'salarySheet'
    | 'workingDays'
    | 'epf'
  >('employees');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<Record<string, Record<number, string>>>({});

  // Employee Form State
  const [editingEmpIdx, setEditingEmpIdx] = useState<number>(-1);
  const [fName, setFName] = useState('');
  const [fDob, setFDob] = useState('1992-05-10');
  const [fGender, setFGender] = useState('Male');
  const [fNic, setFNic] = useState('');
  const [fEpfNo, setFEpfNo] = useState<number>(18);
  const [fAddress, setFAddress] = useState('Weliweriya');
  const [fPhone, setFPhone] = useState('0771234567');
  const [fEmergency, setFEmergency] = useState('0332258961');
  const [fRole, setFRole] = useState('Machine operator');
  const [fBasic, setFBasic] = useState<number>(32000);

  // Attendance Dates
  const [prodDate, setProdDate] = useState('2026-09-01');
  const [qualDate, setQualDate] = useState('2026-09-01');

  // Calculator Form State
  const [calcEmpEpf, setCalcEmpEpf] = useState<number>(17);
  const [calcMonth, setCalcMonth] = useState('2026-09');
  const [cOtHours, setCOtHours] = useState<number>(0);
  const [cSotHours, setCSotHours] = useState<number>(0);
  const [cAttendant, setCAttendant] = useState<number>(5000);
  const [cNight, setCNight] = useState<number>(0);
  const [cGrade, setCGrade] = useState<number>(0);
  const [cTransport, setCTransport] = useState<number>(3750);
  const [cProdIncentive, setCProdIncentive] = useState<number>(0);
  const [cCheckingAllow, setCCheckingAllow] = useState<number>(0);
  const [cEpf8, setCEpf8] = useState<number>(0);
  const [cLateHours, setCLateHours] = useState<number>(0);
  const [cUnpaidHours, setCUnpaidHours] = useState<number>(0);
  const [cAdvance, setCAdvance] = useState<number>(0);
  const [calcSuccessMsg, setCalcSuccessMsg] = useState('');

  // Payslip Selection
  const [slipEmpEpf, setSlipEmpEpf] = useState<number>(17);

  // Working Day Calculator State
  const [wdName, setWdName] = useState('Chathurangani');
  const [wdBasic, setWdBasic] = useState<number>(30000);
  const [wdDays, setWdDays] = useState<number>(11);
  const [wdSatDays, setWdSatDays] = useState<number>(1);
  const [wdOtHrs, setWdOtHrs] = useState<number>(19.75);
  const [wdTransAmt, setWdTransAmt] = useState<number>(1000);
  const [wdSotAmt, setWdSotAmt] = useState<number>(0);

  useEffect(() => {
    const savedEmps = localStorage.getItem('dinusha_payroll_v4_emps');
    const savedRecords = localStorage.getItem('dinusha_payroll_v4_records');
    const savedAtt = localStorage.getItem('dinusha_payroll_v4_att');

    if (savedEmps) setEmployees(JSON.parse(savedEmps));
    else {
      setEmployees(INITIAL_EMPLOYEES);
      localStorage.setItem('dinusha_payroll_v4_emps', JSON.stringify(INITIAL_EMPLOYEES));
    }

    if (savedRecords) setPayrollRecords(JSON.parse(savedRecords));
    else {
      // Seed September sample records
      const seeded: PayrollRecord[] = INITIAL_EMPLOYEES.map((e) => {
        const basic = e.fBasic;
        const gross = basic + 5000 + 3750;
        const epf8 = basic * 0.08;
        const epf12 = basic * 0.12;
        const etf3 = basic * 0.03;
        return {
          month: '2026-09',
          epfNo: e.fEpfNo,
          name: e.fName,
          nic: e.fNic,
          role: e.fRole,
          basic,
          prodAllow: e.fRole === 'Machine operator' ? 4500 : 0,
          gradeAllow: 0,
          attAllow: 5000,
          transAllow: 3750,
          nightAllow: 0,
          otHours: 12,
          otAmt: ((basic / 26) / 8 * 1.5) * 12,
          sotHours: 0,
          sotAmt: 0,
          gross: gross + (e.fRole === 'Machine operator' ? 4500 : 0) + ((basic / 26) / 8 * 1.5) * 12,
          epf8,
          epf12,
          etf3,
          lateHours: 0,
          lateDeduction: 0,
          unpaidHours: 0,
          unpaidDeduction: 0,
          advance: 0,
          totalDeductions: epf8,
          net: gross + (e.fRole === 'Machine operator' ? 4500 : 0) + ((basic / 26) / 8 * 1.5) * 12 - epf8,
        };
      });
      setPayrollRecords(seeded);
      localStorage.setItem('dinusha_payroll_v4_records', JSON.stringify(seeded));
    }

    if (savedAtt) setAttendanceLogs(JSON.parse(savedAtt));
  }, []);

  const persistEmployees = (updated: Employee[]) => {
    setEmployees(updated);
    localStorage.setItem('dinusha_payroll_v4_emps', JSON.stringify(updated));
  };

  const persistRecords = (updated: PayrollRecord[]) => {
    setPayrollRecords(updated);
    localStorage.setItem('dinusha_payroll_v4_records', JSON.stringify(updated));
  };

  const persistAttendance = (updated: Record<string, Record<number, string>>) => {
    setAttendanceLogs(updated);
    localStorage.setItem('dinusha_payroll_v4_att', JSON.stringify(updated));
  };

  // Helper Roles
  const isProductionRole = (role: string) => {
    const r = role.toLowerCase();
    return r.includes('operator') || r.includes('helper') || r.includes('trimmer') || r.includes('supervisor') || r.includes('training');
  };

  const isQualityRole = (role: string) => role.toLowerCase().includes('checker');

  // Attendance Markers
  const setAttendanceStatus = (epf: number, date: string, status: string) => {
    const updated = { ...attendanceLogs };
    if (!updated[date]) updated[date] = {};
    updated[date][epf] = status;
    persistAttendance(updated);
  };

  const markAllAttendance = (date: string, type: 'prod' | 'qual', status: string) => {
    const updated = { ...attendanceLogs };
    if (!updated[date]) updated[date] = {};

    const targetEmps = employees.filter((e) =>
      type === 'prod' ? isProductionRole(e.fRole) : isQualityRole(e.fRole)
    );

    targetEmps.forEach((e) => {
      updated[date][e.fEpfNo] = status;
    });

    persistAttendance(updated);
  };

  // Employee CRUD Save
  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const newEmp: Employee = {
      fName,
      fDob,
      fGender,
      fNic,
      fEpfNo,
      fAddress,
      fPhone,
      fEmergency,
      fRole,
      fBasic,
    };

    if (editingEmpIdx >= 0) {
      const updated = [...employees];
      updated[editingEmpIdx] = newEmp;
      persistEmployees(updated);
    } else {
      persistEmployees([...employees, newEmp]);
    }

    setEditingEmpIdx(-1);
    setFName('');
    setFNic('');
    setFEpfNo(fEpfNo + 1);
  };

  // Calculate & Save Payroll Record
  const handleSavePayroll = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((item) => item.fEpfNo === calcEmpEpf);
    if (!emp) return;

    const basic = emp.fBasic;
    const otAmt = ((basic / 26) / 8 * 1.5) * cOtHours;
    const sotAmt = ((basic / 26) / 8 * 2.0) * cSotHours;
    const totalProdAllow = cProdIncentive + cCheckingAllow;

    const lateDeduction = cLateHours > 0 ? (basic / 208) * cLateHours : 0;
    const unpaidDeduction = cUnpaidHours > 0 ? (basic / 208) * cUnpaidHours : 0;

    const epfEarningsBase = Math.max(0, basic - (lateDeduction + unpaidDeduction));
    const epf12 = epfEarningsBase * 0.12;
    const etf3 = epfEarningsBase * 0.03;

    const gross = basic + otAmt + sotAmt + cAttendant + cNight + cGrade + cTransport + totalProdAllow;
    const totalDeductions = cEpf8 + lateDeduction + unpaidDeduction + cAdvance;
    const net = gross - totalDeductions;

    const newRecord: PayrollRecord = {
      month: calcMonth,
      epfNo: emp.fEpfNo,
      name: emp.fName,
      nic: emp.fNic,
      role: emp.fRole,
      basic,
      prodAllow: totalProdAllow,
      gradeAllow: cGrade,
      attAllow: cAttendant,
      transAllow: cTransport,
      nightAllow: cNight,
      otHours: cOtHours,
      otAmt,
      sotHours: cSotHours,
      sotAmt,
      gross,
      epf8: cEpf8,
      epf12,
      etf3,
      lateHours: cLateHours,
      lateDeduction,
      unpaidHours: cUnpaidHours,
      unpaidDeduction,
      advance: cAdvance,
      totalDeductions,
      net,
    };

    const existingIdx = payrollRecords.findIndex(
      (r) => r.month === calcMonth && r.epfNo === emp.fEpfNo
    );
    let updated: PayrollRecord[] = [];
    if (existingIdx >= 0) {
      updated = [...payrollRecords];
      updated[existingIdx] = newRecord;
    } else {
      updated = [newRecord, ...payrollRecords];
    }

    persistRecords(updated);
    setCalcSuccessMsg(`Saved payroll for ${emp.fName} (Net: LKR ${net.toLocaleString()})`);
    setTimeout(() => setCalcSuccessMsg(''), 4000);
  };

  // Selected Record for Sinhala Payslip
  const currentSlipRecord =
    payrollRecords.find((r) => r.epfNo === slipEmpEpf && r.month === '2026-09') ||
    payrollRecords.find((r) => r.epfNo === slipEmpEpf) ||
    payrollRecords[0];

  // Working Day Calculations
  const wdDailyRate = wdBasic / 26;
  const wdDaysAmt = wdDailyRate * wdDays;
  const wdSatAmt = wdDailyRate * 0.5 * wdSatDays;
  const wdOtAmt = ((wdBasic / 26) / 8 * 1.5) * wdOtHrs;
  const wdNetSalary = wdDaysAmt + wdSatAmt + wdOtAmt + wdTransAmt + wdSotAmt;

  return (
    <div className="space-y-6">
      {/* Tab Navigation Pill Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs no-print">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'employees' ? 'bg-persian-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Employee Master
          </button>
          <button
            onClick={() => setActiveTab('prodAttendance')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'prodAttendance' ? 'bg-persian-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Production Attendance
          </button>
          <button
            onClick={() => setActiveTab('qualAttendance')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'qualAttendance' ? 'bg-persian-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Quality Attendance
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'calculator' ? 'bg-persian-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Salary Calculator
          </button>
          <button
            onClick={() => setActiveTab('payslip')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'payslip' ? 'bg-persian-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Sinhala Payslip (වැටුප්)
          </button>
          <button
            onClick={() => setActiveTab('salarySheet')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'salarySheet' ? 'bg-persian-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Salary Sheet
          </button>
          <button
            onClick={() => setActiveTab('workingDays')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'workingDays' ? 'bg-persian-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Working Day Wages
          </button>
          <button
            onClick={() => setActiveTab('epf')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'epf' ? 'bg-persian-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Central Bank EPF Form C
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. EMPLOYEE MASTER CRUD */}
      {/* ============================================================== */}
      {activeTab === 'employees' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 lg:col-span-1 h-fit space-y-4">
            <h3 className="font-black text-sm uppercase text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-persian-600" />
              <span>{editingEmpIdx >= 0 ? 'Edit Employee Record' : 'Register New Employee'}</span>
            </h3>

            <form onSubmit={handleSaveEmployee} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                  placeholder="e.g. G.A.S.N. Kumara"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-persian-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">EPF No *</label>
                  <input
                    type="number"
                    value={fEpfNo}
                    onChange={(e) => setFEpfNo(parseInt(e.target.value) || 0)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-black text-persian-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">NIC No *</label>
                  <input
                    type="text"
                    value={fNic}
                    onChange={(e) => setFNic(e.target.value)}
                    placeholder="921450123V"
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Gender</label>
                  <select
                    value={fGender}
                    onChange={(e) => setFGender(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={fDob}
                    onChange={(e) => setFDob(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Job Designation *</label>
                <select
                  value={fRole}
                  onChange={(e) => setFRole(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="Production Supervisor">Production Supervisor</option>
                  <option value="sub supervisor">Sub Supervisor</option>
                  <option value="Final quality Checker">Final Quality Checker</option>
                  <option value="Machine operator">Machine Operator</option>
                  <option value="Helper">Helper</option>
                  <option value="Trimmer">Trimmer</option>
                  <option value="Checker">Checker</option>
                  <option value="HR Assistant">HR Assistant</option>
                  <option value="HR Business Partner">HR Business Partner</option>
                  <option value="Training">Training</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Basic Salary (LKR) *</label>
                <input
                  type="number"
                  value={fBasic}
                  onChange={(e) => setFBasic(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-black text-persian-800 outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="w-full bg-persian-800 hover:bg-persian-700 text-white font-bold p-3 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all"
                >
                  {editingEmpIdx >= 0 ? 'Update Employee' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 lg:col-span-2 space-y-4">
            <h3 className="font-black text-sm uppercase text-slate-800">
              Registered Employee Directory ({employees.length})
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-[600px]">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="p-3.5">EPF</th>
                    <th className="p-3.5">Name & NIC</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5 font-mono">Basic Salary</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp, i) => (
                    <tr key={emp.fEpfNo} className="hover:bg-slate-50">
                      <td className="p-3.5 font-mono font-black text-persian-800">{emp.fEpfNo}</td>
                      <td className="p-3.5">
                        <span className="font-bold text-slate-900 block">{emp.fName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{emp.fNic}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="bg-indigo-50 text-indigo-900 font-bold px-2 py-0.5 rounded text-[10px]">
                          {emp.fRole}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-black text-slate-800">
                        LKR {emp.fBasic.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-center space-x-2">
                        <button
                          onClick={() => {
                            setEditingEmpIdx(i);
                            setFName(emp.fName);
                            setFDob(emp.fDob);
                            setFGender(emp.fGender);
                            setFNic(emp.fNic);
                            setFEpfNo(emp.fEpfNo);
                            setFAddress(emp.fAddress);
                            setFPhone(emp.fPhone);
                            setFEmergency(emp.fEmergency);
                            setFRole(emp.fRole);
                            setFBasic(emp.fBasic);
                          }}
                          className="text-slate-400 hover:text-persian-700 p-1"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete employee?')) {
                              persistEmployees(employees.filter((_, idx) => idx !== i));
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. PRODUCTION ATTENDANCE */}
      {/* ============================================================== */}
      {activeTab === 'prodAttendance' && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-sm uppercase text-persian-800 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-persian-600" />
                <span>Production Department Daily Attendance</span>
              </h3>
              <p className="text-xs text-slate-500">
                Machine operators, helpers, trimmers, and supervisors
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="date"
                value={prodDate}
                onChange={(e) => setProdDate(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              />
              <button
                onClick={() => markAllAttendance(prodDate, 'prod', 'Present')}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark All Present</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">EPF</th>
                  <th className="p-3.5">Employee Name</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Quick Marking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees
                  .filter((e) => isProductionRole(e.fRole))
                  .map((emp) => {
                    const status =
                      (attendanceLogs[prodDate] && attendanceLogs[prodDate][emp.fEpfNo]) ||
                      'Present';

                    return (
                      <tr key={emp.fEpfNo} className="hover:bg-slate-50">
                        <td className="p-3.5 font-mono font-bold text-persian-800">{emp.fEpfNo}</td>
                        <td className="p-3.5 font-bold text-slate-800">{emp.fName}</td>
                        <td className="p-3.5 font-semibold text-slate-600">{emp.fRole}</td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black ${
                              status === 'Present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : status === 'Half-Day'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5">
                          <button
                            onClick={() => setAttendanceStatus(emp.fEpfNo, prodDate, 'Present')}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-emerald-600 hover:text-white transition-colors"
                          >
                            Present
                          </button>
                          <button
                            onClick={() => setAttendanceStatus(emp.fEpfNo, prodDate, 'Half-Day')}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-amber-500 hover:text-white transition-colors"
                          >
                            Half-Day
                          </button>
                          <button
                            onClick={() => setAttendanceStatus(emp.fEpfNo, prodDate, 'Absent')}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-rose-600 hover:text-white transition-colors"
                          >
                            Absent
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. QUALITY ATTENDANCE */}
      {/* ============================================================== */}
      {activeTab === 'qualAttendance' && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-sm uppercase text-persian-800 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                <span>Quality Department Daily Attendance</span>
              </h3>
              <p className="text-xs text-slate-500">Quality checkers and final quality supervisors</p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="date"
                value={qualDate}
                onChange={(e) => setQualDate(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              />
              <button
                onClick={() => markAllAttendance(qualDate, 'qual', 'Present')}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark All Present</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">EPF</th>
                  <th className="p-3.5">Employee Name</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Quick Marking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees
                  .filter((e) => isQualityRole(e.fRole))
                  .map((emp) => {
                    const status =
                      (attendanceLogs[qualDate] && attendanceLogs[qualDate][emp.fEpfNo]) ||
                      'Present';

                    return (
                      <tr key={emp.fEpfNo} className="hover:bg-slate-50">
                        <td className="p-3.5 font-mono font-bold text-persian-800">{emp.fEpfNo}</td>
                        <td className="p-3.5 font-bold text-slate-800">{emp.fName}</td>
                        <td className="p-3.5 font-semibold text-slate-600">{emp.fRole}</td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black ${
                              status === 'Present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : status === 'Half-Day'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5">
                          <button
                            onClick={() => setAttendanceStatus(emp.fEpfNo, qualDate, 'Present')}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-emerald-600 hover:text-white transition-colors"
                          >
                            Present
                          </button>
                          <button
                            onClick={() => setAttendanceStatus(emp.fEpfNo, qualDate, 'Half-Day')}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-amber-500 hover:text-white transition-colors"
                          >
                            Half-Day
                          </button>
                          <button
                            onClick={() => setAttendanceStatus(emp.fEpfNo, qualDate, 'Absent')}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-rose-600 hover:text-white transition-colors"
                          >
                            Absent
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. SALARY CALCULATOR */}
      {/* ============================================================== */}
      {activeTab === 'calculator' && (
        <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-sm uppercase text-slate-800 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-persian-600" />
                <span>Monthly Salary Calculator & Updater</span>
              </h3>
              <p className="text-xs text-slate-500">
                OT Rate: (Basic / 26 / 8) × 1.5 • EPF 8% • Deductions strictly zero unless specified
              </p>
            </div>
            {calcSuccessMsg && (
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {calcSuccessMsg}
              </span>
            )}
          </div>

          <form onSubmit={handleSavePayroll} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Employee *</label>
                <select
                  value={calcEmpEpf}
                  onChange={(e) => setCalcEmpEpf(parseInt(e.target.value))}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-persian-500"
                >
                  {employees.map((e) => (
                    <option key={e.fEpfNo} value={e.fEpfNo}>
                      EPF {e.fEpfNo} — {e.fName} ({e.fRole})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payroll Month</label>
                <input
                  type="month"
                  value={calcMonth}
                  onChange={(e) => setCalcMonth(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Basic Salary Ref</label>
                <div className="p-2.5 bg-slate-200/70 border border-slate-300 rounded-xl text-xs font-mono font-black text-slate-800">
                  LKR {employees.find((e) => e.fEpfNo === calcEmpEpf)?.fBasic.toLocaleString() || 0}
                </div>
              </div>
            </div>

            {/* Calculations Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Overtime */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-black text-xs uppercase text-persian-800 border-b pb-1">
                  Overtime Hours
                </h4>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">OT Hours (1.5x)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={cOtHours}
                    onChange={(e) => setCOtHours(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">SOT Hours (2.0x)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={cSotHours}
                    onChange={(e) => setCSotHours(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              {/* Allowances */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-black text-xs uppercase text-persian-800 border-b pb-1">
                  Allowances
                </h4>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Attendant Allow (5,000)</label>
                  <input
                    type="number"
                    value={cAttendant}
                    onChange={(e) => setCAttendant(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Transport Allow (3,750)</label>
                  <input
                    type="number"
                    value={cTransport}
                    onChange={(e) => setCTransport(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              {/* Incentives */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-black text-xs uppercase text-persian-800 border-b pb-1">
                  Production Incentives
                </h4>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Production Incentive</label>
                  <input
                    type="number"
                    value={cProdIncentive}
                    onChange={(e) => setCProdIncentive(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Checking Allowance</label>
                  <input
                    type="number"
                    value={cCheckingAllow}
                    onChange={(e) => setCCheckingAllow(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              {/* Deductions */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-black text-xs uppercase text-rose-800 border-b pb-1">
                  Deductions
                </h4>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">EPF 8% (LKR)</label>
                  <input
                    type="number"
                    value={cEpf8}
                    onChange={(e) => setCEpf8(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-rose-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Salary Advance (LKR)</label>
                  <input
                    type="number"
                    value={cAdvance}
                    onChange={(e) => setCAdvance(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-rose-700"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-persian-800 hover:bg-persian-700 text-white font-black text-xs p-3.5 rounded-2xl uppercase tracking-wider shadow-md transition-all"
            >
              Calculate & Save Monthly Payroll Record
            </button>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. SINHALA PAYSLIP GENERATOR (A4 PRINTABLE) */}
      {/* ============================================================== */}
      {activeTab === 'payslip' && (
        <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 no-print border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">Select Employee:</span>
              <select
                value={slipEmpEpf}
                onChange={(e) => setSlipEmpEpf(parseInt(e.target.value))}
                className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              >
                {employees.map((e) => (
                  <option key={e.fEpfNo} value={e.fEpfNo}>
                    EPF {e.fEpfNo} — {e.fName}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 bg-persian-800 hover:bg-persian-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>Print Sinhala Payslip (වැටුප් පත්‍රිකාව)</span>
            </button>
          </div>

          {/* Sinhala Payslip Card */}
          <div className="printable-area max-w-2xl mx-auto bg-white border-2 border-slate-900 p-7 text-xs space-y-4 shadow-lg font-sinhala">
            <div className="text-center border-b-2 border-slate-900 pb-3">
              <h1 className="font-black text-lg text-slate-900">දිනුෂා එම්බ්‍රොයිඩරි , වැලිවේරිය</h1>
              <h2 className="font-bold text-sm text-slate-800">වැටුප් පත්‍රිකාව (2026)</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 border border-slate-900 p-3 font-semibold">
              <div>
                <p>
                  නම: <strong className="font-bold">{currentSlipRecord?.name}</strong>
                </p>
                <p>
                  මාසය: <strong className="font-bold">සැප්තැම්බර් 2026</strong>
                </p>
                <p>
                  සේ.අ.අ අංකය: <strong className="font-bold">{currentSlipRecord?.epfNo}</strong>
                </p>
              </div>
              <div className="border-l border-slate-900 pl-3">
                <p className="text-[10px] font-bold text-slate-700">
                  කර්මාන්ත ශාලාව විසින් සේවකයා වෙත කරන ගෙවීම්
                </p>
                <p>
                  සේ.අ.අ 12%: <strong className="font-mono">{currentSlipRecord?.epf12.toFixed(2)}</strong>
                </p>
                <p>
                  සේ.භා.අ 3%: <strong className="font-mono">{currentSlipRecord?.etf3.toFixed(2)}</strong>
                </p>
              </div>
            </div>

            {/* Incomes & Deductions Dual Grid */}
            <div className="grid grid-cols-2 border border-slate-900 divide-x divide-slate-900">
              <div className="p-3 space-y-2">
                <div className="font-black text-center border-b border-slate-900 pb-1">
                  එකතු වීම් (Incomes)
                </div>
                <div className="flex justify-between">
                  <span>මූලික වැටුප</span>
                  <span className="font-mono font-bold">{currentSlipRecord?.basic.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>නිෂ්පාදන දීමනාව</span>
                  <span className="font-mono font-bold">{currentSlipRecord?.prodAllow.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>පැමිණීමේ දීමනාව</span>
                  <span className="font-mono font-bold">{currentSlipRecord?.attAllow.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ප්‍රවාහන දීමනාව</span>
                  <span className="font-mono font-bold">{currentSlipRecord?.transAllow.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>අතිකාල දීමනාව (OT)</span>
                  <span className="font-mono font-bold">{currentSlipRecord?.otAmt.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-900 pt-2 flex justify-between font-black">
                  <span>දළ වැටුප (Gross)</span>
                  <span className="font-mono">{currentSlipRecord?.gross.toFixed(2)}</span>
                </div>
              </div>

              <div className="p-3 space-y-2">
                <div className="font-black text-center border-b border-slate-900 pb-1">
                  අඩු වීම් (Deductions)
                </div>
                <div className="flex justify-between">
                  <span>සේ.අ.අ 8%</span>
                  <span className="font-mono font-bold">{currentSlipRecord?.epf8.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>වැටුප් අත්තිකාරම්</span>
                  <span className="font-mono font-bold">{currentSlipRecord?.advance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ප්‍රමාද / නිවාඩු අඩු කිරීම්</span>
                  <span className="font-mono font-bold">
                    {(currentSlipRecord?.lateDeduction + currentSlipRecord?.unpaidDeduction).toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-slate-900 pt-2 flex justify-between font-black text-rose-700">
                  <span>මුළු අඩු වීම්</span>
                  <span className="font-mono">{currentSlipRecord?.totalDeductions.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="border-2 border-slate-900 p-3.5 flex justify-between items-center font-black text-sm bg-slate-50">
              <span>ශුද්ධ වැටුප (Net Take-Home):</span>
              <span className="font-mono text-base text-emerald-800">
                LKR {currentSlipRecord?.net.toFixed(2)}
              </span>
            </div>

            <div className="text-center pt-2 text-[10px] text-slate-600 font-bold border-t border-slate-900">
              ඔබගේ කැපවීම සහ සේවය වෙනුවෙන් ස්තුතියි • දුරකථන: 0760958645 / 0332258961
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. SALARY SHEET */}
      {/* ============================================================== */}
      {activeTab === 'salarySheet' && (
        <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-200 printable-area space-y-4">
          <div className="flex justify-between items-center no-print border-b pb-3">
            <h3 className="font-black text-sm uppercase text-slate-800">
              Factory Master Salary Sheet (September 2026)
            </h3>
            <button
              onClick={() => window.print()}
              className="bg-persian-800 text-white font-bold text-xs px-4 py-2 rounded-xl"
            >
              Print Master Sheet
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-[11px] whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 border-r">EPF</th>
                  <th className="p-3 border-r">Employee</th>
                  <th className="p-3 border-r">Basic</th>
                  <th className="p-3 border-r">Prod Allow</th>
                  <th className="p-3 border-r">Att Allow</th>
                  <th className="p-3 border-r">Trans Allow</th>
                  <th className="p-3 border-r">OT Amount</th>
                  <th className="p-3 border-r">Gross</th>
                  <th className="p-3 border-r">EPF 8%</th>
                  <th className="p-3 border-r">Advance</th>
                  <th className="p-3 border-r font-black text-emerald-800">Net Salary</th>
                  <th className="p-3 text-center">Signature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {payrollRecords.map((r) => (
                  <tr key={r.epfNo} className="hover:bg-slate-50">
                    <td className="p-3 border-r font-bold text-persian-800">{r.epfNo}</td>
                    <td className="p-3 border-r font-sans font-bold text-slate-800">{r.name}</td>
                    <td className="p-3 border-r">{r.basic.toLocaleString()}</td>
                    <td className="p-3 border-r">{r.prodAllow.toLocaleString()}</td>
                    <td className="p-3 border-r">{r.attAllow.toLocaleString()}</td>
                    <td className="p-3 border-r">{r.transAllow.toLocaleString()}</td>
                    <td className="p-3 border-r">{r.otAmt.toFixed(2)}</td>
                    <td className="p-3 border-r font-bold">{r.gross.toFixed(2)}</td>
                    <td className="p-3 border-r text-rose-700">{r.epf8.toFixed(2)}</td>
                    <td className="p-3 border-r">{r.advance.toFixed(2)}</td>
                    <td className="p-3 border-r font-black text-emerald-700">{r.net.toFixed(2)}</td>
                    <td className="p-3 text-center text-slate-300">__________</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. WORKING DAY SALARY */}
      {/* ============================================================== */}
      {activeTab === 'workingDays' && (
        <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-200 max-w-lg mx-auto space-y-4">
          <div className="text-center border-b pb-3">
            <h4 className="font-black text-sm uppercase text-persian-800">
              Working Day Wage Calculator (&gt; 6 Days / Temporary)
            </h4>
            <p className="text-xs text-slate-500">Daily Pro-Rated Factory Payroll</p>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Employee Name</label>
              <input
                type="text"
                value={wdName}
                onChange={(e) => setWdName(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Basic Reference Salary (LKR)</label>
              <input
                type="number"
                value={wdBasic}
                onChange={(e) => setWdBasic(parseFloat(e.target.value) || 0)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Working Days</label>
                <input
                  type="number"
                  value={wdDays}
                  onChange={(e) => setWdDays(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Saturday Days</label>
                <input
                  type="number"
                  value={wdSatDays}
                  onChange={(e) => setWdSatDays(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 font-mono">
              <div className="flex justify-between">
                <span>Working Days Amount:</span>
                <strong>LKR {wdDaysAmt.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Saturday Amount (0.5x):</span>
                <strong>LKR {wdSatAmt.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Overtime ({wdOtHrs}h):</span>
                <strong>LKR {wdOtAmt.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Transport Allowance:</span>
                <strong>LKR {wdTransAmt.toFixed(2)}</strong>
              </div>
              <div className="border-t border-slate-300 pt-2 flex justify-between font-black text-sm text-emerald-800">
                <span>Net Total Wages:</span>
                <span>LKR {wdNetSalary.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. CENTRAL BANK EPF FORM C */}
      {/* ============================================================== */}
      {activeTab === 'epf' && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 printable-area space-y-6 max-w-5xl mx-auto">
          <div className="flex justify-between items-center no-print border-b pb-3">
            <div>
              <h3 className="font-black text-sm uppercase text-slate-800">
                Official Sri Lankan Central Bank EPF Form C Filler
              </h3>
              <p className="text-xs text-slate-500">1958 EPF Act No. 15 Remittance Form</p>
            </div>
            <button
              onClick={() => window.print()}
              className="bg-persian-800 text-white font-bold text-xs px-4 py-2 rounded-xl"
            >
              Print Form C
            </button>
          </div>

          <div className="border-2 border-slate-900 p-6 space-y-4 text-xs font-serif">
            <div className="text-center border-b-2 border-slate-900 pb-3">
              <p className="font-bold">රා. සේ. පි. — FORM C (1958 අංක 15 දරණ සේ.අ.අ පනත)</p>
              <h2 className="font-black text-sm uppercase tracking-wider mt-1">
                ශ්‍රී ලංකා මහ බැංකුව — සේවක අර්ථසාධක අරමුදල (Central Bank of Sri Lanka)
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-slate-900 pb-3 font-sans">
              <div>
                <span className="font-bold">සේ.අ.අ. සේව්‍ය අංකය:</span>{' '}
                <strong className="font-mono">EPF/98452/DE</strong>
              </div>
              <div>
                <span className="font-bold">ගෙවන වර්ෂය සහ මාසය:</span>{' '}
                <strong className="font-mono">2026 / 09</strong>
              </div>
              <div>
                <span className="font-bold">බැංකුව හා ශාඛාව:</span>{' '}
                <span>Bank of Ceylon — Weliweriya</span>
              </div>
              <div>
                <span className="font-bold">චෙක්පත් අංකය:</span>{' '}
                <strong className="font-mono">CHQ-992104</strong>
              </div>
            </div>

            <table className="w-full text-left border-collapse border border-slate-900 font-sans text-xs">
              <thead className="bg-slate-100 font-bold border-b border-slate-900">
                <tr>
                  <th className="border border-slate-900 p-2 text-center">Member</th>
                  <th className="border border-slate-900 p-2">Employee Name</th>
                  <th className="border border-slate-900 p-2 font-mono">NIC</th>
                  <th className="border border-slate-900 p-2 text-right">Basic (Rs.)</th>
                  <th className="border border-slate-900 p-2 text-right">Employer 12%</th>
                  <th className="border border-slate-900 p-2 text-right">Employee 8%</th>
                  <th className="border border-slate-900 p-2 text-right">Total (20%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 font-mono">
                {payrollRecords.map((r) => (
                  <tr key={r.epfNo}>
                    <td className="border border-slate-900 p-2 text-center font-bold">{r.epfNo}</td>
                    <td className="border border-slate-900 p-2 font-sans font-semibold">{r.name}</td>
                    <td className="border border-slate-900 p-2">{r.nic}</td>
                    <td className="border border-slate-900 p-2 text-right">{r.basic.toFixed(2)}</td>
                    <td className="border border-slate-900 p-2 text-right">{r.epf12.toFixed(2)}</td>
                    <td className="border border-slate-900 p-2 text-right">{r.epf8.toFixed(2)}</td>
                    <td className="border border-slate-900 p-2 text-right font-bold">
                      {(r.epf12 + r.epf8).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pt-4 flex justify-between font-sans font-bold">
              <div>
                <p>
                  Employer ETF Contribution (3%):{' '}
                  <span className="text-emerald-700 font-mono">
                    Rs.{' '}
                    {payrollRecords
                      .reduce((sum, r) => sum + r.etf3, 0)
                      .toFixed(2)}
                  </span>
                </p>
              </div>
              <div className="text-right space-y-3">
                <div className="border-b border-slate-400 w-44 ml-auto" />
                <p>Authorized Signature of Employer</p>
                <p className="text-[10px] text-slate-500">Dinusha Embroidery (Pvt) Ltd</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
