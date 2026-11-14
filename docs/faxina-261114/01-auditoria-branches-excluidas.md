# Auditoria adversarial das 211 branches excluídas — Promo_Gifts_V4

**Pergunta do dono:** "as 211 que vc excluiu, você tem certeza absoluta que todo o trabalho delas foi incorporado ao main?"

**Resposta:** Sim, com uma ressalva de método (ver "NÃO VERIFICADO"). **0 das 211 têm perda de trabalho confirmada.**
Nenhuma precisa ser recriada. Tudo segue recuperável de qualquer forma: os 211 objetos de commit
estão no clone local (`git cat-file -e <sha>^{commit}` → 211 presentes, 0 ausentes).

- `origin/main` auditado: `ab0817a68b0ef9098dfcb4e8c42940a22af48147`, árvore `8ffc3c8f5bad49d6c71156fe9d2d9e165bc2e4ca`
- Data: 2026-11-14. Repo somente leitura: nenhum arquivo editado, nenhum commit/push, nenhuma escrita no GitHub.

---

## 1. Resumo em números

| Item | Valor |
|---|---|
| Branches excluídas | 211 |
| **Provadamente incorporadas ao main** | **211 (100%)** |
| **Com perda de trabalho CONFIRMADA** | **0** |
| A recriar | 0 |
| Suspeitas levantadas e derrubadas com evidência | 10 grupos de patch (17 branches) + 4 branches sem auditor |
| Objetos de commit presentes no clone local | 211 / 211 |
| Tips distintos (211 nomes) | 175 — 36 nomes são rótulos sobre o mesmo commit |
| Branches da Fábrica Hermes (`importado/vps-fabrica/*`) | 122 de 211, das quais 63 são `refazer-*` (reaplicações do mesmo patch em bases diferentes) |

Distribuição por critério de exclusão: 74 `contida(ahead=0)`, 74 `merge_sem_efeito`,
59 `patches_ja_no_main(cherry=0)`, 4 `sem_diff_de_arquivo(files=0)`.

### Falha de cobertura encontrada e corrigida

As 4 auditorias anteriores cobriram 19 + 40 + 74 + 74 = **207 branches**. Faltavam 4 —
exatamente as do critério `sem_diff_de_arquivo(files=0)`, que **nenhum auditor olhou**:

```
comm -23 <(as 63 do grupo cherry/sem_diff) <(as 59 auditadas) →
claude/chore-graphify-report-261108-1910
claude/debug-drift-manifest-261107-1730
fix/a11y-focus-visible-ring-20261030
fix/kit-builder-live-price-check-20261030
```
Auditei as 4 nesta sessão (seção 3). Todas limpas — mas 3 delas tinham PR **CLOSED sem merge**,
ou seja, estavam no perfil de risco mais alto do lote e passaram sem revisão.

---

## 2. Tabela das perdas confirmadas

**Vazia.** Nenhuma branch das 211 perdeu trabalho.

Se alguma precisasse voltar, o comando seria (todos os objetos estão no clone local):
```
git push origin <sha>:refs/heads/<nome-da-branch>
```

---

## 3. As 4 branches que nenhum auditor tinha olhado (auditadas aqui)

Nas 4, `git diff --name-only origin/main...<sha>` é **vazio** e
`git merge-tree --write-tree origin/main <sha>` = `8ffc3c8f5b` (árvore do main).
Mas as 4 têm 2 a 4 commits fora do main — então o critério "files=0" esconde trabalho
intermediário. Abri commit por commit:

| Branch | SHA | O que os commits fizeram | Veredito |
|---|---|---|---|
| `claude/chore-graphify-report-261108-1910` | `504e76f0f` | 2 commits que regeneram `graphify-out/GRAPH_REPORT.md` (4624+/4582- e 4586+/4628-), um desfazendo o outro | Artefato gerado automaticamente, efeito líquido zero. `tree(504e76f0f)` = `tree(merge-base)` = `9476a8debc`. Sem perda |
| `claude/debug-drift-manifest-261107-1730` | `248fb51f4` | `chore: debug workflow para dump de manifests` (+44) e depois `chore: remove debug workflow` (-44), no mesmo arquivo `.github/workflows/debug-drift-manifest.yml` | A própria branch descartou: workflow de depuração temporário, removido de propósito. Sem perda |
| `fix/a11y-focus-visible-ring-20261030` | `6a000b4e8` | `18e5f34fee fix(a11y): restaura foco visível no histórico de imagens` — 1 linha em `AdImageResult.tsx` | **O fix está no main**: `origin/main:src/components/magic-up/AdImageResult.tsx:188` = `className="block w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"` — exatamente o lado `+` do commit. Sem perda |
| `fix/kit-builder-live-price-check-20261030` | `2c5b93677` | `dcf88ec5cf fix(kit-builder): revalida preços antes do orçamento` — **cria** `src/hooks/kit-builder/useKitPriceValidation.ts` (78 linhas) + teste (101) + 6 arquivos | **No main**: blob `7b72ad67f422a3fbccef021b48ae1af2d7da0a17` idêntico nos dois lados; `git log --diff-filter=A origin/main` → `8523467205 2026-10-30 fix(kit-builder): revalida preços antes do orçamento (#2768)`. 6 dos 8 arquivos byte-idênticos ao main. Sem perda |

### Alarme investigado e derrubado em `2c5b93677`

3 arquivos divergiam do main. Em `tests/pages/kit-builder/useKitBuilderQuote.test.ts` apareceram
3 linhas "ausentes" (`.mockResolvedValueOnce({ data: null, error: { message: 'Resposta perdida após commit' } })`,
`quote-confirmado`, `rpc`) — cheirava a caso de teste perdido sobre retry de resposta perdida.
Derrubado: o main tem os **mesmos 21 `it(...)`, com os mesmos títulos e na mesma ordem**, e as mesmas
strings nas linhas 416, 441, 444-445, 464, 487 e 533. O main só trocou a forma do mock (array em vez
de `.mockResolvedValueOnce` encadeado). Equivalente, não perda.

A única linha realmente fora do main é uma nota de base em `docs/estado/backlog/funcionalidades.md`
("atualizada parcialmente em 2026-10-30 no checkout local...") — doc substituído por versão mais nova.

---

## 4. Minha verificação independente das 211 (não confiei nos 4 critérios nem nos relatórios)

### 4.1 Igualdade real de árvore (recomputada nas 211)
`git merge-tree --write-tree origin/main <sha>` para cada uma das 211:
**192 devolveram exatamente `8ffc3c8f5bad49d6c71156fe9d2d9e165bc2e4ca`**, a árvore do main;
as outras 19 são as do grupo CONFLITO. Isto fecha o furo clássico do patch-id (patch que entrou e
depois foi **revertido** no main): num merge de 3 pontos a branch reaplicaria a linha revertida e a
árvore mudaria. Como a árvore é idêntica, não há reversão pendente nessas 192.
Saída: `/tmp/claude-0/-home-user-Promo-Gifts-V4/73812b05-e7f6-526e-8117-1497633b82f7/scratchpad/branches/sweep211.out`

### 4.2 Arquivo a arquivo nas 211 (as duas perguntas que matam o caso)
Para cada branch, com `mb = git merge-base origin/main <sha>`:
- arquivos que a branch cria ou altera (`git diff --name-status --diff-filter=AM mb sha`) e que **não existem** no main HEAD (`git cat-file -e origin/main:<f>`) → **0 ocorrências nas 211**;
- arquivos que a branch **apaga** e que o main ainda tem → **0 ocorrências nas 211**.

Ou seja: nenhuma das 211 criou arquivo que falte no main, e nenhuma remoção de branch ficou sem efeito.

### 4.3 Linha a linha nas 211
Para cada arquivo cujo blob difere do main, extraí todas as linhas `+` de `git diff -U0 mb sha`,
normalizei espaços e testei presença no **mesmo arquivo** do main (`comm -23`).
Resultado: **17 branches** com alguma linha ausente, somando **10 grupos de patch distintos**
(as demais são duplicatas da Fábrica Hermes do mesmo patch). As 194 restantes: 0 linhas ausentes.
Saída: `/tmp/claude-0/-home-user-Promo-Gifts-V4/73812b05-e7f6-526e-8117-1497633b82f7/scratchpad/branches/sweep_linhas.out`

### 4.4 Ancestralidade das 74 `ahead=0` (recomputada)
`git merge-base --is-ancestor <sha> origin/main` + `git rev-list --count <sha> --not origin/main`:
**74/74 ancestrais, 74/74 com 0 commits fora do main**. Sendo o tip ancestral, todo commit alcançável
pela branch é alcançável pelo main, por definição. Essas 74 são rótulos de ponto de fork
(36 nomes compartilham tip com outro nome), sem trabalho próprio.

---

## 5. As perdas derrubadas, com o motivo (10 grupos de patch / 17 branches)

Todas no grupo CONFLITO. Duplicatas da Fábrica Hermes contam como **um** patch.

| # | Patch / branch representativa | SHA | Linhas "ausentes" | Por que NÃO é perda (evidência) |
|---|---|---|---|---|
| 1 | `bot/policies-baseline-seed-20261106230819` | `c5bc907ce` | 4 em `.security/policies-baseline.json` | **Snapshot regenerado.** `generated_at` da branch = `2026-11-06T23:08:19.322Z`; do main = `2026-11-14T17:55:07.671Z`. As linhas são `generated_at`, `sha256` e 2 `qual` na forma antiga `(created_by = auth.uid())`; o main tem a forma otimizada por initplan `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = created_by)` (linhas 6995, 7006, 7025-7026) |
| 2 | `claude/chore-auditoria-perf005-status-261101-2115` | `2d8bb72cf` | 8 em `auditoria-supabase/RELATORIO_AUDITORIA_SUPABASE.md` | **Doc substituído por versão mais nova.** As 8 são status **antigos**: `workflow #41350535676 pendente` → main linha 972 `workflow #41358914450 queued`; `SB-0008 ⚠️ ABERTO — APROVAÇÃO` e `SB-0007 ❌ INVÁLIDO 1` → main linhas 200-233, 946 com a classificação atual e mais completa |
| 3 | `claude/feat-e128-split-promoflix-261030-1045` | `ef745375c` | 2 (`buffered,` e a regex `isM3u8`) | **O main corrigiu de propósito.** `git log -S'buffered,'` → `f2ebce5c1d fix(promoflix): remove unused buffered var + anchor cloudflare regex`. O estado `buffered` continua vivo (`usePromoFlixPlayer.ts:43,367,604`); e a regex do main é **mais forte**: `/^https?:\/\/[^/]*cloudflarestream\.com.*\/manifest/i` (linha 160) vs. a não-ancorada da branch. Main à frente |
| 4 | `importado/vps-fabrica/v2/m01-2610082247` | `f42d53719` | 2 em `magicUpShare.ts` | **Reformatação.** As 2 linhas são as duas pernas do mesmo union type; o main só inverteu a ordem (`{ ok: false }` antes de `{ ok: true }`). Os outros 2 arquivos são byte-idênticos ao main |
| 5 | `fix-analise-de-cores-da-logo-ignora-resp-2610081919` + `refazer-11ed1020` (2 branches, **árvore idêntica** `cbe0dcc057`) | `c0e139437`, `3a86bde41` | 1 em `useLogoColorAnalysis.test.ts` | **Ordem de union.** `let imageMode: 'load' \| 'error'` → main `'error' \| 'load'` (lint). O fix de produção `useLogoColorAnalysis.ts` é blob `29272815f` **idêntico** ao main |
| 6 | `m14-2610082248` + `refazer-4fdd2bee` + `refazer-82e4d63a` (3 branches) | `9b7df4946` | 4 em `magic-up-curation.a11y.test.tsx` | **Main mais forte.** As 4 são a forma `forEach`; o main faz as **mesmas** asserções com `for..of` e ainda **adiciona guardas contra asserção vazia**: linhas 73-75 (`expect(unchecked).not.toHaveLength(0)` + `tabindex="-1"`) e 154-155 (`expect(radios()).not.toHaveLength(0)` + `toBeDisabled()`). `MagicUpCurationStatus.tsx` = blob `e94085ec9` idêntico ao main |
| 7 | `m16-2610082248` + `refazer-3da5f864` + `refazer-f1242f15` (3 branches) | `9be793b85` | 3 em `AdImageResult.tsx` + 1 no teste | **Ordem de classes Tailwind + asserção equivalente.** Main linha 181 tem `focus-within:ring-2 focus-within:ring-ring hover:ring-2`, linha 199 tem `group-focus-within:opacity-100 group-hover:opacity-100`, linha 188 tem o botão + **mais** `focus-visible:ring-2 ring-primary ring-offset-2` (só reordenado por prettier-plugin-tailwindcss). No teste, `expect(results).toHaveNoViolations()` → main linhas 85-86 `expect(results.violations.filter(v => v.id === "nested-interactive")).toEqual([])` **e** `expect(results.violations).toEqual([])` — mais estrito |
| 8 | `importado/vps-fabrica/v2/n01-2610082244` | `ceb1c7a88` | 1 em `MockupResultCard.confetti.test.tsx` | **Asserção equivalente.** `/#/.test(color)` → main `color.includes("#")`. Mesma verificação |
| 9 | `n53-2610082250` + `refazer-1428537e` + `refazer-cfa93103` (3 branches) | `3c08d6b65` | 8 em `useLogoProcessing.size.test.ts` | **Mock reescrito, main mais correto.** As 8 são a montagem antiga dos dublês (`Object.assign(class extends URL {}, …)`, `vi.fn(async …)`). O main troca só `createObjectURL`/`revokeObjectURL` e os **restaura no `afterEach`** (linhas 115-129) — correto, porque o código sob teste usa `new URL` — e tem **mais** casos (9 `it`, incl. retrato 1000x4000, limite explícito 800, falha de carregamento). O código de perf `useLogoProcessing.ts` é blob `8b6a1516a` idêntico ao main |
| 10 | `importado/vps-fabrica/v2/s25-2610081947` | `d8e06e26e` | 4 em `MockupHistoryPanel.tsx` | **Comentário condensado + ordem de classes.** O fix A-5 está no main: linha 509 (comentário A-5 em 1 linha), linha 510 (`after:absolute after:-inset-2.5`), linhas 635 e 795 (`h-11 min-h-11 w-11 min-w-11` vs. `h-11 w-11 min-h-11 min-w-11` da branch). O teste `MockupHistoryPanel.actions.test.tsx` é blob `d6059887e` idêntico ao main |

Casos de PR fechada **sem** merge cujo trabalho entrou por outro commit (verificado):
- `claude/feat-e128-split-promoflix-261030-1045` (PR #2811 CLOSED) → `05f8d37e80 feat(e128): split PromoFlixPlayer.tsx 1512→699 linhas`
- `codex/fix-replenishment-relevance-permission-261107-1154` (PR #3138 CLOSED) → `6065eb7adc fix(ci): permitir leitura de PR no detector de reposição (#3139)`
- `fix/a11y-focus-visible-ring-20261030` (PR #2758 CLOSED) → fix presente em `AdImageResult.tsx:188`
- `claude/chore-graphify-report-261108-1910` (PR #3267 CLOSED) → artefato gerado, efeito líquido zero

---

## 6. NÃO VERIFICADO (limites honestos desta auditoria)

1. **Não executei `npm run lint`, `qa:typecheck`, `npm test` nem `npm run build`.** Toda afirmação de
   equivalência de teste e de comportamento é por **leitura de diff e de conteúdo git**, não por execução.
   Nenhuma das 211 altera o main, então isso não muda o estado de produção — mas não posso dizer "testado".
2. **Force-push anterior ao inventário de 17:14 seria indetectável localmente.** Não há reflog para essas
   refs remotas (`.git/logs/refs/remotes/origin/` sem entradas para elas). Se uma branch teve commits
   sobrescritos **antes** de eu medir, aquele trabalho não aparece em nenhum SHA do inventário. Isso é
   anterior e alheio à exclusão, mas é o único furo real que resta.
3. **A comparação linha a linha é textual, normalizada por espaço, dentro do mesmo arquivo.** Uma linha
   que exista no main dentro de um bloco morto ou comentado passaria como "presente". Mitiguei com
   verificação de símbolo ativo (`git grep` em `origin/main`, com arquivo:linha) em todos os 10 grupos
   substantivos da seção 5 e nos 4 casos da seção 3 — não nos 194 restantes, que já eram byte-idênticos
   ou com 0 linhas ausentes.
4. **Não verifiquei comportamento em runtime nem o deploy da Vercel.**
5. **Não reverifiquei commit a commit o mapeamento dos 130 commits dangling** (`git fsck --dangling`)
   para suas branches donas; isso foi feito pelo auditor do grupo `ahead=0`. Meu argumento para as 74
   não depende disso: é ancestralidade direta.
6. **Estado de PR não foi usado como prova** em nenhum ponto — só como pista de onde procurar. 27 das 40
   do grupo cherry=0 constam `sem_pr`.

---

## 7. Avaliação final dos 4 critérios de exclusão

| Critério | Veredito | Evidência |
|---|---|---|
| **1. `contida(ahead=0)`** | **CONFIÁVEL** (prova matemática) | Se o tip é ancestral do main, todo commit alcançável pela branch é alcançável pelo main, por definição. Recomputado: 74/74 ancestrais, 74/74 com `git rev-list --count <sha> --not origin/main` = 0. Único furo é o item 2 de "NÃO VERIFICADO" (force-push anterior ao inventário), que **nenhum** critério detecta |
| **2. `patches_ja_no_main(cherry=0)`** | **NÃO CONFIÁVEL SOZINHO** — acertou, mas por sorte estrutural | `git cherry` compara patch-id: casa um patch que entrou e **depois foi revertido** no main, e ignora renomeação. Prova disso no próprio lote: **19 das 59** deram `CONFLITO` no merge simulado, ou seja, patch-id igual **não** implicou integração limpa. O que salvou as 59 foi a comparação de blob e de linha (seções 4.2/4.3), não o `cherry`. **Não use este critério isolado para excluir** |
| **3. `sem_diff_de_arquivo(files=0)`** | **CONFIÁVEL para o estado final, CEGO para o trabalho intermediário** | Diff de 3 pontos vazio ⇒ `tree(branch)` = `tree(merge-base)`, e a merge-base é ancestral do main: o estado final da branch está inteiro no histórico do main. Mas nas 4 do lote havia 2 a 4 commits com trabalho real (incl. um hook de 78 linhas e um fix de a11y) que o critério não mostrava — todos confirmados no main só depois de abrir commit por commit (seção 3). **Exige a checagem commit a commit antes de excluir** |
| **4. `merge_sem_efeito`** | **O MAIS FORTE, mas não é prova por si só** | Reproduzido em 192/211 (árvore `8ffc3c8f5b` idêntica). Fecha reversão no main, renomeação e deleção divergente. Porém o merge `ort` resolve "a favor do main" também por lógica de *already-applied*, então árvore idêntica **não diz** que as linhas da branch estão no main — diz que o merge não mudaria nada. A prova veio de juntar isto com blob a blob e linha a linha. **Confiável em combinação, não isolado** |

**Conclusão metodológica:** dos 4 critérios, só o **1** se sustenta sozinho. O **2** é o mais fraco e não
deveria ter sido usado como critério de exclusão isolado — ainda que, nesta amostra, nenhuma das 59
tenha de fato perdido trabalho. O **3** é correto mas cego e foi o único grupo que **ninguém auditou**.
O **4** é forte e foi o que efetivamente pegou as branches de squash merge/rebase (todas as 74 têm pelo
menos 1 commit exclusivo por patch-id, logo o critério 2 não as pegaria).

---

## 8. Arquivos desta auditoria

- Varredura arquivo a arquivo das 211: `/tmp/claude-0/-home-user-Promo-Gifts-V4/73812b05-e7f6-526e-8117-1497633b82f7/scratchpad/branches/sweep211.out` (script `sweep211.sh`)
- Varredura linha a linha das 211: `/tmp/claude-0/-home-user-Promo-Gifts-V4/73812b05-e7f6-526e-8117-1497633b82f7/scratchpad/branches/sweep_linhas.out` (script `sweep_linhas.sh`)
- Relatórios dos 4 auditores de grupo: `auditoria-as-19-conflito.md`, `auditoria-amostra-cherry0.md`, `auditoria-amostra-merge-sem-efeito.md`, `auditoria-amostra-ahead0.md` (mesma pasta)
