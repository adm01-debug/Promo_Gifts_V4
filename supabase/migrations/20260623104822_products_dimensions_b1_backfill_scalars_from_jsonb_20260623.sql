
-- ══════════════════════════════════════════════════════════════════
-- Melhoria B: Backfill dimensions jsonb → escalares
-- 269 produtos com dados em dimensions.jsonb mas sem escalares completos.
-- COALESCE garante que não sobrescreve escalares já preenchidos.
-- app.write_source=pipeline para:
--   1. Evitar locked_fields (trg_aa_capture_manual_edits)
--   2. Skip automações pesadas (trg_product_automation)
-- Trigger M3 guard (trg_products_seo_autofill) vai short-circuit
--   pois name não muda e slug já existe.
-- ══════════════════════════════════════════════════════════════════
SELECT set_config('app.write_source', 'pipeline', true);
SELECT set_config('app.bulk_import_mode', 'true', true);

UPDATE public.products
SET
  length_cm   = COALESCE(length_cm,   NULLIF((dimensions->>'length_cm')::text, '')::numeric),
  width_cm    = COALESCE(width_cm,    NULLIF((dimensions->>'width_cm')::text, '')::numeric),
  height_cm   = COALESCE(height_cm,   NULLIF((dimensions->>'height_cm')::text, '')::numeric),
  diameter_cm = COALESCE(diameter_cm, NULLIF((dimensions->>'diameter_cm')::text, '')::numeric)
WHERE dimensions IS NOT NULL
  AND (
    (length_cm   IS NULL AND dimensions->>'length_cm'   IS NOT NULL
      AND (dimensions->>'length_cm')::text ~ '^-?[0-9]+\.?[0-9]*$'
      AND (dimensions->>'length_cm')::numeric BETWEEN 0.1 AND 999)
    OR
    (width_cm    IS NULL AND dimensions->>'width_cm'    IS NOT NULL
      AND (dimensions->>'width_cm')::text ~ '^-?[0-9]+\.?[0-9]*$'
      AND (dimensions->>'width_cm')::numeric BETWEEN 0.1 AND 999)
    OR
    (height_cm   IS NULL AND dimensions->>'height_cm'   IS NOT NULL
      AND (dimensions->>'height_cm')::text ~ '^-?[0-9]+\.?[0-9]*$'
      AND (dimensions->>'height_cm')::numeric BETWEEN 0.1 AND 999)
    OR
    (diameter_cm IS NULL AND dimensions->>'diameter_cm' IS NOT NULL
      AND (dimensions->>'diameter_cm')::text ~ '^-?[0-9]+\.?[0-9]*$'
      AND (dimensions->>'diameter_cm')::numeric BETWEEN 0.1 AND 999)
  );

-- Registrar unit_detected do jsonb num campo legível (COMMENT no dimensions)
-- unit_detected não tem escalar equivalente — documentar
SELECT set_config('app.write_source', 'ui', true);
SELECT set_config('app.bulk_import_mode', 'false', true);

-- Adicionar COMMENT documentando a situação de dimensions
COMMENT ON COLUMN public.products.dimensions IS
'CACHE jsonb com chaves: length_cm, width_cm, height_cm, diameter_cm, shape_type, unit_detected.
Parcialmente redundante com colunas escalares (length_cm, width_cm, height_cm, diameter_cm, shape_type).
NOTA: unit_detected não tem escalar equivalente (detectado pelo pipeline de extração de dimensões do nome).
Divergências conhecidas: ~12% dos produtos têm valores diferentes entre jsonb e escalares
  (escalares = fonte de verdade após o backfill de 2026-06-23).
Candidato a DROP quando: (1) unit_detected for migrado para coluna própria,
  (2) divergências forem auditadas e corrigidas, (3) v_products_public não ler dimensions diretamente.
Backfill B1 aplicado em 2026-06-23: 269 produtos com escalares populados a partir do jsonb.';
;
