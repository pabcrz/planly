DROP POLICY IF EXISTS services_insert_leader ON public.services;
DROP POLICY IF EXISTS services_update_leader ON public.services;

CREATE POLICY services_insert_leader ON public.services FOR INSERT TO authenticated 
WITH CHECK (
  public.has_church_role(church_id, 'worship_director') 
  AND timezone = 'America/Mexico_City' 
  AND (team_id IS NULL OR EXISTS (SELECT 1 FROM public.teams AS team WHERE team.id = services.team_id AND team.church_id = services.church_id))
);

CREATE POLICY services_update_leader ON public.services FOR UPDATE TO authenticated 
USING (public.has_church_role(church_id, 'worship_director')) 
WITH CHECK (
  public.has_church_role(church_id, 'worship_director') 
  AND timezone = 'America/Mexico_City' 
  AND (team_id IS NULL OR EXISTS (SELECT 1 FROM public.teams AS team WHERE team.id = services.team_id AND team.church_id = services.church_id))
);
