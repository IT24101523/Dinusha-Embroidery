import { supabaseAdmin } from '@/lib/supabase/admin';
import { PayrollCalculationBreakdown } from '../domain/entities';

export class PayrollRepository {
  async getRecordByEmployeeAndMonth(employeeId: string, month: string): Promise<PayrollCalculationBreakdown | null> {
    const { data, error } = await supabaseAdmin
      .from('payroll_records')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('month', month)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get payroll record: ${error.message}`);
    }

    return data ? this.mapToBreakdown(data) : null;
  }

  async getRecordsByMonth(month: string): Promise<PayrollCalculationBreakdown[]> {
    const { data, error } = await supabaseAdmin
      .from('payroll_records')
      .select('*')
      .eq('month', month)
      .order('epf_no', { ascending: true });

    if (error) {
      console.error('[PayrollRepository] getRecordsByMonth error:', error);
      throw new Error(`Failed to load records: ${error.message}`);
    }

    return (data || []).map(this.mapToBreakdown);
  }

  async savePayrollRecord(breakdown: PayrollCalculationBreakdown): Promise<void> {
    const payload = {
      month: breakdown.month,
      employee_id: breakdown.employeeId,
      epf_no: breakdown.epfNo,
      name: breakdown.name,
      nic: breakdown.nic,
      role: breakdown.role,
      department: breakdown.department || 'නිෂ්පාදන අංශය',
      grade: breakdown.grade || '',
      bank_name: breakdown.bankName || '',
      account_no: breakdown.accountNo || '',
      basic: breakdown.basic,
      prod_allow: breakdown.prodAllow,
      grade_allow: breakdown.gradeAllow,
      att_allow: breakdown.attAllow,
      trans_allow: breakdown.transAllow,
      night_allow: breakdown.nightAllow,
      checking_allow: breakdown.checkingAllow,
      ot_hours: breakdown.otHours,
      ot_rate: breakdown.otRate,
      ot_amt: breakdown.otAmt,
      sot_hours: breakdown.sotHours,
      sot_rate: breakdown.sotRate,
      sot_amt: breakdown.sotAmt,
      tot_amt: breakdown.totAmt,
      poya_day_amt: breakdown.poyaDayAmt,
      sunday_amt: breakdown.sundayAmt,
      special_leave_amt: breakdown.specialLeaveAmt,
      gross: breakdown.gross,
      epf12: breakdown.epf12,
      etf3: breakdown.etf3,
      epf8: breakdown.epf8,
      late_hours: breakdown.lateHours,
      late_deduction: breakdown.lateDeduction,
      unpaid_days: breakdown.unpaidDays,
      unpaid_deduction: breakdown.unpaidDeduction,
      advance: breakdown.advance,
      total_deductions: breakdown.totalDeductions,
      net: breakdown.net,
      status: 'APPROVED',
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from('payroll_records')
      .upsert(payload, { onConflict: 'employee_id,month' });

    if (error) {
      console.error('[PayrollRepository] savePayrollRecord error:', error);
      throw new Error(`Failed to save salary: ${error.message}`);
    }
  }

  async deleteRecord(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('payroll_records')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete payroll record: ${error.message}`);
    }
  }

  private mapToBreakdown(row: Record<string, unknown>): PayrollCalculationBreakdown {
    return {
      employeeId: String(row.employee_id),
      epfNo: Number(row.epf_no),
      name: String(row.name),
      nic: String(row.nic),
      role: String(row.role),
      department: String(row.department || 'නිෂ්පාදන අංශය'),
      grade: String(row.grade || ''),
      bankName: String(row.bank_name || ''),
      accountNo: String(row.account_no || ''),
      month: String(row.month),
      basic: Number(row.basic || 0),
      prodAllow: Number(row.prod_allow || 0),
      gradeAllow: Number(row.grade_allow || 0),
      attAllow: Number(row.att_allow || 0),
      transAllow: Number(row.trans_allow || 0),
      nightAllow: Number(row.night_allow || 0),
      checkingAllow: Number(row.checking_allow || 0),
      totalAllowances: Number(
        (
          Number(row.att_allow || 0) +
          Number(row.night_allow || 0) +
          Number(row.grade_allow || 0) +
          Number(row.trans_allow || 0)
        ).toFixed(2)
      ),
      totalSpecialIncentives: Number(
        (Number(row.prod_allow || 0) + Number(row.checking_allow || 0)).toFixed(2)
      ),
      otHours: Number(row.ot_hours || 0),
      otRate: Number(row.ot_rate || 0),
      otAmt: Number(row.ot_amt || 0),
      sotHours: Number(row.sot_hours || 0),
      sotRate: Number(row.sot_rate || 0),
      sotAmt: Number(row.sot_amt || 0),
      totAmt: Number(row.tot_amt || 0),
      poyaDayAmt: Number(row.poya_day_amt || 0),
      sundayAmt: Number(row.sunday_amt || 0),
      specialLeaveAmt: Number(row.special_leave_amt || 0),
      totalOt: Number(
        (
          Number(row.ot_amt || 0) +
          Number(row.sot_amt || 0) +
          Number(row.tot_amt || 0) +
          Number(row.poya_day_amt || 0) +
          Number(row.sunday_amt || 0) +
          Number(row.special_leave_amt || 0)
        ).toFixed(2)
      ),
      gross: Number(row.gross || 0),
      epf12: Number(row.epf12 || 0),
      etf3: Number(row.etf3 || 0),
      epf8: Number(row.epf8 || 0),
      lateHours: Number(row.late_hours || 0),
      lateDeduction: Number(row.late_deduction || 0),
      unpaidDays: Number(row.unpaid_days || row.unpaid_hours || 0),
      unpaidDeduction: Number(row.unpaid_deduction || 0),
      advance: Number(row.advance || 0),
      totalDeductions: Number(row.total_deductions || 0),
      net: Number(row.net || 0),
    };
  }
}

export const payrollRepository = new PayrollRepository();

