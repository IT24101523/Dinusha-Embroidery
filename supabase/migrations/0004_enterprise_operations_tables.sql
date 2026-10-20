-- Enterprise Operations Tables: Needle Control, Quality Checking, HR & Payroll, Financial Accounting

-- 1. Needle Types Inventory
CREATE TABLE IF NOT EXISTS public.needle_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system VARCHAR(100) NOT NULL,
  size VARCHAR(50) NOT NULL,
  ref VARCHAR(100) NOT NULL,
  point VARCHAR(50) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Needle Daily Record Logs
CREATE TABLE IF NOT EXISTS public.needle_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  style_no VARCHAR(255) NOT NULL,
  epf_no VARCHAR(100) NOT NULL,
  seam_location VARCHAR(255) NOT NULL,
  size VARCHAR(50) NOT NULL,
  needle_type VARCHAR(100) NOT NULL,
  log_time VARCHAR(50) NOT NULL,
  traced VARCHAR(50) NOT NULL DEFAULT 'N',
  mc_number VARCHAR(50) NOT NULL,
  sign VARCHAR(100) NOT NULL,
  action_type VARCHAR(50) NOT NULL DEFAULT 'BROKEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Quality Checking Assignments
CREATE TABLE IF NOT EXISTS public.quality_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checker_name VARCHAR(100) NOT NULL,
  client_name VARCHAR(100) NOT NULL,
  style_name VARCHAR(255) NOT NULL,
  assignment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_hour INTEGER NOT NULL DEFAULT 8,
  span_hours INTEGER NOT NULL DEFAULT 11,
  plan_qty INTEGER NOT NULL DEFAULT 0,
  actual_qty INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Employees Master Registry
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epf_no INTEGER NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  dob DATE,
  gender VARCHAR(20),
  nic VARCHAR(50) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  emergency_phone VARCHAR(50),
  role VARCHAR(100) NOT NULL,
  basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Payroll Records
CREATE TABLE IF NOT EXISTS public.payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month VARCHAR(20) NOT NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  epf_no INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  nic VARCHAR(50) NOT NULL,
  role VARCHAR(100) NOT NULL,
  basic NUMERIC(12,2) NOT NULL DEFAULT 0,
  prod_allow NUMERIC(12,2) NOT NULL DEFAULT 0,
  grade_allow NUMERIC(12,2) NOT NULL DEFAULT 0,
  att_allow NUMERIC(12,2) NOT NULL DEFAULT 0,
  trans_allow NUMERIC(12,2) NOT NULL DEFAULT 0,
  night_allow NUMERIC(12,2) NOT NULL DEFAULT 0,
  ot_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  ot_amt NUMERIC(12,2) NOT NULL DEFAULT 0,
  sot_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  sot_amt NUMERIC(12,2) NOT NULL DEFAULT 0,
  gross NUMERIC(12,2) NOT NULL DEFAULT 0,
  epf8 NUMERIC(12,2) NOT NULL DEFAULT 0,
  epf12 NUMERIC(12,2) NOT NULL DEFAULT 0,
  etf3 NUMERIC(12,2) NOT NULL DEFAULT 0,
  late_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  late_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  unpaid_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  unpaid_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  advance NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  net NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Financial Transactions (Revenue, COGS, OPEX)
CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  machine VARCHAR(100),
  style_code VARCHAR(100),
  category VARCHAR(100),
  description TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  qty INTEGER DEFAULT 0,
  bill_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.needle_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.needle_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select/insert/update/delete
CREATE POLICY "Authenticated users can manage needle_types" ON public.needle_types FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage needle_logs" ON public.needle_logs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage quality_assignments" ON public.quality_assignments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage employees" ON public.employees FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage payroll_records" ON public.payroll_records FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage finance_transactions" ON public.finance_transactions FOR ALL USING (auth.role() = 'authenticated');
