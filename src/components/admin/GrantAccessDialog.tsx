import { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/friendlyError";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

/**
 * Libera acesso para um assinante — teste por N dias ou vitalício.
 *
 * As edge functions `admin-create-trial` e `admin-create-lifetime` já existiam,
 * mas nenhuma tela as chamava: só dava para usá-las por linha de comando. Como
 * agora exigem admin da plataforma, esta é a porta de entrada delas.
 *
 * Atenção: se o e-mail já existir, a senha informada SUBSTITUI a senha atual
 * daquela conta. O aviso está na tela por isso.
 */
const GrantAccessDialog = ({ open, onClose, onDone }: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) => {
  const { toast } = useToast();
  const { settings: platform } = usePlatformSettings();
  const [mode, setMode] = useState<"trial" | "lifetime">("trial");
  const [form, setForm] = useState({ name: "", email: "", password: "", days: "" });
  const [saving, setSaving] = useState(false);

  // O padrão vem da configuração da plataforma, não de um número fixo no código.
  useEffect(() => {
    if (open) setForm((f) => ({ ...f, days: String(platform.default_trial_days) }));
  }, [open, platform.default_trial_days]);

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim());
  const podeSalvar = emailOk && form.password.trim().length >= 8 && !saving;

  const submit = async () => {
    setSaving(true);
    const fn = mode === "trial" ? "admin-create-trial" : "admin-create-lifetime";
    const body: Record<string, unknown> = {
      email: form.email.trim().toLowerCase(),
      password: form.password,
      name: form.name.trim() || undefined,
    };
    if (mode === "trial") body.days = Number(form.days) || platform.default_trial_days;

    const { data, error } = await supabase.functions.invoke(fn, { body });
    setSaving(false);

    if (error || (data as any)?.error) {
      toast({
        ...friendlyError(error ?? new Error(String((data as any)?.error)), "Não foi possível liberar o acesso."),
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "✓ Acesso liberado",
      description: mode === "trial"
        ? `${form.email} tem acesso por ${body.days} dia(s).`
        : `${form.email} ficou com acesso vitalício.`,
    });
    setForm({ name: "", email: "", password: "", days: String(platform.default_trial_days) });
    onDone();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound size={16} className="text-primary" /> Liberar acesso
          </DialogTitle>
          <DialogDescription>
            Cria a conta já com acesso ativo, sem passar pelo pagamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {([
              { v: "trial" as const, label: "Por tempo", desc: "acesso de teste" },
              { v: "lifetime" as const, label: "Vitalício", desc: "sem vencimento" },
            ]).map((opt) => (
              <button
                key={opt.v}
                onClick={() => setMode(opt.v)}
                className={`p-3 rounded-xl border text-left transition ${
                  mode === opt.v ? "border-primary/50 bg-primary/8" : "border-border hover:border-primary/25"
                }`}
              >
                <p className="text-xs font-semibold text-foreground">{opt.label}</p>
                <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nome (opcional)</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do assinante" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">E-mail</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="pessoa@empresa.com"
              />
              {form.email && !emailOk && (
                <p className="text-[10px] text-destructive mt-1">E-mail inválido.</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Senha inicial</label>
              <Input
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="mínimo 8 caracteres"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Passe esta senha para a pessoa e peça que troque no primeiro acesso.
              </p>
            </div>
            {mode === "trial" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Dias de acesso</label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={form.days}
                  onChange={(e) => setForm({ ...form, days: e.target.value })}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Padrão da plataforma: {platform.default_trial_days} dia(s). Ajuste em Plataforma.
                </p>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl border border-warning/30 bg-warning/5">
            <p className="text-[11px] text-warning-foreground/90 leading-relaxed">
              <strong>Atenção:</strong> se este e-mail já tiver conta, a senha acima{" "}
              <strong>substitui a senha atual</strong> da pessoa. Confira antes de confirmar.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={!podeSalvar}>
            {saving && <Loader2 size={14} className="mr-1.5 animate-spin" />}
            {saving ? "Liberando..." : "Liberar acesso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GrantAccessDialog;
