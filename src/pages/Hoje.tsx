import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMultiTableRealtime } from "@/hooks/useRealtimeSubscription";
import { toast } from "sonner";
import {
  Sunrise, AlertCircle, CheckCircle2, ListTodo, Receipt,
  TrendingUp, ArrowRight, MessageSquare, Loader2, Plus, Clock, Sparkles,
  UserPlus, FileText, Wallet, Cake, CalendarDays, Flame, History, DollarSign
} from "lucide-react";
import SmartAlerts from "@/components/SmartAlerts";
import AtivoPassivoCard from "@/components/dashboard/AtivoPassivoCard";
import { formatBR, parseLocalDate } from "@/lib/dateUtils";
import { fetchAll } from "@/lib/fetchAll";

const startOfToday = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const endOfToday = () => { const d = new Date(); d.setHours(23,59,59,999); return d; };
const startOfMonth = () => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; };
const endOfMonth = () => { const d = new Date(); d.setMonth(d.getMonth()+1, 0); d.setHours(23,59,59,999); return d; };
const inDays = (n: number) => { const d = startOfToday(); d.setDate(d.getDate()+n); return d; };
const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtTime = (iso: string) => formatBR(iso, { day: "2-digit", month: "short" });
const fmtDayLabel = (iso: string) => {
  const d = parseLocalDate(iso);
  if (!d) return "";
  const today = startOfToday();
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  return formatBR(d, { weekday: "short", day: "2-digit", month: "2-digit" });
};

const Hoje = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite");
  }, []);

  useMultiTableRealtime(
    ["contract_installments", "todos", "notifications", "profits"],
    [["hoje", user?.id]],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["hoje", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const today = startOfToday().toISOString();
      const eod = endOfToday().toISOString();
      const in7 = inDays(7).toISOString();
      const som = startOfMonth().toISOString();
      const eom = endOfMonth().toISOString();

      const [
        dueTodayRes, overdueRes, todosRes, notifRes, profitsTodayRes, promisesRes,
        next7Res, paidRecentRes, profitsMonthRes, pendingMonthRes, clientsRes,
      ] = await Promise.all([
        supabase.from("contract_installments")
          .select("id, amount, due_date, installment_number, client_id, contract_id, clients:client_id(name, phone, whatsapp), contracts:contract_id(capital)")
          .eq("user_id", user.id).eq("status", "pending")
          .gte("due_date", today).lte("due_date", eod)
          .order("due_date", { ascending: true }).limit(50),
        fetchAll((f, t) => supabase.from("contract_installments")
          .select("id, amount, due_date, installment_number, client_id, contract_id, clients:client_id(name, phone, whatsapp), contracts:contract_id(capital)")
          .eq("user_id", user.id).eq("status", "pending")
          .lt("due_date", today)
          .order("due_date", { ascending: true }).range(f, t)).then((d) => ({ data: d })),
        supabase.from("todos").select("id, task, is_complete").eq("user_id", user.id).eq("is_complete", false).order("created_at", { ascending: false }).limit(8),
        supabase.from("notifications").select("id, message, type, link, sent_at").eq("user_id", user.id).eq("is_read", false).order("sent_at", { ascending: false }).limit(5),
        fetchAll((f, t) => supabase.from("profits").select("amount").eq("user_id", user.id).gte("date", today).lte("date", eod).range(f, t)).then((d) => ({ data: d })),
        supabase.from("audit_logs").select("id, details, created_at").eq("user_id", user.id).eq("action", "promise_to_pay").order("created_at", { ascending: false }).limit(5),
        // Agenda 7 dias (incluindo hoje)
        supabase.from("contract_installments")
          .select("id, amount, due_date, client_id, clients:client_id(name)")
          .eq("user_id", user.id).eq("status", "pending")
          .gte("due_date", today).lte("due_date", in7)
          .order("due_date", { ascending: true }).limit(80),
        // Últimos pagamentos
        supabase.from("contract_installments")
          .select("id, paid_amount, paid_at, client_id, clients:client_id(name)")
          .eq("user_id", user.id).eq("status", "paid")
          .not("paid_at", "is", null)
          .order("paid_at", { ascending: false }).limit(5),
        // Lucro do mês
        fetchAll((f, t) => supabase.from("profits").select("amount").eq("user_id", user.id).gte("date", som).lte("date", eom).range(f, t)).then((d) => ({ data: d })),
        // A receber no mês (pendente)
        fetchAll((f, t) => supabase.from("contract_installments").select("amount")
          .eq("user_id", user.id).eq("status", "pending")
          .gte("due_date", som).lte("due_date", eom).range(f, t)).then((d) => ({ data: d })),
        // Aniversariantes (puxa só os com birth_date e filtra no client)
        supabase.from("clients")
          .select("id, name, birth_date, phone, whatsapp")
          .eq("user_id", user.id)
          .not("birth_date", "is", null)
          .limit(500),
      ]);

      // Top devedores: agrupa atraso por cliente
      const debtors: Record<string, { id: string; name: string; total: number; count: number; phone?: string; whatsapp?: string }> = {};
      (overdueRes.data || []).forEach((i: any) => {
        const cid = i.client_id; if (!cid) return;
        if (!debtors[cid]) debtors[cid] = { id: cid, name: i.clients?.name || "Cliente", total: 0, count: 0, phone: i.clients?.phone, whatsapp: i.clients?.whatsapp };
        debtors[cid].total += Number(i.amount);
        debtors[cid].count += 1;
      });
      const topDebtors = Object.values(debtors).sort((a, b) => b.total - a.total).slice(0, 5);

      // Agenda 7 dias agrupada por data
      const agendaMap: Record<string, { date: string; items: any[]; total: number }> = {};
      (next7Res.data || []).forEach((i: any) => {
        const key = i.due_date.slice(0, 10);
        if (!agendaMap[key]) agendaMap[key] = { date: i.due_date, items: [], total: 0 };
        agendaMap[key].items.push(i);
        agendaMap[key].total += Number(i.amount);
      });
      const agenda = Object.values(agendaMap).sort((a, b) => a.date.localeCompare(b.date));

      // Aniversariantes de hoje
      const now = new Date();
      const todayMD = `${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
      const birthdays = (clientsRes.data || []).filter((c: any) => {
        if (!c.birth_date) return false;
        const md = c.birth_date.slice(5, 10);
        return md === todayMD;
      });

      const profitMonth = (profitsMonthRes.data || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
      const aReceberMonth = (pendingMonthRes.data || []).reduce((s: number, p: any) => s + Number(p.amount), 0);

      return {
        dueToday: dueTodayRes.data || [],
        overdue: overdueRes.data || [],
        todos: todosRes.data || [],
        notifications: notifRes.data || [],
        profitToday: (profitsTodayRes.data || []).reduce((s: number, p: any) => s + Number(p.amount), 0),
        promises: (promisesRes.data || []).map((p: any) => ({
          id: p.id,
          date: p.details?.promise_date,
          client: p.details?.client_name || "Cliente",
          msg: p.details?.message
        })),
        topDebtors,
        agenda,
        birthdays,
        paidRecent: paidRecentRes.data || [],
        profitMonth,
        aReceberMonth,
      };
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const totals = useMemo(() => ({
    dueToday: (data?.dueToday || []).reduce((s, i: any) => s + Number(i.amount), 0),
    overdue: (data?.overdue || []).reduce((s, i: any) => s + Number(i.amount), 0),
    overdueCount: data?.overdue.length || 0,
    dueTodayCount: data?.dueToday.length || 0,
  }), [data]);

  const markPaid = async (id: string, amount: number) => {
    setSavingId(id);
    const { error } = await supabase.from("contract_installments")
      .update({ status: "paid", paid_at: new Date().toISOString(), paid_amount: amount })
      .eq("id", id);
    setSavingId(null);
    if (error) { toast.error("Erro ao registrar pagamento"); return; }
    toast.success("Pagamento registrado");
    qc.invalidateQueries({ queryKey: ["hoje"] });
  };

  const toggleTodo = async (id: string, current: boolean) => {
    await supabase.from("todos").update({ is_complete: !current }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["hoje"] });
  };

  const sendWhats = (phone?: string, clientName?: string, customMsg?: string, amount?: number, due?: string) => {
    if (!phone) { toast.error("Cliente sem telefone"); return; }
    const clean = phone.replace(/\D/g, "");
    const num = clean.startsWith("55") ? clean : `55${clean}`;
    const msg = encodeURIComponent(customMsg || `Olá ${clientName || ""}! Lembrete da parcela de R$ ${fmtBRL(amount || 0)} vencendo em ${due ? fmtTime(due) : "breve"}.`);
    window.open(`https://wa.me/${num}?text=${msg}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-16 rounded-2xl bg-muted/30" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted/30" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-64 rounded-2xl bg-muted/30" />)}
        </div>
      </div>
    );
  }

  const quickActions = [
    { label: "Novo cliente",         Icon: UserPlus,   to: "/clientes/novo", tone: "primary" },
    { label: "Registrar pagamento",  Icon: DollarSign, to: "/cobrancas",     tone: "success" },
    { label: "Lançar gasto",         Icon: Wallet,     to: "/gastos",        tone: "danger"  },
    { label: "Lançar lucro",         Icon: TrendingUp, to: "/lucros",        tone: "amber"   },
  ] as const;

  const toneMap: Record<string, { chip: string; ring: string; dot: string }> = {
    primary: { chip: "bg-primary/10 text-primary",           ring: "ring-primary/20",     dot: "bg-primary" },
    success: { chip: "bg-success/10 text-success",           ring: "ring-success/20",     dot: "bg-success" },
    danger:  { chip: "bg-destructive/10 text-destructive",   ring: "ring-destructive/20", dot: "bg-destructive" },
    amber:   { chip: "bg-amber-500/10 text-amber-500",       ring: "ring-amber-500/20",   dot: "bg-amber-500" },
  };

  const nowLong = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  const isCalm = totals.dueTodayCount === 0 && totals.overdueCount === 0;

  return (
    <section className="space-y-5" aria-labelledby="hoje-title">
      <a
        href="#hoje-cobrancas"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-primary-foreground focus:text-xs focus:font-bold"
      >
        Pular para cobranças prioritárias
      </a>

      {/* ═══ Command Hero ═══
          Header editorial: data + saudação à esquerda, status pill inline,
          CTA primário à direita. Aurora sutil, sem excesso de vidro. */}
      <header className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden="true">
          <div className="absolute -top-24 -left-16 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-28 right-8 w-72 h-72 rounded-full bg-success/[0.06] blur-3xl" />
          <div className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
        </div>

        <div className="relative px-5 sm:px-7 py-5 sm:py-6 flex items-start sm:items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
          <div className="min-w-0 flex items-center gap-4">
            <span className="hidden sm:flex w-12 h-12 rounded-2xl bg-primary/10 ring-1 ring-primary/20 items-center justify-center shrink-0">
              <Sunrise size={20} className="text-primary" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground font-bold truncate">
                {nowLong}
              </p>
              <h1 id="hoje-title" className="mt-0.5 text-2xl sm:text-[28px] font-extrabold text-foreground leading-none tracking-tight">
                {greeting}<span aria-hidden="true" className="ml-2 inline-block">👋</span>
              </h1>
              <p className="mt-2 text-xs text-muted-foreground flex items-center gap-2 flex-wrap" aria-live="polite">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${isCalm ? "bg-success/10 text-success ring-1 ring-success/20" : "bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isCalm ? "bg-success" : "bg-amber-500"}`} />
                  {isCalm ? "Tudo em dia" : "Cobranças pendentes"}
                </span>
                {!isCalm && (
                  <>
                    <span className="tabular-nums">
                      <span className="font-bold text-foreground">{totals.dueTodayCount}</span>
                      <span className="ml-1 text-muted-foreground">hoje</span>
                    </span>
                    <span className="opacity-30">·</span>
                    <span className="tabular-nums">
                      <span className="font-bold text-destructive">{totals.overdueCount}</span>
                      <span className="ml-1 text-muted-foreground">em atraso</span>
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/clientes/novo")}
            className="shrink-0 h-11 px-5 rounded-2xl text-sm font-bold text-primary-foreground flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-16px_hsl(var(--primary)/0.65)]"
            style={{ background: "var(--gradient-button, linear-gradient(135deg,hsl(var(--primary)),hsl(var(--primary)/0.78)))" }}
            aria-label="Novo cliente"
          >
            <Plus size={15} />
            <span className="tracking-tight">Novo cliente</span>
          </button>
        </div>

        {/* KPI ribbon integrado ao header */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 border-t border-border/60 divide-x divide-border/40">
          {[
            { label: "Vencendo hoje",    value: totals.dueToday,          sub: `${totals.dueTodayCount} parcelas`, tone: "primary" as const, Icon: Clock },
            { label: "Em atraso",        value: totals.overdue,           sub: `${totals.overdueCount} parcelas`, tone: "danger" as const,  Icon: AlertCircle },
            { label: "Lucro hoje",       value: data?.profitToday || 0,   sub: "registrado",                       tone: "success" as const, Icon: TrendingUp },
            { label: "A receber no mês", value: data?.aReceberMonth || 0, sub: "pendente",                         tone: "amber" as const,   Icon: CalendarDays },
          ].map((k, idx) => {
            const t = toneMap[k.tone];
            return (
              <div key={k.label} className="group relative px-4 sm:px-5 py-4 transition-colors hover:bg-accent/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold truncate">{k.label}</p>
                  <span className={`w-6 h-6 rounded-lg ring-1 ${t.ring} ${t.chip} flex items-center justify-center shrink-0`}>
                    <k.Icon size={11} aria-hidden="true" />
                  </span>
                </div>
                <p className="text-[13px] sm:text-[15px] text-muted-foreground/50 font-semibold tabular-nums leading-none">R$</p>
                <p className="mt-0.5 text-xl sm:text-[26px] font-extrabold text-foreground leading-none tracking-tight tabular-nums truncate">
                  {fmtBRL(k.value)}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground/80 truncate flex items-center gap-1.5">
                  <span className={`w-1 h-1 rounded-full ${t.dot}`} />
                  {k.sub}
                </p>
              </div>
            );
          })}
        </div>
      </header>

      {/* ═══ Atalhos ═══ Linha compacta abaixo do hero */}
      <nav aria-label="Ações rápidas" className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {quickActions.map(a => {
          const t = toneMap[a.tone];
          return (
            <button
              key={a.label}
              onClick={() => navigate(a.to)}
              className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-md px-4 py-3 flex items-center gap-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:bg-card/80"
            >
              <span className={`shrink-0 w-9 h-9 rounded-xl ring-1 ${t.ring} ${t.chip} flex items-center justify-center`}>
                <a.Icon size={16} />
              </span>
              <span className="flex-1 min-w-0 text-[13px] font-bold text-foreground truncate tracking-tight">
                {a.label}
              </span>
              <ArrowRight size={13} className="text-muted-foreground/40 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
            </button>
          );
        })}
      </nav>


      {/* Balanço Ativo × Passivo (aparece se houver investidores) */}
      <AtivoPassivoCard />


      {/* Primeiro nível: Cobranças + painel lateral */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <section
          id="hoje-cobrancas"
          aria-labelledby="hoje-cobrancas-title"
          className="lg:col-span-2 rounded-2xl border border-border/40 bg-card/60 overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
            <h2 id="hoje-cobrancas-title" className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Receipt size={12} className="text-primary" /> Cobranças prioritárias
            </h2>
            <button onClick={() => navigate("/cobrancas")} className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver todas <ArrowRight size={10} />
            </button>
          </div>
          <ul className="divide-y divide-border/20 max-h-[380px] overflow-y-auto">
            {[...(data?.overdue || []), ...(data?.dueToday || [])].length === 0 && (
              <li className="py-10 text-center list-none">
                <CheckCircle2 size={28} className="mx-auto text-success/60 mb-1.5" />
                <p className="text-xs font-semibold text-foreground">Tudo em dia!</p>
              </li>
            )}
            {[...(data?.overdue || []), ...(data?.dueToday || [])].slice(0, 30).map((inst: any) => {
              const dueLocal = parseLocalDate(inst.due_date) ?? new Date(inst.due_date);
              const isOverdue = dueLocal < startOfToday();
              const daysLate = isOverdue ? Math.floor((startOfToday().getTime() - dueLocal.getTime()) / 86400000) : 0;
              const clientName = inst.clients?.name || "Cliente";
              const amount = Number(inst.amount);
              return (
                <li key={inst.id} className="px-3 py-2 flex items-center gap-2 hover:bg-accent/20 transition-colors">
                  <button onClick={() => navigate(`/clientes/${inst.client_id}`)} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-xs font-semibold text-foreground truncate">{clientName}</p>
                      {isOverdue && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive font-bold">{daysLate}d</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      Parc {inst.installment_number} · {fmtTime(inst.due_date)}
                      {inst.contract_id && (
                        <span className="ml-1 px-1 py-0.5 rounded bg-primary/10 text-primary font-mono text-xs" title={`Contrato ${inst.contract_id}`}>
                          #{String(inst.contract_id).slice(0, 6)}
                        </span>
                      )}
                    </p>
                  </button>
                  <p className="text-xs font-bold text-foreground shrink-0">R$ {fmtBRL(amount)}</p>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => sendWhats(inst.clients?.whatsapp || inst.clients?.phone, clientName, undefined, amount, inst.due_date)}
                      className="min-w-8 min-h-8 p-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20"
                      aria-label="WhatsApp"
                    >
                      <MessageSquare size={12} />
                    </button>
                    <button
                      onClick={() => markPaid(inst.id, amount)}
                      disabled={savingId === inst.id}
                      className="min-h-8 px-2 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
                    >
                      {savingId === inst.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                      <span className="hidden sm:inline">Pagar</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="space-y-3" aria-label="Tarefas e alertas">
          <section className="rounded-2xl border border-border/40 bg-card/60 overflow-hidden">
            <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <ListTodo size={12} className="text-amber-400" /> Tarefas
              </h2>
              <button onClick={() => navigate("/ferramentas/tarefas")} className="text-xs text-primary hover:underline">Ver tudo</button>
            </div>
            <ul className="divide-y divide-border/20 max-h-48 overflow-y-auto">
              {data?.todos.length === 0 && (
                <li className="px-3 py-5 text-xs text-muted-foreground text-center list-none">Nenhuma tarefa</li>
              )}
              {data?.todos.map((t: any) => (
                <li key={t.id}>
                  <button
                    onClick={() => toggleTodo(t.id, t.is_complete)}
                    className="w-full px-3 py-2 flex items-start gap-2 hover:bg-accent/20 transition-colors text-left"
                  >
                    <div className="w-3.5 h-3.5 mt-0.5 rounded border-2 border-border shrink-0" />
                    <p className="text-xs text-foreground flex-1 leading-snug">{t.task}</p>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {data?.promises && data.promises.length > 0 && (
            <section className="rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden">
              <div className="px-3 py-2 border-b border-primary/20">
                <h2 className="text-sm font-bold text-primary flex items-center gap-1.5">
                  <Sparkles size={12} /> Promessas IA
                </h2>
              </div>
              <ul className="divide-y divide-primary/10">
                {data.promises.map((p: any) => (
                  <li key={p.id} className="px-3 py-2">
                    <p className="text-xs font-bold text-foreground">{p.client}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1 italic">"{p.msg}"</p>
                    <div className="mt-0.5 flex items-center gap-1">
                      <Clock size={9} className="text-primary" />
                      <span className="text-xs font-bold text-primary">{p.date ? formatBR(p.date) : '??'}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <SmartAlerts
            overdue={data?.overdue || []}
            dueToday={data?.dueToday || []}
            notifications={data?.notifications || []}
          />
        </aside>
      </div>

      {/* Segundo nível: 4 painéis novos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Top 5 devedores */}
        <section className="rounded-2xl border border-border/40 bg-card/60 overflow-hidden">
          <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Flame size={12} className="text-destructive" /> Top devedores
            </h2>
          </div>
          <ul className="divide-y divide-border/20 max-h-72 overflow-y-auto">
            {(data?.topDebtors || []).length === 0 && (
              <li className="px-3 py-5 text-xs text-muted-foreground text-center list-none">Sem atrasos 🎉</li>
            )}
            {(data?.topDebtors || []).map((d, idx) => (
              <li key={d.id} className="px-3 py-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-destructive/15 text-destructive text-xs font-bold flex items-center justify-center shrink-0">{idx+1}</span>
                <button onClick={() => navigate(`/clientes/${d.id}`)} className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-semibold text-foreground truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.count} parcelas · R$ {fmtBRL(d.total)}</p>
                </button>
                <button
                  onClick={() => sendWhats(d.whatsapp || d.phone, d.name, `Olá ${d.name}, identificamos parcelas em atraso totalizando R$ ${fmtBRL(d.total)}. Podemos regularizar?`)}
                  className="min-w-8 min-h-8 p-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20"
                >
                  <MessageSquare size={11} />
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Agenda 7 dias */}
        <section className="rounded-2xl border border-border/40 bg-card/60 overflow-hidden">
          <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <CalendarDays size={12} className="text-primary" /> Agenda 7 dias
            </h2>
            <button onClick={() => navigate("/cobrancas")} className="text-xs text-primary hover:underline">Ver</button>
          </div>
          <ul className="divide-y divide-border/20 max-h-72 overflow-y-auto">
            {(data?.agenda || []).length === 0 && (
              <li className="px-3 py-5 text-xs text-muted-foreground text-center list-none">Sem vencimentos</li>
            )}
            {(data?.agenda || []).map(d => (
              <li key={d.date} className="px-3 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground capitalize">{fmtDayLabel(d.date)}</p>
                  <p className="text-xs text-muted-foreground">{d.items.length} parcela{d.items.length !== 1 ? "s" : ""}</p>
                </div>
                <p className="text-xs font-bold text-primary shrink-0">R$ {fmtBRL(d.total)}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Aniversariantes */}
        <section className="rounded-2xl border border-pink-500/20 bg-pink-500/5 overflow-hidden">
          <div className="px-3 py-2 border-b border-pink-500/20 flex items-center justify-between">
            <h2 className="text-sm font-bold text-pink-400 flex items-center gap-1.5">
              <Cake size={12} /> Aniversariantes
            </h2>
          </div>
          <ul className="divide-y divide-pink-500/10 max-h-72 overflow-y-auto">
            {(data?.birthdays || []).length === 0 && (
              <li className="px-3 py-5 text-xs text-muted-foreground text-center list-none">Ninguém faz aniversário hoje</li>
            )}
            {(data?.birthdays || []).map((c: any) => (
              <li key={c.id} className="px-3 py-2 flex items-center gap-2">
                <span className="text-base" aria-hidden>🎂</span>
                <button onClick={() => navigate(`/clientes/${c.id}`)} className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBR(c.birth_date)}</p>
                </button>
                <button
                  onClick={() => sendWhats(c.whatsapp || c.phone, c.name, `Feliz aniversário, ${c.name}! 🎉 Tudo de bom para você hoje.`)}
                  className="min-w-8 min-h-8 p-1.5 rounded-lg bg-pink-500/15 text-pink-400 hover:bg-pink-500/25"
                >
                  <MessageSquare size={11} />
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Resumo financeiro + últimos pagamentos */}
        <section className="rounded-2xl border border-border/40 bg-card/60 overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <History size={12} className="text-success" /> Resumo do mês
            </h2>
            <button onClick={() => navigate("/financeiro")} className="text-xs text-primary hover:underline">Ver</button>
          </div>
          <div className="px-3 py-2 grid grid-cols-2 gap-2 border-b border-border/20">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Lucro</p>
              <p className="text-sm font-bold text-success">R$ {fmtBRL(data?.profitMonth || 0)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">A receber</p>
              <p className="text-sm font-bold text-amber-400">R$ {fmtBRL(data?.aReceberMonth || 0)}</p>
            </div>
          </div>
          <ul className="divide-y divide-border/20 flex-1 overflow-y-auto">
            <li className="px-3 pt-2 pb-1 text-xs uppercase tracking-wider text-muted-foreground font-bold list-none">Últimos pagamentos</li>
            {(data?.paidRecent || []).length === 0 && (
              <li className="px-3 py-3 text-xs text-muted-foreground text-center list-none">Nenhum recebimento</li>
            )}
            {(data?.paidRecent || []).map((p: any) => (
              <li key={p.id} className="px-3 py-1.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{p.clients?.name || "Cliente"}</p>
                  <p className="text-xs text-muted-foreground">{fmtTime(p.paid_at)}</p>
                </div>
                <p className="text-xs font-bold text-success shrink-0">+ R$ {fmtBRL(Number(p.paid_amount || 0))}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
};

export default Hoje;
