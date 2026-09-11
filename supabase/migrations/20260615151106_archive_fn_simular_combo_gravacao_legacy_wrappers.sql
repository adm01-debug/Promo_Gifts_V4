
-- ============================================================
-- MIGRATION: archive_fn_simular_combo_gravacao_legacy_wrappers
-- Objetivo : Comentar e mover os dois wrappers deprecated para
--            o schema archive (limpeza de public).
-- Referência: ticket UNIF-01-R5 (archive._unif_pending_log)
-- Data     : 2026-06-15
-- ============================================================

-- ----------------------------------------------------------
-- 1. COMENTÁRIOS NAS FUNÇÕES
-- ----------------------------------------------------------
COMMENT ON FUNCTION public.fn_simular_combo_gravacao_v8_legacy(jsonb) IS
'[ARQUIVADA → schema archive em 2026-06-15]
Wrapper deprecated criado durante o projeto UNIF-01 (unificacao
das tabelas de precos de gravacao — 2026-04-25).

NAO tem logica propria: redireciona 100% das chamadas para
fn_simular_combo_gravacao_v11(aplicacoes).

Mantida originalmente para nao quebrar callers que chamassem
a v8 pelo nome. Verificacao em 2026-06-15 confirmou:
  • calls = 0 nos ultimos 7 dias (stats reset 2026-06-08)
  • zero dependencias no catalogo do Postgres (pg_depend)
  • zero mencoes no corpo de outras funcoes (prosrc scan)

Diferenca vs v9_legacy: nao retorna product_id nem location_code.

Candidata a DROP apos periodo de quarentena no archive.';

COMMENT ON FUNCTION public.fn_simular_combo_gravacao_v9_legacy_2026_04(jsonb) IS
'[ARQUIVADA → schema archive em 2026-06-15]
Wrapper deprecated criado durante o projeto UNIF-01 (unificacao
das tabelas de precos de gravacao — 2026-04-25).

NAO tem logica propria: redireciona 100% das chamadas para
fn_simular_combo_gravacao_v11(aplicacoes).

Mantida originalmente para nao quebrar callers que chamassem
a v9 pelo nome. Verificacao em 2026-06-15 confirmou:
  • calls = 0 nos ultimos 7 dias (stats reset 2026-06-08)
  • zero dependencias no catalogo do Postgres (pg_depend)
  • zero mencoes no corpo de outras funcoes (prosrc scan)

Diferenca vs v8_legacy: retorna 2 colunas extras — product_id
e location_code (evolucao de schema da epoca).

Candidata a DROP apos periodo de quarentena no archive.';

-- ----------------------------------------------------------
-- 2. MOVER PARA O SCHEMA ARCHIVE
-- ----------------------------------------------------------
ALTER FUNCTION public.fn_simular_combo_gravacao_v8_legacy(jsonb)
  SET SCHEMA archive;

ALTER FUNCTION public.fn_simular_combo_gravacao_v9_legacy_2026_04(jsonb)
  SET SCHEMA archive;
;
