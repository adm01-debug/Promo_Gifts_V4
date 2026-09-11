-- ═══════════════════════════════════════════════════════
-- CORREÇÃO SEGURANÇA R8:
-- fn_analyze_dictionaries é função administrativa (maintenance).
-- authenticated não deve executá-la.
-- ═══════════════════════════════════════════════════════

REVOKE EXECUTE ON FUNCTION public.fn_analyze_dictionaries() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_analyze_dictionaries() FROM anon;

-- Garantir apenas service_role tem EXECUTE
GRANT EXECUTE ON FUNCTION public.fn_analyze_dictionaries() TO service_role;;
