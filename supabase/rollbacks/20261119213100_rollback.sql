-- Rollback: 20261119213100_create_freight_settings
--
-- Remove a tabela de parâmetros globais do frete (CEP de origem, divisores de
-- cubagem, fator de aproveitamento, folga e regra de personalização).
--
-- Antes do DROP, copia freight_settings para _backup_freight_settings_YYYYMMDD
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
-- Se a 20261120030000 estiver aplicada, rode antes o rollback dela.
--
-- Restaurar: reaplicar a migration (que recria a linha única com os padrões) e
--   UPDATE public.freight_settings s
--   SET origin_cep = b.origin_cep,
--       cubic_divisor_correios = b.cubic_divisor_correios,
--       cubic_divisor_rodoviario = b.cubic_divisor_rodoviario,
--       default_fill_factor = b.default_fill_factor,
--       internal_buffer_days = b.internal_buffer_days,
--       multi_personalization_rule = b.multi_personalization_rule,
--       updated_by = b.updated_by
--   FROM public._backup_freight_settings_YYYYMMDD b  (ou o _N mais recente)
--   WHERE s.id AND b.id
-- Rode esse UPDATE ANTES de reaplicar a 20261120030000: depois dela o trigger
-- guard_freight_settings_row mantém o updated_by atual e ignora o do backup.
--
-- O DROP TABLE leva junto o trigger e as duas policies. A função
-- public.update_updated_at_column() é compartilhada e NÃO é removida.

DO $$
DECLARE
  dia text := '_backup_freight_settings_' || to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDD');
  b text := dia;
  n integer := 1;
  linhas_tabela bigint;
  linhas_backup bigint;
BEGIN
  IF to_regclass('public.freight_settings') IS NULL THEN
    RAISE NOTICE 'public.freight_settings não existe: nada a reverter.';
    RETURN;
  END IF;

  -- Primeiro nome livre do dia: _YYYYMMDD, depois _YYYYMMDD_2, _3, ...
  WHILE to_regclass('public.' || b) IS NOT NULL LOOP
    n := n + 1;
    b := dia || '_' || n;
  END LOOP;

  -- Ninguém grava entre a cópia e o DROP.
  LOCK TABLE public.freight_settings IN ACCESS EXCLUSIVE MODE;

  EXECUTE format('CREATE TABLE public.%I AS TABLE public.freight_settings', b);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', b);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', b);

  SELECT count(*) INTO linhas_tabela FROM public.freight_settings;
  EXECUTE format('SELECT count(*) FROM public.%I', b) INTO linhas_backup;
  IF linhas_backup IS DISTINCT FROM linhas_tabela THEN
    RAISE EXCEPTION
      'Rollback recusado: o backup public.% ficou com % linha(s) e public.freight_settings tem %. Nada foi apagado.',
      b, linhas_backup, linhas_tabela;
  END IF;

  DROP TABLE public.freight_settings;
  RAISE NOTICE 'public.freight_settings removida. Backup em public.% (% linha(s)).', b, linhas_backup;
END $$;
