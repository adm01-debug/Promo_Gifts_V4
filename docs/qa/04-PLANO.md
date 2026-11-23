# 04 · Plano de correção em 300 etapas

> Gerado pela auditoria somente-leitura de 2026-11-22/23 · commit base `ded84e9` · banco `doufsxqlfjyuvxuezpln`.
> Achados em `03-ACHADOS.md` · cobertura em `01-INVENTARIO.md` · cenários em `02-CENARIOS.md` · progresso em `05-PROGRESSO.md`.

---

## Instruções para o agente executor

Você vai executar este plano sem acesso a quem o escreveu. Tudo o que você precisa está aqui e no código.

**Regras que não se negociam:**

1. **Uma etapa por vez, na ordem, respeitando "Depende de".** Cada etapa em sua própria branch e sua própria PR.
   Nome da branch: `claude/<fix|feat|chore|infra>-<slug>-<AAMMDD-HHMM>`, criada a partir de `main` atualizado
   (regra do `AGENTS.md`). Uma tarefa = uma branch = uma PR.
2. **Antes de mudar qualquer coisa, releia a evidência da etapa no código atual.** Se o código já não corresponde ao
   que está descrito aqui (outro agente corrigiu, ou o arquivo mudou), **pare**, escreva no `05-PROGRESSO.md`
   "etapa NNN — evidência não corresponde: <o que encontrou>" e siga para a próxima etapa independente.
   Não adapte a etapa por conta própria.
3. **Corrija a causa raiz com a menor mudança possível.** Não refatore, não renomeie, não "melhore", não comente o
   que a etapa não pede. Não reescreva arquivo inteiro para mudar 3 linhas.
4. **Problema novo encontrado no caminho não é corrigido na hora.** Vira anotação no `05-PROGRESSO.md`, na seção
   "Achados novos", com arquivo:linha. Nunca "aproveitei e também…".
5. **Etapa marcada "Precisa de aprovação humana: sim" fica com a PR aberta, aguardando o dono.** Não mergeie.
   Isso vale para: migration ou DDL em produção, CI/workflows, segredos, infraestrutura, deleção de dado, mudança
   de arquitetura ou de custo. As demais você mergeia sozinho (squash, apagando a branch) com CI verde e sem conflito.
6. **Uma etapa só está concluída com a verificação executada e a evidência anotada.** "Deveria funcionar" não conclui
   etapa. Cole no `05-PROGRESSO.md` a saída do comando, da consulta ou do request que você rodou.
7. **Toda DDL nasce como arquivo em `supabase/migrations/`** com header `-- Rollback:` e vai a produção **só** pelo
   workflow `db-apply-migration.yml`. `supabase db push` e o MCP `apply_migration` são proibidos neste repo.
   O MCP `execute_sql` serve **só para ler**.
8. **Edge function faz deploy só pelo workflow `deploy-edge-functions.yml`.** Nunca pelo MCP.
9. **Não desligue, não pule e não coloque em allowlist nenhum teste ou gate para ficar verde.** Se um gate herdado de
   `main` estiver vermelho e não for culpa da sua mudança, anote no progresso e siga.
10. **Antes de abrir a PR:** `npm run qa:typecheck`, `npm run lint` e os testes dos arquivos que você tocou.
    Na auditoria, os dois primeiros estavam **verdes** (exit 0) no commit `ded84e9` — qualquer erro novo é seu.

**Como ler o campo "Caminho recomendado":** ele diz por onde começar, qual padrão **já existente no repo** seguir
(com o arquivo de referência) e qual atalho tentador evitar. O atalho quase sempre é o que parece óbvio e reabre o
problema por outro caminho.

**Quatro etapas dependem de uma etapa posterior.** Não é erro de numeração: a ordem das ondas é por risco, e em
quatro casos o pré-requisito técnico está numa onda mais adiante. Quando chegar nelas, pule e volte depois:

| Etapa | Espera por | Por quê |
|---|---|---|
| 011 (tornar `static-checks.yml` bloqueante) | 295 | Tornar o job bloqueante antes de resolver o atrito do gate de recibo travaria todas as PRs. |
| 083 (teto de desconto no banco) | 122 | O trigger de desconto e o de MOQ mexem na mesma tabela; a ordem evita conflito. |
| 106 (PDF usando o total do banco) | 109 | Se o trigger ainda grava o total errado, o PDF passaria a refletir o erro. |
| 112 (CHECK de desconto duplo) | 120 | O CHECK falha se houver linha violando; o relatório da 120 diz se há. |

Fora dessas quatro, a ordem numérica respeita todas as dependências.

**Antes de começar tudo:** liste as PRs abertas (`github_graphql`). Se houver PR aberta tocando os mesmos arquivos da
sua etapa, **pare e avise o dono** — não trabalhe nela nem abra outra por cima. Na data da auditoria havia 2 PRs
abertas: `#3993` (`scripts/drift-baseline.mjs`, gate E40) e `#3983` (release-please).

---

## Ondas

| Onda | Tema | Etapas |
|---|---|---|
| 1 | Segurança e risco de perda de dado | 001–062 |
| 2 | Fluxos principais quebrados | 063–092 |
| 3 | Integridade de dados, regras de negócio e a rede de teste | 093–148 |
| 4 | Funcionalidades incompletas | 149–176 |
| 5 | Robustez: erros, estados, concorrência | 177–226 |
| 6 | Performance | 227–246 |
| 7 | Experiência de uso e consistência | 247–268 |
| 8 | Higiene: código morto, CI, observabilidade | 269–300 |

---

# ONDA 1 · Segurança e risco de perda de dado (001–062)

## Bloco 1.A — Fechar o vazamento de custo ao público (ACH-001, ACH-002, ACH-003, ACH-004, ACH-005)

A ordem aqui importa: primeiro se mede quem consome, depois se fecha, depois se trava o gate. Fechar antes de medir
pode derrubar o app externo "Promo Supply V2"; travar o gate antes de fechar faz o CI ficar vermelho em cima de um
vazamento aberto.

<modelo_etapa>
Etapa 001 — Medir quem realmente consome as três views `v_compras_*` antes de mexer nelas
Onda / Severidade / Camada: 1 / Crítica / Banco
Achados resolvidos: ACH-001, ACH-002, ACH-004 (diagnóstico)
Problema hoje: as views `v_compras_catalogo`, `v_compras_precos_faixa` e `v_compras_precos_variante` entregam
`cost_price`/`unit_cost` a quem só tem a chave pública, e nenhum arquivo deste repo as consome
(`grep -rn "v_compras" src/ supabase/functions/` → zero). O `COMMENT ON VIEW` de `v_compras_catalogo` cita
`useCatalogoPim.ts`, que não existe aqui (`find . -name "useCatalogoPim*"` → vazio).
Causa raiz: as views foram criadas para um consumidor externo (bridge PIM → Promo Supply V2) e ninguém registrou
no repo quem é esse consumidor nem com que credencial ele chama.
Caminho recomendado: NÃO altere nada ainda. Colete evidência de uso real em produção, por leitura:
(a) `select * from pg_stat_user_tables where relname like 'v_compras%'` não serve para view — use
`pg_stat_statements`: `select calls, query from pg_stat_statements where query ilike '%v_compras%' order by calls desc limit 20`;
(b) nos logs da API, `query_logs` do MCP Supabase filtrando as três views, janela de 7 dias, para ver qual role chama
(`anon` ou `authenticated`) e de qual origem. Escreva o resultado em `docs/qa/evidencia-compras-views.md`.
Por que este caminho e não o óbvio: o óbvio é revogar o grant de `anon` agora. Se o app externo chamar com a chave
`anon`, isso derruba o bridge de compras em produção sem aviso. Medir primeiro custa uma etapa e evita um incidente.
Arquivos e objetos a tocar: cria `docs/qa/evidencia-compras-views.md`. Nenhum objeto de banco.
Não tocar / armadilhas: não mexa em `.security/public-views-columns.json` nesta etapa; não revogue grant; não
altere `security_invoker` (o repo já decidiu, com medição, que `security_invoker=true` quebra essas views — ver
cabeçalho de `supabase/migrations/20261122180000_restore_definer_views_p06_e_compras.sql`).
Depende de: — · Libera: 002, 003, 004, 005
Risco e como reverter: risco zero (só leitura). Reverter = apagar o arquivo.
Precisa de aprovação humana antes do merge: não
Como verificar: o arquivo `docs/qa/evidencia-compras-views.md` existe e responde, com saída colada: quantas chamadas
cada view recebeu em 7 dias, por qual role, e se há chamada de `anon`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 002 — Mascarar `cost_price` e os campos de fornecedor em `v_compras_catalogo`
Onda / Severidade / Camada: 1 / Crítica / Banco
Achados resolvidos: ACH-001
Problema hoje: `GET /rest/v1/v_compras_catalogo?select=*&limit=2` com a publishable key devolve HTTP 200 com
`cost_price: 4.34`, `supplier_name`, `supplier_code`, `supplier_reference`, `ipi_rate` (medido em 2026-11-22).
A view está com `security_invoker=false` e `anon` tem SELECT.
Causa raiz: a view projeta coluna de custo sem máscara, enquanto a superfície pública do repo já definiu que custo
é mascarado — `.security/public-views-columns.json` lista `cost_price` em `masked_null` de `v_products_public`, e
a medição confirma `"cost_price":null` lá.
Caminho recomendado: migration em `supabase/migrations/` que faz `CREATE OR REPLACE VIEW public.v_compras_catalogo`
mantendo exatamente a mesma lista de colunas (o contrato de colunas não pode mudar, senão o consumidor externo
quebra por coluna ausente) e trocando o valor de `cost_price`, `suggested_price`, `supplier_reference` e
`supplier_external_id` por `NULL::numeric` / `NULL::text` **quando o papel não for privilegiado**. Use o padrão que
`v_products_public` já usa para mascarar (leia a definição dela antes: ela é a referência deste repo). Mantenha
`security_invoker=false` e o `COMMENT ON VIEW`, atualizando o texto do comentário para dizer o que passou a ser
mascarado e por quê. Header `-- Rollback:` obrigatório, com o `CREATE OR REPLACE` da versão anterior.
Por que este caminho e não o óbvio: o óbvio é `revoke select on v_compras_catalogo from anon`. Isso fecha o
vazamento e **derruba** o consumidor externo se ele usa a chave `anon` (etapa 001 responde isso). Mascarar mantém o
contrato de colunas e tira o dado sensível — e é o padrão já adotado no repo.
Arquivos e objetos a tocar: nova migration em `supabase/migrations/`; view `public.v_compras_catalogo`;
`supabase/rollbacks/<versao>_rollback.sql`.
Não tocar / armadilhas: não ligue `security_invoker=true` — o repo mediu que isso devolve 401 nessas views
(`20261122180000`, cabeçalho). Não mude a ordem nem os nomes das colunas. Não toque nas outras duas views de compras
(etapas 003 e 004).
Depende de: 001 · Libera: 005, 006
Risco e como reverter: risco médio — se o consumidor externo precisar de `cost_price`, ele passa a receber `null`.
Reverter = aplicar o rollback da migration.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: `curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL/rest/v1/v_compras_catalogo?select=cost_price&limit=1" -H "apikey: <publishable>"`
→ 200, e o corpo deve trazer `"cost_price":null`. Esperado também: a lista de colunas da view continua idêntica
(`select count(*) from information_schema.columns where table_name='v_compras_catalogo'` → mesmo número de antes).
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 003 — Mascarar `unit_cost` em `v_compras_precos_faixa`
Onda / Severidade / Camada: 1 / Crítica / Banco
Achados resolvidos: ACH-002
Problema hoje: `GET /rest/v1/v_compras_precos_faixa?select=*&limit=2` com a publishable key → HTTP 200 com
`unit_cost: 150.15`, `handling_cost`, `service_code`, `table_code` (medido).
Causa raiz: mesma de 002 — view criada em `20261121183000_v_compras_precos_faixa.sql` projetando custo sem máscara.
Caminho recomendado: migration `CREATE OR REPLACE VIEW public.v_compras_precos_faixa` mantendo a lista de colunas e
mascarando `unit_cost` e `handling_cost` para papel não privilegiado, no mesmo padrão aplicado na etapa 002.
Atualize o `COMMENT ON VIEW`. Header `-- Rollback:`.
Por que este caminho e não o óbvio: idem 002 — revogar o grant derrubaria o consumidor externo.
Arquivos e objetos a tocar: nova migration; view `public.v_compras_precos_faixa`; rollback correspondente.
Não tocar / armadilhas: `unit_price` **não** é custo; não mascare. Não mexa em `security_invoker`.
Depende de: 002 · Libera: 005
Risco e como reverter: igual a 002.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: request com a publishable key em `?select=unit_cost&limit=1` → `"unit_cost":null`; contagem de
colunas da view inalterada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 004 — Decidir o destino de `v_compras_precos_variante`, que hoje responde 401 ao `anon`
Onda / Severidade / Camada: 1 / Alta / Banco
Achados resolvidos: ACH-003 (parcial), ACH-010
Problema hoje: `GET /rest/v1/v_compras_precos_variante` com a publishable key → **HTTP 401
`42501 permission denied for table suppliers`** (medido). A view existe, tem grant para `anon`, e não funciona:
ela lê `vw_variant_sale_prices`, que está com `security_invoker=true` e portanto roda como `anon`, batendo em
`suppliers`, que não tem grant de tabela para `anon`.
Causa raiz: `security_invoker` não cascateia, e a migration `20261122200000` tentou resolver concedendo grant nos
elos, mas o elo `vw_variant_sale_prices` continua em modo invoker.
Caminho recomendado: duas saídas, e a escolha depende da etapa 001. **Se não houver chamada real** a esta view em
7 dias: migration que faz `revoke select on public.v_compras_precos_variante from anon` e remove os grants que a
`20261122200000:65-67` abriu em `vw_variant_sale_prices`, `variant_supplier_sources`, `markup_configurations` e na
coluna `suppliers.default_markup_percent` — fecha superfície sem quebrar nada. **Se houver chamada real**: migration
que põe `vw_variant_sale_prices` em `security_invoker=false` (padrão do repo para a cadeia, igual ao que
`20261122200000` fez com `public.mv_product_compositions`) e mascara `unit_cost` na view de compras, como em 003.
Documente no corpo da migration qual das duas você escolheu e com que evidência.
Por que este caminho e não o óbvio: o óbvio é "só conceder o grant que falta em `suppliers`". Isso expõe a tabela
`suppliers` inteira ao `anon`, incluindo `api_credentials`, `email`, `phone` e `cnpj` — o próprio repo mediu e
rejeitou essa saída (`20261122180000`, seção "POR QUE A CORREÇÃO É VOLTAR PARA DEFINER").
Arquivos e objetos a tocar: nova migration; `public.v_compras_precos_variante` e/ou `public.vw_variant_sale_prices`
e os grants listados; rollback.
Não tocar / armadilhas: nunca conceda `grant select on table public.suppliers to anon`. Não apague a view sem a
etapa 001 ter respondido que ninguém a chama.
Depende de: 001 · Libera: 005
Risco e como reverter: baixo na saída "revogar" (hoje já responde 401, ninguém depende dela funcionando).
Reverter = rollback da migration.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: request com a publishable key → 403/401 coerente com a decisão documentada, **ou** 200 com
`"unit_cost":null`. Em qualquer caso, `has_table_privilege('anon','public.suppliers','select')` continua `false`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 005 — Fazer o gate de views públicas descobrir view nova em vez de conferir uma lista fixa
Onda / Severidade / Camada: 1 / Alta / CI + banco
Achados resolvidos: ACH-005
Problema hoje: `scripts/check-public-views-drift.mjs:72-81` tem a lista fixa `PUBLIC_VIEWS` com 8 nomes, e a consulta
em `:104-114` filtra `AND c.relname IN (${PUBLIC_VIEWS...})`. A checagem que pegaria uma view nova está em `:202`
(`if (!views[r.relname]) errors.push('view pública no banco sem entrada no contrato')`) e é **inalcançável**, porque
`liveRows` nunca pode conter uma view fora da lista. Foi assim que as três `v_compras_*` chegaram à produção com
`cost_price` aberto ao `anon` sem o CI reclamar.
Causa raiz: o gate valida o contrato contra si mesmo, não contra o banco.
Caminho recomendado: mude **só a consulta** em `:104-114` para descobrir, em vez de filtrar: selecione toda view e
matview de `public` em que `has_table_privilege('anon', c.oid, 'SELECT')` seja verdadeiro, sem o `IN (...)`.
Mantenha `PUBLIC_VIEWS` como está — ele continua servindo para `diffLive` acusar "view do contrato ausente no banco"
(`:178-181`). Com a consulta aberta, a linha `:202` passa a ser alcançável e o gate falha em view pública nova sem
entrada no contrato, que é o comportamento que o próprio arquivo já documenta no cabeçalho `:29-31`.
Atualize `tests/security/public-views-columns.test.ts` com um caso que injete uma `liveRow` fora do contrato e espere
erro — hoje o teste monta `live` a partir de `PUBLIC_VIEWS` (`:59,:70`) e por isso nunca exercita `:202`.
Por que este caminho e não o óbvio: o óbvio é acrescentar as três views de compras à lista `PUBLIC_VIEWS`. Isso
resolve as três de hoje e deixa o gate cego para a quarta. A causa raiz é a lista fixa, não a ausência de três nomes.
Arquivos e objetos a tocar: `scripts/check-public-views-drift.mjs` (só a constante `SQL`),
`tests/security/public-views-columns.test.ts`, e `.security/public-views-columns.json` para registrar as views de
compras com `masked_null` conforme as etapas 002–004.
Não tocar / armadilhas: não toque em `validateContractStructure` nem em `findUnacknowledgedSensitiveColumns` — eles
estão corretos. Cuidado: ao abrir a consulta, o gate vai acusar **todas** as views públicas ainda não contratadas de
uma vez; é esperado, e é por isso que esta etapa vem depois de 002–004.
Depende de: 002, 003, 004 · Libera: 006
Risco e como reverter: risco de CI vermelho até o contrato ficar completo. Reverter = `git revert` da PR.
Precisa de aprovação humana antes do merge: sim (mexe em gate de CI)
Como verificar: `node scripts/check-public-views-drift.mjs --require-live` → exit 0 com o contrato atualizado. E
`npx vitest run tests/security/public-views-columns.test.ts` → o novo caso de view fora do contrato falha quando
deveria falhar.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 006 — Registrar as três views de compras no contrato de views públicas
Onda / Severidade / Camada: 1 / Alta / CI
Achados resolvidos: ACH-001, ACH-002, ACH-005
Problema hoje: `.security/public-views-columns.json` cobre 8 views ("as 8 views SECURITY DEFINER expostas ao anon").
As três `v_compras_*`, criadas em 2026-11-21/22 e expostas ao `anon`, não estão lá — logo não têm contrato de
colunas, não têm `masked_null` e não entram em `sensitive_acknowledged`.
Causa raiz: o contrato foi escrito como fotografia de 2026-09 e não acompanhou as views novas.
Caminho recomendado: acrescente as três views ao `views` do JSON com: a lista exata de colunas (consulte
`information_schema.columns`), `masked_null` com as colunas que as etapas 002–004 mascararam, e
`sensitive_acknowledged` para o que bater no padrão sensível e ficar sem máscara por decisão (com `status` e `note`,
como as entradas de `v_products_public` já fazem). Atualize também o `$comment` do arquivo, que hoje diz "8 views".
Por que este caminho e não o óbvio: o óbvio é marcar tudo como `ACEITO` em `sensitive_acknowledged` para o gate
passar. `ACEITO` é só para nome que bate no padrão mas não é valor sensível (ex.: flag booleana `custo_*`). Custo de
compra real é `REQUER-PO` até o dono decidir, ou máscara.
Arquivos e objetos a tocar: `.security/public-views-columns.json`.
Não tocar / armadilhas: não altere as entradas das 8 views existentes; `v_products_public` tem 3 itens
`REQUER-PO` (`ncm_code`, `ncm_id`, `bitrix_product_id`) que são decisão pendente do dono, não erro.
Depende de: 002, 003, 004 · Libera: 005
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: `node scripts/check-public-views-drift.mjs --require-live` → exit 0, e o resumo deve citar 11 views
(8 + 3) em vez de 8.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 007 — Fechar `tabela_preco_gravacao_oficial_faixa` ao anônimo
Onda / Severidade / Camada: 1 / Alta / Banco
Achados resolvidos: ACH-003
Problema hoje: 952 linhas com `preco_unitario` legíveis por `anon` — a tabela tem grant para `anon` e policy de
SELECT com `qual = true` (as duas pontas consultadas no catálogo).
Causa raiz: a tabela oficial de preço de gravação foi aberta ao papel público, provavelmente para servir a view
`v_tabela_preco_gravacao_oficial_public`, que já existe e já é a superfície pública contratada.
Caminho recomendado: migration que revoga `select` de `anon` na **tabela** e mantém a view pública
`v_tabela_preco_gravacao_oficial_public` como único caminho (ela é `security_invoker=false`, roda como owner e por
isso continua funcionando sem o grant na tabela). Antes de revogar, confirme por leitura que nenhum ponto do front
consulta a tabela direto: `grep -rn "tabela_preco_gravacao_oficial_faixa" src/`.
Por que este caminho e não o óbvio: o óbvio é trocar a policy `true` por uma condição. A policy não é o problema —
o grant é: com a view `SECURITY DEFINER` já no ar, o `anon` não precisa de acesso nenhum à tabela.
Arquivos e objetos a tocar: nova migration; grants de `public.tabela_preco_gravacao_oficial_faixa`; rollback.
Não tocar / armadilhas: não apague nem altere a view `v_tabela_preco_gravacao_oficial_public` — ela está no
contrato `.security/public-views-columns.json` e o repo mediu que ligar `security_invoker` nela a quebra.
Depende de: — · Libera: —
Risco e como reverter: médio-baixo; se alguma tela consultar a tabela direto, ela passa a receber 401 — o grep
acima é o que previne. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: `curl` com a publishable key em `/rest/v1/tabela_preco_gravacao_oficial_faixa?select=*&limit=1` →
401/403; e em `/rest/v1/v_tabela_preco_gravacao_oficial_public?select=*&limit=1` → continua 200.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 008 — Fazer o gate de drift rodar também sobre matviews e sobre grants de tabela ao `anon`
Onda / Severidade / Camada: 1 / Média / CI
Achados resolvidos: ACH-003, ACH-005, ACH-057
Problema hoje: mesmo com a etapa 005, o gate só olha `relkind = 'v'`. Matviews e **tabelas** com grant direto a
`anon` (o caso do ACH-003) continuam fora de qualquer gate.
Causa raiz: o contrato foi desenhado para views, e a superfície pública real inclui tabela e matview.
Caminho recomendado: na mesma consulta aberta na etapa 005, inclua `relkind in ('v','m','r')` e emita erro de
categoria separada quando o objeto for `r` (tabela) ou `m` (matview) com SELECT para `anon` e não estiver numa
allowlist nova no JSON do contrato (ex.: `anon_tables_allowed`). Popule a allowlist com o que existir hoje e estiver
decidido, para o gate entrar verde, e deixe no `note` de cada item quem decidiu.
Por que este caminho e não o óbvio: o óbvio é abrir um gate novo. Um gate novo precisa entrar no ruleset para
bloquear (ver etapa 009) e hoje isso é o furo do repo; aproveitar um gate que **já** é verificado é mais barato.
Arquivos e objetos a tocar: `scripts/check-public-views-drift.mjs`, `.security/public-views-columns.json`,
`tests/security/public-views-columns.test.ts`.
Não tocar / armadilhas: 65 objetos estão visíveis ao `anon` hoje (ACH-057) — não tente fechar todos nesta etapa;
o objetivo é **parar de crescer sem decisão**, não zerar.
Depende de: 005, 006 · Libera: —
Risco e como reverter: CI vermelho se a allowlist inicial ficar incompleta. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (gate de CI)
Como verificar: `node scripts/check-public-views-drift.mjs --require-live` → exit 0 com a allowlist inicial; e, num
teste, uma linha simulada de tabela com grant a `anon` fora da allowlist produz erro.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 1.B — Fazer os gates de CI bloquearem de verdade (ACH-006, ACH-007, ACH-008, ACH-011)

<modelo_etapa>
Etapa 009 — Tornar o guarda de required checks capaz de ver mais de um check
Onda / Severidade / Camada: 1 / Crítica / CI
Achados resolvidos: ACH-006
Problema hoje: `.github/workflows/required-checks-guard.yml:75` lê `jq '.required_checks[0].name'` — só o primeiro
item de `.github/required-checks.json`. Os outros dois declarados nunca são conferidos.
Causa raiz: o guarda foi escrito para um check e o arquivo cresceu para três.
Caminho recomendado: troque a leitura por iteração sobre todos os itens (`jq -r '.required_checks[].name'`) e faça o
step falhar se **qualquer** nome declarado não estiver no ruleset real de `main`. Compare com o ruleset via API
(`/repos/{owner}/{repo}/rules/branches/main`), não com a API legada de branch protection — o repo usa ruleset.
Por que este caminho e não o óbvio: o óbvio é remover o CodeQL do JSON para o guarda ficar coerente. Isso esconde o
problema: o dono acha que o CodeQL bloqueia.
Arquivos e objetos a tocar: `.github/workflows/required-checks-guard.yml`.
Não tocar / armadilhas: não altere `.github/required-checks.json` nesta etapa — a etapa 010 decide o conteúdo dele.
Depende de: — · Libera: 010
Risco e como reverter: o guarda passa a falhar enquanto o ruleset estiver incompleto (é o ponto). Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (workflow)
Como verificar: rode o workflow em dispatch e confira que o log cita os três nomes do JSON, não um; e que ele falha
nomeando `Analyze (javascript-typescript)` como ausente do ruleset.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 010 — Pôr o CodeQL de fato como check obrigatório de `main`
Onda / Severidade / Camada: 1 / Crítica / CI
Achados resolvidos: ACH-006
Problema hoje: o ruleset de `main` exige um único check — `Gate Final - Deploy Ready`. `Analyze (javascript-typescript)`
mora em `codeql.yml`, workflow separado, e não entra em nenhum `needs:` do Gate Final. PR com vulnerabilidade
HIGH/CRITICAL pode ser mergeada.
Causa raiz: o repo centraliza o bloqueio em um job agregador e o CodeQL ficou fora tanto do agregador quanto do ruleset.
Caminho recomendado: duas saídas; prefira a primeira porque segue o padrão já usado pelo gitleaks neste repo (o job
`secret-scan` entra em `needs:` do `deploy-ready` e por isso bloqueia): (a) acrescente o job do CodeQL ao `needs:`
do `Gate Final - Deploy Ready`, cuidando de `if: always()` + checagem explícita de `result` para não mascarar falha;
(b) ou acrescente `Analyze (javascript-typescript)` ao ruleset. A saída (a) é feita por PR; a (b) exige mexer em
configuração do GitHub pelo dono. Deixe a PR aberta com a opção (a) implementada e explique a (b) no corpo.
Por que este caminho e não o óbvio: o óbvio é marcar o check como required direto no GitHub. Funciona, mas o repo
deixa de ter o fato versionado — e foi a falta disso que criou o furo.
Arquivos e objetos a tocar: `.github/workflows/deploy-gates.yml` (job `deploy-ready`), e `.github/required-checks.json`
se o nome do check mudar.
Não tocar / armadilhas: `if: always()` sem conferir `result` transforma o gate em enfeite — é exatamente o erro que
este plano está corrigindo em outros pontos.
Depende de: 009 · Libera: 011
Risco e como reverter: PRs passam a travar em achado de CodeQL. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (workflow + configuração do repositório)
Como verificar: `github_get_branch_rules` para `main` deve listar o check; e uma PR de teste com alerta de CodeQL
deve ficar bloqueada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 011 — Fazer `static-checks.yml` bloquear merge
Onda / Severidade / Camada: 1 / Alta / CI
Achados resolvidos: ACH-007
Problema hoje: o job `Static checks (consolidado)` roda 10+ gates reais (`check-no-prod-leak`, `check-select-columns`
contra `types.ts`, `actionlint`, `shellcheck`, detector de ghost required checks, recibo de migration) e não está em
`.github/required-checks.json`, nem no ruleset, nem em `needs:` do `deploy-ready`.
Causa raiz: o job foi criado fora do agregador que bloqueia.
Caminho recomendado: acrescente o job ao `needs:` do `Gate Final - Deploy Ready`, mesmo padrão do `secret-scan`.
Rode primeiro o job em `main` como está para saber se ele está verde hoje; se estiver vermelho por herança, abra a
anotação no progresso e **não** mergeie esta etapa antes de a herança ser resolvida — bloquear com gate vermelho
trava o repositório inteiro.
Por que este caminho e não o óbvio: o óbvio é declarar o check no `required-checks.json` e pronto. O JSON é
documentação; quem bloqueia é o ruleset, e o ruleset só conhece o agregador.
Arquivos e objetos a tocar: `.github/workflows/deploy-gates.yml`, `.github/required-checks.json`.
Não tocar / armadilhas: cuidado com o gate de recibo de migration dentro deste job — ele é o ACH-067 e trava toda PR
do repo 24 h após cada migration. Resolva a etapa 295 **antes** de tornar este job bloqueante, ou o atrito explode.
Depende de: 009, 295 · Libera: —
Risco e como reverter: alto risco de travar PRs se o job não estiver estável. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (workflow)
Como verificar: abra uma PR de teste que viole `check-no-prod-leak` e confirme que o merge fica bloqueado.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 012 — Tirar `docs/`, `tests/` e `e2e/` da allowlist do gitleaks
Onda / Severidade / Camada: 1 / Alta / CI + segurança
Achados resolvidos: ACH-008
Problema hoje: `[allowlist] paths` de `.gitleaks.toml` isenta `docs/.*`, `audit/.*`, `tests/.*`, `e2e/.*`, `dist/.*`,
`analise-prs/.*` e `src/.*__tests__.*`. Segredo colado em `docs/` passa verde no único gate de segredo que bloqueia.
Causa raiz: a allowlist por diretório foi usada para silenciar ruído de fixture em vez de allowlist por regra ou por
achado específico.
Caminho recomendado: remova `docs/.*`, `audit/.*`, `analise-prs/.*` e `tests/.*`/`e2e/.*`/`src/.*__tests__.*` da
allowlist de paths. Rode `gitleaks detect --no-git` localmente e trate o ruído que aparecer **item por item**: se é
fixture, acrescente o `fingerprint` do achado à allowlist (gitleaks suporta `[[allowlist.regexes]]` e lista de
fingerprints), que é específico e não cega o diretório inteiro. Mantenha `dist/.*` (artefato de build).
Por que este caminho e não o óbvio: o óbvio é manter a allowlist e "confiar" que ninguém cola segredo em docs. O
ACH-012 deste repo é exatamente a história de um segredo que entrou e foi silenciado por allowlist.
Arquivos e objetos a tocar: `.gitleaks.toml`.
Não tocar / armadilhas: não mexa no bloco `commits = [...]` nesta etapa — ele é o ACH-012 e tem etapa própria (015).
Esperado: ruído inicial. Não reverta a mudança por causa do ruído; trate por fingerprint.
Depende de: — · Libera: 013
Risco e como reverter: CI vermelho até o ruído ser tratado. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (segredos/CI)
Como verificar: `gitleaks detect --no-git --config .gitleaks.toml` → exit 0; e um arquivo de teste com uma chave
falsa em `docs/` passa a ser detectado (remova o arquivo depois).
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 013 — Fazer o gate de segredo varrer o histórico, não só a árvore de trabalho
Onda / Severidade / Camada: 1 / Alta / CI + segurança
Achados resolvidos: ACH-008, ACH-012
Problema hoje: o gate roda `gitleaks` com `--no-git`, então varre só os arquivos como estão. O bloco
`commits = [...]` do `.gitleaks.toml`, que existe justamente para tratar achados de histórico, é configuração morta
para esse comando.
Causa raiz: a flag `--no-git` foi escolhida por desempenho e tornou o `commits` inútil.
Caminho recomendado: acrescente um segundo step no mesmo job, rodando `gitleaks detect` **sem** `--no-git` com
`--log-opts` limitado ao range da PR (`origin/main..HEAD`), que é barato e pega segredo introduzido pela própria PR.
Mantenha o step `--no-git` existente para a árvore. Não varra o histórico inteiro no CI de PR — isso é lento e já
tem resposta conhecida (ACH-012).
Por que este caminho e não o óbvio: o óbvio é tirar `--no-git` do step existente. Aí o CI passa a varrer 3.000+
commits em toda PR e o tempo de gate explode; pior, ele falha sempre, porque o histórico tem os 7 commits do ACH-012.
Arquivos e objetos a tocar: o workflow que roda o `secret-scan` (`.github/workflows/`, job `secret-scan`).
Não tocar / armadilhas: o range `origin/main..HEAD` precisa de `fetch-depth: 0` no checkout — confira antes.
Depende de: 012 · Libera: —
Risco e como reverter: tempo de CI maior. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (workflow)
Como verificar: numa PR de teste, comite uma chave falsa, confirme que o novo step falha, e remova o commit.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 014 — Estender `check-production-harnesses.mjs` a `/__visual/` e aos 9 harnesses de `AppRoutes.tsx`
Onda / Severidade / Camada: 1 / Média / CI
Achados resolvidos: ACH-011
Problema hoje: `scripts/check-production-harnesses.mjs:5-15` não cobre o prefixo `/__visual/`, os 9 harnesses
declarados em `AppRoutes.tsx` nem `OptimizedImageDemo`. Hoje não há brecha (todos são gated por
`import.meta.env.DEV`), mas um harness novo passa verde.
Causa raiz: a lista de prefixos e de arquivos do gate é fixa e ficou para trás.
Caminho recomendado: troque a lista fixa por descoberta: varra `src/pages/dev/`, `src/pages/__visual/` e todas as
rotas cujo caminho comece com `/__`, e exija que cada uma esteja atrás de `import.meta.env.DEV`. Mantenha a
verificação que já existe para o bundle de produção.
Por que este caminho e não o óbvio: o óbvio é acrescentar `/__visual/` à lista. Mesma armadilha da etapa 005 — lista
fixa resolve o caso de hoje e deixa o gate cego para o próximo.
Arquivos e objetos a tocar: `scripts/check-production-harnesses.mjs` e seu teste, se houver.
Não tocar / armadilhas: não remova nenhum harness; eles são usados pelos testes visuais do Playwright
(`npm run e2e:dialogs`, `e2e:calendar`, etc.).
Depende de: — · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: `node scripts/check-production-harnesses.mjs` → exit 0; e, criando temporariamente uma rota
`/__teste-falso` sem o gate de DEV, o script deve falhar.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 1.C — O `service_role` vazado no histórico (ACH-012)

<modelo_etapa>
Etapa 015 — Levantar o alcance da chave `service_role` vazada e preparar a rotação
Onda / Severidade / Camada: 1 / Crítica / Segurança
Achados resolvidos: ACH-012
Problema hoje: `.gitleaks.toml` tem 7 commits em `commits = [...]` anotados pelo próprio repo como `[ROTACIONAR]` /
"service_role hardcoded — rotacao pendente E001". `PENDENCIAS.md:1049` (§53.4) registra que é "a pendência mais
antiga desta frente". A chave continua extraível do histórico, que é imutável.
Causa raiz: o vazamento foi tratado silenciando o detector em vez de rotacionar a credencial.
Caminho recomendado: esta etapa **não** rotaciona nada. Produza `docs/qa/rotacao-service-role.md` com: (a) a lista
dos 7 commits (hash e data, **sem valor de chave**); (b) todo lugar que consome `SUPABASE_SERVICE_ROLE_KEY` hoje —
GitHub Secrets (`github_list_actions_secrets`, só nomes), secrets de edge function
(`docs/contexto/supabase/edge-functions.md` lista nomes), variáveis da Vercel e `docs/ci/SEGREDOS.md`; (c) a ordem
de troca que não derruba produção. Nenhum valor de segredo entra neste arquivo nem em resposta nenhuma.
Por que este caminho e não o óbvio: o óbvio é rotacionar primeiro. Rotacionar sem o inventário derruba edge
functions e workflows que ainda usam a chave antiga — e o incidente vira pior que o vazamento.
Arquivos e objetos a tocar: cria `docs/qa/rotacao-service-role.md`.
Não tocar / armadilhas: nunca cole valor de chave em arquivo, commit, PR ou resposta. Não remova as entradas de
`commits = [...]` ainda (etapa 018).
Depende de: — · Libera: 016, 017, 018
Risco e como reverter: zero (documento). Reverter = apagar o arquivo.
Precisa de aprovação humana antes do merge: sim (segredo)
Como verificar: o arquivo lista os 7 commits, todos os consumidores por nome, e a ordem de troca; `gitleaks` não
acusa nada de novo no arquivo criado.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 016 — Rotacionar a chave `service_role` do projeto de produção
Onda / Severidade / Camada: 1 / Crítica / Segurança / infraestrutura
Achados resolvidos: ACH-012
Problema hoje: a chave atual é a mesma que está no histórico git.
Causa raiz: idem 015.
Caminho recomendado: pela ordem do documento da etapa 015: gere a nova chave no painel do Supabase, atualize
**primeiro** os consumidores (GitHub Secrets, secrets de edge via `supabase secrets set` ou painel, variáveis da
Vercel), confirme cada consumidor funcionando, e só então revogue a antiga. Nenhuma dessas trocas vai para o
código — o `AGENTS.md` proíbe segredo em migration e em código.
Por que este caminho e não o óbvio: o óbvio é revogar a antiga primeiro "para fechar rápido". Isso derruba cron,
webhook e edge functions ao mesmo tempo, em produção.
Arquivos e objetos a tocar: nenhum arquivo do repo. Painel Supabase, GitHub Secrets, variáveis Vercel.
Não tocar / armadilhas: `contexto.yml` **não** usa `SUPABASE_SERVICE_ROLE_KEY` por decisão registrada (Gate E89) —
não acrescente a chave lá "para padronizar".
Depende de: 015 · Libera: 017, 018
Risco e como reverter: alto se a ordem for invertida. Reverter = voltar o valor antigo nos consumidores enquanto a
chave antiga não tiver sido revogada.
Precisa de aprovação humana antes do merge: sim (segredo e infraestrutura)
Como verificar: depois da troca, uma edge function que usa a chave responde 200 (ex.: um `GET` de health autenticado),
e `cron.job_run_details` das últimas 2 horas não mostra falha nova; a chave antiga, se testada, responde 401.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 017 — Conferir no banco se a chave vazada foi usada
Onda / Severidade / Camada: 1 / Alta / Banco
Achados resolvidos: ACH-012
Problema hoje: ninguém sabe se a chave vazada chegou a ser usada por terceiro.
Causa raiz: não houve investigação de uso depois do vazamento.
Caminho recomendado: por leitura, levante indício de acesso com `service_role` fora dos horários e origens
esperadas: `query_logs` do MCP Supabase (role `service_role`, janela máxima disponível), `admin_audit_log`,
`audit_log` e `access_blocked_log`. Registre o resultado em `docs/qa/rotacao-service-role.md`, inclusive quando for
"nada anômalo encontrado" — negativo também é evidência.
Por que este caminho e não o óbvio: o óbvio é pular esta etapa porque a chave já foi rotacionada. Se houve uso, há
obrigação de LGPD a cumprir (`docs/LGPD.md`), e isso é decisão do dono, não do agente.
Arquivos e objetos a tocar: `docs/qa/rotacao-service-role.md`.
Não tocar / armadilhas: logs do Supabase têm retenção limitada — se a janela não cobrir a data do commit vazado,
diga isso explicitamente em vez de concluir "não houve uso".
Depende de: 015 · Libera: —
Risco e como reverter: zero. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (achado pode acionar LGPD)
Como verificar: o documento traz a janela coberta pelos logs, as consultas rodadas e o veredito, com a ressalva de
retenção quando houver.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 018 — Limpar as entradas `[ROTACIONAR]` do `.gitleaks.toml` depois da rotação
Onda / Severidade / Camada: 1 / Média / CI
Achados resolvidos: ACH-012
Problema hoje: enquanto as 7 entradas estiverem no `commits = [...]` com a anotação `[ROTACIONAR]`, o repo carrega
uma dívida aberta e qualquer pessoa que ler o arquivo sabe onde procurar a chave.
Causa raiz: a allowlist era o paliativo; feita a rotação, ela perde a razão de existir.
Caminho recomendado: remova as 7 entradas e troque a anotação por um comentário curto dizendo que a chave foi
rotacionada, com a data e o link da PR da etapa 016 — sem hash de commit e sem valor. Rode o gate para garantir que
nada ficou vermelho.
Por que este caminho e não o óbvio: o óbvio é deixar as entradas "por segurança". Elas apontam o caminho do
vazamento para quem lê o repositório.
Arquivos e objetos a tocar: `.gitleaks.toml`, `PENDENCIAS.md` (§53.4, marcar como resolvida).
Não tocar / armadilhas: só faça esta etapa depois de a 016 estar confirmada; antes disso, a allowlist é o que
mantém o CI verde.
Depende de: 016 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (segredos)
Como verificar: `gitleaks detect --no-git --config .gitleaks.toml` → exit 0; `grep -c ROTACIONAR .gitleaks.toml` → 0.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 1.D — Isolamento por empresa: as 23 policies tautológicas (ACH-013)

As seis tabelas são corrigidas uma por etapa, de propósito: cada uma é uma migration pequena, verificável sozinha,
e um erro em uma não bloqueia as outras.

<modelo_etapa>
Etapa 019 — Provar a tautologia e escrever o teste que falha antes da correção
Onda / Severidade / Camada: 1 / Alta / Banco
Achados resolvidos: ACH-013
Problema hoje: 23 policies em `attribute_definitions`, `attribute_groups`, `material_types`, `material_variations`,
`supplier_attribute_definitions` e `supplier_materials` usam
`organization_id IN (SELECT attribute_definitions.organization_id FROM profiles WHERE profiles.id = auth.uid())`.
A subquery seleciona a coluna da tabela externa → `X IN (X)` → sempre verdadeiro.
Causa raiz: referência correlacionada acidental — faltou qualificar a coluna com `profiles.`.
Caminho recomendado: não corrija ainda. Escreva um teste de RLS que, para cada uma das 6 tabelas, afirme que uma
linha de outra organização **não** é visível. Siga o padrão de teste de RLS que já existe no repo (procure em
`tests/` por testes que usam `set local role` / `set request.jwt.claims`; a edge `rls-integration-tests` também é
referência de como o repo exercita RLS). O teste deve **falhar** agora — é a prova de que o problema existe e o
sinal de que as etapas 020–025 funcionaram.
Por que este caminho e não o óbvio: o óbvio é corrigir as 23 policies de uma vez e confiar. Com 1 organização em
produção, nada observável muda — sem teste, ninguém consegue dizer se a correção pegou.
Arquivos e objetos a tocar: novo arquivo de teste em `tests/security/`.
Não tocar / armadilhas: o teste não pode criar organização nem linha em produção; use transação revertida ou o
ambiente de teste do repo.
Depende de: — · Libera: 020, 021, 022, 023, 024, 025, 026
Risco e como reverter: zero. Reverter = apagar o teste.
Precisa de aprovação humana antes do merge: não
Como verificar: `npx vitest run tests/security/<novo>.test.ts` → **falha**, nomeando as 6 tabelas. Cole a saída.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 020 — Corrigir as policies tautológicas de `attribute_definitions`
Onda / Severidade / Camada: 1 / Alta / Banco
Achados resolvidos: ACH-013
Problema hoje: as policies da tabela usam `organization_id IN (SELECT attribute_definitions.organization_id FROM profiles WHERE profiles.id = auth.uid())`, que é sempre verdadeiro.
Causa raiz: coluna não qualificada na subquery, virando referência correlacionada à tabela externa.
Caminho recomendado: migration que recria as policies da tabela trocando a subquery pelo padrão de escopo por
organização que o repo já usa com `user_organizations` — leia `products_update` como referência antes de escrever.
Mantenha os mesmos nomes de policy, os mesmos comandos e o mesmo `WITH CHECK`; muda só a condição.
Por que este caminho e não o óbvio: o óbvio é qualificar a coluna (`profiles.organization_id`). Isso conserta a
tautologia e passa a confiar em `profiles.organization_id`, que é **autoeditável pelo próprio usuário** (ACH-020) —
troca um furo por outro. `user_organizations` não é editável pelo dono da conta.
Arquivos e objetos a tocar: nova migration; policies de `public.attribute_definitions`; rollback.
Não tocar / armadilhas: não aponte para `profiles`. Não mude a tabela nem adicione coluna.
Depende de: 019 · Libera: 026
Risco e como reverter: com 1 organização em produção, o efeito prático é nulo hoje; o risco é errar a condição e
zerar a leitura. Reverter = rollback da migration.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: o teste da etapa 019 passa a aceitar `attribute_definitions`; e um `select count(*)` como usuário
autenticado da organização existente continua devolvendo o mesmo número de antes.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 021 — Corrigir as policies tautológicas de `attribute_groups`
Onda / Severidade / Camada: 1 / Alta / Banco
Achados resolvidos: ACH-013
Problema hoje: mesma forma tautológica da etapa 020, nesta tabela.
Causa raiz: idem 020.
Caminho recomendado: repita exatamente o que a etapa 020 fez, usando a migration da 020 como modelo — inclusive os
nomes de policy preservados. Uma migration por tabela.
Por que este caminho e não o óbvio: idem 020 — não aponte para `profiles`.
Arquivos e objetos a tocar: nova migration; policies de `public.attribute_groups`; rollback.
Não tocar / armadilhas: não junte esta migration com a da 020 "para economizar" — uma tabela por PR mantém a
reversão cirúrgica.
Depende de: 020 · Libera: 026
Risco e como reverter: igual a 020.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: o teste da 019 passa a aceitar `attribute_groups`; contagem como usuário da organização inalterada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 022 — Corrigir as policies tautológicas de `material_types`
Onda / Severidade / Camada: 1 / Alta / Banco
Achados resolvidos: ACH-013
Problema hoje: mesma forma tautológica, nesta tabela. Agravante: `material_types` também aparece na lista de
policies de SELECT com `USING (true)` (ACH-056), com 94 linhas e grant a `anon`.
Causa raiz: idem 020.
Caminho recomendado: corrija a tautologia como na 020 e, no mesmo arquivo, deixe explícito no comentário da policy
que a leitura pública de `material_types` é intencional (é catálogo de referência) **ou** feche — decida olhando se
o front consulta a tabela sem login (`grep -rn "material_types" src/`).
Por que este caminho e não o óbvio: o óbvio é só trocar a condição e ignorar o grant de `anon`. Aqui as duas coisas
convivem na mesma tabela e tratar junto evita uma segunda migration na mesma tabela depois.
Arquivos e objetos a tocar: nova migration; policies de `public.material_types`; rollback.
Não tocar / armadilhas: se o catálogo público usa `material_types` sem login, fechar quebra o filtro de material na
vitrine. Verifique com o grep antes.
Depende de: 020 · Libera: 026
Risco e como reverter: médio — pode afetar filtro público. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: teste da 019 aceita `material_types`; e `curl` com a publishable key no filtro de material da
vitrine continua respondendo como antes.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 023 — Corrigir as policies tautológicas de `material_variations`
Onda / Severidade / Camada: 1 / Alta / Banco
Achados resolvidos: ACH-013
Problema hoje: mesma forma tautológica, nesta tabela.
Causa raiz: idem 020.
Caminho recomendado: repita o padrão da etapa 020.
Por que este caminho e não o óbvio: idem 020.
Arquivos e objetos a tocar: nova migration; policies de `public.material_variations`; rollback.
Não tocar / armadilhas: idem 021.
Depende de: 020 · Libera: 026
Risco e como reverter: igual a 020.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: teste da 019 aceita `material_variations`; contagem inalterada para a organização existente.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 024 — Corrigir as policies tautológicas de `supplier_attribute_definitions`
Onda / Severidade / Camada: 1 / Alta / Banco
Achados resolvidos: ACH-013
Problema hoje: mesma forma tautológica, nesta tabela.
Causa raiz: idem 020.
Caminho recomendado: repita o padrão da etapa 020. Atenção: tabela de fornecedor — confira se o escopo correto é
organização ou fornecedor antes de escrever a condição; leia as policies de `suppliers` como referência.
Por que este caminho e não o óbvio: copiar a condição de `attribute_definitions` sem conferir o escopo pode trocar
tautologia por regra errada.
Arquivos e objetos a tocar: nova migration; policies de `public.supplier_attribute_definitions`; rollback.
Não tocar / armadilhas: não confunda escopo de fornecedor com escopo de organização.
Depende de: 020 · Libera: 026
Risco e como reverter: igual a 020.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: teste da 019 aceita a tabela; contagem inalterada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 025 — Corrigir as policies tautológicas de `supplier_materials`
Onda / Severidade / Camada: 1 / Alta / Banco
Achados resolvidos: ACH-013
Problema hoje: mesma forma tautológica, nesta tabela.
Causa raiz: idem 020.
Caminho recomendado: repita o padrão da etapa 020, com o mesmo cuidado de escopo da etapa 024.
Por que este caminho e não o óbvio: idem 024.
Arquivos e objetos a tocar: nova migration; policies de `public.supplier_materials`; rollback.
Não tocar / armadilhas: idem 024.
Depende de: 020 · Libera: 026
Risco e como reverter: igual a 020.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: teste da 019 aceita a tabela; contagem inalterada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 026 — Confirmar que nenhuma policy tautológica sobrou no banco
Onda / Severidade / Camada: 1 / Alta / Banco
Achados resolvidos: ACH-013
Problema hoje: as 23 policies foram identificadas por padrão de texto; pode haver outras com a mesma forma em
tabelas que a auditoria não listou.
Causa raiz: a forma `X IN (SELECT <mesma_tabela>.X FROM ...)` é fácil de reproduzir por copiar-e-colar.
Caminho recomendado: consulta de leitura em `pg_policies` procurando, no `qual` e no `with_check`, o padrão em que o
nome da tabela da policy aparece dentro de um `SELECT ... FROM` de outra tabela. Rode, registre o resultado no
progresso e, se aparecer tabela nova, anote como achado novo (regra 4) em vez de corrigir aqui.
Por que este caminho e não o óbvio: o óbvio é confiar na lista de 6 tabelas. O padrão é contagioso; medir fecha o grupo.
Arquivos e objetos a tocar: nenhum (só leitura) + anotação no `05-PROGRESSO.md`.
Não tocar / armadilhas: não corrija tabela nova nesta etapa.
Depende de: 020, 021, 022, 023, 024, 025 · Libera: 027
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: a consulta devolve 0 linhas para as 6 tabelas corrigidas; e o teste da etapa 019 passa inteiro.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 027 — Gate que detecta policy tautológica em migration nova
Onda / Severidade / Camada: 1 / Média / CI
Achados resolvidos: ACH-013
Problema hoje: nada impede que a próxima migration reintroduza `X IN (SELECT <mesma_tabela>.X ...)`.
Causa raiz: não existe verificação estática sobre o SQL das migrations quanto a esse padrão.
Caminho recomendado: script novo em `scripts/` que varre os arquivos de `supabase/migrations/` tocados pela PR,
procura `CREATE POLICY`/`ALTER POLICY` e falha quando, dentro do `USING`/`WITH CHECK`, houver `SELECT` cujo `FROM`
não contenha a tabela cuja coluna está sendo projetada. Siga a forma dos outros gates (`scripts/check-*.mjs`:
exportam função, têm teste, imprimem resumo e usam o status padronizado). Pendure no job `Static checks`.
Por que este caminho e não o óbvio: o óbvio é confiar na revisão humana. Este repo tem muitos agentes escrevendo
SQL; o padrão passou 23 vezes.
Arquivos e objetos a tocar: novo `scripts/check-policy-tautology.mjs` + teste; o workflow do `Static checks`;
`package.json` (script `check:policy-tautology`).
Não tocar / armadilhas: o gate só deve olhar arquivos **tocados pela PR** — varrer as 3.127 migrations existentes
vai acusar o histórico e travar tudo.
Depende de: 026 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (CI)
Como verificar: `node scripts/check-policy-tautology.mjs` com uma migration de teste contendo o padrão → falha
nomeando a tabela; sem o padrão → exit 0.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 1.E — Arquivo de cliente no storage (ACH-014 a ACH-019)

<modelo_etapa>
Etapa 028 — Inventariar o que está exposto no bucket `art-files` antes de fechar
Onda / Severidade / Camada: 1 / Alta / Storage
Achados resolvidos: ACH-014, ACH-015 (diagnóstico)
Problema hoje: a policy `art_files_quotes_public_read` dá SELECT a `{public}` para `name ~~ 'quotes/%'`, e `anon`
tem grant em `storage.objects`. Hoje há 3 PDFs, 1.363 kB. A policy `art_files_auth_read` libera a leitura de **todo**
o bucket a qualquer autenticado.
Causa raiz: a leitura foi aberta para o PDF da proposta funcionar por URL pública, em vez de por URL assinada.
Caminho recomendado: levante, por leitura, todos os objetos do bucket e quem os referencia:
`storage.objects` filtrando `bucket_id='art-files'` (nome, tamanho, dono, data) e `grep -rn "art-files" src/`.
Escreva em `docs/qa/evidencia-art-files.md` a lista de prefixos em uso, quais telas leem e quais gravam.
Por que este caminho e não o óbvio: trocar a policy antes de saber quais telas leem quebra a visualização de arte e
o envio da proposta ao Bitrix sem aviso.
Arquivos e objetos a tocar: cria `docs/qa/evidencia-art-files.md`.
Não tocar / armadilhas: não baixe conteúdo de PDF de cliente nesta etapa; só metadado.
Depende de: — · Libera: 029, 030, 031, 032
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o documento lista os prefixos, os consumidores e o número de objetos por prefixo, com a consulta colada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 029 — Trocar a URL pública do PDF da proposta por URL assinada
Onda / Severidade / Camada: 1 / Alta / Front + storage
Achados resolvidos: ACH-014, ACH-019
Problema hoje: `QuoteActionHandlers.ts:152` e `QuoteBitrixSync.ts:142` usam `getPublicUrl` num bucket privado — o
link não abre (ACH-019) — e a policy pública existe para compensar (ACH-014).
Causa raiz: escolheu-se URL pública para um bucket que não é público.
Caminho recomendado: troque `getPublicUrl` por `createSignedUrl` com validade curta nos dois arquivos, e propague o
`await` (a assinada é assíncrona, a pública não). Defina a validade pelo uso: o link que vai ao Bitrix precisa durar
o suficiente para o vendedor abrir — comece com 7 dias e deixe o valor numa constante nomeada, não espalhado.
Por que este caminho e não o óbvio: o óbvio é tornar o bucket público "porque o link tem que abrir". Isso expõe
proposta comercial de todos os clientes.
Arquivos e objetos a tocar: `src/.../QuoteActionHandlers.ts`, `src/.../QuoteBitrixSync.ts`.
Não tocar / armadilhas: não remova a policy pública nesta etapa — a etapa 030 faz isso, depois que o front já não
depende dela. Inverter a ordem quebra o fluxo em produção.
Depende de: 028 · Libera: 030
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: gere uma proposta em ambiente de teste, confirme que o link retornado contém `token=` e abre; e que
o link antigo (`/object/public/...`) não é mais produzido — `grep -rn "getPublicUrl" src/` não deve achar os dois arquivos.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 030 — Remover a leitura pública de `art-files/quotes/%`
Onda / Severidade / Camada: 1 / Alta / Banco
Achados resolvidos: ACH-014
Problema hoje: a policy `art_files_quotes_public_read` deixa qualquer anônimo ler qualquer PDF sob `quotes/`, sem
token e sem expiração.
Causa raiz: idem 029.
Caminho recomendado: migration que remove a policy. URL assinada **não** depende de policy de leitura pública — ela
é emitida pelo serviço de storage com a credencial de quem assina —, então a etapa 029 já cobre o fluxo.
Por que este caminho e não o óbvio: o óbvio é restringir a policy por padrão de nome (ex.: só UUID). Nome não é
segredo e é enumerável; URL assinada é a resposta certa e já está no repo (`createSignedUrl` é usado em outros pontos).
Arquivos e objetos a tocar: nova migration; policy `art_files_quotes_public_read` em `storage.objects`; rollback.
Não tocar / armadilhas: confirme que a etapa 029 está em produção antes de mergear esta. A ordem importa.
Depende de: 029 · Libera: —
Risco e como reverter: médio se a 029 não estiver no ar. Reverter = rollback (recria a policy).
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: `curl` com a publishable key em `/storage/v1/object/public/art-files/quotes/<arquivo>` → 400/403;
e o link assinado gerado pela aplicação → 200.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 031 — Restringir `art_files_auth_read` ao dono do arquivo
Onda / Severidade / Camada: 1 / Alta / Banco
Achados resolvidos: ACH-015
Problema hoje: a policy de SELECT checa apenas `bucket_id = 'art-files'`, enquanto INSERT, UPDATE e DELETE do mesmo
conjunto já checam `owner = auth.uid()`. Qualquer conta logada lê arte e proposta de qualquer cliente.
Causa raiz: assimetria entre leitura e escrita nas policies do bucket.
Caminho recomendado: migration que recria a policy de SELECT com a **mesma** condição de dono que as de escrita já
usam, mais a exceção de papel gestor via `has_role`/`is_supervisor_or_above` (o repo já tem esses helpers —
leia `docs/RBAC_HELPERS.md` e confirme a assinatura atual no banco antes de usar).
Por que este caminho e não o óbvio: o óbvio é deixar como está "porque é só quem está logado". Há 86 contas; arte e
proposta de cliente não são conteúdo de equipe.
Arquivos e objetos a tocar: nova migration; policy `art_files_auth_read`; rollback.
Não tocar / armadilhas: vendedor precisa ver arte de cotação que ele atende mesmo sem ser o `owner` do upload — por
isso a exceção por papel. Teste os dois casos antes de mergear.
Depende de: 028 · Libera: —
Risco e como reverter: médio — restringir demais tira a arte da tela do vendedor. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: com dois usuários de teste, A não lê arquivo de B; um usuário com papel gestor lê os dois.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 032 — Fechar `mockup_approval_links` para o anônimo não listar token
Onda / Severidade / Camada: 1 / Alta / Banco
Achados resolvidos: ACH-016
Problema hoje: `mal_public_select_active` deixa `anon` ler qualquer linha ativa **incluindo a coluna `public_token`**,
sem checar token, `expires_at` nem `max_uses`. A tabela tem 0 linhas hoje — é risco estrutural, não ativo.
Causa raiz: a policy foi escrita para "link público" sem exigir o próprio token na condição.
Caminho recomendado: migration que recria a policy exigindo o token na requisição e conferindo validade — o padrão
correto já existe no repo, em `collections`; leia a policy de link público de `collections` e replique. Enquanto a
tabela está vazia, é a hora barata de mudar.
Por que este caminho e não o óbvio: o óbvio é revogar `anon` e passar tudo por edge function. Isso é uma reescrita;
a policy com token resolve com uma migration e segue o padrão da casa.
Arquivos e objetos a tocar: nova migration; policy `mal_public_select_active`; rollback.
Não tocar / armadilhas: não exponha `public_token` em `select=*` nem depois da correção — restrinja as colunas
legíveis por `anon` por grant de coluna, se o padrão de `collections` fizer isso.
Depende de: — · Libera: —
Risco e como reverter: baixo (0 linhas). Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: `curl` com a publishable key em `/rest/v1/mockup_approval_links?select=*` → 0 linhas ou 403; e com o
token correto na condição → a linha esperada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 033 — Dar escopo de pasta às escritas em `recibos-entrega`
Onda / Severidade / Camada: 1 / Alta / Banco
Achados resolvidos: ACH-017
Problema hoje: as policies de INSERT e UPDATE do bucket não têm escopo de pasta nem de dono — qualquer autenticado
grava e altera recibo de qualquer entrega.
Causa raiz: policies de escrita criadas só com `bucket_id`.
Caminho recomendado: migration que acrescenta a condição de caminho/dono às policies de INSERT e UPDATE, no mesmo
padrão das policies de escrita de `art-files` (que já checam `owner = auth.uid()`). Confira antes qual é a convenção
de caminho em uso (`storage.objects` do bucket) para a condição casar com o que a aplicação grava.
Por que este caminho e não o óbvio: o óbvio é bloquear UPDATE para todos. Recibo pode precisar de substituição
legítima; escopo por dono/pasta preserva o fluxo e fecha a adulteração.
Arquivos e objetos a tocar: nova migration; policies de INSERT/UPDATE de `recibos-entrega`; rollback.
Não tocar / armadilhas: prova de entrega tem valor jurídico — não permita DELETE para papel comum nesta etapa, e se
a policy atual permitir, registre como achado novo.
Depende de: — · Libera: —
Risco e como reverter: médio — pode bloquear upload legítimo se a convenção de caminho for outra. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: com dois usuários de teste, A não altera recibo de B; A grava o próprio.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 034 — Substituir a condição `true` disfarçada de `mockup-assets`
Onda / Severidade / Camada: 1 / Média / Banco
Achados resolvidos: ACH-018
Problema hoje: a policy de leitura do bucket é `name IS NOT NULL AND length(name) > 0`, que é `true` com outro nome.
Causa raiz: condição de placeholder que nunca foi substituída.
Caminho recomendado: migration que troca a condição pelo escopo real. Decida o escopo olhando quem consome:
`grep -rn "mockup-assets" src/ supabase/functions/`. Se o mockup é mostrado ao cliente por link, o caminho é URL
assinada (como na etapa 029), não leitura aberta.
Por que este caminho e não o óbvio: o óbvio é deixar como está porque "mockup não é dado sensível". Mockup carrega a
marca e a arte do cliente antes do lançamento.
Arquivos e objetos a tocar: nova migration; policy de leitura de `mockup-assets`; rollback.
Não tocar / armadilhas: há policy de `storage.objects` para upload de mockup que aparece no lint
`policy_auth_fn_not_wrapped` (etapa 241) — não misture as duas mudanças.
Depende de: — · Libera: —
Risco e como reverter: médio. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: leitura anônima do bucket → 403; o fluxo de mockup na aplicação continua exibindo a imagem.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 1.F — Papel do usuário gravável pelo próprio usuário (ACH-020, ACH-021)

<modelo_etapa>
Etapa 035 — Trigger que impede o usuário de alterar o próprio `role` e `organization_id` em `profiles`
Onda / Severidade / Camada: 1 / Média / Banco
Achados resolvidos: ACH-020
Problema hoje: a policy `profiles_update` só checa `auth.uid() = user_id`; `authenticated` tem grant de UPDATE nas
colunas `role` **e** `organization_id`; nenhum trigger bloqueia (medido).
Causa raiz: a policy protege a linha, não as colunas sensíveis dentro dela.
Caminho recomendado: migration com trigger `BEFORE UPDATE` em `profiles` que rejeita a mudança de `role` e de
`organization_id` quando quem executa não é papel gestor (`has_role`/`is_supervisor_or_above`) nem `service_role`.
Complementarmente, revogue o grant de UPDATE nessas duas colunas para `authenticated` — defesa em duas camadas, que
é o padrão que o repo já usa em outros pontos (policy + trigger).
Por que este caminho e não o óbvio: o óbvio é só revogar o grant de coluna. Grant de coluna é fácil de reintroduzir
numa migration futura sem ninguém notar; o trigger é a rede que sobra.
Arquivos e objetos a tocar: nova migration; trigger novo em `public.profiles`; grants de coluna; rollback.
Não tocar / armadilhas: a edge `manage-users` e o fluxo de promoção (`/admin/usuarios/promover`) alteram papel
legitimamente — eles usam `user_roles` e/ou `service_role`; confirme que continuam funcionando. **Não** use
`profiles.role` como fonte de verdade de papel em lugar nenhum: o RBAC real lê `user_roles`.
Depende de: — · Libera: 036, 037
Risco e como reverter: médio — se algum fluxo legítimo gravar `profiles.role` com papel comum, ele passa a falhar.
Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: como usuário comum, `update profiles set role='admin' where user_id = auth.uid()` → erro; o mesmo
update feito pela edge `manage-users` → sucesso.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 036 — Tirar `profiles.role` da policy de `webhook_dispatcher_log`
Onda / Severidade / Camada: 1 / Média / Banco
Achados resolvidos: ACH-020
Problema hoje: a policy de `webhook_dispatcher_log` decide acesso lendo `profiles.role = 'admin'`, e esse campo é
(hoje) autoeditável — é o único consumidor que transforma o ACH-020 em acesso real.
Causa raiz: a policy usou `profiles` em vez do helper de papel do repo.
Caminho recomendado: migration que troca a condição por `has_role(auth.uid(),'admin')` — confirme a assinatura exata
da função no banco antes (ela é `SECURITY DEFINER` com `search_path` fixo, como todas as outras).
Por que este caminho e não o óbvio: o óbvio é parar na etapa 035 e considerar resolvido. A etapa 035 fecha a porta;
esta remove a dependência, que é o que impede a porta de reabrir numa migration futura.
Arquivos e objetos a tocar: nova migration; policy de `public.webhook_dispatcher_log`; rollback.
Não tocar / armadilhas: não troque por `current_user_role()` — essa função lê o papel do `user_metadata` do JWT,
que o usuário edita (ACH-021).
Depende de: 035 · Libera: 037
Risco e como reverter: baixo. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: usuário comum → 0 linhas em `webhook_dispatcher_log`; admin de verdade (em `user_roles`) → lê.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 037 — Remover a função `current_user_role()`
Onda / Severidade / Camada: 1 / Média / Banco
Achados resolvidos: ACH-021
Problema hoje: `current_user_role()` lê `auth.jwt()->'user_metadata'->>'role'`, que o próprio usuário edita. Não tem
consumidor hoje (0 policies, 0 funções, front não usa) — é uma mina para a próxima policy que a use.
Causa raiz: função antiga de uma época em que o papel vinha do metadata.
Caminho recomendado: migration que faz `drop function if exists public.current_user_role()`. Antes, confirme por
consulta que continua sem consumidor (`pg_policies`, `pg_proc.prosrc`, e `grep -rn "current_user_role" src/ supabase/`).
Por que este caminho e não o óbvio: o óbvio é "corrigir" a função para ler de `user_roles`. Aí fica uma função com
nome enganoso que parece ler do JWT; apagar é mais honesto e o repo já tem `has_role`.
Arquivos e objetos a tocar: nova migration; função `public.current_user_role()`; rollback (recria a função).
Não tocar / armadilhas: se aparecer consumidor, **não** apague — anote como achado novo e pare.
Depende de: 036 · Libera: —
Risco e como reverter: baixo. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: `select count(*) from pg_proc where proname='current_user_role'` → 0; nenhum erro novo em
`cron.job_run_details` nas 2 horas seguintes.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 1.G — Perda de dado: cotação aprovada deletável (ACH-098)

<modelo_etapa>
Etapa 038 — Trigger `BEFORE DELETE` protegendo cotação aprovada ou convertida
Onda / Severidade / Camada: 1 / Alta / Banco
Achados resolvidos: ACH-098
Problema hoje: `fn_quotes_enforce_immutability` é `BEFORE UPDATE` **apenas**. A policy `org_admins_delete_quotes`
permite DELETE, não há trigger de DELETE, e `quote_items` está em `ON DELETE CASCADE`. A interface expõe exclusão
em massa (`useQuotesListPage.ts:164,244`).
Causa raiz: a imutabilidade foi pensada como "não pode editar" e esqueceu "não pode apagar".
Caminho recomendado: migration com trigger `BEFORE DELETE` em `quotes` que levanta exceção quando
`OLD.status IN ('approved','converted')`, reaproveitando a mesma mensagem de erro de
`fn_quotes_enforce_immutability` para o front tratar igual. Leia a função atual antes e espelhe a estrutura.
Por que este caminho e não o óbvio: o óbvio é remover a policy de DELETE. Isso tira do admin a capacidade de apagar
rascunho e lixo, que é um uso legítimo; o trigger limita só o que é histórico fechado.
Arquivos e objetos a tocar: nova migration; trigger novo em `public.quotes`; rollback.
Não tocar / armadilhas: não mexa em `fn_quotes_enforce_immutability` nem no `ON DELETE CASCADE` de `quote_items`
nesta etapa (etapa 039 trata o cascade).
Depende de: — · Libera: 039, 040
Risco e como reverter: baixo. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: em transação revertida, `delete from quotes where status='approved' limit 1` → erro; o mesmo com
`status='draft'` → sucesso.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 039 — Revisar o `ON DELETE CASCADE` de `quote_items`
Onda / Severidade / Camada: 1 / Média / Banco
Achados resolvidos: ACH-098
Problema hoje: apagar uma cotação leva junto todos os itens, sem registro.
Causa raiz: cascade escolhido por conveniência de limpeza.
Caminho recomendado: mantenha o cascade (trocar por `RESTRICT` quebraria a exclusão legítima de rascunho) e
acrescente, na mesma migration, gravação em `admin_audit_log` no trigger de DELETE da etapa 038, registrando quem
apagou, qual cotação e quantos itens. O repo já usa `admin_audit_log` — confira as colunas antes.
Por que este caminho e não o óbvio: o óbvio é trocar o cascade. Isso transfere o problema para o código, que passa
a ter de apagar item a item, e cria o N+1 do grupo 16.
Arquivos e objetos a tocar: nova migration; trigger da etapa 038; rollback.
Não tocar / armadilhas: não grave dado de cliente no log de auditoria além do id da cotação.
Depende de: 038 · Libera: —
Risco e como reverter: baixo. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: apagar uma cotação de rascunho em ambiente de teste gera 1 linha em `admin_audit_log` com a contagem
de itens correta.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 040 — Confirmação explícita na exclusão em massa de cotações
Onda / Severidade / Camada: 1 / Média / Interface
Achados resolvidos: ACH-098
Problema hoje: `useQuotesListPage.ts:164,244` expõe exclusão em massa; com a etapa 038 a cotação aprovada passa a
dar erro, e o usuário vai receber um erro genérico no meio de um lote.
Causa raiz: a tela não distingue o que pode e o que não pode ser apagado.
Caminho recomendado: no diálogo de confirmação, separe a contagem entre "serão apagadas" e "serão ignoradas
(aprovadas/convertidas)", e trate o erro do trigger exibindo a mensagem do banco. Use o componente de confirmação
que o repo já padroniza (`e2e/ui/confirm-dialog-visual.spec.ts` indica qual é) em vez de criar outro.
Por que este caminho e não o óbvio: o óbvio é filtrar as aprovadas no front e não mandar. O front já erra sobre
status em outros pontos (grupo 26); deixar o banco decidir e a tela explicar é mais seguro.
Arquivos e objetos a tocar: `src/.../useQuotesListPage.ts` e o componente de confirmação da lista de cotações.
Não tocar / armadilhas: não some com a opção de exclusão em massa.
Depende de: 038 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: selecionar um lote com 1 aprovada e 2 rascunhos mostra "2 serão apagadas, 1 ignorada" e o resultado
bate.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 1.H — Função destrutiva exposta e destino arbitrário (ACH-071, ACH-009)

<modelo_etapa>
Etapa 041 — Alarme quando a allowlist e o segredo do `e2e-cleanup` saem de sincronia
Onda / Severidade / Camada: 1 / Média / Edge function
Achados resolvidos: ACH-071
Problema hoje: `e2e-cleanup` está ativa em produção (v309, `verify_jwt=false`) e apaga `quotes`/`quote_items`.
As barreiras medidas são boas — token em tempo constante (`:150`) e allowlist fail-closed (`:235`) — mas o próprio
código alerta, em `:252-253`, para o risco de dessincronia entre allowlist e segredo.
Causa raiz: duas configurações independentes que precisam concordar, sem nada verificando que concordam.
Caminho recomendado: acrescente à função um auto-teste de arranque que, quando a allowlist estiver vazia ou o
segredo ausente, registre um erro explícito (nível `error`, com `request_id`) além de recusar — hoje ela recusa em
silêncio. Depois, um cron de verificação diária que chame a função num modo `dry-run` e grave o resultado.
Por que este caminho e não o óbvio: o óbvio é desativar a função em produção. Ela é usada pelo E2E; desativar quebra
a suíte. Tornar a dessincronia visível resolve sem tirar a ferramenta.
Arquivos e objetos a tocar: `supabase/functions/e2e-cleanup/index.ts`; deploy só por `deploy-edge-functions.yml`.
Não tocar / armadilhas: não afrouxe a comparação de token nem o fail-closed da allowlist — são o que segura a função.
Depende de: — · Libera: 042
Risco e como reverter: baixo. Reverter = `git revert` + redeploy pelo workflow.
Precisa de aprovação humana antes do merge: não
Como verificar: invocar a função sem segredo configurado, em ambiente de teste, produz log de nível `error` com
motivo; com segredo, o `dry-run` responde 200 sem apagar nada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 042 — Restringir o alcance do `e2e-cleanup` a dados marcados como de teste
Onda / Severidade / Camada: 1 / Média / Edge function
Achados resolvidos: ACH-071
Problema hoje: a função apaga em `quotes`/`quote_items` com base numa allowlist de identificadores; se a allowlist
for alimentada errado, ela apaga dado real.
Causa raiz: o critério de "isto é dado de teste" vive na configuração, não no dado.
Caminho recomendado: exija, além da allowlist, uma marca no próprio registro (por exemplo um prefixo convencionado
no `quote_number` ou uma coluna de origem já existente — confira o schema de `quotes` antes de inventar coluna) e
recuse apagar qualquer linha sem essa marca. Se a marca não existir hoje, esta etapa vira: documentar a convenção e
aplicá-la na criação de dado E2E primeiro.
Por que este caminho e não o óbvio: o óbvio é confiar na allowlist. O próprio código diz que ela pode sair de
sincronia; uma segunda condição que mora no dado não sai de sincronia com nada.
Arquivos e objetos a tocar: `supabase/functions/e2e-cleanup/index.ts` e, se necessário, os fixtures de E2E.
Não tocar / armadilhas: não crie coluna nova sem necessidade — veja se `quotes` já tem campo de origem.
Depende de: 041 · Libera: —
Risco e como reverter: médio — pode fazer a limpeza do E2E parar de limpar. Reverter = `git revert` + redeploy.
Precisa de aprovação humana antes do merge: não
Como verificar: rodar a função contra um id real (em ambiente de teste) → recusa; contra um id marcado → apaga.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 043 — Ligar `_shared/url-allowlist.ts` no `webhook-dispatcher`
Onda / Severidade / Camada: 1 / Alta / Edge function
Achados resolvidos: ACH-009
Problema hoje: o módulo `_shared/url-allowlist.ts` existe e é testado, e o **único** importador é o próprio
`.test.ts`. O `webhook-dispatcher` faz POST na URL que vier de `outbound_webhooks`, sem consultar a allowlist.
Mitigante medido: `outbound_webhooks` é admin-only, então não é SSRF por usuário comum.
Causa raiz: a guarda foi escrita e nunca conectada.
Caminho recomendado: importe e aplique a allowlist em `webhook-dispatcher/index.ts` imediatamente antes de cada
`fetch` de destino (`:162` e `:305`), recusando com erro registrado quando o destino não passar. Comece em modo
**observador** — registre a recusa que *aconteceria* sem bloquear — por um ciclo, confira nos logs que nenhum
destino legítimo seria barrado, e só então ligue o bloqueio em etapa seguinte do seu progresso.
Por que este caminho e não o óbvio: o óbvio é ligar bloqueando. Se a allowlist estiver mais estreita que os
destinos reais, você derruba as integrações de saída dos clientes de uma vez.
Arquivos e objetos a tocar: `supabase/functions/webhook-dispatcher/index.ts`; deploy pelo workflow.
Não tocar / armadilhas: não altere `_shared/url-allowlist.ts` — ele está testado e correto.
Depende de: — · Libera: 044
Risco e como reverter: baixo em modo observador. Reverter = `git revert` + redeploy.
Precisa de aprovação humana antes do merge: não
Como verificar: nos logs da função, cada entrega passa a registrar `allowlist: pass|would-block` com o host; nenhum
`would-block` para destino legítimo durante um ciclo.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 044 — Ligar o bloqueio da allowlist de URL depois do período de observação
Onda / Severidade / Camada: 1 / Alta / Edge function
Achados resolvidos: ACH-009
Problema hoje: com a etapa 043 em observação, o destino arbitrário continua alcançável.
Causa raiz: idem 043.
Caminho recomendado: troque `would-block` por recusa efetiva, gravando o motivo em `webhook_deliveries` para o
admin ver na tela por que a entrega não saiu. Ofereça o caminho de correção: a tela de webhooks deve dizer que o
host precisa ser liberado.
Por que este caminho e não o óbvio: idem 043 — a ordem é o ponto.
Arquivos e objetos a tocar: `supabase/functions/webhook-dispatcher/index.ts`.
Não tocar / armadilhas: a mensagem de erro deve chegar ao admin; não a engula no log (é o padrão do grupo 9).
Depende de: 043 · Libera: —
Risco e como reverter: médio. Reverter = `git revert` + redeploy.
Precisa de aprovação humana antes do merge: não
Como verificar: cadastrar um webhook para um host fora da allowlist em ambiente de teste → entrega marcada como
recusada com motivo legível.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 045 — Exigir auth antes de responder `op=ping` no `crm-db-bridge`
Onda / Severidade / Camada: 1 / Média / Edge function
Achados resolvidos: ACH-030 (parcial), ponte CRM
Problema hoje: `crm-db-bridge:877-880` responde ao `op=ping` **antes** do auth (`:897`) e antes do rate limit (que
por desenho roda depois do auth, `:890-895`). A função é `verify_jwt=false`.
Causa raiz: o `ping` foi posto no topo para ser barato, e ficou fora de toda proteção.
Caminho recomendado: mova o bloco do `ping` para depois do auth. Se existir necessidade de health check sem
credencial, use um segredo de header dedicado (o repo já tem esse padrão em `dispatcher-auth.ts`), não ausência de
verificação.
Por que este caminho e não o óbvio: o óbvio é deixar como está porque "ping não devolve dado". Ele devolve
invocação faturável ilimitada e um medidor que não conta.
Arquivos e objetos a tocar: `supabase/functions/crm-db-bridge/index.ts`.
Não tocar / armadilhas: confira quem chama o `ping` hoje (`grep -rn "op=ping\|op: 'ping'" src/ supabase/`) antes de
mover — pode haver monitor dependendo dele.
Depende de: — · Libera: —
Risco e como reverter: baixo. Reverter = `git revert` + redeploy.
Precisa de aprovação humana antes do merge: não
Como verificar: `curl` sem token em `?op=ping` → 401; com token válido → 200.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 1.I — Estreitar a superfície de leitura (ACH-056, ACH-057, ACH-058, ACH-059, ACH-004)

<modelo_etapa>
Etapa 046 — Fechar `stock_daily_summary` à leitura irrestrita de qualquer conta logada
Onda / Severidade / Camada: 1 / Média / Banco
Achados resolvidos: ACH-056
Problema hoje: a policy `auth_read_stock_daily_summary` é `USING (true)` para `authenticated`, numa tabela de
3.270.690 linhas e ~1,1 GB. Medido: `anon` recebe 401, então a exposição é a qualquer uma das 86 contas.
Causa raiz: policy aberta para o painel de estoque funcionar.
Caminho recomendado: antes de restringir, veja o que a aplicação consulta (`grep -rn "stock_daily_summary" src/`):
se o uso é sempre agregado por produto e período, a saída é criar/expor uma função ou view agregada e fechar a
tabela. Se o uso é direto, restrinja por papel (`has_role`) em vez de por organização — a tabela é operacional, não
de cliente.
Por que este caminho e não o óbvio: o óbvio é pôr paginação obrigatória. Paginação não impede baixar tudo, só torna
mais lento.
Arquivos e objetos a tocar: nova migration; policy de `public.stock_daily_summary`; eventualmente o hook que consulta.
Não tocar / armadilhas: o painel de estoque e os gráficos de histórico dependem dessa tabela — quebrar a leitura
quebra tela de negócio.
Depende de: — · Libera: 047
Risco e como reverter: médio. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: conta sem o papel exigido → 0 linhas; conta com o papel → painel de estoque idêntico ao de antes.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 047 — Fechar `xbz_upload_mapping`, `product_properties` e `supplier_import_batches` à leitura irrestrita
Onda / Severidade / Camada: 1 / Média / Banco
Achados resolvidos: ACH-056
Problema hoje: três tabelas operacionais com policy de SELECT `USING (true)` para `authenticated`: 42.015, 34.177 e
937 linhas. São dado de integração com fornecedor, não catálogo.
Causa raiz: mesma da 046.
Caminho recomendado: uma migration só, restringindo as três por papel (`has_role`), depois de confirmar com
`grep -rn` que só telas administrativas as consultam.
Por que este caminho e não o óbvio: aqui vale agrupar — as três são do mesmo domínio e do mesmo tipo de consumidor;
separar em três PRs é churn sem ganho de reversibilidade.
Arquivos e objetos a tocar: nova migration; policies das três tabelas; rollback.
Não tocar / armadilhas: `product_properties` pode ser lida pela ficha de produto; confirme antes.
Depende de: 046 · Libera: 048
Risco e como reverter: médio. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: conta comum → 0 linhas nas três; telas administrativas funcionando.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 048 — Inventariar e decidir as ~138 policies de SELECT com `USING (true)`
Onda / Severidade / Camada: 1 / Média / Banco
Achados resolvidos: ACH-056
Problema hoje: 138 policies de SELECT com `qual = true` para `anon`/`authenticated`/`public` (contagem medida). A
maioria é catálogo de referência e é legítima; a minoria não é, e não há como distinguir sem lista.
Causa raiz: nunca houve uma decisão registrada de quais tabelas são "leitura livre por desenho".
Caminho recomendado: produza `docs/qa/politicas-leitura-livre.md` com a lista completa (tabela, policy, roles,
linhas) e uma coluna de decisão: `catálogo (ok)`, `operacional (fechar)` ou `a decidir pelo dono`. Use a consulta
desta auditoria (está em `02-CENARIOS.md`). Não altere nada.
Por que este caminho e não o óbvio: o óbvio é fechar tudo. Metade é catálogo que o site público precisa; fechar em
massa derruba a vitrine.
Arquivos e objetos a tocar: cria `docs/qa/politicas-leitura-livre.md`.
Não tocar / armadilhas: nenhuma migration nesta etapa.
Depende de: 047 · Libera: 049
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o documento tem 138 linhas classificadas e a consulta colada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 049 — Gate que impede nascer policy de SELECT `USING (true)` sem justificativa
Onda / Severidade / Camada: 1 / Média / CI
Achados resolvidos: ACH-056
Problema hoje: nada impede a 139ª.
Causa raiz: sem gate.
Caminho recomendado: estenda o script da etapa 027 (ou crie um irmão) para falhar quando uma migration da PR criar
policy de SELECT com `USING (true)` e a tabela não estiver na lista de catálogo aprovada em
`docs/qa/politicas-leitura-livre.md` (ou num JSON derivado dele, que é mais fácil de ler por script).
Por que este caminho e não o óbvio: o óbvio é proibir `USING (true)`. Catálogo público precisa disso; a lista
aprovada é o que separa o legítimo do descuido.
Arquivos e objetos a tocar: `scripts/check-policy-tautology.mjs` (ou novo), `.security/` para o JSON da lista,
o workflow do `Static checks`.
Não tocar / armadilhas: o gate só olha arquivos tocados pela PR.
Depende de: 048 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (CI)
Como verificar: migration de teste com `USING (true)` numa tabela fora da lista → gate falha; dentro da lista → passa.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 050 — Revogar `SELECT` de `anon` nas matviews de schemas internos expostas no GraphQL
Onda / Severidade / Camada: 1 / Média / Banco
Achados resolvidos: ACH-057
Problema hoje: 65 objetos são visíveis no GraphQL para `anon`, entre eles matviews de schemas internos como
`internal.mv_product_leaf_category`.
Causa raiz: grants herdados de `default privileges` ou concedidos em bloco quando o schema foi criado.
Caminho recomendado: migration que revoga `SELECT` de `anon` nos objetos de schemas **internos** (`internal`,
`analytics`, `prod_audit`, `cf_recon`, `classification_audit`) — confira antes, por consulta, se algum deles é lido
pelo site público; a vitrine usa as views `v_*_public` de `public`, não os schemas internos.
Por que este caminho e não o óbvio: o óbvio é mexer em `project-config` para tirar o schema da API. Isso é
configuração de projeto, fora do fluxo de migration, e o `AGENTS.md` exige que toda mudança estrutural nasça como
migration.
Arquivos e objetos a tocar: nova migration; grants dos schemas internos; rollback.
Não tocar / armadilhas: não revogue de `authenticated` nesta etapa (etapa 051) — um passo por papel facilita achar
o que quebrou.
Depende de: — · Libera: 051
Risco e como reverter: médio. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: `get_advisors(security)` → `pg_graphql_anon_table_exposed` cai de 65 para o número esperado; a
vitrine pública continua carregando.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 051 — Reduzir os 477 objetos visíveis no GraphQL para usuário logado
Onda / Severidade / Camada: 1 / Média / Banco
Achados resolvidos: ACH-057
Problema hoje: 477 objetos são descobríveis por qualquer conta logada, incluindo matviews de `analytics`.
Causa raiz: idem 050.
Caminho recomendado: comece pelos schemas internos, como na etapa 050, e **não** tente reduzir `public` nesta
etapa. Produza, junto, a lista do que sobrou em `docs/qa/politicas-leitura-livre.md` para o dono decidir o resto.
Por que este caminho e não o óbvio: o óbvio é revogar em massa em `public`. O front usa PostgREST sobre `public` o
tempo todo; revogar em massa quebra o aplicativo.
Arquivos e objetos a tocar: nova migration; grants; `docs/qa/politicas-leitura-livre.md`.
Não tocar / armadilhas: `authenticated` precisa de SELECT em quase tudo de `public` para o app funcionar.
Depende de: 050 · Libera: —
Risco e como reverter: médio-alto. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: `get_advisors(security)` → `pg_graphql_authenticated_table_exposed` menor; smoke manual das telas
principais (catálogo, orçamento, admin) sem erro novo.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 052 — Registro vivo das views `SECURITY DEFINER` de `public`
Onda / Severidade / Camada: 1 / Média / Banco + documentação
Achados resolvidos: ACH-058
Problema hoje: o advisor nível ERROR aponta 10 views em `public` que rodam como owner e ignoram RLS. Oito são
decisão documentada e medida (`20261122180000`); duas são o Grupo 1. A lista cresceu de 8 para 10 em dois dias sem
ninguém notar.
Causa raiz: a decisão por view está espalhada em comentários de migration; não há um lugar que diga "estas são
todas, e por quê".
Caminho recomendado: um arquivo único (`docs/qa/views-security-definer.md`) com a lista atual, o motivo de cada
uma e o link para a migration que decidiu. Gere a lista por consulta, não de memória. O gate da etapa 005/008 passa
a ser o que impede a lista de crescer sem entrada aqui.
Por que este caminho e não o óbvio: o óbvio é "resolver o advisor" ligando `security_invoker`. O repo já mediu que
isso quebra essas views (401) — está escrito no cabeçalho de `20261122180000`.
Arquivos e objetos a tocar: cria `docs/qa/views-security-definer.md`.
Não tocar / armadilhas: não ligue `security_invoker` em nenhuma das 10.
Depende de: 006 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: a lista do arquivo bate com `select relname from pg_class where relnamespace='public'::regnamespace
and relkind='v' and 'security_invoker=false' = any(reloptions)`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 053 — Teto de gravação por revista em `magazine-reader-state-write`
Onda / Severidade / Camada: 1 / Baixa / Edge function
Achados resolvidos: ACH-059
Problema hoje: `magazine-reader-state-write:18,25,59,79-86` aceita `viewer_fingerprint` livre na chave do upsert,
sem teto por revista — estimativa de ~432 mil linhas/dia por IP.
Causa raiz: a chave de deduplicação é controlada por quem chama.
Caminho recomendado: limite por revista e por janela de tempo, usando o rate-limiter que já existe em
`_shared/rate-limiter.ts` (é o padrão do repo e já é usado por outras edges), e recuse acima do teto com 429.
Por que este caminho e não o óbvio: o óbvio é validar o formato do fingerprint. Formato não limita volume.
Arquivos e objetos a tocar: `supabase/functions/magazine-reader-state-write/index.ts`.
Não tocar / armadilhas: a função é `verify_jwt=false` por desenho (leitor anônimo da revista) — não exija token.
Depende de: — · Libera: —
Risco e como reverter: baixo. Reverter = `git revert` + redeploy.
Precisa de aprovação humana antes do merge: não
Como verificar: chamar acima do teto em ambiente de teste → 429; abaixo → 200.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 054 — Revisar as 9 funções `SECURITY DEFINER` executáveis por `anon`
Onda / Severidade / Camada: 1 / Média / Banco
Achados resolvidos: ACH-057
Problema hoje: 9 funções são chamáveis por RPC sem login: `check_login_rate_limit`, `fn_product_active_for_rls`,
`fn_super_filtro`, `fn_super_filtro_facets`, `fn_super_filtro_price_range`, `get_catalog_bestseller_page`,
`get_sitemap_public`, `request_password_reset`, `submit_quote_response`.
Causa raiz: o Supabase concede EXECUTE a `anon` por padrão; nem toda função foi revista depois de criada.
Caminho recomendado: para cada uma, decida `pública por desenho` ou `revogar`, por leitura: as de catálogo e
sitemap são claramente públicas; `fn_product_active_for_rls` é função de apoio a RLS e provavelmente não precisa
ser chamável por RPC. Registre a decisão em `docs/qa/rpcs-publicas.md` e faça **uma** migration revogando só as que
não forem públicas por desenho.
Por que este caminho e não o óbvio: o óbvio é revogar todas. `fn_super_filtro` é o buscador da vitrine; revogar
derruba a busca pública.
Arquivos e objetos a tocar: cria `docs/qa/rpcs-publicas.md`; nova migration com os `revoke`; rollback.
Não tocar / armadilhas: `request_password_reset` e `check_login_rate_limit` **precisam** ser anônimas; verifique o
rate limit delas em vez de revogar.
Depende de: — · Libera: 055
Risco e como reverter: médio. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: busca pública e sitemap continuam funcionando com a publishable key; as revogadas respondem 401/403.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 055 — Triagem das 112 funções `SECURITY DEFINER` executáveis por usuário logado
Onda / Severidade / Camada: 1 / Média / Banco
Achados resolvidos: ACH-057
Problema hoje: 112 funções `SECURITY DEFINER` são chamáveis por qualquer conta logada via RPC, entre elas
`admin_active_sessions()`.
Causa raiz: idem 054, no papel `authenticated`.
Caminho recomendado: liste as 112 em `docs/qa/rpcs-publicas.md` com uma coluna de risco, e trate **nesta etapa**
só as que têm nome administrativo evidente (`admin_*`, `*_audit*`, `force_*`, `bulk_*`), revogando EXECUTE de
`authenticated` e mantendo para `service_role` e para os papéis gestores. As demais ficam listadas para decisão.
Por que este caminho e não o óbvio: revisar 112 funções numa etapa é irreal e vira carimbo. Começar pelas de nome
administrativo pega o risco alto com esforço pequeno.
Arquivos e objetos a tocar: `docs/qa/rpcs-publicas.md`; nova migration; rollback.
Não tocar / armadilhas: muitas funções `SECURITY DEFINER` são chamadas **pelo front** em nome do usuário — revogar
sem conferir `grep -rn "rpc('<nome>'" src/` quebra tela.
Depende de: 054 · Libera: —
Risco e como reverter: médio. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: conta comum chamando `admin_active_sessions()` → 403; o mesmo por papel gestor → 200.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 056 — Revogar os grants de `anon` abertos para a cadeia das views de compras
Onda / Severidade / Camada: 1 / Média / Banco
Achados resolvidos: ACH-004
Problema hoje: `20261122200000:65-68` concedeu a `anon` SELECT em `vw_variant_sale_prices`,
`variant_supplier_sources`, `markup_configurations` e na coluna `suppliers.default_markup_percent`. Medido depois:
`markup_configurations` → 200 `[]`; os outros dois → 401. Nenhum arquivo deste repo consome as views que motivaram
os grants.
Causa raiz: grants abertos para resolver um 401 de view que continuou em 401.
Caminho recomendado: depois da decisão da etapa 004, migration que revoga os grants que a decisão não exigir.
Mantenha só o que a etapa 004 provar necessário, e escreva no corpo da migration qual etapa decidiu o quê.
Por que este caminho e não o óbvio: o óbvio é deixar os grants "porque não estão vazando nada hoje". A RLS é o que
está segurando; grant sem consumidor é superfície que a próxima policy frouxa transforma em vazamento.
Arquivos e objetos a tocar: nova migration; grants das três tabelas/views e da coluna; rollback.
Não tocar / armadilhas: não revogue antes da etapa 004 decidir — se a decisão for "manter a view funcionando",
parte dos grants é necessária.
Depende de: 004 · Libera: —
Risco e como reverter: baixo. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: `has_table_privilege('anon', '<objeto>', 'select')` → `false` nos revogados; a vitrine pública e a
decisão da etapa 004 seguem funcionando.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 057 — Parar de devolver erro cru do Postgres na `crm-db-bridge`
Onda / Severidade / Camada: 1 / Média / Edge function
Achados resolvidos: ACH-030
Problema hoje: `crm-db-bridge:678,736,760,779,803,829,860` devolvem `error.message`/`code` do Postgres ao
navegador — e esta função é `verify_jwt=false`. Contraria a política escrita em `_shared/error-response.ts:5`.
Causa raiz: o helper de erro existe e tem adoção de 12 em 112 funções; esta ficou fora.
Caminho recomendado: troque os 7 retornos pelo helper `_shared/error-response.ts`, que já padroniza a resposta e
registra o detalhe no log com `request_id` em vez de no corpo. Comece por esta função porque ela é a de maior
exposição (sem JWT).
Por que este caminho e não o óbvio: o óbvio é trocar a mensagem por um texto genérico escrito à mão. O helper já
existe, já é a política do repo e mantém o `request_id` para suporte.
Arquivos e objetos a tocar: `supabase/functions/crm-db-bridge/index.ts`.
Não tocar / armadilhas: não perca o `request_id` — é o que liga a resposta ao log.
Depende de: — · Libera: 058, 059, 060, 061
Risco e como reverter: baixo. Reverter = `git revert` + redeploy.
Precisa de aprovação humana antes do merge: não
Como verificar: forçar um erro de banco em ambiente de teste → resposta sem nome de tabela nem `code` do Postgres,
e o log traz o detalhe com o mesmo `request_id` devolvido.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 058 — Adotar o helper de erro em `manage-users`
Onda / Severidade / Camada: 1 / Média / Edge function
Achados resolvidos: ACH-030
Problema hoje: `manage-users:179,199,213,287,330` devolvem erro cru do Postgres. É a função que mexe em conta de
usuário.
Causa raiz: idem 057.
Caminho recomendado: mesma troca da etapa 057, usando a 057 como referência de diff.
Por que este caminho e não o óbvio: idem 057.
Arquivos e objetos a tocar: `supabase/functions/manage-users/index.ts`.
Não tocar / armadilhas: não altere a lógica de autorização da função, só o formato do erro.
Depende de: 057 · Libera: 061
Risco e como reverter: baixo. Reverter = `git revert` + redeploy.
Precisa de aprovação humana antes do merge: não
Como verificar: erro forçado → resposta padronizada; o fluxo de criação/promoção de usuário continua funcionando.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 059 — Adotar o helper de erro em `step-up-verify` e `external-db-inspect`
Onda / Severidade / Camada: 1 / Média / Edge function
Achados resolvidos: ACH-030
Problema hoje: `step-up-verify:183,335` e `external-db-inspect:125,164` devolvem erro cru. A primeira é do fluxo de
elevação de sessão (MFA).
Causa raiz: idem 057.
Caminho recomendado: mesma troca, nas duas funções, numa PR.
Por que este caminho e não o óbvio: idem 057.
Arquivos e objetos a tocar: `supabase/functions/step-up-verify/index.ts`,
`supabase/functions/external-db-inspect/index.ts`.
Não tocar / armadilhas: em `step-up-verify`, a mensagem genérica não pode esconder do usuário a diferença entre
"código errado" e "sessão expirada" — mantenha o motivo de negócio, tire o detalhe do banco.
Depende de: 057 · Libera: 061
Risco e como reverter: baixo. Reverter = `git revert` + redeploy.
Precisa de aprovação humana antes do merge: não
Como verificar: código MFA errado → mensagem de negócio clara, sem `code` do Postgres.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 060 — Adotar o helper de erro em `force-global-logout`
Onda / Severidade / Camada: 1 / Baixa / Edge function
Achados resolvidos: ACH-030
Problema hoje: `force-global-logout:71` devolve erro cru.
Causa raiz: idem 057.
Caminho recomendado: mesma troca.
Por que este caminho e não o óbvio: idem 057.
Arquivos e objetos a tocar: `supabase/functions/force-global-logout/index.ts`.
Não tocar / armadilhas: função sensível (derruba sessões) — não mexa na autorização.
Depende de: 057 · Libera: 061
Risco e como reverter: baixo. Reverter = `git revert` + redeploy.
Precisa de aprovação humana antes do merge: não
Como verificar: erro forçado → resposta padronizada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 061 — Gate que exige o helper de erro em edge function nova
Onda / Severidade / Camada: 1 / Média / CI
Achados resolvidos: ACH-030
Problema hoje: a política está escrita em `_shared/error-response.ts:5`, a adoção é de 12 em 112, e não há gate.
Causa raiz: política sem verificação.
Caminho recomendado: script em `scripts/` que, nos arquivos de `supabase/functions/` tocados pela PR, falhe quando
houver `error.message`, `error.code` ou `JSON.stringify(error)` dentro de um corpo de resposta sem passar pelo
helper. Pendure no job `Static checks`. Não tente converter as 100 funções restantes — o gate olha só o que a PR toca.
Por que este caminho e não o óbvio: o óbvio é uma tarefa de migração em massa das 112. Ela não caberia numa PR
pequena e ninguém revisaria; o gate faz a adoção crescer sozinha.
Arquivos e objetos a tocar: novo `scripts/check-edge-error-response.mjs` + teste; workflow do `Static checks`;
`package.json`.
Não tocar / armadilhas: cuidado com falso positivo em log (`console.error(error.message)` é legítimo) — o gate deve
olhar só o que vai no corpo da resposta.
Depende de: 057, 058, 059, 060 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (CI)
Como verificar: função de teste com `error.message` no corpo → gate falha; usando o helper → passa.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 062 — Varredura de segredo em `recovery/`, fixtures e artefatos versionados
Onda / Severidade / Camada: 1 / Média / Segurança
Achados resolvidos: ACH-008, ACH-012
Problema hoje: a auditoria rodou `gitleaks` com a configuração do CI e os 30 achados estavam todos em
`graphify-out/cache/stat-index.json`, que é gitignored e não existe no checkout do CI. Com a allowlist de diretórios
removida (etapa 012), diretórios antes cegos passam a ser varridos — e `recovery/src-legacy` tem 100 componentes e
196 hooks de código legado que ninguém revisou sob esse ângulo.
Causa raiz: código legado importado para o repo sem varredura de segredo.
Caminho recomendado: rode `gitleaks detect --no-git` com a configuração **já sem** as allowlists de diretório e
trate cada achado: se for segredo real, registre local e tipo (nunca o valor) em
`docs/qa/rotacao-service-role.md` e abra etapa de rotação no progresso; se for fixture, acrescente o fingerprint.
Por que este caminho e não o óbvio: o óbvio é apagar `recovery/` por ser legado. Isso é mudança de escopo e pode
remover referência que alguém usa; varrer primeiro é barato.
Arquivos e objetos a tocar: `.gitleaks.toml` (fingerprints), `docs/qa/rotacao-service-role.md`.
Não tocar / armadilhas: nunca cole valor de segredo. Não apague `recovery/` nesta etapa.
Depende de: 012 · Libera: —
Risco e como reverter: zero (leitura + configuração). Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (segredos)
Como verificar: `gitleaks detect --no-git` → exit 0, e o relatório anterior à correção está colado no progresso.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

---

# ONDA 2 · Fluxos principais quebrados (063–092)

## Bloco 2.A — O custo de personalização que desaparece ao aplicar template (ACH-084)

<modelo_etapa>
Etapa 063 — Teste que prova o round-trip do template perdendo o custo
Onda / Severidade / Camada: 2 / Crítica / Regra de negócio
Achados resolvidos: ACH-084
Problema hoje: `applyTemplateToQuote.ts:100-107` monta `personalizations[]` só com `unit_cost` e `setup_cost`;
`quoteHelpers.ts:59-62` soma **só** `p.total_cost` → 0. A lista de templates mostra o custo certo
(`templateTotal.ts:52-62`). Os 27 testes dos dois arquivos passam porque cada lado é testado isolado.
Causa raiz: o objeto de personalização tem dois formatos e nenhum teste atravessa os dois.
Caminho recomendado: antes de corrigir, escreva um teste de integração que: pegue um template com personalização,
rode `applyTemplateToQuote`, passe o resultado por `quoteHelpers` e compare o total com o que `templateTotal`
mostra na lista. O teste deve **falhar** agora, com a diferença exata em reais.
Por que este caminho e não o óbvio: o óbvio é corrigir as 2 linhas direto. Sem o teste de travessia, a próxima
mudança em qualquer um dos três arquivos reabre o furo — foi assim que ele nasceu.
Arquivos e objetos a tocar: novo teste em `src/lib/quotes/__tests__/` (ou onde o repo guarda os testes desses módulos).
Não tocar / armadilhas: não altere os testes existentes dos 27 casos; eles estão corretos no escopo deles.
Depende de: — · Libera: 064, 065, 066
Risco e como reverter: zero. Reverter = apagar o teste.
Precisa de aprovação humana antes do merge: não
Como verificar: `npx vitest run <novo teste>` → falha, mostrando total esperado ≠ total calculado. Cole a saída.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 064 — Gravar `total_cost` ao aplicar o template
Onda / Severidade / Camada: 2 / Crítica / Regra de negócio
Achados resolvidos: ACH-084
Problema hoje: ver 063. O vendedor aplica um template e a cotação sai sem o custo da gravação.
Causa raiz: `applyTemplateToQuote.ts:100-107` não preenche o campo que o somador lê.
Caminho recomendado: em `applyTemplateToQuote.ts`, preencha `total_cost` usando **a mesma fórmula** que
`templateTotal.ts:52-62` já usa (`unitCost * qty + setupCost`), importando a função de lá em vez de reescrever a
conta — duas cópias da fórmula é o que criou o problema. Mantenha `unit_cost` e `setup_cost` no objeto; o consumidor
pode precisar deles.
Por que este caminho e não o óbvio: o óbvio é fazer `quoteHelpers.ts` somar `unit_cost * qty + setup_cost` quando
`total_cost` faltar. Isso espalha a fórmula para um terceiro lugar e deixa o dado gravado errado no banco.
Arquivos e objetos a tocar: `src/lib/quotes/applyTemplateToQuote.ts`; se a fórmula não estiver exportada,
`src/lib/quotes/templateTotal.ts` para exportá-la.
Não tocar / armadilhas: não mude `quoteHelpers.ts:59-62` — ele está certo em ler `total_cost`; mudar os dois lados
ao mesmo tempo torna impossível saber qual corrigiu.
Depende de: 063 · Libera: 065, 066
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste da etapa 063 passa; e o total de uma cotação criada por template bate, ao centavo, com o
valor mostrado na lista de templates.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 065 — Verificar as cotações já criadas por template sem custo de personalização
Onda / Severidade / Camada: 2 / Alta / Banco
Achados resolvidos: ACH-084
Problema hoje: as cotações feitas por template antes da correção estão gravadas sem o custo. A correção não as
conserta.
Causa raiz: o defeito é antigo e gravou dado.
Caminho recomendado: consulta de leitura que liste cotações com item de personalização em que o custo somado seja
zero e o template de origem tenha custo maior que zero. Entregue a lista em
`docs/qa/cotacoes-sem-custo-personalizacao.md` com valor, cliente e data, **sem corrigir nada** — recalcular
cotação já enviada ao cliente é decisão do dono, não do agente.
Por que este caminho e não o óbvio: o óbvio é rodar um UPDATE corrigindo os totais. Alterar valor de proposta já
enviada muda o que foi combinado com o cliente.
Arquivos e objetos a tocar: cria `docs/qa/cotacoes-sem-custo-personalizacao.md`.
Não tocar / armadilhas: nenhum UPDATE. Nenhum dado de cliente além do necessário para o dono identificar o caso.
Depende de: 064 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: sim (envolve decidir sobre valor já enviado ao cliente)
Como verificar: o documento traz a consulta, a contagem e a soma da diferença em reais.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 066 — Unificar a fórmula de custo de personalização num único módulo
Onda / Severidade / Camada: 2 / Média / Regra de negócio
Achados resolvidos: ACH-084, ACH-085
Problema hoje: além dos dois formatos do objeto, existem duas calculadoras mortas de preço de personalização
(`lib/personalization/calculators.ts:22-87` e `usePrecoCalculation.ts:136-178`), com regras diferentes da RPC que
realmente calcula, e as duas caem na primeira faixa em silêncio abaixo do MOQ.
Causa raiz: três implementações da mesma regra, nenhuma marcada como a oficial.
Caminho recomendado: declare no código qual é a fonte única (a RPC que roda em produção), deixe um único módulo no
front que a consome e **apague** as duas calculadoras mortas. Antes de apagar, confirme por grep que não têm
consumidor. Deixe no módulo um comentário curto dizendo que a conta canônica é a da RPC.
Por que este caminho e não o óbvio: o óbvio é "consertar" as duas calculadoras para concordarem com a RPC. Três
cópias que concordam hoje discordam na próxima mudança.
Arquivos e objetos a tocar: remove `src/lib/personalization/calculators.ts` e `usePrecoCalculation.ts` (se órfãos);
ajusta o módulo que fica.
Não tocar / armadilhas: se alguma das duas tiver consumidor, **não** apague — anote como achado novo e pare.
Depende de: 064 · Libera: —
Risco e como reverter: médio (remoção de arquivo). Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: `npm run qa:typecheck` e `npm run lint` verdes; `grep -rn "calculators\|usePrecoCalculation" src/`
sem resultado; o teste da etapa 063 continua passando.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 2.B — O cliente final não consegue imprimir a revista (ACH-046)

<modelo_etapa>
Etapa 067 — Mover `/magazine/print` para fora do `ProtectedRoute`
Onda / Severidade / Camada: 2 / Alta / Rotas
Achados resolvidos: ACH-046
Problema hoje: `PublicMagazineView.tsx:346` abre `/magazine/print?token=…`; a rota está em
`tools-routes.tsx:129-136`, dentro do `ProtectedRoute` (`AppRoutes.tsx:175-183`), e `ProtectedRoute.tsx:41-48`
redireciona anônimo para `/auth`. O cliente que recebeu o link não imprime o catálogo.
Causa raiz: a rota de impressão foi declarada junto das ferramentas internas, não junto das rotas públicas.
Caminho recomendado: mova a declaração da rota para `public-routes.tsx`, ao lado das outras rotas de magazine
público, e garanta que a tela valide o `token` por conta própria — o padrão de validação já existe no fluxo público
de magazine (edge `magazine-public-view`); use o mesmo. Sem token válido, a tela deve recusar, não redirecionar
para login.
Por que este caminho e não o óbvio: o óbvio é tirar a rota do `ProtectedRoute` e deixar aberta. Aí qualquer pessoa
imprime qualquer revista sem token.
Arquivos e objetos a tocar: `src/routes/tools-routes.tsx` (remove), `src/routes/public-routes.tsx` (adiciona), e a
tela de impressão para validar o token.
Não tocar / armadilhas: a impressão por usuário interno (vendedor logado) também usa essa rota — ela precisa
continuar funcionando sem token para quem está logado.
Depende de: — · Libera: 068
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: em janela anônima, abrir o link de impressão com token válido → a tela carrega; com token inválido →
recusa explícita; logado sem token → carrega.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 068 — Teste de rota garantindo que a impressão pública não exige login
Onda / Severidade / Camada: 2 / Média / Testes
Achados resolvidos: ACH-046
Problema hoje: há 9 testes para 141 rotas (`npx vitest run src/routes` → 4 arquivos / 9 testes). Nada impede a rota
voltar para dentro do `ProtectedRoute`.
Causa raiz: cobertura de rota quase inexistente.
Caminho recomendado: acrescente ao conjunto de `src/routes/__tests__` um caso que monte as rotas sem sessão e
afirme que `/magazine/print` **não** redireciona para `/auth`. Siga o padrão do teste de contrato de rota que já
existe (`src/App.router-contract.test.tsx` é a referência deste repo).
Por que este caminho e não o óbvio: o óbvio é confiar na etapa 067. A rota já esteve no lugar errado uma vez.
Arquivos e objetos a tocar: `src/routes/__tests__/` (novo caso).
Não tocar / armadilhas: não transforme o teste num snapshot de todas as 141 rotas — fica frágil e ninguém mantém.
Depende de: 067 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: `npx vitest run src/routes` → o novo caso passa; movendo a rota de volta para `tools-routes.tsx`
em teste local, ele falha.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 2.C — Administradores levam 403 no dispatcher de webhook (ACH-022)

<modelo_etapa>
Etapa 069 — Acrescentar `admin` ao `ROLE_RANK` do `dispatcher-auth`
Onda / Severidade / Camada: 2 / Alta / Edge function
Achados resolvidos: ACH-022
Problema hoje: `_shared/dispatcher-auth.ts:25` define `{agente:1, supervisor:2, dev:3}` e filtra em `:187`;
`webhook-dispatcher/index.ts:117` exige `minRole:"supervisor"`. Produção tem `vendedor` 80, `admin` 4, `dev` 2 —
`admin` cai fora do mapa, vira rank 0 e leva 403 `insufficient_role`. "Testar webhook" e "Reenviar entrega" só
funcionam para 2 contas dev.
Causa raiz: o mapa de papéis do helper ficou defasado em relação aos papéis reais. O helper irmão
`_shared/authorize.ts:41-46` **já corrigiu o mesmo bug** e documenta o BUGFIX; não foi propagado.
Caminho recomendado: alinhe `ROLE_RANK` de `dispatcher-auth.ts` ao de `authorize.ts:41-46` — copie o mapa de lá,
não invente um novo rank. Confira no banco (`select distinct role from user_roles`) que o mapa cobre todos os
papéis existentes.
Por que este caminho e não o óbvio: o óbvio é baixar `minRole` para `agente` em `webhook-dispatcher:117`. Isso
libera 80 vendedores para disparar webhook, que é o oposto do que a regra queria.
Arquivos e objetos a tocar: `supabase/functions/_shared/dispatcher-auth.ts`.
Não tocar / armadilhas: não mude `minRole` em `webhook-dispatcher/index.ts`. Não mexa em `authorize.ts`, que está correto.
Depende de: — · Libera: 070, 071
Risco e como reverter: baixo. Reverter = `git revert` + redeploy pelo workflow.
Precisa de aprovação humana antes do merge: não
Como verificar: com uma conta `admin` de teste, "Testar webhook" responde 200; com conta `vendedor`, 403.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 070 — Gate que compara os mapas de papel dos dois helpers de autorização
Onda / Severidade / Camada: 2 / Média / CI
Achados resolvidos: ACH-022
Problema hoje: dois helpers em `_shared/` carregam o mesmo conceito (rank de papel) e já divergiram uma vez, com
403 em produção para 4 contas.
Causa raiz: duplicação de uma tabela de verdade sem verificação de igualdade.
Caminho recomendado: teste (não precisa ser gate de workflow novo — um teste de unidade já roda no CI) que importa
`ROLE_RANK` de `authorize.ts` e de `dispatcher-auth.ts` e afirma que são iguais. Mais barato e mais direto que um
script de CI.
Por que este caminho e não o óbvio: o óbvio é unificar os dois helpers num só. É a solução certa a longo prazo e é
uma refatoração que atravessa 112 edge functions — fora do escopo de uma etapa pequena. O teste trava a divergência
hoje, pelo custo de 10 linhas.
Arquivos e objetos a tocar: novo teste em `supabase/functions/_shared/__tests__/` (ou onde o repo guarda os testes
Deno de `_shared`).
Não tocar / armadilhas: respeite o runner dos testes Deno do repo (`edge-functions-deno-tests.yml`) — não escreva
o teste em vitest se o resto é Deno.
Depende de: 069 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste passa; alterando um dos mapas localmente, ele falha.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 071 — Conferir se outros consumidores de `dispatcher-auth` estavam negando admin
Onda / Severidade / Camada: 2 / Média / Edge function
Achados resolvidos: ACH-022
Problema hoje: `webhook-dispatcher` foi o caso medido, mas `dispatcher-auth.ts` pode ter outros importadores com o
mesmo efeito.
Causa raiz: idem 069.
Caminho recomendado: `grep -rn "dispatcher-auth" supabase/functions/` e, para cada importador, verifique qual
`minRole` ele exige e se o papel `admin` ficava de fora. Registre a lista no progresso; se algum fluxo de negócio
estava negado a admin, anote como achado novo com o nome da função e da tela que o usa.
Por que este caminho e não o óbvio: o óbvio é parar na 069 porque o 403 já foi corrigido. O mapa corrigido conserta
todos os importadores de uma vez — mas só a verificação diz quais estavam quebrados, e isso é informação que o dono
precisa (eram funções que pareciam "com bug" e eram permissão).
Arquivos e objetos a tocar: nenhum (verificação) + anotação no `05-PROGRESSO.md`.
Não tocar / armadilhas: não corrija nada aqui.
Depende de: 069 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: a lista de importadores está no progresso, com o `minRole` de cada um.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 2.D — Falha de carga aparecendo como "não tem nada" nas telas principais (ACH-027, ACH-028, ACH-029)

<modelo_etapa>
Etapa 072 — Expor o erro do catálogo em `useCatalogState`
Onda / Severidade / Camada: 2 / Alta / Hooks
Achados resolvidos: ACH-027
Problema hoje: `useCatalogState.ts:260-273` consome `useProductsCatalog` e ignora `isError`; o hook não devolve
campo de erro. Zero ocorrências de `isError` no arquivo.
Causa raiz: o hook foi escrito para o caminho felizes e nunca propagou a falha.
Caminho recomendado: devolva `isError` e `error` do hook, sem mudar nada do que ele já devolve (é contrato usado em
várias telas). Não trate o erro aqui — só propague; a tela decide o que mostrar (etapa 073).
Por que este caminho e não o óbvio: o óbvio é mostrar um toast dentro do hook. Hook que fala com o usuário é
impossível de reaproveitar e duplica mensagem quando duas telas usam o mesmo hook.
Arquivos e objetos a tocar: `src/hooks/.../useCatalogState.ts`.
Não tocar / armadilhas: não remova nem renomeie nada do retorno atual.
Depende de: — · Libera: 073, 074
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: `npm run qa:typecheck` verde e o novo campo aparece no tipo de retorno do hook.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 073 — Estado de erro em `/produtos` e `/filtros`
Onda / Severidade / Camada: 2 / Alta / Interface
Achados resolvidos: ACH-027
Problema hoje: `FiltersPage.tsx:763-782` mostra "Nenhum produto encontrado" tanto para busca sem resultado quanto
para queda do banco ou erro de RLS. É a tela mais vista do sistema.
Causa raiz: um único estado visual para duas situações diferentes.
Caminho recomendado: separe os dois caminhos: `isError` → mensagem de falha com botão de tentar de novo
(`refetch`); `data.length === 0` → o vazio que já existe. Use o componente de erro que o repo já tem — procure
`EnhancedErrorBoundary` e `EmptyState` (`src/components/common/EmptyState.tsx`), que é o padrão usado em
`AdminRoute.tsx:63-72`.
Por que este caminho e não o óbvio: o óbvio é trocar o texto do vazio para "não foi possível carregar". Aí a busca
legítima sem resultado passa a parecer erro.
Arquivos e objetos a tocar: `src/pages/.../FiltersPage.tsx`.
Não tocar / armadilhas: não mexa na lógica de filtro nem na paginação.
Depende de: 072 · Libera: 075
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: simulando falha da query (mock no teste da tela), a tela mostra o estado de erro com botão; com
resultado vazio, mostra o vazio.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 074 — Estado de erro na vitrine inicial
Onda / Severidade / Camada: 2 / Alta / Interface
Achados resolvidos: ACH-027
Problema hoje: a mesma confusão entre erro e vazio alcança a vitrine (`/`), que também consome o catálogo.
Causa raiz: idem 073.
Caminho recomendado: aplique na vitrine o mesmo par erro/vazio da etapa 073, usando os mesmos componentes — a
consistência entre as duas telas importa mais que a escolha visual.
Por que este caminho e não o óbvio: o óbvio é deixar a vitrine mostrando vazio "porque é a home". A home vazia por
erro é a pior primeira impressão possível para um visitante.
Arquivos e objetos a tocar: `src/pages/Index.tsx` e o componente de grade que ela usa.
Não tocar / armadilhas: a vitrine tem seções (destaques, novidades, mais vendidos) — trate o erro por seção, não
derrube a página inteira por uma seção que falhou.
Depende de: 072 · Libera: 075
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: com a query de uma seção falhando no teste, só aquela seção mostra erro; as outras carregam.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 075 — Teste que impede erro voltar a parecer vazio no catálogo
Onda / Severidade / Camada: 2 / Média / Testes
Achados resolvidos: ACH-027
Problema hoje: nada impede a regressão.
Causa raiz: sem teste cobrindo o caminho de erro.
Caminho recomendado: teste de componente que renderiza a tela com a query em estado de erro e afirma que o texto
"Nenhum produto encontrado" **não** aparece e que o estado de erro aparece. Um teste por tela (produtos e vitrine).
Por que este caminho e não o óbvio: o óbvio é um teste de snapshot. Snapshot quebra por qualquer mudança visual e
vira ruído; afirmar a ausência do texto errado é preciso.
Arquivos e objetos a tocar: testes das duas telas.
Não tocar / armadilhas: não acople o teste ao texto exato da mensagem de erro; use `data-state` ou `role="alert"`.
Depende de: 073, 074 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: os dois testes passam; revertendo a etapa 073 localmente, o teste correspondente falha.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 076 — Propagar o erro de carga em `useCollections`
Onda / Severidade / Camada: 2 / Alta / Hooks
Achados resolvidos: ACH-028
Problema hoje: `useCollections.ts:147-151` só loga o erro e o retorno do hook (`:707-726`) não expõe campo de erro.
Causa raiz: erro tratado como log.
Caminho recomendado: acrescente `error`/`isError` ao retorno, sem alterar o resto do contrato, igual à etapa 072.
Por que este caminho e não o óbvio: idem 072 — não fale com o usuário dentro do hook.
Arquivos e objetos a tocar: `src/hooks/collections/useCollections.ts`.
Não tocar / armadilhas: o hook tem retorno grande (`:707-726`); acrescente, não reorganize.
Depende de: — · Libera: 077
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: typecheck verde; o campo aparece no tipo de retorno.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 077 — Estado de erro em `/colecoes`, separado do vazio com CTA
Onda / Severidade / Camada: 2 / Alta / Interface
Achados resolvidos: ACH-028
Problema hoje: `CollectionsPage.tsx:391,403` mostra vazio com convite para criar coleção quando a carga falhou —
o vendedor pode recriar coleção que já existe.
Causa raiz: idem 073, com agravante: o estado vazio induz uma ação errada.
Caminho recomendado: no erro, mostre falha + tentar de novo, e **esconda** o CTA de criar. Mesmos componentes da
etapa 073.
Por que este caminho e não o óbvio: o óbvio é mostrar o erro e manter o CTA. Manter o botão de criar numa tela que
não conseguiu listar é justamente o que gera a duplicata.
Arquivos e objetos a tocar: `src/pages/collections/CollectionsPage.tsx`.
Não tocar / armadilhas: não mude o fluxo de criação em si.
Depende de: 076 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: com a query em erro no teste, aparece erro e o CTA de criar não é renderizado.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 078 — Fazer os consumidores de `useQuoteTemplates` lerem o `error`
Onda / Severidade / Camada: 2 / Alta / Interface
Achados resolvidos: ACH-029
Problema hoje: `useQuoteTemplates.ts:110-111,464-469` já expõe `error`, e nenhum consumidor usa:
`QuoteTemplatesList.tsx:74-83` e `AdminTemplatesManager.tsx:34-35`.
Causa raiz: o hook foi corrigido e as telas não acompanharam.
Caminho recomendado: ligue o `error` nas duas telas, com o mesmo par erro/vazio das etapas anteriores. O hook já
está pronto — esta etapa é só nas telas.
Por que este caminho e não o óbvio: o óbvio é mexer no hook. Ele está certo.
Arquivos e objetos a tocar: `src/components/quotes/QuoteTemplatesList.tsx`,
`src/components/admin/AdminTemplatesManager.tsx`.
Não tocar / armadilhas: não altere `useQuoteTemplates.ts` nesta etapa (a 079 trata `fetchAllTemplates`).
Depende de: — · Libera: 079
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: com erro simulado, as duas telas mostram falha em vez de lista vazia.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 079 — Fazer `fetchAllTemplates` registrar o erro em vez de engolir
Onda / Severidade / Camada: 2 / Média / Hooks
Achados resolvidos: ACH-029
Problema hoje: `useQuoteTemplates.ts:124-134` (`fetchAllTemplates`) nem seta o estado de erro — o caminho do admin
falha sem deixar rastro.
Causa raiz: duas funções de busca no mesmo hook, só uma tratando erro.
Caminho recomendado: faça `fetchAllTemplates` escrever no mesmo estado de erro que a outra função já usa
(`:110-111`), sem criar um segundo campo.
Por que este caminho e não o óbvio: o óbvio é criar `errorAll`. Dois campos de erro no mesmo hook é o começo do
problema do grupo 10 (dois donos do mesmo estado).
Arquivos e objetos a tocar: `src/hooks/quotes/useQuoteTemplates.ts`.
Não tocar / armadilhas: não mude a assinatura do hook.
Depende de: 078 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: erro simulado no caminho de admin → a tela do admin mostra falha.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 2.E — Limite de desconto do vendedor com dois donos de estado (ACH-033)

<modelo_etapa>
Etapa 080 — Teste que prova o teto de desconto ficando desatualizado
Onda / Severidade / Camada: 2 / Alta / Regra de negócio
Achados resolvidos: ACH-033
Problema hoje: `useSellerDiscountLimits.ts:69,93` guarda o limite em `useState` e busca só no mount;
`SellerDiscountLimitsPanel.tsx:27,84` usa react-query. Nenhum propaga para o outro, e
`useQuoteBuilderState.ts:67` consome esse teto. O admin reduz o limite e o vendedor segue com o antigo.
Causa raiz: o mesmo dado tem duas fontes, uma delas sem invalidação.
Caminho recomendado: antes de corrigir, escreva o teste que monta o painel, altera o limite pela mutation e afirma
que o valor lido por `useQuoteBuilderState` mudou. Deve falhar agora.
Por que este caminho e não o óbvio: o óbvio é corrigir e testar manualmente. É um bug de dinheiro; ele precisa de
teste que o segure.
Arquivos e objetos a tocar: novo teste em `src/hooks/__tests__/`.
Não tocar / armadilhas: já existe `useQuoteBuilderState.discountLimit.test.tsx` — leia antes e não duplique o que
ele cobre; o que falta é a propagação entre painel e builder.
Depende de: — · Libera: 081, 082, 083
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: `npx vitest run` do novo teste → falha mostrando o valor antigo. Cole a saída.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 081 — Migrar `useSellerDiscountLimits` para react-query
Onda / Severidade / Camada: 2 / Alta / Hooks
Achados resolvidos: ACH-033
Problema hoje: o hook usa `useState` + fetch no mount; não participa do cache nem é invalidável.
Causa raiz: o hook é anterior à adoção do react-query nessa área.
Caminho recomendado: converta para `useQuery` com a **mesma** `queryKey` que `SellerDiscountLimitsPanel.tsx:27` já
usa — a chave compartilhada é o que faz os dois passarem a ler o mesmo dado. Mantenha o formato de retorno do hook
para não mexer nos consumidores.
Por que este caminho e não o óbvio: o óbvio é fazer o painel chamar o hook. Isso inverte a dependência (componente
de admin virando dono do estado do builder) e não resolve a invalidação.
Arquivos e objetos a tocar: `src/hooks/.../useSellerDiscountLimits.ts`.
Não tocar / armadilhas: confira a `queryKey` exata do painel; chave diferente mantém os dois caches separados e o
bug intacto (é o padrão do ACH-031/ACH-037).
Depende de: 080 · Libera: 082
Risco e como reverter: médio (hook de caminho de dinheiro). Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste da etapa 080 passa; o builder de orçamento continua aplicando o teto.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 082 — Invalidar o limite de desconto depois de alterá-lo
Onda / Severidade / Camada: 2 / Alta / Hooks
Achados resolvidos: ACH-033
Problema hoje: a mutation que grava o limite não invalida a chave que o builder lê.
Causa raiz: mutation sem invalidação (padrão do grupo 10).
Caminho recomendado: no `onSuccess` da mutation do painel, `invalidateQueries` da chave compartilhada. Veja como
`useSellerCarts.ts:319,357` faz invalidação com rollback — é a referência boa do repo nesse ponto.
Por que este caminho e não o óbvio: o óbvio é baixar o `staleTime`. Isso só encurta a janela de erro; a invalidação
fecha.
Arquivos e objetos a tocar: `src/components/admin/SellerDiscountLimitsPanel.tsx` (ou o hook de mutation que ele usa).
Não tocar / armadilhas: invalide a chave, não `queryClient.clear()`.
Depende de: 081 · Libera: 083
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: alterar o limite no painel e, sem recarregar, abrir o builder → o novo teto já vale. O teste da
etapa 080 cobre.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 083 — Reforçar o teto de desconto no banco, não só no front
Onda / Severidade / Camada: 2 / Alta / Banco
Achados resolvidos: ACH-033, ACH-096
Problema hoje: mesmo com 081 e 082, o teto continua sendo decisão do front. `seller_discount_limits` tem CHECK de
0–100, mas nada liga o desconto aplicado na cotação ao limite do vendedor que a está editando.
Causa raiz: a regra de alçada vive na interface.
Caminho recomendado: migration com trigger em `quotes`/`quote_items` que recuse desconto acima do limite do
vendedor responsável, exceto quando houver aprovação registrada. O repo já tem
`fn_deferred_quote_discount_integrity` — leia essa função antes e estenda a mesma linha, em vez de criar um
mecanismo paralelo.
Por que este caminho e não o óbvio: o óbvio é confiar no front depois de 081/082. Qualquer escrita por CRM, SQL ou
edge contorna.
Arquivos e objetos a tocar: nova migration; trigger/função em `public.quotes` ou `public.quote_items`; rollback.
Não tocar / armadilhas: cuidado para não bloquear a própria gravação da aprovação; e lembre que o grupo 27 mostra
que o trigger de recálculo mexe nos campos de desconto — leia `fn_quotes_recalc_subtotal_from_items` antes.
Depende de: 082, 122 · Libera: —
Risco e como reverter: alto (pode travar gravação de cotação). Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: em transação revertida, aplicar desconto acima do limite sem aprovação → erro; com aprovação
registrada → sucesso.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 2.F — Permissões em cache e comentário que não aparece (ACH-034, ACH-035)

<modelo_etapa>
Etapa 084 — Invalidar `['role-permissions']` depois de gravar permissões de papel
Onda / Severidade / Camada: 2 / Alta / Hooks
Achados resolvidos: ACH-034
Problema hoje: `RolePermissionsPage.tsx:144-178` grava `role_permissions` e só recarrega o `useState` local; a chave
`['role-permissions']` (`useRBAC.tsx:96`, `staleTime` 5 min) aparece **uma única vez em todo o `src/`** — nunca é
invalidada. Por até 5 minutos a interface libera ou esconde ações pelo conjunto antigo.
Causa raiz: a tela de administração não conversa com o cache do RBAC.
Caminho recomendado: no sucesso da gravação, `invalidateQueries(['role-permissions'])`. Se a tela não tem acesso ao
`queryClient`, use `useQueryClient()` — é o padrão do repo.
Por que este caminho e não o óbvio: o óbvio é baixar o `staleTime` do RBAC. Isso faz toda a aplicação revalidar
permissão com mais frequência, por um problema que é de uma tela.
Arquivos e objetos a tocar: `src/pages/admin/RolePermissionsPage.tsx`.
Não tocar / armadilhas: não mexa em `useRBAC.tsx` — o `staleTime` de 5 min lá é decisão de desempenho.
Depende de: — · Libera: 085
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: alterar uma permissão e, sem recarregar, conferir que a interface reflete; teste de componente
afirmando a chamada de invalidação.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 085 — Substituir o `useState` local de `RolePermissionsPage` pela query compartilhada
Onda / Severidade / Camada: 2 / Média / Hooks
Achados resolvidos: ACH-034
Problema hoje: mesmo invalidando (etapa 084), a tela mantém a própria cópia do estado em `useState`, que é a raiz da
divergência.
Causa raiz: dois donos do mesmo dado.
Caminho recomendado: faça a tela ler da mesma query `['role-permissions']` e remova o `useState` de leitura
(mantenha só o estado de edição em andamento). Mesmo raciocínio da etapa 081.
Por que este caminho e não o óbvio: o óbvio é parar na 084. Invalidação sem fonte única só sincroniza enquanto
ninguém esquecer de invalidar na próxima mutation.
Arquivos e objetos a tocar: `src/pages/admin/RolePermissionsPage.tsx`.
Não tocar / armadilhas: a tela faz escrita em laço (ACH-054, etapa 236) — não conserte isso aqui.
Depende de: 084 · Libera: —
Risco e como reverter: médio. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: a tela continua editando e salvando; o estado exibido vem da query (confirmável pelo devtools do
react-query ou por teste).
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 086 — Invalidar a lista de comentários depois de comentar no kit
Onda / Severidade / Camada: 2 / Alta / Hooks
Achados resolvidos: ACH-035
Problema hoje: `useKitCollaboration.ts:133,156` (`postComment`/`resolveComment`) não invalidam nada; o único refresh
é a assinatura realtime de `kit_comments` em `:115-118`, e `kit_comments` **não está** na publicação
`supabase_realtime` (medido). Quem comenta não vê o próprio comentário até recarregar.
Causa raiz: a atualização foi delegada ao realtime, e o realtime dessa tabela não existe.
Caminho recomendado: acrescente `invalidateQueries` da chave de comentários no sucesso das duas mutations. Faça isto
**antes** de decidir sobre o realtime (etapa 087) — assim a tela funciona mesmo que o realtime nunca seja ligado.
Por que este caminho e não o óbvio: o óbvio é publicar `kit_comments` no realtime. Isso é DDL em produção, depende
de aprovação e deixa a tela quebrada enquanto espera; a invalidação resolve hoje e continua correta depois.
Arquivos e objetos a tocar: `src/hooks/kit-builder/useKitCollaboration.ts`.
Não tocar / armadilhas: não remova a assinatura realtime nesta etapa.
Depende de: — · Libera: 087, 088
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: comentar num kit e ver o comentário aparecer sem recarregar; teste afirmando a invalidação.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 087 — Decidir e registrar se `kit_comments` entra no realtime
Onda / Severidade / Camada: 2 / Média / Banco
Achados resolvidos: ACH-035, ACH-044
Problema hoje: o código assina realtime numa tabela fora da publicação. Ou a tabela entra, ou a assinatura sai.
Causa raiz: a publicação do realtime e o código evoluíram separados.
Caminho recomendado: decida por uso: colaboração em kit é multiusuário e se beneficia de tempo real → migration
que acrescenta `kit_comments` a `supabase_realtime`. Se a colaboração simultânea não é cenário real, remova a
assinatura. Registre a decisão no corpo da migration ou no commit.
Por que este caminho e não o óbvio: o óbvio é publicar tudo o que o código assina (são 6 tabelas, ACH-044). Cada
tabela publicada é custo de banco contínuo; decida uma a uma.
Arquivos e objetos a tocar: nova migration (se publicar) ou `useKitCollaboration.ts` (se remover); rollback.
Não tocar / armadilhas: as outras 5 tabelas do ACH-044 têm etapa própria (203–206) — não trate junto.
Depende de: 086 · Libera: —
Risco e como reverter: baixo. Reverter = rollback ou `git revert`.
Precisa de aprovação humana antes do merge: sim, se for publicar (DDL em produção)
Como verificar: `select * from pg_publication_tables where pubname='supabase_realtime' and tablename='kit_comments'`
→ 1 linha (se publicou) ou 0 com a assinatura removida do código.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 088 — Fazer o fallback da colaboração cobrir também a ausência de publicação
Onda / Severidade / Camada: 2 / Média / Hooks
Achados resolvidos: ACH-035
Problema hoje: o fallback de `useKitCollaboration` só cobre `CHANNEL_ERROR`. Quando a tabela não está publicada, o
canal **conecta** com sucesso e simplesmente nunca entrega evento — o fallback não dispara.
Causa raiz: o fallback trata erro de canal, não ausência de evento.
Caminho recomendado: acrescente um `refetch` periódico de baixa frequência enquanto a tela de colaboração está
aberta, como rede de segurança, e registre no log quando o canal conecta mas não entrega nada em N segundos.
Por que este caminho e não o óbvio: o óbvio é confiar no `SUBSCRIBED`. O estado `SUBSCRIBED` não garante que a
tabela está publicada — foi exatamente o que escondeu este bug.
Arquivos e objetos a tocar: `src/hooks/kit-builder/useKitCollaboration.ts`.
Não tocar / armadilhas: frequência baixa (dezenas de segundos), senão vira o problema de carga do grupo 16.
Depende de: 086 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: com a tabela não publicada, o comentário de outro usuário aparece no próximo ciclo de refetch.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 2.G — Avisos que não chegam e botão sem ação (ACH-047, ACH-048)

<modelo_etapa>
Etapa 089 — Corrigir a comparação de `href` que impede o badge de aprovações aparecer
Onda / Severidade / Camada: 2 / Média / Interface
Achados resolvidos: ACH-047
Problema hoje: `SidebarReorganized.tsx:482` compara `href === '/admin/usuarios?tab=discounts'`, href que não existe
no menu (o item em `:252` é `/admin/usuarios`). O badge nunca renderiza.
Causa raiz: o href do badge foi escrito com query string e o item do menu não tem.
Caminho recomendado: compare pelo caminho do item (`/admin/usuarios`) e não pela URL com query. Melhor ainda: marque
o item do menu com um identificador próprio e compare por ele, para a correspondência não depender de string de URL.
Por que este caminho e não o óbvio: o óbvio é acrescentar `?tab=discounts` ao href do item do menu. Isso muda a
navegação do item (passa a abrir sempre na aba de descontos) por causa de um badge.
Arquivos e objetos a tocar: `src/components/layout/SidebarReorganized.tsx`.
Não tocar / armadilhas: o contador do cabeçalho (`Header.tsx:268`) já funciona — não mexa nele.
Depende de: — · Libera: 090
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: com pendências de desconto em ambiente de teste, o badge aparece no item de usuários do menu.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 090 — Desligar o `refetchInterval` órfão do badge
Onda / Severidade / Camada: 2 / Baixa / Hooks
Achados resolvidos: ACH-047, ACH-037
Problema hoje: a query de `SidebarReorganized.tsx:453-473` roda com `refetchInterval: 30_000` e, antes da etapa 089,
não tinha consumidor nenhum — 2 requisições por minuto por sessão aberta, sem destino.
Causa raiz: query mantida depois de o consumidor parar de funcionar.
Caminho recomendado: com o badge funcionando (etapa 089), reavalie o intervalo: 30 s é agressivo para contagem de
aprovação. Alinhe com a query equivalente do `Header.tsx:268` para as duas usarem a **mesma** chave e as mesmas
opções — é o ACH-037 (3 observers com 3 `queryFn`), e tratar aqui evita duas correções no mesmo lugar.
Por que este caminho e não o óbvio: o óbvio é só remover o `refetchInterval`. Com 089 o badge passa a depender dele
para atualizar; o ponto é alinhar, não remover.
Arquivos e objetos a tocar: `src/components/layout/SidebarReorganized.tsx`, `src/components/layout/Header.tsx`.
Não tocar / armadilhas: a terceira ocorrência (`AdminUsuariosPage.tsx:80`, que usa HEAD) é tratada na etapa 199 —
não unifique as três aqui sem ler aquela etapa.
Depende de: 089 · Libera: 199
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: no devtools de rede, a contagem passa a ser uma requisição compartilhada, não duas independentes.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 091 — Dar ação ao botão "Exportar Relatório" da comparação de fornecedores
Onda / Severidade / Camada: 2 / Média / Interface
Achados resolvidos: ACH-048, ACH-078
Problema hoje: `SupplierComparisonModal.tsx:287` é um botão sem handler, numa tela de produto
(`ProductDetail.tsx:426`). O mesmo botão também não tem nome acessível.
Causa raiz: botão adicionado antes da funcionalidade.
Caminho recomendado: duas saídas honestas — implementar a exportação reusando o gerador de PDF/planilha que o repo
já tem (`src/components/pdf/`), ou **remover o botão**. Se o dono não pediu a exportação, remover é a correção certa:
botão que não faz nada é pior que ausência de botão. Decida olhando se há pedido registrado; na dúvida, remova e
anote no progresso. No caminho de implementar, acrescente `aria-label`.
Por que este caminho e não o óbvio: o óbvio é deixar o botão desabilitado com "em breve". Isso congela a dívida na
tela do usuário.
Arquivos e objetos a tocar: `src/components/.../SupplierComparisonModal.tsx`.
Não tocar / armadilhas: não mexa na lógica de comparação.
Depende de: — · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: o botão exporta um arquivo válido, ou não existe mais na tela.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 092 — Varredura dirigida de "erro virando vazio" nas demais telas de fluxo principal
Onda / Severidade / Camada: 2 / Média / Interface
Achados resolvidos: ACH-027, ACH-028, ACH-029
Problema hoje: o padrão "erro engolido vira estado vazio" foi confirmado em catálogo, coleções e templates. Não foi
varrido nas outras telas de fluxo principal (orçamentos, kit-builder, mockups, frete).
Causa raiz: o padrão é copiado de tela em tela.
Caminho recomendado: varra as telas de `src/pages/quotes`, `src/pages/kit-builder`, `src/pages/mockups` e
`src/pages/freight` procurando por consumo de hook de dados sem leitura de `isError`. Entregue a lista em
`docs/qa/telas-sem-estado-de-erro.md` e **não corrija** — cada tela vira uma etapa no seu progresso, seguindo o
modelo das etapas 073/077.
Por que este caminho e não o óbvio: o óbvio é corrigir todas de uma vez. Uma PR tocando 15 telas não é revisável, e
cada tela tem um estado vazio legítimo diferente.
Arquivos e objetos a tocar: cria `docs/qa/telas-sem-estado-de-erro.md`.
Não tocar / armadilhas: não conte como achado a tela cujo hook simplesmente não falha (dado local).
Depende de: 073, 077, 078 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o documento lista arquivo:linha de cada caso e a contagem total.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

---

# ONDA 3 · Integridade de dados e regras de negócio (093–148)

## Bloco 3.A — A máquina de estados da cotação (ACH-086, ACH-087, ACH-088, ACH-089)

<modelo_etapa>
Etapa 093 — Teste que prova o banco aceitando transição proibida de status
Onda / Severidade / Camada: 3 / Alta / Banco
Achados resolvidos: ACH-086
Problema hoje: `fn_quotes_enforce_immutability` faz `IF OLD.status NOT IN ('approved','converted') THEN RETURN NEW` —
qualquer outra transição passa. `valid_quote_status` é só CHECK de valores. `src/lib/quote-status-config.ts:120-131`
proíbe `cancelled → approved` e `rejected → approved`, e o banco aceita os dois.
Causa raiz: o mapa de transições vive só em TypeScript.
Caminho recomendado: teste de banco (em transação revertida) que percorre os pares proibidos do mapa de
`quote-status-config.ts` e afirma que o UPDATE falha. Importe o mapa do próprio arquivo TS para o teste, em vez de
redigitar os pares — assim o teste acompanha o mapa.
Por que este caminho e não o óbvio: o óbvio é escrever o trigger primeiro. Sem o teste derivado do mapa, o trigger
e o mapa vão divergir na primeira mudança de regra.
Arquivos e objetos a tocar: novo teste em `tests/` (banco).
Não tocar / armadilhas: o teste **não** pode deixar dado em produção — transação revertida, sempre.
Depende de: — · Libera: 094
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste falha hoje, listando os pares que o banco aceitou. Cole a saída.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 094 — Trigger de transição de status válida em `quotes`
Onda / Severidade / Camada: 3 / Alta / Banco
Achados resolvidos: ACH-086
Problema hoje: ver 093. Cotação cancelada ou recusada pode voltar a aprovada por qualquer caminho de escrita.
Causa raiz: a imutabilidade só cobre o estado final; nada valida o par (de → para).
Caminho recomendado: migration que estende `fn_quotes_enforce_immutability` (não crie função paralela) com a tabela
de pares válidos, derivada do mapa de `quote-status-config.ts:120-131`. Deixe a tabela de pares em uma função
própria ou numa tabela de configuração, para que uma mudança de regra não exija reescrever o trigger. Mensagem de
erro reconhecível pelo front.
Por que este caminho e não o óbvio: o óbvio é bloquear só os dois pares citados (`cancelled → approved`,
`rejected → approved`). O problema é a ausência de validação de par, não os dois casos achados.
Arquivos e objetos a tocar: nova migration; `fn_quotes_enforce_immutability`; rollback.
Não tocar / armadilhas: há 4 caminhos no front que escrevem status sem a guarda (etapas 096–099) — eles vão começar
a receber erro do banco. É o resultado esperado; as etapas seguintes tratam a mensagem.
Depende de: 093 · Libera: 095, 096, 097, 098, 099
Risco e como reverter: alto — pode bloquear transição legítima que o mapa do front não previu. Rode a etapa 143
antes para saber quais transições existem de fato no histórico. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: o teste da etapa 093 passa inteiro; e as transições legítimas do fluxo normal continuam funcionando
em ambiente de teste.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 095 — Um único caminho de escrita de status no front
Onda / Severidade / Camada: 3 / Alta / Front
Achados resolvidos: ACH-086
Problema hoje: quatro lugares escrevem status de cotação sem passar pela guarda do front.
Causa raiz: a guarda é uma função que ninguém é obrigado a chamar.
Caminho recomendado: crie (ou use, se já existir) um único serviço `atualizarStatusCotacao` que valida pelo mapa e
só então chama o Supabase; os quatro pontos passam a usá-lo nas etapas 096–099. Leia antes
`src/lib/quote-status-config.ts` e veja se já existe função de validação exportada — se existir, o serviço só a
encapsula com a chamada ao banco.
Por que este caminho e não o óbvio: o óbvio é chamar a validação nos 4 lugares. Aí o 5º lugar que aparecer vai
esquecer de novo; um único caminho de escrita é o que resolve.
Arquivos e objetos a tocar: novo arquivo em `src/lib/quotes/`.
Não tocar / armadilhas: não mude a assinatura do que os 4 pontos já fazem além da troca da chamada.
Depende de: 094 · Libera: 096, 097, 098, 099
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: typecheck verde; teste de unidade do serviço cobrindo um par válido e um proibido.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 096 — `useDiscountApproval` passa a escrever status pelo caminho único
Onda / Severidade / Camada: 3 / Alta / Hooks
Achados resolvidos: ACH-086
Problema hoje: `useDiscountApproval.ts:209` escreve status direto, sem a guarda.
Causa raiz: idem 095.
Caminho recomendado: troque a escrita direta pela chamada ao serviço da etapa 095 e trate o erro exibindo a
mensagem do banco/serviço.
Por que este caminho e não o óbvio: o óbvio é só acrescentar um `if` de validação antes do update.
Arquivos e objetos a tocar: `src/hooks/.../useDiscountApproval.ts`.
Não tocar / armadilhas: este hook participa do fluxo de aprovação de desconto — teste o caminho feliz antes de mergear.
Depende de: 095 · Libera: 101
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: aprovar um desconto em ambiente de teste funciona; tentar uma transição proibida mostra erro legível.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 097 — `DiscountApprovalQueue` passa a escrever status pelo caminho único
Onda / Severidade / Camada: 3 / Alta / Interface
Achados resolvidos: ACH-086
Problema hoje: `DiscountApprovalQueue.tsx:162` escreve status direto.
Causa raiz: idem 095.
Caminho recomendado: igual à etapa 096.
Por que este caminho e não o óbvio: idem 096.
Arquivos e objetos a tocar: `src/components/admin/DiscountApprovalQueue.tsx`.
Não tocar / armadilhas: este componente consta como **órfão** no ACH-073 (351 linhas, 0 imports). Antes de corrigir,
confirme por grep se ele é renderizado; se for órfão de verdade, a etapa certa é a 276 (remoção) e esta deve ser
anotada como "não aplicável" no progresso.
Depende de: 095 · Libera: 101
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: se o componente é usado, o fluxo da fila funciona; se é órfão, o progresso registra a decisão.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 098 — `DiscountRequestDetailPage` passa a escrever status pelo caminho único
Onda / Severidade / Camada: 3 / Alta / Interface
Achados resolvidos: ACH-086
Problema hoje: `DiscountRequestDetailPage.tsx:107` escreve status direto. É a tela de `/admin/aprovacoes-desconto/:id`.
Causa raiz: idem 095.
Caminho recomendado: igual à etapa 096.
Por que este caminho e não o óbvio: idem 096.
Arquivos e objetos a tocar: `src/pages/admin/DiscountRequestDetailPage.tsx`.
Não tocar / armadilhas: esta é a tela que o dono usa para aprovar desconto — valide o caminho feliz com cuidado.
Depende de: 095 · Libera: 101
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: aprovar e recusar pela tela funciona em ambiente de teste.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 099 — `QuoteViewPage` passa a escrever status pelo caminho único
Onda / Severidade / Camada: 3 / Alta / Interface
Achados resolvidos: ACH-086
Problema hoje: `QuoteViewPage.tsx:321` escreve status direto.
Causa raiz: idem 095.
Caminho recomendado: igual à etapa 096.
Por que este caminho e não o óbvio: idem 096.
Arquivos e objetos a tocar: `src/pages/quotes/QuoteViewPage.tsx`.
Não tocar / armadilhas: é a tela central de cotação; não altere mais nada nela nesta etapa.
Depende de: 095 · Libera: 101
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: mudar status pela tela funciona para os pares válidos e dá erro legível nos proibidos.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 100 — Remover o bypass `pending → pending_approval` do builder
Onda / Severidade / Camada: 3 / Média / Front
Achados resolvidos: ACH-087
Problema hoje: `useQuoteBuilderState.ts:736-746` libera `pending → pending_approval`, par que não está no mapa de
`quote-status-config.ts`.
Causa raiz: o builder precisou de um par que ninguém acrescentou ao mapa — e resolveu contornando a própria SSOT.
Caminho recomendado: decida qual dos dois está certo: se `pending → pending_approval` é transição legítima,
**acrescente ao mapa** e remova o bypass; se não é, remova o bypass e corrija o fluxo do builder. Leia o fluxo de
aprovação para decidir e registre a escolha no commit.
Por que este caminho e não o óbvio: o óbvio é apagar o bypass. Se a transição é legítima, você quebra o envio para
aprovação.
Arquivos e objetos a tocar: `src/hooks/.../useQuoteBuilderState.ts` e/ou `src/lib/quote-status-config.ts`.
Não tocar / armadilhas: se acrescentar ao mapa, o trigger da etapa 094 precisa ser atualizado junto — mapa e trigger
não podem divergir.
Depende de: 094 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: enviar cotação para aprovação funciona; o teste da etapa 093 continua passando.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 101 — Fazer `assertDiscountApprovalTransition` valer em todos os pontos de escrita
Onda / Severidade / Camada: 3 / Baixa / Front
Achados resolvidos: ACH-088
Problema hoje: a função diz, em comentário, cobrir "todos os pontos de escrita do FE" e tem **1** call site.
Causa raiz: comentário escrito na intenção, não no fato.
Caminho recomendado: com o caminho único das etapas 096–099 no lugar, chame a asserção dentro do serviço da etapa
095 — assim ela passa a valer para todos, de fato, e o comentário vira verdade. Ajuste o texto do comentário para
descrever o que o código faz.
Por que este caminho e não o óbvio: o óbvio é espalhar a chamada nos 4 pontos. Centralizar no serviço é a mesma
correção com um lugar só para manter.
Arquivos e objetos a tocar: o serviço da etapa 095 e o arquivo da asserção.
Não tocar / armadilhas: não mude a lógica da asserção.
Depende de: 096, 097, 098, 099 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: `grep -rn "assertDiscountApprovalTransition" src/` mostra a chamada no serviço; teste de unidade do
serviço cobre o caso rejeitado.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 102 — Fazer `discount_approval_requests` chegar a `expired`
Onda / Severidade / Camada: 3 / Média / Banco
Achados resolvidos: ACH-089
Problema hoje: nenhum dos 168 cron jobs faz a transição para `expired` (varredura de `cron.job`). A fila do admin
mostra "Aprovado" para aprovação que o banco já trata como vencida.
Causa raiz: o estado `expired` existe no modelo e nada o produz.
Caminho recomendado: migration que cria um cron job diário chamando uma função que marca como `expired` as
solicitações cujo prazo passou. Siga o padrão dos cron jobs que já existem (leia `cron.job` para ver como as
chamadas são escritas neste projeto, inclusive o segredo do vault). Defina o prazo pelo que a regra de negócio diz
(§6: orçamento expira em 30 dias sem resposta) — se não houver prazo definido para aprovação de desconto, pergunte
ao dono em vez de inventar.
Por que este caminho e não o óbvio: o óbvio é a tela calcular "vencido" na hora de exibir. Aí cada tela calcula de
um jeito e o banco nunca tem a verdade.
Arquivos e objetos a tocar: nova migration (função + `cron.schedule`); rollback que faz `cron.unschedule`.
Não tocar / armadilhas: `cron.job` é DDL para efeito deste repo — nasce como migration, nunca por MCP (foi o
incidente de 2026-10-13).
Depende de: — · Libera: —
Risco e como reverter: médio. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL + cron em produção)
Como verificar: após a primeira execução, `select status, count(*) from discount_approval_requests group by 1`
mostra `expired` > 0 para as vencidas, e `cron.job_run_details` do job sem falha.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 3.B — Quatro definições de "total da cotação" (ACH-090 a ACH-094)

<modelo_etapa>
Etapa 103 — Teste que prova a soma das linhas não fechando com o subtotal
Onda / Severidade / Camada: 3 / Média / Regra de negócio
Achados resolvidos: ACH-091
Problema hoje: markup aplicado por linha (`quoteMarkup.ts:40-50`) contra markup agregado (`quoteHelpers.ts:88`).
Prova numérica medida: unitário 1,01 × 7 com markup de 13% → **7,98** somando linhas e **7,99** no subtotal persistido.
Causa raiz: o arredondamento acontece em momentos diferentes nos dois caminhos.
Caminho recomendado: teste de unidade com esse caso exato (1,01 × 7, markup 13%) afirmando que os dois caminhos
dão o mesmo número. Deve falhar agora, com 7,98 ≠ 7,99.
Por que este caminho e não o óbvio: o óbvio é escolher um dos dois e ajustar o outro sem teste. O teste é o que
registra qual é o número certo segundo o negócio.
Arquivos e objetos a tocar: novo teste em `src/lib/quotes/__tests__/`.
Não tocar / armadilhas: `round2` do front já foi verificado e é half-up correto, idêntico ao Postgres — o problema
não é a função de arredondar, é onde ela é chamada.
Depende de: — · Libera: 104, 105, 106
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste falha com a diferença de 1 centavo. Cole a saída.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 104 — Decidir e documentar onde o arredondamento acontece
Onda / Severidade / Camada: 3 / Média / Regra de negócio
Achados resolvidos: ACH-091, ACH-092
Problema hoje: não há decisão registrada sobre arredondar por linha ou no total.
Causa raiz: a regra de arredondamento nunca foi escrita; cada implementação escolheu.
Caminho recomendado: escreva a decisão em `docs/contexto/regras/manual/regras.md` (é o arquivo de regras humanas,
prioridade máxima no repo, e é onde o dono registra decisão de negócio). A escolha de mercado para proposta
comercial é arredondar **por linha**, porque é o que o cliente vê no PDF e consegue conferir. Deixe o número do
exemplo (1,01 × 7, 13%) na regra, para não haver dúvida.
Por que este caminho e não o óbvio: o óbvio é decidir no código. Decisão de negócio escrita só no código é decisão
que o próximo agente muda sem saber.
Arquivos e objetos a tocar: `docs/contexto/regras/manual/regras.md`.
Não tocar / armadilhas: é PR só de `.md` → docs-only (E14), os gates de código não rodam. Não aproveite para mexer
em código no mesmo PR.
Depende de: 103 · Libera: 105, 106, 109
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: sim (decisão de negócio — o dono confirma a escolha)
Como verificar: a regra está no arquivo, com o exemplo numérico.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 105 — Alinhar o cálculo agregado à decisão de arredondamento
Onda / Severidade / Camada: 3 / Média / Regra de negócio
Achados resolvidos: ACH-091
Problema hoje: `quoteHelpers.ts:88` aplica markup sobre o agregado.
Causa raiz: idem 103.
Caminho recomendado: se a decisão da etapa 104 for "por linha", faça o agregado **somar as linhas já arredondadas**
em vez de aplicar markup sobre a soma. Reuse a função de linha de `quoteMarkup.ts:40-50` em vez de reimplementar.
Por que este caminho e não o óbvio: o óbvio é arredondar o resultado final para bater. Isso faz o total bater e as
linhas continuarem sem fechar.
Arquivos e objetos a tocar: `src/hooks/quotes/quoteHelpers.ts`.
Não tocar / armadilhas: este arquivo também é o somador do ACH-084 (`:59-62`) — não mexa naquele trecho aqui.
Depende de: 104 · Libera: 106, 109
Risco e como reverter: médio (muda valor de cotação nova). Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste da etapa 103 passa; e uma cotação de exemplo tem soma de linhas = subtotal, ao centavo.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 106 — Garantir que o PDF usa o mesmo total do banco
Onda / Severidade / Camada: 3 / Média / Interface
Achados resolvidos: ACH-091
Problema hoje: o PDF é gerado a partir do cálculo do front, enquanto o subtotal persistido vem do trigger — por isso
a diferença chega ao cliente.
Causa raiz: o documento que vai ao cliente não lê a fonte que o banco gravou.
Caminho recomendado: faça o gerador de PDF ler os totais **persistidos** da cotação, não recalcular. Se o front
precisar exibir antes de salvar, exiba o cálculo local, mas o PDF (que é o documento) usa o gravado.
Por que este caminho e não o óbvio: o óbvio é recalcular no PDF "para garantir". Recalcular é o que cria a terceira
versão do número.
Arquivos e objetos a tocar: `src/components/pdf/` (o gerador da proposta).
Não tocar / armadilhas: se o dado persistido estiver errado por causa do ACH-090, corrija 109 antes — senão o PDF
passa a refletir o erro do trigger.
Depende de: 105, 109 · Libera: 107
Risco e como reverter: médio. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: gerar o PDF de uma cotação salva e comparar cada linha e o total com o que está em `quotes`/`quote_items`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 107 — Teste de centavo no PDF da proposta
Onda / Severidade / Camada: 3 / Média / Testes
Achados resolvidos: ACH-091
Problema hoje: nada impede a divergência de voltar.
Causa raiz: sem teste cobrindo o documento.
Caminho recomendado: teste que monta uma cotação com o caso de borda da etapa 103, gera o conteúdo do PDF (os dados,
não o binário) e afirma que a soma das linhas é igual ao total.
Por que este caminho e não o óbvio: o óbvio é testar o binário do PDF. Teste de binário é frágil; testar os dados
que alimentam o PDF pega o que importa.
Arquivos e objetos a tocar: novo teste do gerador de proposta.
Não tocar / armadilhas: não use snapshot do PDF.
Depende de: 106 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste passa; revertendo a etapa 105 localmente, ele falha.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 108 — Teste que prova o trigger gravando desconto em dois campos ao mesmo tempo
Onda / Severidade / Camada: 3 / Alta / Banco
Achados resolvidos: ACH-090
Problema hoje: o front mantém **só um** campo de desconto não-zero (`quoteHelpers.ts:128-144`);
`fn_quotes_recalc_subtotal_from_items` grava `discount_amount` **mantendo** `discount_percent`. O alerta de
`useQuoteBuilderState.helpers.ts:541-543` dispara em toda cotação com desconto percentual.
Causa raiz: o invariante do front ("um campo só") não existe no banco.
Caminho recomendado: teste de banco (transação revertida) que grava uma cotação com `discount_percent`, dispara o
recálculo e afirma que apenas um dos dois campos ficou diferente de zero. Deve falhar hoje.
Por que este caminho e não o óbvio: o óbvio é remover o alerta do front, que é o sintoma visível. O alerta está
certo; quem viola o invariante é o trigger.
Arquivos e objetos a tocar: novo teste de banco.
Não tocar / armadilhas: não mexa em `useQuoteBuilderState.helpers.ts:541-543`.
Depende de: — · Libera: 109
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste falha, mostrando os dois campos preenchidos. Cole a saída.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 109 — Alinhar `fn_quotes_recalc_subtotal_from_items` ao invariante de um campo de desconto
Onda / Severidade / Camada: 3 / Alta / Banco
Achados resolvidos: ACH-090
Problema hoje: ver 108. Alarme falso em toda cotação com desconto percentual faz o time parar de confiar no alarme.
Causa raiz: o trigger grava o valor absoluto derivado e não limpa o percentual de origem.
Caminho recomendado: migration que faz o trigger respeitar o invariante: ao derivar `discount_amount` a partir de
`discount_percent`, **não** persista os dois — guarde a origem e derive o outro na leitura, ou zere o derivado.
Decida com a regra escrita na etapa 104 e documente no corpo da migration qual campo é a fonte.
Por que este caminho e não o óbvio: o óbvio é fazer o front aceitar os dois campos. Aí o invariante some e ninguém
mais consegue dizer qual desconto vale.
Arquivos e objetos a tocar: nova migration; `fn_quotes_recalc_subtotal_from_items`; rollback.
Não tocar / armadilhas: `fn_quote_items_calc_subtotal` trata `discount_amount` de forma diferente (ACH-093, etapa
111) — leia as duas antes de mudar uma.
Depende de: 104, 108 · Libera: 106, 110, 111
Risco e como reverter: alto (função central de cálculo). Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: o teste da etapa 108 passa; e o total de cotações de exemplo não muda (o valor é o mesmo, o que muda
é qual campo o guarda).
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 110 — Confirmar que o alarme de corrupção parou de disparar em cotação normal
Onda / Severidade / Camada: 3 / Média / Front
Achados resolvidos: ACH-090
Problema hoje: o alerta de `useQuoteBuilderState.helpers.ts:541-543` dispara em toda cotação com desconto percentual.
Causa raiz: idem 108/109.
Caminho recomendado: depois da etapa 109 em produção, verifique no log/telemetria quantas vezes o alerta dispara em
24 h. Se continuar disparando, há um segundo produtor do estado inválido — anote como achado novo e pare. Se zerou,
registre a evidência e **não** mexa no alerta.
Por que este caminho e não o óbvio: o óbvio é remover o alerta por "já ter sido resolvido". Ele é o detector; se
voltar a disparar, você quer saber.
Arquivos e objetos a tocar: nenhum (verificação) + anotação no `05-PROGRESSO.md`.
Não tocar / armadilhas: não remova o alerta.
Depende de: 109 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: contagem de disparos em 24 h antes e depois, colada no progresso.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 111 — Alinhar as duas funções do banco quanto ao desconto por item
Onda / Severidade / Camada: 3 / Média / Banco
Achados resolvidos: ACH-093
Problema hoje: `fn_quote_items_calc_subtotal` subtrai `discount_amount` do item; `fn_quotes_recalc_subtotal_from_items`
ignora. Hoje é latente porque o front grava 0, mas fura por CRM ou SQL.
Causa raiz: duas funções de cálculo escritas em momentos diferentes com entendimentos diferentes.
Caminho recomendado: migration que faz a função agregadora respeitar o desconto por item que a função de item já
aplica. Teste antes com um item de desconto não-zero em transação revertida, para medir a diferença.
Por que este caminho e não o óbvio: o óbvio é proibir desconto por item no banco porque "o front não usa". O CRM
escreve nessas tabelas; proibir quebraria a integração.
Arquivos e objetos a tocar: nova migration; `fn_quotes_recalc_subtotal_from_items`; rollback.
Não tocar / armadilhas: faça depois da etapa 109 — mexer duas vezes na mesma função em sequência é mais seguro que
mexer nas duas coisas de uma vez.
Depende de: 109 · Libera: 112
Risco e como reverter: alto. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: item com `discount_amount` > 0 em transação revertida → o subtotal da cotação reflete o desconto.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 112 — Constraint que impede desconto percentual e absoluto preenchidos juntos
Onda / Severidade / Camada: 3 / Média / Banco
Achados resolvidos: ACH-090, ACH-093
Problema hoje: nada no banco impede os dois campos de desconto não-zero na mesma linha.
Causa raiz: o invariante é de código.
Caminho recomendado: migration com `CHECK` que exige no máximo um dos dois diferente de zero, em `quotes` e em
`quote_items`. **Antes**, rode a consulta que conta quantas linhas hoje violam — se houver violação, a migration
falha; nesse caso, a etapa certa é corrigir o dado primeiro (etapa 120) e só depois acrescentar o CHECK.
Por que este caminho e não o óbvio: o óbvio é só confiar nas etapas 109/111. Elas corrigem o produtor conhecido; o
CHECK fecha para o CRM e para o SQL manual.
Arquivos e objetos a tocar: nova migration; CHECK em `public.quotes` e `public.quote_items`; rollback.
Não tocar / armadilhas: `NOT VALID` + `VALIDATE` depois é o caminho seguro em tabela grande; confira o tamanho antes.
Depende de: 111, 120 · Libera: —
Risco e como reverter: médio-alto (pode bloquear escrita do CRM). Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: tentativa de gravar os dois campos → erro; o fluxo normal de desconto continua.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 113 — Teste do subtotal no caminho kit → cotação
Onda / Severidade / Camada: 3 / Média / Regra de negócio
Achados resolvidos: ACH-092
Problema hoje: `price-calculator.ts:95-96` calcula subtotal **sem** personalização; o trigger do banco regrava
**incluindo** personalização. O valor que o usuário vê ao montar o kit não é o que fica salvo.
Causa raiz: duas definições de subtotal no mesmo fluxo.
Caminho recomendado: teste que monta um kit com personalização, converte em cotação e afirma que o subtotal exibido
pelo kit é igual ao persistido. Deve falhar hoje, com a diferença igual ao custo de personalização.
Por que este caminho e não o óbvio: idem 103 — sem o teste, a correção não tem como ser verificada.
Arquivos e objetos a tocar: novo teste em `src/lib/kit-builder/__tests__/` (ou onde ficam os testes do kit).
Não tocar / armadilhas: há 1.122 testes passando em `src/hooks/quotes src/hooks/kit-builder src/hooks/products`
(medido) — não altere nenhum deles.
Depende de: — · Libera: 114
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste falha com a diferença exata. Cole a saída.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 114 — Alinhar `price-calculator.ts` à definição de subtotal do banco
Onda / Severidade / Camada: 3 / Média / Regra de negócio
Achados resolvidos: ACH-092
Problema hoje: ver 113.
Causa raiz: idem.
Caminho recomendado: inclua a personalização no subtotal do kit, para o número exibido ser o mesmo que o banco
grava. Reuse o módulo único de custo de personalização consolidado na etapa 066 em vez de recalcular.
Por que este caminho e não o óbvio: o óbvio é mudar o trigger para não incluir personalização. O trigger define o
que fica no banco e é usado por todos os caminhos de cotação, não só pelo kit; mudar o trigger por causa do kit
muda o total de todas as cotações.
Arquivos e objetos a tocar: `src/lib/kit-builder/price-calculator.ts`.
Não tocar / armadilhas: não mexa no trigger nesta etapa.
Depende de: 066, 113 · Libera: —
Risco e como reverter: médio (muda valor exibido no kit). Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste da etapa 113 passa; montar um kit e converter mostra o mesmo número antes e depois de salvar.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 115 — Levantar os três tratamentos de `shipping_cost` e escolher um
Onda / Severidade / Camada: 3 / Baixa / Regra de negócio
Achados resolvidos: ACH-094
Problema hoje: `shipping_cost` é persistido mesmo quando não entra no total, e há três tratamentos distintos do
mesmo campo nos caminhos de cálculo.
Causa raiz: frete foi acrescentado ao modelo antes de a regra de como ele compõe o total estar decidida.
Caminho recomendado: liste os três tratamentos (arquivo:linha) em `docs/qa/frete-no-total.md`, descreva o efeito de
cada um num exemplo numérico, e proponha um só, a ser confirmado pelo dono: o usual em brinde promocional é frete
fora do subtotal e somado ao total final, exibido separado na proposta.
Por que este caminho e não o óbvio: o óbvio é escolher no código. Frete entra ou não no desconto, e isso muda o
valor cobrado — é decisão de negócio.
Arquivos e objetos a tocar: cria `docs/qa/frete-no-total.md`.
Não tocar / armadilhas: nenhuma mudança de código nesta etapa.
Depende de: — · Libera: 116
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: sim (decisão de negócio)
Como verificar: o documento tem os três tratamentos com arquivo:linha e um exemplo numérico de cada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 116 — Unificar o tratamento de `shipping_cost` no total
Onda / Severidade / Camada: 3 / Média / Regra de negócio
Achados resolvidos: ACH-094
Problema hoje: ver 115.
Causa raiz: idem.
Caminho recomendado: aplique a decisão da etapa 115 nos três pontos, e registre a regra em
`docs/contexto/regras/manual/regras.md` junto da regra de arredondamento da etapa 104.
Por que este caminho e não o óbvio: o óbvio é corrigir só o ponto que aparece na tela. Os outros dois continuam
alimentando o banco e o PDF.
Arquivos e objetos a tocar: os três arquivos listados na etapa 115; `docs/contexto/regras/manual/regras.md`.
Não tocar / armadilhas: se a decisão mudar o total de cotação existente, **não** recalcule o histórico; isso é a
etapa 120.
Depende de: 115 · Libera: —
Risco e como reverter: médio. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: teste de unidade com frete mostrando o mesmo total nos três caminhos.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 117 — Escrever a fórmula canônica do total da cotação
Onda / Severidade / Camada: 3 / Média / Documentação
Achados resolvidos: ACH-090, ACH-091, ACH-092, ACH-093, ACH-094
Problema hoje: o mesmo total é calculado em pelo menos quatro lugares com definições diferentes, e não existe um
texto que diga qual é a conta.
Causa raiz: a fórmula nunca foi escrita; cada implementação é a fórmula.
Caminho recomendado: em `docs/contexto/regras/manual/regras.md`, escreva a fórmula completa na ordem exata das
operações: preço unitário → desconto (de item e de cotação) → personalização → markup → arredondamento → frete →
total. Use um exemplo numérico de ponta a ponta. Esse texto é a referência das etapas 104–116 e de qualquer mudança
futura.
Por que este caminho e não o óbvio: o óbvio é documentar no código, perto da função. O repo tem quatro funções; o
texto precisa estar acima delas, no arquivo de regras humanas que o `AGENTS.md` dá prioridade máxima.
Arquivos e objetos a tocar: `docs/contexto/regras/manual/regras.md`.
Não tocar / armadilhas: PR docs-only; não misture código.
Depende de: 104, 105, 109, 111, 114, 116 · Libera: 118
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: sim (decisão de negócio)
Como verificar: o exemplo numérico do documento, calculado à mão, bate com o que o sistema produz para a mesma
entrada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 118 — Teste de contrato entre front e banco para o total da cotação
Onda / Severidade / Camada: 3 / Média / Testes
Achados resolvidos: ACH-090, ACH-091, ACH-092
Problema hoje: nada impede uma quinta definição de total aparecer.
Causa raiz: sem teste que atravesse front e banco.
Caminho recomendado: teste que, para um conjunto de casos de borda (incluindo o 1,01 × 7 com 13% e um caso com
personalização e frete), compara o total calculado pelo front com o total que o banco grava. O repo já tem a ideia
de teste de contrato (`src/App.router-contract.test.tsx`, `npm run check:contract-coverage`) — siga essa linha.
Por que este caminho e não o óbvio: o óbvio é testar cada função isolada. Foi isso que deixou o ACH-084 passar com
27 testes verdes.
Arquivos e objetos a tocar: novo teste de contrato.
Não tocar / armadilhas: o teste precisa de banco; se o ambiente de teste não tiver, deixe-o marcado para rodar só
no CI que tem, e **diga isso** no progresso — não o faça passar com mock do banco, que é o oposto do objetivo.
Depende de: 117 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste passa; mudando qualquer uma das quatro fórmulas localmente, ele falha.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 119 — Ler e registrar a fórmula usada pelas RPCs transacionais de cotação
Onda / Severidade / Camada: 3 / Alta / Banco
Achados resolvidos: ACH-090, ACH-091 (lacuna da auditoria)
Problema hoje: a auditoria **não leu** o corpo de `create_quote_transactional`, `update_quote_transactional` e
`create_kit_quote_transactional`. São elas que gravam cotação no caminho normal — podem conter uma quinta fórmula,
ou podem invalidar parte do que as etapas 103–118 concluíram.
Causa raiz: lacuna declarada da auditoria.
Caminho recomendado: leia o corpo das três funções no banco (`pg_get_functiondef`) e registre em
`docs/qa/frete-no-total.md` (ou num arquivo próprio) qual fórmula cada uma usa, com atenção a: ordem do desconto,
inclusão de personalização, inclusão de frete e momento do arredondamento. **Se divergirem** da decisão da etapa
117, pare e anote: as etapas 105/109/111 precisam ser revistas antes de seguir.
Por que este caminho e não o óbvio: o óbvio é confiar nos triggers. As RPCs são o caminho de escrita principal;
corrigir trigger sem ler as RPCs pode corrigir o lugar errado.
Arquivos e objetos a tocar: documento de registro.
Não tocar / armadilhas: faça esta etapa **antes** de mergear 105, 109 e 111 se puder; se já estiverem mergeadas,
rode igual e trate divergência como achado novo.
Depende de: — · Libera: 105, 109, 111, 117
Risco e como reverter: zero (leitura).
Precisa de aprovação humana antes do merge: não
Como verificar: o documento traz o corpo relevante das três funções e a comparação com a fórmula canônica.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 120 — Relatório de cotações com total divergente, sem corrigir
Onda / Severidade / Camada: 3 / Alta / Banco
Achados resolvidos: ACH-090, ACH-091, ACH-092, ACH-093
Problema hoje: as cotações gravadas antes das correções podem ter total divergente do que a fórmula canônica produz.
Causa raiz: o defeito gravou dado.
Caminho recomendado: consulta de leitura que recalcule o total pela fórmula canônica e liste as cotações em que o
valor gravado difere, com a diferença em reais, o status e a data. Entregue em
`docs/qa/cotacoes-total-divergente.md`. **Nenhum UPDATE.** Cotação já enviada ao cliente não se recalcula sem
decisão do dono.
Por que este caminho e não o óbvio: o óbvio é rodar um UPDATE de reconciliação. Altera valor de proposta
combinada com cliente.
Arquivos e objetos a tocar: cria `docs/qa/cotacoes-total-divergente.md`.
Não tocar / armadilhas: nenhum UPDATE, nem "só nas de rascunho".
Depende de: 117 · Libera: 112
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: sim (decisão sobre valor já enviado)
Como verificar: o documento traz a consulta, a contagem por status e a soma das diferenças.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 3.C — Regras documentadas sem implementação (ACH-095, ACH-096)

<modelo_etapa>
Etapa 121 — Teste que prova a ausência de validação de MOQ no orçamento
Onda / Severidade / Camada: 3 / Alta / Regra de negócio
Achados resolvidos: ACH-095
Problema hoje: a validação de quantidade mínima existe no kit (`useKitMinQuantityValidation.ts:19-57`, via
`vw_products_min_quantity`) e **não existe** em `src/hooks/quotes`, `src/components/quotes` nem `src/pages/quotes`.
No banco só há `CHECK (quantity > 0)`. O documento manual de regras (§5) manda exibir erro antes do envio.
Causa raiz: a regra foi implementada em um fluxo e não no outro.
Caminho recomendado: teste que adiciona ao orçamento um item com quantidade abaixo do `min_quantity` do produto e
afirma que o envio é recusado. Deve falhar hoje.
Por que este caminho e não o óbvio: idem 103.
Arquivos e objetos a tocar: novo teste em `src/hooks/quotes/__tests__/`.
Não tocar / armadilhas: use um produto de teste com `min_quantity` conhecido; não dependa de dado de produção.
Depende de: — · Libera: 122, 123, 124
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste falha. Cole a saída.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 122 — Validar MOQ no builder de orçamento, reusando a validação do kit
Onda / Severidade / Camada: 3 / Alta / Regra de negócio
Achados resolvidos: ACH-095
Problema hoje: ver 121. O orçamento sai com quantidade que o fornecedor não aceita, e a quebra aparece na produção
com o cliente já comprometido.
Causa raiz: idem.
Caminho recomendado: reuse `useKitMinQuantityValidation` (ou extraia dele a função de comparação) no builder de
orçamento, lendo o mínimo da mesma fonte: a view `vw_products_min_quantity`. Não consulte `products.min_quantity`
direto — a view é a fonte que o kit já usa e ela resolve variante.
Por que este caminho e não o óbvio: o óbvio é ler `min_quantity` do produto na tela. O mínimo pode vir da variante
ou do fornecedor; a view já trata isso e o kit já confia nela.
Arquivos e objetos a tocar: `src/hooks/quotes/` (o hook do builder) e o componente que mostra o erro.
Não tocar / armadilhas: não altere `useKitMinQuantityValidation` de forma que mude o comportamento do kit.
Depende de: 121 · Libera: 123, 124
Risco e como reverter: médio (passa a recusar orçamento que antes passava — é o objetivo). Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste da etapa 121 passa; e um orçamento com quantidade válida continua sendo enviado.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 123 — Reforçar o MOQ no banco
Onda / Severidade / Camada: 3 / Alta / Banco
Achados resolvidos: ACH-095
Problema hoje: só `CHECK (quantity > 0)`; o mínimo real do produto não é verificado em nenhuma camada do banco.
Causa raiz: a regra é de interface.
Caminho recomendado: migration com trigger em `quote_items` que compare a quantidade com o mínimo da view
`vw_products_min_quantity` e recuse abaixo dele. **Antes**, conte quantas linhas existentes violariam — se houver
muitas, o trigger só pode valer para inserção nova; registre essa escolha no corpo da migration.
Por que este caminho e não o óbvio: o óbvio é um `CHECK` com valor fixo. O mínimo varia por produto e por variante;
`CHECK` não consulta outra tabela.
Arquivos e objetos a tocar: nova migration; trigger em `public.quote_items`; rollback.
Não tocar / armadilhas: o CRM escreve em `quote_items` — um trigger rígido pode quebrar a integração. Verifique o
que o CRM grava antes.
Depende de: 122 · Libera: —
Risco e como reverter: alto. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: inserção abaixo do mínimo em transação revertida → erro; acima → sucesso; e nenhuma falha nova nas
edges de CRM nas 2 horas seguintes.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 124 — Mensagem de MOQ que diz o número e o que fazer
Onda / Severidade / Camada: 3 / Média / Interface
Achados resolvidos: ACH-095
Problema hoje: com 122 e 123, o usuário passa a receber recusa; sem mensagem boa, ele não sabe o que corrigir.
Causa raiz: validação nova sem retorno visual específico.
Caminho recomendado: mostre, no item, "mínimo do fornecedor: N unidades" e um atalho para ajustar a quantidade para
o mínimo. Use o padrão de erro de campo que o repo já tem (`docs/FORM_VALIDATION.md` indica a convenção).
Por que este caminho e não o óbvio: o óbvio é um toast genérico "quantidade inválida". O usuário não descobre qual
item nem qual é o mínimo.
Arquivos e objetos a tocar: o componente de item do builder de orçamento.
Não tocar / armadilhas: não bloqueie a digitação; valide no envio, para o usuário poder digitar e corrigir.
Depende de: 122 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: item abaixo do mínimo mostra o número do mínimo e o atalho funciona.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 125 — Teste que prova a alçada intermediária de desconto não existir
Onda / Severidade / Camada: 3 / Alta / Regra de negócio
Achados resolvidos: ACH-096
Problema hoje: `approval_required_above` (default 10%, documentado no `COMMENT` da própria tabela) **não é lido**
por front, edge nem SQL. Os degraus de 15% e 30% do documento manual também não existem em nenhuma camada.
Causa raiz: a coluna foi criada e nunca ligada.
Caminho recomendado: teste que aplica um desconto acima de `approval_required_above` e afirma que a cotação entra em
estado de aprovação pendente. Deve falhar hoje.
Por que este caminho e não o óbvio: idem 103.
Arquivos e objetos a tocar: novo teste em `src/hooks/quotes/__tests__/`.
Não tocar / armadilhas: já existe `useQuoteBuilderState.discountLimit.test.tsx` cobrindo o teto do vendedor — a
alçada é outra coisa (quem aprova acima do teto). Não duplique.
Depende de: — · Libera: 126, 127, 128
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste falha. Cole a saída.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 126 — Ler `approval_required_above` no builder de orçamento
Onda / Severidade / Camada: 3 / Alta / Regra de negócio
Achados resolvidos: ACH-096
Problema hoje: ver 125. Desconto que deveria subir para o gerente de vendas não sobe.
Causa raiz: idem.
Caminho recomendado: faça o builder ler a coluna junto do limite do vendedor (a query já existe — etapa 081) e, ao
passar do valor, marcar a cotação para aprovação em vez de aplicar direto. Reuse o fluxo de aprovação que já existe
(`discount_approval_requests`), não crie outro.
Por que este caminho e não o óbvio: o óbvio é hardcodar 10%, 15% e 30% no front. Os números são configuráveis por
desenho (a coluna existe) e o dono muda política comercial sem deploy.
Arquivos e objetos a tocar: `src/hooks/.../useQuoteBuilderState.ts` e a query de limites.
Não tocar / armadilhas: não confunda `approval_required_above` (a partir de quanto precisa de aprovação) com o teto
do vendedor (acima do qual ele não pode nem pedir).
Depende de: 081, 125 · Libera: 127, 128
Risco e como reverter: médio. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste da etapa 125 passa; desconto abaixo do valor continua aplicando direto.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 127 — Reforçar a alçada no banco
Onda / Severidade / Camada: 3 / Alta / Banco
Achados resolvidos: ACH-096
Problema hoje: com 126, a alçada passa a existir no front. Qualquer escrita por CRM ou SQL contorna.
Causa raiz: regra de alçada sem reforço no banco.
Caminho recomendado: estenda o trigger da etapa 083 (que já trata o teto) para também exigir aprovação registrada
acima de `approval_required_above`. Uma função, duas condições — não crie um segundo trigger.
Por que este caminho e não o óbvio: o óbvio é um trigger novo. Dois triggers na mesma tabela com regras de desconto
é o caminho para o conflito que o grupo 27 mostra.
Arquivos e objetos a tocar: nova migration; o trigger da etapa 083; rollback.
Não tocar / armadilhas: a ordem de execução de triggers em Postgres é alfabética pelo nome — se criar nome novo,
confira que não roda antes do recálculo de subtotal.
Depende de: 083, 126 · Libera: —
Risco e como reverter: alto. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: em transação revertida, desconto acima da alçada sem aprovação → erro; com aprovação → sucesso.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 128 — Tela para o dono configurar a alçada de desconto
Onda / Severidade / Camada: 3 / Média / Interface
Achados resolvidos: ACH-096
Problema hoje: `approval_required_above` só é editável por SQL.
Causa raiz: a coluna existe sem interface.
Caminho recomendado: acrescente o campo à tela que já existe para limites de desconto
(`SellerDiscountLimitsPanel`, `/admin/limites-desconto`), em vez de criar tela nova. Invalide a mesma chave de
query da etapa 082 ao salvar.
Por que este caminho e não o óbvio: o óbvio é uma tela nova de "política comercial". Mais uma tela para manter, e o
dono já tem onde mexer em desconto.
Arquivos e objetos a tocar: `src/components/admin/SellerDiscountLimitsPanel.tsx` (ou a tela de `/admin/limites-desconto`).
Não tocar / armadilhas: respeite a invalidação da etapa 082; sem ela, o builder segue com o valor antigo (ACH-033).
Depende de: 082, 126 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: alterar a alçada na tela muda o comportamento do builder sem recarregar.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 129 — Reconciliar os degraus de desconto do documento manual com o implementado
Onda / Severidade / Camada: 3 / Média / Documentação
Achados resolvidos: ACH-096
Problema hoje: o documento manual de regras (§5) fixa 15% (sem aprovação), 15–30% (gerente) e acima de 30% (PO), e
o sistema implementa um teto por vendedor mais uma alçada configurável. São dois modelos diferentes.
Causa raiz: a regra escrita e a regra construída divergiram.
Caminho recomendado: atualize `docs/contexto/regras/manual/regras.md` para descrever o modelo que o sistema passa a
ter depois das etapas 126–128 (teto por vendedor + alçada configurável), e registre os valores padrão que o dono
quer nessas duas configurações. Se o dono preferir os três degraus fixos, isso é mudança de escopo — anote e pare.
Por que este caminho e não o óbvio: o óbvio é implementar os três degraus para "cumprir a regra". O sistema já tem
um modelo mais flexível meio construído; jogar fora é retrabalho.
Arquivos e objetos a tocar: `docs/contexto/regras/manual/regras.md`.
Não tocar / armadilhas: docs-only; não misture código.
Depende de: 126, 128 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: sim (decisão de negócio)
Como verificar: a regra escrita descreve o que o código faz, com os valores padrão.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 130 — Responder, no documento de regras, as dúvidas em aberto que esta auditoria fechou
Onda / Severidade / Camada: 3 / Baixa / Documentação
Achados resolvidos: ACH-083, ACH-100
Problema hoje: a seção §9 do documento de regras lista dúvidas em aberto, e algumas já têm resposta medida: as
partições de `supplier_products_raw_history` para 2027 **existem** (`p2027_01` a `p2027_12`, medido), e o risco de
número de cotação duplicado já está resolvido em produção (advisory lock + `quotes_quote_number_key UNIQUE`).
Causa raiz: o documento acumula dúvidas e ninguém as fecha quando a resposta aparece.
Caminho recomendado: para cada dúvida de §9, escreva a resposta com a evidência (consulta usada) ou mantenha como
aberta dizendo o que falta. Marque as duas acima como fechadas. Corrija também `docs/QUOTE_NUMBERING.md`, que afirma
risco de duplicidade já resolvido.
Por que este caminho e não o óbvio: o óbvio é deixar a lista crescer. Risco falso na lista do dono rouba atenção do
risco real — e esta auditoria encontrou dois.
Arquivos e objetos a tocar: `docs/contexto/regras/manual/regras.md`, `docs/QUOTE_NUMBERING.md`.
Não tocar / armadilhas: não feche dúvida sem a consulta que a responde colada.
Depende de: — · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: cada item de §9 tem "respondida (evidência: …)" ou "aberta (falta: …)".
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 3.D — A rede de teste que não está funcionando (ACH-101, ACH-102)

<modelo_etapa>
Etapa 131 — Registrar a linha de base da suíte completa de testes
Onda / Severidade / Camada: 3 / Alta / Testes
Achados resolvidos: ACH-101
Problema hoje: `npm test` no commit `ded84e9` termina com `EXIT=1`:
`Test Files 7 failed | 1731 passed | 131 skipped (1869)` e `Tests 26 failed | 32841 passed (34035)`.
Ninguém no repo sabe disso, porque o gate que bloqueia merge roda outra coisa (ACH-102).
Causa raiz: suíte sem dono.
Caminho recomendado: rode `npm test` e grave a saída em `docs/qa/suite-baseline.md`, listando os 7 arquivos, os 26
casos e a mensagem de erro de cada um. Esse arquivo é o que diz, nas etapas 132–136, o que já era quebrado antes de
você e o que você quebrou.
Por que este caminho e não o óbvio: o óbvio é corrigir o primeiro teste que aparece. Sem a linha de base, qualquer
falha depois vira discussão sobre quem quebrou.
Arquivos e objetos a tocar: cria `docs/qa/suite-baseline.md`.
Não tocar / armadilhas: não conserte nada nesta etapa; não marque teste como `skip`.
Depende de: — · Libera: 132, 133, 134, 135, 136, 137
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o arquivo tem os 7 nomes de arquivo, a contagem de 26 e a mensagem de erro de cada grupo.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 132 — Resolver os testes de kit-builder que importam um componente que não existe
Onda / Severidade / Camada: 3 / Alta / Testes
Achados resolvidos: ACH-101
Problema hoje: `tests/components/kit-builder/FreightEstimator.test.tsx:10` importa
`@/components/kit-builder/FreightEstimator` e o vitest falha com `Failed to resolve import`. Confirmado em disco:
`src/components/kit-builder/FreightEstimator.tsx` **não existe** (`KitSummary.tsx`, do mesmo diretório, existe).
Causa raiz: o componente foi removido ou renomeado e o teste ficou apontando para o caminho antigo.
Caminho recomendado: descubra, pelo histórico (`git log --diff-filter=D -- 'src/components/kit-builder/FreightEstimator*'`),
se o componente foi **removido** ou **renomeado**. Se renomeado, aponte o teste para o novo caminho e confira se as
asserções ainda fazem sentido. Se removido de propósito, **apague o arquivo de teste** — teste de componente que não
existe mais não é cobertura, é ruído que trava a suíte.
Por que este caminho e não o óbvio: o óbvio é criar um `FreightEstimator` vazio para o import resolver. Isso traz de
volta um componente que o repo decidiu remover e deixa o teste verde sem testar nada.
Arquivos e objetos a tocar: `tests/components/kit-builder/FreightEstimator.test.tsx` (reaponta ou remove) e,
pela mesma causa, `tests/components/kit-builder/KitBuilderComponents.test.tsx` se ela importar o mesmo módulo.
Não tocar / armadilhas: não apague teste de componente que **existe**; verifique arquivo por arquivo qual import
falha, com `npx vitest run tests/components/kit-builder/`.
Depende de: 131 · Libera: 137
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: `npx vitest run tests/components/kit-builder/` → exit 0; e a decisão (reaponta/remove) está
registrada no corpo da PR com a saída do `git log`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 133 — Corrigir os 14 casos de `KitBuilderPage.test.tsx`
Onda / Severidade / Camada: 3 / Alta / Testes
Achados resolvidos: ACH-101
Problema hoje: 14 dos 26 casos que falham estão neste arquivo, cobrindo os passos do wizard (box, items,
personalization, summary), os estados de carregando, o kit salvo e as callbacks entre passos.
Causa raiz: a investigar — pode ser o mesmo import quebrado da etapa 132 (o arquivo monta a página inteira) ou
mudança na interface dos passos.
Caminho recomendado: rode `npx vitest run tests/components/pages/KitBuilderPage.test.tsx` e leia a primeira falha
antes de tocar em qualquer coisa. Se a causa for o import da etapa 132, esta etapa pode já estar resolvida — confira
e registre. Se for mudança de interface, decida caso a caso: teste desatualizado se ajusta; comportamento perdido
vira achado novo no progresso (pode ser bug real do kit-builder que ninguém vê porque o teste está vermelho).
Por que este caminho e não o óbvio: o óbvio é ajustar as asserções até ficar verde. Em 14 casos de wizard, isso
pode estar escondendo uma funcionalidade que deixou de funcionar — o ACH-101 diz que o kit-builder está sem rede.
Arquivos e objetos a tocar: `tests/components/pages/KitBuilderPage.test.tsx` e, se houver bug real, só a anotação
no progresso (não corrija o componente nesta etapa).
Não tocar / armadilhas: não use `it.skip` em nenhum caso. Se não conseguir resolver um, deixe-o falhando e registre
— falha visível é melhor que teste desligado.
Depende de: 132 · Libera: 137
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: `npx vitest run tests/components/pages/KitBuilderPage.test.tsx` → exit 0, ou o progresso registra
quais casos sobraram e por quê.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 134 — Corrigir `KitSummary.weight.test.tsx`
Onda / Severidade / Camada: 3 / Alta / Testes
Achados resolvidos: ACH-101
Problema hoje: o caso "conta zero, ausente e caixa sem peso, sem tratar zero como medição" falha. O nome do teste
descreve uma regra de negócio: peso zero **não** é medição válida para estimar frete.
Causa raiz: a investigar — pode ser o componente tratando zero como peso medido, o que seria bug real de frete.
Caminho recomendado: rode o teste e leia o diff da asserção. **Se o componente estiver tratando zero como medição**,
isto não é teste desatualizado: é bug de cálculo de frete que o teste pegou e ninguém viu. Nesse caso, corrija o
componente (`src/components/kit-builder/KitSummary.tsx`) e deixe o teste como está.
Por que este caminho e não o óbvio: o óbvio é ajustar o teste ao comportamento atual. Aqui o teste provavelmente
está certo — peso zero virando medição subestima o frete e o custo cai sobre a empresa.
Arquivos e objetos a tocar: `tests/components/kit-builder/KitSummary.weight.test.tsx` **ou**
`src/components/kit-builder/KitSummary.tsx`, conforme o diagnóstico; registre qual dos dois e por quê.
Não tocar / armadilhas: não mexa no estimador de frete além do tratamento de peso ausente/zero.
Depende de: 131 · Libera: 137
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste passa e o diagnóstico está no corpo da PR, dizendo se era o teste ou o código.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 135 — Corrigir `QuoteCommentsSection.test.tsx`
Onda / Severidade / Camada: 3 / Alta / Testes
Achados resolvidos: ACH-101
Problema hoje: o caso "disables deleting a root with replies while keeping the thread visible" falha. O nome
descreve uma regra: comentário raiz com respostas não pode ser apagado, e a linha do tempo continua visível.
Causa raiz: a investigar — se o componente permite apagar a raiz, há perda de histórico de negociação.
Caminho recomendado: mesma abordagem da etapa 134 — rode, leia, e decida se o teste está velho ou se o
comportamento se perdeu. Se o componente passou a permitir a exclusão, corrija o componente.
Por que este caminho e não o óbvio: o óbvio é ajustar a asserção. Apagar comentário raiz leva as respostas com ele
e isso é histórico de negociação com o cliente.
Arquivos e objetos a tocar: `tests/components/QuoteCommentsSection.test.tsx` **ou** o componente de comentários de
cotação, conforme o diagnóstico.
Não tocar / armadilhas: não mexa no fluxo de criação de comentário.
Depende de: 131 · Libera: 137
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste passa e o diagnóstico está registrado.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 136 — Coordenar `drift-baseline.test.mjs` com a PR aberta do gate E40
Onda / Severidade / Camada: 3 / Média / Testes
Achados resolvidos: ACH-101, ACH-068
Problema hoje: `tests/scripts/drift-baseline.test.mjs` falha com
`expected [] to deeply equal [ "20261114014500_p09_reconcile_ledger_schema_migrations.sql" ]`. Esse é exatamente o
assunto da PR aberta `#3993` (`chore: generalizar normalizacao do Gate E40 para views/matviews/policies`, arquivo
`scripts/drift-baseline.mjs`), e o Gate E40 foi a causa das 6 corridas vermelhas de `main` em 2026-11-22 (ACH-068).
Causa raiz: correção em andamento por outro agente.
Caminho recomendado: **não trabalhe neste arquivo.** Regra 3 das instruções: PR aberta tocando os mesmos arquivos →
pare e avise o dono. Registre no progresso que este dos 7 arquivos está sob a PR `#3993` e siga. Depois que a PR
mergear, rode o teste de novo e feche a etapa.
Por que este caminho e não o óbvio: o óbvio é corrigir o teste, porque parece simples. Duas correções simultâneas no
mesmo gate de drift é como nasce o conflito entre agentes que o `AGENTS.md` (Git 7) manda evitar.
Arquivos e objetos a tocar: nenhum + anotação no `05-PROGRESSO.md`.
Não tocar / armadilhas: não toque em `scripts/drift-baseline.mjs` nem em `tests/scripts/drift-baseline.test.mjs`.
Depende de: 131 · Libera: 137
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o progresso registra o estado da PR `#3993` e, após o merge dela, a saída de
`npx vitest run tests/scripts/drift-baseline.test.mjs`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 137 — Fazer a suíte inteira bloquear merge
Onda / Severidade / Camada: 3 / Alta / CI
Achados resolvidos: ACH-102
Problema hoje: o job `Gate 2 - Unit Tests` de `deploy-gates.yml` roda `npm run test:ci-core`, uma **lista fixa de
~70 arquivos**, e é o único gate de teste no `needs:` do único check obrigatório. `ci.yml:198,250` rodam a suíte
inteira, mas `ci.yml` não entra nesse `needs:` nem no ruleset — logo não bloqueia (mesma causa do ACH-007).
Resultado medido: 26 testes vermelhos em `main` com CI verde.
Causa raiz: a lista fixa foi criada por desempenho e virou o contrato de qualidade.
Caminho recomendado: faça o job `Gate 2 - Unit Tests` rodar a suíte (`npm test`) **depois** que as etapas 132–136
tiverem zerado as falhas. Se o tempo de execução for o problema, use o paralelismo do vitest (`--shard`) em vez de
reduzir o escopo — shard mantém a cobertura e divide o tempo. Mantenha o bypass de PR docs-only (E14), que já existe
no job e está correto.
Por que este caminho e não o óbvio: o óbvio é acrescentar os 7 arquivos corrigidos à lista de `test:ci-core`. Isso
protege os 7 de hoje e deixa 1.792 desprotegidos — é a mesma armadilha da lista fixa das etapas 005 e 014.
Arquivos e objetos a tocar: `.github/workflows/deploy-gates.yml` (job `unit-tests`); eventualmente `package.json`
para um script de shard.
Não tocar / armadilhas: **não mergeie esta etapa com a suíte vermelha** — trava todo o repositório. Confirme
`npm test` → exit 0 antes.
Depende de: 132, 133, 134, 135, 136 · Libera: —
Risco e como reverter: alto (pode travar todas as PRs). Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (workflow)
Como verificar: `npm test` local → exit 0; e uma PR de teste com um teste quebrado de propósito fica bloqueada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 138 — Gate que impede teste apontando para módulo que não existe
Onda / Severidade / Camada: 3 / Média / CI
Achados resolvidos: ACH-101
Problema hoje: o modo como o ACH-101 nasceu — componente removido, teste deixado para trás — não é detectado por
nada até alguém rodar a suíte inteira.
Causa raiz: nenhum gate confere que os imports dos testes resolvem.
Caminho recomendado: o `qa:typecheck` roda sobre `tsconfig.app.json`, que pode não incluir `tests/`. Confira: se os
testes estão fora do typecheck, a correção mais barata é acrescentar um `tsconfig` de teste ao gate de typecheck —
o compilador já acusa import que não resolve, sem script novo. Só escreva um script se o typecheck não cobrir.
Por que este caminho e não o óbvio: o óbvio é escrever um script que varre imports. O TypeScript já faz isso; o que
falta é ele olhar para `tests/`.
Arquivos e objetos a tocar: `tsconfig.*.json` e/ou o script `qa:typecheck` no `package.json`.
Não tocar / armadilhas: incluir `tests/` no typecheck pode acusar erros de tipo herdados nos testes — se acusar
muitos, não force; registre a contagem no progresso e proponha ao dono um baseline, como o repo já faz com o lint.
Depende de: 132 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: criando um teste com import inexistente, o gate falha; `npm run qa:typecheck` → exit 0 no repo limpo.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 3.E — Integridade referencial e concorrência de escrita (ACH-076, ACH-039)

<modelo_etapa>
Etapa 139 — Criar a FK de `art_file_attachments.user_id`
Onda / Severidade / Camada: 3 / Baixa / Banco
Achados resolvidos: ACH-076
Problema hoje: `art_file_attachments.user_id` não tem FK, embora as 4 policies da tabela dependam dessa coluna.
Verificado: 0 órfãos hoje.
Causa raiz: coluna criada sem a restrição.
Caminho recomendado: migration com `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY (user_id) REFERENCES auth.users(id)`
usando `NOT VALID` + `VALIDATE CONSTRAINT` em seguida (a tabela já está consistente, então valida direto). Defina o
`ON DELETE` pensando no que deve acontecer quando o usuário é removido — anexo de arte provavelmente não deve
sumir; `ON DELETE SET NULL` com a policy ajustada, ou `RESTRICT`.
Por que este caminho e não o óbvio: o óbvio é `ON DELETE CASCADE`. Apagar um usuário levaria junto os anexos de arte
das cotações dele — perda de dado de cliente.
Arquivos e objetos a tocar: nova migration; `public.art_file_attachments`; rollback.
Não tocar / armadilhas: FK para `auth.users` exige atenção ao fluxo de anonimização (`anonymize-user`) — confira o
que essa edge faz antes de escolher o `ON DELETE`.
Depende de: — · Libera: 140
Risco e como reverter: baixo (0 órfãos). Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: a constraint aparece em `pg_constraint`; inserir `user_id` inexistente → erro.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 140 — Varredura de coluna usada em policy sem FK
Onda / Severidade / Camada: 3 / Média / Banco
Achados resolvidos: ACH-076
Problema hoje: o ACH-076 foi encontrado numa tabela; o padrão (policy depende de coluna que não tem integridade
garantida) pode existir em outras das 417 tabelas.
Causa raiz: o padrão é invisível sem consulta cruzada.
Caminho recomendado: consulta que cruze `pg_policies` (colunas citadas no `qual`/`with_check`) com `pg_constraint`
(FKs existentes) e liste as colunas de referência sem FK. Entregue em `docs/qa/policies-sem-fk.md` com a contagem de
órfãos atual de cada uma. **Não corrija** — cada caso vira etapa no progresso.
Por que este caminho e não o óbvio: o óbvio é criar FK em tudo. FK errada em tabela grande trava escrita e algumas
colunas apontam para dado externo de propósito.
Arquivos e objetos a tocar: cria `docs/qa/policies-sem-fk.md`.
Não tocar / armadilhas: nenhuma DDL nesta etapa.
Depende de: 139 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o documento traz a consulta e a lista, com contagem de órfãos por coluna.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 141 — Helper único para atualizar `profiles.preferences` sem perder escrita
Onda / Severidade / Camada: 3 / Média / Hooks
Achados resolvidos: ACH-039
Problema hoje: cinco lugares fazem ler-modificar-gravar em `profiles.preferences` sem controle de concorrência:
`useCatalogPreferences.ts:82-98`, `useSimulatorPreferences.ts:75-92`, `useBadgeVisibilityStore.ts:55-70` e `:97-112`,
`useExpertChat.ts:671-685`. Duas abas salvando preferências diferentes — uma sobrescreve a outra.
Causa raiz: `preferences` é um JSON único e cada hook grava o objeto inteiro.
Caminho recomendado: crie um helper que faça atualização **parcial** no banco, mesclando só a chave que mudou, em
vez de gravar o objeto inteiro — no Postgres isso é `jsonb_set`/`||` dentro de um `update`, ou uma função SQL de
merge. Se preferir manter no cliente, use leitura-comparação-gravação com condição (`WHERE preferences = <lido>`) e
repita em caso de conflito.
Por que este caminho e não o óbvio: o óbvio é pôr um `setTimeout` de debounce para "não gravarem ao mesmo tempo".
Debounce não resolve duas abas; merge parcial resolve, porque cada hook só toca a sua chave.
Arquivos e objetos a tocar: novo helper em `src/lib/` (ou `src/services/`); se optar por função SQL, nova migration.
Não tocar / armadilhas: não mude o formato de `preferences` — há consumidores que leem chaves específicas.
Depende de: — · Libera: 142, 143, 144, 145, 146
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim, se criar função SQL (DDL em produção)
Como verificar: teste de unidade do helper: duas atualizações de chaves diferentes, aplicadas em sequência,
preservam as duas.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 142 — `useCatalogPreferences` passa a usar o helper
Onda / Severidade / Camada: 3 / Média / Hooks
Achados resolvidos: ACH-039, ACH-038
Problema hoje: `useCatalogPreferences.ts:82-98` grava o objeto inteiro; e `:78-102` + `:104-140` têm mutation sem
invalidate e efeito com dependência `[cloudPreferences]` que sobrescreve estado e `localStorage` no refetch — a
preferência do usuário reverte sozinha.
Causa raiz: dois problemas no mesmo hook: gravação total e efeito que reescreve o estado local.
Caminho recomendado: troque a gravação pelo helper da etapa 141 e, no mesmo PR, acrescente o `invalidateQueries` que
falta. O efeito com dependência `[cloudPreferences]` deve aplicar o valor da nuvem **só na primeira hidratação** —
use um ref de "já hidratei", padrão que o repo usa em `useKitBuilderPageState.ts:218-223` (`hydratedKitIdRef`).
Por que este caminho e não o óbvio: o óbvio é remover o efeito. Sem ele, a preferência salva em outro dispositivo
nunca chega.
Arquivos e objetos a tocar: `src/hooks/.../useCatalogPreferences.ts`.
Não tocar / armadilhas: não mexa no `localStorage` como fallback — ele é o que faz a preferência valer antes do
login carregar.
Depende de: 141 · Libera: 146
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: alterar uma preferência, provocar um refetch e confirmar que ela **não** reverte; teste cobrindo o caso.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 143 — `useSimulatorPreferences` passa a usar o helper e deixa o erro visível
Onda / Severidade / Camada: 3 / Média / Hooks
Achados resolvidos: ACH-039, ACH-038
Problema hoje: `useSimulatorPreferences.ts:75-92` grava o objeto inteiro; `:70-99` + `:102-120` têm o mesmo padrão
de reversão da etapa 142, e aqui o erro de gravação só vai para o log — o usuário acha que salvou.
Causa raiz: idem 142.
Caminho recomendado: igual à etapa 142, mais o retorno do erro para a interface (o usuário precisa saber que a
preferência não foi salva).
Por que este caminho e não o óbvio: idem 142.
Arquivos e objetos a tocar: `src/hooks/.../useSimulatorPreferences.ts` e a tela do simulador que mostra o erro.
Não tocar / armadilhas: não transforme em toast dentro do hook (ver etapa 072).
Depende de: 141 · Libera: 146
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: com a gravação falhando no teste, a interface mostra erro; a preferência não reverte sozinha.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 144 — `useBadgeVisibilityStore` passa a usar o helper nos dois pontos
Onda / Severidade / Camada: 3 / Média / Hooks
Achados resolvidos: ACH-039
Problema hoje: `useBadgeVisibilityStore.ts:55-70` e `:97-112` fazem ler-modificar-gravar do objeto inteiro — dois
pontos no mesmo arquivo, o que dobra a chance de sobrescrita.
Causa raiz: idem 141.
Caminho recomendado: troque os dois pontos pelo helper. Como é um store zustand, confira se o estado local também
precisa ser reconciliado depois da gravação.
Por que este caminho e não o óbvio: trocar só um dos dois pontos deixa o bug vivo pelo outro caminho.
Arquivos e objetos a tocar: `src/stores/.../useBadgeVisibilityStore.ts`.
Não tocar / armadilhas: não mude a forma do store nem a API que os componentes consomem.
Depende de: 141 · Libera: 146
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: alternar visibilidade de dois badges diferentes em sequência preserva as duas escolhas.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 145 — `useExpertChat` passa a usar o helper
Onda / Severidade / Camada: 3 / Baixa / Hooks
Achados resolvidos: ACH-039, ACH-032
Problema hoje: `useExpertChat.ts:671-685` grava o objeto inteiro, e `:689-691` engole o erro.
Causa raiz: idem 141.
Caminho recomendado: igual às anteriores, e faça o `catch` de `:689-691` registrar o erro com contexto em vez de
descartar.
Por que este caminho e não o óbvio: idem 141.
Arquivos e objetos a tocar: `src/hooks/.../useExpertChat.ts`.
Não tocar / armadilhas: preferência de chat não é crítica — não interrompa a conversa do usuário por falha de
gravação de preferência.
Depende de: 141 · Libera: 146
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: falha simulada de gravação aparece no log com contexto; o chat continua funcionando.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 146 — Teste de escrita perdida em `profiles.preferences`
Onda / Severidade / Camada: 3 / Média / Testes
Achados resolvidos: ACH-039
Problema hoje: nada impede o padrão de voltar no sexto hook.
Causa raiz: sem teste de concorrência.
Caminho recomendado: teste que simule duas atualizações concorrentes de chaves diferentes (dois helpers chamados em
paralelo) e afirme que as duas sobrevivem. Se o helper for SQL, o teste é de banco, em transação revertida.
Por que este caminho e não o óbvio: o óbvio é testar cada hook. O que precisa de garantia é o helper; testado ele,
todos os consumidores herdam.
Arquivos e objetos a tocar: novo teste do helper.
Não tocar / armadilhas: teste de concorrência com `Promise.all` em jsdom não é concorrência real — se o helper for
SQL, teste no banco.
Depende de: 142, 143, 144, 145 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste passa; revertendo o helper para gravação total, ele falha.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 147 — Verificação recorrente de registro órfão nas relações críticas
Onda / Severidade / Camada: 3 / Média / Banco
Achados resolvidos: ACH-076
Problema hoje: a auditoria mediu 0 órfãos em 6 relações (`quote_items`→`quotes`, `order_items`→`orders`,
`product_variants`/`product_images`→`products`, `profiles`→`auth.users`, `art_file_attachments`→`auth.users`), mas
nada verifica isso de novo depois.
Causa raiz: integridade verificada uma vez, não continuamente.
Caminho recomendado: use o gate de integridade de banco que já existe no CI (`database-integrity` está no `needs:`
do `deploy-ready`) — leia o que ele faz hoje e acrescente as contagens de órfão dessas 6 relações, em vez de criar
um cron novo. Gate que já bloqueia é mais barato que infraestrutura nova.
Por que este caminho e não o óbvio: o óbvio é um cron job que manda alerta. Mais um cron (são 136 ativos) e mais um
canal de alerta para ninguém ler; o gate falha na hora em que alguém introduz o problema.
Arquivos e objetos a tocar: o script do gate `database-integrity` (procure em `scripts/`).
Não tocar / armadilhas: a consulta precisa ser barata; `quote_items` e `product_images` são grandes — use `EXISTS`
com `LIMIT 1`, não `COUNT(*)` completo.
Depende de: 139 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (CI)
Como verificar: o gate roda e reporta 0 para as 6 relações; introduzindo um órfão em ambiente de teste, ele falha.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 148 — Reconciliação da Onda 3: conferir que os números de cotação fecham
Onda / Severidade / Camada: 3 / Alta / Banco
Achados resolvidos: ACH-090, ACH-091, ACH-092, ACH-093, ACH-094, ACH-084
Problema hoje: a Onda 3 mexeu em quatro caminhos de cálculo, em dois triggers e em uma fórmula de template. Sem uma
conferência final, não há como afirmar que o total da cotação é único.
Causa raiz: conjunto de correções interdependentes.
Caminho recomendado: para um conjunto de cotações reais (leitura, em ambiente de produção), recalcule pela fórmula
canônica da etapa 117 e compare com o persistido; depois crie **uma** cotação nova em ambiente de teste, com
desconto, personalização, markup e frete, e confira que front, banco e PDF mostram o mesmo número. Registre as duas
evidências em `docs/qa/reconciliacao-onda3.md`.
Por que este caminho e não o óbvio: o óbvio é confiar nos testes das etapas anteriores. Eles cobrem cada peça; esta
etapa é a única que olha o número que o cliente recebe.
Arquivos e objetos a tocar: cria `docs/qa/reconciliacao-onda3.md`.
Não tocar / armadilhas: nenhuma escrita em produção; a cotação de prova é em ambiente de teste.
Depende de: 105, 106, 109, 111, 114, 116, 117, 118, 120, 064 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o documento mostra, para a cotação de prova, os três números iguais ao centavo, e a contagem de
divergências no histórico comparada à da etapa 120.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

---

# ONDA 4 · Funcionalidades incompletas (149–176)

## Bloco 4.A — Cotação automática de frete construída e nunca ligada (ACH-097)

<modelo_etapa>
Etapa 149 — Levantar o que existe do contrato de frete e o que falta para ligá-lo
Onda / Severidade / Camada: 4 / Média / Regra de negócio
Achados resolvidos: ACH-097
Problema hoje: `quoteContract.ts` e `rankQuotes.ts` (frete Loggi) estão exportados e testados, **sem nenhum
consumidor**, e não existe edge function correspondente. O frete é digitado à mão em `QuoteBuilderPage.tsx:655`.
Causa raiz: a automação foi construída pela metade e parada.
Caminho recomendado: produza `docs/qa/frete-automatico-estado.md` respondendo: o que os dois módulos fazem, qual
contrato esperam da transportadora, que credencial seria necessária, e o que falta (edge function? chave de API?
cadastro de origem?). Leia também `src/lib/freight/` inteiro (24 arquivos) e `src/hooks/freight/` (11) para não
concluir que falta algo que já existe.
Por que este caminho e não o óbvio: o óbvio é começar a escrever a edge function. Sem saber o que já existe entre os
35 arquivos de frete, você reimplementa metade.
Arquivos e objetos a tocar: cria `docs/qa/frete-automatico-estado.md`.
Não tocar / armadilhas: nenhum código nesta etapa.
Depende de: — · Libera: 150, 151, 152, 153
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o documento lista arquivo por arquivo o que existe e uma lista numerada do que falta.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 150 — Decidir com o dono se a cotação automática de frete entra agora
Onda / Severidade / Camada: 4 / Média / Negócio
Achados resolvidos: ACH-097
Problema hoje: há código de frete automático sem uso e o vendedor digita o valor à mão. Manter os dois é dívida; o
custo de ligar depende de credencial e de contrato com transportadora.
Causa raiz: decisão de produto pendente.
Caminho recomendado: com o documento da etapa 149, apresente ao dono duas opções: (a) ligar a automação, com o que
falta e o custo; (b) remover os módulos mortos e assumir o frete manual. Registre a decisão no documento. **Não
implemente nenhuma das duas nesta etapa.**
Por que este caminho e não o óbvio: o óbvio é escolher por conta própria. Ligar frete automático envolve contrato e
custo com terceiro, que é exatamente o que as instruções mandam levar ao dono.
Arquivos e objetos a tocar: `docs/qa/frete-automatico-estado.md`.
Não tocar / armadilhas: não apague os módulos antes da decisão.
Depende de: 149 · Libera: 151, 152, 153
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: sim (custo e arquitetura)
Como verificar: a decisão está escrita no documento, com data.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 151 — Caminho (a): edge function de cotação de frete
Onda / Severidade / Camada: 4 / Média / Edge function
Achados resolvidos: ACH-097
Problema hoje: não existe edge function que consuma `quoteContract.ts`/`rankQuotes.ts`.
Causa raiz: idem.
Caminho recomendado: **só execute se a etapa 150 decidir por (a).** Crie a edge function reusando os dois módulos,
com: validação de entrada, `AbortSignal` com timeout (o padrão correto está em `generate-blurhashes:93`), uso do
helper `_shared/error-response.ts`, e a credencial pedida por `supabase secrets set` — nunca em migration nem em
código. Deploy só por `deploy-edge-functions.yml`.
Por que este caminho e não o óbvio: o óbvio é chamar a transportadora direto do front. Isso põe a credencial no
navegador.
Arquivos e objetos a tocar: nova pasta em `supabase/functions/`; segredo via painel/CLI.
Não tocar / armadilhas: não altere `quoteContract.ts` nem `rankQuotes.ts` (estão testados); consuma-os.
Depende de: 150 · Libera: 152, 153
Risco e como reverter: médio. Reverter = `git revert` + remover do deploy.
Precisa de aprovação humana antes do merge: sim (custo com terceiro e segredo novo)
Como verificar: invocar a função com um CEP de teste devolve opções ordenadas por `rankQuotes`; sem credencial,
devolve erro padronizado, não exceção.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 152 — Caminho (a): ligar a cotação de frete no builder de orçamento
Onda / Severidade / Camada: 4 / Média / Interface
Achados resolvidos: ACH-097
Problema hoje: `QuoteBuilderPage.tsx:655` tem o frete como campo digitado.
Causa raiz: idem.
Caminho recomendado: **só se a etapa 150 decidir por (a).** Mantenha o campo manual como alternativa (o vendedor
precisa poder sobrepor), e acrescente o botão de cotar que chama a edge da etapa 151, com estados de carregando e
erro — não repita o padrão do grupo 9.
Por que este caminho e não o óbvio: o óbvio é substituir o campo manual. Transportadora fora do ar deixaria o
vendedor sem como fechar a proposta.
Arquivos e objetos a tocar: `src/pages/quotes/QuoteBuilderPage.tsx` e o hook de frete.
Não tocar / armadilhas: o valor cotado precisa entrar no total pela regra da etapa 116, não por um caminho novo.
Depende de: 116, 151 · Libera: 153
Risco e como reverter: médio. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: cotar frete em ambiente de teste preenche o campo e o total reflete pela regra única.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 153 — Caminho (b): remover os módulos mortos de frete automático
Onda / Severidade / Camada: 4 / Baixa / Código morto
Achados resolvidos: ACH-097
Problema hoje: dois módulos exportados e testados sem consumidor.
Causa raiz: idem.
Caminho recomendado: **só se a etapa 150 decidir por (b).** Remova `quoteContract.ts`, `rankQuotes.ts` e os testes
deles, depois de confirmar por grep que não há consumidor. Registre no commit a decisão da etapa 150, para quem
procurar no histórico entender por que sumiu.
Por que este caminho e não o óbvio: o óbvio é deixar "para quando for usar". Código testado sem consumidor engana:
o próximo agente acha que a funcionalidade existe (foi o que o ACH-097 mostra).
Arquivos e objetos a tocar: remove `src/lib/freight/quoteContract.ts`, `src/lib/freight/rankQuotes.ts` e seus testes.
Não tocar / armadilhas: confirme que nenhum dos 35 arquivos de frete importa os dois.
Depende de: 150 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: `npm run qa:typecheck` e `npm test` verdes depois da remoção.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 4.B — A matriz de acesso exibida não é o acesso real (ACH-049)

<modelo_etapa>
Etapa 154 — Gerar a matriz de rotas a partir das rotas reais
Onda / Severidade / Camada: 4 / Média / Interface
Achados resolvidos: ACH-049
Problema hoje: `route-matrix.ts` tem 5 entradas fantasma (`:58,:66,:74,:82` marcadas `public`, e `:424`) que não
existem em `admin-routes.tsx`, e **omite 25 rotas reais**. A tela `/admin/rbac-rotas` é consultada para decidir
permissão.
Causa raiz: a matriz é mantida à mão, em paralelo às rotas.
Caminho recomendado: faça a matriz ser **derivada** das rotas declaradas, não escrita à mão: um teste (ou script de
build) que leia os arquivos de `src/routes/` e falhe quando houver rota sem entrada na matriz ou entrada sem rota.
Comece pelo teste — é o que impede a divergência de voltar; a correção das 30 entradas vem depois (etapas 155–156).
Por que este caminho e não o óbvio: o óbvio é corrigir as 30 entradas à mão. Em três semanas a matriz diverge de
novo, porque nada liga as duas listas.
Arquivos e objetos a tocar: novo teste em `src/routes/__tests__/` comparando `route-matrix.ts` com as rotas.
Não tocar / armadilhas: a flag `protegida` do `rotas.json` gerado **não** serve como fonte (ACH-079) — leia os
arquivos de rota.
Depende de: — · Libera: 155, 156, 157
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste falha hoje, listando as 5 fantasmas e as 25 ausentes. Cole a saída.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 155 — Remover as 5 entradas fantasma da matriz
Onda / Severidade / Camada: 4 / Média / Interface
Achados resolvidos: ACH-049
Problema hoje: `route-matrix.ts:58,66,74,82,424` descrevem rotas inexistentes, quatro delas como `public` — alguém
lendo a tela acredita que há rota pública que não existe.
Causa raiz: idem 154.
Caminho recomendado: confirme, uma a uma, que a rota não existe (`grep` no `src/routes/`) e remova a entrada.
Por que este caminho e não o óbvio: o óbvio é remover as 5 de uma vez pelo número da linha. Uma delas pode ser rota
que existe com caminho levemente diferente — nesse caso é a entrada que está errada, não a rota.
Arquivos e objetos a tocar: `src/lib/.../route-matrix.ts`.
Não tocar / armadilhas: não mexa nas entradas corretas.
Depende de: 154 · Libera: 157
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste da etapa 154 deixa de acusar entradas fantasma.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 156 — Acrescentar as 25 rotas reais ausentes da matriz
Onda / Severidade / Camada: 4 / Média / Interface
Achados resolvidos: ACH-049
Problema hoje: 25 rotas de `admin-routes.tsx` não constam da matriz; quem consulta a tela não vê que elas existem.
Causa raiz: idem 154.
Caminho recomendado: para cada rota ausente, leia o guard que a envolve no arquivo de rotas (`AdminRoute`,
`DevRoute` ou nenhum) e registre na matriz o papel correspondente — a fonte da verdade é o guard, não a suposição.
Por que este caminho e não o óbvio: o óbvio é marcar todas como `admin`. Algumas estão sob `DevRoute` e a matriz
passaria a mentir no sentido contrário.
Arquivos e objetos a tocar: `src/lib/.../route-matrix.ts`.
Não tocar / armadilhas: não altere nenhum guard para "bater" com a matriz — a matriz é que descreve.
Depende de: 154 · Libera: 157
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste da etapa 154 passa inteiro.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 157 — Avisar na tela quando a matriz estiver desatualizada
Onda / Severidade / Camada: 4 / Baixa / Interface
Achados resolvidos: ACH-049
Problema hoje: nada na tela `/admin/rbac-rotas` indica que o conteúdo pode estar defasado.
Causa raiz: a tela apresenta dado mantido à mão como se fosse apurado.
Caminho recomendado: mostre, no topo da tela, a origem do dado e a data da última verificação — e, se a etapa 154
virar script de build, exiba o resultado da última comparação. Texto curto, sem alarde.
Por que este caminho e não o óbvio: o óbvio é não mexer na tela, confiando no teste. O teste protege o repo; o aviso
protege quem toma decisão olhando a tela.
Arquivos e objetos a tocar: a página de `/admin/rbac-rotas`.
Não tocar / armadilhas: não transforme em alerta vermelho permanente.
Depende de: 155, 156 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: a tela mostra a origem e a data.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 4.C — Dado inventado exibido como recomendação (ACH-050, ACH-051)

<modelo_etapa>
Etapa 158 — Rotular as sugestões simuladas em `ClientHealthHero`
Onda / Severidade / Camada: 4 / Média / Interface
Achados resolvidos: ACH-050
Problema hoje: `ClientHealthHero.tsx:119-127` usa `trends` e `affinity` sem checar `isMock`, enquanto os
componentes irmãos rotulam (`IndustryTrendingProducts.tsx:124`). O fallback simulado está em
`useIndustryTrends.ts:116-121` e `useClientAffinity.ts:177-182`; a tela é montada em
`BusinessIntelligencePage.tsx:271`.
Causa raiz: o rótulo de "dado simulado" foi adotado em alguns componentes e não neste.
Caminho recomendado: aplique o mesmo rótulo de `IndustryTrendingProducts.tsx:124` — copie o padrão, não invente
outro. Leia `isMock` dos dois hooks e mostre a marca quando qualquer um dos dois estiver simulado.
Por que este caminho e não o óbvio: o óbvio é remover o fallback simulado. O fallback existe para a tela não ficar
vazia quando não há histórico do cliente; o problema é não dizer que é simulado.
Arquivos e objetos a tocar: `src/components/bi/ClientHealthHero.tsx`.
Não tocar / armadilhas: não mexa nos hooks; eles já expõem `isMock`.
Depende de: — · Libera: 159, 160
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: com os hooks em modo simulado no teste, o rótulo aparece; com dado real, não aparece.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 159 — Varredura de consumo de `isMock` em todo o BI
Onda / Severidade / Camada: 4 / Média / Interface
Achados resolvidos: ACH-050
Problema hoje: o ACH-050 foi achado num componente; `src/components/bi` tem 22 arquivos e `src/components/intelligence`
tem 27 — pode haver outros consumindo dado simulado sem rótulo.
Causa raiz: o rótulo é opcional por construção.
Caminho recomendado: liste todos os hooks que expõem `isMock` (ou equivalente) e todos os componentes que os
consomem, marcando quem rotula e quem não. Entregue em `docs/qa/bi-dados-simulados.md`; cada caso sem rótulo vira
etapa no progresso, no modelo da 158.
Por que este caminho e não o óbvio: corrigir todos numa PR toca dezenas de componentes e não é revisável.
Arquivos e objetos a tocar: cria `docs/qa/bi-dados-simulados.md`.
Não tocar / armadilhas: não conte como achado o componente que não tem fallback simulado.
Depende de: 158 · Libera: 160
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o documento tem a lista com arquivo:linha e a coluna "rotula? sim/não".
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 160 — Fazer o rótulo de dado simulado ser obrigatório por construção
Onda / Severidade / Camada: 4 / Média / Front
Achados resolvidos: ACH-050
Problema hoje: um componente pode consumir dado simulado e esquecer o rótulo, sem nada reclamar.
Causa raiz: `isMock` é um booleano que o consumidor pode ignorar.
Caminho recomendado: faça os hooks devolverem o dado embrulhado de forma que o rótulo não possa ser esquecido — por
exemplo, um componente de apresentação que recebe o resultado inteiro (dado + `isMock`) e já renderiza a marca. O
TypeScript passa a exigir que o consumidor passe o objeto completo.
Por que este caminho e não o óbvio: o óbvio é uma regra de lint. Regra de lint para esse caso é difícil de escrever
e fácil de silenciar com `eslint-disable` (o repo tem baseline de 7 KB de disables).
Arquivos e objetos a tocar: os hooks de BI que expõem `isMock` e o componente de apresentação compartilhado.
Não tocar / armadilhas: mudança de contrato de hook — faça depois da etapa 159, para saber quantos consumidores
serão afetados.
Depende de: 159 · Libera: —
Risco e como reverter: médio (muda assinatura de hook). Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: typecheck falha se um consumidor tentar renderizar sem passar o `isMock`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 161 — Decidir o destino das 5 rotas sem ponto de entrada
Onda / Severidade / Camada: 4 / Baixa / Rotas
Achados resolvidos: ACH-074, ACH-075
Problema hoje: 5 rotas existem e nenhuma tela leva a elas: `/ferramentas/cobertura` (`tools-routes.tsx:95`, que é
um dashboard de negócio), `/admin/badges-inteligencia`, `/admin/qa/sidebar`, `/admin/storage-test`,
`/external-db-test`. Além disso `/orcamentos/lista` duplica `/orcamentos` (`quote-routes.tsx:22,24`) sem nenhum link.
Causa raiz: rotas criadas para uso pontual e nunca ligadas ao menu nem removidas.
Caminho recomendado: classifique as 6 em `docs/qa/rotas-sem-entrada.md`: `ligar ao menu` (tem valor de negócio —
`/ferramentas/cobertura` parece ser o caso), `manter sem menu` (ferramenta de diagnóstico que o dev acessa por URL,
e aí documente onde) ou `remover`. Decida olhando o que a tela faz, não o nome.
Por que este caminho e não o óbvio: o óbvio é remover todas por serem inalcançáveis. Um dashboard de cobertura de
negócio inalcançável é funcionalidade perdida, não lixo.
Arquivos e objetos a tocar: cria `docs/qa/rotas-sem-entrada.md`.
Não tocar / armadilhas: nenhuma remoção nesta etapa.
Depende de: — · Libera: 162, 163, 164, 165
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: as 6 rotas estão classificadas, com uma frase sobre o que cada tela faz.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 162 — Dar entrada no menu a `/ferramentas/cobertura`
Onda / Severidade / Camada: 4 / Média / Interface
Achados resolvidos: ACH-074
Problema hoje: um dashboard de cobertura de negócio existe e ninguém chega a ele pela interface.
Causa raiz: idem 161.
Caminho recomendado: **se a etapa 161 classificar como "ligar"**, acrescente o item ao menu de ferramentas,
respeitando o papel que a rota exige (leia o guard em `tools-routes.tsx`), e registre na matriz de rotas
(etapa 156) no mesmo PR.
Por que este caminho e não o óbvio: o óbvio é só pôr o link. Sem atualizar a matriz, você reabre o ACH-049.
Arquivos e objetos a tocar: o arquivo de definição do menu, `route-matrix.ts`.
Não tocar / armadilhas: confira o papel; não exponha ferramenta interna a vendedor sem decisão.
Depende de: 156, 161 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: o item aparece no menu para o papel correto e não aparece para os outros.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 163 — Resolver `/admin/badges-inteligencia`
Onda / Severidade / Camada: 4 / Baixa / Rotas
Achados resolvidos: ACH-074
Problema hoje: `src/pages/admin/IntelligenceBadgeSettingsPage.tsx` é uma tela de configuração sem entrada no menu.
Causa raiz: idem 161.
Caminho recomendado: se a configuração de badges é usada, ligue ao menu de administração (como na etapa 162); se os
badges são configurados em outro lugar hoje, remova a rota e a página. Confira antes se algo mais importa a página.
Por que este caminho e não o óbvio: idem 161.
Arquivos e objetos a tocar: o menu e/ou `src/routes/admin-routes.tsx` + a página.
Não tocar / armadilhas: há `useBadgeVisibilityStore` (etapa 144) — confira se a configuração de badge já vive lá.
Depende de: 161 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: a tela está acessível pelo menu, ou não existe mais e o typecheck segue verde.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 164 — Resolver `/admin/qa/sidebar` e `/admin/storage-test`
Onda / Severidade / Camada: 4 / Baixa / Rotas
Achados resolvidos: ACH-074
Problema hoje: duas telas de diagnóstico sem entrada no menu, em `/admin/*`, acessíveis por URL a quem tem papel
gestor.
Causa raiz: idem 161.
Caminho recomendado: se são ferramentas de diagnóstico legítimas, mova-as para trás do `DevRoute` (como as outras
telas de dev em `admin-routes.tsx:118`) e documente em `docs/qa/rotas-sem-entrada.md` que o acesso é por URL. Se
não servem mais, remova.
Por que este caminho e não o óbvio: o óbvio é deixá-las sob `AdminRoute`. Tela de teste de storage na mão de um
gestor comercial não tem razão de existir.
Arquivos e objetos a tocar: `src/routes/admin-routes.tsx` e, se remover, as páginas.
Não tocar / armadilhas: `/admin/qa` (sem `/sidebar`) é outra rota — não mexa nela sem checar.
Depende de: 161 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: com papel gestor sem `dev`, as duas rotas negam acesso; com `dev`, abrem.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 165 — Resolver `/external-db-test` e `/orcamentos/lista`
Onda / Severidade / Camada: 4 / Baixa / Rotas
Achados resolvidos: ACH-074, ACH-075
Problema hoje: `/external-db-test` é tela de teste de conexão com o banco externo, sem entrada; `/orcamentos/lista`
(`quote-routes.tsx:22,24`) duplica `/orcamentos` e não tem link em `src/`.
Causa raiz: idem 161.
Caminho recomendado: `/external-db-test` → mesma decisão da etapa 164 (`DevRoute` ou remover).
`/orcamentos/lista` → troque por um redirect para `/orcamentos` em vez de remover, porque pode haver link antigo
salvo por usuário; o repo já usa `Navigate` para isso (`admin-routes.tsx:67`).
Por que este caminho e não o óbvio: o óbvio é apagar a rota duplicada. Quem tiver o link salvo cai no 404.
Arquivos e objetos a tocar: `src/routes/quote-routes.tsx`, `src/routes/` (external-db-test).
Não tocar / armadilhas: confirme que as duas rotas de orçamento renderizam a mesma coisa antes de redirecionar.
Depende de: 161 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: `/orcamentos/lista` redireciona para `/orcamentos`; `/external-db-test` segue a decisão registrada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 4.D — 50 edge functions marcadas como órfãs e ativas em produção (ACH-072)

<modelo_etapa>
Etapa 166 — Apurar, caso a caso, quais das 50 edges são realmente órfãs
Onda / Severidade / Camada: 4 / Média / Edge function
Achados resolvidos: ACH-072, ACH-080
Problema hoje: o gerador de contexto marca 50 edge functions como órfãs, e o deploy das 50 está confirmado. A flag
é **análise estática** e tem falso positivo comprovado: `quote-sync-promo-champions` consta órfã e é chamada em
`src/pages/quotes/quote-view/QuotePromoChampionsSync.ts:45`.
Causa raiz: o gerador só vê chamada estática pelo nome; chamadas por variável, por cron, por outra edge ou por
cliente externo não aparecem.
Caminho recomendado: para cada uma das 50, procure chamada em quatro lugares, não um: (1) `grep` em `src/` por
`invoke('<nome>'` **e** por composição de nome em variável; (2) `grep` em `supabase/functions/` (edge chamando
edge); (3) `cron.job` no banco (`command ilike '%<nome>%'`); (4) consumidor externo — para `mcp-keys-*` e
`mcp-query`, cliente MCP fora deste repo. Entregue `docs/qa/edges-orfas.md` com a conclusão por função:
`usada (onde)`, `órfã confirmada` ou `inconclusiva (por quê)`.
Por que este caminho e não o óbvio: o óbvio é confiar na lista e desativar as 50. Entre elas estão
`force-global-logout`, `verify-2fa-token` e `verify-email` — desativar quebraria autenticação.
Arquivos e objetos a tocar: cria `docs/qa/edges-orfas.md`.
Não tocar / armadilhas: nenhuma função desativada nesta etapa.
Depende de: — · Libera: 167, 168, 169, 170
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o documento classifica as 50, com a evidência de cada uma das quatro buscas.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 167 — Confirmar o consumidor das funções de chave MCP
Onda / Severidade / Camada: 4 / Média / Edge function
Achados resolvidos: ACH-072
Problema hoje: `mcp-keys-issue`, `mcp-keys-revoke`, `mcp-keys-rotate` e `mcp-query` constam órfãs e estão ativas.
São funções que emitem e revogam credencial — se não têm consumidor, são superfície de ataque; se têm, são
infraestrutura em uso.
Causa raiz: o consumidor é um cliente MCP externo ao repo, então a análise estática não o vê.
Caminho recomendado: leia os logs de invocação dessas quatro funções nos últimos 30 dias (MCP Supabase,
`query_logs`). Chamada recente = em uso; zero chamada = candidata a desativação, e aí a decisão é do dono porque
mexe em credencial de integração. Verifique também a tabela `mcp_api_keys` (há quantas chaves ativas?).
Por que este caminho e não o óbvio: o óbvio é desativar por não achar chamada no repo. Desativar emissão/revogação
de chave pode deixar uma credencial viva sem como revogá-la.
Arquivos e objetos a tocar: `docs/qa/edges-orfas.md`.
Não tocar / armadilhas: não desative nada aqui; não liste valor de chave, só contagem.
Depende de: 166 · Libera: 169
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: sim (envolve credencial de integração)
Como verificar: o documento traz, para cada uma das quatro, o número de invocações em 30 dias e a contagem de
chaves ativas.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 168 — Avaliar as edges de teste que estão ativas em produção
Onda / Severidade / Camada: 4 / Média / Edge function
Achados resolvidos: ACH-072
Problema hoje: entre as marcadas órfãs estão `test-cart-concurrency`, `test-cart-limit`, `test-cart-rls`,
`test-contract-orchestrator`, `test-inventory-orchestrator`, `tests`, `load-test`, `rls-integration-tests`,
`simulation-orchestrator` — funções de teste deployadas no projeto de produção.
Causa raiz: o pipeline de E2E usa edges de apoio e elas ficam no mesmo projeto do app.
Caminho recomendado: para cada uma, confirme se o E2E a chama (`grep -rn "<nome>" e2e/`); as que o E2E usa ficam,
mas devem ter a mesma barreira de `e2e-cleanup` (segredo + allowlist fail-closed — etapas 041/042). As que ninguém
chama entram na lista de remoção da etapa 169. `load-test` já foi verificado como clampado, com papel `dev` e anon
key — registre isso para não re-auditar.
Por que este caminho e não o óbvio: o óbvio é remover tudo que começa com `test-`. `rls-integration-tests` é a
ferramenta que o repo usa para exercitar RLS, e removê-la tira capacidade de auditoria.
Arquivos e objetos a tocar: `docs/qa/edges-orfas.md`.
Não tocar / armadilhas: funções de teste que escrevem dado precisam da barreira; não as deixe abertas "porque são
de teste".
Depende de: 166 · Libera: 169
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: cada função de teste está classificada como "usada pelo E2E (com/sem barreira)" ou "candidata a remoção".
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 169 — Remover as edges órfãs confirmadas
Onda / Severidade / Camada: 4 / Média / Edge function
Achados resolvidos: ACH-072
Problema hoje: cada edge ativa é superfície exposta e custo de manutenção.
Causa raiz: funções criadas e esquecidas.
Caminho recomendado: **só as classificadas como "órfã confirmada"** nas etapas 166–168. Remova a pasta do repo e
registre no PR a evidência das quatro buscas. A remoção do deploy acontece pelo workflow
`deploy-edge-functions.yml`; confirme depois com `list_edge_functions` que a função saiu de produção. Faça em lotes
pequenos (3 a 5 por PR), para a reversão ser cirúrgica.
Por que este caminho e não o óbvio: o óbvio é uma PR removendo todas. Se uma delas tinha consumidor externo, você
descobre com tudo fora do ar ao mesmo tempo.
Arquivos e objetos a tocar: pastas em `supabase/functions/`.
Não tocar / armadilhas: nunca remova função de autenticação (`verify-2fa-token`, `verify-email`,
`force-global-logout`) sem evidência explícita das quatro buscas.
Depende de: 166, 167, 168 · Libera: 170
Risco e como reverter: médio. Reverter = `git revert` + redeploy.
Precisa de aprovação humana antes do merge: sim (remoção de infraestrutura)
Como verificar: `list_edge_functions` não traz mais as removidas; nenhum erro novo nos logs nas 24 h seguintes.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 170 — Fazer o gerador de contexto parar de dar falso positivo de edge órfã
Onda / Severidade / Camada: 4 / Média / Ferramentas
Achados resolvidos: ACH-080, ACH-072
Problema hoje: o `edge-functions.json` marca como órfã função que é chamada (`quote-sync-promo-champions`) e lista
`receive-quote-sync` como "chamada sem pasta" quando é a URL de **outro** projeto Supabase
(`quote-sync-promo-champions/index.ts:16`). Agente que planeja por esse JSON conclui errado.
Causa raiz: a análise só cobre chamada estática por nome literal, dentro deste repo.
Caminho recomendado: no gerador (`scripts/ai-context/gerar.mjs`), acrescente as fontes que faltam: chamada por
`cron.job` e chamada por outra edge. Para o que continuar incerto, troque a flag booleana `orfa` por três estados
(`usada`, `sem_chamada_estatica`, `externa`) — o problema não é a análise ser incompleta, é ela afirmar certeza que
não tem. E trate URL de outro projeto como `externa`, não como "sem pasta".
Por que este caminho e não o óbvio: o óbvio é melhorar o grep até acertar. Nunca vai cobrir cliente MCP externo;
declarar a incerteza é mais honesto e mais útil.
Arquivos e objetos a tocar: `scripts/ai-context/gerar.mjs` e, se houver, o teste dele
(`tests/scripts/contexto-produtores.test.mjs`).
Não tocar / armadilhas: o gerador roda a cada 10 min pelo `contexto.yml` e publica na branch `contexto` — **nunca
abra PR da branch `contexto`** (regra do repo). Mexa só no script, em `main`.
Depende de: 166 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: rode `node scripts/ai-context/gerar.mjs` local e confirme que `quote-sync-promo-champions` aparece
como `usada` e `receive-quote-sync` como `externa`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 4.E — Observabilidade que não observa (ACH-051, ACH-064, ACH-063, ACH-062)

<modelo_etapa>
Etapa 171 — Trocar os nomes fictícios de fornecedor no gráfico de estoque
Onda / Severidade / Camada: 4 / Baixa / Interface
Achados resolvidos: ACH-051
Problema hoje: `stock-chart-utils.ts:93-99,177-189` (via `useStockChartData.ts:59,77`) inventa nomes de fornecedor
quando o produto não tem histórico. Há badge "dados simulados" em `StockHistoryChart.tsx:127`, o que mitiga.
Causa raiz: o gerador de série sintética preenche o campo de nome com valores plausíveis.
Caminho recomendado: troque os nomes inventados por rótulos neutros ("Fornecedor A", "Fornecedor B") — plausível é
pior que genérico, porque um nome real de fornecedor num gráfico simulado confunde quem conhece o mercado.
Por que este caminho e não o óbvio: o óbvio é remover a série sintética. O gráfico vazio para produto novo é pior
experiência; o badge já avisa.
Arquivos e objetos a tocar: `src/utils/stock-chart-utils.ts`.
Não tocar / armadilhas: não remova o badge de `StockHistoryChart.tsx:127`.
Depende de: — · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: o gráfico de um produto sem histórico mostra rótulos genéricos e o badge.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 172 — Teste garantindo que nome real de fornecedor não entra em série simulada
Onda / Severidade / Camada: 4 / Baixa / Testes
Achados resolvidos: ACH-051
Problema hoje: nada impede o padrão voltar.
Causa raiz: sem teste.
Caminho recomendado: teste de unidade de `stock-chart-utils` afirmando que a série sintética usa só os rótulos
genéricos. Já existe `tests/unit/stock-chart-utils.test.ts` em `test:ci-core` — acrescente o caso lá, que assim ele
entra no gate que bloqueia merge.
Por que este caminho e não o óbvio: criar arquivo de teste novo o deixaria fora de `test:ci-core` até a etapa 137.
Arquivos e objetos a tocar: `tests/unit/stock-chart-utils.test.ts`.
Não tocar / armadilhas: não altere os casos existentes.
Depende de: 171 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: `npx vitest run tests/unit/stock-chart-utils.test.ts` → exit 0 com o novo caso.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 173 — Fazer `cors-snapshot.json` registrar a origem permitida de verdade
Onda / Severidade / Camada: 4 / Baixa / Ferramentas
Achados resolvidos: ACH-064
Problema hoje: `_shared/cors-snapshot.json` está com `generated_at 2026-11-08`, total 110 contra 112, falta
`mockup-assistant`, e grava `allowOrigin: null` nos **105** registros marcados `shared` — ou seja, o painel
`cors-audit` não consegue mostrar quem responde `*`. Sem gate de CI.
Causa raiz: o gerador não resolve a origem quando a função usa o helper compartilhado de CORS, e grava nulo.
Caminho recomendado: no `scripts/build-cors-snapshot.mjs`, resolva a origem também para as funções que usam o
helper — leia o valor que o helper devolve, em vez de gravar nulo. Corrija também a contagem (o script já exclui a
pasta `tests/`, por isso 111, não 112 — ver ACH-081).
Por que este caminho e não o óbvio: o óbvio é regerar o snapshot. Regerar com o mesmo script produz os mesmos 105
nulos.
Arquivos e objetos a tocar: `scripts/build-cors-snapshot.mjs`, `supabase/functions/_shared/cors-snapshot.json`.
Não tocar / armadilhas: não edite o JSON à mão; ele é gerado.
Depende de: — · Libera: 174
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: o JSON regerado traz `allowOrigin` preenchido para as funções `shared` e inclui `mockup-assistant`;
a tela `cors-audit` passa a listar quem responde `*`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 174 — Gate que mantém `cors-snapshot.json` em dia
Onda / Severidade / Camada: 4 / Baixa / CI
Achados resolvidos: ACH-064
Problema hoje: o snapshot ficou 2 semanas defasado sem nada reclamar.
Causa raiz: artefato gerado sem verificação de frescor.
Caminho recomendado: no job `Static checks`, rode o gerador e falhe se o resultado diferir do arquivo versionado —
é o padrão "regenera e compara" que o repo já usa em outros gates de drift (`check-types-inventory-drift`,
`check-schema-reference-drift`). Não invente verificação por data.
Por que este caminho e não o óbvio: o óbvio é checar `generated_at`. Data velha com conteúdo certo não é problema;
conteúdo divergente é.
Arquivos e objetos a tocar: o workflow do `Static checks`, `package.json`.
Não tocar / armadilhas: o gate só serve depois da etapa 173; antes, ele falharia por causa dos 105 nulos.
Depende de: 173 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (CI)
Como verificar: acrescentando uma edge nova sem regerar o snapshot, o gate falha.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 175 — Fazer o teste de integração da ponte do CRM voltar a bloquear
Onda / Severidade / Camada: 4 / Média / CI
Achados resolvidos: ACH-063
Problema hoje: `edge-functions-deno-tests.yml:192-201` roda o teste de integração do `crm-db-bridge` com
`continue-on-error: true`, por desenho, desde a mudança de contrato `f84444c1e`. É a **única** ponte autorizada ao
CRM externo.
Causa raiz: o teste foi tolerado durante uma mudança de contrato e a tolerância ficou.
Caminho recomendado: rode o teste como está e veja se ele passa hoje. Se passa, remova o `continue-on-error`. Se
falha, leia a falha: se é o contrato antigo, atualize o teste ao contrato novo (o commit `f84444c1e` diz o que
mudou) e então remova a tolerância.
Por que este caminho e não o óbvio: o óbvio é remover o `continue-on-error` e ver o que acontece no CI. Se o teste
estiver vermelho, você trava as PRs de edge function sem ter diagnosticado nada.
Arquivos e objetos a tocar: `.github/workflows/edge-functions-deno-tests.yml` e, se preciso, o teste do `crm-db-bridge`.
Não tocar / armadilhas: a ponte depende do banco externo `pgxfvjmuubtbowutlide`; se o teste exigir rede, ele pode
ser instável por motivo alheio — nesse caso, separe a parte de contrato (sem rede) da parte de integração, e faça
bloquear só a de contrato.
Depende de: — · Libera: —
Risco e como reverter: médio. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (workflow)
Como verificar: o job roda sem `continue-on-error` e passa; quebrando o contrato de propósito, ele falha.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 176 — Restabelecer o acesso do MCP da Vercel ao projeto
Onda / Severidade / Camada: 4 / Média / Infraestrutura
Achados resolvidos: ACH-062
Problema hoje: medido nesta auditoria — `get_project` → 404, `list_deployments` → 403, `list_projects(team)` → `[]`;
o MCP vê o time `juca1` e nenhum projeto. Nenhum agente consegue diagnosticar deploy, variável de ambiente ou log
pela Vercel; o estado do deploy teve de ser obtido pelo GitHub.
Causa raiz: o token/escopo do MCP da Vercel não alcança o projeto `prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ`.
Caminho recomendado: esta etapa é de configuração, não de código. Documente em `docs/qa/mcp-vercel-acesso.md` o que
foi medido (os três erros, com o comando) e o que precisa ser ajustado: escopo do token da integração para incluir
o time/projeto. Leve ao dono — é ele que autoriza escopo de token. Enquanto não houver acesso, registre no mesmo
documento o caminho alternativo que funcionou (`github_list_deployments` + `_statuses`), para o próximo agente não
perder tempo.
Por que este caminho e não o óbvio: o óbvio é tentar outro token ou criar um. Credencial e escopo são decisão do
dono, e o `AGENTS.md` proíbe segredo fora de variável de ambiente/secret do serviço.
Arquivos e objetos a tocar: cria `docs/qa/mcp-vercel-acesso.md`.
Não tocar / armadilhas: não crie projeto novo na Vercel — `.vercel/project.json` é âncora e projeto novo gera deploy
duplo (incidente de 2026-09-15, registrado nas regras do repo).
Depende de: — · Libera: 285
Risco e como reverter: zero (documento).
Precisa de aprovação humana antes do merge: sim (escopo de credencial)
Como verificar: o documento traz os três erros medidos e o caminho alternativo; depois do ajuste do dono,
`get_project` responde 200.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

---

# ONDA 5 · Robustez: erros, estados e concorrência (177–226)

## Bloco 5.A — Chamada a terceiro sem timeout (ACH-023, ACH-024, ACH-025, ACH-026)

<modelo_etapa>
Etapa 177 — Timeout nos dois `fetch` do `webhook-dispatcher`
Onda / Severidade / Camada: 5 / Alta / Edge function
Achados resolvidos: ACH-023
Problema hoje: `webhook-dispatcher/index.ts:162` e `:305` fazem POST na URL do banco com **zero** `AbortSignal`.
Terceiro lento pendura a função até o limite da plataforma e consome invocação paga.
Causa raiz: o padrão de timeout existe no repo e não foi aplicado aqui.
Caminho recomendado: use `AbortSignal.timeout(...)` como em `generate-blurhashes:93` — é o padrão da casa. Escolha o
valor pelo que um webhook razoável responde (10 a 15 s) e registre o timeout como erro de entrega em
`webhook_deliveries`, para o admin ver.
Por que este caminho e não o óbvio: o óbvio é confiar no timeout da plataforma. O limite da plataforma é de minutos;
nesse tempo a função já consumiu CPU paga e a fila de entregas travou.
Arquivos e objetos a tocar: `supabase/functions/webhook-dispatcher/index.ts`.
Não tocar / armadilhas: não mexa na lógica de retry nesta etapa (é a 179).
Depende de: — · Libera: 178, 179
Risco e como reverter: baixo. Reverter = `git revert` + redeploy.
Precisa de aprovação humana antes do merge: não
Como verificar: apontar um webhook de teste para um endpoint que demora mais que o timeout → entrega marcada como
falha por timeout, e a função retorna em segundos.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 178 — Timeout nos outros 4 pontos sem `AbortSignal`
Onda / Severidade / Camada: 5 / Média / Edge function
Achados resolvidos: ACH-023
Problema hoje: `github-credentials-test:103,161,225`, `product-visual-search:160`, `analyze-logo-colors:81` e
`validate-access:28` chamam terceiro sem timeout.
Causa raiz: idem 177.
Caminho recomendado: aplique o mesmo padrão da etapa 177 nos quatro arquivos, numa PR. São mudanças de uma linha
cada, do mesmo tipo — agrupar aqui é correto e não prejudica a reversão.
Por que este caminho e não o óbvio: idem 177.
Arquivos e objetos a tocar: os quatro arquivos em `supabase/functions/`.
Não tocar / armadilhas: `analyze-logo-colors` também precisa de teto de bytes (etapa 180) — não faça as duas coisas
aqui; esta é só o timeout.
Depende de: 177 · Libera: 180, 181
Risco e como reverter: baixo. Reverter = `git revert` + redeploy.
Precisa de aprovação humana antes do merge: não
Como verificar: `grep -n "AbortSignal" ` nos quatro arquivos mostra o timeout; cada função continua respondendo no
caminho feliz.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 179 — Limitar o `backoff_seconds` que vem do banco
Onda / Severidade / Camada: 5 / Média / Edge function
Achados resolvidos: ACH-024
Problema hoje: `webhook-dispatcher/index.ts:241-243,342,357` — `max_attempts` é clampado, o delay **não**; o default
já dorme 155 s dentro da função.
Causa raiz: validação pela metade: o número de tentativas foi limitado e o intervalo não.
Caminho recomendado: clampe `backoff_seconds` com o mesmo cuidado que `max_attempts` já tem (leia como o clamp
existente foi escrito e espelhe). E troque o `sleep` dentro da função por reagendamento: a função não deve dormir
155 s — ela deve marcar `next_attempt_at` e sair, deixando o próximo ciclo pegar.
Por que este caminho e não o óbvio: o óbvio é só clampar o número. Dormir 155 s numa edge function é tempo de
execução pago parado; o reagendamento é o padrão correto e o campo `next_attempt_at` já existe na tabela.
Arquivos e objetos a tocar: `supabase/functions/webhook-dispatcher/index.ts`.
Não tocar / armadilhas: o reagendamento depende de haver um cron chamando o dispatcher — confirme em `cron.job`
antes; se não houver, faça só o clamp e anote o resto no progresso.
Depende de: 177 · Libera: —
Risco e como reverter: médio (muda o comportamento de retry). Reverter = `git revert` + redeploy.
Precisa de aprovação humana antes do merge: não
Como verificar: gravar `backoff_seconds` absurdo em ambiente de teste → o delay aplicado é o do clamp; a função não
dorme mais que o teto.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 180 — Teto de bytes e conversão eficiente em `analyze-logo-colors`
Onda / Severidade / Camada: 5 / Média / Edge function
Achados resolvidos: ACH-025
Problema hoje: `analyze-logo-colors:81` baixa sem timeout nem teto de bytes, e `:93-96` converte a imagem caractere
a caractere. Imagem grande derruba a função com 500/OOM. O SSRF já está tratado.
Causa raiz: download e conversão escritos para imagem pequena.
Caminho recomendado: aplique o teto de bytes como `image-proxy:133-137` já faz (é a referência do repo) e troque a
conversão caractere a caractere por operação sobre o buffer inteiro. Rejeite acima do teto com erro padronizado,
não com exceção.
Por que este caminho e não o óbvio: o óbvio é aumentar a memória da função. O custo sobe e a próxima imagem maior
derruba de novo.
Arquivos e objetos a tocar: `supabase/functions/analyze-logo-colors/index.ts`.
Não tocar / armadilhas: o timeout é a etapa 178; não repita.
Depende de: 178 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert` + redeploy.
Precisa de aprovação humana antes do merge: não
Como verificar: imagem acima do teto → erro padronizado em vez de 500; imagem normal → mesmo resultado de antes.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 181 — Trocar a consulta de geolocalização em claro de `validate-access`
Onda / Severidade / Camada: 5 / Média / Edge function
Achados resolvidos: ACH-026
Problema hoje: `validate-access:28` consulta geolocalização por `http://`, sem timeout (resolvido na 178), e o
cliente falha-aberto (comentário em `:117-118`).
Causa raiz: serviço de geo escolhido sem HTTPS.
Caminho recomendado: troque para o mesmo serviço em `https://`, se ele oferecer, ou para outro provedor com HTTPS.
Antes, meça o quanto a cidade pesa na decisão de acesso (a auditoria deixou isso como hipótese): se o peso for
pequeno, a saída mais simples é parar de consultar geo e remover a dependência.
Por que este caminho e não o óbvio: o óbvio é só trocar o esquema para `https://`. Se o provedor não suportar, a
chamada passa a falhar e, com o fail-open, ninguém nota — e a decisão de acesso muda em silêncio.
Arquivos e objetos a tocar: `supabase/functions/validate-access/index.ts`.
Não tocar / armadilhas: não transforme o fail-open em fail-closed nesta etapa sem medir — bloquearia acesso
legítimo quando o provedor de geo caísse.
Depende de: 178 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert` + redeploy.
Precisa de aprovação humana antes do merge: não
Como verificar: a chamada sai por HTTPS (ou não existe mais) e a decisão de acesso para um IP conhecido é a mesma
de antes.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 5.B — Condição de corrida que troca o preço (ACH-042, ACH-043)

<modelo_etapa>
Etapa 182 — Teste que prova a corrida na tabela de preço da técnica
Onda / Severidade / Camada: 5 / Alta / Hooks
Achados resolvidos: ACH-042
Problema hoje: `useTechniquePricingOptions.ts:57-81` e `:150-179` (consumidor `useSimulation.ts:191`) buscam sem
`AbortController` nem token de requisição; `setTables`/`setAllTables` grava o que chegar por último. O orçamento
pode sair com o preço de personalização de outra técnica.
Causa raiz: duas buscas assíncronas escrevendo o mesmo estado, sem cancelamento.
Caminho recomendado: teste que troca a técnica duas vezes rápido, com a primeira resposta chegando depois da
segunda, e afirma que o estado final é o da segunda. Deve falhar hoje.
Por que este caminho e não o óbvio: idem às outras corridas — sem teste, a correção não é verificável.
Arquivos e objetos a tocar: novo teste em `src/hooks/simulation/__tests__/`.
Não tocar / armadilhas: controle a ordem das respostas no teste; `Promise.all` não reproduz a corrida.
Depende de: — · Libera: 183, 184
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste falha, mostrando a tabela da técnica anterior no estado. Cole a saída.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 183 — Cancelar a busca anterior em `useTechniquePricingOptions`
Onda / Severidade / Camada: 5 / Alta / Hooks
Achados resolvidos: ACH-042
Problema hoje: ver 182.
Causa raiz: idem.
Caminho recomendado: use o padrão que o próprio repo já usa para isso — há `fetchTokenRef` e `mountedRef` em outros
hooks (a auditoria os encontrou como implementações corretas). Procure um deles e replique: cada busca pega um
token, e só grava no estado se o token ainda é o atual. Aplique nos dois blocos (`:57-81` e `:150-179`).
Por que este caminho e não o óbvio: o óbvio é `AbortController` só na primeira. Se um dos dois blocos ficar sem
guarda, a corrida continua pelo outro caminho.
Arquivos e objetos a tocar: `src/hooks/simulation/useTechniquePricingOptions.ts`.
Não tocar / armadilhas: não mude a assinatura do hook; `useSimulation.ts:191` depende dela.
Depende de: 182 · Libera: 184
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste da etapa 182 passa; a troca de técnica no simulador continua funcionando.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 184 — Varredura do padrão "dois `await` e um `setState` sem guarda"
Onda / Severidade / Camada: 5 / Média / Hooks
Achados resolvidos: ACH-042, ACH-043
Problema hoje: o padrão foi confirmado em dois lugares (ACH-042 e ACH-043); com 645 hooks, pode haver mais em
caminhos de preço e estoque.
Causa raiz: o padrão é fácil de escrever e invisível em revisão.
Caminho recomendado: varra `src/hooks/` e `src/components/` por funções com dois ou mais `await` seguidos de
`setState`, sem `useRef` de token, `AbortController` nem flag de montagem no arquivo. Priorize o que toca preço,
estoque e desconto. Entregue `docs/qa/corridas-de-estado.md`; cada caso vira etapa, no modelo da 183.
Por que este caminho e não o óbvio: corrigir todos de uma vez é PR gigante; e boa parte dos casos em telas de
leitura é inofensiva.
Arquivos e objetos a tocar: cria `docs/qa/corridas-de-estado.md`.
Não tocar / armadilhas: não conte como achado o hook que usa react-query (o cliente já cancela).
Depende de: 183 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o documento lista arquivo:linha, com uma coluna de impacto (preço/estoque/outro).
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 185 — Teste e correção da corrida em `InlinePriceCalculator`
Onda / Severidade / Camada: 5 / Alta / Interface
Achados resolvidos: ACH-043
Problema hoje: `InlinePriceCalculator.tsx:113-163` tem dois `await` sequenciais e `setPriceTiers` sem nenhuma
guarda — zero `useRef`, `cancel` ou `abort` no arquivo. Mostra faixas de desconto por quantidade da variante errada.
Causa raiz: idem 182.
Caminho recomendado: escreva o teste de troca rápida de variante primeiro (como na 182), depois aplique o mesmo
padrão de token da etapa 183. Como é componente, a flag de montagem também é necessária, para não gravar estado
depois do desmonte.
Por que este caminho e não o óbvio: o óbvio é mover a busca para react-query. É a solução certa, mas muda o
componente inteiro; o token resolve a corrida com três linhas e pode ser revertido fácil.
Arquivos e objetos a tocar: `src/components/products/InlinePriceCalculator.tsx` + novo teste.
Não tocar / armadilhas: faixa de desconto é dinheiro — confirme que o preço exibido para a variante certa não mudou.
Depende de: — · Libera: 184
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste passa; trocar de variante rápido mostra sempre as faixas da variante selecionada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 5.C — Cache que não é invalidado e chave duplicada (ACH-036, ACH-037, ACH-031, ACH-040, ACH-041)

<modelo_etapa>
Etapa 186 — Invalidar `['quote-item-counts']` nas mutations de orçamento
Onda / Severidade / Camada: 5 / Média / Hooks
Achados resolvidos: ACH-036
Problema hoje: `useQuoteItemCounts.ts:15` define a chave e **nada** a invalida; as mutations de orçamento invalidam
só `['quotes']`. A coluna "itens" da lista fica errada por até 60 s (`QuotesConfigurableList.tsx:324`).
Causa raiz: a contagem é uma segunda query sobre o mesmo dado, fora da invalidação.
Caminho recomendado: acrescente a chave à lista de invalidação das mutations que alteram item de cotação. Se houver
um helper de invalidação compartilhado (a auditoria encontrou um), acrescente lá — assim vale para todas as
mutations de uma vez.
Por que este caminho e não o óbvio: o óbvio é incluir a contagem na query de `['quotes']`. Isso engorda a consulta
principal da lista, que é a tela mais usada pelo vendedor.
Arquivos e objetos a tocar: as mutations de `src/hooks/quotes/` ou o helper de invalidação.
Não tocar / armadilhas: não baixe o `staleTime` para 0 — faz a lista refazer a contagem a cada foco de janela.
Depende de: — · Libera: 187
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: adicionar item a uma cotação e ver a coluna "itens" mudar sem recarregar.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 187 — Varredura de `queryKey` definida e nunca invalidada
Onda / Severidade / Camada: 5 / Média / Hooks
Achados resolvidos: ACH-034, ACH-036
Problema hoje: duas chaves foram encontradas com **ocorrência única** em todo o `src/` (`['role-permissions']` e
`['quote-item-counts']`), ou seja, lidas e nunca invalidadas. A auditoria contou 263 `queryKey` literais e 160
blocos `useMutation` — pode haver mais.
Causa raiz: chave criada no hook de leitura e esquecida na escrita.
Caminho recomendado: liste toda `queryKey` literal e conte quantas vezes cada uma aparece; as de ocorrência 1 são
candidatas. Para cada candidata, veja se existe mutation que altera a mesma tabela. Entregue
`docs/qa/querykeys-sem-invalidacao.md`. Não corrija em massa.
Por que este caminho e não o óbvio: ocorrência 1 não é prova — a chave pode ser de dado que nunca muda. A coluna de
"existe mutation na mesma tabela?" é o que separa.
Arquivos e objetos a tocar: cria `docs/qa/querykeys-sem-invalidacao.md`.
Não tocar / armadilhas: chaves montadas em constante não aparecem como literal; registre essa limitação no documento.
Depende de: 186 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o documento traz a lista com a contagem de ocorrências e a coluna de mutation correspondente.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 188 — Unificar a contagem de aprovações de desconto num único hook
Onda / Severidade / Camada: 5 / Média / Hooks
Achados resolvidos: ACH-037
Problema hoje: a chave `['pending-discount-approvals-count']` tem **3 observers com 3 `queryFn` diferentes** —
`AdminUsuariosPage.tsx:80` usa HEAD, os outros dois usam GET —, com opções divergentes. Conforme a ordem de
montagem, isso reverte as correções já documentadas como BUG-DAR-ABORT e BUG-SIDEBAR-ABORT.
Causa raiz: três componentes implementaram a mesma contagem.
Caminho recomendado: crie um hook único (`usePendingDiscountApprovalsCount`) com **uma** `queryFn` e as opções
definidas num só lugar, e faça os três consumirem. Escolha HEAD ou GET pelo que a contagem precisa: se só o número
importa, HEAD com `count` é mais barato.
Por que este caminho e não o óbvio: o óbvio é alinhar as três `queryFn` copiando uma delas para as outras. Três
cópias iguais hoje divergem amanhã — foi exatamente o que aconteceu duas vezes aqui (os dois BUG-* documentados).
Arquivos e objetos a tocar: novo hook; `AdminUsuariosPage.tsx`, `SidebarReorganized.tsx`, `Header.tsx`.
Não tocar / armadilhas: respeite as correções BUG-DAR-ABORT e BUG-SIDEBAR-ABORT — leia o que elas fizeram antes de
escrever a `queryFn` única, para não reintroduzir o problema que elas resolveram.
Depende de: 090 · Libera: 189
Risco e como reverter: médio (toca 3 telas). Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: no devtools de rede, uma requisição compartilhada; o badge, o cabeçalho e a tela de usuários mostram
o mesmo número.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 189 — Teste que impede a chave de contagem voltar a ter duas implementações
Onda / Severidade / Camada: 5 / Baixa / Testes
Achados resolvidos: ACH-037
Problema hoje: o padrão já voltou duas vezes.
Causa raiz: nada verifica unicidade de `queryFn` por chave.
Caminho recomendado: teste que importe o hook único e afirme que os três componentes o usam — na prática, um teste
que renderize os três e conte as requisições feitas (deve ser 1). Alternativa mais simples e também válida: um teste
de "grep" que falhe se a chave literal aparecer fora do hook.
Por que este caminho e não o óbvio: o óbvio é confiar na revisão. Duas reincidências dizem que a revisão não pega.
Arquivos e objetos a tocar: novo teste.
Não tocar / armadilhas: teste de grep é frágil se a chave for montada; prefira contar requisições.
Depende de: 188 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste passa; recriando uma segunda `queryFn` localmente, ele falha.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 190 — Unificar a `queryFn` de `['video-variant-links']`
Onda / Severidade / Camada: 5 / Média / Hooks
Achados resolvidos: ACH-031
Problema hoje: a mesma chave tem duas implementações: `useProductVideoGallery.ts:102` engole o erro com `return []`
e `useVideoVariantLinks.ts:32` dá `throw`. Erro de RLS aparece como "sem vínculos" dependendo de quem montou primeiro.
Causa raiz: duas implementações da mesma leitura.
Caminho recomendado: mantenha a que dá `throw` (é o comportamento correto: o erro precisa subir para a tela decidir)
e faça `useProductVideoGallery` consumir o mesmo hook. Depois, trate o erro na galeria com estado próprio.
Por que este caminho e não o óbvio: o óbvio é padronizar no `return []`, que "não quebra a tela". É justamente o
padrão do grupo 9: erro virando vazio.
Arquivos e objetos a tocar: `src/hooks/.../useProductVideoGallery.ts`, `src/hooks/.../useVideoVariantLinks.ts`.
Não tocar / armadilhas: a galeria é usada na página de produto; confirme que o estado de erro não derruba a página
inteira (trate por seção, como na etapa 074).
Depende de: — · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: com erro simulado, a galeria mostra falha em vez de "sem vínculos"; com dado, mostra os vínculos.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 191 — Resolver a duplicação de `useReplenishments`
Onda / Severidade / Camada: 5 / Baixa / Hooks
Achados resolvidos: ACH-040
Problema hoje: `src/hooks/useReplenishments.ts` (legado) e `src/hooks/products/useReplenishments.ts` coexistem
compartilhando `queryKey` — dois hooks escrevendo o mesmo cache com implementações diferentes.
Causa raiz: migração de pasta feita sem remover o antigo.
Caminho recomendado: confirme por grep quem importa cada um, aponte todos para a versão em `products/` e remova a
legada. Se as implementações divergirem, a de `products/` é a nova — compare antes e registre a diferença no PR.
Por que este caminho e não o óbvio: o óbvio é remover a legada direto. Se algum consumidor dependia de um
comportamento que só a legada tem, a tela muda sem ninguém notar.
Arquivos e objetos a tocar: remove `src/hooks/useReplenishments.ts`; ajusta os imports.
Não tocar / armadilhas: `grep` por `useReplenishments` pega os dois; olhe o caminho do import, não só o nome.
Depende de: — · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: typecheck e testes verdes; `grep -rn "hooks/useReplenishments" src/` sem resultado.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 192 — Resolver a duplicação entre `usePersonalizationData` e `usePersonalizationManager`
Onda / Severidade / Camada: 5 / Média / Hooks
Achados resolvidos: ACH-040
Problema hoje: os dois hooks compartilham **9 chaves iguais** de query — a maior sobreposição encontrada.
Causa raiz: um hook de leitura e um de gestão cresceram cobrindo o mesmo dado.
Caminho recomendado: não remova nenhum dos dois de início. Primeiro, liste as 9 chaves e, para cada uma, qual dos
dois a lê e a escreve. Depois, mova as leituras compartilhadas para um terceiro módulo consumido pelos dois, ou faça
o de gestão consumir o de leitura. Entregue a decisão no PR, chave por chave.
Por que este caminho e não o óbvio: o óbvio é fundir os dois num hook só. São hooks grandes, de um domínio de preço
(personalização), e uma fusão às cegas pode mudar cálculo.
Arquivos e objetos a tocar: `src/hooks/.../usePersonalizationData.ts`, `src/hooks/.../usePersonalizationManager.ts`.
Não tocar / armadilhas: cuidado com o ACH-085 — há calculadoras mortas de personalização; não confunda com estes hooks.
Depende de: 066 · Libera: —
Risco e como reverter: médio. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: as 9 chaves passam a ter uma única `queryFn` cada; testes de personalização verdes.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 193 — Resolver a duplicação de `useDevGate`
Onda / Severidade / Camada: 5 / Baixa / Hooks
Achados resolvidos: ACH-040
Problema hoje: `src/hooks/useDevGate.ts` e `src/hooks/admin/useDevGate.ts` coexistem. É o hook que decide acesso a
telas de desenvolvedor — duas versões é risco de decidir diferente.
Causa raiz: idem 191.
Caminho recomendado: compare as duas implementações linha a linha antes de escolher. Mantenha a que o `DevRoute`
usa (leia o import em `admin-routes.tsx:118` para saber qual é) e remova a outra, ajustando os imports. Há testes
(`tests/hooks/useDevGate.test.ts`, `useDevGate.ssr-contract.test.tsx`) — rode-os.
Por que este caminho e não o óbvio: o óbvio é manter a de `admin/` por estar "mais organizada". A que vale é a que o
guard realmente usa.
Arquivos e objetos a tocar: um dos dois arquivos (remover) + imports.
Não tocar / armadilhas: é hook de controle de acesso — não mergeie sem os dois testes verdes.
Depende de: — · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: `npm run test:cloud-status` (que inclui os testes de `useDevGate`) → exit 0; `/admin/*` dev continua
restrito.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 194 — Invalidar os widgets do painel de orçamentos
Onda / Severidade / Camada: 5 / Baixa / Hooks
Achados resolvidos: ACH-041
Problema hoje: os widgets do painel de orçamentos não são invalidados pelas mutations; o `staleTime` de 30–60 s faz
o dado se curar sozinho. É fragilidade, não defeito visível.
Causa raiz: invalidação parcial.
Caminho recomendado: acrescente as chaves dos widgets ao helper de invalidação das mutations de orçamento (o mesmo
da etapa 186). Mudança pequena, e o ganho é o painel refletir a ação na hora.
Por que este caminho e não o óbvio: o óbvio é não fazer nada, porque se cura. O vendedor que aprova uma cotação e
vê o painel inalterado por 60 s clica de novo.
Arquivos e objetos a tocar: o helper de invalidação ou as mutations de orçamento.
Não tocar / armadilhas: não invalide tudo (`queryClient.invalidateQueries()` sem chave) — derruba o cache inteiro.
Depende de: 186 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: aprovar uma cotação atualiza os widgets imediatamente.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 5.D — Realtime prometido e não entregue (ACH-044, ACH-045)

<modelo_etapa>
Etapa 195 — Decidir o destino de `useCustomKitsRealtime`
Onda / Severidade / Camada: 5 / Média / Hooks
Achados resolvidos: ACH-044
Problema hoje: `useCustomKitsRealtime.ts:24-36` assina realtime em `custom_kits`, que **não está** em
`pg_publication_tables` de `supabase_realtime` (medido). O canal conecta e nunca entrega evento.
Causa raiz: assinatura escrita sem conferir a publicação.
Caminho recomendado: decida por uso, como na etapa 087: se kits personalizados são editados por mais de uma pessoa
ao mesmo tempo, publique a tabela (migration); se não, remova a assinatura e deixe a atualização por invalidação de
query. Registre a decisão no commit.
Por que este caminho e não o óbvio: o óbvio é publicar as 6 tabelas de uma vez. Cada tabela publicada é custo
contínuo de banco; e metade das assinaturas provavelmente não é necessária.
Arquivos e objetos a tocar: nova migration (se publicar) ou `src/hooks/.../useCustomKitsRealtime.ts` (se remover).
Não tocar / armadilhas: se remover, confirme que a tela tem outro caminho de atualização; senão o usuário fica com
dado velho (é o ACH-035 de novo).
Depende de: — · Libera: 199
Risco e como reverter: baixo. Reverter = rollback ou `git revert`.
Precisa de aprovação humana antes do merge: sim, se publicar (DDL em produção)
Como verificar: `pg_publication_tables` reflete a decisão, ou a assinatura não existe mais e a tela atualiza por
invalidação.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 196 — Decidir o destino de `CredentialsChangedBanner`
Onda / Severidade / Camada: 5 / Média / Interface
Achados resolvidos: ACH-044
Problema hoje: `CredentialsChangedBanner.tsx:40-43` assina realtime em `integration_credentials`, tabela não
publicada. O banner que avisaria "as credenciais mudaram" nunca aparece.
Causa raiz: idem 195.
Caminho recomendado: aqui o aviso tem valor operacional (credencial de integração trocada afeta quem está com a
tela aberta). Publique a tabela **ou** troque o banner por verificação na montagem da tela. Atenção: publicar
`integration_credentials` no realtime significa que mudanças nessa tabela passam pelo canal — confirme que o payload
não carrega segredo (use `REPLICA IDENTITY` adequado ou publique só o evento, sem colunas sensíveis).
Por que este caminho e não o óbvio: o óbvio é publicar a tabela e seguir. Tabela de credencial no realtime pode
vazar valor pelo payload — é a armadilha específica deste caso.
Arquivos e objetos a tocar: nova migration (com cuidado de payload) ou `src/components/.../CredentialsChangedBanner.tsx`.
Não tocar / armadilhas: nunca publique coluna de segredo no canal de realtime.
Depende de: — · Libera: 199
Risco e como reverter: médio. Reverter = rollback ou `git revert`.
Precisa de aprovação humana antes do merge: sim (envolve tabela de credencial)
Como verificar: trocar uma credencial em ambiente de teste faz o banner aparecer, e o payload do canal não contém
valor de segredo.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 197 — Decidir o destino de `RealtimeBadge`
Onda / Severidade / Camada: 5 / Baixa / Interface
Achados resolvidos: ACH-044
Problema hoje: `RealtimeBadge.tsx:21,26` assina `product_views` e `search_analytics`, nenhuma das duas publicada.
O selo de "ao vivo" nunca se move.
Causa raiz: idem 195.
Caminho recomendado: são tabelas de analítica, de volume alto — publicar no realtime é custo alto para um selo.
Remova as assinaturas e, se o selo tem valor, alimente-o por consulta periódica de baixa frequência.
Por que este caminho e não o óbvio: o óbvio é publicar. `product_views` e `search_analytics` recebem escrita a cada
visualização; publicar no realtime é o pior custo-benefício da lista.
Arquivos e objetos a tocar: `src/components/.../RealtimeBadge.tsx`.
Não tocar / armadilhas: não deixe o selo mostrando "ao vivo" se a fonte passou a ser periódica — ajuste o texto.
Depende de: — · Libera: 199
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: o selo reflete dado real (por consulta) ou não promete tempo real.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 198 — Decidir o destino da assinatura em `notificationPreferenceService`
Onda / Severidade / Camada: 5 / Baixa / Serviços
Achados resolvidos: ACH-044
Problema hoje: `notificationPreferenceService.ts:66-72` assina `user_notification_preferences`, não publicada.
Causa raiz: idem 195.
Caminho recomendado: preferência de notificação é dado do próprio usuário, mudado na própria sessão — realtime não
agrega. Remova a assinatura e confie na invalidação de query (que é o padrão da etapa 141 para preferências).
Por que este caminho e não o óbvio: o óbvio é publicar por consistência com as outras. Aqui o realtime não tem caso
de uso: ninguém muda a preferência de outro usuário.
Arquivos e objetos a tocar: `src/services/notificationPreferenceService.ts`.
Não tocar / armadilhas: confirme que a tela de preferências invalida a própria query ao salvar.
Depende de: — · Libera: 199
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: mudar a preferência atualiza a tela; nenhuma assinatura em tabela não publicada sobra.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 199 — Gate que compara as assinaturas de realtime com a publicação do banco
Onda / Severidade / Camada: 5 / Média / CI
Achados resolvidos: ACH-044, ACH-035
Problema hoje: cinco assinaturas foram escritas em tabelas não publicadas, e nada no CI percebe. O canal conecta com
sucesso, então nem em produção dá erro.
Causa raiz: duas verdades (código e publicação) sem verificação cruzada.
Caminho recomendado: script que extraia os nomes de tabela usados em `.channel(...)/.on('postgres_changes', ...)`
em `src/` e compare com `pg_publication_tables` de `supabase_realtime`, falhando na divergência. Siga a forma dos
gates de drift que o repo já tem (`check-schema-reference-drift.mjs` é boa referência, inclusive no modo
"sem credencial = inconclusivo em vez de passar").
Por que este caminho e não o óbvio: o óbvio é corrigir as 5 e seguir. O padrão é invisível em produção — sem gate,
a sexta nasce igual.
Arquivos e objetos a tocar: novo `scripts/check-realtime-subscriptions.mjs` + teste; workflow do `Static checks`;
`package.json`.
Não tocar / armadilhas: sem credencial de banco o gate deve ficar **inconclusivo**, nunca "passou" — é o erro que o
`check-public-views-drift` já evita com `--require-live`.
Depende de: 087, 195, 196, 197, 198 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (CI)
Como verificar: acrescentando uma assinatura em tabela não publicada, o gate falha nomeando a tabela.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 200 — Dar sufixo único ao canal de `MyDiscountRequestsWidget`
Onda / Severidade / Camada: 5 / Média / Interface
Achados resolvidos: ACH-045
Problema hoje: `MyDiscountRequestsWidget.tsx:88` usa o canal `dar-seller-${userId}`, sem sufixo único. É o único
arquivo fora do padrão BUG-RT-CHANNEL que os outros 4 adotaram.
Causa raiz: correção aplicada em 4 lugares e não no quinto.
Caminho recomendado: copie o padrão de sufixo dos outros 4 arquivos (procure por `BUG-RT-CHANNEL` no repo para
achá-los). Não invente um formato novo de sufixo.
Por que este caminho e não o óbvio: o óbvio é concatenar `Math.random()`. O padrão da casa existe e é o que mantém
os canais diagnosticáveis.
Arquivos e objetos a tocar: `src/components/.../MyDiscountRequestsWidget.tsx`.
Não tocar / armadilhas: não mexa nos 4 que já estão corretos.
Depende de: — · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: abrir duas abas com o widget não causa colisão de canal; o nome segue o padrão dos outros 4.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 5.E — Duplicação por efeito e erro engolido (ACH-055, ACH-032)

<modelo_etapa>
Etapa 201 — Teste e correção do item duplicado no kit
Onda / Severidade / Camada: 5 / Média / Hooks
Achados resolvidos: ACH-055
Problema hoje: `useKitBuilderPageState.ts:261-286` chama `addItem` dentro de um efeito sem ref de dedupe nem
cancelamento. O efeito irmão, em `:218-223`, usa `hydratedKitIdRef` e faz certo.
Causa raiz: dois efeitos no mesmo arquivo, um com guarda e outro sem.
Caminho recomendado: escreva o teste que remonta o efeito e afirma que o item é adicionado uma vez; depois replique
a guarda de `:218-223` no efeito de `:261-286` — o padrão está no próprio arquivo, a 40 linhas de distância.
Por que este caminho e não o óbvio: o óbvio é mover a chamada para um `useCallback` no clique. O efeito existe para
hidratar o kit a partir de parâmetro de URL; mover quebraria essa entrada.
Arquivos e objetos a tocar: `src/hooks/kit-builder/useKitBuilderPageState.ts` + novo teste.
Não tocar / armadilhas: não mexa no efeito de `:218-223`.
Depende de: — · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste passa; abrir o kit por URL com item pré-selecionado adiciona uma vez só.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 202 — Dar retorno ao lote de thumbnails que falha inteiro
Onda / Severidade / Camada: 5 / Baixa / Hooks
Achados resolvidos: ACH-032
Problema hoje: `useProductVideoGallery.ts:545-547` processa um lote de thumbnails e não dá nenhum retorno se
**todas** falharem — o usuário fica olhando uma galeria sem imagem, sem saber por quê.
Causa raiz: tratamento de erro por item, sem avaliação do lote.
Caminho recomendado: conte os sucessos e, se for zero com pelo menos uma tentativa, mostre um aviso na galeria.
Mantenha o comportamento atual quando parte funciona (falha parcial não deve alarmar).
Por que este caminho e não o óbvio: o óbvio é mostrar erro por thumbnail. Com um lote de 20, viram 20 avisos.
Arquivos e objetos a tocar: `src/hooks/.../useProductVideoGallery.ts` e o componente da galeria.
Não tocar / armadilhas: não bloqueie a galeria; o aviso é informativo.
Depende de: — · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: com todas as thumbnails falhando no teste, o aviso aparece; com uma falhando, não.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 203 — Registrar com contexto o erro engolido em `useQuotesDashboard`
Onda / Severidade / Camada: 5 / Baixa / Hooks
Achados resolvidos: ACH-032
Problema hoje: `useQuotesDashboard.ts:60-62` descarta o erro.
Causa raiz: `catch` vazio.
Caminho recomendado: registre o erro com contexto (qual consulta, qual filtro) usando o logger que o repo já usa, e
exponha um `isError` do hook para o painel decidir. Não mostre erro no painel nesta etapa — só torne o problema
visível no log.
Por que este caminho e não o óbvio: o óbvio é mostrar erro no painel. O painel tem muitos widgets; a etapa 194 já
trata a atualização deles, e um erro global por widget que falhou seria exagerado.
Arquivos e objetos a tocar: `src/hooks/.../useQuotesDashboard.ts`.
Não tocar / armadilhas: não use `console.error` solto; use o logger do repo, com `request_id` quando houver.
Depende de: — · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: com a consulta falhando, o log traz a mensagem com o filtro usado.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 5.F — Foco e teclado em modais próprios (ACH-077, ACH-078)

<modelo_etapa>
Etapa 204 — Armadilha de foco e Escape em `KitOnboardingTour`
Onda / Severidade / Camada: 5 / Média / Acessibilidade
Achados resolvidos: ACH-077
Problema hoje: `KitOnboardingTour.tsx:73-77` abre um modal sem foco inicial e sem fechar no Escape. O repo já tem
`useFocusTrap` e não o usa aqui.
Causa raiz: modal construído à mão em vez de usar o componente de diálogo padrão.
Caminho recomendado: use `useFocusTrap` (está no repo) e trate Escape. Se o tour puder ser reconstruído sobre o
`Dialog` padrão do repo (há harness visual dele em `e2e/ui/dialog-visual.spec.ts`), melhor ainda — mas isso é uma
mudança maior; o mínimo é o foco e o Escape.
Por que este caminho e não o óbvio: o óbvio é reescrever o tour com o `Dialog` padrão. É a solução melhor e não cabe
numa etapa pequena; o `useFocusTrap` resolve o problema de acessibilidade agora.
Arquivos e objetos a tocar: `src/components/kit-builder/KitOnboardingTour.tsx`.
Não tocar / armadilhas: o tour tem passos; o foco precisa ir para o passo atual a cada avanço, não só na abertura.
Depende de: — · Libera: 206
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: com teclado, Tab circula dentro do modal e Escape fecha.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 205 — Armadilha de foco em `VoiceSearchOverlay`
Onda / Severidade / Camada: 5 / Média / Acessibilidade
Achados resolvidos: ACH-077
Problema hoje: `VoiceSearchOverlay.tsx:219-220` é sobreposição modal sem armadilha de foco.
Causa raiz: idem 204.
Caminho recomendado: igual à etapa 204, com atenção a um detalhe: a busca por voz tem estado de "ouvindo", e o
Escape deve **parar a captura** antes de fechar, senão o microfone fica ativo.
Por que este caminho e não o óbvio: aplicar só o `useFocusTrap` e esquecer de parar a captura deixa o microfone
ligado depois de fechar.
Arquivos e objetos a tocar: `src/components/.../VoiceSearchOverlay.tsx`.
Não tocar / armadilhas: libere o recurso de áudio ao desmontar.
Depende de: — · Libera: 206
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: Escape fecha e o indicador de microfone desliga; Tab circula dentro da sobreposição.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 206 — Nome acessível nos 6 botões de ícone
Onda / Severidade / Camada: 5 / Baixa / Acessibilidade
Achados resolvidos: ACH-078
Problema hoje: 6 botões de ícone sem nome acessível: `BIAiCopilot.tsx:252`, `ClientSelector.tsx:127`,
`FavoritesClientPicker.tsx:81`, `NotificationDrawer.tsx:467` e `:505`, `SupplierComparisonModal.tsx:287` (o tooltip
gera `aria-describedby`, que **não** é nome).
Causa raiz: confiou-se no tooltip como nome acessível.
Caminho recomendado: acrescente `aria-label` nos seis. Mantenha o tooltip — ele continua útil como descrição.
Por que este caminho e não o óbvio: o óbvio é trocar o tooltip por `title`. `title` tem comportamento irregular
entre navegadores e leitores; `aria-label` é o que o repo já usa nos botões corretos.
Arquivos e objetos a tocar: os 5 arquivos listados.
Não tocar / armadilhas: `SupplierComparisonModal.tsx:287` é o mesmo botão da etapa 091 — se lá ele foi removido,
aqui não há nada a fazer; confira antes.
Depende de: 091 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: o repo tem verificação de acessibilidade (`.a11y/`); rode-a e confirme que os 6 saíram da lista.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 5.G — Adoção dos padrões de erro e timeout nas edge functions restantes (ACH-030, ACH-023)

<modelo_etapa>
Etapa 207 — Inventário de edge functions que não usam o helper de erro
Onda / Severidade / Camada: 5 / Média / Edge function
Achados resolvidos: ACH-030
Problema hoje: a adoção de `_shared/error-response.ts` é de **12 em 112** funções, e a política está escrita em
`:5` desse arquivo. As etapas 057–060 trataram as 5 de maior exposição; sobram ~95.
Causa raiz: política sem inventário e sem gate (o gate é a etapa 061).
Caminho recomendado: liste as funções que não importam o helper, classificando por exposição: `verify_jwt=false`
primeiro, depois as que tocam tabela de cliente, depois o resto. Entregue `docs/qa/edges-erro-padronizado.md`.
Por que este caminho e não o óbvio: converter 95 funções numa PR não é revisável; sem a classificação por exposição,
o esforço começa pelo lugar errado.
Arquivos e objetos a tocar: cria `docs/qa/edges-erro-padronizado.md`.
Não tocar / armadilhas: contagem correta é 111 em produção, não 112 (ACH-081).
Depende de: 061 · Libera: 208, 209, 210
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o documento lista as funções em três grupos de prioridade, com a contagem.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 208 — Adotar o helper de erro nas edges `verify_jwt=false` restantes
Onda / Severidade / Camada: 5 / Média / Edge function
Achados resolvidos: ACH-030
Problema hoje: há 36 funções `verify_jwt=false`; são as de maior exposição e a maioria ainda não usa o helper.
Causa raiz: idem 207.
Caminho recomendado: converta em lotes de 5 funções por PR, sempre o mesmo diff mecânico das etapas 057–060.
Priorize as 28 que tocam tabela (a lista está no inventário da etapa 207).
Por que este caminho e não o óbvio: lote de 5 mantém a PR revisável e a reversão cirúrgica.
Arquivos e objetos a tocar: 5 pastas de `supabase/functions/` por PR.
Não tocar / armadilhas: não altere autorização nem lógica — só o formato do erro.
Depende de: 207 · Libera: 209
Risco e como reverter: baixo. Reverter = `git revert` + redeploy.
Precisa de aprovação humana antes do merge: não
Como verificar: o gate da etapa 061 passa para cada lote; erro forçado devolve resposta padronizada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 209 — Adotar o helper de erro nas edges que tocam dado de cliente
Onda / Severidade / Camada: 5 / Média / Edge function
Achados resolvidos: ACH-030
Problema hoje: funções autenticadas que leem ou gravam `quotes`, `companies`, `orders` e arquivos de cliente ainda
devolvem erro cru.
Causa raiz: idem 207.
Caminho recomendado: mesmos lotes de 5 da etapa 208, agora no segundo grupo de prioridade do inventário.
Por que este caminho e não o óbvio: idem 208.
Arquivos e objetos a tocar: 5 pastas por PR.
Não tocar / armadilhas: idem 208.
Depende de: 208 · Libera: 210
Risco e como reverter: baixo. Reverter = `git revert` + redeploy.
Precisa de aprovação humana antes do merge: não
Como verificar: idem 208.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 210 — Adotar o helper de erro nas edges restantes
Onda / Severidade / Camada: 5 / Baixa / Edge function
Achados resolvidos: ACH-030
Problema hoje: o terceiro grupo do inventário (funções internas, de pipeline e de diagnóstico).
Causa raiz: idem 207.
Caminho recomendado: mesmos lotes de 5. Ao terminar, atualize o número de adoção no documento da etapa 207 — é a
métrica que diz se a política virou prática.
Por que este caminho e não o óbvio: idem 208.
Arquivos e objetos a tocar: 5 pastas por PR.
Não tocar / armadilhas: funções marcadas para remoção na etapa 169 **não** precisam ser convertidas; confira a lista.
Depende de: 169, 209 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert` + redeploy.
Precisa de aprovação humana antes do merge: não
Como verificar: a adoção registrada passa de 12/111 para o número final, com o gate verde.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 211 — Inventário de `fetch` sem timeout nas edge functions
Onda / Severidade / Camada: 5 / Média / Edge function
Achados resolvidos: ACH-023
Problema hoje: 5 locais foram confirmados (etapas 177–181). Com 111 funções, há chance de mais.
Causa raiz: `AbortSignal` é opcional e invisível em revisão.
Caminho recomendado: varra `supabase/functions/` por `fetch(` sem `signal` no mesmo escopo e liste em
`docs/qa/edges-fetch-sem-timeout.md`, separando chamada a terceiro (risco) de chamada ao próprio Supabase (o
cliente já tem timeout).
Por que este caminho e não o óbvio: `fetch` ao próprio Supabase não precisa do mesmo tratamento; misturar tudo gera
trabalho inútil.
Arquivos e objetos a tocar: cria `docs/qa/edges-fetch-sem-timeout.md`.
Não tocar / armadilhas: nenhuma correção nesta etapa.
Depende de: 178 · Libera: 212, 213
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o documento separa terceiro de interno, com arquivo:linha.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 212 — Aplicar timeout nos `fetch` a terceiro que o inventário achou
Onda / Severidade / Camada: 5 / Média / Edge function
Achados resolvidos: ACH-023
Problema hoje: ver 211.
Causa raiz: idem.
Caminho recomendado: lotes de 5 funções por PR, com o padrão de `generate-blurhashes:93`.
Por que este caminho e não o óbvio: idem 208 — lote pequeno.
Arquivos e objetos a tocar: 5 pastas por PR.
Não tocar / armadilhas: valor de timeout coerente com o terceiro; não use 1 s para API de IA.
Depende de: 211 · Libera: 213
Risco e como reverter: baixo. Reverter = `git revert` + redeploy.
Precisa de aprovação humana antes do merge: não
Como verificar: `grep -n "AbortSignal"` em cada função convertida; caminho feliz inalterado.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 213 — Gate que exige timeout em `fetch` a terceiro em edge function
Onda / Severidade / Camada: 5 / Média / CI
Achados resolvidos: ACH-023
Problema hoje: nada impede a próxima chamada sem timeout.
Causa raiz: sem gate.
Caminho recomendado: acrescente a verificação ao script da etapa 061 (que já olha os arquivos de
`supabase/functions/` tocados pela PR) em vez de criar outro script — um gate, duas regras.
Por que este caminho e não o óbvio: dois scripts para o mesmo diretório dobram o custo de manutenção do CI.
Arquivos e objetos a tocar: `scripts/check-edge-error-response.mjs` (estendido) + teste.
Não tocar / armadilhas: evite falso positivo com `fetch` ao próprio Supabase; use a separação da etapa 211.
Depende de: 061, 212 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (CI)
Como verificar: função de teste com `fetch` externo sem `signal` → gate falha.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 5.H — Estados de erro nas telas restantes (ACH-027, ACH-028)

<modelo_etapa>
Etapa 214 — Estado de erro nas telas de orçamento listadas no levantamento
Onda / Severidade / Camada: 5 / Média / Interface
Achados resolvidos: ACH-027
Problema hoje: a etapa 092 produz a lista de telas que consomem dados sem ler `isError`. As de `src/pages/quotes`
são as de maior impacto.
Causa raiz: padrão copiado de tela em tela.
Caminho recomendado: aplique o par erro/vazio das etapas 073/077 em cada tela da lista, uma PR por tela. Use sempre
os mesmos componentes, para o usuário ver a mesma coisa em qualquer lugar do sistema.
Por que este caminho e não o óbvio: uma PR por tela parece lento, mas cada tela tem um vazio legítimo diferente e
misturá-las impede a revisão.
Arquivos e objetos a tocar: as telas de `src/pages/quotes` listadas na etapa 092.
Não tocar / armadilhas: não mexa no estado vazio legítimo (cotação sem item é vazio, não erro).
Depende de: 092 · Libera: 215
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: por tela, com a query em erro no teste, o estado de erro aparece e o vazio não.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 215 — Estado de erro nas telas de kit-builder
Onda / Severidade / Camada: 5 / Média / Interface
Achados resolvidos: ACH-027
Problema hoje: idem 214, em `src/pages/kit-builder`.
Causa raiz: idem.
Caminho recomendado: idem 214. Atenção: o kit-builder é um wizard; trate o erro **por passo**, não derrubando o
wizard inteiro — os testes de `KitBuilderPage.test.tsx` (etapa 133) descrevem os passos e ajudam a entender a
estrutura.
Por que este caminho e não o óbvio: um erro global no wizard faz o usuário perder o que já montou.
Arquivos e objetos a tocar: as telas de `src/pages/kit-builder` listadas na etapa 092.
Não tocar / armadilhas: faça depois da etapa 133, com os testes do wizard verdes.
Depende de: 092, 133 · Libera: 216
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: erro num passo mostra o erro naquele passo; os outros passos continuam navegáveis.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 216 — Estado de erro nas telas de mockup e frete
Onda / Severidade / Camada: 5 / Média / Interface
Achados resolvidos: ACH-027
Problema hoje: idem 214, em `src/pages/mockups` e `src/pages/freight`.
Causa raiz: idem.
Caminho recomendado: idem 214.
Por que este caminho e não o óbvio: idem.
Arquivos e objetos a tocar: as telas listadas na etapa 092.
Não tocar / armadilhas: a geração de mockup é assíncrona e já tem estados próprios (`MockupResultCard.states`);
confira antes de acrescentar outro.
Depende de: 092 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: idem 214.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 5.I — Concorrência nos fluxos de escrita (cenários 2.4, 3.4 de `02-CENARIOS.md`)

<modelo_etapa>
Etapa 217 — Impedir envio duplicado de orçamento por duplo clique
Onda / Severidade / Camada: 5 / Média / Interface
Achados resolvidos: cenário 2.4 (RASTREADO, nunca executado)
Problema hoje: o cenário "duplo clique em Enviar" foi rastreado no código e **não** foi executado nesta auditoria
(escreveria em produção). Não há evidência de proteção nem de falha.
Causa raiz: desconhecida — esta etapa começa por determinar isso.
Caminho recomendado: primeiro **meça**: em ambiente de teste, clique duas vezes rápido em Enviar e veja se nascem
duas cotações. Se nascerem, a correção é desabilitar o botão enquanto a mutation está pendente (react-query expõe
`isPending`) **e** uma chave de idempotência no envio, porque botão desabilitado não cobre dois dispositivos. Se não
nascerem, registre a proteção existente no progresso e feche a etapa sem mudança.
Por que este caminho e não o óbvio: o óbvio é desabilitar o botão e considerar resolvido. Botão desabilitado não
resolve duas abas nem reenvio de requisição; e pode não haver problema algum — medir primeiro evita mudança inútil.
Arquivos e objetos a tocar: a tela de envio de orçamento e, se preciso, o serviço de criação.
Não tocar / armadilhas: nenhum teste em produção.
Depende de: — · Libera: 218
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: no ambiente de teste, dois cliques rápidos geram **uma** cotação; a evidência (contagem antes e
depois) vai no progresso.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 218 — Impedir aprovação duplicada de desconto
Onda / Severidade / Camada: 5 / Média / Interface
Achados resolvidos: cenário 3.4 (RASTREADO, nunca executado)
Problema hoje: o cenário "reenvio da mesma aprovação" não foi executado. Com as etapas 094–099, a transição passa a
ser validada no banco, o que já impede a segunda aprovação de mudar o estado — mas a tela pode gerar dois registros
de solicitação.
Causa raiz: a investigar.
Caminho recomendado: meça em ambiente de teste: aprovar duas vezes rápido gera dois registros em
`discount_approval_requests`? Se sim, acrescente restrição única (uma solicitação pendente por cotação) por
migration — a condição de unicidade no banco é mais confiável que o botão.
Por que este caminho e não o óbvio: o óbvio é confiar no trigger da etapa 094. Ele protege o status da cotação, não
a tabela de solicitações.
Arquivos e objetos a tocar: a tela de aprovação e, se preciso, nova migration com índice único parcial.
Não tocar / armadilhas: índice único parcial precisa considerar o estado (`pendente`), senão impede histórico.
Depende de: 094, 217 · Libera: —
Risco e como reverter: médio se criar índice. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim, se criar índice (DDL em produção)
Como verificar: duas aprovações rápidas geram um registro; o histórico de aprovações anteriores continua lá.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 219 — Medir e cobrir o cenário de duas abas no mesmo rascunho
Onda / Severidade / Camada: 5 / Média / Interface
Achados resolvidos: cenário 2.5 (RASTREADO, nunca executado)
Problema hoje: o rascunho é auto-salvo (Gate 1.5 proíbe botão "Salvar Alterações"), e o cenário de duas abas
editando o mesmo rascunho não foi executado. Com auto-save, a última escrita vence — e pode apagar item que a outra
aba acrescentou.
Causa raiz: auto-save sem controle de versão.
Caminho recomendado: meça em ambiente de teste com duas abas. Se houver perda, a saída é gravar uma versão
(`updated_at` comparado na escrita) e avisar o usuário de que o rascunho mudou em outro lugar, em vez de sobrescrever
calado. Evite bloquear a edição — o auto-save é decisão de produto registrada.
Por que este caminho e não o óbvio: o óbvio é bloquear a segunda aba. O vendedor usa duas abas para comparar
produtos; bloquear atrapalha o trabalho.
Arquivos e objetos a tocar: o hook de auto-save do builder de orçamento.
Não tocar / armadilhas: não reintroduza botão "Salvar Alterações" — contraria o Gate 1.5 do repo.
Depende de: — · Libera: —
Risco e como reverter: médio. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: com duas abas, a segunda avisa em vez de apagar; a evidência da medição vai no progresso.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 220 — Medir e cobrir o upload duplicado de arquivo de arte
Onda / Severidade / Camada: 5 / Baixa / Storage
Achados resolvidos: cenários de condição (reenvio), ACH-014
Problema hoje: nenhum cenário de upload foi executado nesta auditoria. Com `art-files` fechado pelas etapas 029–031,
o fluxo de upload passa a ser o único caminho — vale saber se um reenvio gera duas versões do mesmo arquivo.
Causa raiz: a investigar.
Caminho recomendado: meça em ambiente de teste: subir o mesmo arquivo duas vezes gera dois objetos? Se sim, decida
se é desejável (versionamento) ou não (lixo). Se não for, use `upsert` no caminho determinístico do objeto.
Por que este caminho e não o óbvio: o óbvio é bloquear nome repetido. Pode ser legítimo o cliente mandar a arte
corrigida com o mesmo nome.
Arquivos e objetos a tocar: o serviço de upload de arte.
Não tocar / armadilhas: se mudar para `upsert`, confirme que a policy de UPDATE do bucket permite ao dono
sobrescrever (etapa 031 mexeu nas policies).
Depende de: 031 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: o comportamento medido está registrado e corresponde à decisão tomada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 5.J — Cobertura de teste onde não existe (ACH-101, ACH-102)

<modelo_etapa>
Etapa 221 — Cobertura mínima de rota: proteção e papel
Onda / Severidade / Camada: 5 / Média / Testes
Achados resolvidos: ACH-101, ACH-079
Problema hoje: medido — `npx vitest run src/routes` dá 4 arquivos e **9 testes** para **141 rotas**. Nada afirma, em
teste, que cada rota está sob o guard que deveria.
Causa raiz: as rotas foram testadas por amostra.
Caminho recomendado: um teste orientado a dado: a partir da matriz corrigida nas etapas 155–156, afirme para cada
rota que, sem sessão, ela redireciona (se protegida) ou renderiza (se pública); e que rota de `DevRoute` nega papel
gestor comum. Um teste, 141 casos gerados — não 141 arquivos.
Por que este caminho e não o óbvio: o óbvio é escrever um teste por rota. Ninguém mantém 141 arquivos; teste gerado
da matriz se atualiza com ela.
Arquivos e objetos a tocar: novo teste em `src/routes/__tests__/`.
Não tocar / armadilhas: não use `rotas.json` como fonte (ACH-079, falso negativo de proteção).
Depende de: 155, 156 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste cobre as 141 rotas e passa; movendo uma rota para fora do guard localmente, ele falha.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 222 — Cobrir com teste os hooks do caminho do dinheiro que não têm nenhum
Onda / Severidade / Camada: 5 / Alta / Testes
Achados resolvidos: ACH-101
Problema hoje: o ACH-035 (comentário de kit) foi encontrado com **0 testes** cobrindo. O inventário gerado
(`docs/contexto/codigo/testes.json`) diz quais hooks têm e não têm teste.
Causa raiz: cobertura concentrada em algumas áreas.
Caminho recomendado: cruze `testes.json` com os hooks de `src/hooks/quotes`, `src/hooks/products`,
`src/hooks/freight` e `src/components/pricing`, liste os sem teste e escreva teste para os que **gravam** dado ou
calculam valor — leitura pura pode esperar. Entregue a lista em `docs/qa/hooks-sem-teste.md` e cubra em lotes.
Por que este caminho e não o óbvio: o óbvio é buscar porcentagem de cobertura. Porcentagem sobe cobrindo o que é
fácil; o que importa aqui é o que mexe em dinheiro.
Arquivos e objetos a tocar: cria `docs/qa/hooks-sem-teste.md` + testes novos, em lotes.
Não tocar / armadilhas: não suba o limite de cobertura do CI nesta etapa — isso travaria PRs alheias.
Depende de: 131 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: a lista existe e cada lote de testes novos passa.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 223 — Teste de sessão expirada no meio do fluxo de orçamento
Onda / Severidade / Camada: 5 / Média / Testes
Achados resolvidos: cenário 2.6 (RASTREADO)
Problema hoje: `ProtectedRoute.tsx:41-48` redireciona com `state.from`, o que foi rastreado mas não executado. Não há
teste do que acontece com o rascunho em andamento quando a sessão expira no meio.
Causa raiz: cenário sem cobertura.
Caminho recomendado: teste que expira a sessão com o builder aberto e afirma que (a) o usuário vai para `/auth`,
(b) ao voltar, cai no mesmo orçamento, e (c) o rascunho não perdeu item. Se (c) falhar, é achado novo — anote e não
corrija aqui.
Por que este caminho e não o óbvio: o óbvio é testar só o redirecionamento. O que dói para o vendedor é perder o
orçamento que estava montando.
Arquivos e objetos a tocar: novo teste.
Não tocar / armadilhas: não mexa em `ProtectedRoute`.
Depende de: — · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste passa; ou falha em (c) e o progresso registra o achado novo.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 224 — Teste de terceiro fora do ar no envio de webhook
Onda / Severidade / Camada: 5 / Média / Testes
Achados resolvidos: cenário 9.2, ACH-023
Problema hoje: com os timeouts das etapas 177–179, falta o teste que garante o comportamento quando o destino não
responde.
Causa raiz: cenário sem cobertura.
Caminho recomendado: teste Deno do `webhook-dispatcher` com um destino que não responde, afirmando que a entrega é
marcada como falha por timeout, que o `next_attempt_at` é reagendado dentro do clamp e que a função retorna em
segundos.
Por que este caminho e não o óbvio: o óbvio é testar só o caminho feliz do dispatcher. O caminho que custa dinheiro
é o do terceiro lento.
Arquivos e objetos a tocar: teste em `supabase/functions/webhook-dispatcher/`.
Não tocar / armadilhas: respeite o runner Deno do repo.
Depende de: 177, 179 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o teste passa; removendo o timeout localmente, ele falha por tempo.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 225 — Teste de RLS como especificação para as tabelas corrigidas na Onda 1
Onda / Severidade / Camada: 5 / Alta / Testes
Achados resolvidos: ACH-013, ACH-014, ACH-015, ACH-016, ACH-017
Problema hoje: a Onda 1 mexeu em policies de 6 tabelas e de 4 buckets. O repo tem `tests/rls/` e a edge
`rls-integration-tests`, mas as novas regras não estão cobertas.
Causa raiz: policy corrigida sem teste que a descreva.
Caminho recomendado: para cada correção da Onda 1, acrescente um caso em `tests/rls/` (que já roda no CI —
`ci.yml:164`): usuário A não lê dado de B; anônimo não lê PDF de cotação; autenticado comum não lê todo o bucket de
arte. O teste da etapa 019 já cobre as 6 tabelas; esta etapa cobre storage.
Por que este caminho e não o óbvio: o óbvio é confiar na migration. Policy é o tipo de código que ninguém relê e que
a próxima migration sobrescreve sem perceber.
Arquivos e objetos a tocar: `tests/rls/` (casos novos).
Não tocar / armadilhas: teste de storage precisa de objeto de teste; crie e remova no próprio teste, nunca em produção.
Depende de: 019, 030, 031, 032, 033 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: `npx vitest run tests/rls/` → exit 0 com os casos novos; revertendo uma das migrations localmente,
o caso correspondente falha.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 226 — Reconciliação da Onda 5
Onda / Severidade / Camada: 5 / Média / Verificação
Achados resolvidos: ACH-023, ACH-030, ACH-036, ACH-037, ACH-042, ACH-043, ACH-044
Problema hoje: a Onda 5 tocou timeouts, cache, corridas e realtime em dezenas de arquivos. Sem conferência, não há
como dizer que o conjunto está coerente.
Causa raiz: conjunto grande de correções independentes.
Caminho recomendado: rode `npm test` inteiro, o gate da etapa 199 (realtime), o gate da etapa 213 (timeout) e o da
061 (erro padronizado); registre os quatro resultados em `docs/qa/reconciliacao-onda5.md`, com a contagem de adoção
do helper de erro antes e depois.
Por que este caminho e não o óbvio: o óbvio é confiar nos testes de cada etapa. Os gates é que dizem se a mudança
pegou no repo inteiro, não só nos arquivos tocados.
Arquivos e objetos a tocar: cria `docs/qa/reconciliacao-onda5.md`.
Não tocar / armadilhas: se `npm test` estiver vermelho, não feche a etapa — volte às etapas 132–136.
Depende de: 061, 199, 213, 220 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o documento traz as quatro saídas e `npm test` com exit 0.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

---

# ONDA 6 · Performance (227–246)

<modelo_etapa>
Etapa 227 — Parar a listagem de produtos do admin de carregar duas vezes
Onda / Severidade / Camada: 6 / Média / Hooks
Achados resolvidos: ACH-053
Problema hoje: `useProductsManager.ts:313-316` e `:323-331` são dois efeitos que rodam no mount, e o debounce de
400 ms não tem o que cancelar — resultado: **duas listagens completas de produtos por abertura da tela**.
Causa raiz: um efeito de carga inicial e um de filtro, ambos disparando no mount.
Caminho recomendado: faça o efeito de filtro **não** rodar na primeira renderização (ref de "primeira passada"), ou
unifique os dois num só com dependência no objeto de filtro. A primeira opção é a menor mudança.
Por que este caminho e não o óbvio: o óbvio é aumentar o debounce. Aumentar atrasa a resposta ao filtro e continua
fazendo duas requisições.
Arquivos e objetos a tocar: `src/hooks/.../useProductsManager.ts`.
Não tocar / armadilhas: a tela de produtos do admin lista muitos registros; confirme que o filtro continua reagindo.
Depende de: — · Libera: 228
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: no devtools de rede, abrir a tela gera **uma** listagem; filtrar gera uma por filtro.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 228 — Varredura do padrão "dois efeitos no mount buscando o mesmo dado"
Onda / Severidade / Camada: 6 / Média / Hooks
Achados resolvidos: ACH-053
Problema hoje: o padrão foi confirmado num hook; com 645 hooks, há chance de mais, e cada caso é uma requisição
dobrada em produção.
Causa raiz: o padrão nasce ao acrescentar filtro a um hook que já carregava no mount.
Caminho recomendado: varra `src/hooks/` por arquivos com dois ou mais `useEffect` que chamem a mesma função de
busca, e entregue `docs/qa/cargas-duplicadas.md`. Priorize telas de listagem grande (produtos, cotações, estoque).
Por que este caminho e não o óbvio: medir pelo devtools tela a tela é mais lento e não deixa registro.
Arquivos e objetos a tocar: cria `docs/qa/cargas-duplicadas.md`.
Não tocar / armadilhas: hooks com react-query não têm esse problema (o cliente dedupe).
Depende de: 227 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o documento lista arquivo:linha e a tela afetada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 229 — Migrar `useQuoteTemplates` para react-query
Onda / Severidade / Camada: 6 / Média / Hooks
Achados resolvidos: ACH-052
Problema hoje: `/orcamentos/templates` roda as **mesmas 3 consultas 3 vezes**, porque há 3 instâncias de
`useQuoteTemplates` (página `:37`, lista `:83`, admin `:35`) e o hook é `useState` + `useEffect`, sem deduplicação.
Causa raiz: hook anterior à adoção do react-query nessa área.
Caminho recomendado: converta para `useQuery`, mantendo o formato de retorno (inclusive o `error` das etapas
078–079), para os três consumidores não mudarem. A deduplicação vem de graça: três componentes, uma requisição.
Por que este caminho e não o óbvio: o óbvio é subir o estado para a página e passar por props. Isso acopla os três
componentes e não resolve se outro lugar usar o hook.
Arquivos e objetos a tocar: `src/hooks/quotes/useQuoteTemplates.ts`.
Não tocar / armadilhas: não mude a assinatura; as etapas 078–079 dependem do campo `error`.
Depende de: 078, 079 · Libera: —
Risco e como reverter: médio. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: no devtools de rede, abrir `/orcamentos/templates` faz 3 requisições (uma por consulta), não 9.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 230 — Substituir o laço de INSERT de `GroupInheritance` por uma escrita em lote
Onda / Severidade / Camada: 6 / Média / Interface
Achados resolvidos: ACH-054
Problema hoje: `GroupInheritance.tsx:64-116` tem três laços aninhados fazendo **um INSERT por combinação** — o pior
dos três casos de N+1 de escrita.
Causa raiz: escrita implementada item a item.
Caminho recomendado: monte o array de linhas e faça **um** `insert` com a lista (o supabase-js aceita array). Se a
combinação puder ser grande, divida em lotes de algumas centenas. Trate o erro do lote inteiro, não por item.
Por que este caminho e não o óbvio: o óbvio é paralelizar com `Promise.all`. Isso troca lentidão por 300 conexões
simultâneas — o banco tem `max_connections = 90` (medido).
Arquivos e objetos a tocar: `src/components/admin/GroupInheritance.tsx`.
Não tocar / armadilhas: `max_connections = 90` no projeto — nunca paralelize escrita sem limite.
Depende de: — · Libera: 231, 232
Risco e como reverter: médio (muda escrita de permissão). Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: salvar herança de grupo faz 1 requisição (ou poucos lotes) em vez de dezenas; o resultado no banco é
o mesmo de antes.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 231 — Escrita em lote em `RolePermissionsPage`
Onda / Severidade / Camada: 6 / Média / Interface
Achados resolvidos: ACH-054
Problema hoje: `RolePermissionsPage.tsx:142-172` grava permissões uma a uma.
Causa raiz: idem 230.
Caminho recomendado: igual à etapa 230. Como a etapa 085 já mexeu nesta tela (estado vindo da query), faça depois
dela para não conflitar.
Por que este caminho e não o óbvio: idem 230.
Arquivos e objetos a tocar: `src/pages/admin/RolePermissionsPage.tsx`.
Não tocar / armadilhas: a invalidação da etapa 084 precisa continuar acontecendo depois do lote.
Depende de: 084, 085, 230 · Libera: 232
Risco e como reverter: médio. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: salvar o conjunto de permissões faz 1 requisição; as permissões no banco batem com a tela.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 232 — Escrita em lote em `ProductPersonalizationManager`
Onda / Severidade / Camada: 6 / Baixa / Interface
Achados resolvidos: ACH-054, ACH-073
Problema hoje: `ProductPersonalizationManager.tsx:177-183` grava item a item. **Atenção:** este componente consta
como órfão no ACH-073 (790 linhas, 0 imports) — o maior dos 17.
Causa raiz: idem 230.
Caminho recomendado: antes de otimizar, confirme por grep se o componente é renderizado. Se for órfão de verdade, a
etapa certa é a 275 (remoção) e esta deve ser anotada como "não aplicável". Se for usado, aplique o lote da etapa 230.
Por que este caminho e não o óbvio: otimizar código morto é trabalho jogado fora — e dá a impressão de que a tela
existe.
Arquivos e objetos a tocar: `src/components/admin/ProductPersonalizationManager.tsx` (ou nada).
Não tocar / armadilhas: há dois arquivos com nomes parecidos (ACH-073 fala de nomes duplicados que sombreiam) —
confirme o caminho exato do import.
Depende de: 230 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: a decisão (otimizar ou declarar órfão) está registrada com o resultado do grep.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 233 — Índice para `business_calendar.created_by`
Onda / Severidade / Camada: 6 / Baixa / Banco
Achados resolvidos: ACH-103
Problema hoje: o lint `fk_without_index` aponta `business_calendar_created_by_fkey` sem índice na coluna
`created_by` — join e `DELETE`/`UPDATE` na tabela pai fazem varredura.
Causa raiz: FK criada sem o índice correspondente.
Caminho recomendado: migration com `CREATE INDEX` na coluna. Use `CONCURRENTLY`? **Não** — o repo tem um gate (E15)
que rejeita `CONCURRENTLY` porque não é transacional e conflita com `psql -1` (foi a causa de 2 falhas de workflow em
2026-11-22). A tabela tem 26 linhas; índice comum é instantâneo.
Por que este caminho e não o óbvio: `CONCURRENTLY` é o reflexo correto em tabela grande e aqui **quebra o pipeline**
de migration do repo. Esta é a armadilha específica deste projeto.
Arquivos e objetos a tocar: nova migration; rollback com `DROP INDEX`.
Não tocar / armadilhas: nunca escreva `CONCURRENTLY` em migration neste repo.
Depende de: — · Libera: 234
Risco e como reverter: baixo. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: o índice aparece em `pg_indexes`; o lint `fk_without_index` deixa de citar a tabela.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 234 — Índice para `freight_settings.updated_by`
Onda / Severidade / Camada: 6 / Baixa / Banco
Achados resolvidos: ACH-103
Problema hoje: mesmo lint, em `freight_settings_updated_by_fkey` (coluna `updated_by`). A tabela tem 1 linha.
Causa raiz: idem 233.
Caminho recomendado: idem 233, na mesma forma. Pode ir na mesma PR da etapa 233 — são duas linhas de DDL do mesmo
tipo, e juntar aqui não prejudica a reversão.
Por que este caminho e não o óbvio: idem 233, inclusive a proibição de `CONCURRENTLY`.
Arquivos e objetos a tocar: a mesma migration da etapa 233 ou uma nova; rollback.
Não tocar / armadilhas: idem 233.
Depende de: 233 · Libera: —
Risco e como reverter: baixo. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: o lint deixa de citar `freight_settings`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 235 — Envolver `auth.uid()` em subselect nas 6 policies de `orders` e `order_items`
Onda / Severidade / Camada: 6 / Baixa / Banco
Achados resolvidos: ACH-103
Problema hoje: o lint `policy_auth_fn_not_wrapped` aponta `orders_insert`, `orders_select`, `orders_update`,
`order_items_insert`, `order_items_select` e `order_items_update`: a chamada a `auth.uid()`/`auth.jwt()` é reavaliada
**por linha** em vez de uma vez.
Causa raiz: policies escritas sem o subselect que o Postgres usa para avaliar a função uma só vez.
Caminho recomendado: migration que recria as 6 policies trocando `auth.uid()` por `(select auth.uid())`, **sem
mudar nenhuma outra parte da condição**. Copie a condição atual de `pg_policies` e altere só isso — é a mudança de
desempenho que não altera semântica.
Por que este caminho e não o óbvio: o óbvio é "melhorar" a condição enquanto mexe. Qualquer outra alteração aqui
muda quem vê pedido, e pedido é dado de cliente.
Arquivos e objetos a tocar: nova migration; as 6 policies; rollback.
Não tocar / armadilhas: `orders` não é escrito pelo app por decisão de produto documentada (PR #99); o status
`converted` vem das edges de callback do CRM. Não mexa na lógica — só no subselect.
Depende de: — · Libera: 236
Risco e como reverter: baixo. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: o lint deixa de citar as 6; e um `select` em `orders` como usuário comum devolve exatamente as mesmas
linhas de antes (compare a contagem).
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 236 — Envolver `auth.uid()` em subselect na policy de upload de mockup
Onda / Severidade / Camada: 6 / Baixa / Banco
Achados resolvidos: ACH-103
Problema hoje: a policy `storage.objects."Users can upload their own mockup assets"` tem o mesmo problema.
Causa raiz: idem 235.
Caminho recomendado: idem 235, em policy de storage.
Por que este caminho e não o óbvio: idem 235.
Arquivos e objetos a tocar: nova migration; a policy; rollback.
Não tocar / armadilhas: a etapa 034 mexe na policy de **leitura** do bucket `mockup-assets`; esta é a de **upload**.
Não confunda nem junte as duas.
Depende de: 034, 235 · Libera: —
Risco e como reverter: baixo. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: o lint deixa de citar a policy; o upload de mockup continua funcionando para o dono.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 237 — Mover `pg_repack` e `pgstattuple` para o schema `extensions`
Onda / Severidade / Camada: 6 / Baixa / Banco
Achados resolvidos: ACH-103
Problema hoje: duas extensões instaladas em `public`, contra a recomendação (schema `extensions`).
Causa raiz: instalação feita sem schema explícito.
Caminho recomendado: migration com `ALTER EXTENSION ... SET SCHEMA extensions`. **Antes**, confirme que nada
referencia as funções delas com nome não qualificado (`grep -rn "pg_repack\|pgstattuple" supabase/ src/`) — mover
quebra chamada sem schema.
Por que este caminho e não o óbvio: o óbvio é `DROP` e recriar no schema certo. `pg_repack` tem objetos próprios; o
`SET SCHEMA` preserva.
Arquivos e objetos a tocar: nova migration; rollback (volta o schema).
Não tocar / armadilhas: se alguma rotina de manutenção chamar `pgstattuple(...)` sem schema, ela quebra — o grep é o
que previne.
Depende de: — · Libera: —
Risco e como reverter: médio. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: `select extnamespace::regnamespace from pg_extension where extname in ('pg_repack','pgstattuple')`
→ `extensions`; nenhuma rotina de manutenção falha nas 24 h seguintes.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 238 — Paginação obrigatória no consumo de `stock_daily_summary`
Onda / Severidade / Camada: 6 / Média / Front + banco
Achados resolvidos: ACH-056
Problema hoje: a tabela tem 3.270.690 linhas e ~1,1 GB (medido) e a policy de leitura era `USING (true)` para
qualquer conta logada. A etapa 046 restringe quem lê; esta trata **quanto** se lê de uma vez.
Causa raiz: consulta de histórico sem limite imposto pelo servidor.
Caminho recomendado: veja como o front consulta (`grep -rn "stock_daily_summary" src/`) e garanta `range()`/`limit()`
em todos os pontos. No banco, confirme o `max_rows` do PostgREST em `project-config` — se estiver alto, o limite do
servidor é a rede de segurança que não depende do front.
Por que este caminho e não o óbvio: o óbvio é só pôr `limit()` no front. Qualquer cliente com a chave ignora o front.
Arquivos e objetos a tocar: os hooks que consultam a tabela; eventualmente configuração de `max_rows` (painel).
Não tocar / armadilhas: o gráfico de histórico de estoque precisa de série contínua; paginar sem ordenar
deterministicamente produz gráfico errado — ordene por data.
Depende de: 046 · Libera: 239, 240
Risco e como reverter: médio (pode cortar série do gráfico). Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: a consulta mais pesada da tela de estoque passa a trazer no máximo o limite definido, e o gráfico
continua correto para o período exibido.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 239 — Limite nas leituras de `xbz_upload_mapping` e `product_properties`
Onda / Severidade / Camada: 6 / Baixa / Front
Achados resolvidos: ACH-056
Problema hoje: 42.015 e 34.177 linhas (medido), com policy de leitura aberta a qualquer conta logada antes da
etapa 047.
Causa raiz: idem 238.
Caminho recomendado: idem 238, nos pontos de consulta dessas duas tabelas. `scripts/check-select-columns.mjs` já
passou (exit 0, medido), então o problema não é coluna — é volume de linha.
Por que este caminho e não o óbvio: idem 238.
Arquivos e objetos a tocar: os hooks/telas que consultam as duas tabelas.
Não tocar / armadilhas: `product_properties` pode alimentar a ficha de produto; limite sem paginação esconderia
propriedade do produto.
Depende de: 047, 238 · Libera: 240
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: as consultas passam a ter limite; as telas mostram o mesmo conteúdo.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 240 — Índices de apoio para as consultas de histórico de estoque
Onda / Severidade / Camada: 6 / Média / Banco
Achados resolvidos: ACH-056
Problema hoje: com a paginação da etapa 238, as consultas passam a filtrar por produto e ordenar por data; sem
índice adequado, cada página faz varredura em 3,2 milhões de linhas.
Causa raiz: índice pensado para a carga, não para a leitura paginada.
Caminho recomendado: rode `EXPLAIN` (leitura) nas consultas reais que a etapa 238 definiu e crie índice **só** para
o que o plano mostrar como varredura. Nada de índice especulativo: o banco já tem 1.355 índices. Sem `CONCURRENTLY`
(ver etapa 233).
Por que este caminho e não o óbvio: o óbvio é criar índice composto por intuição. Índice a mais custa escrita em
tabela que recebe carga diária.
Arquivos e objetos a tocar: nova migration; rollback.
Não tocar / armadilhas: confirme com `EXPLAIN` antes e depois; anexe os dois planos na PR.
Depende de: 238 · Libera: 241
Risco e como reverter: baixo (índice se descarta). Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: `EXPLAIN` da consulta paginada deixa de mostrar varredura completa; cole os dois planos.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 241 — Levantar índices sem uso e consultas custosas antes de criar mais índice
Onda / Severidade / Camada: 6 / Média / Banco
Achados resolvidos: ACH-056, ACH-103
Problema hoje: o banco tem 1.355 índices e o snapshot de contexto (`docs/contexto/supabase/stats.md`) publica
índices sem uso e consultas custosas — nunca foi usado para decidir o que remover.
Causa raiz: métrica coletada e não lida.
Caminho recomendado: leia `stats.md` do snapshot (ou consulte `pg_stat_user_indexes` direto, que é a fonte) e
entregue `docs/qa/indices-sem-uso.md` com: índices com zero leitura desde o último reset, tamanho de cada um, e as
consultas mais custosas. **Não remova nada** — remoção de índice é decisão com risco e vai a etapa separada, depois
de o dono ver o tamanho que se recupera.
Por que este caminho e não o óbvio: o óbvio é remover os de zero leitura. "Zero leitura" pode ser desde o último
restart; e índice único sustenta constraint.
Arquivos e objetos a tocar: cria `docs/qa/indices-sem-uso.md`.
Não tocar / armadilhas: nunca remova índice que sustenta `UNIQUE` ou chave primária.
Depende de: 240 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o documento traz a consulta, a lista com tamanho e a janela de coleta (desde quando a estatística
está acumulando).
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 242 — Pôr os gates de tamanho de bundle e ciclo de chunk no caminho que bloqueia
Onda / Severidade / Camada: 6 / Média / CI
Achados resolvidos: ACH-007, ACH-102
Problema hoje: o repo tem `check:bundle-size`, `check:bundle-size:ratchet` e `check:chunk-cycles` (em
`package.json`), e `check-chunk-cycles` roda dentro do `npm run build`. Mas, como em ACH-007, é preciso confirmar se
o resultado chega ao `Gate Final - Deploy Ready`.
Causa raiz: gate existente fora do caminho que bloqueia.
Caminho recomendado: verifique em `deploy-gates.yml` se o job `build` (que está no `needs:` do `deploy-ready`) roda
`npm run build` completo — se roda, `check-chunk-cycles` já bloqueia e não há nada a fazer além de registrar isso. O
de **tamanho** de bundle provavelmente não está; acrescente o ratchet ao mesmo job.
Por que este caminho e não o óbvio: o óbvio é criar um job novo de performance. Gate novo precisa entrar no `needs:`
e o repo já errou isso três vezes (ACH-006, ACH-007, ACH-102).
Arquivos e objetos a tocar: `.github/workflows/deploy-gates.yml`.
Não tocar / armadilhas: o ratchet de bundle falha quando o tamanho cresce — confirme que o baseline está atual antes
de ligar, senão trava PRs legítimas.
Depende de: — · Libera: —
Risco e como reverter: médio. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (workflow)
Como verificar: uma PR que aumente o bundle acima do ratchet fica bloqueada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 243 — Conferir o `statement_timeout` por papel
Onda / Severidade / Camada: 6 / Média / Banco
Achados resolvidos: ACH-056
Problema hoje: o `statement_timeout` global é 90.000 ms e `max_connections` é 90 (medidos). Uma consulta de 90 s
feita por conta comum ocupa uma conexão de 90 por um minuto e meio.
Causa raiz: timeout global generoso, sem recorte por papel.
Caminho recomendado: leia os timeouts por papel em `docs/contexto/supabase/roles.md` e proponha, com o dono, um
`statement_timeout` menor para `anon` e `authenticated` (dezenas de segundos), mantendo o generoso para
`service_role` e para os jobs. É `ALTER ROLE ... SET statement_timeout` — DDL, então nasce como migration.
Por que este caminho e não o óbvio: o óbvio é baixar o global. Isso mataria cron e pipeline de ingestão, que
legitimamente demoram.
Arquivos e objetos a tocar: nova migration; rollback.
Não tocar / armadilhas: não baixe para `service_role` nem para os papéis usados por `cron`.
Depende de: — · Libera: —
Risco e como reverter: médio (consulta legítima longa passa a ser cortada). Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL + mudança de comportamento em produção)
Como verificar: `select rolname, rolconfig from pg_roles where rolname in ('anon','authenticated')` mostra o novo
valor; as telas principais continuam carregando.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 244 — Conferir o plano da busca pública `fn_super_filtro`
Onda / Severidade / Camada: 6 / Média / Banco
Achados resolvidos: ACH-057
Problema hoje: `fn_super_filtro` é a busca da vitrine, é `SECURITY DEFINER`, é chamável por `anon` (medido nos
advisors) e recebe 20 parâmetros de filtro. É o caminho de maior volume do sistema e nunca foi medido nesta auditoria.
Causa raiz: lacuna — a auditoria não mediu desempenho de consulta.
Caminho recomendado: rode `EXPLAIN (ANALYZE, BUFFERS)` — **só leitura** — para 3 combinações de filtro realistas
(busca por texto; categoria + faixa de preço; só estoque) e registre em `docs/qa/plano-super-filtro.md`. Só proponha
índice se o plano mostrar varredura; não crie índice nesta etapa.
Por que este caminho e não o óbvio: o óbvio é criar índice para cada filtro possível. São 20 parâmetros; índice para
todos é mais custo de escrita que ganho de leitura.
Arquivos e objetos a tocar: cria `docs/qa/plano-super-filtro.md`.
Não tocar / armadilhas: `EXPLAIN ANALYZE` executa a consulta — é leitura, mas pode ser pesada; rode fora do horário
de pico e com `LIMIT` nos parâmetros.
Depende de: — · Libera: —
Risco e como reverter: zero (leitura).
Precisa de aprovação humana antes do merge: não
Como verificar: o documento traz os três planos, com tempo e buffers.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 245 — Medir requisições por tela nas três telas mais usadas
Onda / Severidade / Camada: 6 / Média / Verificação
Achados resolvidos: ACH-052, ACH-053, ACH-037
Problema hoje: três casos de requisição repetida foram confirmados (`/orcamentos/templates` 3×, listagem de produtos
do admin 2×, contagem de aprovações com 3 observers). Não se sabe o total por tela.
Causa raiz: nunca foi medido.
Caminho recomendado: com o Playwright que já existe no repo, abra `/`, `/produtos` e `/orcamentos` e conte as
requisições de rede por tela, antes e depois das etapas 227–231. Registre em `docs/qa/requisicoes-por-tela.md`. Esse
número é a métrica que diz se a Onda 6 funcionou.
Por que este caminho e não o óbvio: o óbvio é confiar nas correções pontuais. Sem o número total, não se sabe se
sobraram outras repetições.
Arquivos e objetos a tocar: cria `docs/qa/requisicoes-por-tela.md`; eventualmente um script em `scripts/qa/`.
Não tocar / armadilhas: rode contra ambiente de teste ou preview, não contra produção com conta real.
Depende de: 227, 229, 188 · Libera: 246
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o documento traz a contagem antes e depois por tela.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 246 — Reconciliação da Onda 6
Onda / Severidade / Camada: 6 / Baixa / Verificação
Achados resolvidos: ACH-052, ACH-053, ACH-054, ACH-056, ACH-103
Problema hoje: a Onda 6 mexeu em front, em policies e em índices; os efeitos só aparecem juntos.
Causa raiz: conjunto de correções de desempenho.
Caminho recomendado: junte num só documento (`docs/qa/reconciliacao-onda6.md`): a contagem de requisições por tela
(etapa 245), os lints do banco que saíram da lista (233–237), e o resultado de `get_advisors(performance)` antes e
depois.
Por que este caminho e não o óbvio: o óbvio é declarar a onda concluída pelas etapas marcadas. Desempenho se afirma
com número antes e depois.
Arquivos e objetos a tocar: cria `docs/qa/reconciliacao-onda6.md`.
Não tocar / armadilhas: `get_advisors(performance)` não foi coletado nesta auditoria — a primeira coleta é a sua
linha de base; diga isso no documento.
Depende de: 233, 234, 235, 236, 237, 245 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o documento traz os três conjuntos de números.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

---

# ONDA 7 · Experiência de uso e consistência (247–268)

<modelo_etapa>
Etapa 247 — Componente único de estado de erro de carga
Onda / Severidade / Camada: 7 / Média / Interface
Achados resolvidos: ACH-027, ACH-028, ACH-029
Problema hoje: as etapas 073, 074, 077, 214, 215 e 216 acrescentaram estado de erro em muitas telas. Sem um
componente único, cada tela terá o seu e o usuário verá seis telas de erro diferentes.
Causa raiz: o repo tem `EmptyState` (`src/components/common/EmptyState.tsx`) e `EnhancedErrorBoundary`, mas não um
componente de "falhou ao carregar, tentar de novo".
Caminho recomendado: extraia o que as etapas anteriores escreveram num componente só (nome no padrão do repo, ao
lado de `EmptyState`), com texto, ícone e ação de tentar de novo, e troque as ocorrências. Faça **depois** das
telas, não antes: o componente nasce do uso real, não da suposição.
Por que este caminho e não o óbvio: o óbvio é criar o componente primeiro e mandar as telas usarem. Sem ver os seis
casos reais, o componente não cobre o que precisa (erro por seção, erro em wizard, erro com CTA escondido).
Arquivos e objetos a tocar: novo componente em `src/components/common/`; as telas das etapas 073–216.
Não tocar / armadilhas: não unifique com `EmptyState` — vazio e erro precisam continuar visualmente distintos; foi
a confusão entre os dois que gerou o grupo 9.
Depende de: 073, 074, 077, 214, 215, 216 · Libera: 248, 251
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: as telas corrigidas usam o mesmo componente; a aparência do erro é igual em todas.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 248 — Revisar os estados vazios para não induzirem ação errada
Onda / Severidade / Camada: 7 / Média / Interface
Achados resolvidos: ACH-028
Problema hoje: o caso de coleções mostrou que estado vazio com CTA pode induzir o usuário a recriar algo que já
existe. Outras telas podem ter o mesmo risco.
Causa raiz: o CTA do vazio foi pensado só para o caso "primeira vez".
Caminho recomendado: para cada tela que usa `EmptyState` com ação, confira se a ação é segura quando o vazio pode
ser engano. Onde não for, esconda o CTA no erro (como na etapa 077) e mantenha no vazio real.
Por que este caminho e não o óbvio: o óbvio é remover os CTAs dos vazios. O CTA no vazio verdadeiro é bom — é o que
ensina o usuário a começar.
Arquivos e objetos a tocar: as telas que usam `EmptyState` com `action`.
Não tocar / armadilhas: não altere `EmptyState` em si.
Depende de: 247 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: lista das telas revisadas no PR, com a decisão por tela.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 249 — Mensagem única para falha de rede
Onda / Severidade / Camada: 7 / Baixa / Interface
Achados resolvidos: ACH-027, ACH-030
Problema hoje: com o helper de erro padronizado nas edges (etapas 057–210) e os estados de erro no front, falta
alinhar o **texto**: o usuário precisa ver a mesma frase para a mesma situação.
Causa raiz: cada tela escreveu o seu texto.
Caminho recomendado: centralize as mensagens de falha (rede, permissão, não encontrado, erro inesperado) num módulo
de textos, e faça o componente da etapa 247 consumi-lo. O repo tem política de idioma
(`docs/POLITICA_IDIOMA_PT_BR.md`) — siga-a.
Por que este caminho e não o óbvio: o óbvio é revisar os textos um a um. Sem centralizar, o próximo texto novo
divergirá.
Arquivos e objetos a tocar: novo módulo de textos; o componente da etapa 247.
Não tocar / armadilhas: não troque mensagem de negócio (ex.: "mínimo do fornecedor: N") por mensagem genérica.
Depende de: 247 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: as quatro situações mostram a mesma frase em qualquer tela.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 250 — Conferir os outros contadores do menu pelo mesmo padrão do badge quebrado
Onda / Severidade / Camada: 7 / Média / Interface
Achados resolvidos: ACH-047
Problema hoje: o badge de aprovações nunca aparecia porque a comparação era por URL com query string
(`SidebarReorganized.tsx:482`). Outros itens do menu podem ter contador com o mesmo tipo de comparação.
Causa raiz: correspondência de item por string de URL.
Caminho recomendado: revise todos os pontos de `SidebarReorganized.tsx` que comparam `href` para decidir badge ou
estado ativo, e troque por identificador do item (o mesmo padrão adotado na etapa 089).
Por que este caminho e não o óbvio: o óbvio é corrigir só o caso achado. A comparação por URL é o defeito; onde ela
aparecer de novo, o mesmo bug nasce.
Arquivos e objetos a tocar: `src/components/layout/SidebarReorganized.tsx`.
Não tocar / armadilhas: o estado "ativo" do item do menu também usa comparação de URL — mexer nele muda o destaque
visual; teste a navegação depois.
Depende de: 089 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: todos os badges do menu aparecem quando há pendência; o item ativo continua destacado corretamente.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 251 — Registrar o padrão de estados no documento de estrutura de página
Onda / Severidade / Camada: 7 / Baixa / Documentação
Achados resolvidos: ACH-027, ACH-028
Problema hoje: o repo tem `docs/PAGE_STRUCTURE_STANDARD.md` e o padrão "carregando / erro / vazio / conteúdo" não
está registrado lá — por isso cada tela resolveu sozinha.
Causa raiz: padrão existente na prática, ausente da documentação.
Caminho recomendado: acrescente ao documento a seção dos quatro estados, com o nome dos componentes (o da etapa 247
e o `EmptyState`), a regra de que erro e vazio **não** se confundem e o caso do CTA escondido no erro. Cite duas
telas como exemplo.
Por que este caminho e não o óbvio: o óbvio é confiar no componente. Documento é o que faz o próximo agente achar o
componente antes de escrever o seu.
Arquivos e objetos a tocar: `docs/PAGE_STRUCTURE_STANDARD.md`.
Não tocar / armadilhas: PR docs-only; não misture código.
Depende de: 247 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o documento descreve os quatro estados e nomeia os componentes.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 252 — Rodar a verificação de acessibilidade no resto do front
Onda / Severidade / Camada: 7 / Média / Acessibilidade
Achados resolvidos: ACH-078, ACH-077
Problema hoje: a auditoria achou 6 botões de ícone sem nome e 2 modais sem armadilha de foco. O repo tem a pasta
`.a11y/` e `docs/ACCESSIBILITY.md`, então existe ferramenta — nunca foi rodada sobre o conjunto nesta auditoria.
Causa raiz: verificação pontual.
Caminho recomendado: rode a verificação de acessibilidade do repo (descubra o comando lendo `.a11y/` e
`docs/ACCESSIBILITY.md`) sobre as telas principais e entregue `docs/qa/a11y-achados.md` com a lista. Corrija em
lotes, no modelo da etapa 206, começando pelo que impede uso por teclado.
Por que este caminho e não o óbvio: o óbvio é corrigir o que a auditoria achou e parar. A verificação automática
acha dezenas em minutos.
Arquivos e objetos a tocar: cria `docs/qa/a11y-achados.md`.
Não tocar / armadilhas: não suba o rigor da verificação no CI nesta etapa — travaria PRs alheias.
Depende de: 206 · Libera: 253
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o documento traz a saída da ferramenta e a lista priorizada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 253 — Gate que exige armadilha de foco em modal próprio
Onda / Severidade / Camada: 7 / Baixa / CI
Achados resolvidos: ACH-077
Problema hoje: dois modais foram construídos à mão sem foco nem Escape, enquanto o repo tem `useFocusTrap` e um
`Dialog` padrão com harness visual.
Causa raiz: nada impede construir modal à mão.
Caminho recomendado: regra simples e de pouco falso positivo: falhar quando um componente usa posicionamento de
sobreposição em tela cheia (`fixed inset-0` com `z-index` alto) e **não** importa `useFocusTrap` nem o `Dialog` do
repo. Pendure no `Static checks`.
Por que este caminho e não o óbvio: o óbvio é proibir modal fora do `Dialog`. Há casos legítimos (tour guiado,
sobreposição de voz) — o que não é legítimo é ficar sem foco.
Arquivos e objetos a tocar: novo script em `scripts/` + teste; workflow do `Static checks`.
Não tocar / armadilhas: calibre a regra nos arquivos atuais antes de ligar; se der muitos falsos positivos, registre
e proponha uma regra mais estreita em vez de forçar.
Depende de: 204, 205, 252 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (CI)
Como verificar: componente de teste com sobreposição sem foco → gate falha; com `useFocusTrap` → passa.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 254 — Componente único de rótulo "dado simulado"
Onda / Severidade / Camada: 7 / Média / Interface
Achados resolvidos: ACH-050, ACH-051
Problema hoje: o rótulo existe em `IndustryTrendingProducts.tsx:124` e em `StockHistoryChart.tsx:127`, com
implementações próprias, e faltava em `ClientHealthHero.tsx` (etapa 158).
Causa raiz: cada componente fez o seu selo.
Caminho recomendado: extraia um componente único de selo "dado simulado" e troque as ocorrências. É o que a etapa
160 vai exigir como contrato.
Por que este caminho e não o óbvio: o óbvio é copiar o selo para o terceiro lugar. Três cópias divergem; e o selo
precisa ser reconhecível — se cada tela mostra diferente, o usuário não aprende a confiar nele.
Arquivos e objetos a tocar: novo componente; `IndustryTrendingProducts.tsx`, `StockHistoryChart.tsx`,
`ClientHealthHero.tsx`.
Não tocar / armadilhas: não mude a lógica de `isMock` dos hooks.
Depende de: 158 · Libera: 255, 256, 160
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: os três lugares mostram o mesmo selo.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 255 — Aplicar o selo de dado simulado — primeiro lote
Onda / Severidade / Camada: 7 / Média / Interface
Achados resolvidos: ACH-050
Problema hoje: a etapa 159 produz a lista de componentes de BI que consomem dado simulado sem rótulo.
Causa raiz: idem 158.
Caminho recomendado: aplique o componente da etapa 254 na primeira metade da lista, priorizando o que o vendedor
mostra ao cliente (recomendação de produto, tendência de setor).
Por que este caminho e não o óbvio: idem — o que importa é a ordem: primeiro o que sai da empresa.
Arquivos e objetos a tocar: os componentes do primeiro lote.
Não tocar / armadilhas: não rotule componente que usa dado real.
Depende de: 159, 254 · Libera: 256
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: cada componente do lote mostra o selo quando `isMock`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 256 — Aplicar o selo de dado simulado — segundo lote
Onda / Severidade / Camada: 7 / Baixa / Interface
Achados resolvidos: ACH-050
Problema hoje: o resto da lista da etapa 159.
Causa raiz: idem.
Caminho recomendado: idem 255, na segunda metade. Ao terminar, a etapa 160 (contrato que obriga o rótulo) pode ser
aplicada sem quebrar nada.
Por que este caminho e não o óbvio: idem.
Arquivos e objetos a tocar: os componentes do segundo lote.
Não tocar / armadilhas: idem 255.
Depende de: 255 · Libera: 160
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: a lista da etapa 159 fica sem nenhum item "não rotula".
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 257 — Mesma formatação de moeda no aplicativo e no PDF
Onda / Severidade / Camada: 7 / Média / Interface
Achados resolvidos: ACH-091
Problema hoje: a divergência de centavo entre linhas e subtotal (ACH-091) ficou visível porque o PDF e a tela
mostram o mesmo valor de formas diferentes. Com as etapas 105–107, o número passa a ser único; a formatação precisa
acompanhar.
Causa raiz: formatação de moeda implementada em mais de um lugar.
Caminho recomendado: use o utilitário de formatação que o repo já tem (há `tests/unit/format.test.ts` e
`format-utils.test.ts`, então o utilitário existe) no gerador de PDF, em vez da formatação local. O repo tem
configuração de locale pt-BR (`docs/CONFIGURACAO_LOCALE_PT_BR.md`) — siga-a.
Por que este caminho e não o óbvio: o óbvio é ajustar as casas decimais no PDF até parecer igual. O utilitário já
trata separador, símbolo e arredondamento de exibição.
Arquivos e objetos a tocar: `src/components/pdf/` e, se preciso, o utilitário de formatação.
Não tocar / armadilhas: formatação de exibição **não** é arredondamento de cálculo — não use o utilitário para
calcular.
Depende de: 106 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: o mesmo valor aparece idêntico na tela e no PDF, inclusive separador e símbolo.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 258 — Alinhar as dicas de status de cotação ao mapa de transições corrigido
Onda / Severidade / Camada: 7 / Baixa / Interface
Achados resolvidos: ACH-086, ACH-087
Problema hoje: o repo tem `docs/QUOTES_STATUS_TOOLTIPS.md` descrevendo o que cada status significa na interface. As
etapas 094 e 100 mudam o que é possível (transições validadas no banco e eventual ajuste do mapa) — as dicas podem
passar a prometer o que não acontece mais.
Causa raiz: texto de interface acoplado a regra que mudou.
Caminho recomendado: releia o documento e as dicas na tela depois das etapas 094 e 100, e ajuste só o que ficou
incorreto. Se o mapa ganhou `pending → pending_approval` (decisão da etapa 100), a dica correspondente precisa dizer isso.
Por que este caminho e não o óbvio: o óbvio é reescrever todas as dicas. Mexer no que está certo gera revisão
inútil e risco de piorar texto bom.
Arquivos e objetos a tocar: `docs/QUOTES_STATUS_TOOLTIPS.md` e o componente de dicas de status.
Não tocar / armadilhas: não mude o nome de status na interface sem mudar o mapa e o banco — são três lugares.
Depende de: 094, 100 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: cada dica descreve uma transição que o banco aceita.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 259 — Corrigir a chave do Supabase publicada em `.env.example`
Onda / Severidade / Camada: 7 / Média / Configuração
Achados resolvidos: ACH-065
Problema hoje: `.env.example` publica `VITE_SUPABASE_ANON_KEY`, mas `client.ts:30-31` lê **primeiro**
`VITE_SUPABASE_PUBLISHABLE_KEY`. Quem monta um ambiente novo seguindo o exemplo configura a variável que o código
usa apenas como alternativa.
Causa raiz: o código migrou para a chave publicável e o exemplo não acompanhou.
Caminho recomendado: ponha `VITE_SUPABASE_PUBLISHABLE_KEY` como a variável principal do exemplo e deixe
`VITE_SUPABASE_ANON_KEY` marcada como alternativa herdada, com um comentário de uma linha. Não remova a alternativa:
`client.ts` ainda a aceita e removê-la do exemplo sem remover do código confunde igual.
Por que este caminho e não o óbvio: o óbvio é trocar uma pela outra. A ordem de leitura em `client.ts:30-31` é o
fato; o exemplo deve refleti-la, inclusive a alternativa.
Arquivos e objetos a tocar: `.env.example`.
Não tocar / armadilhas: nenhum valor real de chave vai para o arquivo de exemplo.
Depende de: — · Libera: 260, 261
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: a ordem do `.env.example` corresponde à ordem de `client.ts:30-31`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 260 — Documentar as 10 variáveis `VITE_*` que ninguém declarou
Onda / Severidade / Camada: 7 / Média / Configuração
Achados resolvidos: ACH-065
Problema hoje: `VITE_TURNSTILE_SITE_KEY`, `VITE_PUBLIC_URL`, `VITE_GOTRUE_CAPTCHA`, `VITE_AUTH_DEBUG`,
`VITE_SHOW_DEV_INFRA_MESSAGES`, `VITE_USE_CANVAS_STARFIELD`, `VITE_NAV_METRICS_SAMPLE_RATE`,
`VITE_ENABLE_NAV_METRICS` e duas outras são usadas em `src/` e não estão em `.env.example` nem em
`docs/ci/SEGREDOS.md`.
Causa raiz: variáveis acrescentadas no código sem passar pelo inventário.
Caminho recomendado: acrescente as 10 ao `.env.example` com valor de exemplo e um comentário de uma linha dizendo o
que cada uma faz e se é obrigatória. As de captcha/Turnstile afetam login — marque-as como obrigatórias em produção.
Por que este caminho e não o óbvio: o óbvio é documentar em `docs/`. O `.env.example` é o que a pessoa copia; a
documentação ela lê depois, se ler.
Arquivos e objetos a tocar: `.env.example`, `docs/ci/SEGREDOS.md` (só as que são segredo).
Não tocar / armadilhas: variável de depuração (`VITE_AUTH_DEBUG`) não deve ficar ligada no exemplo.
Depende de: 259 · Libera: 261
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: toda `import.meta.env.VITE_*` usada em `src/` tem entrada no `.env.example`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 261 — Estender o gate de inventário de segredos a `import.meta.env`
Onda / Severidade / Camada: 7 / Média / CI
Achados resolvidos: ACH-065
Problema hoje: `scripts/check-secrets-inventory.mjs:5-6,42` varre só `secrets.*`/`vars.*` em workflows e
`Deno.env.get()` em edge functions. `import.meta.env` em `src/` **não é varrido por ninguém** — e o ponto cego está
declarado no próprio arquivo.
Causa raiz: o gate foi escrito para CI e edge, e o front ficou fora.
Caminho recomendado: acrescente ao script a varredura de `import.meta.env.<NOME>` em `src/`, comparando com
`.env.example`. Falhe quando houver variável usada e não declarada. Como o ponto cego está escrito no arquivo, o
autor já previu esta extensão — leia o comentário antes.
Por que este caminho e não o óbvio: o óbvio é documentar manualmente e confiar. O repo já tem 10 variáveis como
prova de que a disciplina manual não se sustenta.
Arquivos e objetos a tocar: `scripts/check-secrets-inventory.mjs` + teste.
Não tocar / armadilhas: variável opcional não deve falhar o gate; use uma marca no `.env.example` para distinguir
obrigatória de opcional.
Depende de: 260 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (CI)
Como verificar: usando uma `VITE_` nova em `src/` sem declarar, o gate falha.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 262 — Remover `scripts/check-env.mjs`, que é código morto e pede a variável errada
Onda / Severidade / Camada: 7 / Baixa / Código morto
Achados resolvidos: ACH-066
Problema hoje: `scripts/check-env.mjs` não é referenciado em nenhum workflow nem no `package.json`, e exige
`VITE_SUPABASE_ANON_KEY` — a variável de alternativa, não a principal (ACH-065).
Causa raiz: script substituído e não removido.
Caminho recomendado: confirme por grep que nada o chama e remova. O que ele fazia passa a ser coberto pela etapa 261.
Por que este caminho e não o óbvio: o óbvio é corrigir a variável que ele pede. Corrigir script que ninguém roda é
trabalho perdido — e deixa no repo uma segunda verificação de ambiente, concorrendo com o gate real.
Arquivos e objetos a tocar: remove `scripts/check-env.mjs`.
Não tocar / armadilhas: confira também `.husky/` e scripts de maintenance antes de remover.
Depende de: 261 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: `grep -rn "check-env" . --exclude-dir=node_modules` sem resultado; CI verde.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 263 — Corrigir a contagem de edge functions do gerador de contexto
Onda / Severidade / Camada: 7 / Baixa / Ferramentas
Achados resolvidos: ACH-081
Problema hoje: o gerador conta `supabase/functions/tests/` como edge function (total 112), `build-cors-snapshot.mjs:7`
a exclui, e produção tem **111**. Toda frase "112 edges" no repo está 1 acima.
Causa raiz: duas varreduras do mesmo diretório com regras diferentes de exclusão.
Caminho recomendado: use em `scripts/ai-context/gerar.mjs` a mesma exclusão que `build-cors-snapshot.mjs:7` já faz —
copie a regra de lá, para as duas contagens passarem a concordar por construção.
Por que este caminho e não o óbvio: o óbvio é subtrair 1 na saída. A próxima pasta que não for edge volta a
desalinhar.
Arquivos e objetos a tocar: `scripts/ai-context/gerar.mjs`.
Não tocar / armadilhas: não abra PR da branch `contexto`; mexa no script, em `main`.
Depende de: 170 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: `node scripts/ai-context/gerar.mjs` local gera `edge_functions: 111`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 264 — Fazer o snapshot de edge functions do banco voltar a ser gerado
Onda / Severidade / Camada: 7 / Média / Ferramentas
Achados resolvidos: ACH-082
Problema hoje: `docs/contexto/supabase/edge-functions.md` está **vazio**, com a mensagem "Management API
desabilitada: defina SUPABASE_PROJECT_REF e SUPABASE_ACCESS_TOKEN". A fonte declarada como dona do fato "o que está
deployado" não responde; só o MCP responde.
Causa raiz: o coletor de contexto não tem credencial para a Management API — e, por decisão registrada (Gate E89),
`contexto.yml` **não** usa `SUPABASE_ACCESS_TOKEN`, para não colidir com os crons privilegiados.
Caminho recomendado: aqui há um conflito real entre duas decisões do repo, e ele é do dono. Documente em
`docs/qa/contexto-edge-functions.md`: por que a seção está vazia (o Gate E89), o que se perde (nenhuma fonte
versionada do estado de deploy das edges) e duas saídas possíveis — um token de escopo mínimo só de leitura de
funções, ou gerar a seção a partir do repo com a ressalva explícita de que é o **desejado**, não o deployado.
**Não** acrescente token ao `contexto.yml` por conta própria.
Por que este caminho e não o óbvio: o óbvio é configurar o token e resolver. Isso contraria uma decisão registrada
com motivo (colisão de cron) — exatamente o tipo de regra que as instruções mandam não contornar.
Arquivos e objetos a tocar: cria `docs/qa/contexto-edge-functions.md`.
Não tocar / armadilhas: não mexa em `contexto.yml`.
Depende de: — · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: sim (envolve segredo e uma decisão já registrada)
Como verificar: o documento explica o conflito e as duas saídas, citando o Gate E89.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 265 — Corrigir a flag `protegida` do gerador de rotas
Onda / Severidade / Camada: 7 / Média / Ferramentas
Achados resolvidos: ACH-079
Problema hoje: `docs/contexto/codigo/rotas.json` marca **22 rotas `/admin/*` como `protegida: false`** (por exemplo
`/admin/permissoes` e `/admin/roles`), e todas estão dentro de `<Route element={<AdminRoute />}>`
(`admin-routes.tsx:66`) ou `<DevRoute>` (`:118`). O gerador só detecta wrapper direto, não rota de layout.
Causa raiz: a análise não sobe na árvore de rotas.
Caminho recomendado: no gerador, resolva a proteção subindo a árvore: uma rota herda o guard de qualquer `<Route
element={...}>` que a contenha. Enquanto a herança não estiver implementada, troque o booleano por três estados
(`protegida`, `publica`, `indeterminada`) — afirmar `false` sem saber é o que causou o dano.
Por que este caminho e não o óbvio: o óbvio é marcar tudo em `/admin/*` como protegido por convenção de caminho.
Há exceções reais e documentadas (`/admin/temas`, `/tendencias`), então a convenção mentiria.
Arquivos e objetos a tocar: `scripts/ai-context/gerar.mjs`.
Não tocar / armadilhas: um agente que planeje pelo JSON errado "conserta" proteção que existe, ou reporta falha de
segurança inexistente — foi preciso ler o código para descartar o falso positivo nesta auditoria.
Depende de: — · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: `node scripts/ai-context/gerar.mjs` local e `/admin/roles` deixa de constar `protegida: false`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 266 — Resolver `ItemsListEditor`, código morto no caminho do dinheiro
Onda / Severidade / Camada: 7 / Baixa / Código morto
Achados resolvidos: ACH-099
Problema hoje: `ItemsListEditor.tsx` não é renderizado em lugar nenhum — e é um editor de itens de cotação, ou seja,
código morto no caminho do dinheiro.
Causa raiz: componente substituído e não removido.
Caminho recomendado: confirme por grep que nada o importa e remova. Se ele tiver lógica de cálculo que a versão em
uso **não** tem, isso é achado novo (pode ser funcionalidade perdida) — anote antes de apagar.
Por que este caminho e não o óbvio: o óbvio é apagar direto. Editor de itens é onde mora o desconto por item
(ACH-093); vale 5 minutos conferir se a versão viva cobre o mesmo.
Arquivos e objetos a tocar: remove o componente.
Não tocar / armadilhas: há 3 componentes com nome duplicado no repo (ACH-073) — confirme que você está olhando o
arquivo certo.
Depende de: — · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: typecheck e `npm test` verdes; `grep -rn "ItemsListEditor" src/` sem resultado.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 267 — Índice dos documentos de investigação produzidos por este plano
Onda / Severidade / Camada: 7 / Baixa / Documentação
Achados resolvidos: todos (navegação)
Problema hoje: este plano cria cerca de vinte documentos em `docs/qa/` (evidências, inventários, reconciliações).
Sem índice, o próximo agente não acha nada.
Causa raiz: documentação gerada por etapas independentes.
Caminho recomendado: crie `docs/qa/00-INDICE.md` listando cada documento, em uma linha, com a etapa que o criou e o
que ele responde. Mantenha-o atualizado nas etapas seguintes (é uma linha por documento).
Por que este caminho e não o óbvio: o óbvio é confiar na lista de arquivos da pasta. `docs/` deste repo tem 150
arquivos na raiz; sem índice, mais vinte desaparecem.
Arquivos e objetos a tocar: cria `docs/qa/00-INDICE.md`.
Não tocar / armadilhas: não renomeie os entregáveis `00-RESUMO.md` … `05-PROGRESSO.md`.
Depende de: — · Libera: 268
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: todo arquivo de `docs/qa/` tem uma linha no índice.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 268 — Reconciliação da Onda 7
Onda / Severidade / Camada: 7 / Baixa / Verificação
Achados resolvidos: ACH-027, ACH-050, ACH-065, ACH-077, ACH-078, ACH-079, ACH-081
Problema hoje: a Onda 7 padronizou componentes, textos e ferramentas de contexto. Conferir se o conjunto ficou
coerente é o que fecha a onda.
Causa raiz: conjunto de correções de consistência.
Caminho recomendado: registre em `docs/qa/reconciliacao-onda7.md`: a lista de telas usando o componente de erro
único, o número de variáveis documentadas, a saída de `node scripts/ai-context/gerar.mjs` com as contagens
corrigidas (111 edges, rotas com proteção certa) e a lista de a11y da etapa 252 antes e depois.
Por que este caminho e não o óbvio: idem às outras reconciliações — a onda se afirma com número.
Arquivos e objetos a tocar: cria `docs/qa/reconciliacao-onda7.md`.
Não tocar / armadilhas: nenhuma.
Depende de: 247, 252, 260, 263, 265, 267 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o documento traz os quatro conjuntos de números.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

---

# ONDA 8 · Higiene: código morto, CI e observabilidade (269–300)

## Bloco 8.A — Os 17 componentes órfãos (ACH-073)

<modelo_etapa>
Etapa 269 — Confirmar a orfandade dos 17 componentes antes de remover qualquer um
Onda / Severidade / Camada: 8 / Baixa / Código morto
Achados resolvidos: ACH-073
Problema hoje: 17 componentes acima de 150 linhas, somando ~5.000 linhas, sem nenhum import. Os maiores:
`admin/ProductPersonalizationManager.tsx` (790), `simulator/TechniqueCard.tsx` (557), `search/GlobalSearch.tsx` (481),
`admin/DiscountApprovalQueue.tsx` (351), `goals/SalesGoalsCard.tsx` (301). **Três são nomes duplicados que sombreiam
o arquivo realmente usado** — quem edita pode editar o errado.
Causa raiz: componentes substituídos sem remoção, e dois arquivos com o mesmo nome em pastas diferentes.
Caminho recomendado: para cada um dos 17, rode a busca pelo **caminho** do import, não pelo nome (`grep -rn
"components/admin/ProductPersonalizationManager"`), porque o nome duplicado faz o grep por nome achar o arquivo
vivo. Entregue `docs/qa/componentes-orfaos.md` com: caminho, linhas, resultado da busca e, nos três duplicados,
qual é o vivo e qual é o sombra.
Por que este caminho e não o óbvio: o óbvio é confiar na lista. Nos três casos de nome duplicado, a lista pode estar
apontando o arquivo errado — e remover o vivo quebra tela.
Arquivos e objetos a tocar: cria `docs/qa/componentes-orfaos.md`.
Não tocar / armadilhas: nenhuma remoção nesta etapa. Lembre que `import` dinâmico (`lazyWithRetry`) não aparece em
grep simples de `import ... from` — procure também pelo caminho dentro de `import(`.
Depende de: — · Libera: 270, 271, 272, 273, 274, 275, 276
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: os 17 estão classificados, e os 3 duplicados têm "vivo" e "sombra" identificados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 270 — Remover os componentes-sombra de nome duplicado
Onda / Severidade / Camada: 8 / Média / Código morto
Achados resolvidos: ACH-073
Problema hoje: três componentes órfãos têm o mesmo nome de um componente em uso. É o caso mais perigoso da lista:
um agente que procure pelo nome edita o arquivo que ninguém renderiza e conclui que a correção "não pegou".
Causa raiz: idem 269.
Caminho recomendado: remova os três sombras identificados na etapa 269. Esta é a primeira remoção porque é a que
tem maior ganho: elimina a ambiguidade de nome.
Por que este caminho e não o óbvio: o óbvio é renomear o sombra para `*.old`. Arquivo `*.old` no repo é a mesma
ambiguidade com outro nome.
Arquivos e objetos a tocar: os três arquivos sombra.
Não tocar / armadilhas: confirme duas vezes qual é o sombra — o critério é o caminho que ninguém importa, não a data.
Depende de: 269 · Libera: 271
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: typecheck e `npm test` verdes; a busca pelo nome passa a achar um arquivo só.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 271 — Resolver `ProductPersonalizationManager` (790 linhas)
Onda / Severidade / Camada: 8 / Média / Código morto
Achados resolvidos: ACH-073, ACH-054
Problema hoje: o maior órfão da lista, e é também um dos três casos de N+1 de escrita (`:177-183`, etapa 232).
Causa raiz: idem 269.
Caminho recomendado: se a etapa 269 confirmar a orfandade, remova — e a etapa 232 fica "não aplicável". Se tiver
consumidor, não remova: faça a etapa 232 e anote aqui. Antes de remover, verifique se a funcionalidade de gestão de
personalização de produto existe em outra tela; se **não** existir, isto não é código morto — é funcionalidade
perdida, e aí a etapa é levar ao dono, não apagar.
Por que este caminho e não o óbvio: o óbvio é apagar 790 linhas sem uso. Se a tela de gestão de personalização
sumiu do menu e ninguém notou, o problema é maior que o código morto.
Arquivos e objetos a tocar: `src/components/admin/ProductPersonalizationManager.tsx` (ou nada).
Não tocar / armadilhas: cruze com a lista de rotas sem entrada (etapa 161) — pode ser uma tela desligada.
Depende de: 269 · Libera: 232
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: a decisão está registrada com a busca pelo caminho e a resposta sobre onde a funcionalidade vive hoje.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 272 — Resolver `GlobalSearch` (481 linhas)
Onda / Severidade / Camada: 8 / Média / Código morto
Achados resolvidos: ACH-073
Problema hoje: componente de busca global órfão. O repo **tem** busca global funcionando (`useGlobalSearch.ts:489`
foi verificado, inclusive quanto a injeção) — então este é provavelmente um componente antigo.
Causa raiz: idem 269.
Caminho recomendado: confirme que a busca global em uso não o importa (nem por `import(` dinâmico) e remova.
Por que este caminho e não o óbvio: o óbvio é manter "porque busca é importante". Duas implementações de busca é
pior que uma.
Arquivos e objetos a tocar: `src/components/search/GlobalSearch.tsx`.
Não tocar / armadilhas: não mexa em `useGlobalSearch.ts`, que está em uso e verificado.
Depende de: 269 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: typecheck e testes verdes; a busca global continua funcionando.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 273 — Resolver `TechniqueCard` (557 linhas) e os componentes de simulador órfãos
Onda / Severidade / Camada: 8 / Baixa / Código morto
Achados resolvidos: ACH-073
Problema hoje: `simulator/TechniqueCard.tsx` (557 linhas) e outros componentes de `src/components/simulator` (24
arquivos no módulo) constam órfãos.
Causa raiz: idem 269.
Caminho recomendado: remova os confirmados. Atenção ao cruzamento com o ACH-085 (duas calculadoras mortas de
personalização) e com a etapa 066 — o simulador é a área onde sobrou mais código de versões anteriores.
Por que este caminho e não o óbvio: o óbvio é remover o módulo inteiro. Parte do simulador está em uso
(`useSimulation.ts:191` é consumidor real, visto na etapa 183).
Arquivos e objetos a tocar: os componentes de simulador confirmados como órfãos.
Não tocar / armadilhas: `useTechniquePricingOptions` e `useSimulation` estão **em uso**; não confunda hook com
componente.
Depende de: 066, 269 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: typecheck e testes verdes; o simulador continua funcionando.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 274 — Resolver `DiscountApprovalQueue` (351 linhas)
Onda / Severidade / Camada: 8 / Média / Código morto
Achados resolvidos: ACH-073, ACH-086
Problema hoje: componente da fila de aprovação de desconto, órfão, e é um dos quatro pontos que escrevem status sem
a guarda (etapa 097).
Causa raiz: idem 269.
Caminho recomendado: se órfão de verdade, remova — e a etapa 097 fica "não aplicável". Mas confirme **onde a fila de
aprovação de desconto é vista hoje**: se for só em `/admin/usuarios?tab=discounts` e na tela de detalhe, então o
componente é redundante; se não houver fila em lugar nenhum, é funcionalidade perdida e vai ao dono.
Por que este caminho e não o óbvio: o óbvio é apagar. A aprovação de desconto é fluxo de dinheiro; uma fila que
desapareceu da interface explicaria aprovações esquecidas.
Arquivos e objetos a tocar: `src/components/admin/DiscountApprovalQueue.tsx` (ou nada).
Não tocar / armadilhas: cruze com a etapa 089 (badge do menu) e com o ACH-089 (solicitações que nunca expiram).
Depende de: 269 · Libera: 097
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: a decisão está registrada, dizendo onde a fila é vista hoje.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 275 — Resolver os órfãos restantes da lista
Onda / Severidade / Camada: 8 / Baixa / Código morto
Achados resolvidos: ACH-073
Problema hoje: sobram cerca de 10 componentes órfãos acima de 150 linhas, incluindo `goals/SalesGoalsCard.tsx` (301).
Causa raiz: idem 269.
Caminho recomendado: remova em lotes de 3 a 4 por PR, aplicando a cada um a mesma pergunta das etapas 271 e 274:
"a funcionalidade existe em outro lugar?". `SalesGoalsCard` merece atenção — metas de venda é tema que o dono
reconhece; se não há tela de metas, é funcionalidade perdida.
Por que este caminho e não o óbvio: o óbvio é uma PR removendo os 10. Lote pequeno permite reverter um sem reverter
os outros nove.
Arquivos e objetos a tocar: os componentes do lote.
Não tocar / armadilhas: para cada remoção, remova também o teste do componente, se existir — teste de componente
removido é o ACH-101 nascendo de novo.
Depende de: 269 · Libera: 276
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: typecheck e `npm test` verdes depois de cada lote.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 276 — Gate que avisa quando nasce componente órfão
Onda / Severidade / Camada: 8 / Baixa / CI
Achados resolvidos: ACH-073
Problema hoje: 17 órfãos acumularam sem alarme. O repo tem baseline para várias coisas (lint, TODO, tamanho de
arquivo) e não para componente sem uso.
Causa raiz: sem verificação.
Caminho recomendado: use o inventário que o gerador de contexto **já produz** (`componentes.json` traz nomes
duplicados e órfãos) em vez de escrever uma análise nova: um gate que leia o inventário e falhe quando o número de
órfãos **crescer** em relação a um baseline — é o padrão de ratchet que o repo já usa em
`check-file-size-baseline` e `check-todo-baseline`.
Por que este caminho e não o óbvio: o óbvio é falhar com qualquer órfão. Começaria com 17 falhas e seria desligado
na primeira semana; o ratchet aceita o passado e barra a piora.
Arquivos e objetos a tocar: novo `scripts/check-orphan-components.mjs` + baseline JSON na raiz (como os outros);
workflow do `Static checks`.
Não tocar / armadilhas: `import(` dinâmico e `lazyWithRetry` — o gate precisa contá-los como uso, senão acusa
componente de rota lazy como órfão.
Depende de: 270, 275 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (CI)
Como verificar: acrescentando um componente sem uso, o gate falha; o baseline atual passa.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 8.B — Observabilidade (ACH-060, ACH-061, ACH-063)

<modelo_etapa>
Etapa 277 — Fazer a ausência do DSN do Sentry ser audível
Onda / Severidade / Camada: 8 / Média / Observabilidade
Achados resolvidos: ACH-060
Problema hoje: `src/lib/sentry.ts:161-173` — DSN ausente faz `return false` calado; DSN malformado emite aviso
**só em desenvolvimento**. Em produção, perder o DSN desliga todo o alerta descrito em `docs/OBSERVABILITY.md`
§52-63 sem um único sinal. (Achado marcado como hipótese na auditoria porque não foi possível ler as variáveis da
Vercel — ver ACH-062.)
Causa raiz: a inicialização do monitoramento falha em silêncio por desenho.
Caminho recomendado: faça o caso "sem DSN em produção" emitir um sinal que **não** dependa do próprio Sentry: um
`console.error` com marca reconhecível mais, se houver, um registro em tabela de saúde do sistema (o repo tem
`v_system_health_dashboard` e `vw_system_health_quick`, então existe esse conceito). O que não pode continuar é o
`return false` calado.
Por que este caminho e não o óbvio: o óbvio é lançar exceção se o DSN faltar. Isso derruba a aplicação inteira por
falta de monitoramento — troca um problema invisível por um visível demais.
Arquivos e objetos a tocar: `src/lib/sentry.ts`.
Não tocar / armadilhas: não registre o valor do DSN em log.
Depende de: — · Libera: 278, 279
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: não
Como verificar: subindo a aplicação sem DSN em modo produção, o sinal aparece; com DSN, nada muda.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 278 — Confirmar se o DSN do Sentry está configurado em produção
Onda / Severidade / Camada: 8 / Média / Observabilidade
Achados resolvidos: ACH-060
Problema hoje: a auditoria **não conseguiu** confirmar, porque o MCP da Vercel não tem acesso ao projeto (ACH-062).
O achado ficou como hipótese.
Causa raiz: lacuna de acesso.
Caminho recomendado: depois da etapa 176 (acesso ao MCP da Vercel restabelecido), liste as variáveis de ambiente do
projeto — **só os nomes** — e confirme a presença da variável do DSN nos ambientes de produção e preview. Registre o
resultado em `docs/qa/mcp-vercel-acesso.md`. Se o acesso não voltar, o sinal da etapa 277 responde a pergunta na
prática: se o alerta aparecer em produção, o DSN não está lá.
Por que este caminho e não o óbvio: o óbvio é assumir que está configurado porque o Sentry "parece funcionar".
Nenhuma evidência foi coletada; assumir fecha o achado sem resolvê-lo.
Arquivos e objetos a tocar: `docs/qa/mcp-vercel-acesso.md`.
Não tocar / armadilhas: nunca imprima valor de variável, só nome.
Depende de: 176, 277 · Libera: 279
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o documento afirma, com a saída do comando, se a variável existe em produção.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 279 — Verificar que o alerta chega a alguém
Onda / Severidade / Camada: 8 / Média / Observabilidade
Achados resolvidos: ACH-060, ACH-061
Problema hoje: o repo documenta SLOs e alertas (`docs/OBSERVABILITY_SLOS.md`, `docs/ONCALL.md`), e esta auditoria
encontrou duas provas de que o alarme não fecha o ciclo: o DSN pode estar ausente em silêncio (ACH-060) e o
`smoke_tests_monthly` está ativo e **nunca** executou (ACH-061) sem ninguém notar.
Causa raiz: alerta configurado sem teste de ponta a ponta.
Caminho recomendado: dispare um erro de teste em produção **de propósito** (um erro inócuo, marcado como teste) e
confirme que ele chega ao destino descrito em `docs/ONCALL.md`. Registre em `docs/qa/alerta-ponta-a-ponta.md` quem
recebeu, em quanto tempo e por qual canal. Se não chegar, o achado é maior que o DSN — anote e leve ao dono.
Por que este caminho e não o óbvio: o óbvio é conferir a configuração. Configuração certa com destinatário errado é
o modo mais comum de alerta não funcionar.
Arquivos e objetos a tocar: cria `docs/qa/alerta-ponta-a-ponta.md`.
Não tocar / armadilhas: o erro de teste precisa ser inócuo e claramente marcado, para não virar incidente.
Depende de: 277 · Libera: —
Risco e como reverter: zero (o erro de teste não altera dado).
Precisa de aprovação humana antes do merge: sim (dispara alerta em produção)
Como verificar: o documento diz quem recebeu o alerta, quando e por onde.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 280 — Descobrir por que `smoke_tests_monthly` nunca executou
Onda / Severidade / Camada: 8 / Média / Banco
Achados resolvidos: ACH-061
Problema hoje: medido — `cron.job` jobid 32, `jobname = smoke_tests_monthly`, `active = true`,
`schedule = '0 3 1 * *'`, e **nenhuma** linha em `cron.job_run_details`: `last_run` nulo.
Causa raiz: desconhecida. Possibilidades: o job foi criado depois do último dia 1; o comando falha antes de
registrar; o histórico de `job_run_details` foi truncado.
Caminho recomendado: leia o `command` do job (consulta a `cron.job`) e a data de criação. Se o comando chama uma
edge function, confirme que a função existe e que o segredo do vault está configurado. Rode o comando **à mão, por
leitura** se ele for de leitura; se for de escrita, não rode — registre o diagnóstico e pare.
Por que este caminho e não o óbvio: o óbvio é desativar o job por não funcionar. É a rede de proteção mensal; a
ausência dela é o achado.
Arquivos e objetos a tocar: nenhum (diagnóstico) + anotação no `05-PROGRESSO.md`.
Não tocar / armadilhas: `cron.alter_job` por MCP é proibido neste repo (incidente de 2026-10-13) — qualquer mudança
nasce como migration.
Depende de: — · Libera: 281
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o progresso traz o `command` do job, a data de criação e a causa provável.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 281 — Corrigir ou remover `smoke_tests_monthly`
Onda / Severidade / Camada: 8 / Média / Banco
Achados resolvidos: ACH-061
Problema hoje: ver 280.
Causa raiz: conforme o diagnóstico da etapa 280.
Caminho recomendado: se o job faz sentido, corrija-o por migration (`cron.unschedule` + `cron.schedule` com o
comando certo) e **mude a periodicidade**: mensal é tempo demais para descobrir que o smoke test não roda. Semanal
dá quatro chances por mês de perceber. Se o job não faz sentido, remova-o por migration — job ativo que nunca roda é
pior que job ausente, porque dá a impressão de cobertura.
Por que este caminho e não o óbvio: o óbvio é manter mensal porque está escrito assim. A frequência que o dono
precisa é a que avisa rápido; a que estava lá nunca avisou nada.
Arquivos e objetos a tocar: nova migration; rollback.
Não tocar / armadilhas: toda mudança de `cron.job` nasce como migration e vai por `db-apply-migration.yml`.
Depende de: 280 · Libera: —
Risco e como reverter: baixo. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL + cron em produção)
Como verificar: após a primeira execução prevista, `cron.job_run_details` traz uma linha `succeeded` para o job.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 8.C — Infraestrutura dormente (ACH-069, ACH-070)

<modelo_etapa>
Etapa 282 — Decidir o destino do mecanismo de `webhook_outbox`
Onda / Severidade / Camada: 8 / Baixa / Banco
Achados resolvidos: ACH-069
Problema hoje: medido — `webhook_outbox` tem **0 linhas** e o cron que a processaria (`cron.job` jobid 202,
`process-webhook-outbox`) está **inativo**. Se alguém religar a escrita no outbox, nada sai e ninguém é avisado.
Causa raiz: padrão de outbox implementado e abandonado em favor do `webhook-dispatcher` direto.
Caminho recomendado: confirme que o envio de webhook hoje passa só pelo `webhook-dispatcher` (as etapas 177–179
tratam dele) e não pelo outbox. Se confirmado, remova a tabela e o job por migration — ou, se o dono quiser manter o
padrão para o futuro, religue o cron e escreva um teste que prove que uma linha no outbox sai. Não deixe no meio.
Por que este caminho e não o óbvio: o óbvio é deixar como está, "porque está vazio e não incomoda". Tabela de
outbox com processador desligado é uma armadilha para o próximo agente, que vai achar que tem entrega garantida.
Arquivos e objetos a tocar: nova migration (remove ou religa); rollback.
Não tocar / armadilhas: se remover, confirme que nenhuma função ou trigger grava nela
(`grep -rn "webhook_outbox" supabase/ src/`).
Depende de: 177 · Libera: 283
Risco e como reverter: baixo (0 linhas). Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: o outbox não existe mais, **ou** uma linha de teste nele sai pelo cron e o teste prova isso.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 283 — Decidir o destino dos 7 cron jobs inativos
Onda / Severidade / Camada: 8 / Baixa / Banco
Achados resolvidos: ACH-070
Problema hoje: 7 jobs cadastrados e inativos (medido): `refresh-analytics-mv-product-intelligence`,
`process-webhook-outbox`, `image-dimensions-backfill`, `refresh-analytics-mv-stock-velocity`, `monitor-connections`,
`pipeline-classify-categories`, `dispatcher-log-sync`. Verificado: nenhum deixou backlog órfão.
Causa raiz: jobs desligados em incidentes ou migrações e nunca resolvidos.
Caminho recomendado: para cada um, pergunte: o que ele fazia e quem faz isso hoje? Os dois `refresh-analytics-mv-*`
atualizam matviews — se as matviews não são atualizadas por mais ninguém, o dado delas está velho e isso é achado
novo (anote). `monitor-connections` é observabilidade — cruze com a Onda 8. Remova por migration os que não têm
função, religue os que têm, e registre a decisão por job em `docs/qa/crons-inativos.md`.
Por que este caminho e não o óbvio: o óbvio é remover os 7 por estarem desligados. Dois deles atualizam dado que
alguma tela mostra; removê-los esconde que o dado está parado.
Arquivos e objetos a tocar: cria `docs/qa/crons-inativos.md`; nova migration conforme a decisão.
Não tocar / armadilhas: confira quando cada matview foi atualizada pela última vez
(`pg_stat_all_tables` ou o `last_refresh` do snapshot) antes de concluir que está tudo bem.
Depende de: 282 · Libera: 284
Risco e como reverter: baixo. Reverter = rollback.
Precisa de aprovação humana antes do merge: sim (DDL + cron em produção)
Como verificar: o documento traz a decisão por job, e `cron.job` reflete as remoções/religamentos.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 284 — Verificar a idade dos dados das matviews que ninguém atualiza
Onda / Severidade / Camada: 8 / Média / Banco
Achados resolvidos: ACH-070
Problema hoje: dois dos 7 jobs inativos atualizavam matviews de `analytics`
(`mv_product_intelligence`, `mv_stock_velocity`). Se nada as atualiza, as telas que as leem mostram dado antigo
como se fosse atual — e o usuário não tem como saber.
Causa raiz: job de atualização desligado sem desligar o consumidor.
Caminho recomendado: descubra a última atualização de cada matview (consulta de leitura) e quem a consome
(`grep -rn "mv_product_intelligence\|mv_stock_velocity" src/ supabase/`). Se houver consumidor e o dado for antigo,
registre em `docs/qa/crons-inativos.md` com a idade em dias e o nome da tela afetada — é informação que o dono
precisa: ele pode estar decidindo com número velho.
Por que este caminho e não o óbvio: o óbvio é religar os jobs. Atualizar matview tem custo; se a tela não é mais
usada, religar é gastar por nada. A ordem certa é descobrir quem consome.
Arquivos e objetos a tocar: `docs/qa/crons-inativos.md`.
Não tocar / armadilhas: não rode `REFRESH MATERIALIZED VIEW` nesta auditoria — é escrita e pode ser pesada.
Depende de: 283 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o documento traz, por matview, a idade do dado e a lista de telas que a leem.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 8.D — Fazer o CI parar de ser verde sem garantia (ACH-068, ACH-006, ACH-007, ACH-102)

<modelo_etapa>
Etapa 285 — Acompanhar a PR do gate E40 até o fim
Onda / Severidade / Camada: 8 / Alta / CI
Achados resolvidos: ACH-068
Problema hoje: `main` ficou vermelha **6 vezes** em 2026-11-22 (13:21, 13:22, 13:31, 14:04, 17:40 e 18:19 UTC),
sempre por `R_SCHEMA_DRIFT: failure` → `Gate E40 Schema Drift`, com os outros gates verdes; mais 3 falhas de
`schema-snapshot-export` e 2 do workflow E15 ("CONCURRENTLY detectado"). A última corrida (18:33) está verde, e a PR
`#3993` é a tentativa de corrigir a normalização desse gate.
Causa raiz: o gate de drift normaliza a definição de views/matviews/policies de um jeito que gera diferença falsa.
Caminho recomendado: **não trabalhe em `scripts/drift-baseline.mjs`** (PR aberta de outro agente). Acompanhe:
quando `#3993` mergear, rode o gate e `tests/scripts/drift-baseline.test.mjs` (etapa 136) e registre o resultado.
Se a `main` voltar a ficar vermelha pelo mesmo gate depois do merge, aí sim é etapa nova — e aí o assunto é seu.
Por que este caminho e não o óbvio: o óbvio é corrigir o gate em paralelo, porque é o que mais incomoda. Duas
correções simultâneas no mesmo gate é o conflito entre agentes que as regras do repo mandam evitar.
Arquivos e objetos a tocar: nenhum + anotação no `05-PROGRESSO.md`.
Não tocar / armadilhas: `scripts/drift-baseline.mjs` e `tests/scripts/drift-baseline.test.mjs` são da PR `#3993`.
Depende de: 136 · Libera: 286
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o progresso registra o estado da `#3993` e, após o merge, a saída do gate E40 em `main`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 286 — Fazer o gate de drift distinguir diferença real de diferença de formatação
Onda / Severidade / Camada: 8 / Alta / CI
Achados resolvidos: ACH-068
Problema hoje: seis corridas vermelhas em um dia por normalização — o gate acusou drift que não existia. Gate que dá
falso positivo seis vezes num dia é gate que vai ser desligado.
Causa raiz: comparação de texto de definição sem normalizar o que o Postgres reescreve (espaços, ordem de opções,
qualificação de schema).
Caminho recomendado: **só depois** de `#3993` mergear. Se o falso positivo persistir, a saída não é afrouxar o
gate: é comparar o objeto **normalizado pelo próprio Postgres** (reconsultar `pg_get_viewdef`/`pg_get_policydef` dos
dois lados) em vez de comparar o texto da migration com o do catálogo. Registre no PR qual era a diferença falsa.
Por que este caminho e não o óbvio: o óbvio é pôr o objeto numa allowlist de exceção. Cada exceção é um objeto que o
gate deixa de proteger — e o gate E40 existe por causa de um incidente de DDL fora do fluxo (2026-10-13).
Arquivos e objetos a tocar: o script do gate E40 (depois do merge da `#3993`).
Não tocar / armadilhas: não acrescente exceção por objeto; não desligue o gate.
Depende de: 285 · Libera: 287
Risco e como reverter: médio. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (CI)
Como verificar: dez corridas seguidas em `main` sem falso positivo do E40; e, alterando uma view fora do fluxo de
migration em ambiente de teste, o gate **acusa**.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 287 — Conferir o alinhamento entre `required-checks.json`, o ruleset e o agregador
Onda / Severidade / Camada: 8 / Alta / CI
Achados resolvidos: ACH-006, ACH-007, ACH-102
Problema hoje: três desalinhamentos foram medidos: o `required-checks.json` lista 3 checks e o ruleset exige 1; o
guarda lê só o primeiro item (`required-checks-guard.yml:75`); e `static-checks.yml` e `ci.yml` (suíte completa) não
entram no `needs:` do agregador. As etapas 009–011 e 137 corrigem cada ponta.
Causa raiz: três fontes de verdade sobre "o que bloqueia merge".
Caminho recomendado: depois das etapas 009, 010, 011 e 137, produza uma única tabela em
`docs/ci/PADRAO_WORKFLOW.md` (ou no documento de required checks) com três colunas: check declarado no JSON ·
required no ruleset · presente no `needs:` do `deploy-ready`. As três colunas precisam concordar. Essa tabela é o
que o guarda da etapa 009 passa a verificar automaticamente.
Por que este caminho e não o óbvio: o óbvio é confiar nas etapas anteriores. Elas corrigem cada ponta; só a tabela
mostra se o conjunto fechou — e foi a ausência dessa visão que deixou o CodeQL fora.
Arquivos e objetos a tocar: `docs/ci/PADRAO_WORKFLOW.md` ou `.github/required-checks.json` (documentação).
Não tocar / armadilhas: nenhuma mudança de workflow nesta etapa; é conferência e registro.
Depende de: 009, 010, 011, 137 · Libera: 288
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: a tabela existe e as três colunas concordam; `github_get_branch_rules` confirma.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 288 — Detector de gate declarado e não verificado
Onda / Severidade / Camada: 8 / Média / CI
Achados resolvidos: ACH-006, ACH-007, ACH-009, ACH-011, ACH-102
Problema hoje: esta auditoria encontrou **cinco** casos do mesmo padrão: guarda escrita, testada ou documentada que
não está no caminho de execução — `check-public-views-drift` com lista fixa, CodeQL fora do ruleset,
`static-checks.yml` fora do agregador, `_shared/url-allowlist.ts` só importado pelo próprio teste, e
`test:ci-core` cobrindo 70 de 1.869 arquivos de teste.
Causa raiz: o repo produz guardas mais rápido do que as liga.
Caminho recomendado: um verificador que responda, para cada script de `scripts/check-*`, duas perguntas: ele é
chamado por algum workflow? esse workflow chega ao `deploy-ready`? Falhe (ou avise) quando a resposta for não. E,
para `supabase/functions/_shared/*`, avise quando o único importador de um módulo for o próprio teste — foi assim
que a `url-allowlist` ficou morta.
Por que este caminho e não o óbvio: o óbvio é revisar à mão de vez em quando. Cinco ocorrências dizem que a revisão
manual não pega; e este é o padrão de causa raiz mais repetido de toda a auditoria.
Arquivos e objetos a tocar: novo `scripts/check-gates-wired.mjs` + teste; workflow do `Static checks`.
Não tocar / armadilhas: alguns scripts `check-*` são de uso manual por desenho (atualização de baseline) — permita
uma allowlist pequena e explícita para eles, com motivo escrito.
Depende de: 287 · Libera: —
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (CI)
Como verificar: o verificador roda e lista zero gates desligados depois das etapas desta onda; acrescentando um
script `check-*` não chamado, ele avisa.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

## Bloco 8.E — Observabilidade do que importa (ACH-060, ACH-061, ACH-063)

<modelo_etapa>
Etapa 289 — Log estruturado com `request_id` nas edge functions que não têm
Onda / Severidade / Camada: 8 / Média / Observabilidade
Achados resolvidos: ACH-030, ACH-060
Problema hoje: o helper `_shared/error-response.ts` devolve resposta padronizada **com** `request_id` e registra o
detalhe no log — mas a adoção era de 12 em 111 funções no início deste plano. Fora dele, quando um usuário relata
erro, não há como ligar o relato ao log.
Causa raiz: logging ad hoc por função.
Caminho recomendado: ao converter cada lote nas etapas 208–210, confirme que o `request_id` aparece **na resposta e
no log**. Esta etapa é a conferência final: amostre 10 funções convertidas, provoque um erro e confira que o mesmo
identificador aparece nos dois lados. Registre em `docs/qa/edges-erro-padronizado.md`.
Por que este caminho e não o óbvio: o óbvio é confiar na conversão. A conversão pode manter o formato e perder o
identificador — e aí a padronização não serve para suporte.
Arquivos e objetos a tocar: `docs/qa/edges-erro-padronizado.md`.
Não tocar / armadilhas: nunca registre dado de cliente no log junto do identificador.
Depende de: 210 · Libera: 290
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: nas 10 amostradas, o `request_id` da resposta aparece no log da mesma invocação.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 290 — Verificar se alguém olha o painel de saúde do sistema
Onda / Severidade / Camada: 8 / Média / Observabilidade
Achados resolvidos: ACH-058, ACH-061
Problema hoje: o banco tem `v_system_health_dashboard` e `vw_system_health_quick` (as duas sem acesso para `anon`
nem `authenticated`, medido — só papel privilegiado), e o repo tem `/admin/observabilidade` e `/admin/status`. Com o
`smoke_tests_monthly` nunca executado (ACH-061), a suspeita é de que o painel exista e ninguém consulte.
Causa raiz: observabilidade construída sem rotina de leitura.
Caminho recomendado: confirme o que as duas views medem hoje (consulta de leitura) e se as telas de
`/admin/observabilidade` e `/admin/status` as consomem. Se as views estiverem vazias, desatualizadas ou sem
consumidor, isso é achado novo — anote. Registre em `docs/qa/painel-saude.md` o que o painel responde de fato e o
que seria necessário para ele valer como primeira parada numa suspeita de incidente.
Por que este caminho e não o óbvio: o óbvio é criar mais métrica. Antes de medir mais, vale saber se o que já é
medido chega a alguém.
Arquivos e objetos a tocar: cria `docs/qa/painel-saude.md`.
Não tocar / armadilhas: `vw_system_health_quick` está com `security_invoker=on` e as duas estão fechadas a `anon` e
`authenticated` — não "corrija" isso para a tela funcionar; a tela roda com papel privilegiado.
Depende de: 052 · Libera: 291
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o documento diz o que o painel mostra, se as telas o consomem e o que falta.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 291 — Escrever o SLO do fluxo de cotação com base no que já é medido
Onda / Severidade / Camada: 8 / Média / Observabilidade
Achados resolvidos: ACH-060, ACH-061
Problema hoje: o repo tem `docs/OBSERVABILITY_SLOS.md`, e esta auditoria mostrou que o alarme pode não fechar o
ciclo (ACH-060) e que a verificação periódica não roda (ACH-061). Não há indicador do fluxo que dá dinheiro: a
cotação.
Causa raiz: SLOs escritos para infraestrutura, não para o fluxo de negócio.
Caminho recomendado: defina **um** indicador simples e mensurável com o que já existe: a taxa de erro das
requisições do fluxo de cotação (criar, editar, enviar) por dia, obtida dos logs. Escreva no documento o alvo, de
onde vem o número e quem olha. Um indicador que alguém olha vale mais que dez que ninguém lê.
Por que este caminho e não o óbvio: o óbvio é definir SLOs para todas as camadas. Vira documento grande e sem dono —
que é o estado atual.
Arquivos e objetos a tocar: `docs/OBSERVABILITY_SLOS.md`.
Não tocar / armadilhas: não prometa indicador que dependa de ferramenta sem acesso (ver ACH-062).
Depende de: 279, 290 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: sim (define compromisso operacional)
Como verificar: o documento traz um indicador, o alvo, a fonte do número e o responsável.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 292 — Medir o atrito real do gate de recibo de migration
Onda / Severidade / Camada: 8 / Alta / CI
Achados resolvidos: ACH-067
Problema hoje: o gate 1.13.3 (recibo de migration) é step bloqueante no job `lint-typecheck`
(`deploy-gates.yml:390-395`) e, por `PENDENCIAS.md` §53.5, trava **toda PR do repositório** 24 h após cada
migration; houve 7 PRs de recibo abertas em conflito entre si. Os dois últimos commits de `main` são recibos
(`#3991`, `#3992`) — o ciclo está vivo. Correção de bug em produção fica parada por um gate de documentação.
Causa raiz: o gate é global (trava qualquer PR) para um problema local (a migration precisa de recibo).
Caminho recomendado: antes de propor mudança, **meça**: liste as PRs dos últimos 30 dias que falharam só por esse
gate e o tempo que ficaram paradas. Entregue `docs/qa/gate-recibo-atrito.md`. Esse número é o que justifica a
mudança para o dono — e ele pode concluir que o atrito vale a pena.
Por que este caminho e não o óbvio: o óbvio é desligar o gate, que é o que mais incomoda hoje. Ele existe por causa
de um incidente real de DDL fora do fluxo (2026-10-13); desligar sem medir troca um problema por outro pior.
Arquivos e objetos a tocar: cria `docs/qa/gate-recibo-atrito.md`.
Não tocar / armadilhas: nenhuma mudança de workflow nesta etapa.
Depende de: — · Libera: 293, 294
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o documento traz a contagem de PRs afetadas e o tempo médio de bloqueio.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 293 — Propor ao dono o recorte do gate de recibo
Onda / Severidade / Camada: 8 / Alta / CI
Achados resolvidos: ACH-067
Problema hoje: ver 292.
Causa raiz: idem.
Caminho recomendado: com o número da etapa 292, apresente ao dono a proposta: o gate passa a travar **só as PRs que
tocam `supabase/migrations/**`**, em vez de todas. Quem muda front não é bloqueado por recibo de banco pendente, e a
garantia que o gate dá (migration aplicada tem recibo) continua inteira. Mostre também a alternativa de manter como
está, com o custo medido.
Por que este caminho e não o óbvio: o óbvio é usar `continue-on-error`. Isso mantém o gate no lugar e o torna
decorativo — exatamente o padrão que a etapa 288 está combatendo.
Arquivos e objetos a tocar: `docs/qa/gate-recibo-atrito.md` (a proposta).
Não tocar / armadilhas: não implemente antes da decisão.
Depende de: 292 · Libera: 294
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: sim (CI e processo de trabalho)
Como verificar: a decisão do dono está registrada com data.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 294 — Aplicar o recorte do gate de recibo
Onda / Severidade / Camada: 8 / Alta / CI
Achados resolvidos: ACH-067
Problema hoje: ver 292.
Causa raiz: idem.
Caminho recomendado: **se a etapa 293 for aprovada**, condicione o step do gate (`deploy-gates.yml:390-395`) ao
resultado do job `changes`, que o repo já usa para o bypass de PR docs-only (E14) — o mecanismo existe e está
testado; é só mais um filtro de caminho. Não crie job novo.
Por que este caminho e não o óbvio: o óbvio é mover o gate para um workflow separado. Workflow novo precisa entrar
no `needs:` do agregador, e é aí que o repo já errou cinco vezes (etapa 288).
Arquivos e objetos a tocar: `.github/workflows/deploy-gates.yml`.
Não tocar / armadilhas: o filtro precisa pegar `supabase/migrations/**` e também os arquivos de recibo, senão a PR
de recibo não roda o próprio gate.
Depende de: 293 · Libera: 295
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (workflow)
Como verificar: PR que toca só `src/` não roda o gate de recibo; PR que toca `supabase/migrations/**` roda.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 295 — Resolver as PRs de recibo acumuladas
Onda / Severidade / Camada: 8 / Alta / Processo
Achados resolvidos: ACH-067
Problema hoje: `PENDENCIAS.md` §53.5 registra 7 PRs de recibo abertas em conflito entre si. Enquanto elas existem, o
gate continua travando o repositório e o conflito entre elas se realimenta.
Causa raiz: cada migration gerou uma PR de recibo, e as PRs tocam o mesmo arquivo de log.
Caminho recomendado: liste as PRs de recibo abertas (`github_graphql`). **Não mergeie PR de outro agente** — isso é
regra do repo. Entregue ao dono a lista com a ordem em que elas deveriam ser mergeadas para não conflitar, e o
motivo. Se alguma delas for sua (criada por você neste plano), resolva o conflito dela em relação a `main` e
mergeie; as demais ficam para o dono.
Por que este caminho e não o óbvio: o óbvio é mergear todas na ordem que vier. São PRs de outros agentes e o
`AGENTS.md` trata branch alheia como somente leitura.
Arquivos e objetos a tocar: nenhum (coordenação) + `05-PROGRESSO.md`.
Não tocar / armadilhas: nunca rebase nem force-push em branch que você não criou.
Depende de: 294 · Libera: 011
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: sim (envolve PR de outros agentes)
Como verificar: a lista ordenada está no progresso, e as PRs que eram suas estão resolvidas.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 296 — Rotina de rotação de segredos com data
Onda / Severidade / Camada: 8 / Média / Segurança
Achados resolvidos: ACH-012
Problema hoje: `docs/ci/SEGREDOS.md` manda rotacionar `PGPASSWORD` e segredos de `service_role` a cada 6 meses, e a
rotação do `service_role` vazado era "a pendência mais antiga desta frente" (`PENDENCIAS.md:1049`). Regra sem data
registrada é regra que não acontece.
Causa raiz: política de rotação sem registro de quando cada segredo foi rotacionado.
Caminho recomendado: crie em `docs/ci/SEGREDOS.md` uma tabela com uma linha por segredo: nome (nunca valor), onde
vive, quando foi rotacionado por último e quando vence. Preencha com a rotação da etapa 016. Para o vencimento,
crie um cron simples (ou um item no calendário do dono) — mas a tabela, que é o registro, vem primeiro.
Por que este caminho e não o óbvio: o óbvio é criar automação de rotação. Rotação automática de `service_role`
derruba produção se algum consumidor não acompanhar (foi o cuidado da etapa 016); a tabela com data é o mínimo que
funciona.
Arquivos e objetos a tocar: `docs/ci/SEGREDOS.md`.
Não tocar / armadilhas: nenhum valor de segredo no documento.
Depende de: 016 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: sim (segurança)
Como verificar: a tabela tem uma linha por segredo, com data da última rotação e do vencimento.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 297 — Registrar no `AGENTS.md` os gates criados por este plano
Onda / Severidade / Camada: 8 / Média / Documentação
Achados resolvidos: ACH-005, ACH-013, ACH-030, ACH-044, ACH-073, ACH-102
Problema hoje: este plano cria gates novos (tautologia de policy, erro padronizado em edge, timeout em `fetch`,
assinatura de realtime, componente órfão, gates ligados ao agregador) e o `AGENTS.md` — que é o arquivo que todo
agente lê primeiro — não os menciona.
Causa raiz: regra nova sem entrada no documento de regras.
Caminho recomendado: acrescente ao `AGENTS.md`, nas seções que já existem (Comandos, CI, Banco), uma linha por gate
novo: o que ele impede e o comando para rodá-lo local. Uma linha cada, no estilo enxuto do arquivo — não uma seção
nova.
Por que este caminho e não o óbvio: o óbvio é documentar em `docs/`. O `AGENTS.md` é o que o próximo agente lê;
`docs/` tem 150 arquivos na raiz.
Arquivos e objetos a tocar: `AGENTS.md`.
Não tocar / armadilhas: `AGENTS.md` é lido por `CLAUDE.md` e vence `docs/` — mudança ali muda o comportamento de
todos os agentes. Seja preciso e curto. PR docs-only.
Depende de: 027, 049, 061, 199, 213, 276, 288 · Libera: 298
Risco e como reverter: baixo. Reverter = `git revert`.
Precisa de aprovação humana antes do merge: sim (muda as regras que todos os agentes seguem)
Como verificar: cada gate novo tem uma linha no `AGENTS.md` com o comando local.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 298 — Fechar no `PENDENCIAS.md` o que este plano resolveu
Onda / Severidade / Camada: 8 / Baixa / Documentação
Achados resolvidos: ACH-012, ACH-067, ACH-083, ACH-100
Problema hoje: `PENDENCIAS.md` registra pendências antigas, duas delas tratadas aqui (§53.4, a rotação do
`service_role`; §53.5, o atrito do gate de recibo). Esta auditoria também achou dois riscos documentados que **já
estavam resolvidos** (partições de 2027 e duplicidade de número de cotação).
Causa raiz: a lista de pendências cresce e ninguém a fecha.
Caminho recomendado: marque como resolvidas as pendências que este plano fechou, citando a etapa e a evidência; e
remova (ou marque como resolvido) os dois riscos falsos. Não apague histórico: marque.
Por que este caminho e não o óbvio: o óbvio é deixar a lista crescer. Risco falso competindo com risco real é o que
faz o dono perder tempo no lugar errado — e a auditoria achou dois.
Arquivos e objetos a tocar: `PENDENCIAS.md`, `docs/QUOTE_NUMBERING.md`,
`docs/contexto/regras/manual/regras.md`.
Não tocar / armadilhas: PR docs-only; não feche pendência sem a etapa e a evidência citadas.
Depende de: 016, 130, 294, 297 · Libera: 299
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: cada item fechado aponta a etapa deste plano e a evidência.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 299 — Conferir que todo achado Crítico e Alto tem etapa concluída
Onda / Severidade / Camada: 8 / Alta / Verificação
Achados resolvidos: todos
Problema hoje: ao fim de 300 etapas, é fácil ter deixado um achado sem fechamento — e os Críticos e Altos são 36
(5 + 31).
Causa raiz: plano longo.
Caminho recomendado: percorra `03-ACHADOS.md` e, para cada achado Crítico e Alto, confirme no `05-PROGRESSO.md` que
pelo menos uma etapa que o resolve está marcada como concluída **com evidência**. Liste em
`docs/qa/cobertura-achados.md` os que ficaram sem fechamento e por quê (etapa bloqueada por aprovação do dono, PR de
outro agente, evidência não correspondia mais).
Por que este caminho e não o óbvio: o óbvio é confiar nas marcações do progresso. Etapa marcada sem evidência não
fecha achado — é a regra 6 das instruções.
Arquivos e objetos a tocar: cria `docs/qa/cobertura-achados.md`.
Não tocar / armadilhas: não marque achado como resolvido porque a etapa foi mergeada; a verificação executada é o
critério.
Depende de: 298 · Libera: 300
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: o documento tem uma linha por achado Crítico e Alto, com a etapa que o fechou e a evidência.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

<modelo_etapa>
Etapa 300 — Reauditar as camadas que esta auditoria não cobriu
Onda / Severidade / Camada: 8 / Alta / Verificação
Achados resolvidos: lacunas declaradas em `01-INVENTARIO.md` §12
Problema hoje: a auditoria que gerou este plano declarou o que **não** cobriu: a suíte E2E Playwright (627 testes),
`npm run build`, as 1.087 policies uma a uma, as 1.360 funções SQL, os 89 workflows um a um, teste de carga e
concorrência real, as jornadas de kit-builder, mockup e frete de ponta a ponta, as integrações Cloudflare Images,
Roboflow e ElevenLabs, acessibilidade além do básico, e o banco do CRM externo.
Causa raiz: auditoria somente-leitura, numa sessão, sem ambiente de escrita.
Caminho recomendado: com as 299 etapas anteriores concluídas, o sistema está em outro estado — e as camadas não
cobertas agora podem ser auditadas com o ambiente que este plano construiu (suíte de teste verde e bloqueante,
gates ligados, documentos de evidência). Rode, nesta ordem: `npm run build`; a suíte E2E (`npm run test:e2e`), que
agora tem um alvo estável; e uma auditoria dirigida das jornadas de kit-builder, mockup e frete, usando
`02-CENARIOS.md` como modelo de matriz. Entregue um `06-REAUDITORIA.md` em `docs/qa/` com os achados novos — não os
corrija aqui.
Por que este caminho e não o óbvio: o óbvio é considerar o trabalho encerrado nas 299 etapas. As lacunas declaradas
são a parte do sistema sobre a qual ninguém sabe nada — e agora há condição de olhar.
Arquivos e objetos a tocar: cria `docs/qa/06-REAUDITORIA.md`.
Não tocar / armadilhas: não transforme esta etapa em correção; é levantamento. Nada de escrita em produção.
Depende de: 137, 299 · Libera: —
Risco e como reverter: zero.
Precisa de aprovação humana antes do merge: não
Como verificar: `npm run build` com saída registrada, a suíte E2E com o resultado registrado, e o documento com os
achados novos classificados por severidade.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
</modelo_etapa>

---

## Encerramento do plano

**300 etapas, todas derivadas dos 103 achados de `03-ACHADOS.md`.** Nenhuma etapa foi criada para preencher
contagem: cada uma cita os achados que resolve, e `docs/qa/cobertura-achados.md` (etapa 299) é a conferência de que
a relação fecha nos dois sentidos.

**Backlog (não entrou nas 300, por decisão de prioridade):**
- Converter as ~95 edge functions restantes ao helper de erro **uma a uma** em vez de em lotes (as etapas 208–210
  cobrem em lotes de 5; o detalhamento por função seria mais 19 etapas sem ganho de clareza).
- Fechar, objeto por objeto, os 477 itens visíveis no GraphQL para usuário logado (ACH-057): as etapas 050 e 051
  tratam os schemas internos e entregam a lista do resto para decisão do dono, porque fechar `public` em massa
  quebraria o aplicativo.
- Classificar e fechar, uma a uma, as ~138 policies de leitura livre (ACH-056): as etapas 046–049 tratam as maiores
  e criam o gate que impede a 139ª; o resto depende da decisão registrada na etapa 048.
- Corrigir, caso a caso, os itens que as varreduras das etapas 092, 159, 184, 187, 211, 222, 228 e 252 vão produzir:
  são listas que só existem depois de rodadas, por isso entram no `05-PROGRESSO.md` como etapas derivadas, não aqui.
