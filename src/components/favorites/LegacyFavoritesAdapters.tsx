import {
  cloneElement,
  type ComponentProps,
  type MouseEventHandler,
  type ReactElement,
  useState,
} from 'react';
import { Monitor } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { FavoritesViewHeader } from './FavoritesViewHeader';

export function FavoriteDeleteConfirmDialog({
  trigger,
  title,
  description,
  itemName,
  onConfirm,
}: {
  trigger: ReactElement<{ onClick?: MouseEventHandler<HTMLButtonElement> }>;
  title: string;
  description?: string;
  itemName: string;
  onConfirm: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {cloneElement(trigger, {
        onClick: (event) => {
          trigger.props.onClick?.(event);
          if (!event.defaultPrevented) setOpen(true);
        },
      })}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description ?? `Confirmar a exclusão de ${itemName}?`}
        onConfirm={onConfirm}
        variant="destructive"
      />
    </>
  );
}

export function FavoritesHeaderWithPresentation({
  onPresent,
  ...props
}: ComponentProps<typeof FavoritesViewHeader> & { onPresent?: () => void }) {
  return (
    <>
      <FavoritesViewHeader {...props} />
      {onPresent && (
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onPresent}>
            <Monitor className="mr-2 h-4 w-4" /> Apresentar lista
          </Button>
        </div>
      )}
    </>
  );
}
