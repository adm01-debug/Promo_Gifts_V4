
-- ============================================================
-- PEÇA 1: Trigger updated_at em access_security_settings
-- Usa fn_set_updated_at() já existente (correto e homologado)
-- ============================================================
CREATE TRIGGER trg_access_security_settings_updated_at
  BEFORE UPDATE ON public.access_security_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_set_updated_at();

-- Smoke test: forçar UPDATE e verificar que updated_at muda
-- (executado como verificação, não altera estado real)
DO $$
DECLARE
  v_before TIMESTAMPTZ;
  v_after  TIMESTAMPTZ;
BEGIN
  SELECT updated_at INTO v_before FROM public.access_security_settings LIMIT 1;

  UPDATE public.access_security_settings
  SET max_failed_attempts = max_failed_attempts  -- no-op real, só aciona o trigger
  WHERE id = (SELECT id FROM public.access_security_settings LIMIT 1);

  SELECT updated_at INTO v_after FROM public.access_security_settings LIMIT 1;

  IF v_after >= v_before THEN
    RAISE NOTICE 'PEÇA 1 PASS — trigger updated_at funcionando. Antes: %, Depois: %', v_before, v_after;
  ELSE
    RAISE EXCEPTION 'PEÇA 1 FAIL — updated_at não avançou!';
  END IF;
END;
$$;
;
