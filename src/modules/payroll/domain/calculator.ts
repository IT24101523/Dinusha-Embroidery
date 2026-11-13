import { MonthlySalaryInput, PayrollCalculationBreakdown, EmployeeEntity } from './entities';

export const STANDARD_MONTH_HOURS = 200;
export const STANDARD_MONTH_DAYS = 25;
export const NORMAL_OT_MULTIPLIER = 1.5;
export const SUNDAY_OT_MULTIPLIER = 2.0;
export const EPF_EMPLOYEE_RATE = 0.08; // 8%
export const EPF_EMPLOYER_RATE = 0.12; // 12%
export const ETF_EMPLOYER_RATE = 0.03; // 3%

export function calculateSalaryForEmployee(
  employee: EmployeeEntity,
  input: MonthlySalaryInput
): PayrollCalculationBreakdown {
  const basic = Math.max(0, Number(employee.basicSalary) || 0);
  const hourlyRate = basic > 0 ? basic / STANDARD_MONTH_HOURS : 0;
  const dailyRate = basic > 0 ? basic / STANDARD_MONTH_DAYS : 0;

  // Allowances
  const attAllow = Math.max(0, Number(input.attAllow) || 0);
  const nightAllow = Math.max(0, Number(input.nightAllow) || 0);
  const gradeAllow = Math.max(0, Number(input.gradeAllow) || 0);
  const transAllow = Math.max(0, Number(input.transAllow) || 0);
  const totalAllowances = Number((attAllow + nightAllow + gradeAllow + transAllow).toFixed(2));

  // Special Incentives
  const prodAllow = Math.max(0, Number(input.prodAllow) || 0);
  const checkingAllow = Math.max(0, Number(input.checkingAllow) || 0);
  const totalSpecialIncentives = Number((prodAllow + checkingAllow).toFixed(2));

  // Overtime
  const otHours = Math.max(0, Number(input.otHours) || 0);
  const otRate = Number((hourlyRate * NORMAL_OT_MULTIPLIER).toFixed(2));
  const otAmt = Number((otHours * otRate).toFixed(2));

  const sotHours = Math.max(0, Number(input.sotHours) || 0);
  const sotRate = Number((hourlyRate * SUNDAY_OT_MULTIPLIER).toFixed(2));
  const sotAmt = Number((sotHours * sotRate).toFixed(2));

  const totAmt = Math.max(0, Number(input.totAmt) || 0);
  const poyaDayAmt = Math.max(0, Number(input.poyaDayAmt) || 0);
  const sundayAmt = Math.max(0, Number(input.sundayAmt) || 0);
  const specialLeaveAmt = Math.max(0, Number(input.specialLeaveAmt) || 0);

  const totalOt = Number((otAmt + sotAmt + totAmt + poyaDayAmt + sundayAmt + specialLeaveAmt).toFixed(2));

  // Gross Salary
  const gross = Number((basic + totalAllowances + totalSpecialIncentives + totalOt).toFixed(2));

  // Statutory Employer Contributions
  const epf12 = Number((basic * EPF_EMPLOYER_RATE).toFixed(2));
  const etf3 = Number((basic * ETF_EMPLOYER_RATE).toFixed(2));

  // Deductions
  const epf8 = Number((basic * EPF_EMPLOYEE_RATE).toFixed(2));

  const lateHours = Math.max(0, Number(input.lateHours) || 0);
  const lateDeduction = Number((lateHours * hourlyRate).toFixed(2));

  const unpaidDays = Math.max(0, Number(input.unpaidDays) || 0);
  const unpaidDeduction = Number((unpaidDays * dailyRate).toFixed(2));

  const advance = Math.max(0, Number(input.advance) || 0);

  const totalDeductions = Number((epf8 + lateDeduction + unpaidDeduction + advance).toFixed(2));
  const net = Number(Math.max(0, gross - totalDeductions).toFixed(2));

  return {
    employeeId: employee.id,
    epfNo: employee.epfNo,
    name: employee.fullName,
    nic: employee.nic,
    role: employee.role,
    department: employee.department || 'නිෂ්පාදන අංශය',
    grade: employee.grade || '',
    bankName: employee.bankName || '',
    accountNo: employee.accountNo || '',
    month: input.month,
    basic,
    prodAllow,
    gradeAllow,
    attAllow,
    transAllow,
    nightAllow,
    checkingAllow,
    totalAllowances,
    totalSpecialIncentives,
    otHours,
    otRate,
    otAmt,
    sotHours,
    sotRate,
    sotAmt,
    totAmt,
    poyaDayAmt,
    sundayAmt,
    specialLeaveAmt,
    totalOt,
    gross,
    epf12,
    etf3,
    epf8,
    lateHours,
    lateDeduction,
    unpaidDays,
    unpaidDeduction,
    advance,
    totalDeductions,
    net,
  };
}

