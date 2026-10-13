import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

import { cn } from '@/lib/utils';

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn('relative flex w-full touch-none select-none items-center', className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    {/* A11y (WCAG 4.1.2 / axe aria-input-field-name): o nome acessível de um slider
        pertence ao `role="slider"` (o thumb), não ao Root — o Radix não repassa
        `aria-label`/`aria-labelledby` do Root para o Thumb, então o thumb fica sem
        nome e reprova no axe. Repassamos explicitamente, mantendo as props no Root
        para não quebrar consumidores existentes. */}
    <SliderPrimitive.Thumb
      aria-label={props['aria-label']}
      aria-labelledby={props['aria-labelledby']}
      className="block h-6 w-6 touch-none rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 md:h-5 md:w-5"
    />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
