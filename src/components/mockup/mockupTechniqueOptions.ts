/**
 * Opções do filtro de técnica no histórico de mockups.
 *
 * A chave de cada opção é o NOME da técnica, não o id: o filtro do painel compara
 * com `mockup.technique_name`. Por isso o catálogo entra por nome também.
 */

export interface TechniqueOption {
  id: string;
  name: string;
}

/**
 * Funde as técnicas que já aparecem no histórico com as do catálogo, sem repetir
 * rótulo. Sem o catálogo, uma técnica recém-cadastrada — ainda sem nenhum mockup —
 * não apareceria no filtro.
 */
export function buildMockupTechniqueOptions(
  history: readonly { technique_name?: string | null }[],
  catalog: readonly { name?: string | null }[] = [],
): TechniqueOption[] {
  const seen = new Set<string>();
  const result: TechniqueOption[] = [];

  const add = (name: string | null | undefined) => {
    if (!name || seen.has(name)) return;
    seen.add(name);
    result.push({ id: name, name });
  };

  for (const m of history) add(m.technique_name);
  for (const t of catalog) add(t.name);

  return result.sort((a, b) => a.name.localeCompare(b.name));
}
