
-- ══════════════════════════════════════════════════════════════
-- M7: Substituir curly single quotes (U+2019 / U+2018) por
-- apostrofe ASCII simples (U+0027) em 4 produtos XBZ
-- - "15'6" → "15'6" (polegadas de tela de notebook)
-- - Motivo: ' (U+2019) é fornecedor digitou errado;
--           ' (ASCII) é o correto para medida informal
-- - Modo pipeline: trg_aa_capture_manual_edits NÃO bloqueia name
-- - Efeito colateral benéfico: slug/meta_title serão regenerados
--   com o nome correto; trg_products_slug_redirect criará redirect
--   do slug antigo → novo (SEO preservado)
-- - Não altera produtos com ™ (Tritan™) — símbolo legítimo de marca
-- ══════════════════════════════════════════════════════════════

-- Setar contexto de pipeline para não bloquear 'name' em locked_fields
SELECT set_config('app.write_source', 'pipeline', true);

-- Executar substituição
UPDATE public.products
SET name = REPLACE(
              REPLACE(name, U&'\2019', ''''),  -- ' (right single quote) → '
                            U&'\2018', ''''    -- ' (left single quote) → '
           )
WHERE name ~ U&'[\2018\2019]';

-- Registrar correção
SELECT set_config('app.write_source', 'ui', true);
;
