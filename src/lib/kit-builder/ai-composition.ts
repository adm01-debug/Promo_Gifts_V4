import { rankBoxesForItems } from './box-recommendations';
import {
  normalizeKitItemLine,
  type KitAIComposition,
  type KitAISuggestionBrief,
  type KitBox,
  type KitItem,
} from './types';

const MAX_ALTERNATIVES = 3;
const TARGET_ITEMS = 4;

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

function candidateScore(item: KitItem, keywords: string[]): number {
  const haystack = normalizeSearch(
    [item.name, item.sku, item.category, item.material].filter(Boolean).join(' '),
  );
  return keywords.reduce((score, keyword) => {
    const words = normalizeSearch(keyword)
      .split(/\s+/)
      .filter((word) => word.length > 2);
    return score + words.reduce((sum, word) => sum + (haystack.includes(word) ? 3 : 0), 0);
  }, 0);
}

function boxScore(box: KitBox, keywords: string[]): number {
  const haystack = normalizeSearch(
    [box.name, box.sku, box.material, box.boxType, box.color].filter(Boolean).join(' '),
  );
  return keywords.reduce(
    (score, keyword) => score + (haystack.includes(normalizeSearch(keyword)) ? 4 : 0),
    0,
  );
}

/**
 * Resolves AI semantics against catalog facts. The model never supplies IDs,
 * prices, stock or fit decisions: those always come from the current catalog
 * and the deterministic compatibility engine.
 */
export function resolveKitAICompositions(
  brief: KitAISuggestionBrief,
  catalogItems: KitItem[],
  catalogBoxes: KitBox[],
): KitAIComposition[] {
  const maxBudget = Number.isFinite(brief.target_price_brl.max)
    ? Math.max(0, brief.target_price_brl.max)
    : Number.POSITIVE_INFINITY;
  const rankedItems = catalogItems
    .filter(
      (item) =>
        Number.isFinite(item.price) &&
        item.price >= 0 &&
        item.dimensionsKnown !== false &&
        item.volume > 0,
    )
    .map((item) => ({ item, score: candidateScore(item, brief.item_keywords) }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.item.price - right.item.price ||
        left.item.name.localeCompare(right.item.name, 'pt-BR'),
    );

  const alternatives: KitAIComposition[] = [];
  const signatures = new Set<string>();

  for (
    let seed = 0;
    seed < Math.min(MAX_ALTERNATIVES, Math.max(1, rankedItems.length));
    seed += 1
  ) {
    const rotated = [...rankedItems.slice(seed), ...rankedItems.slice(0, seed)];
    const selected: KitItem[] = [];
    let itemTotal = 0;
    for (const { item } of rotated) {
      if (selected.length >= TARGET_ITEMS) break;
      if (selected.some((candidate) => candidate.id === item.id)) continue;
      // Keep room for a package whenever possible. If the budget is too low,
      // an empty result is safer than inventing a price or silently exceeding it.
      if (itemTotal + item.price > maxBudget) continue;
      selected.push(normalizeKitItemLine({ ...item, quantity: 1 }));
      itemTotal += item.price;
    }
    if (selected.length === 0) continue;

    const compatibleBoxes = rankBoxesForItems(catalogBoxes, selected)
      .filter((candidate) => candidate.status !== 'incompatible')
      .sort((left, right) => {
        const keywordDifference =
          boxScore(right.box, brief.box_keywords) - boxScore(left.box, brief.box_keywords);
        if (keywordDifference !== 0) return keywordDifference;
        return left.box.price - right.box.price;
      });
    const packageCandidate =
      compatibleBoxes.find((candidate) => itemTotal + candidate.box.price <= maxBudget) ?? null;
    if (!packageCandidate) continue;

    const signature = `${packageCandidate.box.id}:${selected
      .map((item) => item.id)
      .sort()
      .join(',')}`;
    if (signatures.has(signature)) continue;
    signatures.add(signature);
    alternatives.push({
      id: `catalog-${seed + 1}-${signature}`,
      name: `Kit sugerido ${alternatives.length + 1}`,
      narrative: brief.narrative,
      kitType: brief.kit_type,
      box: packageCandidate.box,
      items: selected,
      unitPrice: itemTotal + packageCandidate.box.price,
      fitStatus: packageCandidate.status === 'compatible' ? 'compatible' : 'inconclusive',
    });
  }

  return alternatives;
}
