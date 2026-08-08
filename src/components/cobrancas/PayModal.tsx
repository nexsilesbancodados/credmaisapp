import { useState, useMemo } from "react";
import { ModalPortal } from "@/components/ui/modal-portal";
import { CheckCircle, CalendarDays, AlertTriangle } from "lucide-react";
import { formatBR } from "@/lib/dateUtils";
import type { LateFeeBreakdown } from "@/lib/lateFee";
import { interestOnlyAmount } from "@/lib/interestOnly";

const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  inst: any;
  fee: LateFeeBreakdown;
  alreadyPaid: number;
  remaining: number;
  daysLate: number;
  onCancel: () => void;
  onConfirm: (value: number, waiveFee?: boolean) => void;
}

const PayModal = ({ inst, fee, alreadyPaid, remaining, daysLate, onCancel, onConfirm }: Props) => {
  const [mode, setMode] = useState<"full" | "partial" | "interest_only" | "no_fee">("full");
  const [raw, setRaw] = useState<string>(remaining.toFixed(2).replace(".", ","));

  const value = useMemo(() => {
    const n = Number(String(raw).replace(/\./g, "").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }, [raw]);

  // "Pagar só juros": quita apenas o rendimento do período (juros do contrato
  // + juros/multa de atraso, quando informados), mantendo o capital pendente.
  const totalInterestOnly = interestOnlyAmount(inst, inst.contracts, fee.juros > 0 ? fee.juros : 0);

  // "Sem multa": perdoa os juros/multa de atraso e quita apenas o valor original.
  const remainingNoFee = Math.max(0, Math.round((fee.base - alreadyPaid) * 100) / 100);

  const finalValue =
    mode === "full" ? remaining :
    mode === "no_fee" ? remainingNoFee :
    mode === "interest_only" ? totalInterestOnly :
    value;

  const isPartial = (mode === "partial" || mode === "interest_only") && finalValue > 0 && finalValue + 0.005 < remaining;


  const restAfter = Math.max(0, Math.round((remaining - finalValue) * 100) / 100);


  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-2xl p-6 space-y-5 shadow-2xl max-h-[92dvh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 pb-[max(2rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden mx-auto -mt-2 mb-1 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={28} className="text-success" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Registrar Pagamento</h3>
          <p className="text-sm font-medium text-foreground mt-2">{inst.client_name}</p>
          <p className="text-xs text-muted-foreground">Parcela #{inst.installment_number}</p>
        </div>

        {/* Detalhes */}
        <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1.5"><CalendarDays size={14} /> Vencimento</span>
            <span className="text-foreground font-medium">{formatBR(inst.due_date)}</span>
          </div>
          {daysLate > 0 && (
            <div className="flex items-center justify-between text-destructive">
              <span className="flex items-center gap-1.5"><AlertTriangle size={14} /> Atraso</span>
              <span className="font-semibold">{daysLate} dia{daysLate === 1 ? "" : "s"}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Valor sem multa</span>
            <span className="text-foreground font-medium">R$ {fmt(fee.base)}</span>
          </div>
          {fee.multa > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Multa</span>
              <span className="text-destructive font-medium">+ R$ {fmt(fee.multa)}</span>
            </div>
          )}
          {fee.juros > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Juros{fee.jurosPct ? ` (${fee.jurosPct}%/dia × ${fee.daysLate}d)` : ""}</span>
              <span className="text-destructive font-medium">+ R$ {fmt(fee.juros)}</span>
            </div>
          )}
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between">
            <span className="text-foreground font-semibold">Total com multa</span>
            <span className="text-foreground font-bold">R$ {fmt(fee.withFees)}</span>
          </div>
          {alreadyPaid > 0 && (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Já pago</span>
                <span className="text-success font-medium">− R$ {fmt(alreadyPaid)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-primary font-semibold">Restante</span>
                <span className="text-primary font-bold">R$ {fmt(remaining)}</span>
              </div>
            </>
          )}
        </div>

        {/* Modo */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setMode("full"); setRaw(remaining.toFixed(2).replace(".", ",")); }}
            className={`flex-1 min-w-[120px] px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === "full" ? "bg-success text-success-foreground" : "border border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            Quitar total
          </button>
          
          <button
            onClick={() => setMode("interest_only")}
            className={`flex-1 min-w-[120px] px-3 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
              mode === "interest_only" ? "bg-amber-500 text-white border-amber-600" : "border border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            Pagar só juros
          </button>

          <button
            onClick={() => setMode("partial")}
            className={`flex-1 min-w-[120px] px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === "partial" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            Parcial / Outro
          </button>

          {fee.total > 0 && (
            <button
              onClick={() => setMode("no_fee")}
              className={`flex-1 min-w-[120px] px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === "no_fee" ? "bg-success text-success-foreground" : "border border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              Quitar sem multa
            </button>
          )}
        </div>

        {mode === "interest_only" && (
          <div className="p-3 rounded-xl bg-warning/10 border border-warning/20">
            <p className="text-xs text-warning-foreground leading-relaxed">
              <strong>Pagamento de Juros:</strong> Esta opção quita apenas o rendimento/juros acumulados. 
              O saldo principal de <strong>R$ {fmt(restAfter)}</strong> continuará pendente para o próximo período.
            </p>
          </div>
        )}

        {mode === "no_fee" && (
          <div className="p-3 rounded-xl bg-success/10 border border-success/20">
            <p className="text-xs text-foreground leading-relaxed">
              <strong>Sem multa:</strong> os juros de atraso de <strong>R$ {fmt(fee.total)}</strong> serão perdoados
              e a parcela será quitada pelo valor original de <strong>R$ {fmt(remainingNoFee)}</strong>.
            </p>
          </div>
        )}


        {mode === "partial" && (

          <div>
            <label className="text-xs text-muted-foreground font-medium">Valor recebido</label>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/30">
              <span className="text-muted-foreground text-sm">R$</span>
              <input
                autoFocus
                inputMode="decimal"
                value={raw}
                onChange={(e) => setRaw(e.target.value.replace(/[^\d,.]/g, ""))}
                className="flex-1 bg-transparent outline-none text-foreground text-base font-semibold"
                placeholder="0,00"
              />
            </div>
            {isPartial && (
              <p className="mt-1.5 text-xs text-warning">
                Ficarão pendentes R$ {fmt(restAfter)} — a parcela permanece em aberto.
              </p>
            )}
            {value > remaining && (
              <p className="mt-1.5 text-xs text-destructive">Valor maior que o restante — será quitada.</p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-2xl border border-border text-sm text-muted-foreground hover:bg-accent transition-colors">Cancelar</button>
          <button
            onClick={() => onConfirm(finalValue, mode === "no_fee")}
            disabled={finalValue <= 0}
            className="flex-1 px-4 py-3.5 rounded-xl text-sm font-bold bg-success text-success-foreground hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            Confirmar R$ {fmt(finalValue)}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

export default PayModal;
