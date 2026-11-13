-- Migration: 0001_initial_payroll_and_employees.sql
-- Description: Core Schemas for Staff Registry with Document Checklist & Sinhala Payroll Processing (Dinusha Embroidery)

-- 1. Employees Master Registry
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epf_no INTEGER NOT NULL UNIQUE,
  initials VARCHAR(100),
  surname VARCHAR(100),
  full_name VARCHAR(255) NOT NULL,
  dob DATE,
  gender VARCHAR(20),
  nic VARCHAR(50) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  emergency_phone VARCHAR(50),
  role VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL DEFAULT 'නිෂ්පාදන අංශය',
  grade VARCHAR(50),
  bank_name VARCHAR(100),
  account_no VARCHAR(100),
  basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  joined_date DATE,
  has_nic_copy BOOLEAN NOT NULL DEFAULT false,
  has_birth_certificate BOOLEAN NOT NULL DEFAULT false,
  has_gramasewaka_cert BOOLEAN NOT NULL DEFAULT false,
  has_police_report BOOLEAN NOT NULL DEFAULT false,
  has_medical_report BOOLEAN NOT NULL DEFAULT false,
  has_appointment_letter BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all new columns exist on existing employees table
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS initials VARCHAR(100);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS surname VARCHAR(100);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS department VARCHAR(100) NOT NULL DEFAULT 'නිෂ්පාදන අංශය';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS grade VARCHAR(50);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS account_no VARCHAR(100);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS joined_date DATE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS has_nic_copy BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS has_birth_certificate BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS has_gramasewaka_cert BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS has_police_report BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS has_medical_report BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS has_appointment_letter BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 2. Monthly Payroll Records & Sri Lankan Statutory Deductions (EPF/ETF)
CREATE TABLE IF NOT EXISTS public.payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month VARCHAR(50) NOT NULL, -- e.g. 'October 2026' or '2026-10'
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  epf_no INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  nic VARCHAR(50) NOT NULL,
  role VARCHAR(100) NOT NULL,
  department VARCHAR(100) DEFAULT 'නිෂ්පාදන අංශය',
  grade VARCHAR(50),
  bank_name VARCHAR(100),
  account_no VARCHAR(100),
  basic NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  prod_allow NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  grade_allow NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  att_allow NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  trans_allow NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  night_allow NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  checking_allow NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  ot_hours NUMERIC(8,2) NOT NULL DEFAULT 0.00,
  ot_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ot_amt NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  sot_hours NUMERIC(8,2) NOT NULL DEFAULT 0.00,
  sot_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  sot_amt NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  tot_amt NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  poya_day_amt NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  sunday_amt NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  special_leave_amt NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  gross NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  epf8 NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  epf12 NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  etf3 NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  late_hours NUMERIC(8,2) NOT NULL DEFAULT 0.00,
  late_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  unpaid_hours NUMERIC(8,2) NOT NULL DEFAULT 0.00,
  unpaid_days NUMERIC(8,2) NOT NULL DEFAULT 0.00,
  unpaid_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  advance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  net NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all new columns exist on existing payroll_records table
ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'නිෂ්පාදන අංශය';
ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS grade VARCHAR(50);
ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS account_no VARCHAR(100);
ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS checking_allow NUMERIC(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS ot_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS sot_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS tot_amt NUMERIC(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS poya_day_amt NUMERIC(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS sunday_amt NUMERIC(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS special_leave_amt NUMERIC(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS unpaid_days NUMERIC(8,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'DRAFT';
ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Unique constraint for employee + month
DO $$ BEGIN
  ALTER TABLE public.payroll_records ADD CONSTRAINT uq_payroll_emp_month UNIQUE (employee_id, month);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enable RLS and permissive policy
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated and anon on employees" ON public.employees;
CREATE POLICY "Allow all for authenticated and anon on employees" ON public.employees
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated and anon on payroll" ON public.payroll_records;
CREATE POLICY "Allow all for authenticated and anon on payroll" ON public.payroll_records
  FOR ALL USING (true) WITH CHECK (true);

