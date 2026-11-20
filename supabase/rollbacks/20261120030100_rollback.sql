-- Rollback: 20261120030100_seed_shipping_boxes
--
-- Desfaz o seed das caixas de transporte (P, M, G, GG). GERADO por
-- scripts/freight/seed-shipping-boxes.mjs junto com a migration, com os mesmos
-- ids e valores do INSERT dela. Não edite à mão: gere de novo.
--
-- Apaga SÓ a linha que tem o id do seed E continua viva e IDÊNTICA ao seed em
-- todas as colunas gravadas. Ficam de propósito:
--   - a caixa cadastrada antes do seed, mesmo com valores iguais (outro id);
--   - a caixa do seed que o admin editou (qualquer coluna diferente);
--   - a caixa do seed que o admin excluiu (deleted_at preenchido).
--
-- Efeito no negócio: sem caixa ativa, todo plano de frete (src/lib/freight)
-- sai como "nao_cabe: nenhuma caixa ativa cadastrada" até alguém recadastrar.
--
-- Antes de apagar, copia shipping_boxes para _backup_shipping_boxes_YYYYMMDD
-- (CONTRIBUTING.md; data em UTC), com RLS ligada e sem acesso de
-- anon/authenticated. Se o backup do dia já existe, usa o primeiro nome livre
-- (_YYYYMMDD_2, depois _3, ...): cada execução tem o seu backup. Cópia,
-- conferência da contagem e DELETE ficam no mesmo bloco, com a tabela travada
-- para escrita: se um passo falhar, nada fica.
--
-- Rodar ANTES do rollback 20261119213000, que derruba a tabela. Sem a
-- tabela, avisa e termina sem erro.

DO $seed$
DECLARE
  dia text := '_backup_shipping_boxes_' || to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDD');
  b text := dia;
  n integer := 1;
  linhas_tabela bigint;
  linhas_backup bigint;
  apagadas bigint;
BEGIN
  IF to_regclass('public.shipping_boxes') IS NULL THEN
    RAISE NOTICE 'public.shipping_boxes não existe: nada a desfazer.';
    RETURN;
  END IF;

  -- Primeiro nome livre do dia: _YYYYMMDD, depois _YYYYMMDD_2, _3, ...
  WHILE to_regclass('public.' || b) IS NOT NULL LOOP
    n := n + 1;
    b := dia || '_' || n;
  END LOOP;

  -- Ninguém grava entre a cópia e o DELETE; a leitura continua liberada.
  LOCK TABLE public.shipping_boxes IN SHARE ROW EXCLUSIVE MODE;

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

  DELETE FROM public.shipping_boxes AS c
   USING (VALUES
      ('1a43b67a-2bea-856c-aae0-268d914f9d21', 'P', 'Caixa P', 27.00, 33.00, 33.00, 3, 0, 10000, 0.90, true, 1),
      ('184c412a-392e-8bc9-bccd-3852f0ecd0d1', 'M', 'Caixa M', 33.00, 33.00, 47.00, 3, 0, 20000, 0.90, true, 2),
      ('3f990d5d-b2aa-8c2c-a1d1-e76c6c089525', 'G', 'Caixa G', 36.00, 36.00, 54.00, 3, 0, 25000, 0.90, true, 3),
      ('3d412436-292c-89af-a179-5b9433cc75e8', 'GG', 'Caixa GG', 40.00, 50.00, 60.00, 3, 0, 30000, 0.90, true, 4)
   ) AS s (id, code, name, outer_height_cm, outer_width_cm, outer_length_cm,
           wall_thickness_mm, empty_weight_g, max_weight_g, fill_factor,
           is_active, sort_order)
   WHERE c.id = s.id::uuid
     AND c.deleted_at IS NULL
     AND c.code = s.code
     AND c.name = s.name
     AND c.outer_height_cm = s.outer_height_cm
     AND c.outer_width_cm = s.outer_width_cm
     AND c.outer_length_cm = s.outer_length_cm
     AND c.wall_thickness_mm = s.wall_thickness_mm
     AND c.empty_weight_g = s.empty_weight_g
     AND c.max_weight_g = s.max_weight_g
     AND c.fill_factor = s.fill_factor
     AND c.is_active = s.is_active
     AND c.sort_order = s.sort_order;
  GET DIAGNOSTICS apagadas = ROW_COUNT;
  RAISE NOTICE '% caixa(s) do seed apagada(s). Backup em public.% (% linha(s)).', apagadas, b, linhas_backup;
END $seed$;
