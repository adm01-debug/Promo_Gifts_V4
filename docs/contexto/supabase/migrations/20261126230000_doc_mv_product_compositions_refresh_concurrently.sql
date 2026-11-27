-- Rollback: supabase/rollbacks/20261126230000_rollback.sql
-- approved-by: adm01-debug
-- transaction: none (so COMMENT; a palavra CONCURRENTLY aparece dentro da string documental, nao ha DDL fora de transacao)
--
-- Restaura no COMMENT de public.mv_product_compositions a informacao de que o
-- refresh do cron 47 e CONCURRENTLY.
--
-- Causa medida (auditoria de branches 2026-11-26): o texto correto foi gravado
-- pela 20260613181344_doc_public_mv_exposure_views_and_refresh_fns.sql
-- ("refresh CONCURRENTLY via cron 47, hourly"), mas a
-- 20261122200000_fix_cadeia_views_compras_e_compositions.sql reescreveu o mesmo
-- COMMENT e perdeu a palavra CONCURRENTLY. A branch
-- claude/fix-views-cadeia-invoker-261122-1450 tinha o texto correto e nao foi
-- incorporada; esta migration recupera aquele trecho.
--
-- Efeito de negocio: o comentario e a unica documentacao lida por quem for
-- mexer no refresh. "refresh" sem CONCURRENTLY induz a rodar REFRESH
-- MATERIALIZED VIEW bloqueante, que trava a pagina publica de produto enquanto
-- recalcula. O refresh real e CONCURRENTLY (20260602010000, cron 47).
--
-- Sem efeito estrutural: so COMMENT.

COMMENT ON VIEW public.mv_product_compositions IS
  'VIEW publica sobre a matview analytics.mv_product_compositions (refresh CONCURRENTLY pelo cron 47, horario). public.mv_* e VIEW, nao matview - nao rode REFRESH aqui. SECURITY DEFINER desde 20261122200000 porque a matview-base nao concede SELECT a anon nem suporta RLS. NAO religar security_invoker=true.'
