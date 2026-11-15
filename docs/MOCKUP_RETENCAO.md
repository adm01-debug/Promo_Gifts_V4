# Mockup — Retenção e Lixeira (roteiro)

**Data:** 09/10/2026 · **Módulo:** Mockup (`/mockup-generator`, `/mockup-historico`)
**Base:** decisão **Q7** do dono (Joaquim), registrada em `docs/PLANO_MOCKUP_50_ETAPAS_2026-10-08.md` (etapas 6 e 10).
**Fronteira:** este documento descreve **quem limpa, quando e como restaurar**. Não propõe mudança
de UI nem de schema executado — a fábrica só **propõe** SQL; quem aplica é o Joaquim (REGRA #8).

## Como ler

- `[IMPLEMENTADO]` — existe hoje no código; a evidência é `caminho:linha`.
- `[PLANEJADO]` — decidido (Q7) mas ainda **não** existe; nada abaixo de `[PLANEJADO]` está no ar.
- Toda linha deste documento foi conferida no código desta branch (base `main` em `a9c8bd9c4`,
  13/10/2026) — os `caminho:linha` abaixo foram reconferidos nessa base.

---

## 1. Prazos (a política)

| Item | Prazo | Estado |
|---|---|---|
| Mockup excluído fica recuperável (lixeira) | **30 dias** | `[PLANEJADO]` |
| Rascunho não salvo (não promovido a histórico) é limpo | **7 dias** | `[PLANEJADO]` |
| Depois do prazo: apaga o registro **e** os arquivos do storage | definitivo | `[PLANEJADO]` |

Os dois prazos vêm da decisão **Q7** ("lixeira" = soft delete, remoção do storage só ao expirar).
Hoje **nenhum** dos dois está implementado (ver §3).

---

## 2. Estado atual — o que JÁ está no ar

### 2.1 A exclusão de mockup é DEFINITIVA hoje `[IMPLEMENTADO]`

`deleteMockupFromDb(id, userId?)` (`src/hooks/mockup/mockupGenerationService.ts:483-526`) faz
`DELETE` na linha de `generated_mockups` e, em seguida, remove do bucket `mockup-assets` o logo e
o PNG composto associados (`mockup_url`, `logo_url`). A linha, uma vez excluída, não volta.

- A tabela `generated_mockups` **não tem** coluna `deleted_at`/`is_deleted`
  (`src/integrations/supabase/types.ts:7946-8391` — o bloco inteiro da tabela).
- **Não existe** cron nem função de expurgo de mockup (ver §2.4 para o que existe em outras entidades).
- Rascunhos vivem em `mockup_drafts` (`src/integrations/supabase/types.ts:13868-13915`), gravados
  por `src/hooks/mockup/useMockupDraft.ts` — **sem TTL**.

### 2.2 Já existe confirmação antes de excluir `[IMPLEMENTADO]`

- `DeleteMockupDialog` (`src/pages/mockups/mockup-generator/MockupDialogs.tsx:58-72`) mostra
  "Excluir mockup?" / **"Esta ação não pode ser desfeita."** — o texto é honesto justamente
  porque hoje não há lixeira.
- A página de histórico confirma antes de chamar o serviço
  (`src/pages/mockups/MockupHistoryPage.tsx:115-134`: `handleConfirmDelete` → `deleteMockupFromDb`).

### 2.3 Onde os arquivos vivem `[IMPLEMENTADO]`

- Bucket **`mockup-assets`**, com pasta por vendedor já em uso:
  - logos: `{userId}/logos/{ts}-{nome}.{ext}` (`src/lib/mockup-storage.ts:36`);
  - PNG composto: `{userId}/mockups/{ts}-{uuid}.png` (`supabase/functions/generate-mockup/index.ts:506`).

### 2.4 O padrão de lixeira que JÁ existe no sistema (de OUTRAS entidades) `[IMPLEMENTADO]`

Serve de referência de implementação (não é do Mockup):

- **Favoritos:** tabela `favorite_items_trash` com TTL 30 dias, função
  `public.purge_favorite_trash_old()` (`docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql:65573`) e job
  de cron `purge-favorite-trash` executando todo dia às 04:00 UTC
  (`supabase/cron/cron-config.sql:67-77`). Há restauração real via RPC
  `restore_favorite_from_trash` (`src/hooks/favorites/useFavoriteLists.ts:368`) e tela de lixeira
  `src/components/favorites/FavoritesTrashView.tsx`.
- **Coleções:** `collection_items_trash` com o mesmo desenho.

Ou seja: o mecanismo "soft delete + TTL + purge por cron + restore por RPC" já roda no repo; o
Mockup ainda não o usa.

---

## 3. O que falta implementar `[PLANEJADO]`

> Tudo nesta seção é **proposta**. Nada foi aplicado no banco (a fábrica não aplica schema — REGRA #8).

### 3.1 Soft delete e a lixeira (etapa 6 e 10 do plano) `[PLANEJADO]`

- **SQL proposto (workersql):** adicionar `deleted_at timestamptz NULL` em `public.generated_mockups`
  + índice parcial em `deleted_at` (e os índices `(client_id, created_at desc)` /
  `(user_id, created_at desc)` já previstos na etapa 6).
- **Código (hugo):** a **função única** `deleteMockupFromDb` passa a fazer `UPDATE ... SET deleted_at = now()`
  em vez de `DELETE`, e continua sendo o único caminho de exclusão usado por **todas** as telas
  (gerador e `/mockup-historico`).
- **Listagens** (histórico do gerador e `/mockup-historico`) passam a filtrar `deleted_at IS NULL`.
- Os arquivos do storage **não** são removidos na exclusão — só ao expirar o prazo (§3.2).
- **Assets compartilhados (etapa 64):** um logo reutilizado por outra revisão não pode ser apagado;
  o expurgo só remove o que for órfão.

### 3.2 Quem executa a limpeza — função de purge proposta em SQL `[PLANEJADO]`

**Quem limpa:** um **job de cron do Postgres** (`pg_cron`), do mesmo jeito que o
`purge-favorite-trash`, chamando uma **função SQL `SECURITY DEFINER`** proposta. Modelo, espelhando
`purge_favorite_trash_old`:

```sql
-- PROPOSTA (não aplicar sem aprovação do Joaquim). Etapa a par da 6/10.
-- Rollback: DROP FUNCTION public.purge_mockup_trash_old();
CREATE OR REPLACE FUNCTION public.purge_mockup_trash_old() RETURNS integer
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.generated_mockups
     SET mockup_url = NULL, thumbnail_url = NULL, layout_url = NULL, logo_url = NULL
   WHERE deleted_at < now() - interval '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;
```

O job de cron entra em `supabase/cron/cron-config.sql` no mesmo formato do JOB 4
(`supabase/cron/cron-config.sql:67-77`):

```sql
-- JOB 6 (DRAFT — NÃO APLICAR SEM APROVAÇÃO): purga da lixeira de mockup (04:00 UTC)
SELECT cron.schedule(
  'purge-mockup-trash',
  '0 4 * * *',
  $$ SELECT public.purge_mockup_trash_old(); $$
);
-- Rollback: SELECT cron.unschedule('purge-mockup-trash');
```

**Arquivos do storage:** SQL **não** apaga os objetos do bucket pela API do Supabase (remover a
linha em `storage.objects` deixa blob órfão). A remoção dos arquivos precisa de uma **Edge Function**
de limpeza, no padrão de `supabase/functions/cleanup-notifications/index.ts` (autenticada por
`authorizeCron`/`x-cron-secret`): ela lista as linhas com `deleted_at` vencido e chama
`storage.from('mockup-assets').remove([...])` — exatamente o que `deleteMockupFromDb` já faz hoje
para um mockup por vez (`mockupGenerationService.ts:518-525`).

**Rascunhos (7 dias):** o mesmo desenho, com uma função proposta `purge_mockup_drafts_old()` e um
job `purge-mockup-drafts`, limpando `public.mockup_drafts` onde `updated_at < now() - interval '7 days'`
(um rascunho "não salvo" é o que nunca virou linha em `generated_mockups`).

> Pendência de decisão para o Joaquim: cadência dos jobs (o modelo acima usa diária às 04:00 UTC,
> como o purge de favoritos) e se o prazo de 7 dias conta de `updated_at` do rascunho.

### 3.3 Como restaurar `[PLANEJADO]`

Restaurar = desfazer o soft delete dentro dos 30 dias. Proposta, espelhando
`restore_favorite_from_trash`:

```sql
-- PROPOSTA (RPC). Rollback: DROP FUNCTION public.restore_mockup_from_trash(uuid);
CREATE OR REPLACE FUNCTION public.restore_mockup_from_trash(_id uuid) RETURNS boolean
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.generated_mockups
     SET deleted_at = NULL
   WHERE id = _id
     AND user_id = auth.uid()
     AND deleted_at IS NOT NULL
     AND deleted_at > now() - interval '30 days';
  RETURN FOUND;
END $$;
```

- **Não há UI de lixeira/restauração** para mockup hoje. A tela planejada é uma aba "Lixeira" no
  histórico unificado (etapa 24 do plano), no molde de `FavoritesTrashView.tsx`.
- Sem o `deleted_at IS NULL` nas listagens (§3.1), o item restaurado reaparece no histórico.

### 3.4 Mockup anexado a orçamento **não** é excluído (Q21) `[PLANEJADO]`

- A coluna existe: `quote_items.mockup_urls` (`src/integrations/supabase/types.ts:34791`) e é
  transportada no payload do orçamento (`src/hooks/quotes/quoteHelpers.ts:234`). Hoje **nenhum**
  fluxo do módulo Mockup a preenche — quem grava arte no orçamento é o Kit Builder, em
  `artwork_urls` (`src/pages/kit-builder/useKitBuilderQuote.ts:250,284`).
- **Regra decidida (Q21):** o orçamento emitido não pode perder a arte. Logo `deleteMockupFromDb`,
  antes de marcar `deleted_at`, precisa checar se algum `quote_items` referencia o mockup e, se
  referenciar, **bloquear** a exclusão (com aviso ao usuário), em vez de excluir.
- Depende da etapa 38 (ação "Anexar mockups" no item do orçamento), que é quem passa a preencher
  `quote_items.mockup_urls` a partir do Mockup. Enquanto a 38 não existir, não há referência a
  checar e a guarda da 39 fica inerte.

---

## 4. Fluxo alvo (resumo)

1. Vendedor exclui um mockup → `deleteMockupFromDb` marca `deleted_at` (**se não estiver anexado a
   orçamento**) e o item sai das listagens; arquivos ficam no bucket. `[PLANEJADO]`
2. Dentro de 30 dias → aparece na aba "Lixeira" e pode ser restaurado (`restore_mockup_from_trash`).
   `[PLANEJADO]`
3. Passados 30 dias → `purge-mockup-trash` (cron) zera as URLs na linha; a Edge Function de limpeza
   remove os arquivos do bucket. `[PLANEJADO]`
4. Rascunho que nunca virou histórico → `purge-mockup-drafts` limpa `mockup_drafts` após 7 dias.
   `[PLANEJADO]`

---

## 5. Mapa com as etapas do plano

| Etapa | Descrição | Onde |
|---|---|---|
| 6 | SQL: `deleted_at` em `generated_mockups` + índices | `PLANO_MOCKUP_50_ETAPAS_2026-10-08.md` |
| 10 | `deleteMockupFromDb` = soft delete, função única | idem |
| 38 | Ação "Anexar mockups" → preenche `quote_items.mockup_urls` | idem (E) |
| 39 | Bloquear exclusão de mockup anexado | idem (E) |
| 64 | Exclusão segura de assets compartilhados (só órfãos) | `..._ADENDO_CODEX.md` |
| 82 | Smoke E2E real: … → link assinado → **lixeira** | `..._ADENDO_CODEX.md` |
| 84 | Backfill de URLs → caminhos de storage | `..._ADENDO_CODEX.md` |

---

## 6. Referências conferidas

- Decisão Q7: `docs/PLANO_MOCKUP_50_ETAPAS_2026-10-08.md` (etapas 6, 10, 38, 39).
- Lixeira parcial Q7 / assets compartilhados: `docs/PLANO_MOCKUP_50_ETAPAS_ADENDO_CODEX.md` (etapas 64, 82, 84).
- Padrão de purge por cron: `supabase/cron/cron-config.sql:67-77`; função `purge_favorite_trash_old`
  em `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql:65573`.
- Padrão de Edge Function de limpeza: `supabase/functions/cleanup-notifications/index.ts`.
- Código do Mockup: `src/hooks/mockup/mockupGenerationService.ts:483-526`,
  `src/hooks/mockup/useMockupDraft.ts`, `src/pages/mockups/MockupHistoryPage.tsx:115-134`,
  `src/pages/mockups/mockup-generator/MockupDialogs.tsx:58-72`, `src/lib/mockup-storage.ts:36`,
  `supabase/functions/generate-mockup/index.ts:506`.
