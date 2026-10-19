-- Machine status enum
DO $$ BEGIN
  CREATE TYPE machine_status AS ENUM ('RUNNING', 'SETUP', 'MAINTENANCE', 'IDLE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Machines table
CREATE TABLE IF NOT EXISTS public.machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_number INTEGER NOT NULL UNIQUE,
  machine_name VARCHAR(100) NOT NULL,
  brand VARCHAR(100),
  heads INTEGER,
  speed INTEGER,
  status machine_status NOT NULL DEFAULT 'IDLE',
  operator_name VARCHAR(255),
  helper_name VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  color_scheme VARCHAR(50) NOT NULL DEFAULT 'slate',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Styles table
CREATE TABLE IF NOT EXISTS public.styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  style_name VARCHAR(255) NOT NULL,
  target_per_hour INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Production Assignments table
CREATE TABLE IF NOT EXISTS public.production_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id),
  style_id UUID NOT NULL REFERENCES public.styles(id),
  assignment_date DATE NOT NULL,
  start_hour INTEGER NOT NULL,
  span_hours INTEGER NOT NULL DEFAULT 11,
  plan_qty INTEGER NOT NULL DEFAULT 0,
  actual_qty INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_assignments ENABLE ROW LEVEL SECURITY;

-- RLS: Authenticated users can read production data
DROP POLICY IF EXISTS "Authenticated users can view machines" ON public.machines;
CREATE POLICY "Authenticated users can view machines" ON public.machines
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Production managers can manage machines" ON public.machines;
CREATE POLICY "Production managers can manage machines" ON public.machines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid()
      AND up.role IN ('FACTORY_MANAGER', 'PRODUCTION_MANAGER')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
CREATE POLICY "Authenticated users can view clients" ON public.clients
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Managers can manage clients" ON public.clients;
CREATE POLICY "Managers can manage clients" ON public.clients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid()
      AND up.role IN ('FACTORY_MANAGER', 'PRODUCTION_MANAGER')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view styles" ON public.styles;
CREATE POLICY "Authenticated users can view styles" ON public.styles
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Managers can manage styles" ON public.styles;
CREATE POLICY "Managers can manage styles" ON public.styles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid()
      AND up.role IN ('FACTORY_MANAGER', 'PRODUCTION_MANAGER')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view assignments" ON public.production_assignments;
CREATE POLICY "Authenticated users can view assignments" ON public.production_assignments
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Production managers can manage assignments" ON public.production_assignments;
CREATE POLICY "Production managers can manage assignments" ON public.production_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid()
      AND up.role IN ('FACTORY_MANAGER', 'PRODUCTION_MANAGER')
    )
  );

-- Seed initial 13 machines
INSERT INTO public.machines (machine_number, machine_name, status, operator_name, helper_name) VALUES
  (1, 'Machine 01', 'RUNNING', 'Nimal', 'Priyanta'),
  (2, 'Machine 02', 'RUNNING', 'Kamal', 'Lalith'),
  (3, 'Machine 03', 'RUNNING', 'Sunil', 'Dinesh'),
  (4, 'Machine 04', 'RUNNING', 'Bandara', 'Sanjeeva'),
  (5, 'Machine 05', 'RUNNING', 'Ruwan', 'Anura'),
  (6, 'Machine 06', 'SETUP', 'Nuwan', 'Indika'),
  (7, 'Machine 07', 'RUNNING', 'Chathura', 'Janaka'),
  (8, 'Machine 08', 'RUNNING', 'Dhammika', 'Gayan'),
  (9, 'Machine 09', 'RUNNING', 'Mahesh', 'Roshan'),
  (10, 'Machine 10', 'RUNNING', 'Asanka', 'Upul'),
  (11, 'Machine 11', 'RUNNING', 'Kasun', 'Priyantha'),
  (12, 'Machine 12', 'MAINTENANCE', 'Tharindu', 'Sujith'),
  (13, 'Machine 13', 'RUNNING', 'Saman', 'Buddhika')
ON CONFLICT (machine_number) DO NOTHING;

-- Seed clients
INSERT INTO public.clients (name, color_scheme) VALUES
  ('Nike Apparel', 'indigo'),
  ('Motif Brand', 'amber'),
  ('Tesco Sri Lanka', 'emerald'),
  ('Adidas Sportswear', 'purple')
ON CONFLICT DO NOTHING;
