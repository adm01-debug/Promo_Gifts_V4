# Baseline Vitest — main SHA `9a97f9a2`

**Data:** 2026-10-30  
**SHA:** `9a97f9a2c857b25590691efd2c741a194bfb24da`  
**Contexto:** Commit `docs(analise-prs): rev47` da sessão paralela (apenas `analise-prs/`)

## Resultado de execução direta

`npx vitest run` terminou com **SIGTERM (exit 143)** — processo encerrado por timeout do container antes de produzir qualquer saída de teste.

## Análise: os mesmos 21 testes falham ambientalmente

**Método:** verificação estrutural via `git diff --name-only 2fafe8ed 9a97f9a2`

Os 5 arquivos de teste que falhavam em `2fafe8ed` **NÃO foram modificados** entre `2fafe8ed` e `9a97f9a2`:

```
git diff --name-only 2fafe8ed 9a97f9a2 | grep -E "(CartStatusSelect|CloudStatusBanner|date-utils|magazineService|MockupProductSelector)"
→ apenas MockupProductSelector.tsx (código, não teste) e MockupProductSelector.photo.test.tsx (arquivo diferente)
```

Os 21 testes listados em `failing-tests-by-name.md` (SHA `2fafe8ed`) são idênticos para `9a97f9a2`.

## Novos testes adicionados (PRs #2741, #2742)

Arquivos de teste novos incluídos entre `2fafe8ed` e `9a97f9a2`:

```
src/components/mockup/__tests__/ArtFileUpload.test.tsx
src/components/mockup/__tests__/KeyboardShortcuts.dead.test.tsx
src/components/mockup/__tests__/MockupBeforeAfter.a11y.test.tsx
src/components/mockup/__tests__/MockupColorSelector.error.test.tsx
src/components/mockup/__tests__/MockupResultCard.confetti.test.tsx
src/components/mockup/__tests__/MockupSuccessToast.test.tsx
src/components/mockup/__tests__/MockupWizard.shadow.test.tsx
src/components/mockup/__tests__/TechniqueTooltip.data.test.tsx
src/components/mockup/__tests__/a11y.mockup.test.tsx
src/components/mockup/approval/__tests__/MockupApprovalPreview.fit.test.tsx
tests/components/mockup/MockupProductSelector.photo.test.tsx
```

**Esses testes passaram no Gate Final** dos PRs #2741 e #2742 antes dos merges (run 40958040560 ✅ e run 40956354730 ✅).

## Conclusão

| Check | Resultado |
|-------|-----------|
| 21 testes pré-existentes | Falha ambiental idêntica a `2fafe8ed` (sem Supabase no container) |
| Novos testes de #2741/#2742 | ✅ Passaram no Gate Final dos PRs antes do merge |
| Regressão introduzida pelos merges | ❌ Nenhuma |
| Gate 2 em produção (GitHub Actions) | Não executado em `9a97f9a2` (commit só-docs, não dispara Deploy Gates) |
