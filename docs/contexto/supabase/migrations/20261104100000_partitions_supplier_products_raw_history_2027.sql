-- Migration: 20261104100000_partitions_supplier_products_raw_history_2027
-- Cria partições p2027_03 a p2027_12 da tabela supplier_products_raw_history.
-- p2027_01 e p2027_02 já existem em produção.
-- Deadline: 2026-12-15 — sem essas partições o worker de arquivamento falha silenciosamente.
--
-- Rollback: supabase/rollbacks/20261104100000_rollback.sql

-- IF NOT EXISTS: esta migration ficou em fila por GitHub Actions runner starvation
-- (ver incidente 2026-11-08) e pode ser aplicada depois de 20260916193000 (E25), cujo
-- backfill fn_ensure_history_partitions(6) roda com base em now() no momento da aplicação,
-- não na data de autoria — se aplicado em novembro/2026+ em vez de setembro/2026, o backfill
-- de 6 meses alcança parte do intervalo mar-dez/2027 que esta migration também cobre.
-- Sem IF NOT EXISTS, a segunda das duas a rodar falharia em "relation already exists".
CREATE TABLE IF NOT EXISTS supplier_products_raw_history_p2027_03
  PARTITION OF supplier_products_raw_history
  FOR VALUES FROM ('2027-03-01 00:00:00+00') TO ('2027-04-01 00:00:00+00')

CREATE TABLE IF NOT EXISTS supplier_products_raw_history_p2027_04
  PARTITION OF supplier_products_raw_history
  FOR VALUES FROM ('2027-04-01 00:00:00+00') TO ('2027-05-01 00:00:00+00')

CREATE TABLE IF NOT EXISTS supplier_products_raw_history_p2027_05
  PARTITION OF supplier_products_raw_history
  FOR VALUES FROM ('2027-05-01 00:00:00+00') TO ('2027-06-01 00:00:00+00')

CREATE TABLE IF NOT EXISTS supplier_products_raw_history_p2027_06
  PARTITION OF supplier_products_raw_history
  FOR VALUES FROM ('2027-06-01 00:00:00+00') TO ('2027-07-01 00:00:00+00')

CREATE TABLE IF NOT EXISTS supplier_products_raw_history_p2027_07
  PARTITION OF supplier_products_raw_history
  FOR VALUES FROM ('2027-07-01 00:00:00+00') TO ('2027-08-01 00:00:00+00')

CREATE TABLE IF NOT EXISTS supplier_products_raw_history_p2027_08
  PARTITION OF supplier_products_raw_history
  FOR VALUES FROM ('2027-08-01 00:00:00+00') TO ('2027-09-01 00:00:00+00')

CREATE TABLE IF NOT EXISTS supplier_products_raw_history_p2027_09
  PARTITION OF supplier_products_raw_history
  FOR VALUES FROM ('2027-09-01 00:00:00+00') TO ('2027-10-01 00:00:00+00')

CREATE TABLE IF NOT EXISTS supplier_products_raw_history_p2027_10
  PARTITION OF supplier_products_raw_history
  FOR VALUES FROM ('2027-10-01 00:00:00+00') TO ('2027-11-01 00:00:00+00')

CREATE TABLE IF NOT EXISTS supplier_products_raw_history_p2027_11
  PARTITION OF supplier_products_raw_history
  FOR VALUES FROM ('2027-11-01 00:00:00+00') TO ('2027-12-01 00:00:00+00')

CREATE TABLE IF NOT EXISTS supplier_products_raw_history_p2027_12
  PARTITION OF supplier_products_raw_history
  FOR VALUES FROM ('2027-12-01 00:00:00+00') TO ('2028-01-01 00:00:00+00')
