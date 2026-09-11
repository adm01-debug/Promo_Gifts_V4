
-- MELHORIA 1: Autovacuum tuning para tabelas de escrita intensa
-- Padrão PostgreSQL: vacuum_scale_factor=0.2 (20%), analyze=0.1 (10%)
-- Estas tabelas acumulam dead tuples mais rápido → reduzir threshold

-- produtos_padronizacao: 10.3% dead tuples mesmo após VACUUM ANALYZE hoje
-- Staging de produtos, escrita intensa pelo pipeline
ALTER TABLE public.produtos_padronizacao
  SET (
    autovacuum_vacuum_scale_factor   = 0.05,  -- vacuum a partir de 5% dead (era 20%)
    autovacuum_analyze_scale_factor  = 0.02,  -- analyze a partir de 2% mudanças (era 10%)
    autovacuum_vacuum_cost_delay     = 2       -- ms; mais agressivo que o default 20ms
  );

-- supplier_import_batches: sem last_autovacuum, 9.8% dead
-- Tabela pequena (229 rows), alta rotatividade de status
ALTER TABLE public.supplier_import_batches
  SET (
    autovacuum_vacuum_scale_factor   = 0.02,  -- 2% = ~5 linhas → vacuum imediato após updates
    autovacuum_analyze_scale_factor  = 0.01,
    autovacuum_vacuum_cost_delay     = 0       -- sem delay: tabela muito pequena
  );

-- ai_enrichment_queue: sem last_analyze, escrita/update frequente do worker
ALTER TABLE public.ai_enrichment_queue
  SET (
    autovacuum_vacuum_scale_factor   = 0.05,
    autovacuum_analyze_scale_factor  = 0.02,
    autovacuum_vacuum_cost_delay     = 2
  );

-- produtos_padronizacao_variantes: também ativa, verificada agora
ALTER TABLE IF EXISTS public.produtos_padronizacao_variantes
  SET (
    autovacuum_vacuum_scale_factor   = 0.05,
    autovacuum_analyze_scale_factor  = 0.02
  );
;
