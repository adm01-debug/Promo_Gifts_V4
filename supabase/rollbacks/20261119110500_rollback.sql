-- Rollback: 20261119110500_crm_callback_events_updated_at
--
-- Remove o trigger e a coluna de carimbo. Reverter faz o sistema voltar a NAO registrar quando um
-- evento de callback do CRM foi alterado — que e o estado anterior, e o que a migration 20260706223316
-- tentava consertar desde julho.
--
-- A ordem importa: o trigger sai antes da coluna, senao o DROP COLUMN falharia por dependencia.
--
-- DROP COLUMN apaga o historico de carimbo ja acumulado. Nao ha como recuperar depois.

DROP TRIGGER IF EXISTS trg_crm_callback_events_updated_at ON public.crm_callback_events;
ALTER TABLE public.crm_callback_events DROP COLUMN IF EXISTS updated_at;
