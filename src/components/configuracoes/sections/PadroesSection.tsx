import {
  Settings, Building, Percent, MessageSquare, Webhook, Bell, Save, Plus, Trash2, Check, AlertTriangle, Palette, Upload, Image, Key, CreditCard, Bot, Clock, Shield, Zap, ToggleLeft, Send, Volume2, Sun, Moon, Monitor, Eye, LayoutDashboard, Users, Receipt, Info, Copy, ExternalLink, FileText, RotateCcw, Sparkles, Package,
} from "lucide-react";
import { CONTRACT_PLACEHOLDERS, DEFAULT_CONTRACT_TEMPLATE } from "@/utils/contractTemplate";
import type { ModuleKey } from "@/contexts/WhiteLabelContext";
import InstallAppCard from "@/components/InstallAppCard";
import { COLOR_PRESETS } from "../constants";
import type { SectionProps } from "../types";

const PadroesSection = ({ ctx }: SectionProps) => {
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
          <>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center"><Percent size={16} className="text-primary" /></div>
              <h2 className="font-semibold text-foreground">Valores Padrão para Novos Contratos</h2>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
              <p className="font-semibold text-foreground mb-1">Como funciona o atraso</p>
              <p>
                Existe <span className="text-foreground font-medium">apenas uma cobrança de atraso</span>: o
                <span className="text-foreground font-medium"> juros diário</span>, aplicado a cada dia sobre o
                <span className="text-foreground font-medium"> valor já acumulado</span> (juros composto).
              </p>
              <p className="mt-1.5 italic">Ex.: parcela R$ 100 com 4% ao dia → 1º dia R$ 104 · 2º dia R$ 108,16 · 3º dia R$ 112,49.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-label mb-1.5 block">Taxa de juros padrão (% por período)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.default_interest_rate}
                  onChange={(e) => setForm({ ...form, default_interest_rate: e.target.value })}
                  className={inputCls}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Vem preenchida ao criar um empréstimo novo — dá para alterar contrato a contrato.
                  É a taxa do empréstimo em si, diferente do juros de atraso abaixo.
                </p>
              </div>

              <div>
                <label className="text-label mb-1.5 block">Juros de atraso (% ao dia)</label>
                <input type="number" step="0.01" value={form.default_daily_interest} onChange={(e) => setForm({ ...form, default_daily_interest: e.target.value })} className={inputCls} />
                <p className="text-[10px] text-muted-foreground mt-1">Composto sobre o valor acumulado. Padrão: 4% ao dia.</p>
              </div>
              <div>
                <label className="text-label mb-1.5 block">Multa fixa</label>
                <input type="number" value="0" disabled className={inputCls + " opacity-60"} />
                <p className="text-[10px] text-muted-foreground mt-1">Desativada — agora só existe o juros diário.</p>
              </div>

              <div className="col-span-2">
                <label className="text-label mb-1.5 block">Frequência Padrão</label>
                <select value={form.default_frequency} onChange={(e) => setForm({ ...form, default_frequency: e.target.value })} className={inputCls}>
                  <option value="daily">Diário</option><option value="weekly">Semanal</option><option value="biweekly">Quinzenal</option><option value="monthly">Mensal</option>
                </select>
              </div>
            </div>
          </>
    </>
  );
};

export default PadroesSection;
