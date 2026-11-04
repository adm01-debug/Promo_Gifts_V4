-- CRITICAL: is_admin_or_above() existed only in the live DB (never in migrations)
-- and only checked 'dev' OR 'admin' — skipping 'supervisor' entirely.
-- is_coord_or_above() referenced 'coordenador' role which does not exist in app_role enum.

CREATE OR REPLACE FUNCTION public.is_admin_or_above(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_supervisor_or_above(_user_id);
$$;

COMMENT ON FUNCTION public.is_admin_or_above IS
  'Alias for is_supervisor_or_above(). Returns true for dev, supervisor, admin, manager roles. Previously only checked dev|admin (missing supervisor). Fixed in 20260513070000.';

CREATE OR REPLACE FUNCTION public.is_coord_or_above(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_supervisor_or_above(_user_id);
$$;

COMMENT ON FUNCTION public.is_coord_or_above IS
  'Alias for is_supervisor_or_above(). Previously checked dev|admin|coordenador but coordenador is not a valid app_role. Fixed in 20260513070000.';
