import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const MobileFunctionsAlert = () => {
  return (
    <div className="p-4 md:hidden">
      <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="font-bold text-sm">Aviso de Compatibilidade</AlertTitle>
        <AlertDescription className="text-xs opacity-90 leading-relaxed">
          Deixe o site 100% responsivo e impecavel em celular, tablet e desktop, sem mudar o conteudo. Ajuste com abordagem mobile-first: breakpoints, grids e flexbox adaptaveis, imagens fluidas, tipografia escalavel, menu que vira versao mobile (hamburguer quando fizer sentido) e areas de toque confortaveis. Garanta que nada quebre, corte ou sobreponha em 375px, 768px e 1440px.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default MobileFunctionsAlert;
