import {
  Briefcase,
  Coffee,
  Crown,
  Gift,
  Heart,
  Laptop,
  Leaf,
  Package,
  Sparkles,
  Star,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * Ícones permitidos nos templates de kit.
 *
 * Uma lista explícita mantém a seleção armazenada no banco determinística e
 * permite que o bundler elimine os demais ícones. Importar `* as Lucide`
 * preservava todos os exports da biblioteca (mais de 600 kB) no login.
 */
export const KIT_TEMPLATE_ICONS = {
  Package,
  Gift,
  Heart,
  Star,
  Crown,
  Sparkles,
  Briefcase,
  Coffee,
  Laptop,
  Leaf,
  Trophy,
  Users,
} satisfies Record<string, LucideIcon>;

export const KIT_TEMPLATE_ICON_NAMES = Object.keys(KIT_TEMPLATE_ICONS) as Array<
  keyof typeof KIT_TEMPLATE_ICONS
>;

export function getKitTemplateIcon(name: string | null | undefined): LucideIcon {
  return KIT_TEMPLATE_ICONS[name as keyof typeof KIT_TEMPLATE_ICONS] ?? Package;
}
