/**
 * Testes — ExportFavoritesButton (RESGATE)
 *
 * Provam o que o resgate entrega de fato: o CSV sai com as colunas do vendedor
 * (SKU, preço, categoria, variante, nota, preço salvo) e o JSON cruza
 * `products` com `rawItems` pelo `product_id`. Sem isto o botão poderia
 * "funcionar" exportando um arquivo vazio.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ExportFavoritesButton } from '@/components/favorites/ExportFavoritesButton';
import type { Product } from '@/types/product-catalog';
import type { FavoriteListItem } from '@/hooks/favorites';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

/** Captura o conteúdo do Blob que o componente manda baixar. */
const baixados: { nome: string; texto: string }[] = [];

beforeEach(() => {
  baixados.length = 0;
  vi.clearAllMocks();
  // jsdom não implementa createObjectURL; aqui ele também serve de espião.
  globalThis.URL.createObjectURL = vi.fn((blob: Blob) => {
    // `Blob.text()` é assíncrono; o componente revoga a URL em seguida, então
    // o conteúdo é lido aqui de forma síncrona a partir do que foi construído.
    const qualquer = blob as unknown as { __texto?: string };
    baixados.push({ nome: '', texto: qualquer.__texto ?? '' });
    return 'blob:fake';
  }) as unknown as typeof URL.createObjectURL;
  globalThis.URL.revokeObjectURL = vi.fn();

  // Blob real do jsdom não expõe o conteúdo de forma síncrona: embrulha para
  // guardar o texto no próprio objeto.
  const BlobOriginal = globalThis.Blob;
  class BlobEspiao extends BlobOriginal {
    __texto: string;
    constructor(partes: BlobPart[] = [], opcoes?: BlobPropertyBag) {
      super(partes, opcoes);
      this.__texto = partes.map((p) => (typeof p === 'string' ? p : '')).join('');
    }
  }
  globalThis.Blob = BlobEspiao as unknown as typeof Blob;

  // `a.click()` em jsdom não baixa nada, mas também não deve explodir.
  HTMLAnchorElement.prototype.click = vi.fn();
});

const produtos: Product[] = [
  {
    id: 'p1',
    name: 'Caneta Metal',
    sku: 'SKU-1',
    price: 12.5,
    category_name: 'Canetas',
    description: '',
    shortDescription: '',
    images: ['https://cdn.test/1.jpg'],
    image_url: 'https://cdn.test/1.jpg',
    stock: 10,
    colors: [],
    materials: [],
  } as unknown as Product,
  {
    id: 'p2',
    name: 'Caderno; com ponto e vírgula',
    sku: 'SKU-2',
    price: 30,
    category_name: 'Cadernos',
    description: '',
    shortDescription: '',
    images: [],
    image_url: '',
    stock: 3,
    colors: [],
    materials: [],
  } as unknown as Product,
];

const itens: FavoriteListItem[] = [
  {
    id: 'i1',
    list_id: 'l1',
    user_id: 'u1',
    product_id: 'p1',
    variant_id: null,
    variant_info: { color_name: 'Azul' },
    note: 'confirmar prazo',
    price_at_save: 11,
    position: 0,
    added_at: '2026-11-01T10:00:00.000Z',
  } as unknown as FavoriteListItem,
];

async function abrirMenu() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /Exportar/i }));
  return user;
}

describe('ExportFavoritesButton', () => {
  it('fica desabilitado sem produtos — não exporta arquivo vazio', () => {
    render(<ExportFavoritesButton products={[]} rawItems={[]} listName="Minha lista" />);
    expect(screen.getByRole('button', { name: /Exportar/i })).toBeDisabled();
  });

  it('oferece os três formatos', async () => {
    render(<ExportFavoritesButton products={produtos} rawItems={itens} listName="Minha lista" />);
    await abrirMenu();
    expect(screen.getByText('PDF Catálogo')).toBeInTheDocument();
    expect(screen.getByText('CSV (Excel)')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
  });

  it('CSV leva as colunas do vendedor e cruza a nota pelo product_id', async () => {
    render(<ExportFavoritesButton products={produtos} rawItems={itens} listName="Minha lista" />);
    const user = await abrirMenu();
    await user.click(screen.getByText('CSV (Excel)'));

    expect(baixados).toHaveLength(1);
    const csv = baixados[0].texto;
    // BOM, para o Excel abrir com acento correto.
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain(
      'SKU,Nome,Preço (R$),Categoria,Variante,Nota,Salvo em (R$),Adicionado em',
    );
    // Linha do produto que TEM item: variante, nota e preço salvo vieram do rawItems.
    expect(csv).toContain(
      'SKU-1,Caneta Metal,12.50,Canetas,Azul,confirmar prazo,11.00,2026-11-01T10:00:00.000Z',
    );
    // Produto SEM item: colunas de item ficam vazias, não inventadas.
    expect(csv).toContain('SKU-2,"Caderno; com ponto e vírgula",30.00,Cadernos,,,,');
  });

  it('JSON preserva price_at_save e nota, e deixa null no que não existe', async () => {
    render(<ExportFavoritesButton products={produtos} rawItems={itens} listName="Minha lista" />);
    const user = await abrirMenu();
    await user.click(screen.getByText('JSON'));

    expect(baixados).toHaveLength(1);
    const payload = JSON.parse(baixados[0].texto);
    expect(payload.list).toBe('Minha lista');
    expect(payload.total).toBe(2);
    expect(payload.items[0]).toMatchObject({
      product_id: 'p1',
      sku: 'SKU-1',
      price: 12.5,
      category: 'Canetas',
      note: 'confirmar prazo',
      price_at_save: 11,
    });
    expect(payload.items[1]).toMatchObject({
      product_id: 'p2',
      note: null,
      price_at_save: null,
      variant: null,
    });
  });
});
