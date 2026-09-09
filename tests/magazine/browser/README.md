# Magazine — regressões em navegador isolado

Executar a partir da raiz da worktree, com dependências instaladas pelo lockfile.

```bash
npm ci --ignore-scripts --no-audit --no-fund
npx playwright install chromium
node tests/magazine/browser/server.mjs
```

Em outro terminal:

```bash
node tests/magazine/browser/verify.mjs
```

O servidor só escuta em `127.0.0.1:8098`. O verificador bloqueia requisições do navegador para outros hosts e service workers. **Não usa secrets, credenciais ou banco real.** Encerrar o processo do servidor depois do teste.

Os componentes e estilos do Magazine são reais; autenticação, CRM, catálogo, migração local e persistência são substituídos por fixtures em memória. O mapeamento de snapshot do catálogo também é simplificado nesse limite simulado; contratos do serviço real são cobertos separadamente em `tests/integration/magazine-service-fuzz.test.ts`.

Cobertura: A4/escopo em galeria fria; criação com template; CTA público canônico e menu; Fit em largura e altura; Ctrl+S; falha de gravação sem falso salvo. O script falha se uma asserção ou erro de página ocorrer. O caminho do JSON de resultados temporário aparece na saída.

Não certifica: autenticação real, RLS, triggers, concorrência entre usuários, schema canônico, produção, exportação PDF integral ou fidelidade pixel a pixel. O shell de teste é mínimo, não substitui homologação no shell completo da aplicação.
