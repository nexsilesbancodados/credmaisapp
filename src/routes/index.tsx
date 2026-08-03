import React from 'react';
import { AlertCircle, Smartphone, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const MobileFunctionsAlert = () => {
  return (
    <div className="p-4 md:hidden">
      <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="font-bold">Aviso de Compatibilidade</AlertTitle>
        <AlertDescription className="text-xs opacity-90">
          em pagar parcela do cliente no celukar n consigo clicar no botao confirmar.
          Estamos trabalhando para otimizar sua experiência.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default MobileFunctionsAlert;
