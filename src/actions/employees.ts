'use server';

import { employeeRepository } from '@/modules/payroll/repositories/employee-repository';
import { employeeFormSchema, EmployeeFormData } from '@/modules/payroll/domain/validation';
import { EmployeeEntity } from '@/modules/payroll/domain/entities';
import { revalidatePath } from 'next/cache';

export async function fetchEmployeesAction(): Promise<{ success: boolean; data?: EmployeeEntity[]; error?: string }> {
  try {
    const list = await employeeRepository.getAllEmployees();
    return { success: true, data: list };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch employees';
    return { success: false, error: message };
  }
}

export async function saveEmployeeAction(
  data: EmployeeFormData,
  id?: string
): Promise<{ success: boolean; employee?: EmployeeEntity; error?: string }> {
  try {
    const validated = employeeFormSchema.parse(data);

    let saved: EmployeeEntity;
    if (id) {
      saved = await employeeRepository.updateEmployee(id, validated);
    } else {
      saved = await employeeRepository.createEmployee(validated);
    }

    revalidatePath('/payroll');
    revalidatePath('/');
    return { success: true, employee: saved };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Validation failed';
    return { success: false, error: message };
  }
}

export async function deleteEmployeeAction(
  id: string,
  reason: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await employeeRepository.deleteEmployeeWithReason(id, reason, notes);
    revalidatePath('/payroll');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete employee';
    return { success: false, error: message };
  }
}

export async function updateChecklistAction(
  id: string,
  checklist: {
    hasNicCopy?: boolean;
    hasBirthCertificate?: boolean;
    hasGramasewakaCert?: boolean;
    hasPoliceReport?: boolean;
    hasMedicalReport?: boolean;
    hasAppointmentLetter?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await employeeRepository.updateEmployee(id, checklist);
    revalidatePath('/payroll');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update checklist';
    return { success: false, error: message };
  }
}

