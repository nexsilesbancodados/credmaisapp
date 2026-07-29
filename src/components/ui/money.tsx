import { cn } from "@/lib/utils";

interface MoneyProps {
  value: number | null | undefined;
  className?: string;
  /** Exibe sem casas decimais quando valor é inteiro. */
  compact?: boolean;
  /** Prefixo customizado (default: "R$"). */
  prefix?: string;
  /** Colore por sinal (positivo verde / negativo vermelho). */
  signed?: boolean;
}

const fmt = (n: number, compact: boolean) => {
  const abs = Math.abs(n);
  const decimals = compact && Number.isInteger(abs) ? 0 : 2;
  return abs.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: 2,
  });
};

export const Money = ({ value, className, compact = false, prefix = "R$", signed }: MoneyProps) => {
  const v = Number(value ?? 0);
  const negative = v < 0;
  const tone = signed
    ? negative
      ? "text-destructive"
      : v > 0
        ? "text-emerald-400"
        : "text-foreground"
    : "";
  return (
    <span className={cn("tabular-nums whitespace-nowrap", tone, className)}>
      {signed && v > 0 ? "+" : negative ? "-" : ""}
      {prefix} {fmt(v, compact)}
    </span>
  );
};
