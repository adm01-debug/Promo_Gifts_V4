
-- =============================================================================
-- Migration: fix_azul_claro_canonical_color_alignment_2026_07_03
--
-- PROBLEMA: fn_match_canonical_color('AZUL CLARO', hex) retornava resultado não
-- determinístico (Azul Piscina, Azul Céu ou Azul) porque 4 entradas em
-- color_equivalences tinham confidence_score=90 e sort_order=100 idênticos.
-- Gold pipeline usa Azul Céu (#87CEEB) — semanticamente mais correto para
-- "AZUL CLARO" (Light Blue) do que Azul Piscina (#00FFFF, pool blue).
--
-- SOLUÇÃO:
--   1) confidence_score 90→95 para entrada Spot→Azul Céu: torna P3 determinístico
--   2) Backfill 121 silver variants divergentes → Azul Céu (alinha com gold)
--
-- ANÁLISE ADVERSARIAL (DRY RUN confirmado):
--   - fn_match_canonical_color('AZUL CLARO', '#58B2FF') = Azul Céu ✓
--   - XBZ entry mantém confidence=90 (não afetado; resolve por hex via P4)
--   - 121 silver variants corrigidas: silver ↔ gold agora em sincronia
-- =============================================================================

-- PARTE 1: confidence_score 90→95 para Spot→Azul Céu
UPDATE public.color_equivalences
SET 
  confidence_score = 95,
  notes = COALESCE(notes, '') || ' | fix_version: azul-claro-canonical-2026-07-03',
  updated_at = NOW()
WHERE promo_variation_id = 'ba14660b-1055-41da-9105-f8ac1e2b30ff'  -- Azul Céu
  AND supplier_color_id IN (
    SELECT sc.id FROM public.supplier_colors sc
    WHERE UPPER(TRIM(sc.name)) = 'AZUL CLARO'
    AND sc.supplier_id IN (SELECT id FROM public.suppliers WHERE name ILIKE '%Spot%')
  );

-- PARTE 2: Backfill silver — 121 variantes AZUL CLARO → Azul Céu
UPDATE public.produtos_padronizacao_variantes ppv
SET 
  color_id = 'ba14660b-1055-41da-9105-f8ac1e2b30ff',  -- Azul Céu
  updated_at = NOW()
WHERE UPPER(TRIM(ppv.color_name)) = 'AZUL CLARO'
  AND ppv.color_id IN (
    '4152c812-a293-48c8-8bd0-d059d26fd123',  -- Azul Piscina
    '34b1361e-f965-4aea-b801-2001246c7d1e'   -- Azul (genérico)
  );
;
