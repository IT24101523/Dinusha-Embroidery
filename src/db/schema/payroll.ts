import { pgTable, uuid, varchar, integer, boolean, timestamp, numeric, date, text } from 'drizzle-orm/pg-core';

export const employees = pgTable('employees', {
  id: uuid('id').defaultRandom().primaryKey(),
  epfNo: integer('epf_no').notNull().unique(),
  initials: varchar('initials', { length: 100 }),
  surname: varchar('surname', { length: 100 }),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  dob: date('dob'),
  gender: varchar('gender', { length: 20 }),
  nic: varchar('nic', { length: 50 }).notNull(),
  address: text('address'),
  phone: varchar('phone', { length: 50 }),
  emergencyPhone: varchar('emergency_phone', { length: 50 }),
  role: varchar('role', { length: 100 }).notNull(),
  department: varchar('department', { length: 100 }).notNull().default('නිෂ්පාදන අංශය'),
  grade: varchar('grade', { length: 50 }),
  bankName: varchar('bank_name', { length: 100 }),
  accountNo: varchar('account_no', { length: 100 }),
  basicSalary: numeric('basic_salary', { precision: 12, scale: 2 }).notNull().default('0.00'),
  joinedDate: date('joined_date'),
  // Personal File Compliance Checklist
  hasNicCopy: boolean('has_nic_copy').notNull().default(false),
  hasBirthCertificate: boolean('has_birth_certificate').notNull().default(false),
  hasGramasewakaCert: boolean('has_gramasewaka_cert').notNull().default(false),
  hasPoliceReport: boolean('has_police_report').notNull().default(false),
  hasMedicalReport: boolean('has_medical_report').notNull().default(false),
  hasAppointmentLetter: boolean('has_appointment_letter').notNull().default(false),
  deletionReason: text('deletion_reason'),
  deletionNotes: text('deletion_notes'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const payrollRecords = pgTable('payroll_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  month: varchar('month', { length: 50 }).notNull(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  epfNo: integer('epf_no').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  nic: varchar('nic', { length: 50 }).notNull(),
  role: varchar('role', { length: 100 }).notNull(),
  department: varchar('department', { length: 100 }).default('නිෂ්පාදන අංශය'),
  grade: varchar('grade', { length: 50 }),
  bankName: varchar('bank_name', { length: 100 }),
  accountNo: varchar('account_no', { length: 100 }),
  // Earnings
  basic: numeric('basic', { precision: 12, scale: 2 }).notNull().default('0.00'),
  prodAllow: numeric('prod_allow', { precision: 12, scale: 2 }).notNull().default('0.00'),
  gradeAllow: numeric('grade_allow', { precision: 12, scale: 2 }).notNull().default('0.00'),
  attAllow: numeric('att_allow', { precision: 12, scale: 2 }).notNull().default('0.00'),
  transAllow: numeric('trans_allow', { precision: 12, scale: 2 }).notNull().default('0.00'),
  nightAllow: numeric('night_allow', { precision: 12, scale: 2 }).notNull().default('0.00'),
  checkingAllow: numeric('checking_allow', { precision: 12, scale: 2 }).notNull().default('0.00'),
  otHours: numeric('ot_hours', { precision: 8, scale: 2 }).notNull().default('0.00'),
  otRate: numeric('ot_rate', { precision: 10, scale: 2 }).notNull().default('0.00'),
  otAmt: numeric('ot_amt', { precision: 12, scale: 2 }).notNull().default('0.00'),
  sotHours: numeric('sot_hours', { precision: 8, scale: 2 }).notNull().default('0.00'),
  sotRate: numeric('sot_rate', { precision: 10, scale: 2 }).notNull().default('0.00'),
  sotAmt: numeric('sot_amt', { precision: 12, scale: 2 }).notNull().default('0.00'),
  totAmt: numeric('tot_amt', { precision: 12, scale: 2 }).notNull().default('0.00'),
  poyaDayAmt: numeric('poya_day_amt', { precision: 12, scale: 2 }).notNull().default('0.00'),
  sundayAmt: numeric('sunday_amt', { precision: 12, scale: 2 }).notNull().default('0.00'),
  specialLeaveAmt: numeric('special_leave_amt', { precision: 12, scale: 2 }).notNull().default('0.00'),
  gross: numeric('gross', { precision: 12, scale: 2 }).notNull().default('0.00'),
  // Employer Contributions
  epf12: numeric('epf12', { precision: 12, scale: 2 }).notNull().default('0.00'),
  etf3: numeric('etf3', { precision: 12, scale: 2 }).notNull().default('0.00'),
  // Deductions
  epf8: numeric('epf8', { precision: 12, scale: 2 }).notNull().default('0.00'),
  lateHours: numeric('late_hours', { precision: 8, scale: 2 }).notNull().default('0.00'),
  lateDeduction: numeric('late_deduction', { precision: 12, scale: 2 }).notNull().default('0.00'),
  unpaidHours: numeric('unpaid_hours', { precision: 8, scale: 2 }).notNull().default('0.00'),
  unpaidDays: numeric('unpaid_days', { precision: 8, scale: 2 }).notNull().default('0.00'),
  unpaidDeduction: numeric('unpaid_deduction', { precision: 12, scale: 2 }).notNull().default('0.00'),
  advance: numeric('advance', { precision: 12, scale: 2 }).notNull().default('0.00'),
  totalDeductions: numeric('total_deductions', { precision: 12, scale: 2 }).notNull().default('0.00'),
  net: numeric('net', { precision: 12, scale: 2 }).notNull().default('0.00'),
  status: varchar('status', { length: 50 }).notNull().default('DRAFT'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type PayrollRecord = typeof payrollRecords.$inferSelect;
export type NewPayrollRecord = typeof payrollRecords.$inferInsert;

