import { MonthlySalaryInput, PayrollCalculationBreakdown, EmployeeEntity } from './entities';

export const STANDARD_MONTH_HOURS = 200; // OT hourly divisor (Basic / 200)
export const STANDARD_MONTH_DAYS = 26; // Unpaid leave daily divisor (Basic / 26)
export const STANDARD_DEDUCTION_MONTH_HOURS = 208; // Unpaid/Late hourly divisor (26 days * 8 hrs = 208)
export const NORMAL_OT_MULTIPLIER = 1.5;
export const SUNDAY_OT_MULTIPLIER = 2.0;
export const EPF_EMPLOYEE_RATE = 0.08; // 8%
export const EPF_EMPLOYER_RATE = 0.12; // 12%
export const ETF_EMPLOYER_RATE = 0.03; // 3%
export const FULL_ATTENDANCE_ALLOWANCE = 5000;
export const ONE_DAY_ABSENT_ATTENDANCE_ALLOWANCE = 2500;
export const ANNUAL_LEAVE_QUOTA_DAYS = 14;

/**
 * Attendance allowance rule:
 * 1) By Leave / Absent Days (unpaidDays + annualLeaveDays):
 *    - <= 1 day: LKR 5,000 (Full)
 *    - > 1 day and <= 2 days: LKR 2,500 (Half)
 *    - > 2 days: LKR 0 (None)
 * 2) By Late & Early Out Hours (lateHours):
 *    - < 12 hrs: LKR 5,000 (Full)
 *    - >= 12 hrs and < 28 hrs: LKR 2,500 (Half)
 *    - >= 28 hrs: LKR 0 (None)
 * Final Attendance Allowance is the lower (stricter) of the two.
 */
export function calculateAttendanceAllowance(
  unpaidDays: number,
  annualLeaveDays = 0,
  lateHours = 0
): number {
  const leaveDays = Math.max(
    0,
    (Number(unpaidDays) || 0) + (Number(annualLeaveDays) || 0)
  );
  const late = Math.max(0, Number(lateHours) || 0);

  const fromLeave =
    leaveDays <= 1
      ? FULL_ATTENDANCE_ALLOWANCE
      : leaveDays <= 2
        ? ONE_DAY_ABSENT_ATTENDANCE_ALLOWANCE
        : 0;

  const fromLate =
    late < 12
      ? FULL_ATTENDANCE_ALLOWANCE
      : late < 28
        ? ONE_DAY_ABSENT_ATTENDANCE_ALLOWANCE
        : 0;

  return Math.min(fromLeave, fromLate);
}

export function calculateSalaryForEmployee(
  employee: EmployeeEntity,
  input: MonthlySalaryInput
): PayrollCalculationBreakdown {
  const basic = Math.max(0, Number(employee.basicSalary) || 0);
  const otHourlyRate = basic > 0 ? basic / STANDARD_MONTH_HOURS : 0;
  const deductionDailyRate = basic > 0 ? basic / STANDARD_MONTH_DAYS : 0;
  const deductionHourlyRate = basic > 0 ? basic / STANDARD_DEDUCTION_MONTH_HOURS : 0;

  const annualLeaveDays = Math.max(0, Number(input.annualLeaveDays) || 0);
  const unpaidDays = Math.max(0, Number(input.unpaidDays) || 0);
  const lateHours = Math.max(0, Number(input.lateHours) || 0);
  const unpaidDeduction = Number((unpaidDays * deductionDailyRate).toFixed(2));
  const lateDeduction = Number((lateHours * deductionHourlyRate).toFixed(2));

  // If employee has > 6 unpaid/absent days (> 48 hours), lock Allowances and Special Incentives
  const isAllowanceLocked = unpaidDays > 6;

  // Allowances (Attendance Allowance: <=1d Full 5,000 | >1d to 2d Half 2,500 | >2d 0)
  const attAllow = isAllowanceLocked
    ? 0
    : calculateAttendanceAllowance(unpaidDays, annualLeaveDays, lateHours);
  const nightAllow = isAllowanceLocked ? 0 : Math.max(0, Number(input.nightAllow) || 0);
  const gradeAllow = isAllowanceLocked ? 0 : Math.max(0, Number(input.gradeAllow) || 0);
  const transAllow = isAllowanceLocked ? 0 : Math.max(0, Number(input.transAllow) || 0);
  const totalAllowances = Number((attAllow + nightAllow + gradeAllow + transAllow).toFixed(2));

  // Special Incentives
  const prodAllow = isAllowanceLocked ? 0 : Math.max(0, Number(input.prodAllow) || 0);
  const checkingAllow = isAllowanceLocked ? 0 : Math.max(0, Number(input.checkingAllow) || 0);
  const totalSpecialIncentives = Number((prodAllow + checkingAllow).toFixed(2));

  // Overtime:
  // - Normal OT (1.5x): (Basic / 200) * 1.5 * Hours
  // - Double OT / SOT (2.0x): (Basic / 208) * 2.0 * Hours  [26 working days * 8 hrs]
  const otHours = Math.max(0, Number(input.otHours) || 0);
  const otRate = Number((otHourlyRate * NORMAL_OT_MULTIPLIER).toFixed(2));
  const otAmt = Number((otHourlyRate * NORMAL_OT_MULTIPLIER * otHours).toFixed(2));

  const sotHours = Math.max(0, Number(input.sotHours) || 0);
  const sotRate = Number((deductionHourlyRate * SUNDAY_OT_MULTIPLIER).toFixed(2));
  const sotAmt = Number((deductionHourlyRate * SUNDAY_OT_MULTIPLIER * sotHours).toFixed(2));

  const totAmt = Math.max(0, Number(input.totAmt) || 0);
  const poyaDayAmt = Math.max(0, Number(input.poyaDayAmt) || 0);
  const sundayAmt = Math.max(0, Number(input.sundayAmt) || 0);
  const specialLeaveAmt = Math.max(0, Number(input.specialLeaveAmt) || 0);

  const totalOt = Number((otAmt + sotAmt + totAmt + poyaDayAmt + sundayAmt + specialLeaveAmt).toFixed(2));

  // Gross Salary
  const gross = Number((basic + totalAllowances + totalSpecialIncentives + totalOt).toFixed(2));

  // Statutory Employer & Employee Contributions calculated on earned basic (basic minus unpaid leave & late/early out deductions)
  const epfLiableBasic = Math.max(
    0,
    Number((basic - unpaidDeduction - lateDeduction).toFixed(2))
  );
  const epf12 = Number((epfLiableBasic * EPF_EMPLOYER_RATE).toFixed(2));
  const etf3 = Number((epfLiableBasic * ETF_EMPLOYER_RATE).toFixed(2));

  // Deductions
  const epf8 = Number((epfLiableBasic * EPF_EMPLOYEE_RATE).toFixed(2));

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
    annualLeaveDays,
    lateHours,
    lateDeduction,
    unpaidDays,
    unpaidDeduction,
    advance,
    totalDeductions,
    net,
  };
}

