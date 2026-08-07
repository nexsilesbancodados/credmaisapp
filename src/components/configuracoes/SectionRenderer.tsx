import React, { Suspense } from "react";
import type { SettingsCtx } from "./types";
import { Loader2 } from "lucide-react";

const EssencialConfig = React.lazy(() => import("./EssencialConfig"));
const AparenciaConfig = React.lazy(() => import("./AparenciaConfig"));

interface SectionRendererProps {
  tab: string;
  ctx: SettingsCtx;
}

const SectionRenderer = ({ tab, ctx }: SectionRendererProps) => {
  return (
    <Suspense fallback={
      <div className="h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin opacity-20" />
      </div>
    }>
      {tab === "marca" && <EssencialConfig ctx={ctx} />}
      {tab === "aparencia" && <AparenciaConfig ctx={ctx} />}
      {/* Adicionar mais seções aqui conforme a modularização avança */}
      {!["marca", "aparencia"].includes(tab) && (
        <div className="p-12 text-center bg-muted/20 rounded-2xl border border-dashed border-border/50">
          <p className="text-sm text-muted-foreground">Seção "{tab}" em desenvolvimento.</p>
        </div>
      )}
    </Suspense>
  );
};

export default SectionRenderer;
