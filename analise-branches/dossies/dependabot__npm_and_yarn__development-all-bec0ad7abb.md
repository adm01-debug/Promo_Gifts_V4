# origin/dependabot/npm_and_yarn/development-all-bec0ad7abb

- **Veredito:** DECISAO_HUMANA  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Nada visivel para quem usa o site — e so uma atualizacao das ferramentas internas de desenvolvimento, proposta por um robo; do jeito que esta, ela trava a esteira de testes e nao pode entrar.
- **Tip / merge-base / main:** tip `a8966d1f672509ffaf7e449da4f14fb228404080` · merge-base `3d1e34fb166d585a2b4ed2c29e91d5556350ebf8` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit do `dependabot[bot]` (2026-11-13), `chore(deps)(deps-dev): Bump the development-all group across 1 directory with 10 updates`, mexendo em exatamente 2 arquivos (`git diff --stat 3d1e34f a8966d1`): `package.json` (20 linhas) e `package-lock.json`. Nenhum codigo de aplicacao, nenhum banco, nenhuma edge function.

A intencao era subir 10 dependencias **de desenvolvimento** (nenhuma roda em producao):

| Pacote | De | Para | Tipo |
|---|---|---|---|
| @eslint/js | 9.39.5 | 10.0.1 | major |
| eslint | 9.39.4 | 10.14.0 | major |
| eslint-plugin-react-hooks | 5.2.0 | 7.1.1 | major |
| @testing-library/jest-dom | 6.9.1 | 7.0.1 | major |
| jsdom | 30.1.3 | 31.0.0 | major |
| tailwindcss | 3.4.17 | 4.3.5 | major |
| @vitejs/plugin-react | 6.2.1 | 6.3.0 | minor |
| @typescript-eslint/eslint-plugin | 8.72.1 | 8.72.2 | patch |
| @testing-library/user-event | 14.6.8 | 14.6.9 | patch |
| vite | 8.3.6 | 8.3.7 | patch |

A PR correspondente e a **#3495**, aberta em 2026-11-13T07:24:15Z e **fechada sem merge** em 2026-11-13T07:42:17Z (`merged_at = None`, `merge_commit_sha` existe mas e so o merge de teste do GitHub).

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| @eslint/js 10.0.1 | NAO ESTA — main tem `^9.39.5` | `git show origin/main:package.json` → `"@eslint/js": "^9.39.5"` |
| eslint 10.14.0 | NAO ESTA — main tem `^9.17.0` | `git show origin/main:package.json` → `"eslint": "^9.17.0"` |
| eslint-plugin-react-hooks 7.1.1 | NAO ESTA — main tem `^5.1.0` | `git show origin/main:package.json` → `"eslint-plugin-react-hooks": "^5.1.0"` |
| @testing-library/jest-dom 7.0.1 | NAO ESTA — main tem `^6.9.1` | `git show origin/main:package.json` → `"@testing-library/jest-dom": "^6.9.1"` |
| jsdom 31.0.0 | NAO ESTA — main tem `^30.1.3` | `git show origin/main:package.json` → `"jsdom": "^30.1.3"` |
| tailwindcss 4.3.5 | NAO ESTA — main tem `^3.4.17` e segue com a arquitetura v3 | `git show origin/main:package.json` → `"tailwindcss": "^3.4.17"`; `origin/main:src/index.css:58-60` = `@tailwind base; @tailwind components; @tailwind utilities;`; `origin/main:postcss.config.js` usa `plugins: { tailwindcss: {} }`; `origin/main:tailwind.config.ts:5` usa `content: ["./src/**/*.{ts,tsx}"]` |
| @vitejs/plugin-react 6.3.0 | NAO ESTA — main tem `^6.2.1` | `git show origin/main:package.json` → `"@vitejs/plugin-react": "^6.2.1"` |
| @typescript-eslint/eslint-plugin 8.72.2 | NAO ESTA — main tem `^8.72.1` | `git show origin/main:package.json` → `"@typescript-eslint/eslint-plugin": "^8.72.1"` |
| @testing-library/user-event 14.6.9 | NAO ESTA — main tem `^14.6.8` | `git show origin/main:package.json` → `"@testing-library/user-event": "^14.6.8"` |
| vite 8.3.7 | NAO ESTA — main tem `^8.3.6` | `git show origin/main:package.json` → `"vite": "^8.3.6"` |
| trava de seguranca `braces >= 3.0.3` | ESTA NA MAIN, **nao** na branch | `git log -S'"braces": ">=3.0.3"' origin/main -- package.json` → `54826844aa 2026-11-15 fix(mockup): ... e trava do braces (#3676)`; o `overrides` da branch (`git show <tip>:package.json`) nao tem `braces` |

**Resumo honesto:** nenhuma das 10 subidas entrou na main. Os 2 arquivos nao sao "defasagem" — e trabalho que ficou de fora de verdade.

**Mas a branch, como esta, nao instala.** A esteira de CI do tip `a8966d1` terminou com 33 checks vermelhos de 85 (incluindo `Gate 1 - Lint + TypeScript`, `Gate 2 - Unit Tests`, `Lint, Typecheck & Test`, `quality-gate`, `visual-check`, `Gate Final - Deploy Ready`). O log do job `131757262933` mostra a causa raiz unica — o `npm` nem consegue montar as dependencias:

```
npm error code ERESOLVE
npm error While resolving: eslint-plugin-jsx-a11y@6.10.2
npm error Found: eslint@10.14.0
npm error Could not resolve dependency:
npm error peer eslint@"^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9" from eslint-plugin-jsx-a11y@6.10.2
```
(https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/43385527230/job/131757262933)

Ou seja: o robo subiu o `eslint` para a versao 10 sem subir o `eslint-plugin-jsx-a11y`, que so aceita ate a 9. E, mesmo que instalasse, o `tailwindcss` 4 exige reescrever `src/index.css`, `postcss.config.js` e `tailwind.config.ts` (a v4 trocou o plugin de PostCSS e o formato de configuracao) — a main continua 100% no formato v3, conforme as evidencias da tabela. Isso tambem explica o comentario automatico da propria PR: "Snapshots visuais dos dialogs divergiram" (run 43385527104).

Por isso o veredito e **DECISAO_HUMANA** e nao "resgatar e mergear": o que falta nao e trabalho esquecido, e uma decisao de custo/arquitetura (AGENTS.md, "Como trabalhar" item 2 e 4: bump major so se indispensavel, e pergunte em custo/arquitetura). Entrar na Tailwind 4 e um projeto proprio, com re-geracao de todos os baselines visuais.

## A resgatar

Separado em dois grupos, porque o risco e muito diferente:

**Grupo 1 — barato e seguro (pode entrar numa PR pequena, sem decisao do dono):**
1. `package.json` — `vite` 8.3.6 → 8.3.7 (correcao de bug, sem quebra).
2. `package.json` — `@typescript-eslint/eslint-plugin` 8.72.1 → 8.72.2 (correcao de bug, sem quebra).
3. `package.json` — `@testing-library/user-event` 14.6.8 → 14.6.9 (correcao de bug, sem quebra).
4. `package.json` — `@vitejs/plugin-react` 6.2.1 → 6.3.0 (menor, sem quebra anunciada).

**Grupo 2 — precisa de decisao e de trabalho de migracao (nao resgatar sozinho):**
5. `package.json` — `eslint` 9 → 10 + `@eslint/js` 9 → 10: bloqueado pelo `eslint-plugin-jsx-a11y@6.10.2` (prova no log acima). So entra junto com a troca/subida desse plugin.
6. `package.json` — `eslint-plugin-react-hooks` 5 → 7: muda regras ativas; o repo congela a contagem de erros em `.eslint-baseline.json` (298 erros, `totalErrors`), entao o portao `npm run lint` (= `scripts/check-eslint-baseline.mjs`) quebra ate o baseline ser regerado.
7. `package.json` + `src/index.css:58-60` + `postcss.config.js` + `tailwind.config.ts` — `tailwindcss` 3 → 4: migracao de arquitetura do CSS, com re-geracao dos baselines visuais.
8. `package.json` — `jsdom` 30 → 31 e `@testing-library/jest-dom` 6 → 7: majors da camada de testes; precisam rodar a suite inteira antes.

Observacao de seguranca para quem fizer o resgate: **nao** copie o `package.json` da branch por cima do da main — a branch e de 13/11 e nao tem a trava `braces >= 3.0.3` que a main ganhou em 15/11 (#3676). Aplique so as linhas de versao.

## Risco de fechar esta branch

Baixo, mas nao zero.

- Nenhuma funcionalidade do sistema depende disso: sao ferramentas de desenvolvimento. O site, o banco e as funcoes de borda nao mudam.
- A branch nao pode ser mergeada como esta (o `npm` nem instala), entao fechar nao "perde" nada que funcionasse.
- O que se perde ao fechar e apenas a lista de versoes — e o proprio Dependabot refaz essa lista automaticamente na proxima varredura, provavelmente com versoes ainda mais novas.
- Risco real de fechar e esquecer: as 4 subidas simples do Grupo 1 (correcoes de bug das ferramentas) ficam de fora, e os 6 majors do Grupo 2 somem do radar — isto e, o sistema vai acumulando atraso de ferramentas, o que um dia aparece como alerta de seguranca ou como impossibilidade de subir outra dependencia.
- Mitigacao: fechar a branch e levar ao dono a decisao do Grupo 2 (vale ou nao migrar para Tailwind 4 / ESLint 10 agora), mantendo o Grupo 1 como uma PR pequena.

## Nao verificado

- Nao testei nada localmente: a tarefa proibe alterar o working tree (sem `checkout`, sem `npm install`). Tudo acima vem de leitura do git e dos logs de CI ja executados.
- Nao verifiquei se existe versao de `eslint-plugin-jsx-a11y` acima da 6.10.2 que aceite ESLint 10 — isso decide se o item 5 e viavel hoje ou nao.
- Nao verifiquei quantos dos 33 checks vermelhos ja estavam vermelhos na main naquela data; a causa raiz do `Gate 1` esta provada (ERESOLVE), mas nao afirmo que os 33 tenham a mesma causa.
- Nao verifiquei o impacto de `eslint-plugin-react-hooks` 7 regra por regra; a afirmacao de que o baseline de 298 erros quebraria e inferencia a partir de `scripts/check-eslint-baseline.mjs` + `.eslint-baseline.json`, nao medicao.
