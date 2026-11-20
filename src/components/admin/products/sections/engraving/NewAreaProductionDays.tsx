/**
 * Campo "Prazo (dias úteis)" do passo Detalhes do assistente de gravação: a
 * sugestão do campo vazio vem das faixas da tabela de preço da técnica escolhida.
 */
import { usePriceTableBands } from '@/hooks/freight';
import type { useEngravingWizard } from './useEngravingWizard';
import { ProductionDaysInput } from './ProductionDaysInput';
import { tableLeadTimePlaceholder } from './productionDays';

interface NewAreaProductionDaysProps {
  wizard: Pick<
    ReturnType<typeof useEngravingWizard>,
    'detailForm' | 'selectedTechnique' | 'setDetailForm'
  >;
}

export function NewAreaProductionDays({ wizard }: NewAreaProductionDaysProps) {
  const tabelaPrecoId = wizard.selectedTechnique?.id ?? '';
  const priceBands = usePriceTableBands([tabelaPrecoId]);
  return (
    <div className="sm:max-w-[14rem]">
      <ProductionDaysInput
        id="production-days-new"
        value={wizard.detailForm.production_days}
        onChange={(value) => wizard.setDetailForm((f) => ({ ...f, production_days: value }))}
        placeholder={tableLeadTimePlaceholder(priceBands, tabelaPrecoId)}
      />
    </div>
  );
}
