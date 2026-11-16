# origin/claude/fix-e2e-fora-do-banco-de-producao-261114-1003

- **Veredito:** DECISAO_HUMANA  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** impede que os testes automáticos do site, rodando a cada alteração, fiquem batendo no banco de dados que atende os clientes de verdade — hoje eles ainda batem.
- **Tip / merge-base / main:** tip `0375e6ce8d0f46d31b9a24f5378d745e6d90061c` · merge-base `74e26506410beb97490d760ab1c1f618c30368f7` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um único commit (`0375e6ce8d`, 14/11). A mensagem relata o incidente que a motivou: nas edge
logs de 14/11 entre 08:00 e 10:30Z, `/rest/v1` recebeu **112.095 requisições com Referer
localhost** (runners do GitHub Actions, ASN Microsoft/Amazon) contra **287 de usuários reais** —
cerca de 97% do tráfego do banco de produção vinha da própria esteira de testes.

A causa que a branch aponta tem duas pernas:
1. os workflows de E2E montavam a URL do banco a partir de `secrets.VITE_SUPABASE_URL`, que é a
   URL de produção, com *fallback* também para produção
   (`origin/main:docs/ci/SEGREDOS.md:62` — "`https://doufsxqlfjyuvxuezpln.supabase.co` — não rotar
   sem mudança de projeto");
2. a guarda SSOT de `src/integrations/supabase/client.ts` recusa qualquer projeto que não seja o
   canônico, então **não existia forma de apontar o E2E para outro banco** mesmo querendo.

A solução da branch (22 arquivos, +116/−45):
- `_e2e-relevance.yml` passa a devolver `relevant=false` quando `vars.SUPABASE_E2E_PROJECT_REF`
  está ausente ou é igual à produção — e o Gate 3 do `deploy-gates.yml` então cai no *bypass* que
  já existe ("Gate 3 aprovado sem acessar o Supabase de produção",
  `origin/main:.github/workflows/deploy-gates.yml:600-602`);
- 18 workflows de E2E ganham `if:` por job com a mesma regra (nunca roda contra produção);
- URL e chave do E2E passam a vir de `vars.SUPABASE_E2E_PROJECT_REF` e
  `secrets.VITE_SUPABASE_PUBLISHABLE_KEY_E2E`, **sem fallback para produção**;
- `client.ts` aceita um projeto de *staging* só com opt-in explícito de build
  (`VITE_SUPABASE_E2E_PROJECT_ID`) e só se a URL for exatamente a daquele projeto;
- 2 testes novos cobrem os dois casos (com e sem opt-in);
- `docs/ci/SEGREDOS.md` documenta a variável e o secret novos.

A main resolveu **o mesmo problema por outro caminho**: tirou o gatilho `pull_request` de todos os
workflows de E2E ("E2E fora dos PRs (14/11): os PRs apontavam o E2E para o Supabase de produção e
sobrecarregavam o banco", comentário presente em `origin/main:.github/workflows/e2e.yml:9`). São
duas versões válidas que se contradizem — e é por isso que a decisão é do dono.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Intenção geral: parar o E2E de sobrecarregar produção | **Parcialmente, por outro caminho** — a main removeu o gatilho de PR de todos os 24 workflows de E2E/visual/nightly | `origin/main:.github/workflows/e2e.yml:9` (comentário "E2E fora dos PRs (14/11)"); varredura dos 24 workflows de E2E/nightly/visual em `origin/main`: **zero** com gatilho `pull_request:` |
| Parar o E2E que roda no **check obrigatório** de cada PR | **NAO ESTA** — `Gate 3 - E2E Smoke` do `deploy-gates.yml` continua rodando Playwright contra produção em todo PR | `origin/main:.github/workflows/deploy-gates.yml:574` e `:606` — `VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL \|\| 'https://doufsxqlfjyuvxuezpln.supabase.co' }}`. Workflow **ativo** (API Actions: `active .github/workflows/deploy-gates.yml`) e rodou de verdade: run `43777513024` (PR, 2026-11-15T23:56Z) → job `Gate 3 - E2E Smoke` `success`, 23:57:17 → 00:04:11 (≈7 min de Playwright, não o bypass de 10s) |
| `requires_backend` como input de `_e2e-relevance.yml` | **NAO ESTA** | `git grep -n "requires_backend" origin/main -- .` → só menção em `analise-branches/auditoria-261115/veredito_lote03.md:172` (documento de auditoria, não código) |
| Regra `relevant=false` sem projeto de staging em `_e2e-relevance.yml` | **NAO ESTA** | `git grep -n "SUPABASE_E2E_PROJECT_REF" origin/main -- .` → nenhuma ocorrência em `.github/`, `src/` ou `docs/` |
| `if:` por job barrando E2E contra produção (18 workflows) | **NAO ESTA** | idem acima — nenhum `vars.SUPABASE_E2E_PROJECT_REF` em `origin/main:.github/workflows/` |
| Remoção do fallback para produção na URL/chave do E2E | **NAO ESTA** — o fallback literal para `doufsxqlfjyuvxuezpln` segue em 20 workflows | `origin/main:.github/workflows/e2e-cart.yml:82`, `e2e.yml:63`, `e2e.yml:209`, `nightly-full.yml:154`, `nightly-full.yml:223` |
| Secret `VITE_SUPABASE_PUBLISHABLE_KEY_E2E` | **NAO ESTA** (nem no código nem na documentação) | `git grep -n "VITE_SUPABASE_PUBLISHABLE_KEY_E2E" origin/main -- .` → só o documento de auditoria |
| Opt-in de staging em `client.ts` (`VITE_SUPABASE_E2E_PROJECT_ID`, URL exata, regex `^[a-z0-9]{20}$`, recusa o id de produção) | **NAO ESTA** | `git grep -n "VITE_SUPABASE_E2E_PROJECT_ID" origin/main -- .` → só o documento de auditoria. `origin/main:src/integrations/supabase/client.ts` mantém `if (!isLocal && !isPlaceholder && !envUrl.includes(CURRENT_PROJECT_ID))` sem a condição `isE2EProject` |
| 2 testes em `ssot-fallback.test.ts` ("aceita o projeto de staging do E2E só com opt-in explícito e URL exata" / "sem opt-in, URL de staging cai no canônico") | **NAO ESTA** | nenhum dos dois nomes de teste existe em `origin/main:src/integrations/supabase/__tests__/ssot-fallback.test.ts` (diff B do pacote remove os 2 blocos) |
| Linhas de `docs/ci/SEGREDOS.md` documentando `vars.SUPABASE_E2E_PROJECT_REF` e o secret de staging | **NAO ESTA** | as 2 linhas das tabelas (após `:62` e após `:124`) não existem em `origin/main:docs/ci/SEGREDOS.md` |

Observação de contexto, não de código: **todos** os workflows de E2E autônomos estão hoje
`disabled_manually` na API do GitHub (`e2e*.yml`, `nightly-full.yml`, `delivery-quality.yml`,
`replenishment-quality.yml`) — o que reduz o dano imediato dessas 20 ocorrências de fallback. O que
está `active` e continua batendo em produção é o `deploy-gates.yml` (check obrigatório) e o
reusable `_e2e-relevance.yml`.

## A resgatar

Nada desta branch entrou na main. Os itens, em ordem de valor:

1. **`.github/workflows/_e2e-relevance.yml`** — a regra `relevant=false` sem projeto de staging. É
   a única peça que fecha o buraco que ainda está aberto: o E2E do check obrigatório de cada PR.
   Sem ela, todo PR continua gerando tráfego de teste no banco dos clientes. Efeito ao mergear:
   imediato e sem quebrar o portão (o Gate 3 cai no bypass que já existe na main e segue verde).
2. **`src/integrations/supabase/client.ts`** — o opt-in que torna *possível* apontar o teste para um
   banco de staging. Sem isso, qualquer projeto de staging que o dono criar é inútil: a guarda SSOT
   devolve o teste para produção. **Arquivo do Gate 0** — a constante `CURRENT_PROJECT_ID` e a
   guarda não são alteradas; o opt-in exige URL exata e recusa o id de produção.
3. **`src/integrations/supabase/__tests__/ssot-fallback.test.ts`** — os 2 testes que travam o
   comportamento do item 2 (com e sem opt-in). Sem eles, o opt-in pode ser afrouxado depois sem
   ninguém perceber.
4. **18 workflows de E2E (`e2e*.yml`, `nightly-full.yml`, `delivery-quality.yml`,
   `replenishment-quality.yml`, `visual-tests.yml`)** — remoção do fallback para produção e o `if:`
   por job. Valor menor **hoje** (esses workflows estão desligados), valor alto **no dia em que
   forem religados**: sem isso, religar o E2E recria o incidente de 14/11 em silêncio.
5. **`docs/ci/SEGREDOS.md`** — as 2 linhas que explicam a variável e o secret de staging. Sem elas,
   quem for configurar não sabe o que cadastrar.

## Risco de fechar esta branch

- **O problema que ela resolve está vivo, medido e reincidente.** O check obrigatório de todo PR
  (`Gate 3 - E2E Smoke`) rodou 7 minutos de Playwright contra o banco de produção ontem às 23:57Z
  (run `43777513024`). Fechar a branch é aceitar que o banco que atende os clientes continua sendo
  o banco de teste da esteira — com o risco de lentidão no site e de lixo de teste em dados reais.
- **Perde-se a única peça que torna o conserto possível.** O opt-in de `client.ts` é o que destrava
  usar um banco de staging; sem ele, mesmo que o dono pague por um projeto de staging amanhã, a
  esteira volta sozinha para produção.
- **O conserto da main é parcial e frágil.** Ela tirou o E2E dos PRs, o que apaga o volume maior,
  mas (a) não cobre o check obrigatório e (b) custou a cobertura de teste antes do merge — defeitos
  passam a ser descobertos só depois de estar em produção.

## O que o dono precisa decidir (é por isso que o veredito é DECISAO_HUMANA)

1. **Custo:** criar e pagar um projeto Supabase de *staging*, com o schema aplicado e os usuários
   `E2E_*` existindo nele. Sem isso a branch funciona, mas em modo "pula tudo".
2. **Cobertura:** aceitar que, até esse projeto existir, todo E2E com backend é **pulado** e o
   portão fica verde sem ter testado — verde silencioso. Hoje o custo real disso é baixo (os
   workflows de E2E já estão desligados), mas é uma escolha, não um detalhe técnico.
3. **Qual dos dois caminhos vale:** o da main (E2E fora dos PRs, menos cobertura antes do merge) ou
   o da branch (E2E nos PRs, mas só contra staging). Dá para combinar os dois.
4. **Governança:** 19 workflows + um secret novo + `client.ts` (Gate 0) → cai em Git 7 e Git 10
   (PR fica aberta e chama o dono).

## Nao verificado

- **A branch está incompleta num ponto importante:** ela **não** altera
  `.github/workflows/deploy-gates.yml`. Hoje isso não aparece porque `relevant=false` desvia o Gate
  3 para o bypass; mas **no dia em que `vars.SUPABASE_E2E_PROJECT_REF` for cadastrado**,
  `relevant` volta a ser `true` e o Gate 3 roda com a URL de produção que segue codificada em
  `deploy-gates.yml:574` e `:606`. Falta uma linha equivalente nesse arquivo para o conserto ficar
  completo. (Verificado por leitura; não testado em execução.)
- **Se `vars.SUPABASE_E2E_PROJECT_REF` já está cadastrada no repositório:** não verificado — a API
  de variáveis do Actions é bloqueada pelo proxy desta sessão (HTTP 403). Pelo fato de nenhum
  arquivo da main referenciar a variável, o mais provável é que não exista.
- **Estado (ativo/desligado) de `visual-tests.yml`:** não verificado — a consulta à API falhou
  (HTTP 403) antes de retornar esse workflow.
- **Comportamento em execução** do conjunto mergeado (CI verde, testes passando): não executado.
  Nenhum comando de escrita foi rodado; análise 100% de leitura.
