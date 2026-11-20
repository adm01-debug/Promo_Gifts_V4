-- Rollback: supabase/rollbacks/20261120030000_rollback.sql
--
-- Migration: endurece public.shipping_boxes e public.freight_settings
--
-- Fecha os achados da validação de banco de 19/11/2026 sobre as duas tabelas
-- criadas em 20261119213000 e 20261119213100. Nenhuma coluna, índice ou dado é
-- alterado: entram CHECKs, dois triggers, sai uma policy e os privilégios são
-- reduzidos ao que a aplicação usa.
--
-- Conferido em produção por SELECT antes de escrever os CHECKs (20/11/2026):
-- shipping_boxes tem 0 linhas e freight_settings tem a linha única com
-- 03377-000, 6000, 3333, 0.90, 0, 'max' — todos dentro das faixas abaixo. Se
-- alguma linha estiver fora na hora da aplicação, o ADD CONSTRAINT falha e,
-- com `psql -1` (como o workflow roda), nada desta migration fica aplicado.
--
-- Idempotente: pode rodar de novo sem erro (DROP ... IF EXISTS antes de cada
-- ADD CONSTRAINT, CREATE OR REPLACE nas funções e nos triggers).

-- ── 1. shipping_boxes: código e nome ───────────────────────────────────────
-- Achado: 'p', 'P ', ' P', 'P' + quebra de linha, '' e um código de 5000
-- caracteres passavam todos pelo índice único de `code`, e a expedição lê os
-- cinco primeiros como a mesma caixa "P". O formato canônico (maiúsculo, sem
-- espaço nas pontas, 1 a 10 caracteres de A-Z, 0-9, _ e -) faz o índice único
-- parcial existente (shipping_boxes_code_unique_active) bastar.
--
-- O nome não pode ser vazio nem ter espaço nas pontas. A lista do btrim é
-- explícita — espaço, TAB, quebra de linha, retorno de carro e o espaço
-- inseparável (NBSP, chr(160)) — porque o btrim sem lista só tira o espaço
-- comum: um nome feito só de TAB ou de NBSP passava e aparecia em branco na
-- tela. As quatro caixas do seed ('Caixa P', 'Caixa M', 'Caixa G', 'Caixa GG')
-- passam: nenhuma começa ou termina com esses caracteres.
--
-- ── 2. shipping_boxes: medidas e peso com teto ─────────────────────────────
-- Achado: 'NaN' passava em `outer_* > 0`, porque para o Postgres NaN é MAIOR
-- que qualquer número. Com limite superior a comparação `NaN <= 300` é falsa
-- e o valor é recusado, como já acontecia com 0 e negativo.
--
-- Os tetos (300 cm por lado, 100 kg por volume) são barreira contra erro de
-- digitação — um zero a mais, vírgula no lugar errado —, NÃO regra de negócio.
-- Ficam bem acima da maior caixa em uso (GG: 40 × 50 × 60 cm, 30 kg). Se um dia
-- a empresa usar caixa maior, basta subir o número em outra migration.
--
-- Os CHECKs antigos (`outer_* > 0`) ficam: são redundantes com os novos, mas
-- mantê-los deixa o rollback desta migration ser só "remover o que entrou".
ALTER TABLE public.shipping_boxes
  DROP CONSTRAINT IF EXISTS shipping_boxes_code_format,
  DROP CONSTRAINT IF EXISTS shipping_boxes_name_format,
  DROP CONSTRAINT IF EXISTS shipping_boxes_outer_height_cm_range,
  DROP CONSTRAINT IF EXISTS shipping_boxes_outer_width_cm_range,
  DROP CONSTRAINT IF EXISTS shipping_boxes_outer_length_cm_range,
  DROP CONSTRAINT IF EXISTS shipping_boxes_max_weight_g_ceiling,
  ADD CONSTRAINT shipping_boxes_code_format
    CHECK (code = upper(btrim(code)) AND code ~ '^[A-Z0-9][A-Z0-9_-]{0,9}$'),
  ADD CONSTRAINT shipping_boxes_name_format
    CHECK (name = btrim(name, E' \t\n\r' || chr(160)) AND name <> '' AND char_length(name) <= 80),
  ADD CONSTRAINT shipping_boxes_outer_height_cm_range
    CHECK (outer_height_cm BETWEEN 0.01 AND 300),
  ADD CONSTRAINT shipping_boxes_outer_width_cm_range
    CHECK (outer_width_cm BETWEEN 0.01 AND 300),
  ADD CONSTRAINT shipping_boxes_outer_length_cm_range
    CHECK (outer_length_cm BETWEEN 0.01 AND 300),
  ADD CONSTRAINT shipping_boxes_max_weight_g_ceiling
    CHECK (max_weight_g <= 100000);

-- ── 3. freight_settings: faixas dos parâmetros ─────────────────────────────
-- Achado: divisor de cubagem 1 e 2147483647 eram aceitos. Um zero a mais
-- (60000 no lugar de 6000) derruba o peso cubado dos Correios em 10 vezes em
-- todos os orçamentos, sem erro nenhum.
--
-- Também são tetos contra erro de digitação, NÃO regra de negócio: os divisores
-- usados no mercado ficam entre 3333 (rodoviário) e 6000 (Correios), e a faixa
-- 1000 a 10000 deixa folga dos dois lados; folga interna acima de 60 dias úteis
-- é engano. `default_fill_factor` já tem faixa (0,50 a 1,00) desde a criação
-- da tabela — conferido em produção, constraint
-- freight_settings_default_fill_factor_check — e por isso não entra aqui.
ALTER TABLE public.freight_settings
  DROP CONSTRAINT IF EXISTS freight_settings_cubic_divisor_correios_range,
  DROP CONSTRAINT IF EXISTS freight_settings_cubic_divisor_rodoviario_range,
  DROP CONSTRAINT IF EXISTS freight_settings_internal_buffer_days_ceiling,
  ADD CONSTRAINT freight_settings_cubic_divisor_correios_range
    CHECK (cubic_divisor_correios BETWEEN 1000 AND 10000),
  ADD CONSTRAINT freight_settings_cubic_divisor_rodoviario_range
    CHECK (cubic_divisor_rodoviario BETWEEN 1000 AND 10000),
  ADD CONSTRAINT freight_settings_internal_buffer_days_ceiling
    CHECK (internal_buffer_days <= 60);

-- ── 4. Exclusão de caixa só lógica ─────────────────────────────────────────
-- Achado: o admin conseguia DELETE físico (linha some sem rastro), contra o
-- que a própria tabela declara ("exclusão aqui é lógica", coluna deleted_at).
-- Sai a policy de DELETE; o privilégio de DELETE sai no bloco 5. A aplicação
-- exclui e restaura por UPDATE de deleted_at, que continua permitido.
DROP POLICY IF EXISTS shipping_boxes_delete_admin ON public.shipping_boxes;

-- ── 5. Privilégios mínimos ─────────────────────────────────────────────────
-- Achado: as tabelas herdaram os privilégios padrão do schema — anon com
-- TRIGGER, REFERENCES e MAINTAIN; authenticated com esses três mais INSERT e
-- DELETE em freight_settings (onde não há policy para nenhum dos dois).
--
-- REVOKE ALL e GRANT de volta só do necessário, em vez de revogar privilégio
-- por privilégio: MAINTAIN só existe a partir do PostgreSQL 17 e citá-lo pelo
-- nome quebraria esta migration em versão anterior. service_role não é tocado.
-- PUBLIC entra no REVOKE por garantia: hoje não tem privilégio nenhum nas duas
-- tabelas (conferido em produção), e um GRANT a PUBLIC valeria também para anon.
REVOKE ALL ON public.shipping_boxes, public.freight_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.shipping_boxes TO authenticated;
GRANT SELECT, UPDATE ON public.freight_settings TO authenticated;

-- ── 6. Colunas que o cliente não pode forjar ───────────────────────────────
-- Achados: (a) freight_settings.updated_by ficava NULL, ou com o usuário
-- anterior, ou aceitava o id de outra pessoa — não dava para saber quem mexeu
-- em parâmetros que mudam o frete de todos os orçamentos; (b) o admin
-- conseguia trocar `id` e `created_at` de uma caixa, e criar caixa escolhendo
-- `id`, `created_at` e `updated_at`.
--
-- As funções seguem o que public.update_updated_at_column() tem em produção:
-- plpgsql, SECURITY INVOKER, search_path fixo e EXECUTE só para postgres e
-- service_role (trigger dispara sem o usuário ter EXECUTE na função). O
-- search_path aqui é `pg_catalog, pg_temp`: tudo o que as funções chamam fora
-- de pg_catalog está qualificado com schema.
--
-- Ordem de disparo: triggers BEFORE da mesma tabela rodam em ordem alfabética
-- de nome, então `guard_*` roda antes de `set_*_updated_at`. As duas ordens
-- dariam o mesmo resultado (as funções mexem em colunas diferentes e nenhuma
-- lê a coluna da outra); o nome só deixa o comportamento previsível. No INSERT
-- de caixa só o `guard_*` dispara: o `set_*_updated_at` é BEFORE UPDATE.
CREATE OR REPLACE FUNCTION public.guard_freight_settings_row()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.guard_freight_settings_row() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE TRIGGER guard_freight_settings_row
  BEFORE UPDATE ON public.freight_settings
  FOR EACH ROW EXECUTE FUNCTION public.guard_freight_settings_row();

CREATE OR REPLACE FUNCTION public.guard_shipping_boxes_row()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Caixa criada por usuário logado (a tela do admin): identificador e datas
    -- são do banco, não do cliente. Sem usuário (migration, service_role), vale
    -- o que foi enviado — é o que deixa o INSERT ... SELECT do backup devolver
    -- as caixas com o id e as datas originais.
    IF auth.uid() IS NOT NULL THEN
      NEW.id := gen_random_uuid();
      NEW.created_at := now();
      NEW.updated_at := now();
    END IF;
    RETURN NEW;
  END IF;
  NEW.id := OLD.id;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_shipping_boxes_row() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE TRIGGER guard_shipping_boxes_row
  BEFORE INSERT OR UPDATE ON public.shipping_boxes
  FOR EACH ROW EXECUTE FUNCTION public.guard_shipping_boxes_row();

COMMENT ON FUNCTION public.guard_freight_settings_row() IS
  'Trigger BEFORE UPDATE de freight_settings: mantém id e grava updated_by com auth.uid(), ignorando o valor enviado pelo cliente. Sem usuário autenticado (service_role), mantém o autor anterior. Não mexe em updated_by quando o UPDATE vem de outro trigger (pg_trigger_depth() > 1), para o ON DELETE SET NULL da FK com auth.users funcionar.';
COMMENT ON FUNCTION public.guard_shipping_boxes_row() IS
  'Trigger BEFORE INSERT OR UPDATE de shipping_boxes. No UPDATE mantém id e created_at, que não mudam depois que a caixa é criada. No INSERT feito por usuário logado gera id, created_at e updated_at no banco, ignorando o valor enviado pelo cliente; sem usuário (migration, service_role) mantém o que foi enviado.';

-- ── 7. Comentários que passam a dizer o que o sistema faz ──────────────────
-- Achado: o comentário de default_fill_factor dizia "usado quando a caixa não
-- tem o próprio", caso impossível porque shipping_boxes.fill_factor é NOT NULL.
-- O uso real é o da tela de cadastro de caixas: valor sugerido para caixa nova.
COMMENT ON COLUMN public.freight_settings.default_fill_factor IS
  'Fator de aproveitamento SUGERIDO ao cadastrar uma caixa nova (0,50 a 1,00). Padrão 0,90. Não entra no cálculo: o motor usa o fill_factor gravado em cada caixa.';
COMMENT ON COLUMN public.freight_settings.updated_by IS
  'Usuário que fez a última alteração. Preenchido pelo banco (trigger guard_freight_settings_row) com auth.uid(); o valor enviado pelo cliente é ignorado. Fica NULL quando esse usuário é apagado (ON DELETE SET NULL).';
