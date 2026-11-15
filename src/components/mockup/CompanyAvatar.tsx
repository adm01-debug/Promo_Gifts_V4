/**
 * CompanyAvatar — logo da empresa ou iniciais, usado no chip e na lista do
 * seletor de cliente do mockup.
 */
import { cn } from '@/lib/utils';

export function CompanyAvatar({
  name,
  logoUrl,
  size = 'md',
}: {
  name: string;
  logoUrl?: string | null;
  size?: 'md' | 'sm';
}) {
  const dim = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-8 h-8 text-xs';

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className={cn(
          dim,
          'flex-shrink-0 rounded-full border border-border bg-background object-cover',
        )}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={cn(
        dim,
        'flex flex-shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground',
      )}
    >
      {name.substring(0, 2).toUpperCase()}
    </div>
  );
}
