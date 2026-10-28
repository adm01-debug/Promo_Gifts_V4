-- Fix P12: permission denied for view v_kit_component_complete
-- Concede SELECT na view v_kit_component_complete para os roles authenticated e service_role
-- Necessario para edge integration tests (Kit Coverage) e para kit-ai-builder edge function
GRANT SELECT ON public.v_kit_component_complete TO authenticated, service_role;
