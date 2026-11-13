import type { ComponentProps } from 'react';
import type { CartTemplateItem } from '@/hooks/useCartTemplates';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CartEmptyStateSmart } from './CartEmptyStateSmart';

export function CartEmptyStateWithTemplates({
  templates,
  onApplyTemplate,
  ...props
}: ComponentProps<typeof CartEmptyStateSmart> & {
  templates: { id: string; name: string; description?: string | null; items: CartTemplateItem[] }[];
  onApplyTemplate: (items: CartTemplateItem[]) => void;
}) {
  return (
    <>
      <CartEmptyStateSmart {...props} />
      {templates.length > 0 && (
        <section className="mx-auto max-w-4xl space-y-3 px-2" aria-label="Templates de carrinho">
          <h3 className="font-display text-sm font-semibold">Começar com um template</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id} className="space-y-2 p-4">
                <h4 className="font-semibold">{template.name}</h4>
                {template.description && (
                  <p className="text-xs text-muted-foreground">{template.description}</p>
                )}
                <p className="text-xs text-muted-foreground">{template.items.length} produto(s)</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onApplyTemplate(template.items)}
                >
                  Usar template
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
