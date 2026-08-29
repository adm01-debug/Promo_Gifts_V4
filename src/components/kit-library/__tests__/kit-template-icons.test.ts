import { describe, expect, it } from 'vitest';
import {
  getKitTemplateIcon,
  KIT_TEMPLATE_ICON_NAMES,
  KIT_TEMPLATE_ICONS,
} from '../kit-template-icons';

describe('kit-template-icons', () => {
  it('expõe somente os ícones aceitos pelo seletor de templates', () => {
    expect(KIT_TEMPLATE_ICON_NAMES).toEqual([
      'Package',
      'Gift',
      'Heart',
      'Star',
      'Crown',
      'Sparkles',
      'Briefcase',
      'Coffee',
      'Laptop',
      'Leaf',
      'Trophy',
      'Users',
    ]);
    expect(new Set(KIT_TEMPLATE_ICON_NAMES).size).toBe(KIT_TEMPLATE_ICON_NAMES.length);
  });

  it.each(KIT_TEMPLATE_ICON_NAMES)('resolve %s sem alterar a identidade do componente', (name) => {
    expect(getKitTemplateIcon(name)).toBe(KIT_TEMPLATE_ICONS[name]);
  });

  it.each([undefined, null, '', 'UnknownIcon'])('usa Package como fallback para %s', (name) => {
    expect(getKitTemplateIcon(name)).toBe(KIT_TEMPLATE_ICONS.Package);
  });
});
