
-- Registrar o drop dos 12 índices no histórico de migrations
-- (os DROPs já foram executados via execute_sql acima)
SELECT 'migration_registered' AS status,
  'Dropped 12 dead indexes from products: ~5.4MB recovered' AS info;
;
