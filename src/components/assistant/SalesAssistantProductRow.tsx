/**
 * Uma linha do card "Encaixe do Cliente": o brinde, a nota, os selos dos
 * sinais que pontuaram e a frase que explica a escolha.
 *
 * Esta camada só DESENHA. Não pontua, não ordena e não decide encaixe — tudo
 * isso veio da RPC `rpc_sales_assistant_candidates` e chegou aqui pronto em
 * `CandidatoDeEncaixe`. A frase vem de `buildReason`, nunca de texto escrito
 * à mão aqui, para a tela e a camada de motivo nunca divergirem.
 *
 * ACESSIBILIDADE (exigência da tarefa, verificada em teste):
 *   • A nota NÃO é comunicada só por cor: o número aparece como texto e tem
 *     uma leitura completa em `sr-only` ("Encaixe 82 de 110 pontos").
 *   • Cada selo carrega o rótulo escrito; o ícone é decorativo
 *     (`aria-hidden`), então um selo nunca depende de cor nem de ícone.
 *   • O alvo de toque da linha inteira tem 44px de altura mínima.
 */

import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  Briefcase,
  ImageOff,
  Palette,
  Sparkles,
  Tag,
  Truck,
  type LucideIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatBRL } from '@/utils/currency';
import {
  AVISO_GRAVACAO,
  ORDEM_DOS_SINAIS,
  buildReason,
  type ChaveDeSinal,
} from '@/lib/assistant/buildReason';
import type { CandidatoDeEncaixe } from '@/hooks/assistant/useSalesAssistantCandidates';

/**
 * Máximo teórico da nota: 30 (ramo) + 25 (cor) + 15 (giro) + 12 (novidade) +
 * 10 (gravação) + 10 (preço) + 8 (estoque). É a tabela de pesos declarada em
 * `supabase/migrations/20261115034500_rpc_sales_assistant_candidates.sql`.
 * Mudou lá, muda aqui — o número só existe para dar escala ao vendedor.
 */
export const SCORE_MAXIMO = 110;

/** Preço ausente não vira "R$ 0,00": vira a verdade. */
export const SEM_PRECO = 'Preço sob consulta';

const ICONE_POR_SINAL: Readonly<Record<ChaveDeSinal, LucideIcon>> = {
  cor: Palette,
  estoque: Truck,
  giro: Award,
  gravacao: Sparkles,
  novidade: Sparkles,
  preco: Tag,
  ramo: Briefcase,
};

/**
 * Rótulo curto de cada selo. Cita o dado medido quando ele existe (nome do
 * ramo, nome do grupo de cor, classe ABC) e cai para o rótulo genérico quando
 * não existe — nunca inventa o dado que falta.
 */
function rotuloDoSinal(chave: ChaveDeSinal, candidato: CandidatoDeEncaixe): string {
  const { ramoNome, corNome, classeGiro } = candidato.dados;
  switch (chave) {
    case 'ramo':
      return ramoNome ? `Ramo ${ramoNome}` : 'Serve para o ramo';
    case 'cor':
      return corNome ? `Cor ${corNome}` : 'Cor da logo';
    case 'giro':
      return classeGiro ? `Classe ${classeGiro}` : 'Mais vendido no fornecedor';
    case 'novidade':
      return 'Novidade';
    case 'gravacao':
      return 'Aceita gravação';
    case 'preco':
      return 'Na faixa de preço';
    case 'estoque':
      return 'Pronta entrega';
  }
}

interface SalesAssistantProductRowProps {
  readonly candidato: CandidatoDeEncaixe;
}

export function SalesAssistantProductRow({ candidato }: SalesAssistantProductRowProps) {
  const sinaisQuePontuaram = ORDEM_DOS_SINAIS.filter((chave) => candidato.sinais[chave]);
  const motivo = buildReason(candidato.sinais, candidato.dados);
  const nome = candidato.nome.trim() !== '' ? candidato.nome : 'Produto sem nome no cadastro';
  const leituraDaNota = `Encaixe ${candidato.score} de ${SCORE_MAXIMO} pontos`;

  return (
    <li>
      <Link
        to={`/produto/${candidato.produtoId}`}
        className={cn(
          'flex min-h-[44px] items-start gap-3 rounded-md p-2',
          'transition-colors hover:bg-muted/50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
          {candidato.imagemUrl ? (
            <img
              src={candidato.imagemUrl}
              alt={nome}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <ImageOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-medium text-foreground">{nome}</p>

          <ul className="flex flex-wrap gap-1" aria-label="Sinais que pontuaram">
            {sinaisQuePontuaram.map((chave) => {
              const Icone = ICONE_POR_SINAL[chave];
              return (
                <li key={chave}>
                  <Badge variant="secondary" className="gap-1 font-normal">
                    <Icone className="h-3 w-3" aria-hidden="true" />
                    {rotuloDoSinal(chave, candidato)}
                  </Badge>
                </li>
              );
            })}
            {/*
              Gravação sem a marca no cadastro NUNCA some da tela: a ingestão
              do campo está quebrada (274 novidades, 0 com a marca), então
              `false` não prova ausência — por isso é ressalva visível, e não
              filtro silencioso.
            */}
            {!candidato.sinais.gravacao && (
              <li>
                <Badge variant="outline" className="gap-1 font-normal">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  {AVISO_GRAVACAO}
                </Badge>
              </li>
            )}
          </ul>

          <p className="text-xs text-muted-foreground">{motivo}</p>
        </div>

        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <span className="text-xs font-medium text-foreground">
            {candidato.precoDeVenda === null ? SEM_PRECO : formatBRL(candidato.precoDeVenda)}
          </span>
          <Badge variant="secondary" className="font-mono">
            <span aria-hidden="true">
              {candidato.score}/{SCORE_MAXIMO}
            </span>
            <span className="sr-only">{leituraDaNota}</span>
          </Badge>
        </div>
      </Link>
    </li>
  );
}
