'use server';

import { employeeRepository } from '@/modules/payroll/repositories/employee-repository';
import { payrollRepository } from '@/modules/payroll/repositories/payroll-repository';
import { monthlySalaryInputSchema, MonthlySalaryInputData, formatZodError } from '@/modules/payroll/domain/validation';
import { calculateSalaryForEmployee, ANNUAL_LEAVE_QUOTA_DAYS } from '@/modules/payroll/domain/calculator';
import { PayrollCalculationBreakdown } from '@/modules/payroll/domain/entities';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { recordAuditLog } from '@/lib/audit';
import { revalidatePath } from 'next/cache';

function extractYearFromMonthLabel(monthLabel: string): string {
  const m = String(monthLabel || '').match(/\b(20\d{2})\b/);
  return m ? m[1] : String(new Date().getFullYear());
}

export async function fetchEmployeeAnnualLeaveByYearAction(
  employeeId: string,
  year: string
): Promise<{
  success: boolean;
  leaveByMonth?: Record<string, number>;
  totalUsedDays?: number;
  error?: string;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('erp_audit_logs')
      .select('action, metadata, created_at')
      .eq('module', 'EMPLOYEE_ANNUAL_LEAVE')
      .order('created_at', { ascending: true })
      .limit(500);

    if (error) {
      return { success: true, leaveByMonth: {}, totalUsedDays: 0 };
    }

    const leaveByMonth: Record<string, number> = {};
    (data || []).forEach((row) => {
      const meta =
        row.metadata && typeof row.metadata === 'object'
          ? (row.metadata as Record<string, unknown>)
          : {};
      const rowEmpId = String(meta.employeeId || '');
      const rowMonth = String(meta.month || '');
      const rowYear = String(meta.year || extractYearFromMonthLabel(rowMonth));
      if (rowEmpId === employeeId && rowYear === year && rowMonth) {
        leaveByMonth[rowMonth] = Math.max(0, Number(meta.annualLeaveDays) || 0);
      }
    });

    const totalUsedDays = Object.values(leaveByMonth).reduce((s, d) => s + d, 0);
    return {
      success: true,
      leaveByMonth,
      totalUsedDays: Number(totalUsedDays.toFixed(2)),
    };
  } catch {
    return { success: true, leaveByMonth: {}, totalUsedDays: 0 };
  }
}

export async function fetchSalaryRecordAction(
  employeeId: string,
  month: string
): Promise<{ success: boolean; data?: PayrollCalculationBreakdown | null; error?: string }> {
  try {
    const year = extractYearFromMonthLabel(month);
    const [record, leaveRes] = await Promise.all([
      payrollRepository.getRecordByEmployeeAndMonth(employeeId, month),
      fetchEmployeeAnnualLeaveByYearAction(employeeId, year),
    ]);
    if (record && leaveRes.leaveByMonth && typeof leaveRes.leaveByMonth[month] === 'number') {
      record.annualLeaveDays = leaveRes.leaveByMonth[month];
    }
    return { success: true, data: record };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch salary record';
    return { success: false, error: message };
  }
}

export async function saveMonthlySalaryAction(
  rawInput: MonthlySalaryInputData
): Promise<{ success: boolean; breakdown?: PayrollCalculationBreakdown; error?: string }> {
  try {
    const validated = monthlySalaryInputSchema.parse(rawInput);
    const employee = await employeeRepository.getEmployeeById(validated.employeeId);

    if (!employee) {
      return { success: false, error: 'Employee not found' };
    }

    const existing = await payrollRepository.getRecordByEmployeeAndMonth(
      validated.employeeId,
      validated.month
    );

    if (existing?.status === 'PAID') {
      return {
        success: false,
        error:
          'This employee salary has already been marked as PAID and is locked. Admin authorization is required to unlock it before updating.',
      };
    }

    // Check 14-day Annual Leave quota for this year
    const year = extractYearFromMonthLabel(validated.month);
    const leaveSummary = await fetchEmployeeAnnualLeaveByYearAction(validated.employeeId, year);
    const leaveMap = leaveSummary.leaveByMonth || {};
    const usedInOtherMonths = Object.entries(leaveMap)
      .filter(([m]) => m !== validated.month)
      .reduce((sum, [, days]) => sum + (Number(days) || 0), 0);
    const requestedAnnualLeave = Math.max(0, Number(validated.annualLeaveDays) || 0);

    if (usedInOtherMonths + requestedAnnualLeave > ANNUAL_LEAVE_QUOTA_DAYS) {
      const remaining = Math.max(0, Number((ANNUAL_LEAVE_QUOTA_DAYS - usedInOtherMonths).toFixed(2)));
      return {
        success: false,
        error: `Annual Leave limit (${ANNUAL_LEAVE_QUOTA_DAYS} days/year) exceeded! This employee has already used ${usedInOtherMonths} day(s) in ${year} (Remaining: ${remaining}d). Please enter any excess leave under Unpaid Leave / Absents.`,
      };
    }

    // Pure domain calculation
    const breakdown: PayrollCalculationBreakdown = {
      ...calculateSalaryForEmployee(employee, validated),
      status: 'APPROVED',
    };

    // Save to database
    await payrollRepository.savePayrollRecord(breakdown);

    // Persist annualLeaveDays for this employee & month
    await recordAuditLog({
      module: 'EMPLOYEE_ANNUAL_LEAVE',
      action: `${validated.employeeId}::${validated.month}`,
      summary: `Annual Leave for EPF #${employee.epfNo} (${validated.month}): ${requestedAnnualLeave} day(s)`,
      metadata: {
        employeeId: validated.employeeId,
        epfNo: employee.epfNo,
        month: validated.month,
        year,
        annualLeaveDays: requestedAnnualLeave,
      },
    });

    await recordAuditLog({
      module: 'Payroll',
      action: 'SAVE_SALARY',
      summary: `Calculated & saved ${validated.month} salary for EPF #${employee.epfNo} - ${employee.fullName}.`,
    });

    revalidatePath('/payroll');
    revalidatePath('/erp');
    revalidatePath('/');
    return { success: true, breakdown };
  } catch (err) {
    return { success: false, error: formatZodError(err) };
  }
}

export async function updateSalaryPaymentStatusAction(input: {
  employeeId: string;
  month: string;
  targetStatus: 'PAID' | 'APPROVED';
  adminPin?: string;
  adminReason?: string;
  salaryInput?: MonthlySalaryInputData;
}): Promise<{ success: boolean; data?: PayrollCalculationBreakdown; error?: string }> {
  try {
    const employee = await employeeRepository.getEmployeeById(input.employeeId);
    if (!employee) {
      return { success: false, error: 'Employee not found' };
    }

    const existing = await payrollRepository.getRecordByEmployeeAndMonth(
      input.employeeId,
      input.month
    );

    if (input.targetStatus === 'APPROVED') {
      if ((input.adminPin || '').trim() !== '1234') {
        return {
          success: false,
          error: 'Invalid Admin Authorization PIN. Default Admin PIN is 1234.',
        };
      }
      if (!input.adminReason || input.adminReason.trim().length < 3) {
        return {
          success: false,
          error: 'Please enter a valid Admin authorization reason (at least 3 characters).',
        };
      }
      if (!existing) {
        return { success: false, error: 'No saved salary record found to unlock.' };
      }

      const updated = await payrollRepository.updateRecordStatus(
        input.employeeId,
        input.month,
        'APPROVED'
      );
      console.info(
        `[PAYROLL ADMIN OVERRIDE] Unlocked salary for ${employee.fullName} (EPF #${employee.epfNo}, ${input.month}). Reason: ${input.adminReason.trim()}`
      );
      revalidatePath('/payroll');
      revalidatePath('/');
      return { success: true, data: updated };
    }

    // Marking as PAID & locking
    let savedRecord: PayrollCalculationBreakdown;
    if (input.salaryInput) {
      const validated = monthlySalaryInputSchema.parse(input.salaryInput);
      const breakdown: PayrollCalculationBreakdown = {
        ...calculateSalaryForEmployee(employee, validated),
        status: 'PAID',
      };
      await payrollRepository.savePayrollRecord(breakdown);
      savedRecord = breakdown;
    } else if (existing) {
      savedRecord = await payrollRepository.updateRecordStatus(
        input.employeeId,
        input.month,
        'PAID'
      );
    } else {
      const defaultValidated = monthlySalaryInputSchema.parse({
        employeeId: employee.id,
        month: input.month,
        basicSalary: employee.basicSalary,
        attAllow: 5000,
      });
      const breakdown: PayrollCalculationBreakdown = {
        ...calculateSalaryForEmployee(employee, defaultValidated),
        status: 'PAID',
      };
      await payrollRepository.savePayrollRecord(breakdown);
      savedRecord = breakdown;
    }

    revalidatePath('/payroll');
    revalidatePath('/');
    return { success: true, data: savedRecord };
  } catch (err) {
    return { success: false, error: formatZodError(err) };
  }
}

export async function fetchMonthlyRecordsAction(
  month: string
): Promise<{ success: boolean; data?: PayrollCalculationBreakdown[]; error?: string }> {
  try {
    const records = await payrollRepository.getRecordsByMonth(month);
    return { success: true, data: records };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch monthly records';
    return { success: false, error: message };
  }
}

