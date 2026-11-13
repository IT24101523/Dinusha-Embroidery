import { z } from 'zod';

/**
 * Calculate completed age in years on a reference date (defaults to today)
 */
export function calculateAgeFromDob(dobStr: string, referenceDate: Date = new Date()): number | null {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (Number.isNaN(dob.getTime())) return null;

  let age = referenceDate.getFullYear() - dob.getFullYear();
  const monthDiff = referenceDate.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

/**
 * Extract 4-digit birth year from old (921450123V) or new (200420901125) Sri Lankan NIC
 */
export function extractBirthYearFromNic(nic: string): number | null {
  const clean = nic.trim().toUpperCase();
  if (/^[0-9]{9}[VX]$/.test(clean)) {
    return 1900 + Number(clean.slice(0, 2));
  }
  if (/^[0-9]{12}$/.test(clean)) {
    return Number(clean.slice(0, 4));
  }
  return null;
}

/**
 * Format Zod or regular errors into readable user-facing strings
 */
export function formatZodError(err: unknown): string {
  if (err instanceof z.ZodError) {
    return err.issues.map((i) => i.message).join(' | ');
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Validation failed';
}

const SL_PHONE_REGEX = /^(0[1-9][0-9]{8}|\+94[1-9][0-9]{8})$/;

export const employeeFormSchema = z
  .object({
    epfNo: z.coerce
      .number({ message: 'EPF No must be a number' })
      .int('EPF No must be a whole number')
      .min(1, 'EPF No must be at least 1')
      .max(999999, 'EPF No cannot exceed 999,999'),
    photoUrl: z
      .string()
      .max(400000, 'Photo file size is too large')
      .optional()
      .nullable(),
    initials: z
      .string()
      .trim()
      .min(1, 'Initials are required')
      .max(50, 'Initials too long')
      .regex(/^[A-Za-z.\s]+$/, 'Initials can only contain letters, dots (.) and spaces'),
    surname: z
      .string()
      .trim()
      .min(2, 'Surname must be at least 2 letters')
      .max(80, 'Surname too long')
      .regex(/^[A-Za-z\s'-]+$/, 'Surname can only contain letters and spaces'),
    fullName: z
      .string()
      .trim()
      .min(3, 'Full Name must be at least 3 characters')
      .max(150, 'Full Name too long')
      .regex(/^[A-Za-z.\s'-]+$/, 'Full Name can only contain letters, dots and spaces'),
    dob: z
      .string()
      .trim()
      .min(1, 'Date of Birth is required')
      .refine((val) => {
        const age = calculateAgeFromDob(val);
        return age !== null;
      }, 'Invalid Date of Birth')
      .refine((val) => {
        const age = calculateAgeFromDob(val);
        return age !== null && age >= 16;
      }, 'Employee must be over 16 years old')
      .refine((val) => {
        const age = calculateAgeFromDob(val);
        return age !== null && age <= 80;
      }, 'Please enter a realistic Date of Birth (age must be 80 or under)'),
    gender: z.enum(['Male', 'Female', 'Other'], {
      message: 'Please select a valid Gender',
    }),
    nic: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .refine(
        (v) => /^([0-9]{9}[VX]|[0-9]{12})$/.test(v),
        'Invalid NIC (use 9 digits + V/X like 921450123V, or 12 digits like 200420901125)'
      ),
    address: z
      .string()
      .trim()
      .min(4, 'Address must be at least 4 characters')
      .max(250, 'Address is too long'),
    phone: z
      .string()
      .trim()
      .transform((v) => v.replace(/[\s-]/g, ''))
      .refine(
        (v) => SL_PHONE_REGEX.test(v),
        'Enter a valid 10-digit Sri Lankan phone number (e.g. 0760958645)'
      ),
    emergencyPhone: z
      .string()
      .trim()
      .transform((v) => v.replace(/[\s-]/g, ''))
      .refine(
        (v) => SL_PHONE_REGEX.test(v),
        'Enter a valid 10-digit emergency contact number (e.g. 0332258961)'
      ),
    role: z.string().trim().min(2, 'Job role is required'),
    department: z.string().trim().default('නිෂ්පාදන අංශය'),
    grade: z.string().optional().nullable(),
    bankName: z.string().max(100, 'Bank name too long').optional().nullable(),
    accountNo: z
      .string()
      .trim()
      .optional()
      .nullable()
      .refine(
        (v) => !v || /^[0-9\s-]{6,20}$/.test(v),
        'Account number must be 6 to 20 digits'
      ),
    basicSalary: z.coerce
      .number({ message: 'Basic salary must be a number' })
      .min(5000, 'Basic salary must be at least LKR 5,000')
      .max(500000, 'Basic salary cannot exceed LKR 500,000'),
    joinedDate: z
      .string()
      .trim()
      .optional()
      .nullable()
      .refine((val) => {
        if (!val) return true;
        const d = new Date(val);
        if (Number.isNaN(d.getTime())) return false;
        const maxFuture = new Date();
        maxFuture.setDate(maxFuture.getDate() + 30);
        return d <= maxFuture;
      }, 'Date of Joining cannot be more than 30 days in the future'),
    // Document checklist
    hasNicCopy: z.boolean().default(false),
    hasBirthCertificate: z.boolean().default(false),
    hasGramasewakaCert: z.boolean().default(false),
    hasPoliceReport: z.boolean().default(false),
    hasMedicalReport: z.boolean().default(false),
    hasAppointmentLetter: z.boolean().default(false),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    const dobDate = new Date(data.dob);
    if (!Number.isNaN(dobDate.getTime())) {
      const nicBirthYear = extractBirthYearFromNic(data.nic);
      if (nicBirthYear !== null && nicBirthYear !== dobDate.getFullYear()) {
        ctx.addIssue({
          code: 'custom',
          path: ['nic'],
          message: `NIC birth year (${nicBirthYear}) does not match Date of Birth year (${dobDate.getFullYear()})`,
        });
      }

      if (data.joinedDate) {
        const ageAtJoin = calculateAgeFromDob(data.dob, new Date(data.joinedDate));
        if (ageAtJoin !== null && ageAtJoin < 16) {
          ctx.addIssue({
            code: 'custom',
            path: ['joinedDate'],
            message: 'Employee must be at least 16 years old on the Date of Joining',
          });
        }
      }
    }
  });

export const monthlySalaryInputSchema = z.object({
  employeeId: z.string().uuid('Please select a valid employee'),
  month: z.string().min(3, 'Payroll month is required'),
  basicSalary: z.coerce
    .number()
    .min(5000, 'Basic salary must be at least LKR 5,000')
    .max(500000, 'Basic salary cannot exceed LKR 500,000'),
  otHours: z.coerce
    .number()
    .min(0, 'OT hours cannot be negative')
    .max(300, 'OT hours cannot exceed 300 hrs/month')
    .default(0),
  sotHours: z.coerce
    .number()
    .min(0, 'SOT hours cannot be negative')
    .max(150, 'SOT hours cannot exceed 150 hrs/month')
    .default(0),
  totAmt: z.coerce.number().min(0).max(200000).default(0),
  poyaDayAmt: z.coerce.number().min(0).max(200000).default(0),
  sundayAmt: z.coerce.number().min(0).max(200000).default(0),
  specialLeaveAmt: z.coerce.number().min(0).max(200000).default(0),
  attAllow: z.coerce
    .number()
    .min(0, 'Allowance cannot be negative')
    .max(200000, 'Allowance cannot exceed LKR 200,000')
    .default(5000),
  nightAllow: z.coerce
    .number()
    .min(0, 'Allowance cannot be negative')
    .max(200000, 'Allowance cannot exceed LKR 200,000')
    .default(0),
  gradeAllow: z.coerce
    .number()
    .min(0, 'Allowance cannot be negative')
    .max(200000, 'Allowance cannot exceed LKR 200,000')
    .default(0),
  transAllow: z.coerce
    .number()
    .min(0, 'Allowance cannot be negative')
    .max(200000, 'Allowance cannot exceed LKR 200,000')
    .default(0),
  prodAllow: z.coerce
    .number()
    .min(0, 'Allowance cannot be negative')
    .max(200000, 'Allowance cannot exceed LKR 200,000')
    .default(0),
  checkingAllow: z.coerce
    .number()
    .min(0, 'Allowance cannot be negative')
    .max(200000, 'Allowance cannot exceed LKR 200,000')
    .default(0),
  lateHours: z.coerce
    .number()
    .min(0, 'Late hours cannot be negative')
    .max(200, 'Late hours cannot exceed 200 hrs/month')
    .default(0),
  unpaidDays: z.coerce
    .number()
    .min(0, 'Unpaid days cannot be negative')
    .max(25, 'Unpaid days cannot exceed 25 working days (200 hours)')
    .default(0),
  advance: z.coerce
    .number()
    .min(0, 'Salary advance cannot be negative')
    .max(300000, 'Salary advance cannot exceed LKR 300,000')
    .default(0),
});

export type EmployeeFormData = z.infer<typeof employeeFormSchema>;
export type MonthlySalaryInputData = z.infer<typeof monthlySalaryInputSchema>;
