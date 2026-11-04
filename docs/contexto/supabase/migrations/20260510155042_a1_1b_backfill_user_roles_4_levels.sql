-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ A1-1b: Backfill de user_roles para hierarquia 4 níveis                  │
-- │                                                                         │
-- │ Hierarquia: dev > admin > coordenador > vendedor                        │
-- │                                                                         │
-- │ Mapping aprovado por Joaquim (PO, adm01@promobrindes.com.br) em        │
-- │ 10/05/2026:                                                             │
-- │   75921d8b... (Joaquim, adm01@):     dev → admin                        │
-- │     PO foca em cadastros + gestão usuários, perde acesso dev-only       │
-- │   697f84e2... (Abner Silva, ti@):    supervisor → dev                   │
-- │     TI assume manutenção real do sistema                                │
-- │   4e7b4bcc... (Gabryelly Eduarda):   agente → vendedor (rename)         │
-- │   3232c5ec... (Leticia Melo):        agente → vendedor (rename)         │
-- │                                                                         │
-- │ 'coordenador' fica vago (cargo na hierarquia, sem ocupante hoje).       │
-- │                                                                         │
-- │ Restore point pré-A1-1b (PITR contínuo):                                │
-- │   timestamp:     2026-05-10 15:43:32 UTC                                │
-- │   lsn:           D6/D000130                                             │
-- │   wal_file:      00000001000000D60000000C                               │
-- │   validated_by:  chat-gestor (via pg_stat_archiver)                     │
-- │                                                                         │
-- │ Mitigação Mit-A aceita: Joaquim sem acesso dev-only por 1-2 dias até    │
-- │ A1-1c reescrever policies. Em emergência, escala pro Abner (novo dev).  │
-- │                                                                         │
-- │ Atomicidade: DO block roda em transação implícita; RAISE EXCEPTION      │
-- │ causa rollback completo dos 4 UPDATEs.                                  │
-- │ Idempotência: WHERE role IS DISTINCT FROM target torna re-run no-op.    │
-- └─────────────────────────────────────────────────────────────────────────┘

DO $$
DECLARE
  _joaquim_id  constant uuid := '75921d8b-611f-4413-9ce5-afccdb733d26';
  _abner_id    constant uuid := '697f84e2-c308-4e45-992c-c7762565ca65';
  _gabry_id    constant uuid := '4e7b4bcc-9321-45e7-bc3b-df47721e2e95';
  _leticia_id  constant uuid := '3232c5ec-debf-49ba-9dd9-d33a46aff50f';
  _bad_count   int;
  _users_count int;
BEGIN
  -- Pré-condição 1: validar que cada user está em estado pre-backfill OU já
  -- target (idempotência). Qualquer outro valor (ex: 'manager' zumbi) aborta.
  SELECT COUNT(*) INTO _bad_count
  FROM public.user_roles
  WHERE (user_id = _joaquim_id  AND role::text NOT IN ('dev','admin'))
     OR (user_id = _abner_id    AND role::text NOT IN ('supervisor','dev'))
     OR (user_id = _gabry_id    AND role::text NOT IN ('agente','vendedor'))
     OR (user_id = _leticia_id  AND role::text NOT IN ('agente','vendedor'));
  IF _bad_count > 0 THEN
    RAISE EXCEPTION 'A1-1b ABORTED: % user(s) com role inesperado. Validar manualmente antes de re-rodar.', _bad_count;
  END IF;
  
  -- Pré-condição 2: confirmar que os 4 user_ids esperados existem
  SELECT COUNT(*) INTO _users_count 
  FROM public.user_roles 
  WHERE user_id IN (_joaquim_id, _abner_id, _gabry_id, _leticia_id);
  IF _users_count <> 4 THEN
    RAISE EXCEPTION 'A1-1b ABORTED: esperado 4 users em user_roles, encontrado %.', _users_count;
  END IF;

  -- Backfill na ordem: promover Abner → rebaixar Joaquim → renomear vendedores.
  -- Abner promovido primeiro garante que SEMPRE tem 'dev' no banco durante a
  -- transição (mesmo se algo abortasse no meio do bloco — embora o DO seja
  -- atômico).
  
  UPDATE public.user_roles SET role = 'dev'::public.app_role
    WHERE user_id = _abner_id 
      AND role IS DISTINCT FROM 'dev'::public.app_role;

  UPDATE public.user_roles SET role = 'admin'::public.app_role
    WHERE user_id = _joaquim_id 
      AND role IS DISTINCT FROM 'admin'::public.app_role;

  UPDATE public.user_roles SET role = 'vendedor'::public.app_role
    WHERE user_id = _gabry_id 
      AND role IS DISTINCT FROM 'vendedor'::public.app_role;

  UPDATE public.user_roles SET role = 'vendedor'::public.app_role
    WHERE user_id = _leticia_id 
      AND role IS DISTINCT FROM 'vendedor'::public.app_role;

  -- Pós-condição 1: validar via has_role (SSOT) que os 4 estados finais persistiram
  IF NOT (
    public.has_role(_joaquim_id, 'admin'::public.app_role)
    AND public.has_role(_abner_id, 'dev'::public.app_role)
    AND public.has_role(_gabry_id, 'vendedor'::public.app_role)
    AND public.has_role(_leticia_id, 'vendedor'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'A1-1b POS-CONDICAO 1 FALHOU: estado final via has_role nao bate.';
  END IF;
  
  -- Pós-condição 2: cross-check semântico via helpers canônicas (A1-1a)
  IF NOT public.is_admin_or_above(_joaquim_id) THEN
    RAISE EXCEPTION 'A1-1b POS-CONDICAO 2: Joaquim deveria passar em is_admin_or_above.';
  END IF;
  IF NOT public.is_dev(_abner_id) THEN
    RAISE EXCEPTION 'A1-1b POS-CONDICAO 2: Abner deveria passar em is_dev.';
  END IF;
  IF public.is_coord_or_above(_gabry_id) THEN
    RAISE EXCEPTION 'A1-1b POS-CONDICAO 2: Gabryelly nao deveria passar em is_coord_or_above.';
  END IF;
  IF public.is_admin_or_above(_leticia_id) THEN
    RAISE EXCEPTION 'A1-1b POS-CONDICAO 2: Leticia nao deveria passar em is_admin_or_above.';
  END IF;
  
  -- Pós-condição 3: garantir que Joaquim NÃO é mais dev (privilege downgrade efetivo)
  IF public.is_dev(_joaquim_id) THEN
    RAISE EXCEPTION 'A1-1b POS-CONDICAO 3: Joaquim ainda passa em is_dev (downgrade falhou).';
  END IF;
  
  RAISE NOTICE 'A1-1b OK: 4 users migrados para hierarquia 4 niveis.';
END $$;
