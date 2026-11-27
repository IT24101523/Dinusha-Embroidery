-- Migration: 0005_style_in_out_control.sql
-- Description: Style Cut-In / Bundle Check List / Outgoing Despatch Note & Gate Pass Control

create table if not exists public.style_in_batches (
  id uuid primary key default gen_random_uuid(),
  batch_no text not null,
  received_date date not null default current_date,
  style_id uuid,
  style_code text not null default '',
  style_name text not null default '',
  company_name text not null default '',
  cut_no text not null default '',
  color text not null default '',
  parts_note text not null default '',
  client_ref_no text not null default '',
  received_by text not null default '',
  checked_by text not null default '',
  remarks text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.style_despatches (
  id uuid primary key default gen_random_uuid(),
  despatch_no text not null unique,
  gatepass_no text not null unique,
  checklist_no text not null default '',
  despatch_date date not null default current_date,
  company_name text not null default '',
  to_person text not null default '',
  vehicle_no text not null default '',
  driver_name text not null default '',
  md_status text not null default 'PASS' check (md_status in ('PASS', 'FAIL')),
  checked_by text not null default '',
  despatched_by text not null default '',
  authorized_by text not null default '',
  received_by text not null default '',
  remarks text not null default '',
  total_bundles integer not null default 0,
  total_qty integer not null default 0,
  total_ed integer not null default 0,
  total_md integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.style_bundles (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.style_in_batches(id) on delete cascade,
  style_id uuid,
  style_code text not null default '',
  style_name text not null default '',
  company_name text not null default '',
  received_date date not null default current_date,
  cut_no text not null default '',
  job_no text not null default '',
  bundle_no text not null default '',
  ratio text not null default '',
  no_range text not null default '',
  size text not null default '',
  part_name text not null default '',
  tag_qty integer not null default 0,
  good_qty integer not null default 0,
  md_qty integer not null default 0,
  ed_qty integer not null default 0,
  fab_damage_qty integer not null default 0,
  print_damage_qty integer not null default 0,
  md_status text not null default 'PENDING' check (md_status in ('PENDING', 'PASS', 'FAIL')),
  status text not null default 'IN_HOUSE' check (status in ('IN_HOUSE', 'READY_FOR_OUT', 'DISPATCHED')),
  checked_by text not null default '',
  checked_date date,
  despatch_id uuid references public.style_despatches(id) on delete set null,
  remarks text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_style_in_batches_style on public.style_in_batches(style_id, received_date desc);
create index if not exists idx_style_bundles_style on public.style_bundles(style_id, status);
create index if not exists idx_style_bundles_lookup on public.style_bundles(bundle_no, size, cut_no);
create index if not exists idx_style_bundles_despatch on public.style_bundles(despatch_id);
create index if not exists idx_style_despatches_date on public.style_despatches(despatch_date desc);
