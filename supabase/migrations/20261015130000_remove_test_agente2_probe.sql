-- Remove a policy de teste residual test_agente2_probe em public.variant_supplier_sources.
-- Rollback:
--   CREATE POLICY test_agente2_probe ON public.variant_supplier_sources FOR SELECT USING (false);
--   (desnecessário na prática: a policy não tem efeito funcional — ver abaixo.)
--
-- O que é: policy PERMISSIVE FOR SELECT TO public USING (false), criada pelo Agente 2 em 2026-10-13
-- só para isolar o bloqueio de DROP POLICY na sessão automatizada (ver
-- docs/incidente-2026-10-13/AGENTE2_RLS_PERFORMANCE_CRON.md). Permissivas se somam por OR; um
-- USING (false) não concede nem nega nada, então removê-la não muda nenhum resultado de SELECT.
-- Estado conferido read-only em pg_policies em 2026-10-15: ainda existe.
--
-- Por que migration própria: estava dentro de 20261015120500 e derrubou a aplicação dela
-- (run 38730252412, 2026-10-15 ~11:52:52–11:54:54 UTC): o DROP POLICY pede AccessExclusiveLock em
-- variant_supplier_sources (tabela quente), esperou ~2 min, morreu por statement timeout e, enquanto
-- esperava, 7 statements de outras sessões foram cancelados por lock timeout. Transação revertida
-- inteira, nada no ledger. Separada para que o risco de lock nesta tabela não bloqueie a mudança de
-- system_settings (fria) e possa ser reaplicada sozinha em janela de baixo tráfego.
--
-- Se falhar com "canceling statement due to lock timeout": nada mudou (transação revertida, sem
-- entrada no ledger); basta redisparar o workflow em outro momento.
--
-- Aplicação: só via .github/workflows/db-apply-migration.yml (REGRA #8 / E15), com aprovação do PO.

-- Falha rápido (1s) se o lock não vier, em vez de enfileirar leitores atrás do AccessExclusiveLock
-- (anon tem statement_timeout de 3s). SET LOCAL vale só para esta transação (psql -1); o pooler
-- ignora lock_timeout via PGOPTIONS (run 38730252412).
SET LOCAL lock_timeout = '1s';

DROP POLICY IF EXISTS test_agente2_probe ON public.variant_supplier_sources;
