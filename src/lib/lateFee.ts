// Política única de atraso: JUROS DIÁRIO COMPOSTO de 4% ao dia (padrão),
// aplicado sobre o valor acumulado (parcela + juros já acumulados).
// Ex.: parcela 100 → 1 dia = 104 → 2 dias = 108,16 → 3 dias = 112,49...
// Não existe mais "multa mensal/fixa": apenas o percentual diário.
export const DEFAULT_DAILY_LATE_RATE = 4; // % ao dia

export interface LateFeeInput {
  amount: number | string | null | undefined;
  due_date: string | null | undefined;
  status?: string | null;
  late_fee?: number | string | null;
  late_fee_percent?: number | string | null;
  daily_interest_percent?: number | string | null;
  paid_at?: string | null;
  /**
   * Teto de juros de atraso, em % sobre o valor da parcela.
   * Vem de `contracts.max_interest_cap_percent`. Ex.: 100 = os juros nunca
   * passam do valor da própria parcela.
   *
   * Este campo era preenchido no cadastro do empréstimo, gravado no banco e
   * NUNCA lido — o operador definia um limite que não limitava nada. Com juros
   * de 4% ao dia compostos, isso importa: em 60 dias a parcela decupla.
   */
  max_interest_cap_percent?: number | string | null;
  /**
   * Algumas telas trazem a parcela com o contrato aninhado
   * (`select("*, contracts(...)")`). Aceitar as duas formas evita ter que
   * lembrar de achatar o objeto em cada lugar — e é justamente esse tipo de
   * "lembrar em todo lugar" que fez o teto nunca ser aplicado.
   */
  contracts?: {
    daily_interest_percent?: number | string | null;
    max_interest_cap_percent?: number | string | null;
  } | null;
}

/** Lê um campo do contrato, esteja ele achatado na parcela ou aninhado. */
function doContrato(inst: LateFeeInput, campo: "daily_interest_percent" | "max_interest_cap_percent") {
  const direto = (inst as any)?.[campo];
  if (direto != null && direto !== "") return direto;
  return inst?.contracts?.[campo] ?? null;
}

/** Teto em valor absoluto (R$), ou null quando o contrato não define teto. */
export function interestCapOf(inst: LateFeeInput): number | null {
  const pct = Number(doContrato(inst, "max_interest_cap_percent"));
  if (!Number.isFinite(pct) || pct <= 0) return null;
  const base = Number(inst?.amount || 0);
  if (!base) return null;
  return Math.round(base * (pct / 100) * 100) / 100;
}

/** Dias inteiros de atraso (0 se ainda não venceu). */
export function daysLateOf(inst: LateFeeInput, now: Date = new Date()): number {
  if (!inst?.due_date) return 0;
  const due = new Date(inst.due_date);
  if (isNaN(due.getTime())) return 0;
  const d0 = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const n0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(0, Math.floor((n0 - d0) / 86400000));
}

/** Taxa diária efetiva do contrato (fallback 4% a.d.). */
export function dailyRateOf(inst: LateFeeInput): number {
  const pct = Number(doContrato(inst, "daily_interest_percent") || 0);
  return pct > 0 ? pct : DEFAULT_DAILY_LATE_RATE;
}

/** Juros de atraso acumulados (composto diário). */
export function computeLateFee(inst: LateFeeInput, now: Date = new Date()): number {
  if (!inst) return 0;
  const stored = Number(inst.late_fee || 0);

  // Já paga/cancelada: mostra o valor que foi efetivamente cobrado.
  if (inst.status === "paid" || inst.status === "cancelled") return stored;

  const base = Number(inst.amount || 0);
  if (!base) return stored;

  const days = daysLateOf(inst, now);
  if (days <= 0) return 0;

  const rate = dailyRateOf(inst) / 100;
  const total = Math.round((base * (Math.pow(1 + rate, days) - 1)) * 100) / 100;

  // Respeita o teto do contrato, quando houver.
  const teto = interestCapOf(inst);
  return teto !== null ? Math.min(total, teto) : total;
}

export function totalDue(inst: LateFeeInput, now?: Date): number {
  return Number(inst?.amount || 0) + computeLateFee(inst, now);
}

export interface LateFeeBreakdown {
  daysLate: number;
  base: number;
  multaPct: number;   // mantido por compatibilidade (sempre 0)
  jurosPct: number;   // % ao dia
  multa: number;      // sempre 0 — não há mais multa fixa
  juros: number;      // = total
  total: number;
  withFees: number;
}

export function computeLateFeeBreakdown(inst: LateFeeInput, now: Date = new Date()): LateFeeBreakdown {
  const base = Number(inst?.amount || 0);
  const total = computeLateFee(inst, now);
  const daysLate = daysLateOf(inst, now);
  const jurosPct = dailyRateOf(inst);
  return {
    daysLate,
    base,
    multaPct: 0,
    jurosPct,
    multa: 0,
    juros: total,
    total,
    withFees: base + total,
  };
}
