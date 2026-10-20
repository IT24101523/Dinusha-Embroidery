-- Migration 0005: Disable RLS for internal factory operations (clients, styles, machines, production_assignments, employees)
-- Ensures server actions and client-side fetches can read and write without auth session token mismatches

ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.styles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
