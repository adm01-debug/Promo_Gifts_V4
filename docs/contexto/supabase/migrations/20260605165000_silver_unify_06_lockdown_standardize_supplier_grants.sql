REVOKE ALL ON FUNCTION public.fn_standardize_supplier(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_standardize_supplier(uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.fn_standardize_supplier(uuid, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fn_standardize_supplier(uuid, integer) TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_standardize_supplier(uuid, integer) TO service_role;
