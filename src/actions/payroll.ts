'use server';

import { employeeRepository } from '@/modules/payroll/repositories/employee-repository';
import { payrollRepository } from '@/modules/payroll/repositories/payroll-repository';
import { monthlySalaryInputSchema, MonthlySalaryInputData, formatZodError } from '@/modules/payroll/domain/validation';
import { calculateSalaryForEmployee } from '@/modules/payroll/domain/calculator';
import { PayrollCalculationBreakdown } from '@/modules/payroll/domain/entities';
import { revalidatePath } from 'next/cache';

export async function fetchSalaryRecordAction(
  employeeId: string,
  month: string
): Promise<{ success: boolean; data?: PayrollCalculationBreakdown | null; error?: string }> {
  try {
    const record = await payrollRepository.getRecordByEmployeeAndMonth(employeeId, month);
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

    // Pure domain calculation
    const breakdown: PayrollCalculationBreakdown = {
      ...calculateSalaryForEmployee(employee, validated),
      status: 'APPROVED',
    };

    // Save to database
    await payrollRepository.savePayrollRecord(breakdown);

    revalidatePath('/payroll');
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

