# ADR 0010 — `img-src https:` permanece amplo no CSP

- **Status:** Aceito (decisão consciente, 2026-10-02)
- **Contexto:** auditoria 20-dimensões apontou `img-src 'self' data: blob: https:`
  como superfície residual (tracking/exfil por imagem) e sugeriu restringir aos
  hosts de CDN conhecidos (imagedelivery.net, videodelivery.net, Supabase Storage).

## Decisão

**Manter `img-src https:` amplo.** Restringir aos hosts conhecidos foi avaliado
e **rejeitado** nesta revisão.

## Evidência

O catálogo renderiza imagens de fornecedores de dezenas de hosts diferentes, e a
lista é volátil (novo fornecedor entra → hostname novo na hora):

- `src/utils/imageProxy.ts` mede a distribuição real de `product_images.url_original`:
  `cdn.xbzbrindes.com.br` (67,96%), `www.spotgifts.com.br` (15,30%),
  `media.asiaimport.com.br` (8,96%), `cdndeprodutos.azureedge.net` (5,38%),
  `somarcascdn.azureedge.net` (2,38%) — **99,98%** de cobertura por 7 hosts.
- **Os 0,02% restantes são a cauda**: qualquer host novo de fornecedor renderiza
  `<img src>` direto — `getProxiedImageUrl()` só proxya os domínios da
  allowlist interna, os demais passam direto.
- Além dos produtos: revistas (`magazine_*`), avatares, logos de cliente,
  `og_image_url`, anexos — nenhum tem allowlist de host.

Restringir o CSP à allowlist faria **toda imagem de fornecedor novo quebrar
silenciosamente** (blocked:image) até alguém atualizar o CSP — uma regressão de
disponibilidade recorrente para ganho marginal de segurança.

## Por que o risco residual é aceitável

- `img-src` não executa código — o vetor real de exfil via imagem é "pixel de
  tracking" em XSS bem-sucedido, já mitigado por `script-src` + `strict-dynamic`
  + React escaping (vetor primário, não `img-src`).
- `Referrer-Policy` já limita o que vaza na requisição da imagem.
- Supplier images sensíveis passam pelo edge `image-proxy` (cors+rate-limit),
  independentemente do CSP.

## Consequências / gatilho de revisão

- Reavaliar SE: (a) o set de hosts de imagem estabilizar ≤15 domínios e o app
  ganhar um "renderer-only-proxy" para 100% das imagens externas; ou (b) surgir
  exigência de compliance que proíba `https:` amplo.
- Se a restrição for adotada no futuro, a allowlist mínima medida é:
  `self data: blob: imagedelivery.net videodelivery.net
  *.supabase.co cdn.xbzbrindes.com.br www.spotgifts.com.br
  media.asiaimport.com.br cdndeprodutos.azureedge.net somarcascdn.azureedge.net
  promo-brindes-images.adm01.workers.dev` — e exige antes mudar
  `getProxiedImageUrl` para proxyar TODOS os hosts desconhecidos (não só a
  allowlist), senão quebra fornecedor novo.
- O `check:headers-mirror` continua garantindo que `public/_headers` espelha
  `vercel.json` — qualquer mudança futura deve manter os dois em sync.
