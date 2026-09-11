
-- A constraint chk_padvar_colorid_tem_nome está registrada porém NÃO é avaliada na escrita
-- (comprovado lado a lado com chk_padvar_custo_nao_negativo, que funciona).
-- DROP/ADD com mesmo nome não surtiu efeito. Recriar sob NOVO nome força reconstrução limpa.
ALTER TABLE public.produtos_padronizacao_variantes
  DROP CONSTRAINT IF EXISTS chk_padvar_colorid_tem_nome;

ALTER TABLE public.produtos_padronizacao_variantes
  ADD CONSTRAINT chk_padvar_color_id_requer_nome
  CHECK (color_id IS NULL OR length(trim(coalesce(color_name,''))) > 0);
;
