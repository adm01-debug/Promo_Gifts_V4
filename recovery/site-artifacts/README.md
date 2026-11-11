# Sitemap anterior ao fluxo dinâmico

`sitemap-pre-dynamic.xml` preserva integralmente o antigo `public/sitemap.xml`,
incluindo suas 11 URLs do domínio `criar-together-now.lovable.app` e a data histórica.
O arquivo tem **1.718 bytes**, modo Git `100644` e SHA256
`699714ba93573f888e5393c346a97a16e6ca1f124f5ac68e1b6b8a9779d55345`.
O blob Git preservado é `935f37534dbe4201261a2a87b6caa071bf4cb33f`.

O commit `09d13c4c80b7625eb83eba1f7c591ec3fd661da9` estabeleceu o contrato
dinâmico em `api/sitemap.ts`, com rewrite de `/sitemap.xml` para `/api/sitemap`
e teste que exige a ausência de um asset estático nesse endereço. O commit
`167f5f8de` (#3361) reintroduziu o XML do import inicial `13c588251`. Na base
`1dcb3b6b0ec1bd2c11fe51391d2de9f80f75f50a` e no head
`87b1cde276c7fa859071d18fe9ed37ad79265ee8` de #3382, seus bytes são iguais.
O aparente overlap de #3382 decorre da base ampla daquela PR; esta reconciliação
preserva o artefato completo em um caminho fora de `public`.

A API existente, suas consultas públicas, rewrite, `robots.txt` e seis testes
originais permanecem intactos. Este diretório guarda o histórico e permite
comparações de conteúdo. O build público do Vite usa os assets de `public`;
este arquivo de recuperação fica fora dessa saída.

## Condição de liberação

Esta mudança está preparada para revisão em PR. A saúde da API e a configuração
do deployment atual de produção **não foram verificadas**: as tentativas do
plugin Vercel falharam em autorização/lookup antes de chegar à aplicação.
Antes do merge/ativação, verificar GET e HEAD de `/api/sitemap` e `/sitemap.xml`
no deployment correto, XML/host canônicos, contagem e cabeçalhos de cache.

Liberar a rewrite pode passar a executar a função e o RPC público já previstos
no projeto. Configuração ausente ou erro do upstream produz `503` sem cache;
o cache, o volume de consultas e eventual custo incremental precisam ser
conferidos no deployment. Os testes locais e a preservação do XML não comprovam
essas condições de produção. Nenhum deploy ou alteração de ambiente é feito
por esta preparação.
