
-- FIX C04: updated_at trigger deve usar clock_timestamp() para avançar
-- mesmo dentro da mesma transação (now() = fixo na transação inteira)
CREATE OR REPLACE FUNCTION public.fn_pn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- clock_timestamp() retorna o tempo real do wall clock,
    -- avança mesmo dentro da mesma transação (diferente de now())
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_pn_set_updated_at() IS
    'Trigger: mantém updated_at em product_novelties. '
    'Usa clock_timestamp() (não now()) para avançar mesmo dentro de uma transação.';
;
