-- (1) Comentário com o RAIO DE IMPACTO explícito — para impedir DROP cego (inclusive futuro)
COMMENT ON COLUMN public.product_images.image_type IS
  'DEPRECADO 19/01/2026 — Use image_type_id (FK image_types). NÃO DROPAR ainda: '
  'coluna referenciada por dezenas de funções (pipeline de ingestão dos 5 fornecedores) '
  'e views/matviews (inclui mv_product_cards). Dados 100% consistentes com image_type_id. '
  'Drop seguro só após zerar vw_image_type_dropblockers.';

-- (2) Artefato rastreável: lista viva de tudo que ainda trava o DROP, classificado por risco.
--     Views/matviews = bloqueadores de DDL (CASCADE/RESTRICT). Funções = risco de runtime (plpgsql late-bound).
CREATE OR REPLACE VIEW public.vw_image_type_dropblockers AS
SELECT 'view_ddl_blocker'::text AS risco,
       dependent.relkind::text   AS kind,
       dependent.relname         AS objeto
FROM pg_class dependent
JOIN pg_namespace dn ON dn.oid = dependent.relnamespace
WHERE dependent.relkind IN ('v','m')
  AND dn.nspname = 'public'
  AND pg_get_viewdef(dependent.oid) ~ '\mimage_type\M'
UNION ALL
SELECT 'function_runtime_risk', 'f', p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) ~ '\mimage_type\M';

COMMENT ON VIEW public.vw_image_type_dropblockers IS
  'Rastreador da migração image_type→image_type_id. Quando retornar 0 linhas, a coluna image_type pode ser dropada com segurança.';;
