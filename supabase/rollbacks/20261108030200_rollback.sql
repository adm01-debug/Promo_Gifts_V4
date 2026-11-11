-- Rollback de 20261108030200 (ESPELHO): os objetos já existiam em produção ANTES desta migration
-- (validado em 2026-11-11 contra o canônico). Ela deve ser registrada em modo repair-only;
-- portanto não há o que desfazer, e derrubar esses objetos seria uma regressão em produção.
-- Comandos destrutivos originais preservados abaixo, só para referência manual:
-- -- Rollback FT-088: remove function fn_check_item_fits
-- DROP FUNCTION IF EXISTS public.fn_check_item_fits(uuid, uuid, numeric);
SELECT 1;
