import { Palette, Package, LayoutDashboard, FileText } from "lucide-react";

export const AparenciaConfig = ({ form, setForm, inputCls }: { form: any, setForm: any, inputCls: string }) => {
  return (
    <div className="space-y-6">
      <div className="bg-card/50 border border-border/30 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Palette size={16} className="text-primary" />
          <h3 className="font-semibold text-sm">Marca & Cores</h3>
        </div>
        <p className="text-[11px] text-muted-foreground">Personalize a identidade visual do seu sistema.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cor Primária</label>
            <input type="color" value={form.primary_color} onChange={(e) => setForm((f: any) => ({ ...f, primary_color: e.target.value }))} className="w-full h-10 rounded-lg cursor-pointer" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cor de Acento</label>
            <input type="color" value={form.accent_color} onChange={(e) => setForm((f: any) => ({ ...f, accent_color: e.target.value }))} className="w-full h-10 rounded-lg cursor-pointer" />
          </div>
        </div>
      </div>
    </div>
  );
};
