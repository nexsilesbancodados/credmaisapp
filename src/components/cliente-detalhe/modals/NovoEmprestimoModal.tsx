import { X, Shield, CalendarCog, Plus, Trash2 } from "lucide-react";
import VoiceRecorder from "@/components/VoiceRecorder";
import { INPUT, FREQ, LOAN_MODES, DAILY_MODES, fmt } from "../constants";
import type { LoanMode, DailyMode } from "@/lib/loanMath";

type Props = {
  clientName: string;
  loanMode: LoanMode;
  setLoanMode: (v: LoanMode) => void;
  loanGracePeriods: string;
  setLoanGracePeriods: (v: string) => void;
  loanCapital: string;
  setLoanCapital: (v: string) => void;
  loanInstallments: string;
  setLoanInstallments: (v: string) => void;
  loanInterestRate: string;
  setLoanInterestRate: (v: string) => void;
  loanFreq: string;
  setLoanFreq: (v: string) => void;
  loanStartDate: string;
  setLoanStartDate: (v: string) => void;
  loanStart: string;
  setLoanStart: (v: string) => void;
  loanDailyFee: string;
  setLoanDailyFee: (v: string) => void;
  loanLateFee: string;
  setLoanLateFee: (v: string) => void;
  loanNotes: string;
  setLoanNotes: (v: string | ((n: string) => string)) => void;
  loanGraceDays: string;
  setLoanGraceDays: (v: string) => void;
  loanPaymentMethod: string;
  setLoanPaymentMethod: (v: string) => void;
  loanEarlyDiscount: string;
  setLoanEarlyDiscount: (v: string) => void;
  loanMaxInterestCap: string;
  setLoanMaxInterestCap: (v: string) => void;
  loanValueMode: "rate" | "installment";
  setLoanValueMode: (v: "rate" | "installment") => void;
  loanInstallmentValue: string;
  setLoanInstallmentValue: (v: string) => void;
  loanDailyMode: DailyMode;
  setLoanDailyMode: (v: DailyMode) => void;
  loanFirstDueAuto: boolean;
  setLoanFirstDueAuto: (v: boolean) => void;
  loanCustomDates: string[];
  setLoanCustomDates: (v: string[]) => void;
  loanCalc: { totalInterest: number; total: number; installmentAmount: number; schedule: number[]; derivedRate?: number } | null;
  loanLoading: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export default function NovoEmprestimoModal(p: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={p.onClose}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Novo Empréstimo</h2>
          <button onClick={p.onClose} aria-label="Fechar" className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"><X size={18} /></button>
        </div>
        <p className="text-xs text-muted-foreground">Para: <strong className="text-foreground">{p.clientName}</strong></p>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipo de Empréstimo</label>
          <div className="grid grid-cols-2 gap-2">
            {LOAN_MODES.map(m => (
              <button key={m.v} type="button" onClick={() => p.setLoanMode(m.v)}
                className={`flex items-start gap-2 p-2.5 rounded-xl border-2 transition-colors text-left ${p.loanMode === m.v ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}>
                <m.Icon size={16} className={`mt-0.5 shrink-0 ${p.loanMode === m.v ? "text-primary" : "text-muted-foreground"}`} />
                <div className="min-w-0">
                  <p className={`text-[11px] font-semibold leading-tight ${p.loanMode === m.v ? "text-primary" : "text-foreground"}`}>{m.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{m.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {p.loanMode === "grace" && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Períodos de carência (sem pagar)</label>
            <input type="number" value={p.loanGracePeriods} onChange={e => p.setLoanGracePeriods(e.target.value)} placeholder="2" className={INPUT} min={1} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Capital (R$)</label>
            <input type="number" value={p.loanCapital} onChange={e => p.setLoanCapital(e.target.value)} placeholder="1000" className={INPUT} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {p.loanMode === "bullet" ? "Nº Períodos até vencer" : "Nº Parcelas"}
            </label>
            <input type="number" value={p.loanInstallments} onChange={e => p.setLoanInstallments(e.target.value)} placeholder={p.loanMode === "bullet" ? "3" : "12"} className={INPUT} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Taxa (%)</label>
            <input type="number" step="0.1" value={p.loanInterestRate} onChange={e => p.setLoanInterestRate(e.target.value)} className={INPUT} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Frequência</label>
            <div className="grid grid-cols-4 gap-1.5">
              {Object.entries(FREQ).map(([v, l]) => (
                <button key={v} onClick={() => p.setLoanFreq(v)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${p.loanFreq === v ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:bg-accent"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Data Início</label>
            <input type="date" value={p.loanStartDate} onChange={e => p.setLoanStartDate(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">1º Vencimento</label>
            <input type="date" value={p.loanStart} onChange={e => p.setLoanStart(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Multa Diária (%)</label>
            <input type="number" step="0.01" value={p.loanDailyFee} onChange={e => p.setLoanDailyFee(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Multa Mensal (%)</label>
            <input type="number" step="0.1" value={p.loanLateFee} onChange={e => p.setLoanLateFee(e.target.value)} className={INPUT} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Observações</label>
            <div className="flex gap-2 items-start">
              <textarea value={p.loanNotes} onChange={e => p.setLoanNotes(e.target.value)} className={INPUT + " min-h-[60px] flex-1"} placeholder="Opcional (ou dite pelo microfone)" />
              <VoiceRecorder onTranscribed={(t) => p.setLoanNotes((n: string) => (n ? n + " " : "") + t)} title="Ditar observação" />
            </div>
          </div>
        </div>

        {/* ── Condições Avançadas ─────────────────────────────────────── */}
        <details className="rounded-xl border border-border bg-card/60 p-3 group">
          <summary className="cursor-pointer flex items-center justify-between list-none">
            <span className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Shield size={13} className="text-primary" /> Condições Avançadas
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground group-open:hidden">Abrir</span>
            <span className="text-[10px] uppercase tracking-wider text-primary hidden group-open:inline">Fechar</span>
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Carência (dias)</label>
              <input type="number" value={p.loanGraceDays} onChange={e => p.setLoanGraceDays(e.target.value)} placeholder="0" className={INPUT} />
              <p className="text-[10px] text-muted-foreground mt-1">Dias sem multa após vencimento</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Forma de Pagamento</label>
              <select value={p.loanPaymentMethod} onChange={e => p.setLoanPaymentMethod(e.target.value)} className={INPUT}>
                <option value="pix">PIX</option>
                <option value="cash">Dinheiro</option>
                <option value="boleto">Boleto</option>
                <option value="transfer">Transferência</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Desconto Antecipação (%)</label>
              <input type="number" step="0.1" value={p.loanEarlyDiscount} onChange={e => p.setLoanEarlyDiscount(e.target.value)} placeholder="0" className={INPUT} />
              <p className="text-[10px] text-muted-foreground mt-1">% se pagar antes do vencimento</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Teto de Juros (%)</label>
              <input type="number" step="1" value={p.loanMaxInterestCap} onChange={e => p.setLoanMaxInterestCap(e.target.value)} placeholder="Sem limite" className={INPUT} />
              <p className="text-[10px] text-muted-foreground mt-1">Máx. % do capital em juros</p>
            </div>
          </div>
        </details>

        {p.loanCalc && (
          <div className="space-y-2">
            <div className="bg-muted/30 rounded-lg p-3 grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-[10px] text-muted-foreground">Juros</p><p className="font-semibold text-foreground">R$ {fmt(p.loanCalc.totalInterest)}</p></div>
              <div><p className="text-[10px] text-muted-foreground">Total</p><p className="font-semibold text-foreground">R$ {fmt(p.loanCalc.total)}</p></div>
              <div><p className="text-[10px] text-muted-foreground">{p.loanMode === "bullet" ? "Pagamento" : "Parcela"}</p><p className="font-semibold text-primary">R$ {fmt(p.loanCalc.installmentAmount)}</p></div>
            </div>
            {p.loanCalc.schedule.length > 1 && p.loanCalc.schedule.some(v => v !== p.loanCalc!.schedule[0]) && (
              <div className="max-h-32 overflow-y-auto rounded-lg border border-border p-2 text-[11px] space-y-0.5">
                {p.loanCalc.schedule.map((v, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-muted-foreground">#{i + 1}</span>
                    <span className="font-medium text-foreground">R$ {fmt(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <button onClick={p.onClose} className="flex-1 px-4 py-2.5 rounded-2xl border border-border text-sm text-muted-foreground">Cancelar</button>
          <button onClick={p.onSubmit} disabled={p.loanLoading || !p.loanCalc}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground disabled:opacity-50" style={{ background: "var(--gradient-button)" }}>
            {p.loanLoading ? "Criando..." : "Criar Empréstimo"}
          </button>
        </div>
      </div>
    </div>
  );
}
