
-- A constraint constava como válida no catálogo mas não estava sendo aplicada na escrita.
-- Conserto: dropar e recriar pelo caminho padrão (ADD CONSTRAINT ... CHECK), que a arma de fato.
-- Dados já verificados: 0 linhas com color_id preenchido e color_name nulo/vazio -> validação passa.
ALTER TABLE public.produtos_padronizacao_variantes
  DROP CONSTRAINT IF EXISTS chk_padvar_colorid_tem_nome;

ALTER TABLE public.produtos_padronizacao_variantes
  ADD CONSTRAINT chk_padvar_colorid_tem_nome
  CHECK (color_id IS NULL OR length(trim(color_name)) > 0);
;
