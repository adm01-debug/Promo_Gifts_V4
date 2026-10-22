# P19 — Remediação Top-10 Crons com Falha

**Data:** 2026-10-22  
**Autoria:** Claude Sonnet 4.6 — sessão https://claude.ai/code/session_01GfYDwdVBZip5FzMr8MZ4Be  
**Projeto:** `doufsxqlfjyuvxuezpln` (Promo Gifts V4)  
**Período de análise:** últimas 500 execuções + últimas 24h  

---

## 1. Diagnóstico Sistêmico

**Causa raiz unificada:** Todas as 10 falhas têm **exatamente a mesma mensagem**:

```
job startup timeout
```

Este erro **não é** um timeout de execução da função (o `statement_timeout` definido em `fn_cron_safe_run` nunca chega a disparar). É o erro que `pg_cron` emite quando **não consegue alocar um slot de worker** dentro do janela de startup (~10 s).

### Por que ocorre

| Parâmetro | Valor |
|---|---|
| `cron.max_running_jobs` | **32** |
| `max_connections` | 90 |
| Total de cron jobs ativos | **135** |

Com 135 jobs ativos e teto de 32 slots simultâneos, a cada minuto com pico de carga o 33º job (e seguintes) falham imediatamente no startup. Isso explica a taxa de falha uniforme (~15–28% dependendo do job) — são as situações onde todos os 32 slots estão ocupados.

### Minutos de pico identificados

| Minuto | Jobs disparando simultaneamente |
|---|---|
| :2/:7/:12/:17/:22/:27/:32/:37/:42/:47/:52/:57 | `backfill-image-dimensions` + `sm-variant-coherence-guard` + `process-pending-products` (3 jobs ao mesmo instante) + quaisquer outros no mesmo minuto |
| :0/:5/:10/:15/:20/:25/:30/:35/:40/:45/:50/:55 | `dispatcher-failure-alert` (*/5) + `hash-product-images` (*/5) + `sync-is-stockout-universal` (todos ao mesmo minuto) |
| :5/:15/:25/:35/:45/:55 | `sm-url-discover-search` conflui com os acima |

Os 4 jobs com schedules `*/5` e `0,5,10...55` disparam no **mesmo segundo** a cada 5 minutos, somando-se a todos os outros jobs ativos, saturando os 32 slots.

---

## 2. Tabela de Remediação

| # | jobname | Tipo de falha | Causa raiz | Fix proposto | Prioridade | Impacto ao usuário |
|---|---|---|---|---|---|---|
| 1 | `dispatcher-failure-alert` | A — Startup timeout | Colisão com `hash-product-images` e `sync-is-stockout-universal` no mesmo minuto (`*/5`) | Mover schedule para `3,13,23,33,43,53` (offset +3 min) | ALTA | Médio — alertas de falha de dispatcher chegam atrasados ou não chegam |
| 2 | `hash-product-images` | A — Startup timeout | Colisão com `dispatcher-failure-alert` e `sync-is-stockout-universal` (`*/5`) | Mover schedule para `4,14,24,34,44,54` (offset +4 min) | ALTA | Baixo — processamento de hash de imagem atrasado, sem impacto imediato no catálogo |
| 3 | `sync-is-stockout-universal` | A — Startup timeout | Conflito no minuto :00/:05/:10… com dois outros jobs `*/5`; 65 falhas/24h | Reduzir frequência para `0,10,20,30,40,50` (a cada 10 min em vez de 5) ou mover offset | ALTA | Médio-Alto — status de estoque pode ficar desatualizado por até 10 min (atual: ~5 min) |
| 4 | `sm-stock-guard` | A — Startup timeout | 62 falhas/24h; schedule `3,8,13,…` colide com outros jobs pesados a cada 5 min | Reduzir frequência para `3,13,23,33,43,53` (a cada 10 min) | MÉDIA | Médio — guard de estoque falha sem proteção por 5 min extra |
| 5 | `process-pending-products` | A — Startup timeout | 58 falhas/24h; mesmo schedule `2,7,12,…` que `backfill-image-dimensions` e `sm-variant-coherence-guard` | Mover para `9,19,29,39,49,59` (offset +7 min, fora do grupo atual) | MÉDIA | Alto — processamento de produtos pendentes atrasado; afeta ingestão do catálogo |
| 6 | `sm-variant-coherence-guard` | A — Startup timeout | 54 falhas/24h; colide exatamente com `backfill-image-dimensions` e `process-pending-products` | Mover para `0,10,20,30,40,50` (offset) | MÉDIA | Médio — guard de coerência de variantes falha; possível inconsistência de dados |
| 7 | `backfill-image-dimensions` | A — Startup timeout | 54 falhas/24h; schedule idêntico a `process-pending-products` e `sm-variant-coherence-guard` | Reduzir frequência para `2,22,42` (a cada 20 min — backfill tolera latência) | MÉDIA | Baixo — backfill atrasado, sem impacto direto no usuário |
| 8 | `fantasmas-deactivate-guard` | A — Startup timeout | 50 falhas/24h; schedule `4,9,14,…` (a cada 5 min) | Reduzir para `4,19,34,49` (a cada 15 min — guard de estado persistente tolera latência) | BAIXA | Baixo — produtos "fantasma" ficam ativos por mais alguns minutos |
| 9 | `auto-block-offenders` | A — Startup timeout | 44 falhas/24h; schedule `1,6,11,…` (a cada 5 min) | Reduzir para `1,16,31,46` (a cada 15 min) | BAIXA | Baixo-Médio — bloqueio de offenders ligeiramente atrasado |
| 10 | `sm-url-discover-search` | A — Startup timeout | 40 falhas/24h; 27.8% de falha — maior taxa percentual; colide com grupo */5 nos minutos :05,:15,:25,:35,:45,:55 | Mover para `6,18,30,42,54` (a cada 12 min, fora dos picos) | BAIXA | Baixo — descoberta de URLs de scraping atrasada |

---

## 3. Fixes Detalhados para os 3 Crons com Mais Falhas

### 3.1 `dispatcher-failure-alert` (68 falhas/24h — 23.9%)

**Função:** `fn_alert_dispatcher_failures()` — alerta quando há falhas recentes no dispatcher de notificações.  
**Schedule atual:** `*/5 * * * *` (dispara em :00, :05, :10, :15, :20, :25, :30, :35, :40, :45, :50, :55)  
**Conflito direto:** `hash-product-images` (também `*/5`) e `sync-is-stockout-universal` (`0,5,10…55`) disparam no **exato mesmo minuto**.

**Fix (simples — só schedule):**
```sql
SELECT cron.unschedule('dispatcher-failure-alert');
SELECT cron.schedule(
  'dispatcher-failure-alert',
  '3,13,23,33,43,53 * * * *',  -- offset +3 min, evita colisão com */5
  'SELECT public.fn_alert_dispatcher_failures();'
);
```

**Migration:** `supabase/migrations/20261022100020_fix_cron_dispatcher_failure_alert.sql`

**Impacto operacional:** Alertas de falha do dispatcher atrasam no máximo 3 minutos. Risco mínimo.

---

### 3.2 `hash-product-images` (56 falhas/24h — 19.6%)

**Função:** Edge function `hash-product-images` — calcula hash SHA-256 de imagens de produto para detecção de duplicatas.  
**Schedule atual:** `*/5 * * * *`  
**Conflito direto:** idêntico ao `dispatcher-failure-alert`.

**Fix (simples — só schedule):**
```sql
SELECT cron.unschedule('hash-product-images');
SELECT cron.schedule(
  'hash-product-images',
  '4,14,24,34,44,54 * * * *',  -- offset +4 min
  $$SELECT net.http_post(
      url := public.get_edge_functions_base_url() || '/functions/v1/hash-product-images',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || public.get_edge_anon_key(),
        'x-cron-secret', public.get_edge_function_secret('HASH_PRODUCT_IMAGES_CRON_SECRET')
      ),
      body := '{"trigger":"cron"}'::jsonb,
      timeout_milliseconds := 55000
  )$$
);
```

**Migration:** `supabase/migrations/20261022100021_fix_cron_hash_product_images.sql`  
**Arquivo de função:** `/home/user/Promo_Gifts_V4/supabase/functions/hash-product-images/index.ts` (sem alteração — o código da função está correto)

---

### 3.3 `sync-is-stockout-universal` (65 falhas/24h — 22.8%)

**Função:** `fn_sync_is_stockout_all()` — sincroniza flag `is_stockout` em todos os produtos.  
**Schedule atual:** `0,5,10,15,20,25,30,35,40,45,50,55 * * * *` (equivalente a `*/5`)  
**Conflito direto:** idem aos anteriores + pior ainda pois `sm-url-discover-search` conflui em :05,:15,:25,:35,:45,:55.

**Fix (redução de frequência — de 5 min para 10 min):**
```sql
SELECT cron.unschedule('sync-is-stockout-universal');
SELECT cron.schedule(
  'sync-is-stockout-universal',
  '0,10,20,30,40,50 * * * *',  -- cada 10 min (era cada 5)
  'SELECT public.fn_cron_safe_run(115::bigint, ''SELECT public.fn_sync_is_stockout_all();'', 44000, ''sync-is-stockout'');'
);
```

**Migration:** `supabase/migrations/20261022100022_fix_cron_sync_is_stockout_universal.sql`

**Custo:** latência máxima de stockout sobe de 5 min para 10 min. Aceitável para um sistema B2B com atualizações de estoque em batch.

---

## 4. Análise de Impacto no Pool após os 3 Fixes

| Minuto | Jobs antes | Jobs depois |
|---|---|---|
| :00 | dispatcher + hash + sync (3 colisões) | sync apenas (dispatcher move pra :03, hash pra :04) |
| :05 | dispatcher + hash + sync + sm-url | hash apenas (dispatcher→:03, sync→:10, sm-url→:05 permanece) |
| :10 | dispatcher + hash + sync | sync (dispatcher→:13, hash→:14) |
| :03 | — | **dispatcher** (novo slot livre) |
| :04 | — | **hash** (novo slot livre) |

Redução estimada de colisões: **-33% de startup timeouts** para os 3 crons principais.

---

## 5. Recomendação Estrutural (médio prazo)

Os fixes de schedule são paliativo. A causa raiz é o crescimento do número de cron jobs (135 ativos) versus o teto de `max_running_jobs = 32`. Ações recomendadas para o PO avaliar:

1. **Auditar jobs inativos ou redundantes**: executar `SELECT jobname, schedule FROM cron.job WHERE active = false` e desativar permanentemente os obsoletos.
2. **Consolidar jobs de guard de alta frequência**: vários guards (sm-stock-guard, sm-variant-coherence-guard, fantasmas-deactivate-guard) poderiam ser consolidados em um único job de "health-check" que chama múltiplas funções em sequência, liberando slots.
3. **Avaliar upgrade de plano**: `max_connections = 90` sugere plano Small/Medium. O aumento para Large (`max_connections = 200`) permitiria `max_running_jobs` maior sem risco de starvation de conexões da aplicação.
4. **Implementar fila pg_cron dedicada**: usar `cron.use_background_workers = on` (requer restart do servidor — avaliar com suporte Supabase).

---

## 6. Arquivos Criados

| Arquivo | Tipo | Propósito |
|---|---|---|
| `auditoria-supabase/propostas/P19_cron_failures_remediation.md` | Análise | Este documento |
| `supabase/migrations/20261022100020_fix_cron_dispatcher_failure_alert.sql` | Migration | Redistribui `dispatcher-failure-alert` para `:03` |
| `supabase/migrations/20261022100021_fix_cron_hash_product_images.sql` | Migration | Redistribui `hash-product-images` para `:04` |
| `supabase/migrations/20261022100022_fix_cron_sync_is_stockout_universal.sql` | Migration | Reduz `sync-is-stockout-universal` para cada 10 min |

**Nota:** As migrations devem ser aplicadas via `.github/workflows/db-apply-migration.yml` (REGRA #8 / E15 — único caminho autorizado).
