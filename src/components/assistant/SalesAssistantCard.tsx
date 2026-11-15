/**
 * Card "Encaixe do Cliente" — fase 1.
 *
 * O vendedor abre `/clientes/:id` e vê, sem clicar em nada, até 8 brindes
 * escolhidos para AQUELE cliente, cada um com a nota de encaixe e o motivo
 * escrito em português.
 *
 * ZERO CHAMADA DE IA, e isso é arquitetura, não economia: a IA do sistema está
 * com a chave inválida (41 de 41 chamadas com HTTP 401), então qualquer coisa
 * que dependesse dela nasceria morta. Quem escolhe é o banco, numa única RPC
 * (`rpc_sales_assistant_candidates`); quem narra é `buildReason`, uma função
 * pura. A IA entra só na fase 3.
 *
 * O QUE ESTE ARQUIVO FAZ: liga os dois hooks, decide QUAL estado está na tela e
 * monta o rodapé honesto. Não pontua, não ordena, não filtra e não escreve
 * motivo — tudo isso mora nas camadas de baixo.
 *
 * FAIXA DE PREÇO DESLIGADA NA FASE 1, e de propósito: `useSalesAssistantCandidates`
 * aceita `faixaDePreco`, mas não existe faixa medida para a empresa do CRM —
 * `ticket_medio` e `perfil_preco` estão em `CrmCustomer` (src/types/crm.ts:250,253),
 * não em `CrmCompany`, que é o que `/clientes/:id` carrega. Inventar uma faixa
 * faria o card afirmar "está na faixa que o cliente costuma comprar" sem faixa
 * nenhuma na mão. Então o sinal de preço fica em 0 e o card não o cita.
 *
 * NOVIDADE NÃO É PEDIDO NA FASE 1: `queriaNovidade` vai `false` porque o card
 * não pede novidade a ninguém. Assim o rodapé nunca diz "não achei novidade" —
 * seria confessar a falta de algo que nunca foi procurado.
 */

import { Sparkles } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  buildHonestNote,
  type PedidoDeEncaixe,
  type ResultadoDoEncaixe,
} from '@/lib/assistant/buildReason';
import { useClientBrandSignals } from '@/hooks/assistant/useClientBrandSignals';
import {
  SCORE_MINIMO,
  useSalesAssistantCandidates,
  type CandidatoDeEncaixe,
} from '@/hooks/assistant/useSalesAssistantCandidates';

import { SalesAssistantProductRow } from './SalesAssistantProductRow';
import {
  SalesAssistantError,
  SalesAssistantSemCandidatos,
  SalesAssistantSemSinal,
  SalesAssistantSkeleton,
} from './SalesAssistantStates';

/** Título do card. Exportado porque o teste e a página citam o mesmo texto. */
export const TITULO_DO_CARD = 'Encaixe do Cliente';

const ID_DO_TITULO = 'encaixe-do-cliente-titulo';

/** Conta quantos candidatos satisfazem uma condição. Sem isto, nada de claim. */
function contar(
  candidatos: readonly CandidatoDeEncaixe[],
  condicao: (candidato: CandidatoDeEncaixe) => boolean,
): number {
  return candidatos.filter(condicao).length;
}

/**
 * Traduz a lista entregue em contagens medidas para `buildHonestNote`.
 *
 * Toda contagem sai da lista que está na tela — nenhuma é estimada. É por isso
 * que o rodapé pode afirmar "3 estão sem a marca de gravação" sem mentir.
 */
function resultadoDaLista(candidatos: readonly CandidatoDeEncaixe[]): ResultadoDoEncaixe {
  return {
    total: candidatos.length,
    comNovidade: contar(candidatos, (c) => c.sinais.novidade),
    comCorDaLogo: contar(candidatos, (c) => c.sinais.cor),
    comGiro: contar(candidatos, (c) => c.sinais.giro),
    comGiroNaCorDaLogo: contar(candidatos, (c) => c.sinais.giro && c.sinais.cor),
    semMarcaDeGravacao: contar(candidatos, (c) => !c.sinais.gravacao),
  };
}

export interface SalesAssistantCardProps {
  /** `companies.id` do CRM externo, como vem de `/clientes/:id`. */
  readonly clientId: string | undefined;
}

export function SalesAssistantCard({ clientId }: SalesAssistantCardProps) {
  const {
    sinais,
    isLoading: carregandoSinais,
    isError: erroNosSinais,
    error: erroDosSinais,
  } = useClientBrandSignals(clientId);

  const candidatosQuery = useSalesAssistantCandidates(sinais);
  const candidatos = candidatosQuery.data ?? [];

  const pedido: PedidoDeEncaixe = {
    queriaNovidade: false,
    corDaLogoNome: sinais.encaixesDeCor[0]?.nomeDoGrupo ?? null,
    faixaMin: null,
    faixaMax: null,
  };
  const notaHonesta = buildHonestNote(pedido, resultadoDaLista(candidatos));

  const carregando = carregandoSinais || candidatosQuery.isLoading;

  const corpo = (() => {
    if (carregando) return <SalesAssistantSkeleton />;

    if (erroNosSinais) {
      return (
        <SalesAssistantError
          mensagem={erroDosSinais?.message ?? 'O CRM não respondeu.'}
          /* Sem botão: `useClientBrandSignals` não expõe `refetch`. */
        />
      );
    }

    if (candidatosQuery.isError) {
      return (
        <SalesAssistantError
          mensagem={candidatosQuery.error?.message ?? 'A busca de brindes falhou.'}
          onTentarNovamente={() => {
            candidatosQuery.refetch().catch(() => undefined);
          }}
        />
      );
    }

    if (!sinais.temSinalSuficiente) return <SalesAssistantSemSinal sinais={sinais} />;

    if (candidatos.length === 0) {
      return <SalesAssistantSemCandidatos notaHonesta={notaHonesta} scoreMinimo={SCORE_MINIMO} />;
    }

    return (
      <>
        <ul className="space-y-1">
          {candidatos.map((candidato) => (
            <SalesAssistantProductRow key={candidato.produtoId} candidato={candidato} />
          ))}
        </ul>
        {notaHonesta !== null && (
          <p className="border-t border-border pt-2 text-xs text-muted-foreground">{notaHonesta}</p>
        )}
      </>
    );
  })();

  return (
    <Card role="region" aria-labelledby={ID_DO_TITULO}>
      <CardHeader>
        <CardTitle id={ID_DO_TITULO} className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" /> {TITULO_DO_CARD}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2" aria-busy={carregando}>
        {corpo}
      </CardContent>
    </Card>
  );
}
