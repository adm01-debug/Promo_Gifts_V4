import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { enrichGraphWithTypeReferences } from '../../scripts/graphify/enrich-typescript-references.mjs';

const temporaryDirectories = [];
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function graphifyFileAndSymbol(file, symbol, line) {
  const base = file.replace(/\.[^.]+$/, '');
  const normalize = (value) => value.toLowerCase().replace(/[^\p{L}\p{N}_]+/gu, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return {
    id: normalize(`${base}_${symbol}`),
    label: symbol,
    _origin: 'ast',
    file_type: 'code',
    source_file: file,
    source_location: `L${line}`,
  };
}

describe('Graphify TypeScript type references', () => {
  it('adds cross-file type/interface edges and stays idempotent', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'graphify-ts-refs-'));
    temporaryDirectories.push(root);
    mkdirSync(path.join(root, 'src'), { recursive: true });
    writeFileSync(path.join(root, 'src/types.ts'), [
      'export type ProductId = string;',
      'export interface Product { id: ProductId }',
      '',
    ].join('\n'));
    writeFileSync(path.join(root, 'src/cart.ts'), [
      'import type { Product, ProductId } from "./types";',
      'export interface CartProduct extends Product { productId: ProductId }',
      'export type CartMap = Map<ProductId, Product>;',
      '',
    ].join('\n'));
    const options = {
      strict: true,
      noEmit: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    };
    const program = ts.createProgram([
      path.join(root, 'src/types.ts'),
      path.join(root, 'src/cart.ts'),
    ], options);
    const graph = {
      directed: false,
      nodes: [
        { id: 'src_types', label: 'types.ts', _origin: 'ast', file_type: 'code', source_file: 'src/types.ts', source_location: 'L1' },
        graphifyFileAndSymbol('src/types.ts', 'ProductId', 1),
        graphifyFileAndSymbol('src/types.ts', 'Product', 2),
        { id: 'src_cart', label: 'cart.ts', _origin: 'ast', file_type: 'code', source_file: 'src/cart.ts', source_location: 'L1' },
      ],
      links: [],
    };
    const first = enrichGraphWithTypeReferences(graph, program, { root });
    expect(first.added).toBe(2);
    expect(graph.links.filter((edge) => edge.relation === 'references_type')).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'src_cart', target: 'src_types_product', relation: 'references_type' }),
      expect.objectContaining({ source: 'src_cart', target: 'src_types_productid', relation: 'references_type' }),
    ]));
    expect(enrichGraphWithTypeReferences(graph, program, { root }).added).toBe(0);
  });
});
