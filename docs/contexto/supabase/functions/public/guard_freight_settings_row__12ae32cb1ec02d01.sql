CREATE OR REPLACE FUNCTION public.guard_freight_settings_row()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
BEGIN
  -- A chave do singleton não muda.
  NEW.id := OLD.id;
  -- Autor = quem está autenticado na requisição, nunca o valor que o cliente
  -- mandou. Sem usuário (service_role, manutenção), o autor anterior fica.
  --
  -- Só quando o UPDATE vem direto de um comando (profundidade 1). A coluna tem
  -- FK para auth.users com ON DELETE SET NULL, e o Postgres executa esse SET
  -- NULL como um UPDATE disparado por trigger interno (profundidade 2). Sem o
  -- IF, este trigger devolvia o autor antigo por cima do NULL e a linha ficava
  -- apontando para um usuário que não existe mais.
  IF pg_trigger_depth() = 1 THEN
    NEW.updated_by := coalesce(auth.uid(), OLD.updated_by);
  END IF;
  RETURN NEW;
END;
$function$
