/**
 * Kit Maker Guide Content
 * Texto real por capítulo para o KitMakerGuideDialog — substitui o antigo
 * atalho que reabria sempre o mesmo KitOnboardingTour genérico.
 */

export type KitMakerGuideChapterId = 'ai' | 'box' | 'items' | 'personalization' | 'summary';

export interface KitMakerGuideChapter {
  id: KitMakerGuideChapterId;
  title: string;
  content: string;
}

export const KIT_MAKER_GUIDE_CHAPTERS: KitMakerGuideChapter[] = [
  {
    id: 'items',
    title: 'Itens',
    content:
      'Busque produtos por nome ou SKU e use os filtros de categoria, material e preço para reduzir o catálogo. ' +
      'As sugestões inteligentes recomendam itens complementares à sua composição atual. ' +
      'Alterne entre grade e lista, e adicione ou remova produtos com um clique — a lateral mostra o kit sendo montado em tempo real.',
  },
  {
    id: 'box',
    title: 'Caixa',
    content:
      'As caixas recomendadas consideram compatibilidade de dimensões, ocupação estimada e peso da sua composição. ' +
      'Filtros avançados (dimensões, preço, tipo, acabamento e material) ajudam a restringir a busca a embalagens compatíveis. ' +
      'Compare até 3 caixas lado a lado antes de decidir, ou avance sem escolher uma agora e volte depois.',
  },
  {
    id: 'personalization',
    title: 'Personalização',
    content:
      'Configure técnica de gravação, área de aplicação e cores para a caixa e para cada item do kit. ' +
      'O preview ao vivo na lateral mostra o resultado conforme você ajusta cada opção, para conferir antes de avançar.',
  },
  {
    id: 'summary',
    title: 'Revisão',
    content:
      'Confira a saúde da composição — compatibilidade, ocupação, margem e disponibilidade de estoque — antes de fechar o kit. ' +
      'Exporte um PDF para compartilhar ou envie a composição direto para um orçamento.',
  },
  {
    id: 'ai',
    title: 'IA',
    content:
      'Descreva a ocasião, o público ou a verba em uma frase e a IA sugere uma composição completa de itens e caixa. ' +
      'Revise a sugestão e aplique com um clique para continuar ajustando manualmente a partir dela.',
  },
];

export function getKitMakerGuideChapter(
  id: KitMakerGuideChapterId,
): KitMakerGuideChapter | undefined {
  return KIT_MAKER_GUIDE_CHAPTERS.find((chapter) => chapter.id === id);
}
