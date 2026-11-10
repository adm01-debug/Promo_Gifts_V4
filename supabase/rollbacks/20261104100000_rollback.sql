-- Rollback da migration 20261104100000_partitions_supplier_products_raw_history_2027
-- Drop das partições p2027_03 a p2027_12.
-- p2027_01 e p2027_02 não são tocadas (preexistentes).

DROP TABLE IF EXISTS supplier_products_raw_history_p2027_03;
DROP TABLE IF EXISTS supplier_products_raw_history_p2027_04;
DROP TABLE IF EXISTS supplier_products_raw_history_p2027_05;
DROP TABLE IF EXISTS supplier_products_raw_history_p2027_06;
DROP TABLE IF EXISTS supplier_products_raw_history_p2027_07;
DROP TABLE IF EXISTS supplier_products_raw_history_p2027_08;
DROP TABLE IF EXISTS supplier_products_raw_history_p2027_09;
DROP TABLE IF EXISTS supplier_products_raw_history_p2027_10;
DROP TABLE IF EXISTS supplier_products_raw_history_p2027_11;
DROP TABLE IF EXISTS supplier_products_raw_history_p2027_12;
