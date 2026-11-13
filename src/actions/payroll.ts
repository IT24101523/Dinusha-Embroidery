'use server';

import { employeeRepository } from '@/modules/payroll/repositories/employee-repository';
import { payrollRepository } from '@/modules/payroll/repositories/payroll-repository';
import { monthlySalaryInputSchema, MonthlySalaryInputData } from '@/modules/payroll/domain/validation';
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

    // Pure domain calculation
    const breakdown = calculateSalaryForEmployee(employee, validated);

    // Save to database
    await payrollRepository.savePayrollRecord(breakdown);

    revalidatePath('/payroll');
    revalidatePath('/');
    return { success: true, breakdown };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to calculate and save salary';
    return { success: false, error: message };
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

