-- Rollback: 20261119213100_create_freight_settings
--
-- Remove a tabela de parâmetros globais do frete. Reverter apaga a linha única
-- (CEP de origem, divisores de cubagem, fator de aproveitamento, folga e regra
-- de personalização). Qualquer valor alterado pelo admin se perde e, numa
-- reaplicação, a linha renasce com os padrões da migration.
--
-- O DROP TABLE leva junto o trigger e as duas policies. A função
-- public.update_updated_at_column() é compartilhada e NÃO é removida.

DROP TABLE IF EXISTS public.freight_settings;
