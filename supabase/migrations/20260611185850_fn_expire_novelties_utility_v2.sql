
DROP FUNCTION IF EXISTS public.fn_expire_novelties();
DROP FUNCTION IF EXISTS public.fn_expire_novelties(integer);

CREATE OR REPLACE FUNCTION public.fn_expire_novelties()
RETURNS TABLE(expired_count integer, still_inactive integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_expired integer;
  v_inactive integer;
BEGIN
  UPDATE product_novelties
  SET is_active = false,
      updated_at = NOW()
  WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
  GET DIAGNOSTICS v_expired = ROW_COUNT;

  SELECT COUNT(*) INTO v_inactive
  FROM product_novelties WHERE is_active = false;

  RETURN QUERY SELECT v_expired, v_inactive;
END;
$$;

COMMENT ON FUNCTION public.fn_expire_novelties() IS
'Sweep diário: marca is_active=false em product_novelties com expires_at < NOW().';

GRANT EXECUTE ON FUNCTION public.fn_expire_novelties() TO service_role, authenticated;
;
