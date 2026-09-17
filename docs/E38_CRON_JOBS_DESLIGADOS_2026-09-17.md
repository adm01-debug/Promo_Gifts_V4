# E38 — Decisão sobre os 2 cron jobs desligados

`[REQUER-PO]`. Migration pequena e segura pronta, não aplicada:
`supabase/migrations/20260917070000_e38_unschedule_dead_cron_jobs.sql`.

Etapa do `PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` (linha 865).

---

## 1. Método `[DB-RO]`

Via `pg_catalog`/`cron.job` (só leitura):

```sql
SELECT jobid, jobname, schedule, active, command
FROM cron.job
WHERE jobname IN ('process-webhook-outbox', 'pipeline-classify-categories');
```

Para cada job: (a) a função que ele chama ainda existe? (`to_regprocedure`),
(b) a tabela/fila que ele processa tem backlog? (c) existe um consumidor
alternativo no código (edge function, trigger) que já assumiu a
responsabilidade?

---

## 2. `pipeline-classify-categories` (jobid 274) — função não existe mais

Comando do job: `SELECT public.fn_cron_safe_run(55::bigint, 'SELECT
public.fn_pipeline_classify_pending_products(50);', 580000,
'pipeline-classify')`.

`to_regprocedure('public.fn_pipeline_classify_pending_products(integer)')`
retorna `NULL` — **a função não existe no schema atual**. Se o job fosse
reativado hoje, cada execução falharia com "function does not exist" (e,
por rodar dentro de `fn_cron_safe_run`, provavelmente seria capturada e
logada como falha, não crasharia o worker de cron — mas nunca produziria
resultado útil).

`cron.job_run_details` não tem nenhum registro para `jobid=274` dentro da
janela de retenção (~17 dias, confirmado em E36) — não dá para determinar
exatamente quando parou de rodar, só que já estava inativo antes dessa
janela.

**Decisão: remover o job.** Não é caso de "religar" — a função que ele
chamaria não existe. Se a classificação automática de categorias via IA for
retomada como funcionalidade, é um trabalho de produto novo (reescrever a
função), fora do escopo de higiene de cron desta etapa.

---

## 3. `process-webhook-outbox` (jobid 202) — fila vazia, substituída por padrão de dispatch direto

Comando do job: `SELECT public.fn_process_webhook_outbox_batch(10);`.

Diferente do job #2, a função `fn_process_webhook_outbox_batch(integer)`
**ainda existe** (`to_regprocedure` confirma). O problema é a tabela que ela
processa:

- `public.webhook_outbox`: **0 linhas** (`SELECT status, count(*) ... GROUP
  BY status` retorna vazio — não é só "sem pendentes", é uma tabela
  completamente vazia).
- `grep -rln "webhook_outbox" src/ supabase/functions/` só encontra
  `src/integrations/supabase/types.ts` (stub de tipo gerado) — **nenhum
  código real grava ou lê essa tabela hoje**.
- O mecanismo de webhook realmente em uso é a edge function
  `supabase/functions/webhook-dispatcher/index.ts`: despacho direto por
  evento (não fila) para `outbound_webhooks`, com HMAC, retry com backoff e
  log em `webhook_deliveries`, invocada via header `x-dispatcher-secret`
  (triggers/RPCs/cron) ou JWT de supervisor+ (frontend). Confirmado como o
  padrão vigente, ainda que de baixo volume: `outbound_webhooks` tem 1 linha
  cadastrada, `webhook_deliveries` tem 0 (poucos webhooks configurados, mas
  a arquitetura ativa é essa, não a fila).
- Sem FK apontando para `webhook_outbox` (`information_schema` confirma 0
  dependentes) — nenhuma outra tabela depende dela.

**Decisão: remover o job.** A fila `webhook_outbox` é um padrão legado,
substituído pelo dispatch direto do `webhook-dispatcher`, e está vazia e sem
consumidor/produtor real. Não incluo `DROP TABLE public.webhook_outbox`
nesta mesma migration — remover uma tabela é uma decisão mais conservadora
e sem urgência (a tabela vazia não custa nada ficar), melhor tratada como
item separado se o PO quiser formalizar a descontinuação completa do
padrão de fila.

---

## 4. Resumo para aprovação

| Job | Causa raiz | Decisão | Risco de remover |
|---|---|---|---|
| `pipeline-classify-categories` (jobid 274) | Função `fn_pipeline_classify_pending_products` não existe mais no schema | `cron.unschedule` | Zero — já não pode rodar de qualquer forma |
| `process-webhook-outbox` (jobid 202) | Fila vazia, sem produtor/consumidor real, substituída por `webhook-dispatcher` (dispatch direto) | `cron.unschedule` | Zero — 0 linhas na fila, função sem outro chamador |

Migration pronta (não aplicada):
`supabase/migrations/20260917070000_e38_unschedule_dead_cron_jobs.sql` —
precondição/pós-condição confirmando `jobid`/`active=false` antes e ausência
do `jobname` em `cron.job` depois.

Reversível: `SELECT cron.schedule('process-webhook-outbox', '* * * * *',
'SELECT public.fn_process_webhook_outbox_batch(10);');` (a função ainda
existe). **Não é reversível da mesma forma para
`pipeline-classify-categories`** — resgatar esse job exigiria primeiro
recriar `fn_pipeline_classify_pending_products`, que não existe mais; a
reversão registrada na migration é só o `cron.schedule` original, com uma
nota de que ele falharia até a função ser restaurada.

**[REQUER-PO]** — aguardando aprovação.
