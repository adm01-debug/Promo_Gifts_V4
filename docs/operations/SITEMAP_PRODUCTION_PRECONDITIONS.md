# Precondições públicas de ativação do sitemap

O workflow `sitemap-production-preconditions.yml` verifica somente leitura no
domínio fixo `https://www.promogifts.com.br`. Não aplica migrations, faz deploy,
altera ambiente ou gera links de bypass. Não precisa de segredos ou dependências npm.

Executa exatamente cinco requisições, sem retries nem redirects:

- GET e HEAD de `/api/sitemap`.
- GET e HEAD de `/sitemap.xml`.
- GET de `/api/health`, exigindo o SHA da base do PR, ou de `main` no dispatch.

Cada chamada tem limite total de 20 segundos no curl e 25 segundos no processo;
respostas acima de 8 MiB são recusadas. O XML é validado com parser, rejeitando
DOCTYPE/entidades. Status, namespace, hosts canônicos, contagem e cache são
conferidos. Cookies, headers de autenticação e corpos brutos não entram no relatório.
Os arquivos HTTP temporários são removidos ao terminar cada chamada.

## O que o resultado significa

O código zero significa **precondições para substituir a sombra estática atendidas**.
Não significa que um sitemap legado ainda servido esteja saudável.

A API dinâmica precisa responder corretamente em GET/HEAD, com XML canônico,
`X-Sitemap-Count` coerente e o cache planejado. `/api/health` precisa retornar
o commit esperado com `no-store`. Um deployment diferente ou uma API degradada
bloqueia o resultado, mesmo se o XML público antigo ainda responder 200.

O XML legado reconhecido é exclusivamente o arquivo de 1.718 bytes preservado em
`recovery/site-artifacts/sitemap-pre-dynamic.xml`, SHA-256
`699714ba93573f888e5393c346a97a16e6ca1f124f5ac68e1b6b8a9779d55345`.
Esse caso recebe `READY_KNOWN_LEGACY_SHADOW_NOT_PUBLIC_HEALTHY` somente se a API,
o SHA servido e o HEAD público passarem. O relatório e o resumo continuam marcando
`production_sitemap_healthy: false`. Qualquer outro XML público que não satisfaça
o contrato dinâmico falha; não existe opção para aceitar drift desconhecido.

Após a realocação do arquivo e o deploy confirmado, o mesmo check deve alcançar
`READY_CANONICAL`, com `production_sitemap_healthy: true`. A inspeção de metadados
do projeto na API do Vercel é separada: a resposta de `/api/health` identifica o
código servido nesse domínio, mas não comprova a propriedade do projeto Vercel.

## Cache, contagem e volume

O cache declarado é `public, max-age=43200, stale-while-revalidate=86400`. Um header
de cache não comprova HIT no CDN; `x-vercel-cache` e `age` são apenas registrados
quando realmente observados. Respostas separadas podem representar snapshots ou
idades de cache diferentes, por isso não se força igualdade entre suas contagens.
Cada GET deve, porém, ter seu próprio header coerente com o XML recebido.

O handler atual faz até 15 pedidos paginados de mil linhas por chamada, inclusive
em HEAD. Quatro chamadas sem cache podem gerar até 60 leituras RPC. A probe não
usa cache-busting. Contagem no limite de 15.001 URLs é registrada para revisão
de possível truncamento; ela não prova sozinha que haja URLs omitidas.

Para executar localmente ou em ambiente com acesso permitido ao domínio:

```sh
python3 -m unittest discover -s tests/scripts -p test_production_sitemap_probe.py -v
python3 scripts/probe-production-sitemap.py --expected-sha COMMIT_COMPLETO --output work/sitemap-production/report.json --summary work/sitemap-production/summary.md
```

O script herda proxy e CA do ambiente, sem proxy alternativo nem desativação de TLS.
Um CONNECT negado, falha da API de gestão ou teste com HTTP simulado não equivale
a uma resposta HTTP real da aplicação. Não declarar a saúde de produção até haver
um relatório de execução real com os respectivos status e o SHA servido.
