export interface EmployeeEntity {
  id: string;
  epfNo: number;
  initials?: string | null;
  surname?: string | null;
  fullName: string;
  dob?: string | null;
  gender?: string | null;
  nic: string;
  address?: string | null;
  phone?: string | null;
  emergencyPhone?: string | null;
  role: string;
  department: string;
  grade?: string | null;
  bankName?: string | null;
  accountNo?: string | null;
  basicSalary: number;
  joinedDate?: string | null; // Date joined (wadata apu dawasa)
  photoUrl?: string | null;
  // Personal File Compliance Checklist
  hasNicCopy: boolean; // ID copy
  hasBirthCertificate: boolean; // Upath sahathikaya
  hasGramasewakaCert: boolean; // Gramasewaka sahathikaya
  hasPoliceReport: boolean; // Police report
  hasMedicalReport: boolean; // Medical certificate
  hasAppointmentLetter: boolean; // Appointment letter
  deletionReason?: string | null;
  deletionNotes?: string | null;
  deletedAt?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MonthlySalaryInput {
  employeeId: string;
  month: string; // e.g. 'October 2026' or 'September 2026'
  basicSalary: number;
  // Overtime
  otHours?: number; // 1.5x
  sotHours?: number; // 2.0x
  totAmt?: number; // Triple OT
  poyaDayAmt?: number;
  sundayAmt?: number;
  specialLeaveAmt?: number;
  // Allowances
  attAllow?: number; // Attendant allowance (default 5000)
  nightAllow?: number;
  gradeAllow?: number;
  transAllow?: number;
  // Special Incentives
  prodAllow?: number; // Production allowance
  checkingAllow?: number; // Trimmer/Checker allowance
  // Deductions
  lateHours?: number;
  unpaidDays?: number;
  advance?: number;
}

export interface PayrollCalculationBreakdown {
  employeeId: string;
  epfNo: number;
  name: string;
  nic: string;
  role: string;
  department: string;
  grade: string;
  bankName: string;
  accountNo: string;
  month: string;
  basic: number;
  // Earnings
  prodAllow: number;
  gradeAllow: number;
  attAllow: number;
  transAllow: number;
  nightAllow: number;
  checkingAllow: number;
  totalAllowances: number;
  totalSpecialIncentives: number;
  // Overtime
  otHours: number;
  otRate: number;
  otAmt: number;
  sotHours: number;
  sotRate: number;
  sotAmt: number;
  totAmt: number;
  poyaDayAmt: number;
  sundayAmt: number;
  specialLeaveAmt: number;
  totalOt: number;
  // Gross
  gross: number;
  // Employer contributions
  epf12: number;
  etf3: number;
  // Deductions
  epf8: number;
  lateHours: number;
  lateDeduction: number;
  unpaidDays: number;
  unpaidDeduction: number;
  advance: number;
  totalDeductions: number;
  // Net
  net: number;
  status?: 'DRAFT' | 'APPROVED' | 'PAID' | string;
}

