# origin/temp-rebase-3321

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** se o cliente fecha a aba por acidente no meio da montagem de um kit, o trabalho dele volta sozinho quando ele reabre — nada se perde.
- **Tip / merge-base / main:** tip `e3f887a3cfe0fac5c88dbb461c128a039f11cbc2` · merge-base `193a750676b00a8b7d94a73d74012ef076897872` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`e3f887a3cf`, 2026-11-09, "feat(kit-builder): backup restore hydration-aware + fix encoding"),
tocando apenas 3 arquivos de front-end (nenhuma migration, policy ou edge function):

1. **Guardar o kit inteiro, e nao so um resumo**, quando o navegador avisa que a aba vai fechar.
   Antes o backup em `localStorage` guardava apenas IDs e quantidades (bom para detectar que havia
   edicao pendente, inutil para remontar a tela). A branch criou a interface `BackupFullState`
   (nome, tipo de kit, caixa, itens, personalizacao, identidade, notas, quantidade) e passou a
   gravar esse objeto completo.
2. **Devolver esse backup para a tela** — funcao nova `restoreFromBackup` no estado da pagina,
   exposta em `actions`.
3. **Restaurar no momento certo** — o efeito de restauracao em `KitBuilderPage.tsx` passou a
   esperar o fim da hidratacao (`if (state.isHydrating) return;`), para nao brigar com o
   carregamento do kit salvo; restaura em silencio se for o mesmo kit e oferece um toast
   ("Restaurar edicoes") se o backup for de outro kit.
4. **Encoding** — as mensagens de UI novas foram escritas com acentuacao correta
   ("Alteracoes restauradas", "edicoes nao salvas", "Voce fechou o Kit Maker").

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Commit da branch foi mergeado (squash) | `0a68a9044c feat(kit-builder): backup completo no beforeunload + restore real (FT-119)`, mesma data (2026-11-09), mesmos 3 arquivos, mesmo co-autor | `git log -1 0a68a9044c`; `git show --stat 0a68a9044c` → `useKitAutoSave.ts` / `useKitBuilderPageState.ts` / `KitBuilderPage.tsx` |
| `interface BackupFullState` (8 campos) | `src/hooks/kit-builder/useKitAutoSave.ts:31`, campos identicos aos da branch | `git show origin/main:src/hooks/kit-builder/useKitAutoSave.ts \| sed -n '31,40p'` |
| Gravar `fullState` no `beforeunload` | `useKitAutoSave.ts:354-371` monta `const fullState: BackupFullState = {...}` e grava no `localStorage.setItem` | mesmo arquivo, linhas 354-371 |
| `consumeUnloadBackup` devolve `fullState` | `useKitAutoSave.ts:62` e `:407` / `:419` (tipo de retorno com `fullState?: BackupFullState`) | `git grep -n "fullState" origin/main -- src` |
| `restoreFromBackup` no estado da pagina | `src/hooks/kit-builder/useKitBuilderPageState.ts:448`, exportada em `actions` na linha 533 | `git grep -n "restoreFromBackup" origin/main -- src` |
| Restauracao so depois da hidratacao | `KitBuilderPage.tsx:61-66`: `const checkedBackupRef = useRef(false)` + `if (state.isHydrating) return;` | `git show origin/main:src/pages/kit-builder/KitBuilderPage.tsx \| sed -n '58,72p'` |
| Backup velho (>5 min) ignorado | `KitBuilderPage.tsx:70-72`: `if (ageMs > 300_000) return;` | mesmo arquivo |
| Caso 1 (mesmo kit): restaura em silencio + toast "Alteracoes restauradas" | `KitBuilderPage.tsx:104-118` | mesmo arquivo, linhas 104-118 |
| Caso 2 (outro kit): toast com acao | `KitBuilderPage.tsx:120-141` — na main a acao virou "Reabrir kit" com `persistUnloadBackup` (correcao de bug, ver abaixo) | mesmo arquivo |
| Backup antigo sem `fullState` (compatibilidade) | `KitBuilderPage.tsx:146-158` ("Legacy backup without fullState") | mesmo arquivo |
| Encoding correto das mensagens | main tem "Alteracoes restauradas" / "Suas edicoes nao salvas..." / "Voce fechou o Kit Maker" com acentuacao UTF-8 correta, sem mojibake | `git show origin/main:src/pages/kit-builder/KitBuilderPage.tsx \| sed -n '113,131p'` |

A main nao apenas recebeu esse trabalho — ela o continuou. Depois do commit da branch vieram
`051a279ba4 fix(kit-builder): corrige P1 sobreescrita e P2 landing no restore FT-119`,
`299e516c49 fix(kit-builder): preservar backup antes de navegar ao kit original (P2 Codex)` e
`efe3162613 fix(kit-builder): FT-119 wire backup/restore ponta-a-ponta + revision check`
(`git log --oneline origin/main --grep="FT-119"`). Esses commits corrigiram um defeito real que a
versao da branch tinha: no Caso 2 a branch chamava `restoreFromBackup` mantendo o kit atual
carregado, de modo que o auto-save sobrescreveria o kit errado 5 segundos depois. A main trocou
isso por navegar ao kit correto (`persistUnloadBackup` + redirecionamento) e acrescentou guarda de
versao (`backup.revision < state.currentRevision` → pergunta antes de sobrescrever edicao feita em
outro dispositivo).

Por isso os 3 arquivos ainda "diferem da main": a main esta **a frente**, nao atras. Como o repo usa
squash-merge, a branch nunca aparece como ancestral da main e o patch-id nunca bate — isso nao
indica trabalho perdido.

## A resgatar

Nada. A unica linha da branch que a main nao tem e um comentario explicativo de 4 linhas (o bloco
`/** Full restorable state saved on beforeunload... */` acima de `BackupFullState`). A main removeu
esse e varios outros comentarios dos 3 arquivos no mesmo movimento (6 linhas de comentario removidas
so em `KitBuilderPage.tsx`: `git diff e3f887a3cf origin/main -- src/pages/kit-builder/KitBuilderPage.tsx | grep -c '^-.*//'`),
ou seja, foi faxina de comentarios feita de proposito na main, nao perda de funcionalidade. Zero
efeito no comportamento do sistema e zero efeito no negocio.

## Risco de fechar esta branch

Nenhum. A funcionalidade que ela entregou — recuperar o kit do cliente apos fechamento acidental da
aba — esta no ar na main, e numa versao melhor: a main corrigiu um defeito da branch que podia
sobrescrever o kit errado e acrescentou protecao contra sobrescrever edicao feita em outro
dispositivo. Manter a branch aberta so cria risco do contrario: se alguem a mergear hoje, ela
reintroduz a versao antiga do Caso 2 (o bug de sobrescrita) e desfaz as melhorias posteriores.

Nao mexe em banco, migration, policy nem edge function (`git diff --stat` da branch: so 3 arquivos
em `src/`).

## Nao verificado

- Nao foi executado `npm run lint`, `qa:typecheck`, `npm test` nem build — a tarefa e somente leitura
  e nenhuma alteracao de codigo foi feita. A verificacao aqui e de presenca de comportamento na main
  por simbolo, arquivo e linha, nao de execucao.
- Nao foi checado o comportamento em runtime (navegador real) do fluxo de restauracao; a confirmacao
  e por codigo-fonte da main.
