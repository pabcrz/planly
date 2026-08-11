-- 1. Remove RLS policies that reference teams from services
DROP POLICY IF EXISTS services_insert_leader ON public.services;
DROP POLICY IF EXISTS services_update_leader ON public.services;

CREATE POLICY services_insert_leader ON public.services FOR INSERT TO authenticated 
WITH CHECK (
  public.has_church_role(church_id, 'worship_director') 
  AND timezone = 'America/Mexico_City' 
);

CREATE POLICY services_update_leader ON public.services FOR UPDATE TO authenticated 
USING (public.has_church_role(church_id, 'worship_director')) 
WITH CHECK (
  public.has_church_role(church_id, 'worship_director') 
  AND timezone = 'America/Mexico_City' 
);

-- 2. Drop the team_id column from services
ALTER TABLE public.services DROP COLUMN IF EXISTS team_id;

-- 3. Drop teams related tables
DROP TABLE IF EXISTS public.team_members;
DROP TABLE IF EXISTS public.teams;
