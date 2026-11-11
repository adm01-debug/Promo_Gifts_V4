-- Rollback de 20261111190000: volta o search_path original de fn_get_rupture_alerts().
ALTER FUNCTION public.fn_get_rupture_alerts() SET search_path = public;
