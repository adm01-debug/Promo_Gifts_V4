-- Previne reincidência do problema corrigido em PAD-02
CREATE OR REPLACE FUNCTION fn_check_preco_minimo_faixa()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_minimo NUMERIC;
  v_codigo TEXT;
BEGIN
  SELECT preco_minimo_unitario, codigo_tabela 
  INTO v_minimo, v_codigo
  FROM tabela_preco_gravacao_oficial
  WHERE id = NEW.tabela_preco_gravacao_id;

  -- Se mínimo é NULL, ignorar check (compatibilidade com tabelas antigas)
  IF v_minimo IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.preco_unitario < v_minimo THEN
    RAISE EXCEPTION 
      'Preço unitário (R$ %) abaixo do mínimo da tabela % (R$ %). Para cadastrar este valor, ajuste preco_minimo_unitario na tabela-mãe primeiro ou revise se este preço está correto.',
      NEW.preco_unitario, v_codigo, v_minimo
      USING HINT = 'UPDATE tabela_preco_gravacao_oficial SET preco_minimo_unitario = ' || NEW.preco_unitario || ' WHERE codigo_tabela = ' || quote_literal(v_codigo);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_preco_minimo
  ON tabela_preco_gravacao_oficial_faixa;

CREATE TRIGGER trg_check_preco_minimo
  BEFORE INSERT OR UPDATE OF preco_unitario ON tabela_preco_gravacao_oficial_faixa
  FOR EACH ROW EXECUTE FUNCTION fn_check_preco_minimo_faixa();

COMMENT ON FUNCTION fn_check_preco_minimo_faixa IS
'Previne cadastro de faixa com preço abaixo do mínimo declarado na tabela-mãe (semantica oficial após PAD-02).';
