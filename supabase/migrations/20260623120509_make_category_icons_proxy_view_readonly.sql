
-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO: make_category_icons_proxy_view_readonly
-- Objetivo:  Tornar public.category_icons explicitamente read-only.
--
-- Problema:  PostgreSQL marca views simples (SELECT * FROM uma_tabela) como
--            "auto-updatable". is_updatable='YES' na information_schema
--            significa que writes passariam para archive.category_icons.
--
-- Solução:   Rules INSTEAD NOTHING bloqueiam INSERT/UPDATE/DELETE
--            e fazem o is_updatable='NO' na information_schema.
--
-- Impacto:   Nenhum — ninguém deveria escrever aqui de qualquer forma.
--            RLS de archive já protege, mas rules tornam explícito.
-- ═══════════════════════════════════════════════════════════════════════════

-- Rule para bloquear INSERT
CREATE OR REPLACE RULE category_icons_no_insert
  AS ON INSERT TO public.category_icons
  DO INSTEAD NOTHING;

-- Rule para bloquear UPDATE
CREATE OR REPLACE RULE category_icons_no_update
  AS ON UPDATE TO public.category_icons
  DO INSTEAD NOTHING;

-- Rule para bloquear DELETE
CREATE OR REPLACE RULE category_icons_no_delete
  AS ON DELETE TO public.category_icons
  DO INSTEAD NOTHING;

-- Atualizar comentário da view
COMMENT ON VIEW public.category_icons IS
  'PROXY VIEW — read-only enforced via INSTEAD NOTHING rules. '
  'Aponta para archive.category_icons (arquivada em 2026-06-23). '
  'A fonte de verdade dos ícones é categories.icon. '
  'Grants: SELECT para anon e authenticated.';
;
