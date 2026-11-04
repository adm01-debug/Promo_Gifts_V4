-- Tabela de auditoria de mudanças nos preços de gravação
CREATE TABLE IF NOT EXISTS audit_log_gravacao (
  id BIGSERIAL PRIMARY KEY,
  tabela_origem TEXT NOT NULL,
  operacao TEXT NOT NULL,  -- INSERT, UPDATE, DELETE
  registro_id UUID NOT NULL,
  codigo_tabela TEXT,
  campos_alterados JSONB,
  valor_antes JSONB,
  valor_depois JSONB,
  usuario TEXT DEFAULT current_user,
  ts TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_codigo ON audit_log_gravacao(codigo_tabela, ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_ts ON audit_log_gravacao(ts DESC);

COMMENT ON TABLE audit_log_gravacao IS 
'Trilha de auditoria de mudancas em tabela_preco_gravacao_oficial e tabela_preco_gravacao_oficial_faixa. Permite rastrear quem mudou o que e quando. Retencao recomendada: 2 anos.';

-- Função genérica de auditoria
CREATE OR REPLACE FUNCTION fn_audit_gravacao_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Triggers
DROP TRIGGER IF EXISTS trg_audit_gravacao ON tabela_preco_gravacao_oficial;
CREATE TRIGGER trg_audit_gravacao
  AFTER INSERT OR UPDATE OR DELETE ON tabela_preco_gravacao_oficial
  FOR EACH ROW EXECUTE FUNCTION fn_audit_gravacao_changes();

DROP TRIGGER IF EXISTS trg_audit_gravacao_faixa ON tabela_preco_gravacao_oficial_faixa;
CREATE TRIGGER trg_audit_gravacao_faixa
  AFTER INSERT OR UPDATE OR DELETE ON tabela_preco_gravacao_oficial_faixa
  FOR EACH ROW EXECUTE FUNCTION fn_audit_gravacao_changes();
