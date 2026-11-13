# Workflows aposentados

Estes workflows saíram de `.github/workflows/`, então não rodam mais. O conteúdo fica guardado aqui para consulta e para ser reativado se for preciso: basta mover o arquivo de volta.

| Arquivo | Aposentado em | Motivo | O que cobre agora |
|---|---|---|---|
| `lovable-autoheal.yml` | 2026-11-13 | Corrigia o ESLint em commits do Lovable direto na main. O último commit do Lovable (gpt-engineer-app[bot]) na main é de 2026-08-31. Em 7 dias foram 197 execuções sem nenhum commit do Lovable. | O Gate Final obrigatório (deploy-gates) já exige lint e typecheck antes do merge. O script `scripts/autoheal-eslint/run.mjs` e o teste dele continuam no repositório. |
| `lovable-edit-tracker.yml` | 2026-11-13 | Rastreava o X-Lovable-Edit-ID dos commits do Lovable. Em 7 dias foram 197 execuções sem nenhum commit do Lovable. | Não se aplica enquanto o Lovable não editar a main. |
| `lovable-protected-audit.yml` | 2026-11-13 | Auditava arquivos protegidos contra edição do Lovable. As 198 execuções de 7 dias foram puladas. | `.lovableignore`, `CODEOWNERS`, o check 3 do `prod-health.yml` e o `branch-protection-sentinel.yml`, que reconhece a família de bots `lovable-*`. |

As defesas passivas contra o Lovable foram mantidas porque não custam nenhuma execução. São elas o `.lovableignore`, o `CODEOWNERS`, os comentários de incidente no `deploy-gates.yml` e o reconhecimento dos bots no sentinel. Se o Lovable voltar a editar a main, mova os três arquivos de volta para `.github/workflows/`.
