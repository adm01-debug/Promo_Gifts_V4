-- Restaura o comentário-guardrail apagado por processo concorrente.
-- (A view vw_image_type_dropblockers é o guardrail DURÁVEL; este comentário é complementar e frágil.)
COMMENT ON COLUMN public.product_images.image_type IS
  'DEPRECADO 19/01/2026 — Use image_type_id (FK image_types). NÃO DROPAR ainda: '
  'coluna referenciada por dezenas de funções (pipeline dos 5 fornecedores) e 8 views/matviews. '
  'Dados 100% consistentes com image_type_id. Drop seguro só com vw_image_type_dropblockers = 0 linhas.';;
