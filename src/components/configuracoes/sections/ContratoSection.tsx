import {
  Settings, Building, Percent, MessageSquare, Webhook, Bell, Save, Plus, Trash2, Check, AlertTriangle, Palette, Upload, Image, Key, CreditCard, Bot, Clock, Shield, Zap, ToggleLeft, Send, Volume2, Sun, Moon, Monitor, Eye, LayoutDashboard, Users, Receipt, Info, Copy, ExternalLink, FileText, RotateCcw, Sparkles, Package,
} from "lucide-react";
import { CONTRACT_PLACEHOLDERS, DEFAULT_CONTRACT_TEMPLATE } from "@/utils/contractTemplate";
import type { ModuleKey } from "@/contexts/WhiteLabelContext";
import InstallAppCard from "@/components/InstallAppCard";
import { COLOR_PRESETS } from "../constants";
import type { SectionProps } from "../types";

const ContratoSection = ({ ctx }: SectionProps) => {
  const {
    form, setForm, inputCls, settings, templates,
    newTemplate, setNewTemplate, onAddTemplate, onDeleteTemplate, onAddPresetTemplate,
    logoInputRef, faviconInputRef, portalLogoInputRef,
    onUploadLogo, onUploadFavicon, onUploadPortalLogo,
    uploadingLogo, uploadingFavicon, uploadingPortalLogo,
    notify,
  } = ctx;

  return (
    <>
          <div className="space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center"><FileText size={16} className="text-primary" /></div>
              <div>
                <h2 className="font-semibold text-foreground">Modelo de Contrato Personalizado</h2>
                <p className="text-xs text-muted-foreground">Cole seu próprio contrato. Ao fechar um empréstimo, os campos são preenchidos automaticamente.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-foreground/90">
              <p className="font-semibold mb-1.5 flex items-center gap-1.5"><Info size={12} /> Como funciona</p>
              <p>Use as variáveis abaixo entre <code className="bg-muted px-1 rounded">{"{{ }}"}</code> no texto. Quando o contrato for gerado, elas serão trocadas pelos dados reais do cliente e do empréstimo.</p>
              <p className="mt-1.5">Para repetir cada parcela, envolva uma linha em <code className="bg-muted px-1 rounded">{"{{#parcelas}}...{{/parcelas}}"}</code> usando <code className="bg-muted px-1 rounded">{"{{numero}}"}</code>, <code className="bg-muted px-1 rounded">{"{{vencimento}}"}</code> e <code className="bg-muted px-1 rounded">{"{{valor}}"}</code>.</p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Variáveis disponíveis (clique para copiar)</label>
              <div className="flex flex-wrap gap-1.5">
                {CONTRACT_PLACEHOLDERS.map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(`{{${p.key}}}`);
                      notify(`✓ {{${p.key}}} copiado`);
                    }}
                    title={p.desc}
                    className="px-2 py-1 rounded-md bg-muted/40 hover:bg-primary/15 text-[11px] font-mono text-foreground border border-border transition-colors"
                  >
                    {`{{${p.key}}}`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">Texto do contrato</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, custom_contract_template: DEFAULT_CONTRACT_TEMPLATE })}
                    className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-accent/30"
                  >
                    <RotateCcw size={11} /> Carregar modelo padrão
                  </button>
                  {form.custom_contract_template && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, custom_contract_template: "" })}
                      className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 size={11} /> Limpar (usar layout do sistema)
                    </button>
                  )}
                </div>
              </div>
              <textarea
                value={form.custom_contract_template}
                onChange={(e) => setForm({ ...form, custom_contract_template: e.target.value })}
                rows={20}
                placeholder="Cole aqui o texto do seu contrato. Ex: Contrato firmado entre {{empresa_nome}} e {{cliente_nome}} no valor de {{capital}}..."
                className="w-full px-3 py-2 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground font-mono leading-relaxed input-enhanced"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {form.custom_contract_template?.trim()
                  ? "✓ Modelo personalizado ativo — será usado em todos os novos contratos."
                  : "Sem modelo personalizado — o sistema usará o layout padrão."}
              </p>
            </div>
          </div>
    </>
  );
};

export default ContratoSection;
