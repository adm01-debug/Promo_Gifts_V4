# origin/claude/fix-sentinel-e2e-pdf-261029-2310

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** destrava o alarme que avisa quando alguem publica direto em producao sem revisao, e para de reprovar um teste automatico so porque faltava dado de exemplo no ambiente de teste.
- **Tip / merge-base / main:** tip `189d74e8e49273b1ef6735fa27110684e03a2776` · merge-base `c3b412869b11e558b41e0095ced977dc9e8f8944` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Tres commits, todos do mesmo agente e da mesma sessao
(`session_01RfQzo7S3K6o49UBUDoCtUe`), descritos no pacote de evidencia:

1. `f02430c211 fix(ci): adiciona SHA allowlist ao sentinel para 6 commits historicos P-CI-H`
   — o guarda "Branch Protection Sentinel" estava reprovando a main inteira porque seis
   commits antigos, publicados direto em producao antes das regras atuais, usavam
   prefixos de mensagem que o guarda nao conhecia. A branch criou uma lista nominal de
   perdao (`.github/SENTINEL_SHA_ALLOWLIST.txt`), a Regra 7.5 que le essa lista em
   `scripts/sentinel-check.sh`, e passou o identificador do commit do workflow para o
   script.
2. `358cc117c2 fix(e2e): corrige E2E PDF Dialog — skip quando sem fixture de orcamento`
   — o teste automatico do PDF de orcamento reprovava (em vez de simplesmente pular)
   quando nao havia orcamento de exemplo no ambiente. Trocou `expect(false).toBeTruthy()`
   por `test.skip(true, ...)`.
3. `189d74e8e4 docs(ci): atualiza PENDENCIAS.md com P-CI-H e E2E PDF Dialog resolvido`
   — registro do incidente e do teste resolvido.

**Fato decisivo:** os tres commits entraram na main juntos, por squash, em
`126062c1b919c1e84b70cacf96ab3fdda7494211` (`fix(sync): sentinel e2e pdf — graphify
SKILL.md + migration-refs-baseline + scripts`, adm01-debug, 2026-10-30). O corpo desse
commit da main reproduz literalmente as tres mensagens acima, com a mesma
`Claude-Session`, e `git show --stat 126062c1b9` lista os seis arquivos da branch:
`.github/SENTINEL_CHANGELOG.md`, `.github/SENTINEL_SHA_ALLOWLIST.txt`,
`.github/workflows/branch-protection-sentinel.yml`, `PENDENCIAS.md`,
`e2e/flows/pdf-dialog.spec.ts`, `scripts/sentinel-check.sh`.

Os 5 arquivos que hoje diferem da main diferem porque a main andou **depois** (sentinel
v2.1.2 / v2.1.3 / v2.2.0, novas entradas na lista de perdao, e a reescrita completa do
`PENDENCIAS.md` em 2026-11-08) — nao porque o trabalho ficou de fora.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Regra 7.5 — guarda le a lista nominal de perdao | `scripts/sentinel-check.sh:155-173` | `git show origin/main:scripts/sentinel-check.sh \| grep -n` → `155:# Regra 7.5: SHA allowlist histórica`, `161:if [[ -n "$COMMIT_SHA" ]]`, `170:echo "sha-allowlist: ..."` |
| 4o argumento opcional (identificador do commit) no script | `scripts/sentinel-check.sh:29` | mesma saida: `29:COMMIT_SHA="${4:-}"` |
| Workflow passa o identificador do commit ao script | `.github/workflows/branch-protection-sentinel.yml:160` | `160: if RESULT=$(bash scripts/sentinel-check.sh "$SUBJECT" "$FULL_MSG" "$AUTHOR" "$SHA" 2>&1); then` |
| Arquivo da lista de perdao criado, com cabecalho e aprovacao do dono | `.github/SENTINEL_SHA_ALLOWLIST.txt` (hoje com 11 entradas; nasceu com as 6 da branch) | `git log --oneline origin/main -- .github/SENTINEL_SHA_ALLOWLIST.txt \| tail -1` → `126062c1b9` |
| 5 dos 6 commits historicos perdoados | linhas 13-17 do arquivo na main | `153630ff…`, `036803829…`, `4e83d972…`, `e2518bbd…`, `c55c6781…` presentes e identicos |
| 6o commit historico perdoado (`9d9dd2a7`) | **NA MAIN ESTA CORROMPIDO** | main linha 18 = `9d9dd2a7b502ab7e5ff424**61**d40b95a822c21d6b`; a branch tinha `…424**91**…`. `git cat-file -t` no valor da main → `could not get object info`; no valor da branch → `commit` (`fix(ci): protege contrato de repair-only em E15`). Quem trocou: `a2dda825f0 docs(ci): grandfathers squash commit 252cc01d + atualiza RELATORIO_CI (#3223)` (`git log -S` nos dois valores) |
| Registro v2.1.1 no changelog do sentinel | `.github/SENTINEL_CHANGELOG.md:31-44` | `31:## v2.1.1 — 2026-10-29 — Regra 7.5: SHA allowlist histórica (P-CI-H)` |
| Correcao do teste do PDF de orcamento | `e2e/flows/pdf-dialog.spec.ts:39`, **byte a byte igual** | `git diff origin/main origin/claude/… -- e2e/flows/pdf-dialog.spec.ts` → vazio; main linha 39: `if (!ok) { test.skip(true, \`[E108] Sem orçamento no estado "${scenario}" no ambiente — pulando.\`); return null as never; }` |
| Registro P-CI-H / "E2E PDF Dialog resolvido" no `PENDENCIAS.md` | NAO ESTA no `PENDENCIAS.md` de hoje — entrou na main em `126062c1b9` (+498 linhas) e foi removido na reescrita de 2026-11-08 | `git show origin/main:PENDENCIAS.md \| grep -n "P-CI-H\|2749\|PDF Dialog"` → sem resultado; o arquivo atual comeca em `Gerado em: 2026-11-08` |

## A resgatar

1. **`.github/SENTINEL_SHA_ALLOWLIST.txt` linha 18 — identificador de commit digitado
   errado na main.** O valor correto, que esta nesta branch e em `126062c1b9`, e
   `9d9dd2a7b502ab7e5ff42691d40b95a822c21d6b`. A main tem `…42461…`, que nao existe no
   repositorio. Efeito pratico: a linha e inerte — perdoa um commit inexistente e nao
   perdoa o commit real. Como `9d9dd2a7` ja esta no passado da main, nao ha alarme
   quebrado hoje; o risco e a lista de perdao perder confiabilidade (uma linha que
   parece cobrir algo e nao cobre). Correcao e de uma linha, mas o arquivo fica em
   `.github/`, area de governanca: precisa de PR que fica aberta para o dono
   (AGENTS.md, Git 7 e 10). Ja existe item de trabalho equivalente aberto.

Nada mais. O registro de documentacao do `PENDENCIAS.md` nao entra aqui: era o relato
de um incidente de 2026-10-29 ja resolvido e fechado, substituido por um inventario mais
recente; nao e capacidade perdida.

## Risco de fechar esta branch

Baixo para o funcionamento do sistema: todo o comportamento que a branch entregou esta
rodando na main hoje (guarda de publicacao direta com lista de perdao, e o teste do PDF
que pula em vez de reprovar). Fechar a branch nao desliga nada.

O unico risco e de memoria: se a branch for apagada antes de a linha 18 ser corrigida,
o valor correto do identificador deixa de aparecer em qualquer branch viva. Ele continua
recuperavel para sempre no historico da main
(`git show 126062c1b9:.github/SENTINEL_SHA_ALLOWLIST.txt`), por isso o risco e de
esquecimento, nao de perda definitiva. Recomendacao: corrigir a linha por PR e so
depois apagar a branch.

## Nao verificado

- Nao foi executado o guarda (`scripts/sentinel-check.sh`) nem o teste de PDF: a tarefa
  proibe alterar a arvore de trabalho e nao ha run de CI novo para citar. A conclusao
  sobre o comportamento vem da leitura do codigo da main e dos diffs, nao de execucao.
- Nao foi verificado se o commit `a2dda825f0` (PR #3223) corrompeu outras linhas em
  outros arquivos alem desta; a comparacao se limitou aos 5 arquivos desta branch.
- Arquivos sem leitura por truncamento: nenhum. O pacote trouxe os 5 arquivos com os
  dois diffs e nao contem a marca TRUNCADO.
