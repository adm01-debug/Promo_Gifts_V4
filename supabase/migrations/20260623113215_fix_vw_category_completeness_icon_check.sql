
-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO: fix_vw_category_completeness_icon_check
-- Objetivo:  Substituir subquery correlacionada em category_icons (frágil,
--            lenta) por verificação direta em categories.icon (fonte real).
-- Mudanças:
--   ANTES: EXISTS (SELECT 1 FROM category_icons WHERE category_name = c.name...)
--   DEPOIS: c.icon IS NOT NULL
-- Benefícios:
--   1. Corretude: usa a fonte de verdade real
--   2. Performance: elimina 2 subqueries correlacionadas por linha
--   3. Consistência: alinhado com a constraint chk_icon_lucide_format
-- Rollback: recriar a versão anterior (backup inline nos comentários abaixo)
-- Autor:  Sistema — Melhoria 3 de 3
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.vw_category_completeness AS
SELECT
  c.id,
  c.name,
  c.slug,
  c.level,
  c.is_active,
  c.is_visible,
  c.products_count,

  -- Contagens de produtos (mantidas idênticas ao original)
  COUNT(DISTINCT p.id)   FILTER (WHERE p.is_active = true) AS produtos_ativos_main,
  COUNT(DISTINCT pca.product_id)                           AS produtos_via_pca,

  -- ── FLAGS DE COMPLETUDE ────────────────────────────────────────────────
  -- copywriting: mantido (subquery correta, não usa category_icons)
  EXISTS (
    SELECT 1 FROM public.category_copywriting_config cfg
    WHERE cfg.category_id = c.id
  ) AS tem_copywriting,

  -- ícone: CORRIGIDO — antes fazia JOIN frágil em category_icons por nome
  -- ANTES: EXISTS (SELECT 1 FROM category_icons ci WHERE ci.category_name = c.name AND ci.is_active = true)
  -- DEPOIS: verifica diretamente a fonte de verdade
  (c.icon IS NOT NULL)   AS tem_icone,

  (c.meta_title IS NOT NULL)    AS tem_seo_title,
  (c.color_hex IS NOT NULL)     AS tem_cor,
  (c.image_url IS NOT NULL)     AS tem_imagem,

  -- ── SCORE DE COMPLETUDE (0–100 pts) ───────────────────────────────────
  ROUND(
    (
      -- meta_title:    20 pts
      CASE WHEN c.meta_title IS NOT NULL THEN 20 ELSE 0 END
      -- copywriting:   20 pts
      + CASE WHEN EXISTS (
          SELECT 1 FROM public.category_copywriting_config cfg
          WHERE cfg.category_id = c.id
        ) THEN 20 ELSE 0 END
      -- ícone:         15 pts — CORRIGIDO (era subquery em category_icons)
      + CASE WHEN c.icon IS NOT NULL THEN 15 ELSE 0 END
      -- cor:           10 pts
      + CASE WHEN c.color_hex IS NOT NULL THEN 10 ELSE 0 END
      -- imagem:        15 pts
      + CASE WHEN c.image_url IS NOT NULL THEN 15 ELSE 0 END
      -- descrição:     10 pts
      + CASE WHEN c.description IS NOT NULL THEN 10 ELSE 0 END
      -- meta_descr:    10 pts
      + CASE WHEN c.meta_description IS NOT NULL THEN 10 ELSE 0 END
    )::NUMERIC,
    0
  ) AS completude_score

FROM public.categories c
LEFT JOIN public.products p
  ON p.main_category_id = c.id
LEFT JOIN public.product_category_assignments pca
  ON pca.category_id = c.id

WHERE c.is_active = true

GROUP BY
  c.id, c.name, c.slug, c.level, c.is_active, c.is_visible,
  c.products_count, c.meta_title, c.color_hex, c.image_url,
  c.description, c.meta_description, c.icon      -- adicionado c.icon ao GROUP BY

ORDER BY
  c.level,
  ROUND(
    (
      CASE WHEN c.meta_title IS NOT NULL THEN 20 ELSE 0 END
      + CASE WHEN EXISTS (
          SELECT 1 FROM public.category_copywriting_config cfg
          WHERE cfg.category_id = c.id
        ) THEN 20 ELSE 0 END
      + CASE WHEN c.icon IS NOT NULL THEN 15 ELSE 0 END
      + CASE WHEN c.color_hex IS NOT NULL THEN 10 ELSE 0 END
      + CASE WHEN c.image_url IS NOT NULL THEN 15 ELSE 0 END
      + CASE WHEN c.description IS NOT NULL THEN 10 ELSE 0 END
      + CASE WHEN c.meta_description IS NOT NULL THEN 10 ELSE 0 END
    )::NUMERIC,
    0
  ) DESC;

COMMENT ON VIEW public.vw_category_completeness IS
  'Score de completude por categoria (0–100 pts). '
  'Pesos: meta_title(20) + copywriting(20) + icone(15) + imagem(15) + '
  'cor(10) + descrição(10) + meta_description(10). '
  'CORRIGIDO em 2024: icone usa categories.icon IS NOT NULL em vez de '
  'subquery em category_icons (que era frágil e lenta).';
;
