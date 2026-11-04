-- Migration: 20261104100000_partitions_supplier_products_raw_history_2027
-- Cria partições p2027_03 a p2027_12 da tabela supplier_products_raw_history.
-- p2027_01 e p2027_02 já existem em produção.
-- Deadline: 2026-12-15 — sem essas partições o worker de arquivamento falha silenciosamente.
--
-- Rollback: supabase/rollbacks/20261104100000_rollback.sql

CREATE TABLE supplier_products_raw_history_p2027_03
  PARTITION OF supplier_products_raw_history
  FOR VALUES FROM ('2027-03-01 00:00:00+00') TO ('2027-04-01 00:00:00+00');

CREATE TABLE supplier_products_raw_history_p2027_04
  PARTITION OF supplier_products_raw_history
  FOR VALUES FROM ('2027-04-01 00:00:00+00') TO ('2027-05-01 00:00:00+00');

CREATE TABLE supplier_products_raw_history_p2027_05
  PARTITION OF supplier_products_raw_history
  FOR VALUES FROM ('2027-05-01 00:00:00+00') TO ('2027-06-01 00:00:00+00');

CREATE TABLE supplier_products_raw_history_p2027_06
  PARTITION OF supplier_products_raw_history
  FOR VALUES FROM ('2027-06-01 00:00:00+00') TO ('2027-07-01 00:00:00+00');

CREATE TABLE supplier_products_raw_history_p2027_07
  PARTITION OF supplier_products_raw_history
  FOR VALUES FROM ('2027-07-01 00:00:00+00') TO ('2027-08-01 00:00:00+00');

CREATE TABLE supplier_products_raw_history_p2027_08
  PARTITION OF supplier_products_raw_history
  FOR VALUES FROM ('2027-08-01 00:00:00+00') TO ('2027-09-01 00:00:00+00');

CREATE TABLE supplier_products_raw_history_p2027_09
  PARTITION OF supplier_products_raw_history
  FOR VALUES FROM ('2027-09-01 00:00:00+00') TO ('2027-10-01 00:00:00+00');

CREATE TABLE supplier_products_raw_history_p2027_10
  PARTITION OF supplier_products_raw_history
  FOR VALUES FROM ('2027-10-01 00:00:00+00') TO ('2027-11-01 00:00:00+00');

CREATE TABLE supplier_products_raw_history_p2027_11
  PARTITION OF supplier_products_raw_history
  FOR VALUES FROM ('2027-11-01 00:00:00+00') TO ('2027-12-01 00:00:00+00');

CREATE TABLE supplier_products_raw_history_p2027_12
  PARTITION OF supplier_products_raw_history
  FOR VALUES FROM ('2027-12-01 00:00:00+00') TO ('2028-01-01 00:00:00+00');
