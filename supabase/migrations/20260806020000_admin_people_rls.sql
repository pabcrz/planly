-- Allow church admins and worship directors to manage (insert/update) people profiles in their church
CREATE POLICY people_insert_admin ON public.people FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.church_memberships AS membership
    WHERE membership.id = people.membership_id
    AND public.has_church_role(membership.church_id, 'worship_director')
  ));

CREATE POLICY people_update_admin ON public.people FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.church_memberships AS membership
    WHERE membership.id = people.membership_id
    AND public.has_church_role(membership.church_id, 'worship_director')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.church_memberships AS membership
    WHERE membership.id = people.membership_id
    AND public.has_church_role(membership.church_id, 'worship_director')
  ));
