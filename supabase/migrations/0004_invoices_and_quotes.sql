-- Zoho-Style Invoices, Quotations, Customers & Items Catalog with Production Style Reconciliation

create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  company_name text not null default '',
  email text not null default '',
  phone text not null default '',
  billing_address text not null default '',
  shipping_address text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.billing_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text not null default '',
  description text not null default '',
  rate numeric(14, 2) not null default 0,
  currency text not null default 'LKR',
  unit text not null default 'pcs',
  created_at timestamptz not null default now()
);

create table if not exists public.billing_quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number text not null unique,
  reference_number text not null default '',
  customer_id text,
  customer_name text not null,
  company_name text not null default '',
  billing_address text not null default '',
  quote_date date not null,
  expiry_date date,
  salesperson text not null default '',
  subject text not null default '',
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SENT', 'ACCEPTED', 'INVOICED', 'DECLINED')),
  line_items jsonb not null default '[]'::jsonb,
  sub_total numeric(14, 2) not null default 0,
  discount_value numeric(14, 2) not null default 0,
  discount_type text not null default 'PERCENT' check (discount_type in ('PERCENT', 'AMOUNT')),
  shipping_charges numeric(14, 2) not null default 0,
  adjustment_label text not null default 'Free T-shirt / Sample Adj.',
  adjustment_amount numeric(14, 2) not null default 0,
  total_amount numeric(14, 2) not null default 0,
  customer_notes text not null default '',
  terms_and_conditions text not null default '',
  converted_invoice_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  order_number text not null default '',
  quote_number text not null default '',
  customer_id text,
  customer_name text not null,
  company_name text not null default '',
  billing_address text not null default '',
  shipping_address text not null default '',
  invoice_date date not null,
  payment_terms text not null default 'Due On Receipt',
  due_date date not null,
  salesperson text not null default '',
  subject text not null default '',
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SENT', 'PARTIAL', 'PAID', 'VOID')),
  line_items jsonb not null default '[]'::jsonb,
  sub_total numeric(14, 2) not null default 0,
  discount_value numeric(14, 2) not null default 0,
  discount_type text not null default 'PERCENT' check (discount_type in ('PERCENT', 'AMOUNT')),
  shipping_charges numeric(14, 2) not null default 0,
  adjustment_label text not null default 'Damage / Sample Deduction',
  adjustment_amount numeric(14, 2) not null default 0,
  total_amount numeric(14, 2) not null default 0,
  amount_paid numeric(14, 2) not null default 0,
  balance_due numeric(14, 2) not null default 0,
  customer_notes text not null default '',
  terms_and_conditions text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_billing_quotes_date on public.billing_quotes(quote_date desc);
create index if not exists idx_billing_invoices_date on public.billing_invoices(invoice_date desc);
