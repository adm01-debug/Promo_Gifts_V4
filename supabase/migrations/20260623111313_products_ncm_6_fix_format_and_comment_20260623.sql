
-- ══════════════════════════════════════════════════════════════════
-- Melhoria 6: ncm_code — corrigir 2 formatos inválidos + COMMENT
-- ══════════════════════════════════════════════════════════════════
SELECT set_config('app.write_source', 'pipeline', true);

-- 6A: Corrigir ME188-06P: "4202.22.20" → "42022220" (remover pontos)
UPDATE public.products
SET ncm_code = '42022220'
WHERE sku = 'ME188-06P'
  AND ncm_code = '4202.22.20';

-- 6B: Corrigir MC650: "19.005.00" → "42029200" (código correto via ncm_id)
UPDATE public.products
SET ncm_code = '42029200'
WHERE sku = 'MC650'
  AND ncm_code = '19.005.00';

SELECT set_config('app.write_source', 'ui', true);

-- 6C: COMMENT em ncm_code documentando a relação com ncm_id
COMMENT ON COLUMN public.products.ncm_code IS
'Código NCM fiscal (8 dígitos, sem pontos). Ex: "42022220".
Relação com ncm_id: trg_sync_ncm_id (BEFORE INS/UPD) mantém ncm_code ↔ ncm_id sincronizados bidirecionalmente.
ncm_id = FK → ncm_codes (tabela mestra); ncm_code = chave natural textual.
Ambos preenchidos em 7561/7591 produtos (99.6%).
221 codes distintos, 213 ids distintos (alguns codes mapeiam ao mesmo NCM na tabela mestra).
ncm_code é mantido para pipelines de importação que recebem o código textual;
após normalização, ncm_id é a referência canônica para joins.
Referenciado em 16 funções (ver fn_get_ncm_id, fn_normalize_ncm, fn_standardize_raw).
CHECK de formato: ncm_code ~ ''^[0-9]{8}$'' planejado mas NÃO adicionado por ora
  (verificar funções de importação que podem enviar formatos alternativos antes).';
;
