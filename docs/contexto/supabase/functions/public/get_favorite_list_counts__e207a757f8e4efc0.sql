CREATE OR REPLACE FUNCTION public.get_favorite_list_counts(_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(list_id uuid, item_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT fl.id AS list_id, COUNT(fi.id)::bigint AS item_count
  FROM favorite_lists fl LEFT JOIN favorite_items fi ON fi.list_id = fl.id
  WHERE fl.user_id = COALESCE(_user_id, (SELECT auth.uid()))
    AND (COALESCE(_user_id, (SELECT auth.uid())) = (SELECT auth.uid())
      OR is_admin_or_above((SELECT auth.uid())))
    AND fl.is_archived = false
  GROUP BY fl.id ORDER BY fl.position ASC NULLS LAST, fl.created_at ASC;
$function$
