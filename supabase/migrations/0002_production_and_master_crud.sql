-- Migration: 0002_production_and_master_crud.sql
-- Description: Production Management & Master Data CRUD (Clients, Machines, Styles & Parts, Production Assignments)

-- 1. Enhance clients table for Company CRUD
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contact_person VARCHAR(150);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- 2. Enhance machines table for Machine Inventory CRUD
ALTER TABLE public.machines ALTER COLUMN machine_number DROP NOT NULL;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS embroidery_types JSONB NOT NULL DEFAULT '["Normal"]'::jsonb;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS operational_status VARCHAR(50) NOT NULL DEFAULT 'Active';

-- 3. Enhance styles table for Style & Parts Master CRUD
ALTER TABLE public.styles ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE public.styles ADD COLUMN IF NOT EXISTS style_code VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE public.styles ADD COLUMN IF NOT EXISTS company_name VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE public.styles ADD COLUMN IF NOT EXISTS fabric_color VARCHAR(100) NOT NULL DEFAULT 'White';
ALTER TABLE public.styles ADD COLUMN IF NOT EXISTS currency VARCHAR(20) NOT NULL DEFAULT 'LKR';
ALTER TABLE public.styles ADD COLUMN IF NOT EXISTS garment_price NUMERIC(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.styles ADD COLUMN IF NOT EXISTS order_qty INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE public.styles ADD COLUMN IF NOT EXISTS parts JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.styles ADD COLUMN IF NOT EXISTS size_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.styles ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.styles ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 4. Enhance production_assignments table for Daily Production Plan Editor & Gantt Matrix
ALTER TABLE public.production_assignments ALTER COLUMN machine_id DROP NOT NULL;
ALTER TABLE public.production_assignments ALTER COLUMN style_id DROP NOT NULL;
ALTER TABLE public.production_assignments ADD COLUMN IF NOT EXISTS shift VARCHAR(30) NOT NULL DEFAULT 'day';
ALTER TABLE public.production_assignments ADD COLUMN IF NOT EXISTS machine_name VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE public.production_assignments ADD COLUMN IF NOT EXISTS client_name VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE public.production_assignments ADD COLUMN IF NOT EXISTS style_code VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE public.production_assignments ADD COLUMN IF NOT EXISTS style_name VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE public.production_assignments ADD COLUMN IF NOT EXISTS part_name VARCHAR(150) NOT NULL DEFAULT '';
ALTER TABLE public.production_assignments ADD COLUMN IF NOT EXISTS garment_size VARCHAR(50) NOT NULL DEFAULT 'L';
ALTER TABLE public.production_assignments ADD COLUMN IF NOT EXISTS operator_name VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE public.production_assignments ADD COLUMN IF NOT EXISTS helper_name VARCHAR(200) NOT NULL DEFAULT 'None';

-- 5. Backfill company_name on existing styles from linked clients
UPDATE public.styles s
SET company_name = c.name
FROM public.clients c
WHERE s.client_id = c.id
  AND (s.company_name IS NULL OR btrim(s.company_name) = '');

-- 6. Normalize existing numbered machines so machine_name is unique (Machine 01..13) and brand holds the model
UPDATE public.machines
SET
  brand = machine_name,
  machine_name = 'Machine ' || LPAD(machine_number::text, 2, '0')
WHERE machine_number IS NOT NULL
  AND machine_name NOT ILIKE 'Machine%';
