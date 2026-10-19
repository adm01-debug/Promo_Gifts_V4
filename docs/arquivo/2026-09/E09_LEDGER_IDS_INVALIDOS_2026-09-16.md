# E09 — 4 IDs de ledger não-canônicos: investigação e proposta de remediação (2026-09-16)

Etapa `[REQUER-PO]` (investigação `[DB-RO]`, decisão final PO) de `docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md`. Projeto canônico: `doufsxqlfjyuvxuezpln`.

## Resumo

4 linhas em `supabase_migrations.schema_migrations` têm `version` fora do formato canônico `YYYYMMDDHHmmss` (14 dígitos). Investigação (só leitura, `pg_catalog`/`execute_sql`) conclui: **nenhuma representa drift ou perda de dado** — as 4 se dividem em 2 padrões bem distintos, com remediações diferentes.

| # | `version` | `name` | Padrão | Arquivo em disco |
|---|---|---|---|---|
| 1 | `2026062311292414001` | `add_full_path_readable_propagation_triggers` | ID malformado (19 dígitos) | ✅ sim |
| 2 | `20260623_bugalert1` | `fix_v_system_alerts_cron_threshold_bugalert1` | **Stub inválido, superado** | ❌ não |
| 3 | `20260623_create_process_notifications_queue_rpcs` | `create_process_notifications_queue_rpcs_20260623` | **Stub inválido, superado** | ❌ não |
| 4 | `20260623_fix_google_provider_secret_name` | `fix: ai_providers.google GOOGLE_API_KEY→GEMINI_API_KEY name mismatch` | **Real, único, sem arquivo** | ❌ não |

## Achado central: #2 e #3 são placeholders que nunca foram SQL executável

O conteúdo de `statements` das entradas #2 e #3 contém reticências **literais** dentro da sintaxe SQL — não é possível executar:

```sql
-- #2, version 20260623_bugalert1 (statements[0], 49 caracteres):
CREATE OR REPLACE VIEW v_system_alerts AS ...

-- #3, version 20260623_create_process_notifications_queue_rpcs (statements[0], parte):
CREATE OR REPLACE FUNCTION public.process_notifications_queue(p_limit integer DEFAULT 100)
RETURNS TABLE(...) LANGUAGE sql SECURITY DEFINER SET search_path=public
```

`RETURNS TABLE(...)` e `VIEW ... AS ...` com reticências literais são erro de sintaxe — essas linhas **nunca rodaram como estão registradas**. Tudo indica inserção manual de um placeholder/TODO na tabela do ledger (não via `supabase db push`/`apply_migration`), nunca substituído pelo SQL real.

**As duas foram superadas por entradas canônicas completas, já aplicadas e com arquivo correspondente no disco:**

| Stub inválido | Substituída por (canônica) | `statements` | Arquivo |
|---|---|---|---|
| `20260623_bugalert1` (49 car.) | `20260623182623` — `fix_v_system_alerts_cron_threshold_bugalert1_20260623` | 4.477 car. | `supabase/migrations/20260623182623_fix_v_system_alerts_cron_threshold_bugalert1_20260623.sql` (88 linhas) |
| `20260623_create_process_notifications_queue_rpcs` (315 car.) | `20260623201801` — `create_process_notifications_queue_rpcs_20260623` | 2.846 car. | `supabase/migrations/20260623201801_create_process_notifications_queue_rpcs_20260623.sql` (82 linhas) |

Confirmado por live-check: `public.v_system_alerts`, `public.process_notifications_queue()` e `public.confirm_notifications_dispatched()` existem e correspondem ao conteúdo das versões **canônicas**, não aos stubs. As duas entradas stub são ruído puro no ledger — nunca deveriam ter sido marcadas `applied`.

## Achado #4: `20260623_fix_google_provider_secret_name` — real e correta, só sem arquivo

```sql
UPDATE ai_providers SET secret_name = 'GEMINI_API_KEY', updated_at = now()
WHERE slug = 'google' AND secret_name = 'GOOGLE_API_KEY'
```

135 caracteres, SQL válido e completo — sem reticências, sem truncamento. Live-check confirma: `ai_providers` com `slug='google'` tem hoje `secret_name = 'GEMINI_API_KEY'`. **Foi realmente aplicada** (provavelmente via `execute_sql`/dashboard direto, não via arquivo de migration commitado — daí o ID não-canônico e ausência de arquivo). Diferente de #2/#3, não há entrada canônica duplicando/superando esta — é única.

## Achado #1: `2026062311292414001` — malformado mas com arquivo

19 dígitos em vez de 14 (`20260623112924` + sufixo espúrio `14001`). Tem arquivo em disco com nome idêntico (`2026062311292414001_add_full_path_readable_propagation_triggers.sql`) e as triggers/função descritas existem e batem com o esperado. Não está na baseline `MANIFESTO_MIGRATIONS_FORWARD_ONLY_2026-08-26.json` (confirmado — 0 ocorrências), mas isso é esperado: essa baseline cobre só o corte de nomes de **arquivo**, e o defeito aqui é no `version` do **ledger**, eixo ortogonal ao que `check-migration-filename-contract.mjs` audita (só lê o diretório `supabase/migrations/`, nunca a tabela do ledger). Corrigir o `version` para os 14 dígitos corretos (`20260623112924`) exigiria `migration repair` (remove versão errada + reaplica com a certa) — risco desnecessário para um id que já é internamente consistente (arquivo ↔ ledger têm o mesmo nome, só "errado" de formato). **Proposta: não mexer** — documentar como aceito/grandfathered, sem ação.

## Proposta de remediação (pacote `[REQUER-PO]`, nada aplicado ainda)

**Ação 1 — remover os 2 stubs inválidos do ledger** (metadata-only, `migration repair` não executa SQL):

```bash
supabase migration repair --status reverted 20260623_bugalert1 20260623_create_process_notifications_queue_rpcs --linked
```

Efeito: remove as 2 linhas do ledger. Sem efeito no schema/dados — as views/funções reais continuam intactas sob as versões canônicas `20260623182623`/`20260623201801`, que permanecem `applied`.

**Ação 2 — backfill do arquivo de migration para #4** (novo arquivo, canônico, idempotente — o `UPDATE` já é no-op hoje pois nenhuma linha casa mais com `secret_name = 'GOOGLE_API_KEY'`):

Novo arquivo `supabase/migrations/20260916181609_backfill_fix_google_provider_secret_name_20260623.sql`:

```sql
-- Backfill de docs/E09_LEDGER_IDS_INVALIDOS_2026-09-16.md.
-- Reproduz, com nome canônico, o UPDATE já aplicado em produção sob o
-- ledger version não-canônico 20260623_fix_google_provider_secret_name.
-- Idempotente: WHERE não casa mais nenhuma linha (já migrada).
UPDATE ai_providers SET secret_name = 'GEMINI_API_KEY', updated_at = now()
WHERE slug = 'google' AND secret_name = 'GOOGLE_API_KEY';
```

**Ação 3 — marcar o backfill como já aplicado no ledger** (evita que um `db push` futuro tente rodá-lo de verdade — mesmo sendo no-op seguro, seguimos o padrão do E08 de nunca depender de reexecução silenciosa):

```bash
supabase migration repair --status applied 20260916181609 --linked
```

A entrada não-canônica original (`20260623_fix_google_provider_secret_name`) **permanece no ledger sem alteração** — não é renomeada nem removida, só passa a ter um arquivo-espelho canônico documentando o mesmo efeito.

**Teste de reversão:** `supabase migration repair --status reverted 20260916181609 --linked` desfaz a Ação 3; a Ação 1 é reversível reinserindo manualmente as 2 linhas stub (não recomendado — não há motivo para trazê-las de volta); a Ação 2 é reversível com `git rm` do arquivo novo, sem qualquer efeito em produção.

## Checklist de conclusão (E09)

- [x] 4 IDs não-canônicos identificados e investigados (`pg_catalog`/`execute_sql`, só leitura)
- [x] Causa raiz determinada por entrada (2 stubs inválidos nunca executados; 1 real sem arquivo; 1 malformado mas consistente)
- [x] Todos os 7 objetos descritos confirmados vivos e corretos no banco (sem drift)
- [x] Pacote de remediação (3 ações, SQL exato, efeito esperado, teste de reversão) pronto para aprovação
- [ ] **Aprovação do PO** — pendente
- [ ] Ações 1–3 aplicadas — pendente de aprovação

**E09: investigação concluída em 2026-09-16. Remediação empacotada, aguardando aprovação do PO (ver pacote consolidado).**
