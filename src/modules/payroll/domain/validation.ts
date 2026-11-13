import { z } from 'zod';

export const employeeFormSchema = z.object({
  epfNo: z.coerce.number().int().positive('EPF number must be positive'),
  initials: z.string().min(1, 'Initials are required'),
  surname: z.string().min(1, 'Surname is required'),
  fullName: z.string().min(1, 'Full Name is required'),
  dob: z.string().optional().nullable(),
  gender: z.string().min(1, 'Gender is required'),
  nic: z.string().min(8, 'NIC is required'),
  address: z.string().min(2, 'Address is required'),
  phone: z.string().min(5, 'Phone number is required'),
  emergencyPhone: z.string().min(5, 'Emergency contact is required'),
  role: z.string().min(2, 'Job role is required'),
  department: z.string().default('නිෂ්පාදන අංශය'),
  grade: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  accountNo: z.string().optional().nullable(),
  basicSalary: z.coerce.number().min(0, 'Basic salary cannot be negative'),
  joinedDate: z.string().optional().nullable(),
  // Document checklist
  hasNicCopy: z.boolean().default(false),
  hasBirthCertificate: z.boolean().default(false),
  hasGramasewakaCert: z.boolean().default(false),
  hasPoliceReport: z.boolean().default(false),
  hasMedicalReport: z.boolean().default(false),
  hasAppointmentLetter: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const monthlySalaryInputSchema = z.object({
  employeeId: z.string().uuid(),
  month: z.string().min(3),
  basicSalary: z.coerce.number().min(0),
  otHours: z.coerce.number().min(0).default(0),
  sotHours: z.coerce.number().min(0).default(0),
  totAmt: z.coerce.number().min(0).default(0),
  poyaDayAmt: z.coerce.number().min(0).default(0),
  sundayAmt: z.coerce.number().min(0).default(0),
  specialLeaveAmt: z.coerce.number().min(0).default(0),
  attAllow: z.coerce.number().min(0).default(5000),
  nightAllow: z.coerce.number().min(0).default(0),
  gradeAllow: z.coerce.number().min(0).default(0),
  transAllow: z.coerce.number().min(0).default(0),
  prodAllow: z.coerce.number().min(0).default(0),
  checkingAllow: z.coerce.number().min(0).default(0),
  lateHours: z.coerce.number().min(0).default(0),
  unpaidDays: z.coerce.number().min(0).default(0),
  advance: z.coerce.number().min(0).default(0),
});

export type EmployeeFormData = z.infer<typeof employeeFormSchema>;
export type MonthlySalaryInputData = z.infer<typeof monthlySalaryInputSchema>;

