CREATE OR REPLACE FUNCTION public.can_access_quote(_quote_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = _quote_id
      AND user_is_org_member(q.organization_id)
      AND (
        is_coord_or_above(auth.uid())
        OR q.seller_id  = auth.uid()
        OR q.created_by = auth.uid()
        OR q.assigned_to = auth.uid()
      )
  );
$function$
