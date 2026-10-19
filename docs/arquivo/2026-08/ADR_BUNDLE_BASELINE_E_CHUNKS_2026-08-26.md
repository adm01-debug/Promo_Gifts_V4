# ADR — baseline de bundle e chunk compartilhado de produtos

- **Data:** 2026-08-26
- **Etapa do plano:** 97 — corrigir ou rejustificar baselines impossíveis e investigar divisão de chunks sem redesign
- **Status:** baseline reconstituída localmente em checkout limpo; sem alteração de runtime, Vite ou design
- **Escopo desta decisão:** `bundle-size-baseline.json`, `scripts/check-bundle-size.mjs`, `vite.config.ts`, o artefato local `dist/` e histórico Git, somente em leitura

## Decisão proposta

Não alterar agora o código da aplicação, a configuração Vite, os thresholds semânticos do gate ou a estratégia de `manualChunks`.

A baseline foi substituída **somente** por uma fotografia produzida em checkout limpo e equivalente ao CI, conforme a evidência registrada abaixo. A divisão do chunk `products` fica em uma segunda mudança, condicionada a medição por rota; não é consequência automática de seu tamanho bruto.

## Evidência reproduzida no worktree

O artefato inspecionado foi gerado às 17:21:13 BRT de 2026-08-26. O comando `npm run check:bundle-size` falhou com quatro violações, mas elas representam somente dois pares de regras (teto crítico e regressão para cada vendor):

| Chunk | Baseline de 2026-07-13 | Atual | Delta | Teto atual | Resultado |
|---|---:|---:|---:|---:|---|
| `react-vendor` | 187 B | 178.361 B (55.720 B gzip) | +95.280,2% | 225 B | falha crítica e de regressão |
| `router-vendor` | 25.598 B | 41.767 B (14.752 B gzip) | +63,2% | 30.718 B | falha crítica e de regressão |
| `products` | 866.444 B | 827.935 B (226.022 B gzip) | −4,4% | teto global 1.039.733 B | apenas aviso global (>= 75%) |
| total de JS | 11.422.677 B / 371 chunks | 11.409.764 B / 387 chunks | −0,1% | 13.707.213 B | aprovado |

Os outros seis vendors críticos diminuíram em relação ao snapshot: Query −1,7%, Supabase −3,9%, UI −7,3%, ícones −1,6%, datas −1,7% e gráficos −2,2%. Portanto não há evidência de regressão global de bundle no artefato atual.

O `stats.html` do visualizer confirma que o atual `react-vendor` contém o runtime real de `scheduler` e `react-dom` (`react-dom-client.production.js` e `client.js`). Um limite de 225 B não é fisicamente compatível com o rótulo do chunk, **React + ReactDOM**, nem com essa composição. A origem exata do artefato usado em julho não foi preservada; por isso não se afirma se foi `dist` obsoleto, incompleto ou produzido por outra resolução de dependências. O fato comprovável é que o atualizador de baseline confia apenas nos arquivos já existentes em `dist/assets` e não grava hash de lockfile, commit, configuração, visualizer ou run de CI.

## Separação de causas

| Hipótese | Evidência | Conclusão |
|---|---|---|
| Baseline impossível | Em 13/07 o commit `ca208716a` reduziu o limite versionado de 350.000 B para 225 B e registrou `currentBytes: 187`; o snapshot não tem proveniência verificável. | Confirmada como defeito de observabilidade. O valor não pode ser usado como referência de desempenho. |
| Mudança de dependências | No estado do repositório que gerou o baseline havia React/ReactDOM 18.3.1 e React Router DOM 6.30.4; hoje o lockfile resolve React/ReactDOM 19.2.8 e Router 7.18.2. | Explica por que uma comparação direta de `router-vendor` não mede somente regressão de código de produto. A parcela exata de cada dependência só pode ser isolada com dois builds controlados. |
| Upgrade de Vite | O baseline já declarava Vite 8.0.16. A mudança atual trocou `@vitejs/plugin-react-swc` por `@vitejs/plugin-react`, `esbuild` por `oxc` e `rollupOptions` por `rolldownOptions`; o visualizer atual ainda identifica Rollup 4.23.0. | O **major** do Vite não explica sozinho a falha. A alteração de emissor/minificador pode afetar a distribuição e torna a comparação histórica ainda menos confiável. |
| Regressão real de chunk | `products` caiu 38.509 B; total de JS caiu 12.913 B. Só React e Router extrapolam os limites históricos. | Não comprovada. Antes de qualquer otimização, a referência precisa ser reconstituída. |

## Por que não dividir `products` agora

O chunk compartilhado mede 827.935 B bruto, mas é importado por muitas saídas, inclusive `index`, `Header`, `MainLayout`, páginas de produto, orçamento, estoque, administração e busca. Ele também é dependência de vários chunks carregados dinamicamente. Assim, seu tamanho isolado não prova que todo esse payload entra na rota inicial, nem que uma divisão por “domínio” reduziria o tempo de interação.

Há uma restrição arquitetural explícita no `vite.config.ts`: splits manuais por domínio já causaram dependências circulares e TDZ (`Cannot access X before initialization`). Portanto, mover módulos por uma regra ampla de `manualChunks` sem medição de grafo de imports tem risco de regressão funcional, apesar de eventualmente reduzir bytes em um arquivo.

Antes de uma divisão futura, medir em CI/Playwright a cadeia de requests e bytes transferidos para pelo menos `/`, `/produtos` e `/produto/:id` com fixtures estáveis. Somente um módulo que não pertença à cadeia crítica e tenha consumidores claramente separáveis deve ser candidato a `lazy()`/import dinâmico; preservar o layout e a UX é critério obrigatório.

## Mudança mínima futura (não aplicada)

Em checkout efêmero, com `npm ci` e `npm run build` executados antes de qualquer atualização, rodar o atualizador já existente e revisar somente o diff de `bundle-size-baseline.json`:

```bash
npm ci
npm run build
node scripts/check-bundle-size.mjs --update-baseline
node scripts/check-bundle-size.mjs
```

Se o artefato atual se reproduzir, os valores de referência esperados são aproximadamente:

| Campo | Valor observado | Limite calculado pelo atualizador (+20%) |
|---|---:|---:|
| `react-vendor` | 178.361 B | 214.034 B |
| `router-vendor` | 41.767 B | 50.121 B |
| maior chunk (`products`) | 827.935 B | 993.522 B |
| total JS | 11.409.764 B | 13.691.717 B |

Esses números são alvo de reprodução, não uma autorização para editar manualmente o JSON. A atualização automática mantém todos os chunks sob a mesma fotografia; editar apenas os dois vendors deixaria snapshot, total e proveniência internamente incoerentes.

## Execução local reprodutível

Em 26/08, foi criado um worktree destacável no commit `a17425def`, executado
`corepack npm ci --ignore-scripts --prefer-offline`, seguido de `corepack npm run build -- --logLevel warn` e do atualizador existente. O artefato foi então validado por uma segunda execução de `node scripts/check-bundle-size.mjs` com saída zero.

Assinaturas SHA-256 da reprodução:

| Artefato | SHA-256 |
|---|---|
| `package-lock.json` | `73865b157b48361c480bdf2be013d63c9343650032c34e9b51e3d9c875fd6266` |
| `vite.config.ts` | `40447d7b1f384dfd6e3721ead366a45bf7a8e14f889386c71602c6dd61b51a35` |
| `dist/stats.html` | `5aba2a2e63666cd8abbac6be674c7ad355dce4eb096cc4fcb233c90668f30159` |
| baseline renovada | `1176dd05d9dbe0b4a31a347278aa643dc39ccbbed86a27b68125788e58f592a3` |

O diff de runtime é vazio: a mudança resultante fica limitada a `bundle-size-baseline.json` e a esta ADR. O gate continua alertando para `products` acima de 75% do limite global; o alerta não foi silenciado nem convertido em aprovação de uma divisão de chunk.

### Critérios objetivos de aceitação

1. O build ocorre em diretório efêmero, sem reutilizar `dist/` e com o lockfile versionado; registrar SHA-256 de `package-lock.json`, `vite.config.ts` e `dist/stats.html` no relatório do CI ou no commit.
2. Os oito chunks críticos previstos estão presentes. `stats.html` precisa confirmar que `react-vendor` contém a cadeia real de runtime (por exemplo, ReactDOM e Scheduler), não uma facade mínima.
3. O build reproduz `react-vendor` e `router-vendor` em até 2% dos valores observados acima, ou a diferença recebe explicação documentada antes da atualização.
4. Após atualizar, `node scripts/check-bundle-size.mjs` termina com código zero, o total bruto permanece abaixo de 12 MB e `products` não cresce mais de 5% em relação aos 827.935 B sem ADR específica.
5. O diff contém somente o baseline e é revisado como mudança de contrato de CI; não acompanha `vite.config.ts`, dependências ou reorganização de chunks no mesmo commit.

## Rollback e riscos

O baseline atual tem SHA-256 `536653139bc1e094b3ecbe0fa95f881f5599b71926522beb295ddc31e7782c0d`. A mudança proposta não toca runtime, banco, migrations, deploy ou design. Se a nova fotografia esconder uma regressão ou não se reproduzir no CI, reverter o commit isolado restaura exatamente o gate anterior.

O risco principal é executar `--update-baseline` sobre artefato local contaminado e institucionalizar uma medição falsa novamente. Por isso a recomendação exige checkout efêmero e evidencia de build, em vez de alterar limites por intuição. A segunda fonte de risco é usar bytes brutos como sinônimo de impacto ao usuário; o gate atual mede bytes brutos e deve continuar honesto quanto a isso, enquanto gzip e waterfall por rota orientam qualquer futura otimização.

## Referências examinadas

- `scripts/check-bundle-size.mjs` e `scripts/__tests__/check-bundle-size.test.ts`
- `bundle-size-baseline.json` e o histórico `e254cf396` → `ca208716a`
- `vite.config.ts`, `package.json`, `package-lock.json` e `.github/workflows/quality-gate.yml`
- `dist/assets/` e `dist/stats.html` do worktree
- grafo existente do repositório, que liga `check-bundle-size.mjs`, o build Vite e o Quality Gate 3.5
