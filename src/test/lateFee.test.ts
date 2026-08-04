import { describe, it, expect } from "vitest";
import {
  computeLateFee,
  computeLateFeeBreakdown,
  daysLateOf,
  dailyRateOf,
  totalDue,
  DEFAULT_DAILY_LATE_RATE,
} from "@/lib/lateFee";

// Este módulo decide quanto o cliente deve a mais por atraso — é o cálculo que
// aparece na cobrança, no portal e nas mensagens do bot. Até aqui não tinha teste.
//
// Regra vigente: juros COMPOSTO diário sobre o valor da parcela, sem multa fixa.

const DIA = 86400000;
const emDias = (n: number) => new Date(Date.now() + n * DIA);
const venceEm = (n: number) => new Date(Date.now() + n * DIA).toISOString();

describe("daysLateOf", () => {
  it("não conta atraso antes do vencimento", () => {
    expect(daysLateOf({ amount: 100, due_date: venceEm(3) })).toBe(0);
  });

  it("não conta atraso no próprio dia do vencimento", () => {
    expect(daysLateOf({ amount: 100, due_date: venceEm(0) })).toBe(0);
  });

  it("conta dias inteiros, ignorando a hora do vencimento", () => {
    const ontemDeManha = new Date();
    ontemDeManha.setDate(ontemDeManha.getDate() - 1);
    ontemDeManha.setHours(1, 0, 0, 0);
    expect(daysLateOf({ amount: 100, due_date: ontemDeManha.toISOString() })).toBe(1);
  });

  it("devolve 0 para data ausente ou inválida", () => {
    expect(daysLateOf({ amount: 100, due_date: null })).toBe(0);
    expect(daysLateOf({ amount: 100, due_date: "data-torta" })).toBe(0);
  });
});

describe("dailyRateOf", () => {
  it("usa a taxa do contrato quando existe", () => {
    expect(dailyRateOf({ amount: 100, due_date: null, daily_interest_percent: 2 })).toBe(2);
  });

  it("cai no padrão de 4% a.d. quando o contrato não define", () => {
    expect(dailyRateOf({ amount: 100, due_date: null })).toBe(DEFAULT_DAILY_LATE_RATE);
    expect(dailyRateOf({ amount: 100, due_date: null, daily_interest_percent: 0 })).toBe(4);
  });
});

describe("computeLateFee — juros composto diário", () => {
  const parcela = (dias: number, extras = {}) => ({
    amount: 100,
    due_date: venceEm(-dias),
    status: "pending",
    ...extras,
  });

  it("é zero antes de vencer", () => {
    expect(computeLateFee({ amount: 100, due_date: venceEm(5), status: "pending" })).toBe(0);
  });

  it("1 dia a 4% cobra 4,00", () => {
    expect(computeLateFee(parcela(1))).toBeCloseTo(4, 2);
  });

  it("compõe: 2 dias dão 8,16 e não 8,00", () => {
    // 100 * (1,04^2 - 1) = 8,16 — se desse 8,00 seria juros simples
    expect(computeLateFee(parcela(2))).toBeCloseTo(8.16, 2);
  });

  it("3 dias dão 12,49", () => {
    expect(computeLateFee(parcela(3))).toBeCloseTo(12.49, 2);
  });

  it("cresce rápido: 30 dias a 4% passam de 2x a parcela", () => {
    const juros = computeLateFee(parcela(30));
    expect(juros).toBeGreaterThan(200);
    expect(juros).toBeCloseTo(100 * (Math.pow(1.04, 30) - 1), 1);
  });

  it("respeita a taxa própria do contrato", () => {
    expect(computeLateFee(parcela(2, { daily_interest_percent: 1 }))).toBeCloseTo(2.01, 2);
  });

  it("parcela paga congela o valor que foi cobrado, não recalcula", () => {
    const paga = { amount: 100, due_date: venceEm(-10), status: "paid", late_fee: 7.5 };
    expect(computeLateFee(paga)).toBe(7.5);
  });

  it("parcela cancelada também congela", () => {
    const cancelada = { amount: 100, due_date: venceEm(-10), status: "cancelled", late_fee: 3 };
    expect(computeLateFee(cancelada)).toBe(3);
  });

  it("parcela sem valor não inventa juros", () => {
    expect(computeLateFee({ amount: 0, due_date: venceEm(-10), status: "pending" })).toBe(0);
  });

  it("arredonda para centavos", () => {
    const v = computeLateFee(parcela(7));
    expect(Number.isInteger(Math.round(v * 100))).toBe(true);
    expect(v).toBe(Math.round(v * 100) / 100);
  });
});

describe("totalDue e breakdown", () => {
  it("total é parcela + juros acumulado", () => {
    const p = { amount: 100, due_date: venceEm(-2), status: "pending" };
    expect(totalDue(p)).toBeCloseTo(108.16, 2);
  });

  it("breakdown não tem multa fixa — só o juros diário", () => {
    const b = computeLateFeeBreakdown({ amount: 100, due_date: venceEm(-2), status: "pending" });
    expect(b.multa).toBe(0);
    expect(b.multaPct).toBe(0);
    expect(b.daysLate).toBe(2);
    expect(b.jurosPct).toBe(4);
    expect(b.juros).toBeCloseTo(8.16, 2);
    expect(b.withFees).toBeCloseTo(108.16, 2);
  });

  it("juros do breakdown bate com o total, sem dupla contagem", () => {
    const p = { amount: 250, due_date: venceEm(-5), status: "pending" };
    const b = computeLateFeeBreakdown(p);
    expect(b.total).toBeCloseTo(computeLateFee(p), 2);
    expect(b.withFees).toBeCloseTo(totalDue(p), 2);
  });
});

describe("independência da hora do dia", () => {
  it("o valor não muda se o cálculo roda de manhã ou de noite", () => {
    const p = { amount: 100, due_date: venceEm(-3), status: "pending" };
    const manha = new Date(); manha.setHours(6, 0, 0, 0);
    const noite = new Date(); noite.setHours(23, 30, 0, 0);
    expect(computeLateFee(p, manha)).toBeCloseTo(computeLateFee(p, noite), 2);
  });
});
