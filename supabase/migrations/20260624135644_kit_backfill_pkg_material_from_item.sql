-- ============================================================
-- MELHORIA 2: pkg_material a partir do material de item deslocado
-- Aditivo (só NULL→valor), reversível via tabela de backup, rerun-safe
-- ============================================================

-- Backup do estado anterior (captura só na 1ª execução)
CREATE TABLE IF NOT EXISTS public._bkp_kit_pkg_material_20260624 AS
SELECT id,
       pkg_material AS old_pkg_material,
       material     AS source_material,
       now()        AS captured_at
FROM product_kit_components
WHERE is_packaging
  AND NULLIF(TRIM(material),'') IS NOT NULL
  AND pkg_material IS NULL;

COMMENT ON TABLE public._bkp_kit_pkg_material_20260624 IS
  'Backup MELHORIA 2 (2026-06-24): estado anterior de pkg_material antes do backfill a partir de material de item em linhas is_packaging. Reversão: UPDATE product_kit_components p SET pkg_material=b.old_pkg_material FROM _bkp_kit_pkg_material_20260624 b WHERE p.id=b.id.';

-- Backfill aditivo
UPDATE product_kit_components
SET pkg_material = TRIM(material),
    updated_at   = now()
WHERE is_packaging
  AND NULLIF(TRIM(material),'') IS NOT NULL
  AND pkg_material IS NULL;;
