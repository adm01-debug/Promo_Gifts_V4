-- Rollback: supabase/rollbacks/20261119110500_rollback.sql
--
-- Migration: termina o trabalho de 20260706223316 — carimbo de ultima alteracao em
--            public.crm_callback_events
-- Date: 2026-11-19
--
-- O QUE ESTAVA INACABADO
-- A migration 20260706223316_3cc4c8a9-76b3-4c02-922a-bbcde6031622.sql (06/07, nunca aplicada)
-- queria que cada evento de callback do CRM registrasse sozinho quando foi alterado pela ultima
-- vez, para que reprocessamento (error -> applied) ficasse datado. Ela criava a tabela com
-- created_at + updated_at e um trigger BEFORE UPDATE.
--
-- POR QUE ELA NAO PODE SER APLICADA, E NUNCA DEVE SER
-- A tabela ja existe em producao, criada por outro caminho e com OUTRO desenho: tem received_at,
-- e NAO tem created_at nem updated_at. Entao naquele arquivo o CREATE TABLE IF NOT EXISTS vira
-- no-op e o CREATE TRIGGER seguinte passa a rodar uma funcao que grava em NEW.updated_at —
-- coluna inexistente. Todo UPDATE na tabela falharia, inclusive os 62 registros em result='error'
-- que a edge crm-callback-reprocess atualiza. Medido em 19/11/2026:
--   colunas vivas: id, external_quote_id, crm_quote_id, event_type, occurred_at, result,
--                  error_message, payload, received_at   (111 linhas)
-- Aplicar 20260706223316 QUEBRA producao. Isto esta registrado tambem em
-- docs/agentes/resgates/2026-11-19-triggers-ausentes-e-contas-de-teste-em-producao.md
--
-- O QUE ESTA MIGRATION FAZ
-- Entrega a intencao do autor contra a tabela que de fato existe: acrescenta updated_at e liga o
-- trigger. Nada mais do arquivo de 06/07 e reaproveitado — os indices e a policy dele ja tem
-- equivalentes vivos com outros nomes, e recria-los so geraria duplicata.
--
-- DUAS DECISOES QUE DIVERGEM DO ORIGINAL, de proposito:
--   1. a coluna fica NULLABLE, nao NOT NULL. O original usava NOT NULL DEFAULT NOW(); aqui isso
--      obrigaria a inventar um valor para as 111 linhas existentes. NULL diz a verdade: "nunca
--      alterada desde que a coluna passou a existir". Linha nova nasce com o DEFAULT.
--   2. reusa public.set_updated_at() em vez de criar
--      public.set_crm_callback_events_updated_at(). A funcao ja existe, faz exatamente
--      NEW.updated_at = now(), NAO e SECURITY DEFINER (menor privilegio) e ja serve a varios
--      triggers. Criar outra identica so aumentaria a superficie.
--
-- RISCO: baixo. ADD COLUMN com default em tabela de 111 linhas e instantaneo. Nenhum dado
-- existente e alterado; nenhuma coluna ou indice e removido. Conferido que public.set_updated_at()
-- existe e grava em NEW.updated_at.

ALTER TABLE public.crm_callback_events
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()

COMMENT ON COLUMN public.crm_callback_events.updated_at IS
  'Ultima alteracao da linha, mantida por trg_crm_callback_events_updated_at. '
  'NULL = nunca alterada desde 2026-11-19, quando a coluna foi criada. '
  'Fecha a intencao de 20260706223316, que nao pode ser aplicada (ver cabecalho da 20261119110500).'

DROP TRIGGER IF EXISTS trg_crm_callback_events_updated_at ON public.crm_callback_events

CREATE TRIGGER trg_crm_callback_events_updated_at
  BEFORE UPDATE ON public.crm_callback_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()
