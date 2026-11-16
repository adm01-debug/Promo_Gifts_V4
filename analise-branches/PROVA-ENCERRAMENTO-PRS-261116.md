# Prova de encerramento: as PRs fechadas sem merge nesta sessão

**Data:** 2026-11-16 · **`main` de referência:** `dc5f7b42bc` · **Método:** diff byte a byte do
head da PR contra a `main`, arquivo por arquivo

## A regra

Uma PR só pode ser fechada sem merge quando **todo** arquivo que ela toca estiver em um destes
estados, com a prova citada:

1. idêntico na `main` (incorporado);
2. a `main` tem uma versão **posterior** do mesmo arquivo, que supera a da PR;
3. a `main` decidiu o **oposto**, com a decisão registrada no próprio repositório;
4. é bump major, que o `AGENTS.md` regra 4 só permite "se indispensável" — então é **decisão
   pendente**, não incorporação.

O estado 4 não autoriza apagar a branch. Ele é dívida registrada.

## Método

Para cada PR fechada, com `MB = git merge-base origin/main <head>`:

```bash
git diff --name-only  "$MB" "$head"                  # arquivos que a PR toca
git diff --name-only  origin/main "$head" -- <esses> # quais ainda diferem da main
```

Se a segunda lista é vazia, a PR está incorporada byte a byte. Se não, cada arquivo restante
precisa de veredito individual.

## Resultado

| PR | Título | Arquivos tocados | Ainda diferem | Veredito |
| --: | --- | --: | --: | --- |
| #3688 | recibo de deploy de edge function (E66) | 1 | **0** | incorporada byte a byte |
| #3692 | ratchet semanal — baselines melhoradas | 1 | **0** | incorporada byte a byte |
| #3687 | recibo de aplicação 20261115230000 (E15) | 1 | 1 | substância incorporada |
| #3695 | bump do grupo development-all (11 updates) | 2 | 2 | **5 de 11 incorporados; 6 majors pendentes** |
| #3525 | enxuga workflows | 43 | 5 | `main` à frente ou decisão oposta |

## #3688 e #3692 — incorporadas byte a byte

`git diff --name-only origin/main <head> -- <arquivos tocados>` devolve **vazio** para as duas.
Branch pode ser apagada sem perda.

## #3687 — substância incorporada

Diferença restante: `supabase/MIGRATIONS_SYNC_LOG.md`. O arquivo difere porque a `main` ganhou
325 recibos depois (PR #3708), não porque o recibo desta PR falte.

O recibo está na `main`, em `supabase/MIGRATIONS_SYNC_LOG.md:1626`, com o **mesmo sha256**:

```
| `20261115230000` | `2937d5ff62750fed7a98cec78f147de2547df00055d361796ce65ee6db996dec` | — |
  GitHub Actions (db-apply-migration.yml, …) | E15 | 2026-11-16 00:08:09 UTC |
  job post-check da run 43778467997 confirmou a version no ledger | aplicada |
```

A única coisa que não entrou foi a citação literal da autorização do dono no chat, que a versão da
PR embutia na célula da tabela. Conteúdo de conversa não pertence ao ledger de migrations.

## #3695 — 5 de 11 incorporados, 6 pendentes

Comparado pacote a pacote entre a base da PR, a PR e a `main` de hoje:

| Pacote | base | PR #3695 | `main` hoje | Estado |
| --- | --- | --- | --- | --- |
| `@lhci/cli` | 0.16.0 | 0.16.1 | 0.16.1 | na `main` (PR #3702) |
| `@testing-library/user-event` | ^14.6.8 | ^14.6.10 | ^14.6.10 | na `main` (PR #3702) |
| `@typescript-eslint/eslint-plugin` | ^8.72.1 | ^8.72.2 | ^8.72.2 | na `main` (PR #3702) |
| `@vitejs/plugin-react` | ^6.2.1 | ^6.3.0 | ^6.3.0 | na `main` (PR #3702) |
| `vite` | ^8.3.6 | ^8.3.8 | ^8.3.8 | na `main` (PR #3702) |
| `eslint` | ^9.17.0 | ^10.14.0 | ^9.17.0 | **major pendente** |
| `@eslint/js` | ^9.39.5 | ^10.0.1 | ^9.39.5 | **major pendente** |
| `@testing-library/jest-dom` | ^6.9.1 | ^7.0.1 | ^6.9.1 | **major pendente** |
| `eslint-plugin-react-hooks` | ^5.1.0 | ^7.1.1 | ^5.1.0 | **major pendente** |
| `jsdom` | ^30.1.3 | ^31.0.1 | ^30.1.3 | **major pendente** |
| `tailwindcss` | ^3.4.17 | ^4.3.5 | ^3.4.17 | **major pendente** |

Os 6 que ficaram fora são **todos bump major**. O `AGENTS.md` regra 4 diz que bump major só entra
"se indispensável (avise)". Então isto é **decisão pendente do dono**, não trabalho perdido — e os
seis são de peso bem diferente: `jsdom` e `jest-dom` afetam só a suíte de testes, `eslint` 9→10 e
`eslint-plugin-react-hooks` 5→7 mexem no Gate 1, e `tailwindcss` 3→4 é migração de produto com
mudança de sintaxe de tema.

**A branch `dependabot/npm_and_yarn/development-all-2c14067ca6` não deve ser apagada** antes dessa
decisão: é a única cópia versionada do `package-lock.json` resolvido para esses 6 majors.

### Erro meu, registrado

Na primeira medição eu comparei as versões como **texto**, não como semver. `'^9.39.5' > '^10.0.1'`
é verdadeiro em comparação de string, então o script classificou `eslint` e `@eslint/js` como
"`main` ≥ PR". Estão **fora** da `main`. A tabela acima está corrigida.

## #3525 — `main` à frente ou decisão oposta

5 dos 43 arquivos ainda diferem. Um por um:

| Arquivo | Diff | Veredito |
| --- | --- | --- |
| `.github/workflows/deploy-gates.yml` | +17 / −73 | `main` à frente: as 73 linhas que faltam na PR são os fixes de Gate 1.13, 1.13.2, Gate 3 e Gate Final das PRs #3700 e #3707 |
| `docs/coordenacao/conflitos-semanticos.md` | −28 | só falta: 28 linhas que a `main` ganhou depois |
| `.github/workflows/required-checks-guard.yml` | +2 / −3 | `main` à frente (consolidação de 13/11, no cabeçalho do arquivo) |
| `.github/workflows/global-search-gate.yml` | +7 / −1 | **decisão oposta** |
| `e2e/flows/supplier-comparison-visual.spec.ts` | +152 / −151 | `main` à frente |

### A melhoria que já estava incorporada

A PR adicionava `docs/ci/SEGREDOS.md` à lista de caminhos que **não** contam como docs-only, com o
raciocínio correto: sem isso, um PR que só mexe nesse arquivo é tratado como docs-only e o Gate 1
(`lint:baseline`, 1.14) é pulado. Conferido: **a `main` já tem**, em
`.github/workflows/deploy-gates.yml:94`.

### A decisão oposta

A PR **adiciona** um gatilho `pull_request` ao `global-search-gate.yml`. A `main` o tirou de
propósito, e o motivo está escrito no próprio arquivo:

> E2E fora dos PRs (14/11): os PRs apontavam o E2E para o Supabase de produção e sobrecarregavam o
> banco. Roda no merge em main, no agendamento ou manual.

Incorporar a PR aqui reintroduziria carga de E2E no banco de produção a cada PR. Fica fora.

### O spec visual

A versão da PR (`b1a274a4b`, 13/11) marca o spec como `.fixme` e documenta por que ele nunca
passava: mocka `external-db-bridge`, que foi aposentado (410), enquanto o produto vem do PostgREST;
não há baselines `*-snapshots/` versionados e o CI usa `updateSnapshots: 'none'`; e afirma um texto
de erro que o `SupplierComparisonModal` não tem.

A `main` (`c9bc67746`, 14/11, PR #3617) foi além: **consertou o spec** para a UI atual em vez de
desativá-lo. O diagnóstico da PR #3525 continua sendo informação útil sobre o histórico, e está
preservado aqui e no ref `salvo/261115-preservacao`.

## Conclusão

Das 5 PRs fechadas sem merge: 2 incorporadas byte a byte, 1 com a substância incorporada e hash
conferido, 1 com `main` à frente ou decisão oposta em todos os arquivos restantes, e **1 com
pendência real** (os 6 majors da #3695).

Nenhuma branch desta leva foi apagada. As 106 branches remotas e os 5 refs `salvo/*` seguem
intactos — conferido com `git branch -r`.
