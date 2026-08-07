import {
  Settings, Building, Percent, MessageSquare, Webhook, Bell, Save, Plus, Trash2, Check, AlertTriangle, Palette, Upload, Image, Key, CreditCard, Bot, Clock, Shield, Zap, ToggleLeft, Send, Volume2, Sun, Moon, Monitor, Eye, LayoutDashboard, Users, Receipt, Info, Copy, ExternalLink, FileText, RotateCcw, Sparkles, Package,
} from "lucide-react";
import { CONTRACT_PLACEHOLDERS, DEFAULT_CONTRACT_TEMPLATE } from "@/utils/contractTemplate";
import type { ModuleKey } from "@/contexts/WhiteLabelContext";
import InstallAppCard from "@/components/InstallAppCard";
import { COLOR_PRESETS } from "../constants";
import type { SectionProps } from "../types";

const PortalSection = ({ ctx }: SectionProps) => {
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
          <div className="space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center"><LayoutDashboard size={16} className="text-primary" /></div>
              <div>
                <h2 className="font-semibold text-foreground">Configurações do Portal do Cliente</h2>
                <p className="text-xs text-muted-foreground">Personalize a experiência do seu cliente ao acessar o portal</p>
              </div>
            </div>

            {/* Link do Portal */}
            <div className="space-y-3 p-4 rounded-2xl border border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Zap size={12} /> Link de Acesso ao Portal
                </p>
                <button onClick={() => {
                  const url = `${window.location.origin}/portal-cliente`;
                  navigator.clipboard.writeText(url);
                  notify("Link copiado!");
                }} className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                  <Copy size={10} /> Copiar Link
                </button>
              </div>
              <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2">
                <p className="text-xs text-muted-foreground truncate flex-1 font-mono">
                  {window.location.origin}/portal-cliente
                </p>
                <button onClick={() => window.open(`${window.location.origin}/portal-cliente`, "_blank")} className="p-1 rounded-lg hover:bg-accent text-muted-foreground transition-colors" title="Abrir link">
                  <ExternalLink size={14} />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Este link é único e pode ser compartilhado com todos os seus clientes. Cada um enxerga apenas os próprios dados.
              </p>
            </div>

            {/* Acesso do portal: somente CPF */}
            <div className="space-y-2 p-4 rounded-2xl border border-border bg-accent/5">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Shield size={12} /> Segurança do acesso
              </p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                O acesso ao portal é feito apenas com o CPF do cliente — sem senha e sem data de nascimento.
              </p>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4 p-4 rounded-2xl border border-border bg-accent/5">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Textos e Identidade</p>
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Título do Portal</label>
                  <input value={form.portal_title} onChange={(e) => setForm({ ...form, portal_title: e.target.value })} placeholder="Portal do Cliente" className={inputCls} />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Subtítulo do Portal</label>
                  <input value={form.portal_subtitle} onChange={(e) => setForm({ ...form, portal_subtitle: e.target.value })} placeholder="Acompanhe seus contratos e pagamentos" className={inputCls} />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Mensagem de Boas-vindas</label>
                  <textarea value={form.portal_welcome_message} onChange={(e) => setForm({ ...form, portal_welcome_message: e.target.value })} placeholder="Olá, seja bem-vindo ao seu portal financeiro." className={`${inputCls} min-h-[80px] resize-none`} />
                </div>
              </div>

              <div className="space-y-4 p-4 rounded-2xl border border-border bg-accent/5">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Canais de Contato</p>
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Telefone de Suporte</label>
                  <input value={form.portal_contact_phone} onChange={(e) => setForm({ ...form, portal_contact_phone: e.target.value })} placeholder="(00) 00000-0000" className={inputCls} />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">E-mail de Contato</label>
                  <input value={form.portal_contact_email} onChange={(e) => setForm({ ...form, portal_contact_email: e.target.value })} placeholder="suporte@empresa.com" className={inputCls} />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cor Primária do Portal</label>
                  <div className="flex gap-2">
                    <input type="color" value={form.portal_primary_color || form.primary_color} onChange={(e) => setForm({ ...form, portal_primary_color: e.target.value })} className="h-10 w-10 rounded-lg border border-border bg-transparent cursor-pointer" />
                    <input value={form.portal_primary_color || form.primary_color} onChange={(e) => setForm({ ...form, portal_primary_color: e.target.value })} className={inputCls} />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-border bg-accent/5 space-y-3">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Image size={12} className="text-primary" /> Logo Exclusiva do Portal (opcional)
              </p>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-muted/30 border-2 border-dashed border-border flex items-center justify-center overflow-hidden shrink-0">
                  {form.portal_logo_url ? (
                    <img src={form.portal_logo_url} alt="Logo Portal" className="w-full h-full object-cover" />
                  ) : form.company_logo_url ? (
                    <img src={form.company_logo_url} alt="Logo padrão" className="w-full h-full object-cover opacity-50" />
                  ) : (
                    <Image size={20} className="text-muted-foreground/30" />
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <input ref={portalLogoInputRef} type="file" accept="image/*" onChange={onUploadPortalLogo} className="hidden" />
                  <div className="flex gap-2">
                    <button onClick={() => portalLogoInputRef.current?.click()} disabled={uploadingPortalLogo}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-accent/30 transition-colors disabled:opacity-50">
                      <Upload size={12} /> {uploadingPortalLogo ? "Enviando..." : "Enviar logo do portal"}
                    </button>
                    {form.portal_logo_url && (
                      <button onClick={() => setForm({ ...form, portal_logo_url: "" })}
                        className="text-[10px] text-destructive hover:underline self-center">Remover</button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Se vazio, o portal usará a logo definida na aba <strong>Marca</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
    </>
  );
};

export default PortalSection;
