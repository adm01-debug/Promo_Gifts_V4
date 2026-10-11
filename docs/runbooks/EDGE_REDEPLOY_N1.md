# Runbook — Redeploy de Edge Function (desvio N-1 → N)

Detectado pelo job "Compare GitHub × Canonical" quando produção diverge do repo.

## Causas típicas

- Deploy fora de fluxo (MCP/dashboard) nunca reconciliado com o git.
- Merge de código de edge sem o redeploy correspondente.

## Procedimento

1. Confirmar a direção do drift: `gh run view` do workflow
   `edge-drift-check` (ou job Compare GitHub × Canonical) mostra qual função
   e se produção está à frente (N) ou atrás (N-1) do repo.
2. Se o repo está correto (caso comum — produção atrasada):
   dispatch `.github/workflows/deploy-edge-functions.yml` com
   `function_name=<edge>`. Sem input → redeploya todas (evitar).
3. Se produção está à frente (código deployado não commitado):
   extrair o código vivo via `get_edge_function` (MCP), abrir PR trazendo-o
   para o repo, mergear, e só então redeployar pelo workflow.
4. Validar: rerun do job Compare → drift zerado.
5. Se a função alterada recebe tráfego real (check-login, log-login-attempt,
   anonymize-user), anunciar a janela antes do redeploy — cold start na
   troca pode falhar 1-2 requests.

## Nunca

- `deploy_edge_function` via MCP como caminho normal (só inspeção/leitura).
  Exceção de emergência exige reconciliação no mesmo dia + rerun do Compare
  (REGRA #8 corolário, CLAUDE.md).
