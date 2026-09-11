
-- =============================================================================
-- Migration: fix_chumbo_canonical_tie_2026_07_03
--
-- PROBLEMA: "CHUMBO" tem 2 entradas em color_equivalences com confidence=100
-- e sort_order=100 → tie não determinístico entre "Cinza Chumbo" e "Cinza Grafite".
-- P1 não captura (sem color_variation chamada "Chumbo"), cai em P3 com tie.
-- Atualmente resolve para Cinza Chumbo (correto semanticamente), mas frágil.
--
-- DIAGNÓSTICO: gap encontrado durante validação exaustiva (bloco 12).
-- CHUMBO = lead/dark gray → "Cinza Chumbo" é a mapping semanticamente correta.
--
-- SOLUÇÃO: Reduzir confidence_score de "CHUMBO"→"Cinza Grafite" de 100 para 90.
-- Cinza Chumbo mantém confidence=100 → wins deterministically.
-- =============================================================================

UPDATE public.color_equivalences ce
SET 
  confidence_score = 90,
  notes = COALESCE(notes, '') || ' | fix_version: chumbo-tie-2026-07-03: Cinza Grafite→90 para Cinza Chumbo ganhar deterministicamente',
  updated_at = NOW()
WHERE ce.promo_variation_id IN (
  SELECT cv.id FROM public.color_variations cv WHERE cv.name = 'Cinza Grafite'
)
AND ce.supplier_color_id IN (
  SELECT sc.id FROM public.supplier_colors sc WHERE UPPER(TRIM(sc.name)) = 'CHUMBO'
)
AND ce.confidence_score = 100;
;
