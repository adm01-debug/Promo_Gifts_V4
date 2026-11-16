# origin/recuperado/fix-dep-overrides-e95-261102

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** fecha um alerta de seguranca (CVE-2024-4068) numa biblioteca usada indiretamente na construcao do site — a protecao ja esta valendo na producao de hoje.
- **Tip / merge-base / main:** tip `3495252a4bd5d76a8e85b69280b8ae85566e2ce9` / merge-base `df94410cbbcbe7d80928a279de91214d88b0d4bb` / main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`3495252a4b`, 01/11/2026, "fix(deps): E95 — braces >=3.0.3 override (CVE-2024-4068 ReDoS)").
O corpo da mensagem declara tres coisas:

1. adicionar um "override" preventivo de `braces >= 3.0.3` em `package.json`, para fechar o
   CVE-2024-4068 (ReDoS na biblioteca `braces`, que entra no projeto como dependencia indireta);
2. constatar que `tmp >= 0.2.6` **ja estava coberto** (nenhuma mudanca pedida);
3. constatar que `extract-zip` **nao tem alerta HIGH aberto** no Dependabot, porque a versao que entra
   via `@playwright/test` e `@lhci/cli` ja e >= 2.0.0 (nenhuma mudanca pedida).

Ou seja: dos tres itens do escopo E95, so o primeiro gerava codigo. O conteudo proprio da branch e
**uma unica linha**:

```
 git diff --stat df94410 3495252a4b
 package.json | 1 +
 1 file changed, 1 insertion(+)
```

E a linha e:

```
   "overrides": {
+    "braces": ">=3.0.3",
     "esbuild": "^0.28.1",
```

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| override `"braces": ">=3.0.3"` | ESTA, na mesma posicao e com o mesmo texto, em `package.json` → bloco `overrides` | `git show origin/main:package.json` imprime o bloco `overrides` identico, linha por linha, ao `git show 3495252a4b:package.json` — ambos comecam com `"braces": ">=3.0.3",` seguido de `"esbuild": "^0.28.1",` |
| quando entrou na main | commit `54826844aa`, 15/11/2026, PR #3676: `fix(mockup): resgata teste de a11y da fatia 2, aviso de falha na seleção do mockup e trava do braces (#3676)` | `git log -S'"braces": ">=3.0.3"' origin/main -- package.json` retorna exatamente esse commit; `git show --stat 54826844aa` mostra `package.json \| 3 +-` junto das mudancas de mockup |
| o override esta de fato valendo (nao e so texto) | ESTA: a arvore de dependencias da main resolve `braces` em 3.0.3 | `git show origin/main:package-lock.json` → entrada `node_modules/braces` com `"version": "3.0.3"`; os consumidores aparecem como `"braces": "~3.0.2"` e `"braces": "^3.0.3"`, ambos satisfeitos por 3.0.3 |
| `tmp >= 0.2.6` | ESTA (a propria branch dizia que ja estava coberto; nao era mudanca dela) | `git show origin/main:package.json` lista `"tmp": ">=0.2.6"` no mesmo bloco `overrides` |
| `extract-zip` | nada a fazer por decisao do proprio commit (sem alerta HIGH aberto) | corpo da mensagem de `3495252a4b`; a branch nao tocou em nenhum arquivo por causa disso (`--stat` acima: 1 arquivo, 1 linha) |

Observacao sobre o "arquivo que difere": `package.json` difere da main hoje, mas o diff
branch → main e **inteiramente deriva da main**, nao trabalho perdido. Ele contem apenas: bumps de
dependencia feitos depois (ex. `@sentry/react` ^8.45.0 → ^11.11.0, `framer-motion` ^11 → ^14.11.1,
`vite` ^8.3.4 → ^8.3.6), scripts novos de manutencao/automacao (`maintenance:*`, `automation:*`),
testes acrescentados a `test:ci-core` e um ajuste de memoria no `lint-staged`
(`--max-old-space-size=512` → `4096`). Nenhuma dessas linhas e autoria desta branch — ela so
alterou a linha do `braces`, e o bloco `overrides` na main nao perdeu nada.

## A resgatar

Vazio. Nao ha item fora da main.

## Risco de fechar esta branch

Nenhum risco pratico. A unica coisa que a branch entrega — a trava de versao que fecha o alerta de
seguranca — ja esta na producao de hoje e ja valendo (a trava aparece tanto na lista de travas quanto
na arvore de dependencias travada). Fechar a branch nao remove nada do sistema e nao reabre o alerta.
A branch e um duplicata de algo que outro resgate (PR #3676) ja trouxe em 15/11/2026.

Efeito colateral de **nao** fechar: a branch continua na lista e consome atencao de analise futura
sem nada para entregar.

## Nao verificado

- Nao foi executado `npm audit` nem consultado o Dependabot para confirmar que o alerta
  CVE-2024-4068 aparece como fechado no painel do GitHub. A verificacao feita foi sobre o repositorio
  (trava declarada em `package.json` + versao resolvida em `package-lock.json`), que e o que a branch
  mudava. Isso nao afeta o veredito.
- A afirmacao do commit sobre `extract-zip` ("Dependabot nao reporta alerta HIGH open") nao foi
  reconferida no painel; era uma constatacao da epoca e nao gerou mudanca de codigo.
