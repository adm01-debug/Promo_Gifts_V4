-- ============================================================
-- MELHORIA 5: cor do ITEM derivada do NOME (provável), "vinho" excluído
-- Backup + audit; aditivo (só color IS NULL); rerun-safe
-- ============================================================

-- Backup/auditoria (captura id, cor antiga, nome e palavra detectada)
CREATE TABLE IF NOT EXISTS public._bkp_kit_color_from_name_20260624 AS
SELECT k.id,
       k.color AS old_color,
       k.component_name,
       (regexp_match(lower(k.component_name),
         '\m(preto|preta|branco|branca|vermelho|vermelha|azul|verde|amarelo|amarela|rosa|roxo|roxa|laranja|marrom|cinza|prata|prateado|prateada|dourado|dourada|bege|turquesa|lilas|coral|nude|caramelo|grafite|chumbo|creme|transparente|incolor|inox|cobre|bronze)\M'))[1] AS matched_word,
       now() AS captured_at
FROM product_kit_components k
WHERE k.color IS NULL
  AND lower(k.component_name) ~
   '\m(preto|preta|branco|branca|vermelho|vermelha|azul|verde|amarelo|amarela|rosa|roxo|roxa|laranja|marrom|cinza|prata|prateado|prateada|dourado|dourada|bege|turquesa|lilas|coral|nude|caramelo|grafite|chumbo|creme|transparente|incolor|inox|cobre|bronze)\M';

COMMENT ON TABLE public._bkp_kit_color_from_name_20260624 IS
  'Backup/audit MELHORIA 5 (2026-06-24): cor de item derivada do nome do componente. Reversão: UPDATE product_kit_components p SET color=b.old_color FROM _bkp_kit_color_from_name_20260624 b WHERE p.id=b.id.';

-- Extração com normalização canônica
UPDATE product_kit_components k
SET color = CASE (regexp_match(lower(k.component_name),
        '\m(preto|preta|branco|branca|vermelho|vermelha|azul|verde|amarelo|amarela|rosa|roxo|roxa|laranja|marrom|cinza|prata|prateado|prateada|dourado|dourada|bege|turquesa|lilas|coral|nude|caramelo|grafite|chumbo|creme|transparente|incolor|inox|cobre|bronze)\M'))[1]
      WHEN 'preto' THEN 'Preto'        WHEN 'preta' THEN 'Preto'
      WHEN 'branco' THEN 'Branco'      WHEN 'branca' THEN 'Branco'
      WHEN 'vermelho' THEN 'Vermelho'  WHEN 'vermelha' THEN 'Vermelho'
      WHEN 'azul' THEN 'Azul'
      WHEN 'verde' THEN 'Verde'
      WHEN 'amarelo' THEN 'Amarelo'    WHEN 'amarela' THEN 'Amarelo'
      WHEN 'rosa' THEN 'Rosa'
      WHEN 'roxo' THEN 'Roxo'          WHEN 'roxa' THEN 'Roxo'
      WHEN 'laranja' THEN 'Laranja'
      WHEN 'marrom' THEN 'Marrom'
      WHEN 'cinza' THEN 'Cinza'
      WHEN 'prata' THEN 'Prata'        WHEN 'prateado' THEN 'Prata'  WHEN 'prateada' THEN 'Prata'
      WHEN 'dourado' THEN 'Dourado'    WHEN 'dourada' THEN 'Dourado'
      WHEN 'bege' THEN 'Bege'
      WHEN 'turquesa' THEN 'Turquesa'
      WHEN 'lilas' THEN 'Lilás'
      WHEN 'coral' THEN 'Coral'
      WHEN 'nude' THEN 'Nude'
      WHEN 'caramelo' THEN 'Caramelo'
      WHEN 'grafite' THEN 'Grafite'
      WHEN 'chumbo' THEN 'Chumbo'
      WHEN 'creme' THEN 'Creme'
      WHEN 'transparente' THEN 'Transparente'
      WHEN 'incolor' THEN 'Incolor'
      WHEN 'inox' THEN 'Inox'
      WHEN 'cobre' THEN 'Cobre'
      WHEN 'bronze' THEN 'Bronze'
      ELSE initcap((regexp_match(lower(k.component_name),
        '\m(preto|preta|branco|branca|vermelho|vermelha|azul|verde|amarelo|amarela|rosa|roxo|roxa|laranja|marrom|cinza|prata|prateado|prateada|dourado|dourada|bege|turquesa|lilas|coral|nude|caramelo|grafite|chumbo|creme|transparente|incolor|inox|cobre|bronze)\M'))[1])
    END,
    updated_at = now()
WHERE k.color IS NULL
  AND lower(k.component_name) ~
   '\m(preto|preta|branco|branca|vermelho|vermelha|azul|verde|amarelo|amarela|rosa|roxo|roxa|laranja|marrom|cinza|prata|prateado|prateada|dourado|dourada|bege|turquesa|lilas|coral|nude|caramelo|grafite|chumbo|creme|transparente|incolor|inox|cobre|bronze)\M';;
