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
  const minBudget = Number.isFinite(brief.target_price_brl.min)
    ? Math.max(0, brief.target_price_brl.min)
    : 0;
  const maxBudget = Number.isFinite(brief.target_price_brl.max)
    ? Math.max(0, brief.target_price_brl.max)
    : Number.POSITIVE_INFINITY;
  if (minBudget > maxBudget) return [];
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

  // Search every ranked starting point until enough valid alternatives are
  // found. Compatibility can invalidate several high-scoring products, so
  // limiting this loop to three rotations made a valid seventh candidate
  // unreachable even though it existed in the canonical catalog.
  for (
    let seed = 0;
    seed < rankedItems.length && alternatives.length < MAX_ALTERNATIVES;
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

    // Explore every subset of the (at most four) relevant items. This small,
    // bounded backtracking step reserves the package budget without an
    // unbounded catalog search and can remove a cheap low-impact item instead
    // of accidentally dropping the product that makes the briefing useful.
    let packageCandidate: ReturnType<typeof rankBoxesForItems>[number] | null = null;
    let finalItems: KitItem[] = [];
    let unitPrice = 0;
    let bestScore = Number.NEGATIVE_INFINITY;
    const subsetCount = 1 << selected.length;
    for (let mask = 1; mask < subsetCount; mask += 1) {
      const subset = selected.filter((_, index) => (mask & (1 << index)) !== 0);
      const subsetTotal = subset.reduce((total, item) => total + item.price, 0);
      const compatibleBoxes = rankBoxesForItems(catalogBoxes, subset)
        .filter((candidate) => candidate.status !== 'incompatible')
        .sort((left, right) => {
          const keywordDifference =
            boxScore(right.box, brief.box_keywords) - boxScore(left.box, brief.box_keywords);
          if (keywordDifference !== 0) return keywordDifference;
          return left.box.price - right.box.price;
        });
      const subsetPackage = compatibleBoxes.find((candidate) => {
        const total = subsetTotal + candidate.box.price;
        return total >= minBudget && total <= maxBudget;
      });
      if (!subsetPackage) continue;

      const subsetUnitPrice = subsetTotal + subsetPackage.box.price;
      const relevance = subset.reduce(
        (score, item) => score + candidateScore(item, brief.item_keywords),
        0,
      );
      const score = relevance * 1_000 + subset.length * 100 + subsetUnitPrice;
      if (score > bestScore) {
        bestScore = score;
        packageCandidate = subsetPackage;
        finalItems = subset;
        unitPrice = subsetUnitPrice;
      }
    }
    if (!packageCandidate) continue;

    const signature = `${packageCandidate.box.id}:${finalItems
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
      items: finalItems,
      unitPrice,
      fitStatus: packageCandidate.status === 'compatible' ? 'compatible' : 'inconclusive',
    });
  }

  return alternatives;
}
