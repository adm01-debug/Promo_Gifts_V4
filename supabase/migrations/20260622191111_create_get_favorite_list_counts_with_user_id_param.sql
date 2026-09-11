
CREATE OR REPLACE FUNCTION public.get_favorite_list_counts()
RETURNS TABLE(list_id uuid, item_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $fn$
  SELECT fl.id AS list_id, COUNT(fi.id)::bigint AS item_count
  FROM favorite_lists fl LEFT JOIN favorite_items fi ON fi.list_id = fl.id
  WHERE fl.user_id = (SELECT auth.uid()) AND fl.is_archived = false
  GROUP BY fl.id ORDER BY fl.position ASC NULLS LAST, fl.created_at ASC;
$fn$;
GRANT EXECUTE ON FUNCTION public.get_favorite_list_counts() TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.get_favorite_list_counts(_user_id uuid)
RETURNS TABLE(list_id uuid, item_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $fn$
  SELECT fl.id AS list_id, COUNT(fi.id)::bigint AS item_count
  FROM favorite_lists fl LEFT JOIN favorite_items fi ON fi.list_id = fl.id
  WHERE fl.user_id = _user_id
    AND (_user_id = (SELECT auth.uid()) OR is_admin_or_above((SELECT auth.uid())))
    AND fl.is_archived = false
  GROUP BY fl.id ORDER BY fl.position ASC NULLS LAST, fl.created_at ASC;
$fn$;
GRANT EXECUTE ON FUNCTION public.get_favorite_list_counts(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_favorite_list_counts(uuid) FROM anon;
;
