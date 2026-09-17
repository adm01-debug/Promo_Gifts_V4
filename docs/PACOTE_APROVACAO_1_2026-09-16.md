# Pacote de Aprovação #1 — Segurança + Ledger (2026-09-16)

`[REQUER-PO]`. Nenhuma ação abaixo foi executada. Aprovação pode ser dada por item, por grupo, ou para o pacote inteiro ("aprovado").

Três ações independentes, sem dependência entre si — podem ser aprovadas em qualquer combinação.

---

## Ação 1 — REVOKE real: `zapp_catalog_stats()` de `authenticated`

**Tipo:** execução real de DDL (não é `migration repair` — é `supabase db push`/aplicação real da migration já existente no repo).

**Origem:** E07 (achado de segurança confirmado ao vivo, ver plano §E07). Migration `supabase/migrations/20260915113458_zapp_catalog_stats_revoke_authenticated.sql` já existe no repositório desde 2026-09-15, mas **nunca foi aplicada** ao banco canônico — confirmado agora: `version = '20260915113458'` ausente em `supabase_migrations.schema_migrations`, e ao vivo `authenticated` ainda tem `EXECUTE` em `public.zapp_catalog_stats()`.

**SQL exato (já no arquivo, self-checking com pré/pós-condição):**
```sql
REVOKE EXECUTE ON FUNCTION public.zapp_catalog_stats() FROM authenticated;

COMMENT ON FUNCTION public.zapp_catalog_stats() IS
  'KPIs agregados do catalogo (...) Acesso restrito a service_role: NAO conceder a
   authenticated nem a anon. ... EXECUTE de authenticated revogado em 20260915113458
   apos finding do lint 0029.';
```

**Efeito esperado:** `authenticated` perde `EXECUTE`; `service_role` mantém (verificado por pós-condição no próprio arquivo, que faz `RAISE EXCEPTION` se a pós-condição falhar). Sem consumidor conhecido afetado — 0 call sites em `src/`/`supabase/functions/`, 0 chamadas em `edge_logs` no período investigado (ver cabeçalho do arquivo).

**Teste de reversão:** `GRANT EXECUTE ON FUNCTION public.zapp_catalog_stats() TO authenticated;` (reverte em 1 statement).

**Nota de correção:** o achado irmão (`fn_super_filtro_product_ids` supostamente ainda concedendo `EXECUTE` a `PUBLIC`) foi **verificado e refutado** nesta rodada — a função já teve `PUBLIC` revogado em `20260627112025` e `anon` revogado em `20260716000046`; ACL ao vivo (`aclexplode`) confirma só `postgres/authenticated/service_role`. Não entra neste pacote. Detalhe em `docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` (bloco "⚠️ Correção do achado #1").

---

## Ação 2 — E08 lote 2: `migration repair --status applied` (179 versões)

**Tipo:** metadata-only — `migration repair` não executa SQL, só insere linhas no ledger.

**Origem:** `docs/E08_LOTE2_CANDIDATOS_2026-09-16.md`. 179 versões confirmadas `aplicada`/`aplicada-sem-ledger` ao vivo no `pg_catalog`, sem colisão de `version` com o lote 1 (já aplicado) nem entre si (`already_in_ledger = 0` para as 179).

**Comando exato:** ver `docs/E08_LOTE2_CANDIDATOS_2026-09-16.md` §"Comando de repair proposto" (lista completa das 179 versões).

**Efeito esperado:** ledger passa a refletir a realidade do banco para essas 179 migrations; `supabase migration list` deixa de mentir sobre elas. Zero mudança de schema/dado.

**Fora de escopo neste pacote:** 30 arquivos em 10 grupos de `version` colidida (aguardam E10).

**Teste de reversão:** `supabase migration repair --status reverted <versão>` por versão, se necessário.

---

## Ação 3 — E09: 4 IDs de ledger não-canônicos (3 sub-ações)

**Origem:** `docs/E09_LEDGER_IDS_INVALIDOS_2026-09-16.md`. Investigação conclui: nenhuma representa drift ou perda de dado.

**3a. Remover 2 stubs inválidos do ledger** (nunca foram SQL executável — reticências literais, `CREATE ... AS ...` sem corpo):
```bash
supabase migration repair --status reverted 20260623_bugalert1 20260623_create_process_notifications_queue_rpcs --linked
```
Efeito: remove 2 linhas-ruído do ledger. As views/funções reais continuam intactas sob as versões canônicas já aplicadas (`20260623182623`, `20260623201801`).

**3b. Criar arquivo-espelho canônico para achado real sem arquivo** (`20260623_fix_google_provider_secret_name`, UPDATE real já aplicado em produção, só sem migration commitada):

Novo arquivo `supabase/migrations/20260916181609_backfill_fix_google_provider_secret_name_20260623.sql`:
```sql
UPDATE ai_providers SET secret_name = 'GEMINI_API_KEY', updated_at = now()
WHERE slug = 'google' AND secret_name = 'GOOGLE_API_KEY';
```
Idempotente — `WHERE` já não casa nenhuma linha hoje (efeito real já ocorreu em 2026-06-23).

**3c. Marcar o backfill (3b) como já aplicado no ledger:**
```bash
supabase migration repair --status applied 20260916181609 --linked
```

**Nota:** a entrada não-canônica original (`20260623_fix_google_provider_secret_name`) permanece no ledger sem alteração.

**Não incluído neste pacote:** o ID malformado `2026062311292414001` (19 dígitos) — proposta é não mexer, documentar como aceito/grandfathered (sem ação necessária, ver E09 §achado #1).

**Teste de reversão:** 3a — reinserir manualmente as 2 linhas stub (não recomendado); 3b — `git rm` do arquivo novo (zero efeito em produção); 3c — `supabase migration repair --status reverted 20260916181609 --linked`.

---

## Ação 4 — Novo achado ao vivo: 2ª DDL out-of-band na mesma função (hoje, 2026-09-16)

**Tipo:** apenas arquivo-espelho no repo (zero efeito em produção — a DDL já está aplicada e já está no ledger). Descoberto durante a verificação independente da E48 desta sessão, não pela própria E48.

**O que aconteceu:** `public.zapp_catalog_stats()` — a mesma função da Ação 1 — recebeu uma
2ª DDL fora do fluxo de migration, **hoje**, sem relação com o achado de segurança
acima. Confirmado ao vivo (`supabase_migrations.schema_migrations`):

| Version | Name | No repo? | Aplicada (ledger)? |
|---|---|---|---|
| `20260912205759` | `catalog_e24_zapp_catalog_stats` | Sim (`supabase/migrations/`) | Sim |
| `20260915113458` | `zapp_catalog_stats_revoke_authenticated` | Sim (`supabase/migrations/`) | **Não** (Ação 1 — nunca aplicada) |
| `20260916155725` | `catalog_stats_price_range_top_colors_materials` | **Não, até esta etapa** | Sim (15:57:25 UTC hoje) |

`20260916155725` é um `CREATE OR REPLACE FUNCTION public.zapp_catalog_stats()`
que acrescenta 4 chaves ao jsonb retornado (`price_min`, `price_max`,
`top_colors`, `top_materials`) — filtros de preço/cor/material para a
listagem de produtos. Os comentários inline atribuem o trabalho a "E36"/"E22"
— **numeração de feature alheia a este plano de 50 etapas** (a E36 deste
documento é sobre custo de `fn_cron_safe_run`; não confundir). Conteúdo é
engenharia de produto legítima e coerente (mesmo padrão de normalização
`upper(coalesce(elem->>'nome', elem #>> '{}'))` já visto no achado da E22
sobre `colors`/`materials`), não vandalismo — só aplicada pelo canal errado
(MCP/dashboard direto, sem migration versionada), mesmo padrão dos 2 casos
históricos que motivaram a E12.

**Cruzamento com a Ação 1 (REVOKE pendente):** confirmado ao vivo
`has_function_privilege('authenticated', 'public.zapp_catalog_stats()',
'EXECUTE') = true` **depois** desta 2ª DDL — ou seja, **nada mudou** na
postura de segurança. `CREATE OR REPLACE FUNCTION` preserva owner/ACL quando
a assinatura não muda (sem `GRANT`/`REVOKE` no statement aplicado hoje,
confirmado lendo o texto completo do `statements[]` do ledger) — o `EXECUTE`
de `authenticated` que está ativo agora é o mesmo, nunca revogado, desde a
criação original (`20260912205759`); a Ação 1 já previa isso e continua
válida e necessária exatamente como descrita, sem nenhuma escalada de risco
por causa deste achado.

**Regularização proposta:** `supabase/migrations/20260916210000_backfill_catalog_stats_price_range_top_colors_materials_20260916155725.sql`
já escrito nesta etapa — espelho textual exato do `statements[]` do ledger
para essa version, **sem** `migration repair` (a linha já existe no ledger,
diferente do caso E09 3b/3c) e **sem** nenhum `GRANT`/`REVOKE` (não interfere
com a Ação 1). Efeito de aplicar: idempotente — reproduz o que já roda em
produção. Ainda assim tratado como `[REQUER-PO]` pelo mesmo motivo do E09 3b
(qualquer arquivo novo em `supabase/migrations/` se torna DDL real na
próxima vez que rodar contra um ambiente que ainda não tem essa version —
ex. ambiente novo/staging), não por incerteza sobre o efeito no projeto
canônico (que já está nesse estado).

**Nota de acompanhamento:** `supabase/MIGRATIONS_SYNC_LOG.md` (E48) ainda
lista essa version como `SEM_ARQUIVO_LOCAL` — é o estado correto até este
arquivo ser aprovado e mergeado; a próxima regeneração do relatório (E48)
deve parar de sinalizá-la depois do merge, sem necessidade de edição manual
do log.

**Teste de reversão:** `git rm` do arquivo (zero efeito em produção — a
função já está nesse estado independentemente do arquivo existir no repo).

---

## Resumo para aprovação

| # | Ação | Tipo | Risco | Reversível |
|---|---|---|---|---|
| 1 | REVOKE `zapp_catalog_stats` de `authenticated` | DDL real (1 statement) | Baixo — 0 consumidores conhecidos | Sim, 1 statement |
| 2 | `migration repair` 179 versões | Ledger only | Nenhum (não executa SQL) | Sim, por versão |
| 3a | `migration repair --status reverted` 2 stubs | Ledger only | Nenhum | Sim (não recomendado) |
| 3b | Novo arquivo de backfill (google secret_name) | DDL real, idempotente/no-op | Nenhum — WHERE não casa nada hoje | Sim, `git rm` |
| 3c | `migration repair --status applied` do backfill | Ledger only | Nenhum | Sim |
| 4 | Arquivo-espelho para 2ª DDL out-of-band de hoje (`zapp_catalog_stats`, price/cor/material) | Arquivo no repo, sem `migration repair`, sem GRANT/REVOKE | Nenhum no canônico (já aplicada); idempotente noutros ambientes | Sim, `git rm` |

Responda "aprovado" para o pacote inteiro, ou liste os itens (1, 2, 3a, 3b, 3c, 4) que aprova agora.
