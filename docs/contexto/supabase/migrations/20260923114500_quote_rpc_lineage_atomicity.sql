-- Aplicação nominalmente autorizada pelo PO em 23/09/2026.
-- Projeto canônico: doufsxqlfjyuvxuezpln.
-- Escopo fechado: somente as três funções transacionais de orçamento abaixo.
--
-- Este arquivo é deliberadamente um manifest de promoção para o workflow E15.
-- `psql -1` mantém os três SQLs revisados na mesma transação e `\ir` resolve
-- caminhos relativamente a este arquivo. Cada proposta contém preconditions e
-- postconditions fail-closed contra drift de corpo, ACL, owner, search_path,
-- colunas e FK.
--
-- Fontes imutáveis revisadas:
-- - 94ec0a32148ddccd2a71f8a67783a8f64f7c3d2d5968a28aa82855c975a90d55
--   docs/db/proposals/20260922210000_create_quote_lineage.sql
-- - 502caec43349a3bd5e88e3dbb989f96f4401f9d2b9440e7790124dd4534142be
--   docs/db/proposals/20260922210500_increment_quote_version_explicit_bump.sql
-- - ae87ae018f88ab9b9c8496de9fcdafe8b2321778135de79ed46377fb429c57bc
--   docs/db/proposals/20260922211000_update_quote_lineage_lock.sql
--
-- Rollback: aplicar uma nova migration compensatória com as três definições
-- capturadas imediatamente antes desta promoção; nunca reeditar este arquivo.

\ir ../../docs/db/proposals/20260922210000_create_quote_lineage.sql
\ir ../../docs/db/proposals/20260922210500_increment_quote_version_explicit_bump.sql
\ir ../../docs/db/proposals/20260922211000_update_quote_lineage_lock.sql
