# Dependabot / npm audit — Dismissal Baseline
**Data:** 2026-10-14  
**Plano:** E95 (PLANO_WORKFLOWS_CI_V2_100_ETAPAS_2026-10-14.md)

## Vulnerabilidades com override aplicado

| Pacote | CVE | Fix | Override adicionado |
|--------|-----|-----|---------------------|
| `tmp` | GHSA-52f5-9888-hmc6, GHSA-ph9p-34f9-6g65 | `>=0.2.6` | `"tmp": ">=0.2.6"` em `package.json#overrides` |

## Vulnerabilidades sem fix disponível (dismissal datado)

| Pacote | CVE | Severity | Motivo | Dono | Expira |
|--------|-----|----------|--------|------|--------|
| `@lhci/cli` (e transitivas: `@lhci/utils`, `lighthouse`, `extract-zip`, `puppeteer-core`, `proxy-agent`, etc.) | múltiplos | HIGH | Dev-only (Lighthouse CI, Gate 4). Fix disponível exige salto de major (`0.15.1 → 0.6.1` conforme npm audit; mudança de API breaking). Sem execução em prod. | CI | 2027-04-14 |
| `braces` (transitiva via `chokidar`, `micromatch`) | GHSA-vfj7-8cjw-p6xm | HIGH | Dev-only (Vite/Rollup tooling). Vulnerável em `<=3.0.3`. Último release publicado no npm **é** `3.0.3` — não existe versão corrigida no registry. Override `>=3.0.3` não tem efeito pois nenhuma versão acima está disponível. Aguardando patch upstream. | CI | 2027-04-14 |

## Contexto de risco

Todas as vulnerabilidades acima residem em dependências de desenvolvimento (`devDependencies`):
- `@lhci/cli` — executado apenas em jobs de CI (Gate 4 Lighthouse).
- `braces` — transitiva do toolchain de build (Vite); não empacotada no bundle de produção.

Nenhuma dessas dependências é carregada em runtime no frontend servido ao usuário final.

## Próximos passos

- **`@lhci/cli`:** Avaliar upgrade de `0.15.1` para versão mais recente do branch `0.x` com as sub-dependências corrigidas. Verificar changelog antes de atualizar (mudanças de API nas asserções LHCI).
- **`braces`:** Monitorar o repositório `micromatch-org/braces` para um patch `>3.0.3`. Quando publicado, adicionar override `"braces": ">=3.0.4"` em `package.json#overrides`.
- Após qualquer upgrade: re-rodar `npm audit --audit-level high` e verificar 0 findings HIGH.
