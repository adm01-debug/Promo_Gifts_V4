-- Rollback: 20261119213000_create_shipping_boxes
--
-- Remove a tabela das caixas de transporte. Reverter faz o motor de frete
-- (src/lib/freight) ficar sem caixa cadastrada: todo plano passa a sair como
-- "nao_cabe: nenhuma caixa ativa cadastrada", sem quebrar orçamento nenhum.
--
-- Antes do DROP, copia shipping_boxes para _backup_shipping_boxes_YYYYMMDD
-- (CONTRIBUTING.md), com RLS ligada e sem acesso de anon/authenticated. O
-- sufixo é a data em UTC.
--
-- O DROP só acontece depois do backup conferido (mesma contagem de linhas da
-- tabela), no mesmo bloco: se qualquer passo falhar, nem o backup nem o DROP
-- ficam. Se o backup do dia já existe, a cópia vai para o primeiro nome livre
-- (_YYYYMMDD_2, depois _3, ...): nenhum backup é sobrescrito e o rollback não
-- trava — antes ele pulava o backup e apagava a tabela, perdendo o que tinha
-- mudado desde o primeiro rollback do dia. O NOTICE no fim diz em qual nome a
-- cópia ficou; no mesmo dia, o de número mais alto é o mais recente. Sem a
-- tabela, não faz nada e não dá erro.
--
-- Se a 20261120030000 estiver aplicada, rode antes o rollback dela. O rollback
-- do seed (20261120030100) grava o backup do dia com este mesmo nome: quem
-- desfaz tudo no mesmo dia fica com a cópia de antes do seed sair em
-- _YYYYMMDD e a deste rollback em _YYYYMMDD_2.
--
-- Restaurar: reaplicar a migration e
--   INSERT INTO public.shipping_boxes
--     (id, code, name, outer_height_cm, outer_width_cm, outer_length_cm,
--      wall_thickness_mm, empty_weight_g, max_weight_g, fill_factor,
--      is_active, sort_order, created_at, updated_at, deleted_at)
--   SELECT id, code, name, outer_height_cm, outer_width_cm, outer_length_cm,
--          wall_thickness_mm, empty_weight_g, max_weight_g, fill_factor,
--          is_active, sort_order, created_at, updated_at, deleted_at
--   FROM public._backup_shipping_boxes_YYYYMMDD  (ou o _N mais recente)
-- As três colunas inner_* ficam de fora do INSERT de propósito: são geradas.
--
-- O DROP TABLE leva junto o trigger, os índices e as quatro policies. A função
-- public.update_updated_at_column() é compartilhada e NÃO é removida.

DO $$
DECLARE
  dia text := '_backup_shipping_boxes_' || to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDD');
  b text := dia;
  n integer := 1;
  linhas_tabela bigint;
  linhas_backup bigint;
BEGIN
  IF to_regclass('public.shipping_boxes') IS NULL THEN
    RAISE NOTICE 'public.shipping_boxes não existe: nada a reverter.';
    RETURN;
  END IF;

  -- Primeiro nome livre do dia: _YYYYMMDD, depois _YYYYMMDD_2, _3, ...
  WHILE to_regclass('public.' || b) IS NOT NULL LOOP
    n := n + 1;
    b := dia || '_' || n;
  END LOOP;

  -- Ninguém grava entre a cópia e o DROP.
  LOCK TABLE public.shipping_boxes IN ACCESS EXCLUSIVE MODE;

  EXECUTE format('CREATE TABLE public.%I AS TABLE public.shipping_boxes', b);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', b);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', b);

  SELECT count(*) INTO linhas_tabela FROM public.shipping_boxes;
  EXECUTE format('SELECT count(*) FROM public.%I', b) INTO linhas_backup;
  IF linhas_backup IS DISTINCT FROM linhas_tabela THEN
    RAISE EXCEPTION
      'Rollback recusado: o backup public.% ficou com % linha(s) e public.shipping_boxes tem %. Nada foi apagado.',
      b, linhas_backup, linhas_tabela;
  END IF;

  DROP TABLE public.shipping_boxes;
  RAISE NOTICE 'public.shipping_boxes removida. Backup em public.% (% linha(s)).', b, linhas_backup;
END $$;
