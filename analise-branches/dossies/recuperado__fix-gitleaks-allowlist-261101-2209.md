# origin/recuperado/fix-gitleaks-allowlist-261101-2209

- **Veredito:** DECISAO_HUMANA  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Pede para o sistema de alarme de senhas vazadas ignorar 10 textos que o agente considerou "falso alarme" — hoje o alarme ja passa limpo sem essa lista, e aceitar a lista afrouxa a vigilancia de seguranca; quem decide isso e o dono, nao o agente.
- **Tip / merge-base / main:** tip `447d8316f5ec01810a6eeef68d54891123e2ffc9` · merge-base `4c6541b6f5fab4205600472bc086c2f603a69312` (2026-11-01) · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c` (2026-11-15)

## O que a branch quis fazer

Um unico commit (`447d8316f5`, 2026-11-01): *"fix: adiciona 10 entradas de falsos-positivos ao allowlist do
gitleaks"*, com o corpo afirmando que as entradas foram "auditadas uma a uma — todas sao placeholders de
docs ou mock tokens de testes, nenhuma silencia segredo operacional real".

Na pratica, a branch mexe em **um unico arquivo**, `.gitleaks.toml`, e acrescenta 10 expressoes a lista
`[allowlist] regexes` (textos que o scanner de segredos deve ignorar onde quer que apareçam):
`SERVICE_ROLE_KEY`, `YOUR_JWT_TOKEN`, `abc123def456`, `anon-key-12345678`, `sup-tok-abc123`,
`idem-duplicate-test-001`, `h\.eyJzdWIiOiJ1MSJ9\.s`, `eyJzdWIiOiIxMjM0NTY3ODkw`, `AKIA<exemplo-redigido>`,
`a1b2c3d4e5f60718293a4b5c6d7e8f90`. Tambem reescreve a `description` da secao e adiciona dois comentarios
de titulo. Nenhuma mudanca de codigo, banco, edge function ou workflow.

### Fato decisivo sobre a main

O arquivo `.gitleaks.toml` da main de hoje e **byte a byte igual ao do merge-base**:

```
git rev-parse 4c6541b6:.gitleaks.toml origin/main:.gitleaks.toml
797f3cb26ab0eb6aa99bc732ee191483579a0cf7   <- merge-base
797f3cb26ab0eb6aa99bc732ee191483579a0cf7   <- main
```

Ou seja: desde 2026-11-01 nada entrou nesse arquivo na main. As 10 entradas **nao estao na main** — nem
como texto, nem refatoradas. O ultimo commit da main nesse arquivo e `3f336c4f61` (2026-10-31),
*"fix(security): remove exceção overly broad scripts/.* do gitleaks"*, ou seja, um dia antes desta branch a
main andou na direcao **oposta**: estreitou as excecoes do scanner por decisao de seguranca.

### Fato decisivo sobre a necessidade

O portao de CI que faz a varredura completa da arvore com essa config —
`Gate E23 - Secret Scan (gitleaks)`, que roda `gitleaks detect --source . --config .gitleaks.toml
--exit-code 1 --no-git` (`.github/workflows/deploy-gates.yml:846-867`) — esta **verde na main de hoje**,
sem nenhuma das 10 entradas:

```
run 43778393242 (branch main, 2026-11-16T00:07:35Z)
"Gate E23 - Secret Scan (gitleaks)" -> conclusion: success
```

O mesmo vale para o job de varredura por PR em `security.yml` (restaurado em 2026-11-02, depois desta
branch): ultimas execucoes na main com `conclusion: success`.

O motivo e que 8 dos 10 textos moram em pastas que a main **ja** isenta pela lista `paths` (que existia
desde o merge-base — logo as entradas da branch ja eram em grande parte redundantes quando foram escritas).

## Item por item: esta na main?

| item (entrada adicionada) | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| `description` "+ falsos-positivos documentados" + 2 comentarios de titulo | NAO ESTA (cosmetico) | `origin/main:.gitleaks.toml:19` ainda diz "Chaves publishable do Supabase (valores publicos embutidos nos bundles)" |
| `YOUR_JWT_TOKEN` | Efeito ja coberto: unica ocorrencia e `docs/ROBOFLOW_SETUP.md`, e `docs/.*` esta em `paths` | `git grep -l YOUR_JWT_TOKEN origin/main` -> so `docs/ROBOFLOW_SETUP.md`; `origin/main:.gitleaks.toml` paths `'''docs/.*'''` |
| `AKIA<exemplo-redigido>` | Efeito ja coberto: unica ocorrencia em `docs/redeploy/REDEPLOY-FASE2-EXECUTION-LOG.md` (`docs/.*` isento) | `git grep -l AKIA<exemplo-redigido> origin/main` -> so esse arquivo |
| `anon-key-12345678` | Efeito ja coberto: unica ocorrencia em `supabase/functions/_shared/credentials.test.ts`, caminho isento nominalmente | paths `'''supabase/functions/_shared/credentials\.test\.ts'''` |
| `sup-tok-abc123` | Efeito ja coberto: so `tests/edge-functions/integration/step-up-verify.test.ts` (`tests/.*` isento) | `git grep -l sup-tok-abc123 origin/main` |
| `idem-duplicate-test-001` | Efeito ja coberto: so `tests/integration/freight-quest/quote-freight-integration.test.ts` | `git grep -l idem-duplicate-test-001 origin/main` |
| `a1b2c3d4e5f60718293a4b5c6d7e8f90` | Efeito ja coberto: so `src/services/__tests__/magazinePublish.fuzz.test.ts` (`src/.*__tests__.*` isento) | `git grep -l a1b2c3d4e5f60718293a4b5c6d7e8f90 origin/main` |
| `h\.eyJzdWIiOiJ1MSJ9\.s` | Efeito ja coberto: so `src/pages/__tests__/SSOCallbackPage.test.tsx` e `.race.test.tsx` | `git grep -l eyJzdWIiOiJ1MSJ9 origin/main` |
| `abc123def456` | Efeito ja coberto nos caminhos de teste/fixture (`src/lib/webhook-events-payload-samples.ts`, `src/pages/__tests__/`, `tests/`), todos isentos por `paths`; aparece tambem em `analise-branches/auditoria-261115/*.md`, pasta **nao** isenta — mas o Gate E23 esta verde assim mesmo | `git grep -l abc123def456 origin/main`; run 43778393242 E23 success |
| `eyJzdWIiOiIxMjM0NTY3ODkw` (JWT exemplo do jwt.io) | **NAO ESTA** e o caminho **nao** e isento: `scripts/ai-context/cenarios.mjs:119` (a main tirou `scripts/.*` dos paths em `3f336c4f61`). Ainda assim o portao esta verde | `git grep -n eyJzdWIiOiIxMjM0NTY3ODkw origin/main -- scripts/ai-context/cenarios.mjs` -> linha 119; run 43778393242 E23 success |
| `SERVICE_ROLE_KEY` | **NAO ESTA** e e a entrada mais larga: o texto aparece em 20+ arquivos fora das pastas isentas (`.env.example`, 6 workflows em `.github/workflows/`, `README.md`, `PENDENCIAS.md`, `auditoria-supabase/**`, `analise-branches/**`). Ainda assim o portao esta verde | `git grep -l SERVICE_ROLE_KEY origin/main` (lista acima); `.github/workflows/ci-security-drift.yml:81` `SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}`; run 43778393242 E23 success |

Resumo: **nenhuma** das 10 entradas esta na main. 8 delas nao fazem falta porque a main ja isenta esses
arquivos por caminho. As 2 restantes (`SERVICE_ROLE_KEY` e o JWT de exemplo) tambem nao fazem falta hoje,
porque o portao de varredura completa passa verde sem elas.

## A resgatar

Nada tecnico precisa ser resgatado para o CI voltar a ficar verde — ele ja esta. O que existe e uma
**decisao de seguranca para o dono**, com dois itens:

1. `.gitleaks.toml` — entrada `SERVICE_ROLE_KEY`. Pedir ao alarme para ignorar qualquer achado que contenha
   o texto `SERVICE_ROLE_KEY` e a entrada mais larga do pacote: `SUPABASE_SERVICE_ROLE_KEY` e justamente o
   nome da chave mais poderosa do banco (acesso total, ignora as regras de permissao). Se um dia alguem
   colar a chave real ao lado desse nome, essa regra aumenta o risco de o alarme nao apitar. Hoje ela nao e
   necessaria (portao verde). **Recomendacao: nao resgatar.**
2. `.gitleaks.toml` — entrada `eyJzdWIiOiIxMjM0NTY3ODkw` (JWT de exemplo publico do jwt.io, em
   `scripts/ai-context/cenarios.mjs:119`). E estreita e inofensiva, mas tambem nao e necessaria hoje. Se um
   dia o alarme passar a apitar nesse arquivo, esta e a correcao certa — e ela e estreita o suficiente para
   ser recriada em 1 linha. **Recomendacao: resgatar somente se o alarme apitar.**

As outras 8 entradas nao devem ser resgatadas: sao redundantes com a isencao por pasta que a main ja tem.

## Risco de fechar esta branch

Baixo e mensuravel. Fechar nao muda nada em producao (a branch nao toca codigo, banco, edge function nem
workflow) e nao deixa o CI vermelho (Gate E23 verde na main em 2026-11-16 sem essas entradas). O unico
custo e perder a *auditoria escrita* de 10 falsos-positivos — e o conteudo dessa auditoria esta preservado
neste dossie, item por item, com o arquivo onde cada texto mora.

O risco de **nao** fechar (isto e, de mergear) e maior e vai na contramao de uma decisao de seguranca
recente da propria main: em 2026-10-31 a main removeu de proposito uma excecao larga do scanner
(`3f336c4f61`, "remove exceção overly broad scripts/.*"); mergear este pacote reintroduz excecoes largas —
em especial `SERVICE_ROLE_KEY`. Alem disso, `.gitleaks.toml` e arquivo de governanca pelo AGENTS.md
(Git 10): so entra por PR com o dono/CODEOWNER olhando. Por isso o veredito e **DECISAO_HUMANA** e nao
"fechar": a escolha de afrouxar ou nao o alarme de segredos e do dono, nao de um agente.

## Nao verificado

- **Por que** o gitleaks nao apita hoje em `scripts/ai-context/cenarios.mjs:119` (JWT completo em pasta nao
  isenta) e nas ocorrencias de `SERVICE_ROLE_KEY` fora das pastas isentas. O binario `gitleaks` nao esta
  instalado nesta maquina (`which gitleaks` -> vazio), logo nao reproduzi a varredura localmente; a prova de
  que nao apita e empirica (job E23 verde), nao analitica das regras.
- O efeito exato de uma entrada em `[allowlist] regexes` sobre cada regra do gitleaks (o alvo do casamento
  pode ser o segredo capturado, a linha ou o match). A afirmacao de que `SERVICE_ROLE_KEY` "aumenta o risco"
  e julgamento de engenharia pelo tamanho da expressao, nao medicao.
- Se o commit `447d8316f5` chegou a ter PR aberta ou revisao: nao consultei o historico de PRs desta branch
  (`recuperado/*` indica branch recuperada depois de apagada). Nao ha PR aberta hoje para `.gitleaks.toml`
  (7 PRs abertas listadas via REST, nenhuma com esse nome de branch).
- Arquivos sem leitura por truncamento: 0 (o pacote nao estava truncado; 1 de 1 arquivo lido integralmente).
