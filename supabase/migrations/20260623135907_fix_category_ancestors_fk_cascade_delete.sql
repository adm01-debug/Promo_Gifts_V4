
-- ████████████████████████████████████████████████████████████████████████████
-- GAP CRÍTICO CORRIGIDO: category_ancestors FKs → ON DELETE CASCADE
--
-- PROBLEMA: ancestor_id e descendant_id ambos com NO ACTION bloqueavam
-- DELETE de 467/477 categorias silenciosamente.
-- 
-- SOLUÇÃO: ON DELETE CASCADE — ao deletar categoria, PostgreSQL remove
-- automaticamente todas as entradas em category_ancestors antes do
-- AFTER DELETE trigger em categories disparar.
--
-- SEGURO: category_ancestors é uma cache/índice derivado do parent_id tree.
-- Dados nunca devem sobreviver à categoria que referenciam.
-- ████████████████████████████████████████████████████████████████████████████

-- Remover FKs antigas (NO ACTION)
ALTER TABLE category_ancestors
    DROP CONSTRAINT IF EXISTS category_ancestors_ancestor_id_fkey,
    DROP CONSTRAINT IF EXISTS category_ancestors_descendant_id_fkey;

-- Recriar com CASCADE
ALTER TABLE category_ancestors
    ADD CONSTRAINT category_ancestors_ancestor_id_fkey
        FOREIGN KEY (ancestor_id) REFERENCES categories(id) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT category_ancestors_descendant_id_fkey
        FOREIGN KEY (descendant_id) REFERENCES categories(id) ON DELETE CASCADE ON UPDATE CASCADE;

COMMENT ON TABLE category_ancestors IS
'Closure table (pre-computed ancestor-descendant pairs) derivada do parent_id.
FKs: ON DELETE CASCADE (rows auto-removidas ao deletar categoria).
Rebuild manual: SELECT * FROM fn_rebuild_category_ancestors().
Corrigido em: 2026-06-23 — FKs NO ACTION → CASCADE.';
;
