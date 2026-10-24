# Dossiê — claude/fix-gitleaks-gate-261019-1800

**Data análise:** 2026-10-24  
**SHA main baseline:** 652a7f14  
**Merge-base:** ahead: 4 | Behind: ~79

## Intenção
Corrigir Gate E23 (gitleaks): substituir `npx gitleaks` por binary download, adicionar allowlist completa de 44 falsos positivos em `.gitleaks.toml`, corrigir ProductFormFullscreen TS cast, adicionar EXAMPLE_API_KEY na allowlist.

## Commits únicos (git cherry + = 4)
```
15095344 fix(ci): substitui npx gitleaks por binary download no Gate E23
21ba85a8 fix(ci): substitui npx gitleaks por binary download no Gate E23  [dup]
bff9bcf4 fix(ci): adicionar allowlist completa no .gitleaks.toml — 44 falsos positivos
398fb76f fix(ts,ci): ProductFormFullscreen cast zodResolver + EXAMPLE_API_KEY allowlist
50981d51 fix(ci,ts): gitleaks allowlist + ProductFormFullscreen TS + secrets EXAMPLE_API_KEY
```

## Arquivos modificados (4)
- `.github/workflows/deploy-gates.yml` — substitui `npx gitleaks` por download de binary (Gate E23)
- `.gitleaks.toml` — allowlist de 44 falsos positivos
- `scripts/check-secrets-inventory.mjs` — EXAMPLE_API_KEY adicionado à allowlist
- `src/components/admin/products/ProductFormFullscreen.tsx` — cast zodResolver v5

## Análise
- **`.github/workflows/deploy-gates.yml`**: toca o workflow principal de gates → critério de aprovação humana obrigatório (REGRA #8 corolário + CLAUDE.md §CI)
- O Gate E23 falhava porque `npx gitleaks` não encontrava binary; solução de baixar binary é válida
- Allowlist de 44 falsos positivos em `.gitleaks.toml`: conteúdo a ser revisado (nenhum segredo real deve entrar na allowlist)
- O dup de commits (15095344 e 21ba85a8) sugere retrabalho; ambos fazem a mesma mudança

## Cruzamento Supabase
- **Migrations:** ZERO
- **Edge functions:** ZERO (deploy-gates.yml é CI, não deploy de edge function)

## VEREDITO
**AGUARDANDO APROVAÇÃO** — toca `.github/workflows/deploy-gates.yml` (workflow principal de CI/CD). Requer revisão humana do workflow + conteúdo da allowlist do gitleaks antes de merge.

**O que muda em produção:** nada diretamente. CI Gate E23 passa com binary download em vez de npx. Risco: se a allowlist encobrir secret real. Rollback: reverter `.github/workflows/deploy-gates.yml` e `.gitleaks.toml`.
