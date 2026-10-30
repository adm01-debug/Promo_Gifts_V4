# Auditoria exaustiva + correção do Supabase — instruções para o Claude Code

Salve como `.claude/commands/auditoria-supabase.md` no repo para invocar com `/auditoria-supabase`, ou cole no início da sessão.

---

## 0. Parâmetros (preencha antes de rodar)

| Chave | Valor |
|---|---|
| PROJETO | Promo_Gifts_V4 — `project_ref` = `doufsxqlfjyuvxuezpln` |
| MCP SUPABASE | `https://mcp.supabase.com/mcp?project_ref=doufsxqlfjyuvxuezpln` |
| REPO | `https://github.com/adm01-debug/Promo_Gifts_V4` (base: `main`) |
| PASTA DE TRABALHO | `auditoria-supabase/` na raiz do repo (não commitar até ordem expressa) |
| LIMITE DE SESSÃO | 80 turnos ou todas as seções concluídas/NÃO VERIFICADO — o que vier primeiro |
| IDIOMA | PT-BR em tudo (chat, relatório, commits, PR) |

---

## 1. Objetivo

1. Auditar exaustivamente a **infraestrutura** do projeto Supabase de produção: schema, RLS, DB functions, triggers, crons, edge functions, webhooks/pg_net, vault, auth, storage, realtime, migrations, logs.
2. **Corrigir bugs** dessa infraestrutura.
3. **Terminar funcionalidades pendentes ou parciais** que vivem no Supabase (ou no repo, quando o pedaço que falta está ligado ao Supabase).

O resultado esperado é o Supabase funcionando de ponta a ponta — não um relatório bonito.

---

## 2. Escopo

### Dentro
- Tudo que o projeto Supabase `doufsxqlfjyuvxuezpln` possui: Database (tabelas, views, functions, triggers, enums, sequences, extensões, grants, policies), Cron (`pg_cron`), Queues (`pgmq`), `pg_net`/webhooks, Vault, Auth (config, hooks, providers), Storage (buckets, policies), Realtime (publications), Edge Functions (código publicado + segredos), Migrations, Advisors, Logs.
- No repo, **somente o que está interligado ao Supabase**: `supabase/migrations/`, `supabase/functions/`, `supabase/config.toml`, `supabase/seed*`, `src/integrations/supabase/types.ts` (ou equivalente), e chamadas do cliente (`.from()`, `.rpc()`, `functions.invoke()`, `storage.from()`, `channel()`/realtime, `auth.*`). Um arquivo de front só entra se o bug ou a lacuna for a ponte entre ele e o Supabase (ex.: `.rpc('nome_errado')`, tabela que não existe, edge function nunca invocada).

### Fora (não tocar, não auditar, não "aproveitar")
- **Dados existentes**: registros errados, órfãos, duplicados, campos inconsistentes → apenas **reportar** com contagens. Nenhum `UPDATE`/`DELETE`/`INSERT` em dado de negócio, nem para "corrigir".
- Outros projetos Supabase (SINGU, Gestão de Clientes, Gestão de Produtos, ZAPP etc.) e seus MCPs: não usar, nem para consulta.
- `.github/workflows/`, Dockerfile, infra fora do Supabase, UI/UX, refatoração, renomeação, formatação, dependências.
- Bugs de front sem ligação com o Supabase → anotar em "Fora do escopo encontrado", não corrigir.

---

## 3. Regras invioláveis

1. **Confirme o projeto antes de qualquer coisa**: `get_project_url` + `list_tables` do MCP e compare o `project_ref` com a URL em `supabase/config.toml` / `.env.example` / `types.ts` do repo. Divergiu → pare e pergunte. Nunca assuma.
2. **Auditoria é somente leitura** (Fase A inteira): `SELECT` em catálogos/agregados, `EXPLAIN` sem `ANALYZE`, `get_advisors`, `query_logs`, `list_*`, `get_edge_function`. Proibido na Fase A: `apply_migration`, `execute_sql` com DML/DDL/GRANT, `deploy_edge_function`, `create_edge_function_secret`, qualquer escrita em auth/storage, `create_branch`.
3. **Escrita só na Fase B, e só pelo caminho descrito na seção 6.** Nenhuma escrita em produção fora de migration versionada ou deploy de edge function cujo código está no repo.
4. **Sem PII e sem valor de segredo** em arquivo, commit, PR ou chat: e-mails, telefones, CPF, nomes de pessoas → mascarar; IDs → prefixo + `…`; chaves/tokens → só o **nome** da variável. Se um segredo aparecer hardcoded, cite arquivo:linha e o nome, nunca o valor.
5. **Evidência ou NÃO VERIFICADO.** Todo achado traz consulta + resultado, ou arquivo:linha, ou saída de comando. Nome de branch, commit, PR, comentário no código ou README não provam nada — leia o código e o estado real.
6. **Não chute causa.** Antes de qualquer patch: log, estado real (banco, function, cron, request), ponto exato (arquivo:linha ou objeto). Sintoma com mais de uma causa possível → liste todas, corrija a que a evidência aponta.
7. **Uma correção = uma branch = uma PR.** Diff mínimo, causa raiz, zero churn. Não reescreva arquivo inteiro para mudar 3 linhas.
8. **Nunca** commitar em `main`, reaproveitar branch existente, escrever em branch que não criou nesta sessão, force-push em `main`.
9. **Travou** (MCP com erro, permissão negada, objeto inexistente, ambiguidade real) → reporte o erro exato e pare naquele item; não contorne regra nem pivote para outro projeto/ferramenta.
10. Salve `auditoria-supabase/progresso.json` ao final de **cada** seção (seção, status `concluída | NÃO VERIFICADO | parcial`, motivo, turno).

### Economia (velocidade + tokens) — decide ferramenta, profundidade e tamanho de tudo
- **Paralelize o que é independente**: A.1 (uma consulta por área, não uma por tabela), A.6, A.7 e A.8 em subagentes simultâneos, cada um escrevendo seu próprio `inventario/*.md`. Você consolida; não refaz.
- **Catálogo em lote**: uma query agregada por assunto (`information_schema`/`pg_catalog` com `json_agg`), nunca `describe` tabela por tabela.
- **Leia cada coisa uma vez**: código publicado de edge → salve em `inventario/edges/<slug>.ts` e faça diff local contra o repo; não chame `get_edge_function` de novo. Arquivo já lido não é relido.
- **Profundidade proporcional**: `EXPLAIN` só no top 10 por tempo total; logs só agregados (`limit 50`); achados BAIXO/INFO em uma linha, sem `propostas/*.sql`.
- **Saída enxuta**: inventário em tabela/JSON, sem prosa; relatório sem repetir evidência já escrita no inventário (link para o arquivo).
- **Não rode tool "por garantia"** que não muda um achado ou uma decisão. Dúvida entre duas causas → uma consulta que decide, não cinco que confirmam.
- **Fase B em lote**: AUTÔNOMAS que tocam arquivos distintos rodam em subagentes paralelos (branch própria cada um); APROVAÇÕES são todas preparadas e entregues numa **única** chamada no fim, não uma por vez.

---

## 4. Fase A — Auditoria (somente leitura)

Use subagentes (`Explore`) para varreduras amplas do repo; faça você mesmo as consultas ao banco (um achado guia o próximo). Leia só o trecho necessário (range de linhas, grep).

### A.0 Baseline (prova de que nada mudou)
Capture e salve em `auditoria-supabase/inventario/baseline_antes.json`:
- `list_migrations` (versão + nome), `list_edge_functions` (slug, versão, `verify_jwt`, `updated_at`), `SELECT jobid, jobname, schedule, command FROM cron.job`, `pg_policies` (schema, tabela, nome, cmd), `pg_proc` do schema `public` (nome, `prosecdef`, `proconfig`), lista de triggers, buckets. Reexecute no fim da Fase A e no fim da sessão → `baseline_depois.json` + diff.

### A.1 Inventário
Schemas, tabelas (linhas estimadas, tamanho, RLS on/off), colunas e tipos, PK/FK/UNIQUE/CHECK, índices, views (e `security_invoker`), materialized views, functions (linguagem, `SECURITY DEFINER`, `search_path` fixo ou não, `EXECUTE` concedido a `anon`/`authenticated`), triggers (evento, timing, função, habilitado), enums, sequences (valor atual × limite), extensões, grants por role, policies (cmd, roles, `USING`, `WITH CHECK`), crons + histórico 30d (`cron.job_run_details`), `pg_net` (`net._http_response` 7d, agrupado por status), nomes do vault (`vault.secrets` só `name` e `created_at`), realtime (`pg_publication_tables`), buckets (público/privado, limites, policies), auth (providers, MFA, hooks, templates, rate limits, `config.toml`), edge functions publicadas (slug, versão, `verify_jwt`, `import_map`), migrations aplicadas.
Salve em `auditoria-supabase/inventario/*.md` (um arquivo por área).

### A.2 Drift (repo × produção)
- `supabase/migrations/*` × `list_migrations` × schema real: migration no repo não aplicada; aplicada sem arquivo; objeto no banco sem origem em migration; objeto da migration que não existe mais.
- Migrations rodam do zero? Aplique-as em **Postgres temporário na sessão** (`docker` ou `pg_tmp`/`initdb` local; nunca produção) e registre a primeira falha com arquivo:linha. Se não houver como subir Postgres local → NÃO VERIFICADO + roteiro.
- `types.ts` × schema real: tabela/coluna/enum/function que falta ou sobra. Gere com `generate_typescript_types` e faça diff.
- Código × banco: todo `.from('x')`, `.rpc('f')`, `functions.invoke('e')`, `storage.from('b')`, `channel('c')`, `.schema('s')` do repo × o que existe em produção. Lista de órfãos nos dois sentidos.
- Edge functions publicadas × `supabase/functions/*`: publicada sem código no repo; no repo sem publicar; código divergente (compare `get_edge_function` com o arquivo).
- `Deno.env.get('X')` em cada edge × segredos existentes (só nomes; use `supabase secrets list` se disponível, senão infira pelos logs de erro).
- `config.toml` × config real de auth/storage/functions.

### A.3 Segurança
RLS desligada em tabela exposta; tabela com RLS e sem policy; `USING (true)` para `anon`/`authenticated`; `UPDATE`/`INSERT` sem `WITH CHECK`; isolamento por tenant/empresa (policy que não filtra pelo tenant); uso de `auth.jwt() -> 'user_metadata'` em policy; `anon` com `INSERT/UPDATE/DELETE`; `SECURITY DEFINER` sem `SET search_path`, acessível a `anon`, ou que recebe tabela/coluna por parâmetro; SQL dinâmico sem `format('%I')`/`quote_ident`; views sem `security_invoker` sobre tabelas com RLS; buckets públicos com dado sensível; edge com `verify_jwt=false` e sem validar o JWT no código; webhooks/`pg_net` sem assinatura ou com token na URL; service_role em front ou em `VITE_*`; segredos hardcoded no repo, no histórico git (`git log -p -S`), em comandos de cron ou em corpo de function; `get_advisors(type: security)` e `(type: performance)` completos.

### A.4 Integridade estrutural
Colunas `*_id` sem FK; FK sem índice; `ON DELETE` ausente ou errado para a regra de negócio; tabela sem PK; tipos errados (`text` para data/valor, `float` para dinheiro, `varchar` sem limite em chave); `NOT NULL`/`UNIQUE` ausentes em chave de negócio; sequences > 70% do limite; tabelas de log/evento sem retenção; `auth.users` × tabela de perfis (trigger de criação existe e funciona? perfis sem user? users sem perfil?).
Contagens de órfãos/duplicados/nulos entram **só como evidência** (número), nunca como item a corrigir.

### A.5 Performance
Advisors; top 20 de `pg_stat_statements` por tempo total e por chamadas (lista), `EXPLAIN` sem `ANALYZE` só nos 10 de maior tempo total; seq scans em tabelas grandes (`pg_stat_user_tables`); índices não usados (`idx_scan = 0`) e duplicados; bloat (estimativa); policies que fazem subselect por linha sem índice ou sem `(select auth.uid())`; functions `VOLATILE` usadas em policy.

### A.6 Crons (um a um)
Para cada job: o que faz (leia o `command` e a function alvo), schedule e sobreposição com outros, falhas/duração em 30d, alvo inexistente (function/edge/URL), token ou chave dentro do `command`, está versionado em migration ou foi criado à mão, está habilitado, roda em UTC ou fuso errado para o negócio. Crons que **deveriam existir** e não existem (limpeza de tokens/sessões, retenção de logs, reprocessamento de fila, expiração de status).

### A.7 DB functions e triggers (uma a uma)
Para cada function do `public` (e schemas custom): propósito, quem chama (grep no repo + outras functions + triggers + crons + policies), bugs de lógica, condição de corrida (sem `FOR UPDATE`/`ON CONFLICT`), exceções engolidas (`EXCEPTION WHEN OTHERS THEN NULL`), retorno inconsistente, `SECURITY DEFINER` desnecessário, `search_path`, parâmetros não validados, function morta (ninguém chama). Triggers: ordem, recursão, trigger desabilitado, trigger que falha silenciosamente, trigger duplicado.

### A.8 Edge functions (uma a uma)
Leia o código publicado (`get_edge_function`) e o do repo. Para cada: auth (valida JWT? usa service_role sem necessidade? aceita `anon`?), validação de input (schema/zod?), tratamento de erro (status HTTP corretos, não vaza stack/segredo), timeouts e retries em chamadas externas, idempotência (webhook reprocessado duplica?), CORS, logs 7d agrupados por mensagem (`query_logs` service `edge-function`), dependências com versão fixa, `Deno.env` sem fallback perigoso, corpo vazio/TODO/mock/`return new Response("ok")` sem fazer nada. Classifique risco: **R0** (só leitura, sem efeito externo), **R1** (escreve no banco), **R2** (dispara efeito externo: e-mail, WhatsApp, pagamento, terceiro). Teste de invocação só para R0 e só depois de ler o código inteiro.

### A.9 Auth, Storage, Realtime
Auth: providers habilitados × usados no front, confirmação de e-mail, MFA, hooks (`custom_access_token`, `send_email`…) existem e apontam para function válida, rate limits, templates, `site_url`/`redirect_urls` × domínios reais, sessões (`refresh_token_rotation`), `auth.users` com `email_confirmed_at` nulo em massa (contagem).
Storage: buckets × uso no código, policies por bucket (quem lê/escreve/apaga), limites de tamanho/MIME, objetos sem dono, bucket sem policy.
Realtime: tabelas na publication × `channel()` no código; tabela publicada sem RLS; `REPLICA IDENTITY` para `UPDATE`/`DELETE`.

### A.10 Logs 7d
`query_logs` por serviço (`postgres`, `auth`, `edge-function`, `storage`, `realtime`, `api`), agrupados por mensagem/erro, top 15 por ocorrência, com o objeto/function de origem. Erros recorrentes viram achados.

### A.11 RLS na prática
Produção: apenas `BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claims', '{"sub":"<id mascarado>","role":"authenticated"}', true); SELECT count(*) FROM <tabela>; ROLLBACK;` — só `count`, sempre em transação com `ROLLBACK`. Matriz completa tenant A × tenant B (ler/escrever/apagar por tabela) **só no Postgres temporário** com as migrations do repo e dados sintéticos.

### A.12 Lacunas operacionais
Backup/PITR ativo, ambiente de staging ou branch, trilha de auditoria (quem alterou o quê), retenção LGPD (dados pessoais sem prazo), alertas (cron falhou, edge 5xx, disco), testes de RLS/migrations no CI (só verificar se existem; não criar workflow).

### A.13 Funcionalidades pendentes ou parciais (o que falta para funcionar)
Esta seção é o que separa "auditoria" de "sistema funcionando". Procure ativamente:
- Edge function referenciada no front (`functions.invoke`) e não publicada, ou publicada e nunca chamada.
- `.rpc()` para function inexistente; function que existe e ninguém chama.
- Tabela criada sem RLS/policies (feature "pela metade": salva mas ninguém consegue ler, ou todos leem).
- Trigger que deveria popular/atualizar coluna e não existe (ex.: `updated_at`, perfil ao criar user, saldo/contador).
- Cron prometido em comentário/migration/README e não agendado.
- Migration no repo nunca aplicada (feature desenhada e não entregue).
- Coluna/tabela que existe mas nenhum código escreve nela (fluxo sem gravação) ou nenhum lê (fluxo sem leitura).
- Edge function com `TODO`, `WIP`, `mock`, `hardcode`, `return` vazio, `catch {}`.
- Bucket referenciado e inexistente, ou existente sem policy de escrita.
- Webhook/`pg_net` apontando para URL morta ou de ambiente antigo.
- Fluxo CRUD incompleto no Supabase: cria sem poder editar/excluir (policy faltando), lê sem salvar.
Para cada item: o que a funcionalidade deveria fazer (evidência do código/schema), o que falta exatamente (objetos/arquivos), e esforço.

---

## 5. Formato de cada achado

```
ID: SB-0001
Seção: A.3
Severidade: CRÍTICO | ALTO | MÉDIO | BAIXO | INFO
Tipo: BUG | SEGURANÇA | DRIFT | INTEGRIDADE | PERFORMANCE | PENDENTE/PARCIAL | LACUNA
Objeto: public.tabela / function nome() / edge slug / cron jobname / bucket
Evidência: <consulta + resultado resumido> ou <arquivo:linha + trecho>
Impacto no negócio: 1–2 linhas, para quem não é dev
Reprodução: passos (somente leitura)
Correção proposta: o quê, onde (migration / edge / repo), diff resumido
Classe de escrita: AUTÔNOMA | APROVAÇÃO (ver seção 6)
Risco de regressão: baixo | médio | alto + por quê
Esforço: P (<30 min) | M | G
```

Severidade: **CRÍTICO** = dado exposto, escrita indevida possível, perda de dado, fluxo de negócio parado. **ALTO** = feature principal quebrada ou pela metade, segredo exposto. **MÉDIO** = bug com contorno, performance visível, drift que vai quebrar o próximo deploy. **BAIXO** = inconsistência sem efeito atual. **INFO** = observação.

---

## 6. Fase B — Correções (escrita controlada)

Só começa depois que a Fase A estiver em `progresso.json` com todas as seções concluídas ou NÃO VERIFICADO, e o relatório parcial estiver salvo. Ordem: CRÍTICO → ALTO → MÉDIO → BAIXO; dentro da mesma severidade, PENDENTE/PARCIAL antes de INTEGRIDADE/PERFORMANCE.

### 6.1 Classe de escrita

**AUTÔNOMA — execute sem me perguntar, uma PR por item:**
- Correção de código de **edge function** (bug, validação, erro, timeout, idempotência, CORS) → branch + PR + merge + `deploy_edge_function` + verificação por log/request R0.
- **Segredo faltando** em edge: não crie o valor — abra o item como APROVAÇÃO informando só o nome da variável.
- Ajuste no repo interligado ao Supabase: `types.ts` regenerado, `.rpc`/`.from`/`invoke` apontando para o nome correto, `config.toml` alinhado ao real (sem mudar auth/segredos).
- Publicar no repo o código de uma edge function que existe em produção e não está versionada (sem alterar o comportamento).
- Migration **nova** adicionada ao repo mas **NÃO aplicada** (fica para APROVAÇÃO).

**APROVAÇÃO — faça tudo até a PR, deixe aberta, NÃO aplique; ao final da fase, uma única chamada `AGUARDANDO APROVAÇÃO: SB-xxxx, SB-yyyy…` com link e resumo de 1 linha por PR:**
- Qualquer DDL/DML em produção: criar/alterar tabela, coluna, índice, constraint, function, trigger, view, enum, policy, grant, cron, publication, bucket, `vault`.
- `apply_migration`, `execute_sql` que escreve, `create_branch`/`merge_branch`, `create_edge_function_secret`, mudança de config de auth/storage.
- Deploy de edge R2 (efeito externo) mesmo com código corrigido — merge sim, deploy só após `APROVADO`.
- Qualquer coisa que apague objeto (DROP), desabilite trigger/cron, ou mude arquitetura.

`APROVADO <IDs>` = aplicar exatamente o que está na PR, na ordem, sem reconfirmar. `APROVADO todos` = todas as PRs abertas em ordem de severidade.

### 6.2 Caminho obrigatório de toda correção
1. Liste PRs abertas do repo. PR aberta tocando os mesmos arquivos → pare e me avise; não trabalhe nela nem abra outra por cima.
2. Branch nova a partir de `main` atualizado: `claude/<fix|feat|chore>-<slug>-<AAMMDD-HHMM>`.
3. Mudança de banco → **sempre** como arquivo em `supabase/migrations/<timestamp>_<slug>.sql`, com `-- ROLLBACK:` ao final descrevendo a reversão. Nunca DDL "à mão" via `execute_sql` sem o arquivo correspondente.
4. Edge → código em `supabase/functions/<slug>/`; deploy sempre do que está na branch mergeada, nunca de código só local.
5. Teste em Postgres temporário com as migrations do repo quando houver DDL/function/policy/trigger; registre comando e saída. Sem Postgres local → `NÃO TESTADO` + roteiro na PR.
6. Typecheck/lint dos arquivos tocados quando o repo tiver (`deno check` para edge, `tsc --noEmit` para `types.ts`/cliente). Só erro introduzido por você conta.
7. Commit curto em PT-BR com prefixo (`fix:`, `feat:`, `chore:`), 1 commit atômico.
8. PR: título = o que muda; corpo = ID do achado, causa, o que foi verificado **de verdade** com a evidência, classe de escrita, rollback.
9. Classe AUTÔNOMA: squash-merge, apague a branch, aplique (deploy), **verifique** (log de 1 invocação, `query_logs`, `SELECT` em catálogo) e só então marque `concluído`. Classe APROVAÇÃO: PR aberta; a chamada é uma só, no fim da fase (6.1).
10. "Pronto" = PR mergeada **+** aplicado/deployado **+** comportamento verificado com evidência. Faltou um → diga em qual ponto parou.
11. Antes de cada push, confirme que o último commit da branch é seu. Não for → pare e me avise.
12. Achou outro bug no caminho → **não** conserte; registre como novo achado.

### 6.3 Funcionalidade pendente/parcial — critério de "pronta"
Integrada de ponta a ponta no que cabe ao Supabase: tabela/coluna existe **e** tem RLS/policies coerentes **e** índice nas FKs; function/trigger existe, versionada, chamada por quem deveria; edge publicada, versionada, invocada pelo cliente, com auth/validação/erro; cron agendado e versionado; bucket com policies; `types.ts` regenerado. Se o pedaço que falta é só de front (botão, tela) → entregue o lado Supabase e liste o que falta no front em "Fora do escopo encontrado", com arquivos. Nunca entregue "quase pronto" sem dizer o que falta.

---

## 7. Entregáveis em `auditoria-supabase/`

```
progresso.json                       # seção, status, motivo, turno — atualizado a cada seção
RELATORIO_AUDITORIA_SUPABASE.md      # resumo executivo (10 linhas), contagem por severidade,
                                     # achados completos (formato da seção 5),
                                     # matriz de drift (repo × aplicado × real × código),
                                     # matriz RLS (tabela × role × cmd),
                                     # funcionalidades pendentes/parciais com o que falta,
                                     # plano em ondas (B1 autônoma, B2 aprovação, B3 fora de escopo),
                                     # seção NÃO VERIFICADO com motivo e roteiro,
                                     # seção "Fora do escopo encontrado"
inventario/*.md                      # um por área (A.1), + baseline_antes.json / baseline_depois.json / diff
propostas/<ID>_<slug>.sql            # mesma migration da PR, com -- ROLLBACK; cabeçalho "NÃO APLICADA" até aplicar
testes/*.sql | *.sh                  # roteiros e saídas dos testes no Postgres temporário
correcoes.md                         # tabela: ID, PR (link), classe, estado (mergeada+aplicada / aguardando aprovação / CI vermelha e por quê), evidência de verificação
```

---

## 8. Comunicação no chat

- Resultado primeiro; só o que muda uma decisão minha. Sem introdução, sem recapitular, sem "vou fazer agora", sem lição de moral.
- A cada seção concluída: uma linha (`A.6 concluída — 7 crons, 2 achados ALTO (SB-0012, SB-0013)`).
- Não despeje saída de tool; cite a linha que importa. Caminhos e links completos.
- Destrutivo de verdade: uma linha (`isso apaga X, sem volta — confirma?`) e ponto.
- Pergunte só quando: custo (branch Supabase, compute), mudança de arquitetura, deleção, trade-off real de negócio, item de APROVAÇÃO, ou divergência de projeto. Para ler/inspecionar, nunca peça permissão.

---

## 9. META CUMPRIDA — só quando mostrar no chat, nesta ordem

1. `progresso.json` com as 13 seções `concluída` ou `NÃO VERIFICADO` + motivo.
2. Contagem de achados por severidade e por tipo.
3. Top 10 por severidade com a evidência **reexecutada** agora.
4. Lista de correções: PRs mergeadas+aplicadas+verificadas (evidência) / PRs aguardando `APROVADO` / falhas.
5. Diff `baseline_antes` × `baseline_depois` provando que em produção só mudou o que foi aprovado/autônomo (migrations, edges, crons, policies, functions, triggers, buckets).
6. `grep -rEi '(@[a-z0-9-]+\.[a-z]{2,}|\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|eyJ[A-Za-z0-9_-]{20,}|sk-|service_role)' auditoria-supabase/` sem resultado (ou só falsos positivos justificados).
7. Caminhos de todos os arquivos gerados.
8. Bloco final:

```
Próximos passos
1. [título] — [por quê, 1 linha] · [objeto/arquivo]
2. ...
3. ...
```
Exatamente 3, por impacto, derivados do que viu nesta sessão, executáveis por você via MCP. `1`, `1 e 3`, `APROVADO 2`, `todos` ou o bloco colado = executar na ordem, sem reconfirmar.
