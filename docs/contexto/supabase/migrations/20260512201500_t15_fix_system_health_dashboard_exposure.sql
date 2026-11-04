ALTER VIEW public.v_system_health_dashboard SET (security_invoker = true);

REVOKE ALL ON public.v_system_health_dashboard FROM anon;

REVOKE ALL ON public.v_system_health_dashboard FROM authenticated;
