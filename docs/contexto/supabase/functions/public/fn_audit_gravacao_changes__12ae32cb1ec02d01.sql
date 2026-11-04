CREATE OR REPLACE FUNCTION public.fn_audit_gravacao_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_codigo TEXT;
  v_tab_id UUID;
BEGIN
  -- Identificar codigo_tabela conforme origem
  IF TG_TABLE_NAME = 'tabela_preco_gravacao_oficial' THEN
    v_codigo := COALESCE(NEW.codigo_tabela, OLD.codigo_tabela);
    v_tab_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'tabela_preco_gravacao_oficial_faixa' THEN
    v_tab_id := COALESCE(NEW.id, OLD.id);
    SELECT codigo_tabela INTO v_codigo
    FROM tabela_preco_gravacao_oficial
    WHERE id = COALESCE(NEW.tabela_preco_gravacao_id, OLD.tabela_preco_gravacao_id);
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log_gravacao (tabela_origem, operacao, registro_id, codigo_tabela, valor_depois)
    VALUES (TG_TABLE_NAME, 'INSERT', v_tab_id, v_codigo, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log_gravacao (tabela_origem, operacao, registro_id, codigo_tabela, valor_antes, valor_depois)
    VALUES (TG_TABLE_NAME, 'UPDATE', v_tab_id, v_codigo, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log_gravacao (tabela_origem, operacao, registro_id, codigo_tabela, valor_antes)
    VALUES (TG_TABLE_NAME, 'DELETE', v_tab_id, v_codigo, to_jsonb(OLD));
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$
