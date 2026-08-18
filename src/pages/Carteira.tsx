import { useState, useMemo } from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Banknote,
  CreditCard,
  Plus,
  Minus,
  Calendar,
  Search,
  X,
  PiggyBank,
  Receipt,
  Sparkles,
  Activity,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMultiTableRealtime } from "@/hooks/useRealtimeSubscription";
import { formatBR } from "@/lib/dateUtils";
import { useConfirm } from "@/components/ConfirmProvider";
import { fetchAll } from "@/lib/fetchAll";

type PeriodKey = "all" | "7d" | "30d" | "90d";

const Carteira = () => {
  const confirm = useConfirm();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [period, setPeriod] = useState<PeriodKey>("all");
  const [searchTimeline, setSearchTimeline] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"in" | "out" | "withdraw">("in");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useMultiTableRealtime(
    ["profits", "expenses", "contract_installments", "transactions"],
    [
      ["carteira-profits", user?.id || ""],
      ["carteira-expenses", user?.id || ""],
      // Precisa bater EXATAMENTE com o queryKey da consulta abaixo. Estava
      // "carteira-installments" enquanto a query usava outro nome — o realtime
      // nunca atualizava a carteira quando um pagamento era registrado.
      ["carteira-installments-recebidas", user?.id || ""],
      ["carteira-capital", user?.id || ""],
      ["carteira-withdrawals", user?.id || ""],
    ],
  );

  const { data: profits = [], isLoading: loadingProfits, error: profitsError } = useQuery({
    queryKey: ["carteira-profits", user?.id],
    queryFn: async () => fetchAll((f, t) => supabase.from("profits").select("*").eq("user_id", user!.id).order("date", { ascending: false }).range(f, t)),
    enabled: !!user,
  });

  const { data: expenses = [], isLoading: loadingExpenses, error: expensesError } = useQuery({
    queryKey: ["carteira-expenses", user?.id],
    queryFn: async () => fetchAll((f, t) => supabase.from("expenses").select("*").eq("user_id", user!.id).order("date", { ascending: false }).range(f, t)),
    enabled: !!user,
  });

  const { data: installments = [], isLoading: loadingInst, error: installmentsError } = useQuery({
    queryKey: ["carteira-installments-recebidas", user?.id],
    queryFn: async () =>
      // TODAS as parcelas recebidas, não só as de contrato ativo.
      //
      // A consulta anterior limitava a contratos "active"/"overdue" — o dinheiro
      // que entrou por contratos já quitados sumia da carteira. Em 2026-08-05
      // eram R$ 121.756,96 de recebimento invisível, mais da metade do total.
      // Contrato encerrado sai do "capital na rua" (isso é do painel), mas o
      // dinheiro que ele trouxe continua no caixa.
      fetchAll((f, t) =>
        supabase.from("contract_installments")
          .select("id, amount, paid_amount, paid_at, contract_id, client_id")
          .eq("user_id", user!.id)
          .eq("status", "paid")
          .order("paid_at", { ascending: false })
          .range(f, t),
      ),
    enabled: !!user,
  });

  const { data: capital = [], isLoading: loadingCapital, error: capitalError } = useQuery({
    queryKey: ["carteira-capital", user?.id],
    queryFn: async () => fetchAll((f, t) => supabase.from("transactions").select("*").eq("user_id", user!.id).eq("type", "capital_injection").order("date", { ascending: false }).range(f, t)),
    enabled: !!user,
  });

  const { data: withdrawals = [], isLoading: loadingWithdraw, error: withdrawalsError } = useQuery({
    queryKey: ["carteira-withdrawals", user?.id],
    queryFn: async () => fetchAll((f, t) => supabase.from("transactions").select("*").eq("user_id", user!.id).eq("type", "capital_withdrawal").order("date", { ascending: false }).range(f, t)),
    enabled: !!user,
  });

  const loading = loadingProfits || loadingExpenses || loadingInst || loadingCapital || loadingWithdraw;
  const loadError = profitsError || expensesError || installmentsError || capitalError || withdrawalsError;

  const handleSave = async () => {
    if (!user || !amount || !description || saving) return;
    setSaving(true);
    const now = new Date().toISOString();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      setSaving(false);
      return;
    }

    if (dialogType === "in") {
      const { error } = await supabase.from("transactions").insert({
        user_id: user.id, amount: val, description, date: now,
        type: "capital_injection", category: "Aporte de capital",
      });
      if (error) { toast({ title: "Erro ao adicionar aporte", variant: "destructive" }); setSaving(false); return; }
    } else if (dialogType === "withdraw") {
      const { error } = await supabase.from("transactions").insert({
        user_id: user.id, amount: val, description, date: now,
        type: "capital_withdrawal", category: "Retirada de capital",
      });
      if (error) { toast({ title: "Erro ao retirar capital", variant: "destructive" }); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("expenses").insert({ user_id: user.id, amount: val, description, date: now, category: "Retirada manual" });
      if (error) { toast({ title: "Erro ao registrar saída", variant: "destructive" }); setSaving(false); return; }
    }

    toast({ title: dialogType === "in" ? "✓ Aporte adicionado!" : dialogType === "withdraw" ? "✓ Capital retirado!" : "✓ Saída registrada!" });
    setAmount(""); setDescription(""); setDialogOpen(false); setSaving(false);
    qc.invalidateQueries({ queryKey: ["carteira-capital"] });
    qc.invalidateQueries({ queryKey: ["carteira-withdrawals"] });
    qc.invalidateQueries({ queryKey: ["carteira-expenses"] });
    qc.invalidateQueries({ queryKey: ["dashboard-data"] });
  };

  const handleDeleteCapital = async (id: string) => {
    if (!(await confirm("Remover este lançamento de capital?"))) return;
    if (!user) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
    if (error) { toast({ title: "Erro ao remover", variant: "destructive" }); return; }
    toast({ title: "✓ Lançamento removido" });
    qc.invalidateQueries({ queryKey: ["carteira-capital"] });
    qc.invalidateQueries({ queryKey: ["carteira-withdrawals"] });
  };

  // === Totais globais (saldo real) ===
  //
  // O lucro NÃO é uma entrada separada: ele já está dentro da parcela recebida.
  // Uma parcela de R$ 250 com R$ 220 de juros gera uma linha em `profits` de
  // R$ 220 — somar as duas contava R$ 470 de entrada para R$ 250 que entraram.
  // Na base de 2026-08-05 isso inflava o saldo em R$ 24.159,34.
  //
  // O lucro continua visível como composição: quanto do que entrou era juros.
  const totalCapital = capital.reduce((a: number, c: any) => a + Number(c.amount), 0);
  const totalWithdrawals = withdrawals.reduce((a: number, w: any) => a + Number(w.amount), 0);
  const totalLucros = profits.reduce((a: number, p: any) => a + Number(p.amount), 0);
  const totalParcelas = installments.reduce((a: number, i: any) => a + Number(i.paid_amount || i.amount), 0);
  const totalGastos = expenses.reduce((a: number, e: any) => a + Number(e.amount), 0);
  const totalEntradas = totalCapital + totalParcelas;
  const totalSaidas = totalGastos + totalWithdrawals;
  const saldo = totalEntradas - totalSaidas;

  // === Filtros de período ===
  const periodDays: Record<PeriodKey, number | null> = { all: null, "7d": 7, "30d": 30, "90d": 90 };
  const withinPeriod = (dateStr: string, days: number | null) => {
    if (days == null) return true;
    const diff = (Date.now() - new Date(dateStr).getTime()) / 86400000;
    return diff <= days;
  };

  const days = periodDays[period];
  const prevDays = days ? days * 2 : null;

  const sumIn = (arr: any[], key: string, from: number | null, to: number | null) =>
    arr.filter((r) => {
      const d = (Date.now() - new Date(r.date || r.paid_at).getTime()) / 86400000;
      if (from != null && d > from) return false;
      if (to != null && d <= to) return false;
      return true;
    }).reduce((a, r) => a + Number(r[key] ?? r.amount), 0);

  const stats = useMemo(() => {
    // Sem o lucro na soma: ele já vem embutido na parcela (ver totais acima).
    const inCur = sumIn(capital, "amount", days, null) + sumIn(installments.map((i: any) => ({ ...i, date: i.paid_at })), "amount", days, null);
    const outCur = sumIn(expenses, "amount", days, null) + sumIn(withdrawals, "amount", days, null);
    const inPrev = prevDays ? sumIn(capital, "amount", prevDays, days) + sumIn(installments.map((i: any) => ({ ...i, date: i.paid_at })), "amount", prevDays, days) : 0;
    const outPrev = prevDays ? sumIn(expenses, "amount", prevDays, days) + sumIn(withdrawals, "amount", prevDays, days) : 0;
    const inDelta = inPrev > 0 ? ((inCur - inPrev) / inPrev) * 100 : null;
    const outDelta = outPrev > 0 ? ((outCur - outPrev) / outPrev) * 100 : null;
    return { inCur, outCur, netCur: inCur - outCur, inDelta, outDelta };
  }, [capital, profits, installments, expenses, withdrawals, days, prevDays]);

  // Capital líquido disponível (aportes − retiradas de capital)
  const capitalLiquido = totalCapital - totalWithdrawals;

  const timeline = useMemo(() => {
    const all = [
      ...capital.map((c: any) => ({ type: "in" as const, desc: c.description, amount: Number(c.amount), date: c.date, source: "Aporte", removable: true, id: c.id })),
      ...withdrawals.map((w: any) => ({ type: "out" as const, desc: w.description, amount: Number(w.amount), date: w.date, source: "Retirada de capital", removable: true, id: w.id })),
      // O lucro NÃO entra na linha do tempo como movimento próprio: ele já está
      // dentro da parcela recebida logo abaixo. Aparecia duas vezes.
      ...installments.map((i: any) => ({ type: "in" as const, desc: "Parcela recebida", amount: Number(i.paid_amount || i.amount), date: i.paid_at, source: "Parcela", removable: false, id: i.id })),
      ...expenses.map((e: any) => ({ type: "out" as const, desc: e.description, amount: Number(e.amount), date: e.date, source: e.category || "Gasto", removable: false, id: e.id })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return all.filter((t) => {
      if (!withinPeriod(t.date, days)) return false;
      if (searchTimeline && !t.desc.toLowerCase().includes(searchTimeline.toLowerCase()) && !t.source.toLowerCase().includes(searchTimeline.toLowerCase())) return false;
      return true;
    });
  }, [profits, expenses, installments, capital, withdrawals, days, searchTimeline]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  const fmtCompact = (v: number) =>
    Math.abs(v) >= 1000 ? `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k` : `R$ ${fmt(v)}`;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-14 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
        <h2 className="mt-3 font-semibold text-foreground">Não foi possível carregar a carteira</h2>
        <p className="mt-1 text-sm text-muted-foreground">Confira sua conexão e tente novamente.</p>
        <button
          onClick={() => void qc.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("carteira-") })}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" /> Tentar novamente
        </button>
      </div>
    );
  }

  // === Composição de entradas (para barra segmentada) ===
  const principalRecebido = Math.max(0, totalParcelas - totalLucros);
  const entradasTotal = totalCapital + totalParcelas || 1;
  const capitalPct = (totalCapital / entradasTotal) * 100;
  const lucrosPct = (totalLucros / entradasTotal) * 100;
  const parcelasPct = (principalRecebido / entradasTotal) * 100;

  const saidasTotal = totalGastos + totalWithdrawals || 1;
  const gastosPct = (totalGastos / saidasTotal) * 100;
  const withdrawPct = (totalWithdrawals / saidasTotal) * 100;

  const grouped = timeline.reduce((acc, t) => {
    const key = formatBR(t.date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {} as Record<string, typeof timeline>);

  const dayTotals = (items: typeof timeline) =>
    items.reduce((acc, t) => {
      if (t.type === "in") acc.in += t.amount; else acc.out += t.amount;
      return acc;
    }, { in: 0, out: 0 });

  const sourceIcon = (source: string) => {
    if (source === "Aporte") return <PiggyBank size={14} />;
    if (source === "Lucro") return <TrendingUp size={14} />;
    if (source === "Parcela") return <CreditCard size={14} />;
    if (source === "Retirada de capital") return <ArrowDownRight size={14} />;
    return <Receipt size={14} />;
  };

  return (
    <div className="space-y-6">
      {/* HERO — Saldo destacado */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-8 animate-fade-in">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-success/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center shadow-[0_0_30px_hsl(var(--primary)/0.25)]">
              <Banknote size={26} className="text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Carteira</p>
              <h1 className="text-display text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Saldo Total
              </h1>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-4xl md:text-5xl font-bold tracking-tight ${saldo >= 0 ? "text-success" : "text-destructive"}`}>
                  R$ {fmt(saldo)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <Sparkles size={12} className="text-primary" />
                Capital líquido disponível: <span className="font-semibold text-foreground">R$ {fmt(capitalLiquido)}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setDialogType("in"); setAmount(""); setDescription(""); setDialogOpen(true); }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-success/15 text-success hover:bg-success/25 font-semibold text-sm transition-colors border border-success/30"
            >
              <Plus size={16} /> Aporte
            </button>
            <button
              onClick={() => { setDialogType("withdraw"); setAmount(""); setDescription(""); setDialogOpen(true); }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-warning/15 text-warning hover:bg-warning/25 font-semibold text-sm transition-colors border border-warning/30"
            >
              <Minus size={16} /> Retirar Capital
            </button>
            <button
              onClick={() => { setDialogType("out"); setAmount(""); setDescription(""); setDialogOpen(true); }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-destructive/15 text-destructive hover:bg-destructive/25 font-semibold text-sm transition-colors border border-destructive/30"
            >
              <Minus size={16} /> Saída
            </button>
          </div>
        </div>

        {/* Composição do saldo em uma linha */}
        <div className="relative mt-6 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {[
            { label: "Aportes", value: totalCapital, color: "text-primary", dot: "bg-primary" },
            { label: "Lucros", value: totalLucros, color: "text-success", dot: "bg-success" },
            { label: "Parcelas", value: totalParcelas, color: "text-info", dot: "bg-info" },
            { label: "Retiradas", value: -totalWithdrawals, color: "text-warning", dot: "bg-warning" },
            { label: "Gastos", value: -totalGastos, color: "text-destructive", dot: "bg-destructive" },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-border/60 bg-background/40 backdrop-blur-sm px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                {c.label}
              </div>
              <p className={`text-sm font-bold mt-1 ${c.color}`}>
                {c.value < 0 ? "−" : ""}R$ {fmt(Math.abs(c.value))}
              </p>
            </div>
          ))}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            {dialogType === "in" && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-success">
                    <ArrowUpRight size={20} /> Adicionar Aporte de Capital
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <p className="text-xs text-muted-foreground -mt-1">Dinheiro disponível para emprestar. Não conta como lucro.</p>
                  <div><Label>Descrição</Label><Input placeholder="Ex: Depósito inicial, Aporte sócio..." value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                  <div><Label>Valor (R$)</Label><Input type="number" min="0.01" step="0.01" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
                  <button disabled={saving || !amount || !description} onClick={handleSave} className="w-full py-2.5 rounded-xl bg-success text-success-foreground font-semibold hover:opacity-90 transition-colors disabled:opacity-50">
                    {saving ? "Salvando..." : "Confirmar Aporte"}
                  </button>
                </div>
              </>
            )}
            {dialogType === "withdraw" && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-warning">
                    <ArrowDownRight size={20} /> Retirar Capital
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <p className="text-xs text-muted-foreground -mt-1">Reduz o capital disponível para emprestar. Não é gasto/despesa.</p>
                  <div><Label>Descrição</Label><Input placeholder="Ex: Devolução sócio, Saque pessoal..." value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                  <div><Label>Valor (R$)</Label><Input type="number" min="0.01" step="0.01" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
                  <button disabled={saving || !amount || !description} onClick={handleSave} className="w-full py-2.5 rounded-xl bg-warning text-warning-foreground font-semibold hover:opacity-90 transition-colors disabled:opacity-50">
                    {saving ? "Salvando..." : "Confirmar Retirada"}
                  </button>
                </div>
              </>
            )}
            {dialogType === "out" && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <ArrowDownRight size={20} /> Registrar Saída
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div><Label>Descrição</Label><Input placeholder="Ex: Saque, Pagamento..." value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                  <div><Label>Valor (R$)</Label><Input type="number" min="0.01" step="0.01" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
                  <button disabled={saving || !amount || !description} onClick={handleSave} className="w-full py-2.5 rounded-xl bg-destructive text-destructive-foreground font-semibold hover:opacity-90 transition-colors disabled:opacity-50">
                    {saving ? "Salvando..." : "Confirmar Saída"}
                  </button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtro de período */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity size={14} className="text-primary" />
          <span className="font-medium text-foreground">Movimentações no período</span>
        </div>
        <div className="pill-tabs">
          {(["all", "7d", "30d", "90d"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setPeriod(f)}
              className={`pill-tab text-xs px-3 py-1.5 ${period === f ? "pill-tab-active" : "pill-tab-inactive"}`}
            >
              {f === "all" ? "Total" : f === "7d" ? "7 dias" : f === "30d" ? "30 dias" : "90 dias"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats — período */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-fade-in">
        {[
          {
            icon: ArrowUpRight,
            label: "Entradas",
            value: stats.inCur,
            color: "text-success",
            bg: "bg-success/10",
            ring: "border-success/20",
            delta: stats.inDelta,
            hint: period === "all" ? "todo o período" : "vs período anterior",
          },
          {
            icon: ArrowDownRight,
            label: "Saídas",
            value: stats.outCur,
            color: "text-destructive",
            bg: "bg-destructive/10",
            ring: "border-destructive/20",
            delta: stats.outDelta,
            hint: period === "all" ? "todo o período" : "vs período anterior",
            deltaInverted: true,
          },
          {
            icon: TrendingUp,
            label: "Resultado Líquido",
            value: stats.netCur,
            color: stats.netCur >= 0 ? "text-success" : "text-destructive",
            bg: stats.netCur >= 0 ? "bg-success/10" : "bg-destructive/10",
            ring: stats.netCur >= 0 ? "border-success/20" : "border-destructive/20",
            hint: "entradas − saídas",
          },
          {
            icon: PiggyBank,
            label: "Capital Líquido",
            value: capitalLiquido,
            color: "text-primary",
            bg: "bg-primary/10",
            ring: "border-primary/20",
            hint: "disponível p/ emprestar",
          },
        ].map((s, idx) => {
          const deltaVal = s.delta;
          const deltaPositive = s.deltaInverted ? (deltaVal ?? 0) < 0 : (deltaVal ?? 0) >= 0;
          return (
            <div
              key={s.label}
              className={`rounded-2xl border ${s.ring} bg-card p-5 card-shine hover:border-primary/30 transition-colors`}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <s.icon size={18} className={s.color} />
                </div>
                {deltaVal != null && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${deltaPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                    {deltaPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {Math.abs(deltaVal).toFixed(0)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${s.color} tabular-nums`}>{fmtCompact(s.value)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.hint}</p>
            </div>
          );
        })}
      </div>

      {/* Composição de fluxo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ArrowUpRight size={16} className="text-success" /> Composição das Entradas
            </span>
            <span className="text-xs text-muted-foreground">R$ {fmt(totalEntradas)}</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden flex">
            <div className="h-full bg-primary transition-all duration-700" style={{ width: `${capitalPct}%` }} title="Aportes" />
            <div className="h-full bg-success transition-all duration-700" style={{ width: `${lucrosPct}%` }} title="Lucros" />
            <div className="h-full bg-info transition-all duration-700" style={{ width: `${parcelasPct}%` }} title="Principal recebido" />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /><span className="text-muted-foreground">Aportes</span><span className="ml-auto font-semibold text-foreground">{capitalPct.toFixed(0)}%</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success" /><span className="text-muted-foreground">Lucros</span><span className="ml-auto font-semibold text-foreground">{lucrosPct.toFixed(0)}%</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-info" /><span className="text-muted-foreground">Principal</span><span className="ml-auto font-semibold text-foreground">{parcelasPct.toFixed(0)}%</span></div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ArrowDownRight size={16} className="text-destructive" /> Composição das Saídas
            </span>
            <span className="text-xs text-muted-foreground">R$ {fmt(totalSaidas)}</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden flex">
            <div className="h-full bg-destructive transition-all duration-700" style={{ width: `${gastosPct}%` }} title="Gastos" />
            <div className="h-full bg-warning transition-all duration-700" style={{ width: `${withdrawPct}%` }} title="Retiradas" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive" /><span className="text-muted-foreground">Gastos</span><span className="ml-auto font-semibold text-foreground">{gastosPct.toFixed(0)}%</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning" /><span className="text-muted-foreground">Retiradas</span><span className="ml-auto font-semibold text-foreground">{withdrawPct.toFixed(0)}%</span></div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden animate-fade-in">
        <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sticky-header">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <CreditCard size={18} className="text-primary" /> Histórico
            <span className="text-xs text-muted-foreground font-normal">({timeline.length})</span>
          </h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por descrição ou origem..."
              value={searchTimeline}
              onChange={(e) => setSearchTimeline(e.target.value)}
              className="pl-9 pr-8 py-2 rounded-xl bg-accent/50 border border-border text-xs text-foreground placeholder:text-muted-foreground w-72 max-w-full input-enhanced"
            />
            {searchTimeline && (
              <button onClick={() => setSearchTimeline("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X size={12} className="text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {timeline.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Wallet size={28} className="text-muted-foreground/30" /></div>
            <p className="text-muted-foreground text-sm">Nenhuma transação encontrada.</p>
          </div>
        ) : (
          <div className="max-h-[560px] overflow-y-auto">
            {Object.entries(grouped).map(([date, items]) => {
              const tot = dayTotals(items);
              const net = tot.in - tot.out;
              return (
                <div key={date}>
                  <div className="px-5 py-2.5 sticky top-0 bg-card/95 backdrop-blur z-[5] border-b border-border/60 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar size={11} /> {date}
                    </span>
                    <span className={`text-[11px] font-bold tabular-nums ${net >= 0 ? "text-success" : "text-destructive"}`}>
                      {net >= 0 ? "+" : "−"}R$ {fmt(Math.abs(net))}
                    </span>
                  </div>
                  <div className="divide-y divide-border/40">
                    {items.map((t, idx) => (
                      <div key={idx} className="flex items-center gap-3 px-5 py-3 hover:bg-accent/30 transition-colors group">
                        <div className={`w-1 self-stretch rounded-full ${t.type === "in" ? "bg-success" : "bg-destructive"}`} />
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.type === "in" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                          {sourceIcon(t.source)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{t.desc}</p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted/50 text-[10px] font-medium">
                              {t.source}
                            </span>
                          </p>
                        </div>
                        <span className={`font-bold text-sm tabular-nums ${t.type === "in" ? "text-success" : "text-destructive"}`}>
                          {t.type === "in" ? "+" : "−"}R$ {fmt(t.amount)}
                        </span>
                        {t.removable && (
                          <button
                            onClick={() => handleDeleteCapital(t.id)}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                            title="Remover"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Carteira;
