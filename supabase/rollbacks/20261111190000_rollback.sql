-- Rollback de 20261111190000: remove a função criada/endurecida (estado de produção em 2026-11-11:
-- fn_get_rupture_alerts inexistente). Se a 20261101150000 tiver sido aplicada antes e se quiser só
-- desfazer o endurecimento, use: ALTER FUNCTION public.fn_get_rupture_alerts() SET search_path = public;
DROP FUNCTION IF EXISTS public.fn_get_rupture_alerts();
