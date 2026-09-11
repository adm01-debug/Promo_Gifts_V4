
-- ============================================================
-- MIGRATION: archive_unif_pending_log_comment_and_move
-- Objetivo : Documentar a origem/propósito da tabela e
--            movê-la para o schema archive (limpeza de public).
-- Data     : 2026-06-15
-- Autor    : Sessão de engenharia — análise de limpeza de DB
-- ============================================================

-- ----------------------------------------------------------
-- 1. COMENTÁRIO NA TABELA
-- ----------------------------------------------------------
COMMENT ON TABLE public._unif_pending_log IS
'[ARQUIVADA → schema archive em 2026-06-15]
Criada em 2026-04-25 durante sessão de refatoração do projeto
interno UNIF (Unificação das tabelas de preços de gravação —
família fn_simular_combo_gravacao).

Usada como issue-tracker embutido no Postgres para registrar
decisões tomadas com Pink ao longo da sessão de engenharia.
NAO e uma tabela operacional: zero funcoes a referenciam,
zero foreign keys externas, zero workflows n8n a consomem.

SNAPSHOT 2026-06-15 — 5 registros:
  UNIF-01-R4   ADIADO    Reajuste precos laser/UV +3-5%
  UNIF-01-R5   AGENDADO  Deprecar wrappers v8_legacy e v9_legacy_2026_04 (revisar 2026-07-25) CRITICO
  UNIF-01-R6   CONCLUIDO Rename fatmin_aplicado -> piso_comercial_aplicado (6 funcoes)
  UNIF-PLAQ-01 AGENDADO  Revisao artesanal dimensoes 13 plaquinhas-produto (revisar 2026-08-25)
  UNIF-PLAQ-02 AGENDADO  Cadastrar cor de plaquinha p/ sugestao Laser Claro/Escuro (revisar 2026-08-25)

ATENCAO: UNIF-01-R5 vence 2026-07-25 — checar zero callers
via pg_stat_user_functions antes de dropar os wrappers legacy.

Candidata a DROP apos confirmar que itens AGENDADOS foram tratados.';

-- ----------------------------------------------------------
-- 2. COMENTÁRIOS NAS COLUNAS
-- ----------------------------------------------------------
COMMENT ON COLUMN public._unif_pending_log.id IS
'PK sequencial auto-increment. Sem significado de negocio.';

COMMENT ON COLUMN public._unif_pending_log.ticket IS
'Codigo do item de backlog da sessao UNIF.
Padrao: UNIF-{modulo}-{seq} (ex: UNIF-01-R4, UNIF-PLAQ-01).
Nao integrado a nenhum sistema externo (GitHub Issues, Jira, Notion).';

COMMENT ON COLUMN public._unif_pending_log.prioridade IS
'Prioridade declarada na sessao: BAIXA | MEDIA | ALTA.
Campo texto livre, sem constraint de dominio.';

COMMENT ON COLUMN public._unif_pending_log.acao IS
'Descricao da acao decidida/agendada na sessao de engenharia.
Campo texto livre, sem vinculo a tabelas operacionais.';

COMMENT ON COLUMN public._unif_pending_log.status IS
'Status do item: AGENDADO | CONCLUIDO | ADIADO.
Atualizado manualmente, sem trigger ou automacao.';

COMMENT ON COLUMN public._unif_pending_log.decisao_em IS
'Timestamp (sem timezone) em que a decisao foi registrada.
Default now(). Todos os registros datam de 2026-04-25/26.';

COMMENT ON COLUMN public._unif_pending_log.revisar_em IS
'Data-alvo de follow-up (nullable).
UNIF-01-R5: 2026-07-25 (CRITICO — depreciacao de wrappers legacy).
UNIF-PLAQ-01 e UNIF-PLAQ-02: 2026-08-25.';

COMMENT ON COLUMN public._unif_pending_log.contexto IS
'JSONB com metadados ricos: funcoes afetadas, SKUs impactados,
planos apresentados, criterios de depreciacao.
Dados valiosos — preservar no archive antes de qualquer DROP.';

COMMENT ON COLUMN public._unif_pending_log.observacao IS
'Texto narrativo livre com o racional da decisao e atualizacoes
pos-execucao. Escrito durante a sessao de engenharia UNIF.';

-- ----------------------------------------------------------
-- 3. MOVER PARA O SCHEMA ARCHIVE
-- ----------------------------------------------------------
ALTER TABLE public._unif_pending_log SET SCHEMA archive;
;
