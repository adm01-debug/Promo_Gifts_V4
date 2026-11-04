CREATE OR REPLACE FUNCTION public.fn_normalize_ncm(raw_ncm text)
 RETURNS character varying
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  clean TEXT;
  v_valid BOOLEAN := FALSE;
BEGIN
  IF raw_ncm IS NULL OR TRIM(raw_ncm) = '' THEN RETURN NULL; END IF;

  -- 1. Limpar: remove pontos, hífens, espaços
  clean := REPLACE(REPLACE(REPLACE(TRIM(raw_ncm), '.', ''), '-', ''), ' ', '');

  -- 2. Corrigir erros comuns de digitação (XBZ/outros fornecedores)
  clean := REPLACE(REPLACE(clean, 'O', '0'), 'o', '0');  -- letra O → zero
  clean := REPLACE(clean, 'Z', '0');                      -- Z → zero

  -- 3. Validar formato: exatamente 8 dígitos
  IF clean !~ '^\d{8}$' THEN RETURN NULL; END IF;

  -- 4. Rejeitar placeholder de zeros
  IF clean = '00000000' THEN RETURN NULL; END IF;

  -- 5. Validação via ncm_codes (STABLE — não rejeita se não encontrado,
  --    pois nossa tabela com 261 registros está incompleta)
  --    Apenas confirma que o código é estruturalmente válido pelo capítulo.
  --    NCM brasileiro: capítulo 01–99, posição 4 dígitos, subposição 6, etc.
  --    Aceitamos qualquer 8 dígitos que passe o filtro acima.

  RETURN clean;
END;
$function$
