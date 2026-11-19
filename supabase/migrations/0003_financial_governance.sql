-- Financial Governance & Revenue Module Tables
create table if not exists public.finance_revenue_logs (
  id uuid primary key default gen_random_uuid(),
  log_date date not null,
  machine_name text not null,
  style_code text not null,
  qty integer not null check (qty > 0),
  payment_status text not null default 'Received' check (payment_status in ('Received', 'Pending')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.finance_salary_logs (
  id uuid primary key default gen_random_uuid(),
  payroll_month text not null,
  employee_name text not null,
  basic_salary numeric(14, 2) not null default 0,
  ot_allowances numeric(14, 2) not null default 0,
  epf_12 numeric(14, 2) not null default 0,
  etf_3 numeric(14, 2) not null default 0,
  payment_status text not null default 'Paid' check (payment_status in ('Paid', 'Pending')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.finance_cogs_logs (
  id uuid primary key default gen_random_uuid(),
  log_date date not null,
  category text not null,
  description text not null,
  amount numeric(14, 2) not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.finance_opex_logs (
  id uuid primary key default gen_random_uuid(),
  log_date date not null,
  category text not null,
  description text not null,
  amount numeric(14, 2) not null default 0,
  bill_data_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_finance_rev_date on public.finance_revenue_logs(log_date desc);
create index if not exists idx_finance_sal_month on public.finance_salary_logs(payroll_month);
create index if not exists idx_finance_cogs_date on public.finance_cogs_logs(log_date desc);
create index if not exists idx_finance_opex_date on public.finance_opex_logs(log_date desc);
