# Baseline local — main SHA `9a97f9a2`

**Data:** 2026-10-29T23:xx:xx Z (esta sessão)
**SHA:** `9a97f9a2c857b25590691efd2c741a194bfb24da`
**Worktree:** `/tmp/claude-0/main-baseline` (ephemeral, criado via `git worktree add`)
**Contexto:** Lovable commitou em main às 22:56Z após merges de #2741 e #2742; este baseline captura o estado pós-Lovable.

---

## TypeCheck (`npx tsc --noEmit`)

**Exit: 0**  
Sem erros. Zero warnings de compilação reportados pelo tsc.

```
(sem saída — exit 0)
```

---

## Build (`npm run build`)

**Exit: 0**  
Build completo em 12.74s. Apenas warnings de import dinâmico ineficaz (pre-existentes, não bloqueantes):

```
[INEFFECTIVE_DYNAMIC_IMPORT] src/components/products/ProductQuickView.tsx — já importado estaticamente em outros módulos
[INEFFECTIVE_DYNAMIC_IMPORT] src/components/products/VariantPickerDialog.tsx — já importado estaticamente
[INEFFECTIVE_DYNAMIC_IMPORT] src/components/products/share/SharePreviewDialog.tsx — já importado estaticamente
✓ built in 12.74s
[chunk-cycles] OK: no static import cycles between production chunks.
[production-harnesses] OK: no /__test routes or harness chunks in dist/.
```

---

## ESLint (`npx eslint src --ext .ts,.tsx`)

**Exit: 0**  
Sem erros e sem warnings novos. Executado em background (task `bd3tpxtlg`), completou com exit 0.

```
(sem saída — exit 0)
```

---

## Resumo comparativo vs. baseline anterior (`2fafe8ed`, 2026-10-27)

| Check | Baseline 2fafe8ed (2026-10-27) | Baseline 9a97f9a2 (2026-10-29) |
|---|---|---|
| TypeCheck | Conforme baseline anterior | ✅ exit 0 (confirmado) |
| Build | Conforme baseline anterior | ✅ exit 0 (12.74s) |
| ESLint | NÃO VERIFICADO | ✅ exit 0 (confirmado) |
| Testes | 21 failing por TypeError: fetch failed (ambiental) | NÃO EXECUTADO (contexto insuficiente) |

**Nota:** Os warnings de `INEFFECTIVE_DYNAMIC_IMPORT` são pre-existentes no main e não constituem regressão nova.
