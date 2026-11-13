import { supabaseAdmin, formatSupabaseError } from '@/lib/supabase/admin';
import { EmployeeEntity } from '../domain/entities';
import { EmployeeFormData } from '../domain/validation';

export class EmployeeRepository {
  async getAllEmployees(includeInactive = false): Promise<EmployeeEntity[]> {
    let query = supabaseAdmin
      .from('employees')
      .select('*')
      .order('epf_no', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[EmployeeRepository] getAllEmployees error:', error);
      throw new Error(`Failed to load employees: ${error.message}`);
    }

    return (data || []).map(this.mapToEntity);
  }

  async getEmployeeById(id: string): Promise<EmployeeEntity | null> {
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Employee not found: ${error.message}`);
    }

    return data ? this.mapToEntity(data) : null;
  }

  async createEmployee(payload: EmployeeFormData): Promise<EmployeeEntity> {
    const { data, error } = await supabaseAdmin
      .from('employees')
      .insert([
        {
          epf_no: payload.epfNo,
          initials: payload.initials || null,
          surname: payload.surname || null,
          full_name: payload.fullName,
          dob: payload.dob || null,
          gender: payload.gender || null,
          nic: payload.nic,
          address: payload.address || null,
          phone: payload.phone || null,
          emergency_phone: payload.emergencyPhone || null,
          role: payload.role,
          department: payload.department || 'නිෂ්පාදන අංශය',
          grade: payload.grade || null,
          bank_name: payload.bankName || null,
          account_no: payload.accountNo || null,
          basic_salary: payload.basicSalary,
          joined_date: payload.joinedDate || null,
          has_nic_copy: payload.hasNicCopy ?? false,
          has_birth_certificate: payload.hasBirthCertificate ?? false,
          has_gramasewaka_cert: payload.hasGramasewakaCert ?? false,
          has_police_report: payload.hasPoliceReport ?? false,
          has_medical_report: payload.hasMedicalReport ?? false,
          has_appointment_letter: payload.hasAppointmentLetter ?? false,
          is_active: payload.isActive ?? true,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[EmployeeRepository] createEmployee error:', error);
      throw new Error(formatSupabaseError(error));
    }

    return this.mapToEntity(data);
  }

  async updateEmployee(id: string, payload: Partial<EmployeeFormData>): Promise<EmployeeEntity> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.epfNo !== undefined) updateData.epf_no = payload.epfNo;
    if (payload.initials !== undefined) updateData.initials = payload.initials;
    if (payload.surname !== undefined) updateData.surname = payload.surname;
    if (payload.fullName !== undefined) updateData.full_name = payload.fullName;
    if (payload.dob !== undefined) updateData.dob = payload.dob;
    if (payload.gender !== undefined) updateData.gender = payload.gender;
    if (payload.nic !== undefined) updateData.nic = payload.nic;
    if (payload.address !== undefined) updateData.address = payload.address;
    if (payload.phone !== undefined) updateData.phone = payload.phone;
    if (payload.emergencyPhone !== undefined) updateData.emergency_phone = payload.emergencyPhone;
    if (payload.role !== undefined) updateData.role = payload.role;
    if (payload.department !== undefined) updateData.department = payload.department;
    if (payload.grade !== undefined) updateData.grade = payload.grade;
    if (payload.bankName !== undefined) updateData.bank_name = payload.bankName;
    if (payload.accountNo !== undefined) updateData.account_no = payload.accountNo;
    if (payload.basicSalary !== undefined) updateData.basic_salary = payload.basicSalary;
    if (payload.joinedDate !== undefined) updateData.joined_date = payload.joinedDate;
    if (payload.hasNicCopy !== undefined) updateData.has_nic_copy = payload.hasNicCopy;
    if (payload.hasBirthCertificate !== undefined) updateData.has_birth_certificate = payload.hasBirthCertificate;
    if (payload.hasGramasewakaCert !== undefined) updateData.has_gramasewaka_cert = payload.hasGramasewakaCert;
    if (payload.hasPoliceReport !== undefined) updateData.has_police_report = payload.hasPoliceReport;
    if (payload.hasMedicalReport !== undefined) updateData.has_medical_report = payload.hasMedicalReport;
    if (payload.hasAppointmentLetter !== undefined) updateData.has_appointment_letter = payload.hasAppointmentLetter;
    if (payload.isActive !== undefined) updateData.is_active = payload.isActive;

    const { data, error } = await supabaseAdmin
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[EmployeeRepository] updateEmployee error:', error);
      throw new Error(formatSupabaseError(error));
    }

    return this.mapToEntity(data);
  }

  async deleteEmployeeWithReason(id: string, reason: string, notes?: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('employees')
      .update({
        is_active: false,
        deletion_reason: reason,
        deletion_notes: notes || null,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to remove employee: ${error.message}`);
    }
  }

  async permanentlyDeleteEmployee(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to permanently delete employee: ${error.message}`);
    }
  }

  private mapToEntity(row: Record<string, unknown>): EmployeeEntity {
    return {
      id: String(row.id),
      epfNo: Number(row.epf_no),
      initials: row.initials ? String(row.initials) : null,
      surname: row.surname ? String(row.surname) : null,
      fullName: String(row.full_name),
      dob: row.dob ? String(row.dob) : null,
      gender: row.gender ? String(row.gender) : null,
      nic: String(row.nic),
      address: row.address ? String(row.address) : null,
      phone: row.phone ? String(row.phone) : null,
      emergencyPhone: row.emergency_phone ? String(row.emergency_phone) : null,
      role: String(row.role),
      department: String(row.department || 'නිෂ්පාදන අංශය'),
      grade: row.grade ? String(row.grade) : null,
      bankName: row.bank_name ? String(row.bank_name) : null,
      accountNo: row.account_no ? String(row.account_no) : null,
      basicSalary: Number(row.basic_salary || 0),
      joinedDate: row.joined_date ? String(row.joined_date) : null,
      hasNicCopy: Boolean(row.has_nic_copy),
      hasBirthCertificate: Boolean(row.has_birth_certificate),
      hasGramasewakaCert: Boolean(row.has_gramasewaka_cert),
      hasPoliceReport: Boolean(row.has_police_report),
      hasMedicalReport: Boolean(row.has_medical_report),
      hasAppointmentLetter: Boolean(row.has_appointment_letter),
      deletionReason: row.deletion_reason ? String(row.deletion_reason) : null,
      deletionNotes: row.deletion_notes ? String(row.deletion_notes) : null,
      deletedAt: row.deleted_at ? String(row.deleted_at) : null,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at ? String(row.created_at) : undefined,
      updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    };
  }
}

export const employeeRepository = new EmployeeRepository();
