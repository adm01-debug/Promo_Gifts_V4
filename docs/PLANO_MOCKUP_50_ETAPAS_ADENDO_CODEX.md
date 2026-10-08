# Plano Mockup 50 etapas — Adendo Codex (etapas 16 e 69): snapshot e revisões

> Status: **PROPOSTA — nada aplicado.** Schema é do Joaquim (REGRA #1/#8). Não existe migration
> no repositório para isto; o SQL abaixo só pode ser aplicado por ele, primeiro num clone.

## PROPOSTA DE MIGRATION — aguarda aprovação do Joaquim (REGRA #1/#8)

**Problema:** `generated_mockups` guarda só `area_config` e metadados soltos. PNG e ficha
técnica não nascem de uma mesma foto imutável do estado; regerar não deixa rastro da revisão
anterior; editar não marca o resultado antigo como desatualizado.

Regra de negócio coberta:
- cada geração grava um `snapshot` imutável (o PNG e a ficha leem dele);
- regerar = INSERT de nova linha (`revision = pai + 1`, `parent_mockup_id` = anterior);
- editar = marcar a revisão anterior `is_stale = true`.

### SQL

```sql
-- <timestamp>_generated_mockups_snapshot_revision.sql   (timestamp definido pelo Joaquim)
-- Rollback:
--   DROP TRIGGER IF EXISTS trg_generated_mockups_snapshot_guard ON public.generated_mockups;
--   DROP FUNCTION IF EXISTS public.fn_generated_mockups_snapshot_guard();
--   DROP INDEX IF EXISTS public.idx_generated_mockups_parent_mockup_id;
--   ALTER TABLE public.generated_mockups
--     DROP CONSTRAINT IF EXISTS generated_mockups_snapshot_version_chk,
--     DROP CONSTRAINT IF EXISTS generated_mockups_revision_chk,
--     DROP CONSTRAINT IF EXISTS generated_mockups_parent_not_self_chk,
--     DROP COLUMN IF EXISTS parent_mockup_id,
--     DROP COLUMN IF EXISTS is_stale,
--     DROP COLUMN IF EXISTS revision,
--     DROP COLUMN IF EXISTS snapshot_version,
--     DROP COLUMN IF EXISTS snapshot;
--   (as colunas são aditivas e as policies/GRANTs da tabela não são tocados: nada a restaurar.
--    Atenção: o DROP COLUMN descarta os snapshots gravados — exportar antes se já houver uso.)

BEGIN;

ALTER TABLE public.generated_mockups
  ADD COLUMN IF NOT EXISTS snapshot          jsonb,
  ADD COLUMN IF NOT EXISTS snapshot_version  integer,
  ADD COLUMN IF NOT EXISTS revision          integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_mockup_id  uuid
    REFERENCES public.generated_mockups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_stale          boolean NOT NULL DEFAULT false;

-- Linhas antigas ficam com snapshot NULL (sem backfill); linha nova com snapshot exige versão.
ALTER TABLE public.generated_mockups
  ADD CONSTRAINT generated_mockups_snapshot_version_chk
    CHECK (snapshot IS NULL OR (snapshot_version IS NOT NULL AND snapshot_version >= 1)),
  ADD CONSTRAINT generated_mockups_revision_chk
    CHECK (revision >= 1),
  ADD CONSTRAINT generated_mockups_parent_not_self_chk
    CHECK (parent_mockup_id IS NULL OR parent_mockup_id <> id);

-- FK sem índice vira seq scan em cascata/consulta de cadeia (padrão da casa: migration 037).
CREATE INDEX IF NOT EXISTS idx_generated_mockups_parent_mockup_id
  ON public.generated_mockups (parent_mockup_id);

-- Guarda: snapshot imutável depois de gravado + pai tem de ser do mesmo dono.
-- SECURITY INVOKER de propósito: o SELECT no pai passa pela RLS de quem escreve; pai que o
-- usuário não enxerga = "não encontrado" (não vaza existência, não permite ligar a mockup alheio).
CREATE OR REPLACE FUNCTION public.fn_generated_mockups_snapshot_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.snapshot IS NOT NULL
     AND (NEW.snapshot IS DISTINCT FROM OLD.snapshot
          OR NEW.snapshot_version IS DISTINCT FROM OLD.snapshot_version) THEN
    RAISE EXCEPTION 'snapshot de generated_mockups % é imutável; regere para criar nova revisão', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.parent_mockup_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.parent_mockup_id IS DISTINCT FROM OLD.parent_mockup_id) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.generated_mockups p
      WHERE p.id = NEW.parent_mockup_id AND p.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'parent_mockup_id inexistente ou de outro usuário'
        USING ERRCODE = 'foreign_key_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generated_mockups_snapshot_guard ON public.generated_mockups;
CREATE TRIGGER trg_generated_mockups_snapshot_guard
  BEFORE INSERT OR UPDATE ON public.generated_mockups
  FOR EACH ROW EXECUTE FUNCTION public.fn_generated_mockups_snapshot_guard();

COMMIT;
```

RLS/GRANT: **nenhuma mudança.** As policies existentes (`gm_select_own_or_admin`,
`gm_insert_self`, `gm_update_own_or_admin` com USING e WITH CHECK, `gm_delete_own_or_admin`)
cobrem as colunas novas, pois são por linha. Nenhum GRANT novo; `anon` continua sem acesso.
Marcar `is_stale` usa o UPDATE do próprio dono, já permitido.

### Contrato do JSON `snapshot` (`snapshot_version = 1`)

Escrito uma vez, na geração; nunca editado (trigger acima). Chaves em snake_case:

```jsonc
{
  "identity":  { "mockup_id": "uuid", "revision": 1, "parent_mockup_id": "uuid|null",
                 "job_id": "uuid" },
  "product":   { "product_id": "uuid", "sku": "text", "name": "text",
                 "variant_id": "uuid|null", "variant_label": "text|null",
                 "original_photo_url": "text" },          // foto original usada como base
  "brand":     { "logo_id": "uuid|null", "logo_url": "text",
                 "brand_version": "text|int" },           // versão da marca aplicada
  "colors":    { "product_color_name": "text", "product_color_hex": "#RRGGBB",
                 "logo_colors": ["#RRGGBB"] },            // cores escolhidas
  "areas": [ { "area_id": "text (estável, ex.: id da área do produto, não o índice)",
               "area_name": "text", "technique_id": "uuid", "technique_name": "text",
               "geometry": { "x": 0, "y": 0, "width_cm": 0, "height_cm": 0,
                             "rotation": 0, "scale": 1 } } ],  // geometria por área
  "client":    { "client_id": "uuid|null", "client_name": "text|null" },
  "created_at": "ISO-8601 UTC"                              // data da geração
}
```

Regras: `areas[].area_id` é o identificador estável da área (sobrevive a reordenação e a regeração);
mudança de forma do JSON incrementa `snapshot_version` (leitores tratam versões desconhecidas
como erro explícito, não como vazio). Colunas legadas (`area_config`, `logo_*`, `position_*`)
permanecem preenchidas durante a transição (expand/contract): nada existente quebra.

### Prova proposta (rodar **só no clone**, papel `authenticated` — nunca service_role)

Teste a nascer em `tests/sql/generated_mockups_snapshot_revision.test.sql` (ou `tests/rls/`):

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"<UID_A>","role":"authenticated"}', true);

-- revisão 1 (usa job_id/user_id de fixture do clone)
INSERT INTO generated_mockups (id, job_id, user_id, product_name, technique_name, product_color_hex,
  area_name, area_config, mockup_url, logo_url, ai_model_used, snapshot, snapshot_version)
VALUES ('00000000-0000-0000-0000-0000000000a1','<JOB>','<UID_A>','P','T','#FFFFFF','Frente','{}',
  'u','l','m','{"identity":{"revision":1}}',1);

-- revisão 2 apontando para a 1
INSERT INTO generated_mockups (id, job_id, user_id, product_name, technique_name, product_color_hex,
  area_name, area_config, mockup_url, logo_url, ai_model_used, snapshot, snapshot_version,
  revision, parent_mockup_id)
VALUES ('00000000-0000-0000-0000-0000000000a2','<JOB>','<UID_A>','P','T','#FFFFFF','Frente','{}',
  'u','l','m','{"identity":{"revision":2}}',1, 2,'00000000-0000-0000-0000-0000000000a1');

-- marcar a 1 como desatualizada
UPDATE generated_mockups SET is_stale = true WHERE id = '00000000-0000-0000-0000-0000000000a1';

-- esperado: a1 stale=true/revision=1; a2 stale=false/revision=2/parent=a1
SELECT id, revision, is_stale, parent_mockup_id FROM generated_mockups ORDER BY revision;

-- negativos (cada um deve falhar, em SAVEPOINT próprio):
--  a) UPDATE ... SET snapshot = '{}' WHERE id = a1           -> check_violation (imutável)
--  b) INSERT com parent_mockup_id = a mockup de outro usuário -> foreign_key_violation
--  c) INSERT com revision = 0                                 -> generated_mockups_revision_chk

-- consultas existentes (sem as colunas novas) seguem válidas:
SELECT id, mockup_url, area_config FROM generated_mockups WHERE user_id = '<UID_A>' ORDER BY created_at DESC;
ROLLBACK;
```

Rodar também o rollback no clone e confirmar que as colunas somem e a consulta legada continua igual.

### Risco e volta
- `ADD COLUMN ... NOT NULL DEFAULT` constante: em PG17 não reescreve a tabela; lock curto
  (ACCESS EXCLUSIVE breve) — aplicar fora de pico mesmo assim.
- Código que insere com `Insert` do `types.ts` continua válido (colunas novas têm default/nullable);
  `types.ts` deve ser regenerado pelo fluxo da casa depois da aplicação (fora deste cartão).
- Trigger novo roda por linha em INSERT/UPDATE: custo de um SELECT por PK só quando há pai.
- Volta: bloco `-- Rollback:` acima (inverso executável; policies/GRANTs não foram tocados).
