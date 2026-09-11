-- Melhoria #2: remover função órfã validate_quote_real_discount.
--
-- Problema: a função exists mas nenhum trigger a referencia (trigger_refs=0).
-- Ela duplica a lógica de fn_quotes_calc_real_values (cálculo de real_subtotal) e
-- fn_quotes_validate_discount (validação de limites). Seu nome genérico cria confusão
-- com a função ativa fn_quotes_validate_discount, dificultando manutenção.
--
-- Verificação prévia: nenhum trigger ou outra função a chama.
-- É seguro dropar.
DROP FUNCTION IF EXISTS public.validate_quote_real_discount();;
