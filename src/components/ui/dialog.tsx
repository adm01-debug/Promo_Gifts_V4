import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useOverlayInteractivity } from '@/hooks/use-overlay-interactivity';

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-[hsl(var(--overlay-color)/var(--overlay-opacity))] backdrop-blur-[var(--overlay-blur)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// ---------------------------------------------------------------------------
// A11y helpers
//
// BUG-A11Y-2 (mesmo defeito já corrigido em alert-dialog.tsx em 2026-06-25):
// o dist do Radix não publica `displayName` nos wrappers da casa (o nome real
// é 'Dialog.Title', com ponto), então casar só por string fazia
// childrenHaveType() devolver false mesmo com um DialogTitle na árvore. O
// fallback sr-only "Diálogo" era injetado em cada diálogo e, por vir primeiro
// no DOM (getElementById devolve o primeiro), assumia o nome acessível.
// ---------------------------------------------------------------------------

/**
 * Walks a React children tree (recursivo até `maxDepth`) looking for a node
 * whose type matches any of the given component references or display names.
 * Returns true as soon as the first match is found.
 */
function childrenHaveType(
  children: React.ReactNode,
  types: Array<React.ElementType | string>,
  maxDepth = 8,
): boolean {
  if (maxDepth === 0) return false;
  let found = false;
  React.Children.forEach(children, (child) => {
    if (found) return;
    if (!React.isValidElement(child)) return;
    const t = child.type as React.ElementType;
    if (
      types.some((match) => match === t || (t as { displayName?: string }).displayName === match)
    ) {
      found = true;
      return;
    }
    const nested = (child.props as { children?: React.ReactNode }).children;
    if (nested && maxDepth > 1) {
      found = childrenHaveType(nested, types, maxDepth - 1);
    }
  });
  return found;
}

// ---------------------------------------------------------------------------

interface DialogContentProps extends React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> {
  /** Show close button */
  showCloseButton?: boolean;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, showCloseButton = true, onCloseAutoFocus, ...props }, ref) => {
  // -- A11y: silence Radix warnings -----------------------------------------
  //
  // Radix emits two warnings when DialogContent renders without the
  // required accessibility primitives:
  //
  //   1. "DialogContent requires a DialogTitle for screen reader users."
  //      Fix: inject a visually-hidden DialogTitle as a fallback when the
  //      caller has not included one. Gives screen readers an accessible
  //      name without changing visual layout.
  //
  //   2. "Missing Description or aria-describedby={undefined} for DialogContent"
  //      Fix: inject a visually-hidden DialogDescription when no description
  //      is present. Radix checks document.getElementById(descriptionId) to
  //      determine if a description exists. Passing aria-describedby={undefined}
  //      does NOT suppress this warning: Radix's internal check is a truthy
  //      guard — `if (descriptionAriaAttr) return;` — so undefined (falsy)
  //      does not skip the warning. Injecting a real hidden element is the
  //      only reliable fix.
  //
  // Both checks walk the children tree recursivamente (profundidade 8),
  // cobrindo o padrão comum de title/description dentro de DialogHeader,
  // wrappers e divs de layout. Dialogs que já têm DialogTitle + DialogDescription
  // não são afetados (a varredura para no primeiro match).

  // Referências por identidade (independem de `displayName`, que o dist do
  // Radix não publica nestes wrappers) — resolvidas em tempo de render.
  const hasTitle = childrenHaveType(children, [
    DialogPrimitive.Title,
    DialogTitle,
    'DialogTitle',
    'Dialog.Title',
  ]);
  const hasDescription = childrenHaveType(children, [
    DialogPrimitive.Description,
    DialogDescription,
    'DialogDescription',
    'Dialog.Description',
  ]);
  const { handleClose } = useOverlayInteractivity();

  // Radix Dialog natively handles: focus trap, escape key, scroll lock.
  // We only add a lightweight cleanup on close to prevent stale scroll locks.
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        {...props}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          // Ensure scroll + interactivity are restored after the dialog closes.
          handleClose();
        }}
        className={cn(
          'duration-normal fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border-2 border-border bg-background p-6 shadow-xl ease-out',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
          'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
          'rounded-xl',
          'focus:outline-none focus-visible:outline-none focus-visible:ring-0',
          className,
        )}
        aria-modal="true"
        role="dialog"
      >
        {/* Fallback visually-hidden title -- only rendered when no DialogTitle
            is present. Satisfies Radix's runtime assertion and gives screen
            readers an accessible dialog name. */}
        {!hasTitle && (
          <DialogPrimitive.Title className="sr-only" aria-hidden={false}>
            Diálogo
          </DialogPrimitive.Title>
        )}
        {/* Fallback visually-hidden description -- only rendered when no
            DialogDescription is present. Radix looks for the descriptionId
            element in the DOM (document.getElementById); injecting a real
            element is the only way to reliably pass that check.
            Note: aria-describedby={undefined} does NOT suppress the warning
            because Radix's guard is truthy: `if (ariaAttr) return;` */}
        {!hasDescription && (
          <DialogPrimitive.Description className="sr-only">
            {/* sem descricao adicional */}
          </DialogPrimitive.Description>
        )}
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            className="absolute right-4 top-4 rounded-sm p-1 opacity-70 ring-offset-background transition-all hover:bg-accent hover:text-accent-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            aria-label="Fechar diálogo"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

/**
 * Visually hidden wrapper -- use this to add an accessible title or description
 * to a dialog without affecting the visible layout.
 *
 * @example
 * <DialogContent>
 *   <DialogVisuallyHidden>
 *     <DialogTitle>Upload de imagens</DialogTitle>
 *   </DialogVisuallyHidden>
 *   visible content here
 * </DialogContent>
 */
const DialogVisuallyHidden = ({ children }: { children: React.ReactNode }) => (
  <span className="sr-only">{children}</span>
);
DialogVisuallyHidden.displayName = 'DialogVisuallyHidden';

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogVisuallyHidden,
};
