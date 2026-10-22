-- ============================================================
-- PROPOSTA P13 — PERF-009: Auditoria de funções que engolem exceções
-- Severidade: ALTO
-- Achado: PERF-009
-- Status: NÃO APLICADA — somente para revisão e aprovação do PO
-- ============================================================
-- PROBLEMA:
--   107 funções PL/pgSQL com EXCEPTION sem RAISE correspondente —
--   engolem erros silenciosamente. Isso oculta falhas de runtime,
--   agrava CRON-001 (jobs que falham sem log), e pode mascarar
--   corrupção de dados.
--
-- EVIDÊNCIA (somente leitura, confirmada 2026-10-22):
--   SELECT proname, LEFT(prosrc,300)
--   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--   WHERE n.nspname='public' AND prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql')
--     AND prosrc ILIKE '%EXCEPTION%' AND prosrc NOT ILIKE '%RAISE%'
--   LIMIT 5;
--   → 107 funções confirmadas
--
-- SOLUÇÃO (investigativa):
--   Identificar quais funções engolem erros críticos e adicionar RAISE.
-- ============================================================

-- === PASSO 1 — IDENTIFICAR funções que engolem exceções ===
-- (Somente SELECT — nenhuma escrita)
/*
SELECT proname, LEFT(prosrc, 500) AS body_preview
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql')
  AND prosrc ILIKE '%EXCEPTION%'
  AND prosrc NOT ILIKE '%RAISE%'
ORDER BY proname;
*/

-- === PASSO 2 — Para cada função crítica, adicionar RAISE WARNING ===
-- Padrão recomendado (substituir <NOME_FUNCAO> e adaptar):
-- NÃO EXECUTAR DIRETAMENTE — usar db-apply-migration.yml
/*
CREATE OR REPLACE FUNCTION public.<NOME_FUNCAO>(...)
RETURNS ... AS $$
BEGIN
  -- ... lógica ...
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'fn=<NOME_FUNCAO> err=% detail=%', SQLERRM, SQLSTATE;
    -- Se não deve re-raise: registrar em tabela de auditoria
    INSERT INTO public.fn_error_log(fn_name, err_msg, err_state, occurred_at)
    VALUES ('<NOME_FUNCAO>', SQLERRM, SQLSTATE, now());
END;
$$ LANGUAGE plpgsql;
*/

-- === ROLLBACK ===
-- Por função (restaurar a definição anterior via pg_dump ou git)

-- === RISCO DE REGRESSÃO ===
-- MÉDIO: Funções que intencionalmente engoliam erros (ex: UPSERT idempotente)
-- podem ter comportamento alterado. Revisar cada uma antes de modificar.

-- === ESFORÇO ===
-- Médio (107 funções — priorizar as chamadas por crons e edges)
