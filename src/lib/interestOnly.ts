/**
 * Cálculo do valor de "pagar só juros" de uma parcela.
 *
 * Regra do negócio: o cliente pode quitar apenas o rendimento do período
 * (juros do contrato + juros/multa de atraso, quando informados) e manter o
 * capital principal pendente para o próximo vencimento.
 *
 * Funciona para todos os tipos de empréstimo:
 * - parcelado (installments/price): juros totais divididos pelo nº de parcelas
 * - porcentagem / só juros / bullet: a própria parcela já é o rendimento
 */
export function interestOnlyAmount(
  inst: { amount?: number | string | null },
  contract?: {
    capital?: number | string | null;
    total_amount?: number | string | null;
    total_interest?: number | string | null;
    num_installments?: number | string | null;
    loan_mode?: string | null;
  } | null,
  extraLateInterest = 0,
): number {
  const instAmount = Number(inst?.amount || 0);
  if (!contract) return 0;

  const mode = contract.loan_mode || "installments";
  const n = Number(contract.num_installments || 0);
  const capital = Number(contract.capital || 0);
  const totalAmount = Number(contract.total_amount || 0);
  const totalInterest =
    Number(contract.total_interest || 0) || Math.max(0, totalAmount - capital);

  let base: number;
  if (mode === "percentage" || mode === "interest_only" || mode === "bullet" || n <= 0) {
    // A parcela é composta somente de rendimento.
    base = instAmount;
  } else {
    base = totalInterest / n;
  }

  const value = Math.max(0, base) + Math.max(0, Number(extraLateInterest || 0));
  return Math.round(Math.min(value, instAmount + Math.max(0, extraLateInterest)) * 100) / 100;
}
