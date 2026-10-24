# Dossiê — claude/fix-sync-log-ci-261019-1730

**Data análise:** 2026-10-24  
**SHA main baseline:** 652a7f14  
**Merge-base:** 1ac6992c | Ahead: 13 | Behind: 81

## Intenção
Corrigir CI que falhava em: (a) gate de secrets scan por falta de binary gitleaks, (b) baseline de asserções `as` por cast necessário em ProductFormFullscreen, (c) script check-security-definer-acl falhando com HTTP 504 intermitente.

## Commits únicos (git cherry + = 11 de 13)
```
15095344 fix(ci): substitui npx gitleaks por binary download no Gate E23
21ba85a8 fix(ci): substitui npx gitleaks por binary download no Gate E23  [dup]
bff9bcf4 fix(ci): adicionar allowlist completa no .gitleaks.toml — 44 falsos positivos
398fb76f fix(ts,ci): ProductFormFullscreen cast zodResolver + EXAMPLE_API_KEY allowlist
50981d51 fix(ci,ts): gitleaks allowlist + ProductFormFullscreen TS + secrets EXAMPLE_API_KEY
e3294986 fix(ci): atualiza baseline de referências de migration (481 refs legadas em docs)
3963e924 fix(ci): retry + exit-0 para HTTP 504 em check-security-definer-acl
c0e4e946 fix(ci): atualiza baseline de asserções 'as' — ProductFormFullscreen +2 (Resolver cast)
5951ed55 fix(ci): atualiza .as-unknown-baseline.json — ProductFormFullscreen +1 (249→250)
77d2bff0 fix(ci): atualiza baseline 'as unknown as' — ProductFormFullscreen +1 (249→250)
cfabb331 fix(ci): registra contrato magazine-reader-state-read no CONTRACTS map (Gate 1.12)
```

## Arquivos modificados (5 no diff vs main)
- `.as-assertions-baseline.json` — bump 2162→2164 (+2 casts em ProductFormFullscreen)
- `.as-unknown-baseline.json` — bump 249→250 (+1 `as unknown as` em ProductFormFullscreen)
- `scripts/check-security-definer-acl.mjs` — retry (3x) + exit-0 se todos 504
- `src/components/admin/products/ProductFormFullscreen.tsx` — `as ProductFormData` cast
- `tests/contracts/webhook-schemas.ts` — contrato magazine-reader-state-read

## Análise REGRESSÃO (analise-branches.md §4 — fix-sync-log-ci explicitamente citado)

### Baseline afrouxada — `as` cast
- `.as-unknown-baseline.json`: 249→250 (+1). Causa: ProductFormFullscreen.tsx adicionou `as unknown as`. O cast é necessário para compatibilidade com zodResolver v5 (incompatibilidade de tipos entre react-hook-form e @hookform/resolvers v5). **Prova de falso positivo:** commit mensagem cita "zodResolver cast" e a mudança em ProductFormFullscreen.tsx confirma (`handleSubmit(async (data) => { await onSubmit(data as ProductFormData, images); })`). Não é loosening de segurança — é workaround de tipagem de biblioteca.
- `.as-assertions-baseline.json`: 2162→2164 (+2). Mesma causa (ProductFormFullscreen).

### Gate de segurança — exit-0 em HTTP 504
- `scripts/check-security-definer-acl.mjs`: após 3 retries todos retornando 504, faz `process.exit(0)`.
- **Isso é uma REGRESSÃO de segurança potencial:** o gate passa mesmo quando não consegue verificar o estado de segurança. Política: "timeout de infra não indica violação de segurança" — pode ser válida, mas é uma DECISÃO HUMANA.
- A alternativa conservadora seria: falhar com exit code diferente de 0 após 3 tentativas 504.

## Cruzamento Supabase
- Migrations: ZERO
- Edge functions: ZERO (scripts/ é CI, não código de produção)

## VEREDITO
**AGUARDANDO APROVAÇÃO** — o exit-0 incondicional para HTTP 504 em gate de segurança é uma decisão de política (segurança vs. disponibilidade) que requer aprovação humana. As baseline bumps são legítimas (zodResolver). Sem isso, a branch seria MERGEAR.

**O que muda em produção:** exit-0 para 504 no check-security-definer-acl, ou seja, o Gate de segurança passa em ambientes onde Supabase REST retorna 504. Risco: gap de verificação se 504 ocultar violação real. Rollback: reverter commit 3963e924.

**Proposta de auditoria relacionada:** nenhuma direta de P01..P19.
