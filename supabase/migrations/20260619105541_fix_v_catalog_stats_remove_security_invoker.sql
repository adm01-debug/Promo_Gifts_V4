
-- ================================================================
-- FIX: v_catalog_stats — remover security_invoker=on
-- ================================================================
-- PROBLEMA: v_catalog_stats foi criada com security_invoker=on, o que faz
-- a view rodar com os privilégios do usuário CHAMADOR. Como products não
-- tem GRANT SELECT para anon, a view falharia para usuários não autenticados
-- via PostgREST (anon JWT).
--
-- SOLUÇÃO: Remover security_invoker=on (default = security_definer-like,
-- roda com os privilégios do VIEW OWNER que é postgres/superuser). Isso é
-- correto para views de estatísticas agregadas que não expõem linhas individuais
-- sensíveis — apenas contagem total de variantes e fornecedores distintos.
--
-- O GRANT SELECT para anon e authenticated é mantido.
-- ================================================================

CREATE OR REPLACE VIEW public.v_catalog_stats AS
SELECT
  COUNT(pv.id)::bigint        AS total_variants,
  COUNT(DISTINCT p.supplier_id)::bigint AS total_suppliers
FROM public.product_variants pv
JOIN public.products p ON p.id = pv.product_id
WHERE (p.is_deleted IS NOT TRUE)
  AND (p.is_active = TRUE)
  AND (pv.is_active IS NOT FALSE);

COMMENT ON VIEW public.v_catalog_stats
  IS 'Estatísticas agregadas do catálogo: total de variantes ativas e fornecedores distintos. '
     'security_invoker=off (default): roda como view owner para garantir acesso mesmo sem '
     'GRANT direto em products para anon. Dados: apenas contagens agregadas, não linhas individuais.';

-- Manter os grants existentes
GRANT SELECT ON public.v_catalog_stats TO anon, authenticated;
;
