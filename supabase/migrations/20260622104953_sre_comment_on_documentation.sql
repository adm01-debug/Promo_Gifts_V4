
-- MELHORIA 4: Documentação completa via COMMENT ON
-- Padrão PhD: cada objeto documenta: propósito, entradas, saídas, regras, autor, data

COMMENT ON TABLE public.supplier_replenishment_events IS
  'Append-only ledger de eventos de reposição de estoque. '
  'Cada linha representa uma promessa de chegada (promised_date + promised_quantity) '
  'capturada de variant_supplier_sources (slots 1-6), e opcionalmente casada com '
  'um delta positivo real em stock_snapshots. '
  'resolution: pending → fulfilled/expired/superseded. '
  'Criado: 2026-06-22. Arquitetura: Gold layer (read-only para app).';

COMMENT ON COLUMN public.supplier_replenishment_events.id IS
  'PK UUID gerado. Imutável após criação.';

COMMENT ON COLUMN public.supplier_replenishment_events.source_id IS
  'FK lógica para variant_supplier_sources.id (sem FK física para evitar cascade delete). '
  'Identifica a linha de estoque que gerou a promessa.';

COMMENT ON COLUMN public.supplier_replenishment_events.supplier_id IS
  'Desnormalizado de variant_supplier_sources.supplier_id para queries sem JOIN.';

COMMENT ON COLUMN public.supplier_replenishment_events.variant_id IS
  'Desnormalizado de variant_supplier_sources.variant_id para queries sem JOIN.';

COMMENT ON COLUMN public.supplier_replenishment_events.slot IS
  'Posição 1-6 correspondente a next_date_N/next_quantity_N em variant_supplier_sources.';

COMMENT ON COLUMN public.supplier_replenishment_events.promised_date IS
  'Data de chegada prometida pelo fornecedor (variant_supplier_sources.next_date_N).';

COMMENT ON COLUMN public.supplier_replenishment_events.promised_quantity IS
  'Quantidade prometida (variant_supplier_sources.next_quantity_N). Sempre > 0.';

COMMENT ON COLUMN public.supplier_replenishment_events.observed_at IS
  'Timestamp em que a promessa foi capturada (= variant_supplier_sources.updated_at no momento da captura).';

COMMENT ON COLUMN public.supplier_replenishment_events.resolution IS
  'Estado do ciclo de vida: '
  'pending = aguardando confirmação; '
  'fulfilled = chegada confirmada via delta positivo em stock_snapshots; '
  'expired = data passou + 15 dias sem confirmação (fn_expire_pending_promises); '
  'superseded = promessa substituída por nova promessa no mesmo slot antes de vencer.';

COMMENT ON COLUMN public.supplier_replenishment_events.actual_date IS
  'Data em que o estoque real chegou (capturada de stock_snapshots.captured_at::date).';

COMMENT ON COLUMN public.supplier_replenishment_events.actual_quantity IS
  'Delta de estoque observado (stock_main_delta + stock_other_delta) no snapshot casado.';

COMMENT ON COLUMN public.supplier_replenishment_events.delay_days IS
  'GENERATED: actual_date - promised_date. Negativo = chegou antes. NULL se não fulfilled.';

COMMENT ON COLUMN public.supplier_replenishment_events.fulfillment_ratio IS
  'GENERATED: LEAST(1.0, actual_quantity / promised_quantity). NULL se não fulfilled. '
  'Capped em 1.0 para evitar superscore em recebimentos maiores que o prometido.';

COMMENT ON COLUMN public.supplier_replenishment_events.arrival_snapshot_id IS
  'ID (bigint) do stock_snapshots que confirmou o fulfillment. '
  'NOTA: stock_snapshots.id é bigint, não UUID. FK lógica sem constraint física '
  'porque stock_snapshots é purgado a cada 14 dias.';

COMMENT ON MATERIALIZED VIEW public.mv_supplier_reliability IS
  'Agregado de confiabilidade por fornecedor para consumo direto do frontend. '
  'Score 0-100 = 60% pontualidade + 40% cumprimento de quantidade. '
  'Banda: high>=85, medium>=60, low<60, unknown se sem histórico. '
  'Refresh: CONCURRENTLY a cada 15 min via pg_cron job refresh-mv-supplier-reliability. '
  'Índice único em supplier_id habilitado para REFRESH CONCURRENTLY.';

COMMENT ON FUNCTION public.fn_capture_supplier_promise() IS
  'Trigger AFTER INSERT (trg_csp_insert) e AFTER UPDATE (trg_csp_update WHEN next_date/qty mudam) '
  'em variant_supplier_sources. Itera slots 1-6, inserindo promessas novas com ON CONFLICT DO NOTHING '
  'e marcando superseded slots que foram zerados antes de 15 dias da data prometida.';

COMMENT ON FUNCTION public.fn_resolve_supplier_arrivals() IS
  'Trigger AFTER INSERT em stock_snapshots. '
  'Se delta (stock_main_delta + stock_other_delta) > 0, casa com a promessa pending mais próxima '
  'dentro de ±15 dias para o mesmo source_id, usando menor distância de dias e de quantidade. '
  'Idempotente: verifica arrival_snapshot_id antes de resolver (index: idx_sre_arrival_snapshot).';

COMMENT ON FUNCTION public.fn_expire_pending_promises() IS
  'Job diário (cron: expire-supplier-promises, 04:00 UTC). '
  'Marca como expired todas as promessas pending com promised_date < (current_date - 15). '
  'Retorna contagem de promessas expiradas. SECURITY DEFINER, service_role only.';

COMMENT ON FUNCTION public.get_supplier_reliability_history(uuid, int) IS
  'RPC pública para o frontend (drawer de histórico do painel de confiabilidade). '
  'Retorna eventos fulfilled + expired dos últimos 365 dias para um supplier_id. '
  'SECURITY DEFINER: authenticated sim, anon NÃO. '
  'Parâmetros: _supplier_id uuid, _limit int DEFAULT 200.';
;
