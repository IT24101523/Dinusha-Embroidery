'use server';

import { employeeRepository } from '@/modules/payroll/repositories/employee-repository';
import { employeeFormSchema, EmployeeFormData, formatZodError } from '@/modules/payroll/domain/validation';
import { EmployeeEntity } from '@/modules/payroll/domain/entities';
import { recordAuditLog } from '@/lib/audit';
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

export async function fetchRemovedEmployeesAction(): Promise<{
  success: boolean;
  data?: EmployeeEntity[];
  error?: string;
}> {
  try {
    const all = await employeeRepository.getAllEmployees(true);
    const removed = all.filter((e) => !e.isActive);
    return { success: true, data: removed };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch removed employees';
    return { success: false, error: message };
  }
}

export async function restoreEmployeeAction(
  id: string
): Promise<{ success: boolean; employee?: EmployeeEntity; error?: string }> {
  try {
    const updated = await employeeRepository.updateEmployee(id, { isActive: true });
    await recordAuditLog({
      module: 'Employees',
      action: 'RESTORE',
      summary: `Restored former employee EPF #${updated.epfNo} - ${updated.fullName} to active status.`,
    });
    revalidatePath('/payroll');
    revalidatePath('/erp');
    revalidatePath('/');
    return { success: true, employee: updated };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to restore employee';
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

    await recordAuditLog({
      module: 'Employees',
      action: id ? 'UPDATE' : 'CREATE',
      summary: `${id ? 'Updated' : 'Registered'} employee EPF #${saved.epfNo} - ${saved.fullName} (${saved.role}).`,
    });

    revalidatePath('/payroll');
    revalidatePath('/erp');
    revalidatePath('/');
    return { success: true, employee: saved };
  } catch (err) {
    return { success: false, error: formatZodError(err) };
  }
}

export async function deleteEmployeeAction(
  id: string,
  reason: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await employeeRepository.deleteEmployeeWithReason(id, reason, notes);
    await recordAuditLog({
      module: 'Employees',
      action: 'DELETE',
      summary: `Removed employee ID ${id} (Reason: ${reason}).`,
    });
    revalidatePath('/payroll');
    revalidatePath('/erp');
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

