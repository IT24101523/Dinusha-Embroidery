-- Fix infinite recursion in user_profiles RLS policies
-- By using a SECURITY DEFINER function or direct auth.uid() check to read roles without triggering RLS recursively

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Replace recursive policies on user_profiles
DROP POLICY IF EXISTS "Managers can view all profiles" ON public.user_profiles;
CREATE POLICY "Managers can view all profiles" ON public.user_profiles
  FOR SELECT USING (
    auth.uid() = auth_user_id 
    OR public.get_my_role() IN ('CEO', 'FACTORY_MANAGER')
  );

DROP POLICY IF EXISTS "Factory manager can update profiles" ON public.user_profiles;
CREATE POLICY "Factory manager can update profiles" ON public.user_profiles
  FOR UPDATE USING (
    public.get_my_role() = 'FACTORY_MANAGER'
  );

-- Update other table policies to use get_my_role() to prevent recursive RLS issues
DROP POLICY IF EXISTS "Production managers can manage machines" ON public.machines;
CREATE POLICY "Production managers can manage machines" ON public.machines
  FOR ALL USING (
    public.get_my_role() IN ('FACTORY_MANAGER', 'PRODUCTION_MANAGER')
  );

DROP POLICY IF EXISTS "Managers can manage clients" ON public.clients;
CREATE POLICY "Managers can manage clients" ON public.clients
  FOR ALL USING (
    public.get_my_role() IN ('FACTORY_MANAGER', 'PRODUCTION_MANAGER')
  );

DROP POLICY IF EXISTS "Managers can manage styles" ON public.styles;
CREATE POLICY "Managers can manage styles" ON public.styles
  FOR ALL USING (
    public.get_my_role() IN ('FACTORY_MANAGER', 'PRODUCTION_MANAGER')
  );

DROP POLICY IF EXISTS "Production managers can manage assignments" ON public.production_assignments;
CREATE POLICY "Production managers can manage assignments" ON public.production_assignments
  FOR ALL USING (
    public.get_my_role() IN ('FACTORY_MANAGER', 'PRODUCTION_MANAGER')
  );
