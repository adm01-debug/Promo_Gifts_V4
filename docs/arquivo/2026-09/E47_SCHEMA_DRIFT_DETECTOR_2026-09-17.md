# E47 — Detector de assinatura de schema: correções ao premissa do plano

`[REQUER-PO]`. Migration pronta, não aplicada:
`supabase/migrations/20260917090000_e47_fix_schema_drift_cron_split.sql`.

Etapa do `PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` (linha 1045).
Depende de E12 (✅ concluída — `ddl-out-of-band-detector.yml`) e E15
(✅ concluída — workflow de aplicação controlada).

---

## 1. Método `[DB-RO]`

Via `pg_catalog`/`cron.job`/tabelas do próprio mecanismo (só leitura), mais
`grep` no repo para confirmar (ou refutar) a premissa "edge `schema-drift-check`
(existe) notifica" do texto do plano.

---

## 2. Premissa do plano estava parcialmente errada

O texto do plano descreve o mecanismo como um "edge `schema-drift-check`
(existe)" que "notifica". Isso é impreciso em dois pontos, confirmados por
busca no repo (`find supabase/functions -iname "*schema*drift*"`,
`grep -rli "schema-drift\|schema_drift" supabase/functions/ .github/workflows/`):

- **Não existe edge function nenhuma para isso.** O que existe é um job
  `pg_cron` (`jobid=245`, `jobname='schema-drift-check'`) chamando funções
  SQL diretamente — não uma Supabase Edge Function.
- **O cron já roda 4x/dia** (`schedule = '11 2,8,14,20 * * *'`), não
  diariamente como o texto sugere — nesse ponto a realidade é melhor que a
  premissa do plano, não pior.

O mecanismo real tem duas partes:
1. `fn_check_schema_signature_drift()` — compara `information_schema.columns`
   ao vivo contra `schema_signature_baseline` (snapshot estático), aplica
   exclusões de `schema_signature_drift_allowlist`, grava uma linha em
   `schema_signature_drift_log` (`fix_version: schema_drift_local_guard_v4`).
2. `fn_sync_local_drift_to_schema_drift_log()` — pega a linha mais recente de
   `schema_signature_drift_log` e replica para a tabela legada
   `schema_drift_log` (a que o texto do plano cita), mapeando
   `tables_added`→`only_oficial`, `tables_removed`→`only_lovable`, e **fixando
   `notification_sent = false`** (comentário no corpo: "Dados do check local
   — bridged", `fix_version: drift_log_bridge_v1_20260627`).

Confirmado via `cron.job`: ambas rodam dentro de uma única chamada de
`fn_cron_safe_run`, no mesmo job:

```sql
SELECT public.fn_cron_safe_run(
  25::bigint,
  $$
    SELECT public.fn_check_schema_signature_drift();
    SELECT public.fn_sync_local_drift_to_schema_drift_log();
  $$,
  30000,
  'schema-drift-local-4x'
);
```

---

## 3. Achado #1 — checklist "Notificação chega a canal definido pelo PO": confirmado não cumprido

Busca em `src/`, `scripts/`, `.github/workflows/` por `schema_drift_log`,
`notification_sent`, `schema_signature_drift` encontra só três arquivos:
`.github/workflows/ddl-out-of-band-detector.yml`,
`scripts/check-ddl-out-of-band.mjs` (E12, já concluída) e o stub de tipo
gerado (`src/integrations/supabase/types.ts`). **Nenhum código lê
`notification_sent` para disparar Slack, e-mail ou qualquer canal** — a
coluna é gravada como `false` e nunca mais consultada por nada.

O único consumidor real do sinal hoje é o detector semanal do E12
(`ddl-out-of-band-detector.yml`), que lê a linha mais recente de
`schema_signature_drift_log`, cruza cada tabela/coluna adicionada/removida
contra `supabase_migrations.schema_migrations` (por nome ou texto do
statement) e só falha o job de CI para o que **não** tem migration
correspondente — isso é uma forma real de verificação automatizada, mas é
(a) semanal, não em tempo real, (b) visível em CI, não um "canal definido
pelo PO" (Slack/e-mail/etc.), e (c) "advisory, não gate" (não bloqueia PR).

**Conclusão**: o item do checklist está corretamente marcado como pendente.
Decidir o canal (Slack? e-mail? issue automática no GitHub, no padrão já
usado por outras etapas deste plano?) é uma decisão de produto do PO, não
uma correção técnica que eu possa aplicar sozinho — não incluído na migration
desta etapa.

---

## 4. Achado #2 — baseline nunca foi atualizada desde 2026-06-27, tornando `has_drift` quase sempre `true`

```sql
SELECT baseline_label, count(*) FROM public.schema_signature_baseline GROUP BY baseline_label;
-- certified_baseline_20260627_v3_post_lovable_audit | 7201
```

Uma única `baseline_label`, capturada em 2026-06-27 e nunca mais atualizada.
Hoje é 2026-09-17 — **82 dias de evolução legítima de schema** (novas
funções/tabelas de E17/E18/E30/E33/E40 e trabalho normal do time) estão
sendo comparados contra essa fotografia parada.

```sql
SELECT count(*), count(*) FILTER (WHERE has_drift) FROM public.schema_signature_drift_log;
-- total=350, has_drift=true → 311 (89%)
```

E as 5 rodadas mais recentes (`2026-09-16 08:11` a `2026-09-17 08:11`, 24h,
5 execuções) têm **`n_added=325, n_removed=22` idênticos, bit-a-bit, nas 5**
— forte evidência de que o diff está comparando contra uma referência
estática, não contra a rodada anterior (se fosse rodada-a-rodada, qualquer
ruído natural do schema ao longo de 24h produziria números diferentes).

**Isso não é um bug de lógica** — a comparação em si está correta,
matematicamente. É um problema arquitetural: sem atualizar a baseline
periodicamente, o sinal `has_drift` degenera para "sempre verdadeiro" depois
de algumas semanas de operação normal, o que o torna inútil como alerta de
"algo mudou agora" isoladamente.

**Mitigação parcial já existente**: o consumidor real (E12,
`check-ddl-out-of-band.mjs`) não usa `has_drift` cru — ele recalcula os
candidatos genuinamente não explicados cruzando contra o ledger de
migrations, então a baseline estática não invalida esse check (só o torna
redundante ano após ano, recomputando a mesma lista crescente de "adicionado
desde junho" a cada rodada, para sempre).

**Não incluo recaptura automática de baseline nesta migration** — decidir
quando/como recapturar (ex.: só depois de um lote de migrations aprovado e
aplicado, nunca "na próxima segunda-feira" sem revisão, para não mascarar
DDL fora de banda como "nova baseline normal") é uma decisão de processo do
PO, análoga à raiz #2 não corrigida em E35. Fica registrado aqui como
achado e candidato a decisão futura.

---

## 5. Achado #3 — checklist "Cron ativo, single-statement": confirmado não cumprido, com risco real de mascaramento

O `p_sql` passado para `fn_cron_safe_run` no job 245 contém **2 statements**
(`fn_check_schema_signature_drift()` seguido de
`fn_sync_local_drift_to_schema_drift_log()`), o mesmo padrão de risco
identificado para os 59 jobs da etapa E37 (ainda não escrita).

`fn_cron_safe_run` (lida integralmente nesta sessão, ver também E36/E37)
executa `p_sql` via `EXECUTE` dentro de um bloco `EXCEPTION WHEN OTHERS`
que **captura o erro e retorna uma string formatada em vez de relançar**.
Combinado com a semântica padrão de blocos `EXCEPTION` do PL/pgSQL (que
funcionam como um `SAVEPOINT` implícito no início do bloco — qualquer
exceção desfaz **todo** o trabalho feito desde o início do bloco, inclusive
de `EXECUTE`s aninhados anteriores), isso implica: **se a 2ª statement
(`fn_sync_local_drift_to_schema_drift_log`) falhar, o rollback do savepoint
desfaz também a gravação da 1ª statement** (`fn_check_schema_signature_drift`,
o check real) — e `cron.job_run_details.status` ainda mostraria
`'succeeded'`, porque `fn_cron_safe_run` nunca relança a exceção.

Esta inferência usa a semântica documentada de blocos `EXCEPTION` do
PL/pgSQL (savepoint implícito) — não foi testada ao vivo neste levantamento
porque a conexão MCP usada é somente-leitura (`CREATE TEMP TABLE` foi
rejeitado com `cannot execute CREATE TABLE in a read-only transaction` ao
tentar). Não é especulação sem base — é a mesma regra que explica por que
`EXCEPTION` blocks em PL/pgSQL são chamados de "sub-transações" no manual do
Postgres — mas fica registrado que não há uma reprodução ao vivo específica
deste caso, diferente do padrão de prova usado em E35 (que teve
`EXPLAIN ANALYZE` real).

Evidência indireta a favor: as 5 rodadas mais recentes têm 100% dos
`n_added`/`n_removed` idênticos e `cron.job_run_details` não mostra nenhuma
falha para `jobid=245` nas 73 execuções da janela de retenção — ou seja,
esse modo de falha específico (bridge falhar e apagar o check) não parece
ter ocorrido recentemente. O risco é estrutural/latente, não um incidente
observado.

---

## 6. Correção proposta — separar em 2 chamadas de `fn_cron_safe_run`, cada uma com 1 statement

Troca **só o `command` do job 245** (via `cron.alter_job`), sem tocar em
nenhuma função:

```sql
SELECT public.fn_cron_safe_run(25::bigint,
  $$SELECT public.fn_check_schema_signature_drift();$$, 15000, 'schema-drift-local-4x');
SELECT public.fn_cron_safe_run(25::bigint,
  $$SELECT public.fn_sync_local_drift_to_schema_drift_log();$$, 15000, 'schema-drift-bridge-4x');
```

Duas chamadas de `fn_cron_safe_run` **sequenciais e independentes**, cada
uma com exatamente 1 statement interno — resolve o item "single-statement"
do checklist literalmente. Reaproveita a mesma chave de advisory lock (`25`)
para as duas: `pg_try_advisory_xact_lock` é reentrante para a mesma sessão
(a mesma transação de cron pode adquiri-la mais de uma vez sem se
autobloquear), e como as duas chamadas rodam em sequência (nunca em
paralelo), não há risco de colisão com outro job usando a chave 25 nem de
deadlock consigo mesma.

Mais importante: com essa separação, se a 2ª chamada (bridge) falhar, o
savepoint implícito dela só desfaz o que **ela própria** fez — a 1ª chamada
(check real) já terminou e teve seu próprio bloco `EXCEPTION` fechado antes
da 2ª começar, então sua gravação em `schema_signature_drift_log`
**sobrevive** mesmo se a bridge quebrar depois. Elimina o risco descrito no
Achado #3 sem mudar o comportamento de nenhuma das duas funções.

**Não corrige** os achados #1 (canal de notificação) e #2 (baseline
parada) — ambos ficam documentados como pendências que dependem de decisão
do PO, não de uma correção mecânica.

---

## 7. Checklist de conclusão (do plano, §E47)

- [x] Cron ativo — confirmado, `jobid=245`, `active=true`, 4x/dia
- [ ] Cron ativo, single-statement — **não cumprido hoje**; correção
      preparada (§6), aguardando aprovação
- [ ] Teste de detecção passou — não executado nesta rodada (exigiria
      `COMMENT ON` em objeto real e esperar até 4h pela próxima execução do
      cron; candidato a validação pós-aplicação, não a esta investigação)
- [ ] Notificação chega a canal definido pelo PO — **confirmado não
      cumprido**; requer decisão de produto (canal), fora do escopo desta
      migration

---

## 8. Resumo para aprovação

| Mudança | Objeto | Risco |
|---|---|---|
| Separa o `command` do cron job em 2 chamadas de `fn_cron_safe_run` (1 statement cada) em vez de 1 chamada com 2 statements | `cron.job` jobid 245 (`schema-drift-check`) | Baixo — mesma cadência, mesmas duas funções, mesmo comportamento em caminho feliz; só muda o isolamento de falha entre as 2 etapas |

**Fora do escopo desta migration, registrados como achados para decisão do
PO**: (a) canal de notificação a definir, (b) política de recaptura de
baseline (`schema_signature_baseline` parada desde 2026-06-27), (c)
validação do teste de detecção fim-a-fim.

Migration pronta (não aplicada):
`supabase/migrations/20260917090000_e47_fix_schema_drift_cron_split.sql` —
precondição confirma `jobid`/`schedule`/`command` atual (2 statements) antes
de alterar; pós-condição confirma o novo `command` (2 chamadas separadas,
cada uma com exatamente 1 `fn_cron_safe_run(`) e que o job continua
`active` com o mesmo `schedule`.

Reversível: `cron.alter_job(245, command := '<command original, arquivado
nesta migration e neste doc>')`.

**[REQUER-PO]** — aguardando aprovação.
