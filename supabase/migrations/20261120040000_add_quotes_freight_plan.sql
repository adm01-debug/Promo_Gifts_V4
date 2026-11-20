-- Rollback: supabase/rollbacks/20261120040000_rollback.sql
--
-- Migration: quotes.freight_plan / freight_mix_mode / show_freight_plan_to_client
--
-- Bloco G, etapa 61 do plano de frete de 19/11/2026. Guarda no orçamento o plano
-- de volumes calculado pelo motor (src/lib/freight), a escolha do vendedor entre
-- misturar ou separar produtos e se o plano aparece para o cliente no PDF.
--
-- Só adiciona 3 colunas e 2 CHECKs; nenhuma linha existente muda de valor:
--   * freight_plan: jsonb NULL (orçamento antigo e orçamento sem plano ok = NULL).
--   * freight_mix_mode: text NULL, só 'misturar' ou 'separar'.
--   * show_freight_plan_to_client: boolean NOT NULL DEFAULT false (DEFAULT
--     constante: o PG17 não reescreve a tabela).
--
-- Conferido em produção (SELECT, 2026-11-20): public.quotes tem 7 linhas e 432 kB;
-- as 3 colunas ainda não existem; não há GRANT por coluna (o GRANT de tabela do
-- authenticated vale para as novas, como já vale para shipping_cost).
--
-- O que NÃO muda de propósito:
--   * quote_versions guarda o orçamento em snapshot jsonb e nenhuma função do banco
--     escreve nela; quote_history guarda campo a campo; quote_drafts.data é jsonb.
--     Nenhuma tem lista de colunas de quotes, então não perdem as 3 colunas.
--     ATENÇÃO: a cópia que PERDE as colunas fica no front — "Criar nova versão"
--     (src/hooks/quotes/useQuoteVersions.ts, createNewVersion) e duplicar
--     (src/hooks/quotes/useQuotes.ts, duplicateQuote) montam a linha nova campo
--     a campo e gravam pela RPC create_quote_transactional. A nova versão sairia
--     sem plano, sem o modo misturar/separar e com o plano oculto. Entra no
--     escopo do G-UI (etapa 63), junto com a alteração das RPCs abaixo.
--   * As views que leem quotes (bi_quotes_summary, v_quote_seller_kpis e outras) usam
--     lista explícita de colunas e continuam iguais.
--   * create_quote_transactional e update_quote_transactional (e as variantes que
--     as chamam) montam o INSERT/UPDATE de quotes com lista explícita de colunas e,
--     como estão hoje, ignoram as 3 colunas. Gravar o plano pelo orçamento (etapa 63,
--     PR G-UI) exige alterar essas funções em migration própria.
--
-- Os CHECKs não são criados com ADD COLUMN para ter nome fixo e poder rodar de novo:
-- cada um só é criado se ainda não existir em pg_constraint.

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS freight_plan jsonb,
  ADD COLUMN IF NOT EXISTS freight_mix_mode text,
  ADD COLUMN IF NOT EXISTS show_freight_plan_to_client boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.quotes'::regclass
       AND conname = 'quotes_freight_mix_mode_check'
  ) THEN
    ALTER TABLE public.quotes
      ADD CONSTRAINT quotes_freight_mix_mode_check
      CHECK (freight_mix_mode IS NULL OR freight_mix_mode IN ('misturar', 'separar'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.quotes'::regclass
       AND conname = 'quotes_freight_plan_shape_check'
  ) THEN
    ALTER TABLE public.quotes
      ADD CONSTRAINT quotes_freight_plan_shape_check
      CHECK (
        freight_plan IS NULL
        OR (jsonb_typeof(freight_plan) = 'object' AND pg_column_size(freight_plan) < 262144)
      );
  END IF;
END $$;

COMMENT ON COLUMN public.quotes.freight_plan IS
  'Plano de volumes do frete calculado no orçamento (objeto JSON com version, itemsHash, computedAt, caixas e totais). NULL = orçamento sem plano calculado. Objeto com menos de 256 KB.';
COMMENT ON COLUMN public.quotes.freight_mix_mode IS
  'Escolha do vendedor para o frete: misturar produtos na mesma caixa ou separar. NULL = sem escolha. Produto marcado como "não mistura" vence esta escolha.';
COMMENT ON COLUMN public.quotes.show_freight_plan_to_client IS
  'true = o bloco "Volumes estimados para transporte" aparece no PDF e na proposta do cliente. Padrão false: o plano é interno.';
