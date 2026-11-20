# Contrato da cotação de frete: Promo Gifts → Loggi

Etapa 81 do plano de frete. Este documento descreve a chamada que o Promo Gifts faz para pedir
cotação de frete ao Loggi Flow. O lado Promo está em `src/lib/freight/quoteContract.ts` (zod). O lado
Loggi (`supabase/functions/_shared/freightQuoteContract.ts`) deve ser escrito a partir do bloco abaixo.

## Como funciona

1. O motor de frete do Promo calcula os volumes (caixas fechadas) do orçamento.
2. O Promo envia ao Loggi as medidas **externas** de cada caixa e o **peso bruto** (caixa + produtos).
3. O Loggi devolve as opções de transportadora, com preço e prazo em dias úteis.
4. O Promo ordena as opções e compara a chegada com a data pedida pelo cliente.

Medidas em centímetros, pesos em gramas, valores em reais (BRL). CEP sempre no formato `00000-000`.
Datas `AAAA-MM-DD`; `computed_at` em ISO 8601 com fuso.

## Contrato

Bloco de referência (o hash do rodapé é calculado sobre o texto entre as cercas, sem as cercas):

```text
POST /freight-quote
Header: x-service-key: <segredo>

REQUEST
  origin_cep           string   obrigatório   formato 00000-000
  destination_cep      string   obrigatório   formato 00000-000
  declared_value_brl   number   obrigatório   maior que zero
  volumes              array    obrigatório   ao menos 1 item
    height_cm          number   obrigatório   maior que zero (medida externa da caixa)
    width_cm           number   obrigatório   maior que zero (medida externa da caixa)
    length_cm          number   obrigatório   maior que zero (medida externa da caixa)
    weight_g           integer  obrigatório   maior que zero (peso bruto do volume, em gramas inteiras)
  ready_date           string   opcional      AAAA-MM-DD (quando a carga fica pronta para coleta)

RESPONSE 200
  quote_id             string   obrigatório   identificador da cotação
  options              array    obrigatório   ao menos 1 item
    carrier            string   obrigatório   transportadora
    service            string   obrigatório   serviço (ex.: Rodoviário, PAC)
    price_brl          number   obrigatório   maior que zero
    transit_business_days integer obrigatório 0 ou mais (dias úteis de trânsito)
    delivery_date      string   opcional      AAAA-MM-DD
    option_id          string   obrigatório   identificador da opção
  computed_at          string   obrigatório   ISO 8601 com fuso

ERROS (corpo: { error, message, request_id? })
  400  invalid_request   pedido fora do contrato (CEP, volumes vazios, valores)
  401  unauthorized      x-service-key ausente ou errada
  429  rate_limited      mais de 60 pedidos por minuto
  502  carrier_error     transportadora respondeu com erro ou sem opções
  504  carrier_timeout   transportadora não respondeu a tempo
```

## Exemplo de pedido

```json
{
  "origin_cep": "03377-000",
  "destination_cep": "01000-000",
  "declared_value_brl": 4800.5,
  "volumes": [
    { "height_cm": 36, "width_cm": 36, "length_cm": 54, "weight_g": 16800 },
    { "height_cm": 27, "width_cm": 33, "length_cm": 33, "weight_g": 4800 }
  ],
  "ready_date": "2026-12-03"
}
```

## Exemplo de resposta (200)

```json
{
  "quote_id": "q_7f3a91",
  "options": [
    {
      "carrier": "Rodonaves",
      "service": "Rodoviário",
      "price_brl": 182.4,
      "transit_business_days": 4,
      "option_id": "rdn-rod-01"
    },
    {
      "carrier": "Melhor Envio",
      "service": "SEDEX",
      "price_brl": 341.9,
      "transit_business_days": 2,
      "delivery_date": "2026-12-07",
      "option_id": "me-sedex-02"
    }
  ],
  "computed_at": "2026-11-20T14:05:00-03:00"
}
```

## Erros

| Status | `error` | Quando | O que o Promo faz |
|---|---|---|---|
| 400 | `invalid_request` | Campo fora do contrato (CEP, volumes vazios, valor zero) | Mostra a mensagem; corrigir o dado e cotar de novo |
| 401 | `unauthorized` | `x-service-key` ausente ou inválida | "Cotação indisponível agora"; avisa a equipe técnica |
| 429 | `rate_limited` | Mais de 60 pedidos por minuto | Pede para tentar de novo em instantes |
| 502 | `carrier_error` | A transportadora falhou ou não devolveu opções | "Cotação indisponível agora"; frete informado manualmente |
| 504 | `carrier_timeout` | A transportadora não respondeu a tempo | "Cotação indisponível agora"; frete informado manualmente |

Exemplo de corpo de erro:

```json
{ "error": "invalid_request", "message": "destination_cep: o CEP deve estar no formato 00000-000", "request_id": "req_91c2" }
```

## Regras que o Promo aplica antes de enviar

- Datas que não existem no calendário (30/02, 31/04) são recusadas, no pedido e na resposta.
- Plano de frete que não está `ok` (dados faltando ou peça que não cabe) não é cotado.
- Peso bruto fracionário sobe para o grama inteiro (4800,5 g vira 4801 g).
- O prazo de chegada é calculado no Promo (`readyDate` + `transit_business_days` em dias úteis, com os
  feriados do Promo). O `delivery_date` do Loggi é informativo e não decide nada.

---

sha256 do bloco de contrato (texto entre as cercas `text`): `ad08f2977b5eb7824c3aacb89d48de842606b082fda5816ed90b645fb126f198`
