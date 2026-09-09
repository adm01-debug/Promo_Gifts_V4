# Mitigação temporária — `image-size` via `pptxgenjs`

Data da decisão: 2026-09-09

Responsável técnico: Engenharia Promo Gifts

Revisão obrigatória: 2026-10-09 ou quando `image-size` publicar uma versão corrigida

## Contexto

`pptxgenjs@4.0.1` depende de `image-size@^1.2.1`. O GitHub Advisory Database registra
loops infinitos nos parsers ICNS, JXL e HEIF de todas as versões publicadas de
`image-size` até `2.0.2`. Não existe release corrigida nesta data. O reparo automático do
npm propõe `pptxgenjs@1.1.5`, um downgrade incompatível que não deve ser aplicado.

Avisos oficiais: [ICNS — GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr)
e [JXL/HEIF — GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq).

## Exposição validada

- O único import de `pptxgenjs` em produção está em `src/lib/bi/pptxGenerator.ts`.
- O adaptador gera slides apenas com texto e formas; não chama `addImage`.
- `pptxgenjs` declara `browser.image-size = false`, removendo o parser do caminho browser.
- Não há import direto de `image-size` no código de produção.

## Controles compensatórios

O gate `npm run check:pptx-image-parser-exposure` bloqueia o build se qualquer uma dessas
condições deixar de ser verdadeira. O gate possui testes positivos e negativos e é executado
também pelo `build` de produção. O gate online `npm run check:dependency-audit` bloqueia
qualquer novo advisory, alteração nos dois advisories aceitos ou expiração desta decisão.

## Condição de encerramento

Esta aceitação temporária termina quando ocorrer um dos eventos:

1. `image-size` publicar versão corrigida e compatível;
2. `pptxgenjs` remover ou corrigir a dependência;
3. o projeto substituir `pptxgenjs` por implementação sem o parser vulnerável.

Antes de permitir imagens no PPTX ou uso server-side, a dependência deve ser corrigida ou
substituída e este gate deve ser revisado em PR próprio.
