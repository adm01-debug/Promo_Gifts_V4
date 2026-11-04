CREATE OR REPLACE FUNCTION public.tg_integration_credentials_derive()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  -- Derivar provider do prefixo do secret_name se não fornecido
  IF NEW.provider IS NULL OR NEW.provider = '' THEN
    NEW.provider := CASE
      WHEN NEW.secret_name LIKE 'BITRIX24_%'           THEN 'bitrix24'
      WHEN NEW.secret_name LIKE 'N8N_%'                THEN 'n8n'
      WHEN NEW.secret_name LIKE 'GITHUB_%'             THEN 'github'
      WHEN NEW.secret_name LIKE 'EXTERNAL_PROMOBRIND_%'THEN 'promobrind'
      WHEN NEW.secret_name LIKE 'EXTERNAL_CRM_%'       THEN 'crm'
      WHEN NEW.secret_name LIKE 'MCP_%'                THEN 'mcp'
      WHEN NEW.secret_name LIKE 'INBOUND_WEBHOOK_HMAC_%' THEN 'webhook'
      WHEN NEW.secret_name LIKE 'OUTBOUND_WEBHOOK_SECRET_%' THEN 'webhook'
      WHEN NEW.secret_name LIKE 'CLOUDFLARE_%'         THEN 'cloudflare'  -- NEW
      WHEN NEW.secret_name LIKE 'XBZ_%'                THEN 'xbz'         -- NEW
      ELSE 'other'
    END;
  END IF;

  -- Computar length e masked_suffix a partir do secret_value
  IF NEW.secret_value IS NOT NULL THEN
    NEW.length := length(NEW.secret_value);
    NEW.masked_suffix := CASE
      WHEN length(NEW.secret_value) >= 4 THEN right(NEW.secret_value, 4)
      ELSE NEW.secret_value
    END;
  END IF;

  -- Manter updated_at em sincronia
  NEW.updated_at := now();

  RETURN NEW;
END;
$function$
