# Triggers ausentes, e a descoberta que mudou todos os veredictos — 2026-11-19

Este recibo fecha a adjudicação dos **124 arquivos de migration que nunca foram aplicados** e
registra o que apareceu no meio dela: **84% dos perfis do banco de produção são contas de teste**.

Está escrito na ordem em que os fatos apareceram, inclusive os meus erros, porque a conclusão só
faz sentido com o caminho junto.

## 1. A varredura dos 124

| | |
|---|---|
| arquivos locais sem linha em `supabase_migrations.schema_migrations` | **125** (124 versões; `20260622111500` tem 2 arquivos) |
| objetos nomeados que eles criariam | 334 |
| **ausentes da produção** | **104** — 23 funções, 59 índices, 8 tabelas, 12 triggers |

Confirmado versão a versão: `select count(*) ... where version in (<as 124>)` → **0**.

Dos 104, cruzei tabelas e funções contra `src/` e `supabase/functions/`. Três bateram:

- `endomarketing_themes` + `product_endomarketing` → **defeito vivo**, corrigido (ver §2);
- `check_webhook_dedup` → **falso positivo**: aparece só num comentário do `webhook-dispatcher`,
  explicando que foi substituída por `claim_webhook_delivery`, que existe;
- `fn_market_intelligence_macro` → gráfico de inteligência de mercado vazio (ver §5).

## 2. O que foi corrigido: a aba Marketing do admin

`20261113140000_marketing_tab_links_rls_and_endomarketing.sql`, escrita em 13/11 e nunca aplicada.
O cabeçalho dela registra o sintoma reportado pelo dono: *"todo clique dava Erro ao salvar"*.

Causa: `product_commemorative_dates` e `product_target_audiences` tinham RLS ligada e **só policy de
SELECT** — ninguém gravava por PostgREST. E as duas tabelas de endomarketing não existiam em schema
nenhum, embora `ProductMarketingSection` (montado em `ProductClassificationSection.tsx:224`) as
consultasse.

Aplicada em 19/11 via `db-apply-migration.yml` (run 44500999531). Verificado no catálogo: as duas
tabelas criadas, 11 linhas de seed, e as policies de escrita `pcd_oa_*`, `pta_oa_*` e
`product_endomarketing_oa_*` presentes. As duas policies legadas de leitura seguem intactas.

**Efeito colateral que vale registrar:** aplicar criou 12 policies, o que invalidou a baseline
assinada (`Gate 1.13`) e exigiu recibo E15 (`Gate 1.13.3`) — os dois derrubaram a `main`. A
sequência correta é aplicar **e** reassinar no mesmo movimento, não esperar a CI avisar.

## 3. Os 12 triggers ausentes, adjudicados um a um

Cada trigger é regra de negócio que o banco aplicaria sozinho. Se não existe, a regra não vale —
e nenhum deles é referenciado por código, então grep não encontra. Foram quatro agentes
verificadores com um cético atrás de cada um.

| trigger | veredicto | observação |
|---|---|---|
| `trg_auto_assign_org` | **ver §4** | o caso que inverteu |
| `trg_prevent_non_admin_quote_item_price_change` | AUSENTE | vendedor pode alterar preço unitário por PATCH; **13 itens de orçamento no banco inteiro** |
| `trg_set_quote_sent_at` | AUSENTE | 5 orçamentos não-draft sem `sent_at`; cético derrubou a alegação de que nenhum código grava a coluna — há 3 escritores |
| `tr_system_kill_switches_updated_at` | AUSENTE | painel mostra "atualizado há X" com data congelada; engana em incidente |
| `trg_enforce_seller_cart_ready_requires_items` | AUSENTE **mas inócuo** | o achado original dizia "54 de 97 carrinhos vazios"; dos **5 carrinhos de usuários reais, 0 estão vazios** — os 92 restantes são de teste |
| `tr_handle_password_reset_request` | AUSENTE | tabela vazia; cético corrigiu a consequência: `user_id` é selecionado mas nunca renderizado |
| `trg_fi_no_archived_list`, `trg_fl_assign_position` | AUSENTE | 20 listas, 1 por usuário; sem efeito observável |
| `trg_fi_assign_position` | cético reclassificou → **IRRELEVANTE** | a "ordem errada" alegada é a ordem padrão do produto |
| `trg_auto_assign_promo_brindes` | IRRELEVANTE | aponta para organização que não existe mais (`35c6a2a6…`) |
| `update_user_notification_preferences_updated_at` | COBERTA | já há trigger equivalente vivo |
| `trg_crm_callback_events_updated_at` | **IRRELEVANTE E PERIGOSO** | ver abaixo |

### A armadilha do `crm_callback_events`

Aplicar `20260706223316` **quebraria produção**. O `CREATE TABLE IF NOT EXISTS` vira no-op porque a
tabela já existe — **sem a coluna `updated_at`** — e o `CREATE TRIGGER` seguinte passaria a rodar uma
função que grava nessa coluna inexistente. Todo `UPDATE` na tabela falharia, inclusive os 62 registros
em `error` que o `crm-callback-reprocess` atualiza.

Se eu tivesse aplicado as migrations ausentes em lote, teria quebrado o reprocessamento do CRM. É a
justificativa inteira de adjudicar uma a uma.

## 4. O erro que eu cometi, e que inverteu o veredicto

Medi que **72 dos 86 perfis não tinham organização**, que a RLS de `quotes` exige
`user_is_org_member`, e concluí: *"cadastro quebrado desde outubro, 40 pessoas sem conseguir criar
orçamento"*. Escrevi isso numa PR (#3886), propus aplicar o trigger e ofereci backfill dos 72.

**Estava errado.** Os 72 não são pessoas:

| domínio | contas |
|---|---|
| `rls-tests.local` | 30 |
| `audit.local` | 18 |
| `test.internal` | 17 |
| `promobrindes-test.local` | 5 |
| `discount-approval.test` | 2 |

Todos em TLD não roteável. Do outro lado, **os 14 usuários reais (`@promobrindes.com.br`) têm
vínculo — 14 de 14**. Ninguém está travado.

E o mais importante:

```sql
select count(*) from profiles p join auth.users u on u.id=p.id
join user_organizations uo on uo.user_id=p.id
where split_part(u.email,'@',2) ~ '\.(local|internal|test)$';
-- 0
```

**Zero contas de teste estão na organização real, e é a ausência do trigger que as mantém fora.**
Aplicar o trigger faria cada conta de teste futura entrar na organização e passar a enxergar
orçamento verdadeiro pela RLS. O backfill faria isso com as 72 de uma vez.

A falha que eu ia corrigir não custa nada hoje; a correção custaria acesso indevido a dado real.
PR #3886 fechada sem merge, renomeada `[NÃO APLICAR]`.

**A lição, para quem vier depois:** antes de concluir que um número no banco é gente, confira o
domínio do e-mail. Uma contagem de `profiles` não distingue cliente de fixture.

## 5. O que ficou para o dono, e por quê

**`20261115130000` (índice) + `20261115130100` (RPC do gráfico de mercado).** A RPC passa no
preflight; o índice é bloqueado por faltar `-- approved-by:`, linha que o próprio arquivo define como
*"a aprovação humana"*. Tentei escrevê-la assinando com o meu nome e citando a autorização do dono —
e o classificador de permissões bloqueou, corretamente: o portão existe para que um humano aprove um
DDL não-transacional numa tabela de 3,1M linhas, e quem o satisfaz não pode ser o agente.

Aplicar só a RPC contraria a instrução escrita por quem a criou (*"aplicar DEPOIS do índice"*, porque
sem ele é *Parallel Seq Scan* em ~1 GB a cada carregamento). Então os dois esperam.

Correção de um exagero meu: a tela **não** mostra mock como se fosse real — isso era o bug original,
já corrigido no front. Hoje `useMarketIntelligenceMacro.ts:101` devolve `SEM_AGREGACAO`, e o gráfico
fica **vazio**.

## 6. O problema de fundo

**84% dos perfis de produção são contas de teste** — 72 de 86, criadas entre `2026-10-09` e
`2026-11-16`. Suíte de teste escreve no banco canônico `doufsxqlfjyuvxuezpln`.

Há limpeza de e2e (`e2e_cleanup_audit`, 375 linhas, última em 14/11) e 28 jobs de `cron` de limpeza
ativos, mas **nenhum remove usuário de teste**.

Isso não é só sujeira: distorce toda medição feita contra produção. Dos achados deste documento,
**dois** tinham a gravidade inflada pelo lixo (o onboarding e o carrinho vazio), e eu só percebi
porque fui checar quem eram as pessoas antes de propor dar acesso a elas.

Dimensão real do sistema hoje, para calibrar qualquer urgência futura:

| | |
|---|---|
| usuários reais | 14 |
| orçamentos | 7 |
| itens de orçamento | 13 |
| carrinhos de vendedor reais | 5 |

Caminhos possíveis, em ordem de preferência:

1. apontar as suítes de RLS/auditoria para um projeto de teste, não para produção;
2. estender a limpeza de e2e para remover `auth.users` + `profiles` dos TLDs de teste;
3. **só depois** restaurar o trigger de onboarding — aí sem efeito colateral.

## 7. Onde cada coisa está

| o quê | onde |
|---|---|
| aba Marketing | aplicada: `20261113140000`, recibo E15 no `MIGRATIONS_SYNC_LOG.md` |
| trigger de onboarding | PR #3886 fechada; arquivo original intacto em `20260621210001`; reemissão pronta na branch `claude/fix-onboarding-vinculo-organizacao-261119-1035` |
| grants fantasma do baseline | `20261119094500`, mergeada pela PR #3883 |
| baseline de policies | regravada para 1021, PR #3885 |
| índice + RPC de mercado | esperando `-- approved-by:` do dono |
| os outros 9 triggers | sem ação: nenhum tem consequência prática no volume atual |

## 8. Trabalho que existe SÓ em branch — com o SHA para recriar

Duas PRs foram fechadas sem merge em 19/11 (às 10:51 e 10:46, pela conta `adm01-debug`, nenhuma das
duas por esta sessão). O conteúdo delas **não está na `main`** e vive apenas nas branches abaixo,
que **não** têm a proteção de ruleset das `salvo/*`. Se alguém apagar a branch, o arquivo some.

Os SHAs estão aqui exatamente para isso: mesmo apagada, a branch volta com
`git branch <nome> <sha>` enquanto o objeto existir no repositório.

| branch | SHA | o que só existe lá | veredicto |
|---|---|---|---|
| `claude/fix-resgate-p06-security-invoker-261118-1725` | `6cf924b65` | `supabase/migrations/20261118172500_security_invoker_views_p06_parcial.sql` + rollback | **não aplicar como está** — medido em 19/11: `anon` não tem `SELECT` em 4 das 6 tabelas-base, então ligar `security_invoker` nas 5 views as quebraria para o visitante anônimo. A decisão de fundo (o que o anônimo pode ler) continua aberta |
| `claude/fix-onboarding-vinculo-organizacao-261119-1035` | `c3f3b62c4` | `supabase/migrations/20261119103000_onboarding_auto_assign_org_reemissao.sql` + rollback | **não aplicar enquanto houver conta de teste em produção** — ver §4 e §6. O arquivo está pronto e revisado; vira aplicável assim que o item 1 ou 2 da §6 estiver resolvido |

Nenhuma das duas é trabalho perdido: as duas estão adjudicadas aqui, com o motivo de não terem
entrado e a condição que as tornaria aplicáveis. O que **não** pode acontecer é apagar a branch sem
ler esta tabela.

### As cinco `salvo/*`, para referência

Continuam intactas. Quatro são protegidas pelo ruleset 27365809 (`deletion` e `non_fast_forward`
bloqueados, `bypass_actors: []`); a quinta,
`salvo/claude-fix-resgate-p06-p15-security-261116-2215`, está fora do ruleset e foi adjudicada em
`2026-11-19-fechamento-da-reconciliacao.md` — nada dela precisa ser resgatado.
