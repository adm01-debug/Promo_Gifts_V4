import { Palette, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useOnboardingContext } from '@/contexts/OnboardingContext';

/** Atalhos "Skins" e "Guia Rápido" do menu do usuário (extraídos do Header). */
export function UserMenuShortcutItems() {
  const navigate = useNavigate();
  const { restartTour } = useOnboardingContext();

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuItem
            onClick={() => navigate('/admin/temas')}
            data-testid="user-menu-item-skins"
            className="cursor-pointer hover:bg-primary/10 focus:bg-primary/10"
          >
            <Palette className="mr-2 h-4 w-4" />
            Skins
          </DropdownMenuItem>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={8} data-testid="user-menu-tooltip-skins">
          <p>Personalize a aparência da plataforma (temas e cores)</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuItem
            onClick={() => {
              navigate('/');
              setTimeout(() => restartTour(), 300);
            }}
            data-testid="user-menu-item-guia-rapido"
            className="cursor-pointer hover:bg-primary/10 focus:bg-primary/10"
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            Guia Rápido
          </DropdownMenuItem>
        </TooltipTrigger>
        <TooltipContent
          side="left"
          sideOffset={8}
          data-testid="user-menu-tooltip-guia-rapido"
        >
          <p>Reiniciar o tour guiado pelas funcionalidades do sistema</p>
        </TooltipContent>
      </Tooltip>
    </>
  );
}
