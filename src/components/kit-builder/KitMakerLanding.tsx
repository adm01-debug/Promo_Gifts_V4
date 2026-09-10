import { ArrowRight, BookOpen, Boxes, CheckCircle2, Library, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { KitAIPromptDialog } from '@/components/kit-builder/KitAIPromptDialog';

interface KitMakerLandingProps {
  onStart: (flow: 'box-first' | 'items-first') => void;
  onApplyAISuggestion: (suggestion: {
    kit_type: 'montado' | 'original' | 'simples';
    box_keywords: string[];
    item_keywords: string[];
  }) => void;
}

const BENEFITS = [
  [
    'Validação inteligente',
    'Compatibilidade, ocupação e peso são recalculados durante a montagem.',
  ],
  ['Caixas recomendadas', 'Encontre embalagens compatíveis depois de definir os itens.'],
  ['Personalização completa', 'Configure técnicas, áreas, cores e dimensões por item.'],
  ['Orçamento rastreável', 'Revise valores e crie o orçamento em uma operação transacional.'],
] as const;

export function KitMakerLanding({ onStart, onApplyAISuggestion }: KitMakerLandingProps) {
  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-7 px-3 py-6 sm:px-5 lg:px-8">
      <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Boxes className="h-4 w-4 text-primary" /> Ferramentas / Kit Maker
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Kit Maker</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Monte kits personalizados de forma simples e inteligente, com dados comerciais e
            validações visíveis em cada etapa.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/meus-kits">
              <Library className="mr-2 h-4 w-4" />
              Meus kits
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <a href="#como-funciona">
              <BookOpen className="mr-2 h-4 w-4" />
              Como funciona
            </a>
          </Button>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden border-primary/50 bg-primary/5 shadow-sm">
          <CardContent className="relative space-y-5 p-6 sm:p-8">
            <span className="inline-flex rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              MODO RECOMENDADO
            </span>
            <div>
              <h2 className="font-display text-2xl font-bold">Começar pelos itens</h2>
              <p className="mt-2 max-w-md text-muted-foreground">
                Escolha a composição primeiro. Depois, o sistema apresenta as caixas que podem
                acomodar o kit com os dados disponíveis.
              </p>
            </div>
            <ul className="space-y-2 text-sm">
              {[
                'Escolha produtos e variantes',
                'Defina unidades por kit',
                'Receba recomendações de caixa',
                'Valide antes de criar o orçamento',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <Button onClick={() => onStart('items-first')} size="lg">
              Começar pelos itens <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardContent className="space-y-5 p-6 sm:p-8">
            <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              OUTRA FORMA DE MONTAR
            </span>
            <div>
              <h2 className="font-display text-2xl font-bold">Começar pela caixa</h2>
              <p className="mt-2 max-w-md text-muted-foreground">
                Se a embalagem já foi definida, selecione-a e monte a composição com validação de
                compatibilidade desde o primeiro item.
              </p>
            </div>
            <ul className="space-y-2 text-sm">
              {[
                'Explore o catálogo de embalagens',
                'Use filtros por medida e material',
                'Adicione itens compatíveis',
                'Acompanhe ocupação e preço',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <Button variant="outline" onClick={() => onStart('box-first')} size="lg">
              Começar pela caixa <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </section>

      <section id="como-funciona" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {BENEFITS.map(([title, description]) => (
          <Card key={title} className="border-border/60">
            <CardContent className="p-5">
              <Sparkles className="mb-3 h-5 w-5 text-primary" />
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-lg font-semibold">
              Precisa de uma ideia para montar o kit?
            </h2>
            <p className="text-sm text-muted-foreground">
              A IA sugere filtros; você confirma produtos, preços, estoque e compatibilidade.
            </p>
          </div>
          <KitAIPromptDialog onApply={onApplyAISuggestion} />
        </CardContent>
      </Card>
    </main>
  );
}
