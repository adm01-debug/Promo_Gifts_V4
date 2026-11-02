# Estado real do projeto — inventário gerado

Pasta de **dados gerados por script**, não de relatórios escritos à mão. É a fonte de consulta dos
agentes para "o que existe hoje" no banco e no código. Se um número aqui divergir do que você mediu,
regere o arquivo (comandos abaixo) em vez de corrigir à mão. Mesmo formato do `inventario/estado/` do
Zapp_Web_V2. O resto de `inventario/` (análise de branches) é histórico.

| Arquivo | Como gerar | O que tem |
|---|---|---|
| `banco.json` | `SUPABASE_ACCESS_TOKEN=... node scripts/inventario/gerar-banco.mjs` **ou**, sem token, rodar `scripts/inventario/banco.sql` no MCP oficial (`SUPABASE - GESTÃO DE PRODUTOS`, `execute_sql`) e `list_edge_functions`, salvar as respostas e `node scripts/inventario/gerar-banco.mjs --entrada <resposta-sql> --functions <resposta-functions>` | banco oficial, só leitura: cada tabela de `public` (RLS, policies, triggers, linhas exatas abaixo de 200 mil, tamanho, se é citada em função/view e `uso_no_codigo` em `src/` e `supabase/functions/`), tabelas de outros schemas, views, mviews, funções `SECURITY DEFINER`, cada cron job (agenda, funções e edges chamadas, falhas e taxa em 24 h/7 d, timeouts, duração máxima), horas em que o cron ficou parado, tamanho do histórico do cron, edge functions publicadas × repo, `tabelas_orfas` e `alertas` |
| `rotas.json` | `node scripts/inventario/gerar-rotas.mjs` | cada rota de `src/routes/*.tsx`: path, componente, **tela** (arquivo), grupo, **guardas** (próprias, de wrapper e herdadas do `AppRoutes.tsx`, ex.: `ProtectedRoute`), `somente_dev` (harness), **hooks** do projeto que a tela importa e **dados** alcançáveis (tabelas, buckets, RPCs e edges) seguindo imports locais até 4 níveis |
| `edges.json` | `node scripts/inventario/gerar-repo.mjs` (depois do `gerar-banco.mjs`) | as edge functions do repo: linhas, segredos lidos (`Deno.env.get` no `index.ts` e nos módulos que ele importa, inclusive `_shared/`) e quem invoca cada uma (src, migrations, outras edges, **cron**, e2e, CI) |

**Atualizar tudo** (a ordem importa: `gerar-repo.mjs` lê as chamadas de cron do `banco.json`):

```bash
SUPABASE_ACCESS_TOKEN=... node scripts/inventario/gerar-banco.mjs
node scripts/inventario/gerar-rotas.mjs
node scripts/inventario/gerar-repo.mjs
```

Toda segunda o workflow `inventario-estado-semanal.yml` roda os três e abre PR se algo mudou.
Testes das funções puras: `npx vitest run tests/scripts/inventario-banco.test.mjs tests/scripts/inventario-rotas.test.mjs`.

## Como ler `banco.json`

- **`alertas`** é o que um agente precisa saber antes de mexer: `tabela_sem_rls`, `tabela_sem_rls_fora_de_public`,
  `cron_falhando` (taxa ≥ 5 % em 7 dias, só jobs ativos), `cron_parado` (hora com mais da metade das execuções
  falhando), `historico_cron_sem_limpeza` (> 50 mil linhas com mais de 7 dias), `edge_publicada_sem_codigo_no_repo`,
  `edge_no_repo_sem_deploy`. Os limiares estão em `LIMIARES` no script.
- **`tabelas_orfas`**: 0 linhas (contagem exata) + não citada em função/view do banco + nenhum acesso no código
  (`.from`, `untypedFrom`, `goldFrom`, `{ table: }`). Candidata a limpeza, não prova de que pode apagar (pode ser
  usada por sistema externo ou por RPC com nome montado em tempo de execução).
- **`linhas`** é `count(*)` exato quando a tabela tem menos de 200 mil linhas (`linhas_exatas: true`); acima disso,
  a estimativa do planner.
- Nada de segredo sai do banco: de `cron.job` só o nome das funções e das edges chamadas (nunca o comando, que tem
  URL e cabeçalho), e de `cron.job_run_details` só contagens. O teste barra escrita e esses campos no SQL.

## Como ler `edges.json` e `rotas.json`

- `sem_chamador`: nenhuma chamada em `src/`, migrations, outras edges nem cron. Inclui webhooks chamados de fora
  (`receive-crm-callback`, `product-webhook`) e edges de teste (`test-*`, `e2e-cleanup`) — conferir antes de concluir
  que está morta.
- `rotas[].dados` é o que a tela **alcança** por import (até 4 níveis), não o que ela chama em toda renderização.

## Achados da geração de 2026-11-02 (medido_em 14:15 UTC)

- **Banco:** 398 tabelas em `public`, todas com RLS, 961 policies, 1.336 funções (572 `SECURITY DEFINER`),
  197 views, 144 cron jobs (137 ativos), 2.577 registros no ledger de migrations.
- **Alertas:** 24 tabelas sem RLS fora de `public` (`supplier_stricker.*`, `prod_audit.*`, `classification_audit.*`,
  `pgmq.meta`); **93 cron jobs ativos com ≥ 5 % de falha em 7 dias** (quase tudo `job startup timeout`: pg_cron sem
  worker livre no instante do disparo); 1 hora com o cron parado.
- **Histórico do cron:** 70 mil linhas (43 mil com mais de 7 dias, abaixo do limiar de alerta), mais antiga em
  2026-10-18.
- **Tabelas órfãs:** 16 (lista em `banco.json` → `tabelas_orfas`).
- **Edge functions:** 110 no repo = 110 publicadas; 36 com `verify_jwt = false`; 16 chamadas por cron;
  24 sem chamador conhecido.
- **Front:** 135 rotas (118 de produção, 17 harness), 124 com tela resolvida (o resto é `<Navigate>`), 93 alcançam
  dados. Guardas das rotas de produção: `ProtectedRoute` em todas menos 11 públicas; `AdminRoute` em 19, `DevRoute`
  em 31, `MagazineRoute` em 5.
