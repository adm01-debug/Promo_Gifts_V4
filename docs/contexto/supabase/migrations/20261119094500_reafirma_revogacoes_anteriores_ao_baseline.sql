-- Rollback: supabase/rollbacks/20261119094500_rollback.sql
--
-- Migration: reafirma 6 revogacoes que o baseline ressuscita na reconstrucao
-- Date: 2026-11-19
--
-- EM PRODUCAO ESTA MIGRATION E NO-OP. Nenhum dos 6 privilegios abaixo existe hoje
-- no banco canonico: foram revogados entre julho e outubro de 2026 e a revogacao
-- esta de pe. REVOKE de privilegio ausente nao e erro no Postgres, so nao faz nada.
-- O valor desta migration e outro: fazer a RECONSTRUCAO do banco pelo repo
-- terminar no mesmo estado da producao.
--
-- Causa raiz: o caminho de reconstrucao declarado em
-- .github/workflows/db-apply-migration.yml:89 e "replay baseline + migrations
-- subsequentes". So migrations com versao > 20261015140000 replayam depois do
-- baseline. As 6 revogacoes abaixo moram em migrations ANTERIORES ao baseline, e o
-- baseline supabase/baseline/20261015140000_baseline_schema.sql ainda carrega o
-- GRANT correspondente. Resultado: reconstruir pelo repo devolve privilegio que a
-- producao ja tirou — 6 deles em funcao SECURITY DEFINER.
--
-- Medido em 19/11/2026 contra doufsxqlfjyuvxuezpln (has_function_privilege /
-- has_table_privilege): anon e authenticated nao tem nenhum destes privilegios.
--
--   objeto                                      papel           GRANT no baseline  revogacao original
--   confirm_notifications_dispatched(uuid[])    authenticated   linha 110103       20260917061500:86
--   registrar_entrada_estoque(...)              authenticated   linha 116260       20260917061500:88
--   registrar_saida_estoque(...)                authenticated   linha 116272       20260917061500:92
--   fn_notify_user(...)                         authenticated   linha 112312       20260917061500:96
--   fn_global_search(text,integer,text[])       anon            linha 111894       20260716000047:89 e 20260717120058:18
--   external_connections -> MAINTAIN            anon            linha 117979       20261022194000:19 (parcial)
--
-- FORA DESTA MIGRATION, de proposito: get_quote_token_public(text) -> anon.
-- A producao tambem nega esse EXECUTE hoje, e o baseline tambem o concede
-- (linha 115170), entao ele casa com o padrao acima. Mas a revogacao NAO e
-- deliberada: 20260904102000:65-67 REVOGA de PUBLIC e de authenticated e
-- CONCEDE a anon, e o COMMENT da funcao a descreve como "Portal de aprovacao
-- (anon-safe) ... substituto de get_quote_token_by_value para callers anon
-- (SEC-009)". O anon perdeu o EXECUTE em 19/11/2026, quando a migration
-- 20261119051500 recriou a funcao e o event trigger
-- evt_auto_revoke_secdef_public_execute (ativo) revogou por ela nao estar na
-- allowlist. Reafirmar isso aqui gravaria no repo um efeito colateral, nao uma
-- decisao. Fica para o dono: ou a funcao entra na allowlist do trigger e o
-- GRANT a anon volta, ou a remocao e assumida e vira migration propria.
--
-- O caso do external_connections e diferente dos outros seis: a revogacao de
-- 20261022194000 E posterior ao baseline, mas lista apenas
-- INSERT, UPDATE, DELETE, REFERENCES, TRIGGER — e esquece MAINTAIN, privilegio
-- novo do PG17 que o baseline concede na mesma linha. Por isso so o MAINTAIN
-- sobrevive ao replay.
--
-- Nao ha DROP, CREATE INDEX, CREATE EXTENSION nem funcao nova aqui: so REVOKE.

-- 1) authenticated — endurecimento E18 (20260917061500), anterior ao baseline
REVOKE EXECUTE ON FUNCTION public.confirm_notifications_dispatched(uuid[]) FROM authenticated

REVOKE EXECUTE ON FUNCTION public.fn_notify_user(uuid, text, text, text, text, text, jsonb) FROM authenticated

REVOKE EXECUTE ON FUNCTION public.registrar_entrada_estoque(character varying, integer, numeric, character varying, character varying, text, uuid) FROM authenticated

REVOKE EXECUTE ON FUNCTION public.registrar_saida_estoque(character varying, integer, character varying, character varying, text, uuid, boolean) FROM authenticated

-- 2) anon — busca global (20260716000047 e 20260717120058)
REVOKE EXECUTE ON FUNCTION public.fn_global_search(text, integer, text[]) FROM anon

-- 3) anon — MAINTAIN que a revogacao de 20261022194000 deixou passar
REVOKE MAINTAIN ON TABLE public.external_connections FROM anon
