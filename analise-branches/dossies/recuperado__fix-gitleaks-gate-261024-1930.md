# origin/recuperado/fix-gitleaks-gate-261024-1930

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** media
- **O que isso faz pelo negocio:** Nada hoje — era um ajuste do alarme de senhas vazadas do CI, e esse alarme ja esta funcionando sem erro falso na versao atual do sistema.
- **Tip / merge-base / main:** tip `1dc284853c4e04d2daf21d9a14cd78630a6a3f9b` · merge-base `71d624e8a57b894dd09911217ed49fb643e3f5f8` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit, que toca um unico arquivo (`.gitleaks.toml`). O gitleaks e o detector de
segredos (senhas/chaves) do CI: ele bloqueia o merge quando acha algo parecido com uma chave.
O problema que a branch atacava: ele estava acusando *falso positivo* — tokens de mentira usados
em testes e em documentacao (`abc123def456`, `sup-tok-abc123`, `AKIA1234567890ABCDEF`,
`YOUR_JWT_TOKEN`, etc.).

A solucao da branch foi listar esses 10 textos de mentira numa lista de excecoes por **expressao**
(`regexes`), e o proprio autor registrou na mensagem do commit que o resto ja estava na main:
"Paths ja cobertos pelo main (docs/, tests/, audit/, migrations 194*)" e "Binary download do
gitleaks ja em main (deploy-gates.yml) — nao replicado". Era branch substituta de
`claude/fix-gitleaks-gate-261019-1800` (PR #2418 "dirty").

A branch nunca teve PR: `github_list_pull_requests` com
`head=adm01-debug:recuperado/fix-gitleaks-gate-261024-1930`, `state=all` → `[]`.

Enquanto isso a main seguiu outro caminho para o **mesmo objetivo**: excecao por **caminho de
arquivo** (`paths`) e por **commit historico**. A main de hoje tem 3 caminhos a mais que a branch
(`analise-prs/.*`, `dist/.*`, `e2e/.*` — `.gitleaks.toml:43,60,66`) e 18 commits na lista de
excecoes contra os 2 da branch (`.gitleaks.toml:81-104`), inclusive a classificacao (a)/(b)/(c)/(d)
e as marcacoes `[ROTACIONAR]`. Ou seja: a main esta a frente, nao atras.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| **Objetivo da branch: gate de segredos verde, sem falso positivo** | ATINGIDO na main, por outro mecanismo | Run `43778393242` no tip `e4ab7f85d9` — job "Gate E23 - Secret Scan (gitleaks)" `conclusion: success`, com o passo "Run gitleaks" executado de verdade (00:07:56→00:08:08). E o workflow "Gitleaks — Full History Audit" (run `43778393123`, mesmo sha) tambem `success` |
| regex `YOUR_JWT_TOKEN` | Desnecessaria: so ocorre em `docs/ROBOFLOW_SETUP.md`, coberto por `docs/.*` | `git grep -ln` → unico arquivo; `.gitleaks.toml:39` |
| regex `AKIA1234567890ABCDEF` | Desnecessaria: so ocorre em `docs/redeploy/REDEPLOY-FASE2-EXECUTION-LOG.md`, coberto por `docs/.*`; a main ainda cita o caso AKIA ao liberar `analise-prs/.*` | `.gitleaks.toml:39` e `.gitleaks.toml:61-63` |
| regex `anon-key-12345678` | Desnecessaria: so em `supabase/functions/_shared/credentials.test.ts`, que a main libera **nominalmente** | `.gitleaks.toml:52-53` |
| regex `sup-tok-abc123` | Desnecessaria: so em `tests/edge-functions/integration/step-up-verify.test.ts`, coberto por `tests/.*` | `.gitleaks.toml:45` |
| regex `idem-duplicate-test-001` | Desnecessaria: so em `tests/integration/freight-quest/quote-freight-integration.test.ts`, coberto por `tests/.*` | `.gitleaks.toml:45` |
| regex `a1b2c3d4e5f60718293a4b5c6d7e8f90` | Desnecessaria: so em `src/services/__tests__/magazinePublish.fuzz.test.ts`, coberto por `src/services/__tests__/.*` | `.gitleaks.toml:49` |
| regex `h\.eyJzdWIiOiJ1MSJ9\.s` | Desnecessaria: so em `src/pages/__tests__/SSOCallbackPage.test.tsx` e `...race.test.tsx`, cobertos por `src/pages/__tests__/.*` | `.gitleaks.toml:46-47` |
| regex `abc123def456` | Desnecessaria: ocorre em `src/lib/webhook-events-payload-samples.ts` (liberado nominalmente), `src/pages/__tests__/`, `tests/` e em `.md` de `analise-branches/`; a main cita essa string ao liberar `dist/.*` | `.gitleaks.toml:50-51`, `:58-60`; gate verde no run `43778393242` cobre tambem os `.md` de `analise-branches/` |
| regex `eyJzdWIiOiIxMjM0NTY3ODkw` | **Nao esta** na main e **nao e necessaria**: fora dos caminhos liberados ela so aparece em `scripts/ai-context/cenarios.mjs:119`, dentro de um cenario de teste do proprio detector ("segredos: detecta JWT/sk_live, ignora exemplo"), e o gate passa | `scripts/ai-context/cenarios.mjs:119`; run `43778393242` verde |
| regex `SERVICE_ROLE_KEY` | **Nao esta** na main e **nao e necessaria**: nos workflows a ocorrencia e so a referencia ao segredo (`SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}`), sem valor — o gitleaks nao acusa | `.github/workflows/ci.yml:123`; run `43778393242` verde |
| lista `commits` (2 shas da branch) | Na main, com mais 18 shas e classificacao (a)-(d) + `[ROTACIONAR]` | `.gitleaks.toml:81-104` |
| `description` do allowlist / comentarios de secao | NAO ESTA (texto cosmetico) | `.gitleaks.toml:18` |

## A resgatar

Nada. As duas unicas entradas exclusivas da branch (`SERVICE_ROLE_KEY` e
`eyJzdWIiOiIxMjM0NTY3ODkw`) nao tem efeito pratico hoje — e, por serem excecoes amplas por texto
em vez de excecoes por arquivo, aplica-las **enfraqueceria** o detector de segredos (passariam a
silenciar qualquer achado cujo valor contenha esses trechos, inclusive num arquivo novo de
producao). O caminho que a main escolheu — liberar por arquivo/pasta — e mais estreito e mais
seguro.

## Risco de fechar esta branch

Praticamente nulo. Essa branch nao entrega nenhuma funcionalidade, tela, regra de negocio ou dado:
so mexe na lista de excecoes do detector de segredos do CI, e essa lista na main de hoje esta mais
completa que a da branch. O detector esta rodando e passando no ultimo commit da main (run
`43778393242`, 2026-11-16), portanto fechar nao reintroduz bloqueio de merge nem apaga trabalho.

Risco residual, que nao depende desta branch: se amanha algum arquivo **fora** das pastas
liberadas (`docs/`, `tests/`, `audit/`, `analise-prs/`, `dist/`, `e2e/`, `src/**/__tests__/`)
passar a conter um desses tokens de mentira, o alarme pode voltar a bloquear um merge por engano —
e a correcao certa sera liberar aquele arquivo, nao ressuscitar as excecoes amplas desta branch.
Observacao de higiene (defeito vivo na main, nao desta branch): `analise-prs/.*` aparece duplicado
em `.gitleaks.toml:43` e `:63`.

## Nao verificado

- Nao executei o gitleaks nesta maquina (binario nao instalado: `which gitleaks` → exit 1) e nao
  posso mudar o working tree, logo nao provei regra-por-regra, em isolamento, que cada uma das 10
  expressoes e dispensavel. A prova usada e comportamental e agregada: com a configuracao atual da
  main, **sem** essas 10 expressoes, o gate bloqueante "Gate E23 - Secret Scan (gitleaks)" e o
  "Gitleaks — Full History Audit" passam no tip `e4ab7f85d9`. Se algum dia o gate voltar a acusar
  um desses tokens, o item deixa de ser dispensavel.
- Nao avaliei se as chaves marcadas `[ROTACIONAR]` em `.gitleaks.toml:87-103` ja foram rotacionadas
  em producao — esta fora do escopo desta branch (e pendencia do dono, registrada em PENDENCIAS.md).
