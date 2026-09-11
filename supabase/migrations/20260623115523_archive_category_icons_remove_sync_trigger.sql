
-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO: archive_category_icons_remove_sync_trigger
-- Objetivo:  Arquivar category_icons (redundante com categories.icon) e
--            remover infraestrutura de sync (trigger + função).
--
-- Processo:
--   1. Drop trigger trg_sync_category_icon em categories
--   2. Drop function fn_sync_categories_icon_to_registry
--   3. Mover category_icons → archive.category_icons
--   4. Criar proxy view public.category_icons (leitura retrocompat.)
--   5. Grants na view (manter acesso público de leitura)
--
-- Rollback:
--   DROP VIEW IF EXISTS public.category_icons;
--   ALTER TABLE archive.category_icons SET SCHEMA public;
--   (recriar função e trigger se necessário)
--
-- Autor: Sistema — Melhoria 4 de 4 (conclusão do ciclo 10/10)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── PASSO 1: Remover trigger (ANTES de mover tabela — evita estado quebrado)
DROP TRIGGER IF EXISTS trg_sync_category_icon ON public.categories;

-- ── PASSO 2: Remover função (referencia public.category_icons — drop antes de mover)
DROP FUNCTION IF EXISTS public.fn_sync_categories_icon_to_registry();

-- ── PASSO 3: Garantir schema archive existe (já existe, mas defensive)
CREATE SCHEMA IF NOT EXISTS archive;

-- ── PASSO 4: Mover tabela para archive
ALTER TABLE public.category_icons SET SCHEMA archive;

-- ── PASSO 5: Documentar o arquival na própria tabela
COMMENT ON TABLE archive.category_icons IS
  'ARQUIVADA em 2026-06-23. Era redundante com categories.icon. '
  'Toda informação desta tabela está em public.categories: '
  '  icon        → categories.icon (com CHECK constraint chk_icon_lucide_format) '
  '  is_active   → categories.is_active '
  '  category_id → FK adicionado na migration upgrade_category_icons_uuid_fk_and_sync_trigger '
  'Proxy view public.category_icons mantida para compatibilidade de leitura. '
  'NÃO DELETAR — política da plataforma: apenas arquivar, nunca dropar.';

-- ── PASSO 6: Proxy view pública de compatibilidade (somente leitura)
CREATE OR REPLACE VIEW public.category_icons AS
  SELECT * FROM archive.category_icons;

COMMENT ON VIEW public.category_icons IS
  'PROXY VIEW — leitura somente. Aponta para archive.category_icons (arquivada). '
  'A fonte de verdade dos ícones de categoria é: categories.icon '
  'Esta view existe apenas para compatibilidade retroativa. '
  'Não tente escrever aqui — não é suportado.';

-- ── PASSO 7: Grants na view (replicar política original: qualquer um lê)
GRANT SELECT ON public.category_icons TO anon;
GRANT SELECT ON public.category_icons TO authenticated;
;
