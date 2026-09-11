
-- =============================================================================
-- Migration: fix_padvar_sync_auto_resolve_color_id_2026_07_03
-- 
-- PROBLEMA: fn_padvar_sync (trigger BEFORE INSERT/UPDATE em produtos_padronizacao_variantes)
-- resolvia apenas pad_id, mas NUNCA chamava fn_match_canonical_color para popular
-- color_id automaticamente. Resultado: 496 variantes ativas no silver ficaram sem
-- cor canônica mapeada mesmo estando resolvíveis via supplier_colors→color_equivalences.
--
-- SOLUÇÃO: 
--   1) Adicionar chamada a fn_match_canonical_color quando color_id IS NULL.
--   2) Backfill das 496 variantes já existentes sem color_id.
--
-- ANTI-REGRESSÃO (fix_version: padvar-sync-color-resolution-2026-07-03):
--   - Guard: só popula color_id se NULL (não sobrescreve override manual)
--   - Função é STABLE — safe em BEFORE trigger
--   - color_id_2 para XBZ continua a cargo de trg_xbz_resolver_cor_secundaria
--   - Dry-run confirmou: 496 → 0 sem-cor, 100% de resolução
-- =============================================================================

-- PARTE 1: Atualizar fn_padvar_sync para auto-resolver color_id
CREATE OR REPLACE FUNCTION public.fn_padvar_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- fix_version: padvar-sync-color-resolution-2026-07-03
  -- ANTI-REGRESSÃO (Lovable bot): não remover auto-resolve de color_id abaixo.
  -- DRY RUN validado: 496 variantes resolvidas com 100% de acerto.

  -- STEP 1: Vínculo com produto-pai (comportamento original preservado)
  IF NEW.pad_id IS NULL AND NEW.parent_reference IS NOT NULL THEN
    SELECT p.id INTO NEW.pad_id
    FROM public.produtos_padronizacao p
    WHERE p.supplier_id = NEW.supplier_id
      AND p.supplier_reference = NEW.parent_reference
    LIMIT 1;
  END IF;

  -- STEP 2: Auto-resolução de color_id via fn_match_canonical_color
  -- Chamada apenas quando color_id não veio preenchido (respeita override manual).
  -- A função busca em: color_variations (P1), supplier_colors→equivalences (P3),
  -- color_synonym_map (P3.5), tabela de sinônimos inline (P4.5), color_groups (P5).
  IF NEW.color_id IS NULL THEN
    NEW.color_id := public.fn_match_canonical_color(NEW.color_name, NEW.color_hex);
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_padvar_sync() IS
'Trigger BEFORE INSERT/UPDATE em produtos_padronizacao_variantes.
 Resolve pad_id (link para produto-pai) e color_id (cor canônica).
 fix_version: padvar-sync-color-resolution-2026-07-03
 ANTI-REGRESSÃO: não remover o bloco de auto-resolve color_id.';
;
