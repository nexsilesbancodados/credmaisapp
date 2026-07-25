import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import VoiceRecorder from "@/components/VoiceRecorder";
import EditClienteModal from "@/components/cliente-detalhe/modals/EditClienteModal";
import EditAddressModal from "@/components/cliente-detalhe/modals/EditAddressModal";
import NovoEmprestimoModal from "@/components/cliente-detalhe/modals/NovoEmprestimoModal";
import EditContratoModal from "@/components/cliente-detalhe/modals/EditContratoModal";
import EditParcelaModal from "@/components/cliente-detalhe/modals/EditParcelaModal";
import PagamentoModal from "@/components/cliente-detalhe/modals/PagamentoModal";
import RenegociarModal, { type RenegotiationPayload } from "@/components/cliente-detalhe/modals/RenegociarModal";
import { LOAN_MODES, fmt, FREQ, INPUT } from "@/components/cliente-detalhe/constants";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMultiTableRealtime } from "@/hooks/useRealtimeSubscription";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ArrowLeft, User, Phone, Mail, MapPin, FileText, DollarSign,
  CheckCircle, AlertTriangle, Clock, Edit, Trash2, Plus, Send, Copy,
  MessageSquare, Star, Ban, RotateCcw, Download, TrendingUp,
  Calendar, Receipt, Activity, Search, X, Percent, Wallet, Printer, Camera,
  Wrench, Repeat, PhoneCall, StickyNote,
  Info, UploadCloud, File as FileIcon, ImageIcon, ShieldCheck, Sparkles, ChevronRight,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { formatBR } from "@/lib/dateUtils";
import { useConfirm } from "@/components/ConfirmProvider";
import { calculateLoan, generateInstallmentSchedule, LOAN_MODE_LABEL, type LoanMode, type Frequency, type DailyMode } from "@/lib/loanMath";
import { getSignedUploadUrl } from "@/lib/storage";
import ClientToolsPanel, { type ToolGroup } from "@/components/clients/ClientToolsPanel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { computeLateFee } from "@/lib/lateFee";
import { friendlyError } from "@/lib/friendlyError";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";



const ClienteDetalhe = () => {
  const confirm = useConfirm();
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"contratos" | "parcelas" | "historico">("contratos");
  const [docsOpen, setDocsOpen] = useState(false);

  const [historyFilter, setHistoryFilter] = useState<"all" | "contract" | "payment" | "profit" | "note" | "contact">("all");
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [editAddressMode, setEditAddressMode] = useState(false);
  const [addrData, setAddrData] = useState<any>({});
  const [newLoanMode, setNewLoanMode] = useState(false);
  const [partialPayModal, setPartialPayModal] = useState<any>(null);
  const [partialAmount, setPartialAmount] = useState("");
  const [payMethod, setPayMethod] = useState<string>("pix");
  const [payReceiptFile, setPayReceiptFile] = useState<File | null>(null);
  const [payUploading, setPayUploading] = useState(false);
  const [loanCapital, setLoanCapital] = useState("");
  const [loanInstallments, setLoanInstallments] = useState("");
  const [loanFreq, setLoanFreq] = useState("monthly");
  const [loanStartDate, setLoanStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [loanStart, setLoanStart] = useState(new Date().toISOString().split("T")[0]);
  const [loanInterestRate, setLoanInterestRate] = useState("10");
  const [loanDailyFee, setLoanDailyFee] = useState("0.33");
  const [loanLateFee, setLoanLateFee] = useState("2");
  const [loanMode, setLoanMode] = useState<LoanMode>("installments");
  const [loanGracePeriods, setLoanGracePeriods] = useState("2");
  const [loanGraceDays, setLoanGraceDays] = useState("0");
  const [loanPaymentMethod, setLoanPaymentMethod] = useState("pix");
  const [loanEarlyDiscount, setLoanEarlyDiscount] = useState("0");
  const [loanMaxInterestCap, setLoanMaxInterestCap] = useState("");
  const [loanNotes, setLoanNotes] = useState("");
  const [loanLoading, setLoanLoading] = useState(false);
  const [loanValueMode, setLoanValueMode] = useState<"rate" | "installment">("rate");
  const [loanInstallmentValue, setLoanInstallmentValue] = useState("");
  const [loanDailyMode, setLoanDailyMode] = useState<DailyMode>("mon-fri");
  const [loanFirstDueAuto, setLoanFirstDueAuto] = useState(true);
  const [loanCustomDates, setLoanCustomDates] = useState<string[]>([]);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [editContract, setEditContract] = useState<any>(null);
  const [editContractForm, setEditContractForm] = useState<any>({});
  const [editContractRegen, setEditContractRegen] = useState(false);
  const [editContractSaving, setEditContractSaving] = useState(false);
  const [editInst, setEditInst] = useState<any>(null);
  const [editInstForm, setEditInstForm] = useState<{ amount: string; due_date: string }>({ amount: "", due_date: "" });
  const [editInstSaving, setEditInstSaving] = useState(false);
  const [renegotiating, setRenegotiating] = useState<any>(null);

  const inv = useCallback((key: string) => qc.invalidateQueries({ queryKey: [key, id] }), [qc, id]);
  const invAll = useCallback(() => {
    ["client-detail", "client-contracts", "client-installments", "client-transactions", "client-profits"].forEach(k => inv(k));
    qc.invalidateQueries({ queryKey: ["dashboard-data"] });
    qc.invalidateQueries({ queryKey: ["cobrancas-installments"] });
  }, [inv, qc]);

  useMultiTableRealtime(
    ["clients", "contracts", "contract_installments", "transactions", "profits"],
    [
      ["client-detail", id || ""],
      ["client-contracts", id || ""],
      ["client-installments", id || ""],
      ["client-transactions", id || ""],
      ["client-profits", id || ""],
    ],
  );

  const { data: client, isLoading } = useQuery({
    queryKey: ["client-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
    staleTime: 30_000,
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["client-contracts", id],
    queryFn: async () => {
      const { data } = await supabase.from("contracts").select("*").eq("client_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id && !!user,
    staleTime: 30_000,
  });

  // Sincroniza os padrões do modal "Novo Empréstimo" com o último contrato do
  // cliente, para que empréstimos subsequentes herdem taxa, frequência, multas
  // e condições avançadas do histórico — evitando divergência com o wizard.
  useEffect(() => {
    if (!newLoanMode) return;
    const last = (contracts as any[])[0];
    if (!last) return;
    if (last.loan_mode) setLoanMode(last.loan_mode as LoanMode);
    if (last.frequency) setLoanFreq(last.frequency);
    if (last.interest_rate != null) setLoanInterestRate(String(last.interest_rate));
    if (last.num_installments) setLoanInstallments(String(last.num_installments));
    if (last.daily_interest_percent != null) setLoanDailyFee(String(last.daily_interest_percent));
    if (last.late_fee_percent != null) setLoanLateFee(String(last.late_fee_percent));
    if (last.grace_periods) setLoanGracePeriods(String(last.grace_periods));
    if (last.grace_days != null) setLoanGraceDays(String(last.grace_days));
    if (last.payment_method) setLoanPaymentMethod(last.payment_method);
    if (last.early_payment_discount_percent != null) setLoanEarlyDiscount(String(last.early_payment_discount_percent));
    if (last.max_interest_cap_percent != null) setLoanMaxInterestCap(String(last.max_interest_cap_percent));
    // valueMode segue o padrão do wizard: "installment" quando o modo é parcelas.
    setLoanValueMode(last.loan_mode === "installments" ? "installment" : "rate");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newLoanMode]);



  const { data: installments = [] } = useQuery({
    queryKey: ["client-installments", id],
    queryFn: async () => {
      const { data } = await supabase.from("contract_installments").select("*, contracts(capital, frequency)").eq("client_id", id!).order("due_date");
      const now = new Date();
      return (data || []).map((i: any) => i.status === "pending" && new Date(i.due_date) < now ? { ...i, status: "overdue" } : i);
    },
    enabled: !!id && !!user,
    staleTime: 30_000,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["client-transactions", id],
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("*").eq("client_id", id!).order("date", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!id && !!user,
    staleTime: 30_000,
  });

  const { data: profits = [] } = useQuery({
    queryKey: ["client-profits", id],
    queryFn: async () => {
      const { data } = await supabase.from("profits").select("*").eq("client_id", id!).order("date", { ascending: false });
      return data || [];
    },
    enabled: !!id && !!user,
    staleTime: 30_000,
  });

  const kpis = useMemo(() => {
    const activeContracts = contracts.filter((c: any) => c.status === "active");
    const totalCapital = activeContracts.reduce((s: number, c: any) => s + Number(c.capital || 0), 0);
    const lifetimeCapital = contracts.reduce((s: number, c: any) => s + Number(c.capital || 0), 0);
    const totalAmount = contracts.reduce((s: number, c: any) => s + Number(c.total_amount || 0), 0);
    const paidInst = installments.filter((i: any) => i.status === "paid");
    const overdueInst = installments.filter((i: any) => i.status === "overdue");
    const pendingInst = installments.filter((i: any) => i.status === "pending");
    const totalPaid = paidInst.reduce((s: number, i: any) => s + Number(i.paid_amount || i.amount || 0), 0);
    const totalOverdue = overdueInst.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
    const totalPending = pendingInst.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
    const totalProfit = profits.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const ltvPct = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;
    const ticketMedio = contracts.length > 0 ? lifetimeCapital / contracts.length : 0;
    const totalDueInst = paidInst.length + overdueInst.length;
    const latePayRate = totalDueInst > 0 ? Math.round((overdueInst.length / totalDueInst) * 100) : 0;
    const nextDueInst = pendingInst
      .slice()
      .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];
    return { totalCapital, lifetimeCapital, totalAmount, totalPaid, totalOverdue, totalPending, totalProfit, remaining: totalAmount - totalPaid, paidInst, overdueInst, pendingInst, ltvPct, ticketMedio, latePayRate, nextDueInst, activeContracts };
  }, [contracts, installments, profits]);

  // ===== Documentos & Anexos (Storage) =====
  const docsFolder = id ? `client-docs/${id}` : "";
  const { data: clientDocs = [] } = useQuery({
    queryKey: ["client-docs", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("uploads").list(docsFolder, {
        limit: 100, sortBy: { column: "created_at", order: "desc" },
      });
      if (error) return [];
      return (data || []).filter((f: any) => f.name && !f.name.startsWith("."));
    },
  });
  const [docUploading, setDocUploading] = useState(false);
  const uploadDoc = async (file: File) => {
    if (!file || !id) return;
    setDocUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${docsFolder}/${Date.now()}-${file.name.replace(/[^a-z0-9.-]/gi, "_")}`;
      const { error } = await supabase.storage.from("uploads").upload(path, file, {
        upsert: false, contentType: file.type,
      });
      if (error) throw error;
      toast({ title: "Documento anexado" });
      inv("client-docs");
    } catch (e: any) {
      toast({ title: "Falha ao anexar", description: e.message, variant: "destructive" });
    } finally { setDocUploading(false); }
  };
  const deleteDoc = async (name: string) => {
    if (!confirm("Remover este documento?")) return;
    const { error } = await supabase.storage.from("uploads").remove([`${docsFolder}/${name}`]);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Documento removido" });
    inv("client-docs");
  };
  const signedUrl = async (name: string) => {
    const { data } = await supabase.storage.from("uploads").createSignedUrl(`${docsFolder}/${name}`, 60 * 10);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };


  const groupedInstallments = useMemo(() => {
    const groups: Record<string, any[]> = {};
    installments.forEach((inst: any) => {
      const cid = inst.contract_id || "no-contract";
      if (!groups[cid]) groups[cid] = [];
      groups[cid].push(inst);
    });
    // Ordena cada grupo por número da parcela
    Object.values(groups).forEach((arr) => arr.sort((a: any, b: any) => (a.installment_number ?? 0) - (b.installment_number ?? 0)));
    // Ordena os grupos por data de criação do contrato (mais recente primeiro)
    const order = new Map(contracts.map((c: any, idx: number) => [c.id, idx]));
    const sorted: Record<string, any[]> = {};
    Object.keys(groups)
      .sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999))
      .forEach((k) => { sorted[k] = groups[k]; });
    return sorted;
  }, [installments, contracts]);

  const loanCalc = useMemo(() => {
    const cap = parseFloat(loanCapital) || 0;
    const rate = parseFloat(loanInterestRate) || 0;
    const n = parseInt(loanInstallments) || 0;
    const grace = parseInt(loanGracePeriods) || 0;
    const instVal = parseFloat(loanInstallmentValue) || 0;
    if (!cap) return null;
    const r = calculateLoan({
      capital: cap, rate, periods: n,
      frequency: loanFreq as any, loanMode,
      gracePeriods: loanMode === "grace" ? grace : 0,
      valueMode: loanMode === "installments" ? loanValueMode : "rate",
      installmentValue: instVal,
    });
    if (!r) return null;
    return {
      installmentAmount: r.installmentAmount,
      total: r.totalAmount,
      totalInterest: r.totalInterest,
      schedule: r.schedule,
      numInstallments: r.numInstallments,
      derivedRate: r.derivedRate,
    };
  }, [loanCapital, loanInterestRate, loanInstallments, loanFreq, loanMode, loanGracePeriods, loanValueMode, loanInstallmentValue]);

  // Actions
  const startEdit = () => {
    setEditData({ name: client?.name || "", phone: client?.phone || "", email: client?.email || "", cpf_cnpj: client?.cpf_cnpj || "", whatsapp: client?.whatsapp || "" });
    setEditMode(true);
  };

  const saveEdit = async () => {
    const { error } = await supabase.from("clients").update(editData).eq("id", id!);
    if (error) { toast({ ...friendlyError(error, "Não foi possível salvar o cliente."), variant: "destructive" }); return; }
    toast({ title: "Cliente atualizado!" }); setEditMode(false); inv("client-detail");
  };

  const startEditAddress = () => {
    const a = (client?.address as any) || {};
    setAddrData({ cep: a.cep || "", street: a.street || "", number: a.number || "", neighborhood: a.neighborhood || "", city: a.city || "", state: a.state || "" });
    setEditAddressMode(true);
  };

  const buscarCep = async () => {
    const raw = (addrData.cep || "").replace(/\D/g, "");
    if (raw.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const data = await res.json();
      if (!data.erro) setAddrData((prev: any) => ({ ...prev, street: data.logradouro || "", neighborhood: data.bairro || "", city: data.localidade || "", state: data.uf || "" }));
    } catch {}
  };

  const saveAddress = async () => {
    await supabase.from("clients").update({ address: addrData }).eq("id", id!);
    toast({ title: "Endereço atualizado!" }); setEditAddressMode(false); inv("client-detail");
  };

  // M3: usa o mesmo gerador do NovoCliente (loanMath) para não divergir. Antes
  // esta tela usava quinzenal = 14 dias e diária = dias corridos; agora fica
  // quinzenal = 15 dias e diária = dias úteis (mon-fri), igual à criação padrão.
  const generateDueDates = (start: string, freq: string, count: number, periodsAhead?: number) => {
    return generateInstallmentSchedule({
      startDate: start,
      frequency: freq as Frequency,
      count,
      periodsAhead,
    });
  };

  const handleCreateLoan = async () => {
    if (!user || !loanCalc) return;
    setLoanLoading(true);
    try {
      const nInput = parseInt(loanInstallments) || 0;
      const nReal = loanCalc.numInstallments;
      const periodsAhead = loanMode === "bullet" ? nInput : undefined;
      const effectiveRate = loanMode === "installments" && loanValueMode === "installment"
        ? (loanCalc.derivedRate ?? parseFloat(loanInterestRate) ?? 0)
        : parseFloat(loanInterestRate);
      const { data: contract, error: cErr } = await supabase.from("contracts").insert({
        user_id: user.id, client_id: id!, capital: parseFloat(loanCapital),
        interest_rate: effectiveRate, num_installments: nReal,
        installment_amount: loanCalc.installmentAmount, frequency: loanFreq,
        start_date: new Date(loanStartDate + "T12:00:00").toISOString(),
        late_fee_percent: parseFloat(loanLateFee), daily_interest_percent: parseFloat(loanDailyFee),
        total_amount: loanCalc.total, total_interest: loanCalc.totalInterest, status: "active",
        loan_mode: loanMode,
        grace_periods: loanMode === "grace" ? (parseInt(loanGracePeriods) || 0) : 0,
        grace_days: parseInt(loanGraceDays) || 0,
        payment_method: loanPaymentMethod,
        early_payment_discount_percent: parseFloat(loanEarlyDiscount) || 0,
        max_interest_cap_percent: loanMaxInterestCap ? parseFloat(loanMaxInterestCap) : null,
        notes: loanNotes || null,
      }).select().single();
      if (cErr) throw cErr;

      const dueDates = generateInstallmentSchedule({
        startDate: loanStartDate,
        firstDueDate: loanFirstDueAuto ? undefined : loanStart,
        frequency: loanFreq as Frequency,
        count: nReal,
        periodsAhead,
        dailyMode: loanDailyMode,
        customDates: loanFreq === "custom" ? loanCustomDates : undefined,
      });
      const { error: iErr } = await supabase.from("contract_installments").insert(
        dueDates.map((dd, i) => ({ user_id: user.id, contract_id: contract.id, client_id: id!, installment_number: i + 1, amount: loanCalc.schedule[i] ?? loanCalc.installmentAmount, due_date: dd, status: "pending" }))
      );
      if (iErr) throw iErr;

      await supabase.from("transactions").insert({
        user_id: user.id, amount: parseFloat(loanCapital), type: "loan",
        description: `Empréstimo para ${client?.name} - ${LOAN_MODE_LABEL[loanMode]} - ${nReal}x R$ ${fmt(loanCalc.installmentAmount)}`,
        client_id: id, contract_id: contract.id,
      });

      toast({ title: "Empréstimo criado!", description: `${nReal} parcela(s) gerada(s).` });
      setNewLoanMode(false); setLoanCapital(""); setLoanInstallments(""); setLoanNotes("");
      invAll();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setLoanLoading(false); }
  };

  const handleRenegotiate = async (payload: RenegotiationPayload) => {
    if (!user || !renegotiating) return;
    const old = renegotiating;
    try {
      // 1) Criar novo contrato
      const { data: newContract, error: cErr } = await supabase.from("contracts").insert({
        user_id: user.id,
        client_id: id!,
        capital: payload.totalCapital,
        interest_rate: payload.interestRate,
        num_installments: payload.numInstallments,
        installment_amount: payload.installmentAmount,
        frequency: payload.frequency,
        start_date: new Date(payload.startDate + "T12:00:00").toISOString(),
        late_fee_percent: payload.lateFeePercent,
        daily_interest_percent: payload.dailyInterestPercent,
        total_amount: payload.totalAmount,
        total_interest: payload.totalInterest,
        status: "active",
        loan_mode: "installments",
        notes: `Renegociação do contrato ${old.id}${payload.notes ? " — " + payload.notes : ""}`,
      }).select().single();
      if (cErr) throw cErr;

      // 2) Gerar parcelas do novo contrato
      const dueDates = generateDueDates(payload.startDate, payload.frequency, payload.numInstallments);
      const { error: iErr } = await supabase.from("contract_installments").insert(
        dueDates.map((dd, i) => ({
          user_id: user.id,
          contract_id: newContract.id,
          client_id: id!,
          installment_number: i + 1,
          amount: payload.schedule[i] ?? payload.installmentAmount,
          due_date: dd,
          status: "pending",
        }))
      );
      if (iErr) throw iErr;

      // 3) Cancelar parcelas em aberto do contrato antigo
      const { error: upErr } = await supabase
        .from("contract_installments")
        .update({ status: "cancelled" })
        .eq("contract_id", old.id)
        .neq("status", "paid");
      if (upErr) throw upErr;

      // 4) Encerrar contrato antigo como renegociado
      const oldNotes = [old.notes, `Renegociado em ${new Date().toLocaleDateString("pt-BR")} → novo contrato ${newContract.id}`]
        .filter(Boolean).join("\n");
      await supabase.from("contracts")
        .update({ status: "renegotiated", notes: oldNotes })
        .eq("id", old.id);

      // 5) Transação de auditoria (só do novo capital, se houver)
      if (payload.addCapital > 0) {
        await supabase.from("transactions").insert({
          user_id: user.id,
          amount: payload.addCapital,
          type: "loan",
          description: `Renegociação (${client?.name}) — novo capital de R$ ${payload.addCapital.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          client_id: id,
          contract_id: newContract.id,
        });
      }

      toast({ title: "Contrato renegociado!", description: `${payload.numInstallments}x de R$ ${payload.installmentAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` });
      setRenegotiating(null);
      invAll();
    } catch (err: any) {
      toast({ ...friendlyError(err, "Não foi possível concluir a renegociação."), variant: "destructive" });
    }
  };



  const openEditContract = (c: any) => {
    setEditContract(c);
    setEditContractForm({
      capital: String(c.capital ?? ""),
      interest_rate: String(c.interest_rate ?? ""),
      num_installments: String(c.num_installments ?? ""),
      installment_amount: String(c.installment_amount ?? ""),
      frequency: c.frequency || "monthly",
      start_date: c.start_date ? new Date(c.start_date).toISOString().split("T")[0] : "",
      late_fee_percent: String(c.late_fee_percent ?? "0"),
      daily_interest_percent: String(c.daily_interest_percent ?? "0"),
      notes: c.notes || "",
    });
    setEditContractRegen(false);
  };

  const handleSaveContract = async () => {
    if (!editContract || !user) return;
    setEditContractSaving(true);
    try {
      const f = editContractForm;
      const n = parseInt(f.num_installments);
      const cap = parseFloat(f.capital);
      const rate = parseFloat(f.interest_rate);
      const instAmt = parseFloat(f.installment_amount);
      const totalAmount = instAmt * n;
      const totalInterest = totalAmount - cap;

      const { error } = await supabase.from("contracts").update({
        capital: cap,
        interest_rate: rate,
        num_installments: n,
        installment_amount: instAmt,
        frequency: f.frequency,
        start_date: new Date(f.start_date + "T12:00:00").toISOString(),
        late_fee_percent: parseFloat(f.late_fee_percent),
        daily_interest_percent: parseFloat(f.daily_interest_percent),
        total_amount: totalAmount,
        total_interest: totalInterest,
        notes: f.notes || null,
      }).eq("id", editContract.id);
      if (error) throw error;

      if (editContractRegen) {
        // Apaga apenas parcelas não pagas e regera mantendo as pagas
        const existing = installments.filter((i: any) => i.contract_id === editContract.id);
        const paid = existing.filter((i: any) => i.status === "paid");
        const paidCount = paid.length;
        const remaining = Math.max(0, n - paidCount);

        await supabase.from("contract_installments")
          .delete()
          .eq("contract_id", editContract.id)
          .neq("status", "paid");

        if (remaining > 0) {
          const dueDates = generateDueDates(f.start_date, f.frequency, n).slice(paidCount);
          const newInst = dueDates.map((dd, i) => ({
            user_id: user.id,
            contract_id: editContract.id,
            client_id: id!,
            installment_number: paidCount + i + 1,
            amount: instAmt,
            due_date: dd,
            status: "pending",
          }));
          if (newInst.length) {
            const { error: iErr } = await supabase.from("contract_installments").insert(newInst);
            if (iErr) throw iErr;
          }
        }
      }

      toast({ title: "Contrato atualizado!", description: editContractRegen ? "Parcelas pendentes regeneradas." : undefined });
      setEditContract(null);
      invAll();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setEditContractSaving(false);
    }
  };
  
  const handleDeleteContract = async (contractId: string) => {
    const ok = await confirm({
      title: "Excluir Empréstimo?",
      description: "Isso apagará o contrato, todas as parcelas e movimentações ligadas a ele. Esta ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      cancelLabel: "Voltar",
      variant: "destructive"
    });
    if (!ok) return;

    try {
      // Deleta parcelas primeiro (FK)
      await supabase.from("contract_installments").delete().eq("contract_id", contractId);
      // Deleta transações ligadas ao contrato
      await supabase.from("transactions").delete().eq("contract_id", contractId);
      // Deleta o contrato
      const { error } = await supabase.from("contracts").delete().eq("id", contractId);
      
      if (error) throw error;
      
      toast({ title: "Empréstimo excluído com sucesso!" });
      invAll();
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    }
  };

  const openEditInst = (inst: any) => {
    setEditInst(inst);
    setEditInstForm({
      amount: String(inst.amount ?? ""),
      due_date: inst.due_date ? new Date(inst.due_date).toISOString().split("T")[0] : "",
    });
  };

  const handleSaveInst = async () => {
    if (!editInst) return;
    setEditInstSaving(true);
    try {
      const amt = parseFloat(editInstForm.amount);
      const dd = editInstForm.due_date ? new Date(editInstForm.due_date + "T12:00:00").toISOString() : editInst.due_date;
      if (isNaN(amt) || amt <= 0) throw new Error("Valor inválido");
      const { error } = await supabase.from("contract_installments").update({ amount: amt, due_date: dd }).eq("id", editInst.id);
      if (error) throw error;
      toast({ title: "Parcela atualizada!" });
      setEditInst(null);
      invAll();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setEditInstSaving(false);
    }
  };


  const patchInstallment = (instId: string, patch: any) => {
    const key = ["client-installments", id];
    const prev = qc.getQueryData<any[]>(key);
    qc.setQueryData<any[]>(key, (old) =>
      (old || []).map((i: any) => (i.id === instId ? { ...i, ...patch, _optimistic: true } : i))
    );
    return prev;
  };

  const uploadReceipt = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop() || "bin";
    const path = `${user.id}/receipts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("uploads").upload(path, file, { upsert: false });
    if (error) {
      toast({ ...friendlyError(error, "Não foi possível enviar o comprovante."), variant: "destructive" });
      return null;
    }
    return await getSignedUploadUrl(path);
  };

  const payFull = async (instId: string, amount: number, method: string = "pix", receiptUrl: string | null = null) => {
    if (!user) return;
    const patch: any = { status: "paid", paid_at: new Date().toISOString(), paid_amount: amount, payment_method: method };
    if (receiptUrl) patch.receipt_url = receiptUrl;
    const snapshot = patchInstallment(instId, patch);
    toast({ title: "Parcela quitada!" });
    // RPC atômico: parcela + lucro (juros reais) + caixa (só dinheiro novo) +
    // conclusão do contrato, tudo numa transação no servidor.
    const { error } = await supabase.rpc("pay_installment", {
      _installment_id: instId,
      _paid_total: amount,
      _mark_paid: true,
      _method: method,
      _receipt_url: receiptUrl,
    });
    if (error) {
      qc.setQueryData(["client-installments", id], snapshot);
      toast({ ...friendlyError(error, "Não foi possível quitar a parcela."), variant: "destructive" });
      return;
    }
    invAll();
  };

  const handlePartialPay = async () => {
    if (!partialPayModal || !user) return;
    const val = parseFloat(partialAmount);
    if (!val || val <= 0) { toast({ title: "Valor inválido", variant: "destructive" }); return; }
    setPayUploading(true);
    let receiptUrl: string | null = null;
    if (payReceiptFile) {
      receiptUrl = await uploadReceipt(payReceiptFile);
      if (!receiptUrl) { setPayUploading(false); return; }
    }
    const instAmount = Number(partialPayModal.amount);
    const alreadyPaid = Number(partialPayModal.paid_amount || 0);
    if (val + alreadyPaid >= instAmount) {
      await payFull(partialPayModal.id, instAmount, payMethod, receiptUrl);
    } else {
      const patch: any = { paid_amount: alreadyPaid + val, payment_method: payMethod };
      if (receiptUrl) patch.receipt_url = receiptUrl;
      const snapshot = patchInstallment(partialPayModal.id, patch);
      toast({ title: `R$ ${fmt(val)} registrado!` });
      // RPC atômico (parcial: não quita, lança só o dinheiro novo no caixa).
      const { error } = await supabase.rpc("pay_installment", {
        _installment_id: partialPayModal.id,
        _paid_total: alreadyPaid + val,
        _mark_paid: false,
        _method: payMethod,
        _receipt_url: receiptUrl,
      });
      if (error) {
        qc.setQueryData(["client-installments", id], snapshot);
        toast({ ...friendlyError(error, "Não foi possível registrar o pagamento."), variant: "destructive" });
      } else {
        invAll();
      }
    }
    setPayUploading(false);
    setPartialPayModal(null);
    setPayReceiptFile(null);
    setPayMethod("pix");
  };

  const reversePayment = async (instId: string) => {
    if (!(await confirm("Estornar pagamento?"))) return;
    const snapshot = patchInstallment(instId, { status: "pending", paid_at: null, paid_amount: null });
    toast({ title: "Estornado!" });
    // RPC atômico: reverte a parcela E remove o lucro/caixa lançados por ela
    // (vinculados por installment_id), reabrindo o contrato se estava concluído.
    const { error } = await supabase.rpc("reverse_installment_payment", { _installment_id: instId });
    if (error) {
      qc.setQueryData(["client-installments", id], snapshot);
      toast({ ...friendlyError(error, "Não foi possível estornar o pagamento."), variant: "destructive" });
      return;
    }
    invAll();
  };

  const getPhone = () => (client?.whatsapp || client?.phone || "").replace(/\D/g, "");

  const sendBilling = (inst: any) => {
    const phone = getPhone();
    if (!phone) { toast({ title: "Sem telefone", variant: "destructive" }); return; }
    const msg = encodeURIComponent(`Olá ${client?.name}, sua parcela #${inst.installment_number} de R$ ${fmt(Number(inst.amount))} venceu em ${formatBR(inst.due_date)}. Regularize o pagamento.`);
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const sendPortalLink = () => {
    const phone = getPhone();
    if (!phone) { toast({ title: "Sem telefone", variant: "destructive" }); return; }
    const portalUrl = `${window.location.origin}/portal-cliente`;
    const msg = encodeURIComponent(`Olá ${client?.name}, aqui está o link para o seu portal do cliente: ${portalUrl}\n\nLá você pode conferir suas parcelas, gerar PIX para pagamento e ver seu saldo devedor.\n\nBasta logar com seu CPF e data de nascimento.`);
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const sendAllOverdue = () => {
    if (!kpis.overdueInst.length) { toast({ title: "Sem parcelas atrasadas" }); return; }
    const phone = getPhone();
    if (!phone) { toast({ title: "Sem telefone", variant: "destructive" }); return; }
    const total = kpis.overdueInst.reduce((s: number, i: any) => s + Number(i.amount), 0);
    const msg = encodeURIComponent(`Olá ${client?.name}, você possui ${kpis.overdueInst.length} parcela(s) em atraso, total R$ ${fmt(total)}. Entre em contato para regularizar.`);
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const payAllPending = async () => {
    const unpaid = installments.filter((i: any) => i.status !== "paid");
    if (!unpaid.length) { toast({ title: "Todas pagas!" }); return; }
    if (!(await confirm(`Quitar ${unpaid.length} parcela(s)?`))) return;
    for (const inst of unpaid) await payFull(inst.id, Number(inst.amount));
    toast({ title: `${unpaid.length} parcelas quitadas!` });
  };

  const copyClientInfo = () => {
    navigator.clipboard.writeText(`Nome: ${client?.name}\nCPF: ${client?.cpf_cnpj || "—"}\nTel: ${client?.phone || "—"}\nWhatsApp: ${client?.whatsapp || "—"}\nEmail: ${client?.email || "—"}`);
    toast({ title: "Copiado!" });
  };

  const exportSummary = () => {
    navigator.clipboard.writeText([
      `=== ${client?.name} ===`, `CPF: ${client?.cpf_cnpj || "—"}`,
      `Capital: R$ ${fmt(kpis.totalCapital)}`, `Recebido: R$ ${fmt(kpis.totalPaid)}`,
      `Atraso: R$ ${fmt(kpis.totalOverdue)}`, `Restante: R$ ${fmt(kpis.remaining)}`,
    ].join("\n"));
    toast({ title: "Resumo copiado!" });
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const now = new Date();
    doc.setFillColor(20, 20, 25); doc.rect(0, 0, 210, 38, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("EXTRATO DO CLIENTE", 14, 16);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Emitido em ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR")}`, 14, 24);
    doc.text(`Cliente: ${client?.name || "—"}  |  CPF/CNPJ: ${client?.cpf_cnpj || "—"}`, 14, 31);

    let y = 46;
    doc.setTextColor(40, 40, 40); doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text("Resumo Financeiro", 14, y); y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Descrição", "Valor"]],
      body: [
        ["Capital Emprestado", `R$ ${fmt(kpis.totalCapital)}`],
        ["Total Recebido", `R$ ${fmt(kpis.totalPaid)}`],
        ["Total em Atraso", `R$ ${fmt(kpis.totalOverdue)}`],
        ["Saldo Restante", `R$ ${fmt(kpis.remaining)}`],
        ["Lucro Gerado", `R$ ${fmt(kpis.totalProfit)}`],
      ],
      theme: "grid",
      headStyles: { fillColor: [20, 20, 25], fontSize: 9 },
      bodyStyles: { fontSize: 8.5 },
      columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 82, halign: "right" } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    if (installments.length > 0) {
      if (y > 230) { doc.addPage(); y = 20; }
      doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("Parcelas", 14, y); y += 2;
      autoTable(doc, {
        startY: y,
        head: [["Nº", "Valor", "Vencimento", "Status"]],
        body: installments.map((i: any) => [String(i.installment_number), `R$ ${fmt(Number(i.amount))}`, formatBR(i.due_date), i.status === "paid" ? "Pago" : i.status === "overdue" ? "Atrasada" : "Pendente"]),
        theme: "grid", headStyles: { fillColor: [20, 20, 25], fontSize: 8 }, bodyStyles: { fontSize: 7.5 }, margin: { left: 14, right: 14 },
        didParseCell: (data: any) => { if (data.section === "body" && data.column.index === 3) { if (data.cell.raw === "Atrasada") data.cell.styles.textColor = [220, 50, 50]; else if (data.cell.raw === "Pago") data.cell.styles.textColor = [34, 139, 34]; } },
      });
    }

    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) { doc.setPage(p); doc.setFontSize(7); doc.setTextColor(140); doc.text(`Página ${p}/${pages}`, 105, 290, { align: "center" }); }
    doc.save(`extrato_${(client?.name || "cliente").replace(/\s+/g, "_")}.pdf`);
    toast({ title: "PDF gerado!" });
  };

  const buildContractPDF = (c: any) => {
    const doc = new jsPDF();
    const now = new Date();
    const cInsts = installments.filter((i: any) => i.contract_id === c.id);
    const paid = cInsts.filter((i: any) => i.status === "paid").length;
    const overdue = cInsts.filter((i: any) => i.status === "overdue").length;
    const totalPaidVal = cInsts.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
    const totalContract = Number(c.total_amount || Number(c.installment_amount) * Number(c.num_installments));
    const remaining = Math.max(0, totalContract - totalPaidVal);

    doc.setFillColor(20, 20, 25); doc.rect(0, 0, 210, 38, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("CONTRATO DE EMPRÉSTIMO", 14, 16);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Emitido em ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR")}`, 14, 24);
    doc.text(`Contrato #${String(c.id).slice(0, 8)}  |  Início: ${formatBR(c.start_date)}`, 14, 31);

    let y = 46;
    doc.setTextColor(40, 40, 40); doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text("Dados do Cliente", 14, y); y += 2;
    autoTable(doc, {
      startY: y,
      body: [
        ["Nome", client?.name || "—"],
        ["CPF/CNPJ", client?.cpf_cnpj || "—"],
        ["Telefone", client?.phone || client?.whatsapp || "—"],
        ["E-mail", client?.email || "—"],
      ],
      theme: "grid", bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 50, fontStyle: "bold" }, 1: { cellWidth: 132 } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("Resumo do Contrato", 14, y); y += 2;
    autoTable(doc, {
      startY: y,
      body: [
        ["Capital emprestado", `R$ ${fmt(Number(c.capital))}`],
        ["Modalidade", LOAN_MODE_LABEL[(c.loan_mode || "installments") as LoanMode] || c.loan_mode],
        ["Frequência", FREQ[c.frequency] || c.frequency],
        ["Parcelas", `${c.num_installments}x R$ ${fmt(Number(c.installment_amount))}`],
        ["Taxa de juros", `${Number(c.interest_rate || 0)}%`],
        ["Multa de atraso", `${Number(c.late_fee_percent || 0)}%`],
        ["Juros diário", `${Number(c.daily_interest_percent || 0)}%`],
        ["Total do contrato", `R$ ${fmt(totalContract)}`],
        ["Lucro previsto", `R$ ${fmt(Number(c.total_interest || 0))}`],
        ["Pago", `R$ ${fmt(totalPaidVal)} (${paid}/${cInsts.length})`],
        ["Em atraso", `${overdue} parcela(s)`],
        ["Saldo restante", `R$ ${fmt(remaining)}`],
      ],
      theme: "grid", bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 70, fontStyle: "bold" }, 1: { cellWidth: 112, halign: "right" } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    if (cInsts.length > 0) {
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("Parcelas", 14, y); y += 2;
      autoTable(doc, {
        startY: y,
        head: [["Nº", "Valor", "Vencimento", "Pago em", "Status"]],
        body: cInsts.map((i: any) => [
          String(i.installment_number),
          `R$ ${fmt(Number(i.amount))}`,
          formatBR(i.due_date),
          i.paid_at ? formatBR(i.paid_at) : "—",
          i.status === "paid" ? "Pago" : i.status === "overdue" ? "Atrasada" : "Pendente",
        ]),
        theme: "grid", headStyles: { fillColor: [20, 20, 25], fontSize: 9 }, bodyStyles: { fontSize: 8.5 },
        margin: { left: 14, right: 14 },
        didParseCell: (data: any) => {
          if (data.section === "body" && data.column.index === 4) {
            if (data.cell.raw === "Atrasada") data.cell.styles.textColor = [220, 50, 50];
            else if (data.cell.raw === "Pago") data.cell.styles.textColor = [34, 139, 34];
          }
        },
      });
    }

    if (c.notes) {
      y = (doc as any).lastAutoTable.finalY + 8;
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text("Observações", 14, y); y += 6;
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(60);
      doc.text(doc.splitTextToSize(String(c.notes), 182), 14, y);
    }

    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) { doc.setPage(p); doc.setFontSize(7); doc.setTextColor(140); doc.text(`Página ${p}/${pages}`, 105, 290, { align: "center" }); }

    return { doc, fileName: `contrato_${(client?.name || "cliente").replace(/\s+/g, "_")}_${String(c.id).slice(0, 6)}.pdf` };
  };

  const exportContractPDF = (c: any) => {
    const { doc, fileName } = buildContractPDF(c);
    doc.save(fileName);
    toast({ title: "PDF do contrato gerado!" });
  };

  const sendContractWhatsApp = async (c: any) => {
    const phone = getPhone();
    if (!phone) { toast({ title: "Cliente sem telefone", variant: "destructive" }); return; }
    const { doc, fileName } = buildContractPDF(c);
    const blob = doc.output("blob");
    const file = new File([blob], fileName, { type: "application/pdf" });

    const nav: any = navigator;
    const canShareFile = typeof nav.canShare === "function" && nav.canShare({ files: [file] });
    const totalContract = Number(c.total_amount || Number(c.installment_amount) * Number(c.num_installments));
    const msgText = `Olá ${client?.name || ""}, segue o contrato:\n\n• Capital: R$ ${fmt(Number(c.capital))}\n• Parcelas: ${c.num_installments}x R$ ${fmt(Number(c.installment_amount))}\n• Total: R$ ${fmt(totalContract)}\n• Início: ${formatBR(c.start_date)}\n\nPDF em anexo.`;

    if (canShareFile) {
      try {
        await nav.share({ files: [file], title: "Contrato", text: msgText });
        toast({ title: "Contrato compartilhado!" });
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }
    }

    // Fallback: baixa o PDF e abre o WhatsApp para o usuário anexar manualmente
    doc.save(fileName);
    const msg = encodeURIComponent(`${msgText}\n\n(O PDF foi baixado no seu dispositivo — anexe-o na conversa)`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
    toast({ title: "PDF baixado", description: "Anexe-o no WhatsApp que abriu." });
  };

  const toggleStatus = async () => {
    const s = client?.status === "Ativo" ? "Inativo" : "Ativo";
    const key = ["client-detail", id];
    const prev = qc.getQueryData<any>(key);
    qc.setQueryData(key, (old: any) => (old ? { ...old, status: s } : old));
    toast({ title: `Status: ${s}` });
    const { error } = await supabase.from("clients").update({ status: s }).eq("id", id!);
    if (error) {
      qc.setQueryData(key, prev);
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const updateScore = async (delta: number) => {
    const ns = Math.max(0, Math.min(1000, (client?.credit_score || 100) + delta));
    const key = ["client-detail", id];
    const prev = qc.getQueryData<any>(key);
    qc.setQueryData(key, (old: any) => (old ? { ...old, credit_score: ns } : old));
    toast({ title: `Score: ${ns}` });
    const { error } = await supabase.from("clients").update({ credit_score: ns }).eq("id", id!);
    if (error) {
      qc.setQueryData(key, prev);
      toast({ title: "Erro ao atualizar score", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!(await confirm("Excluir este cliente e todos os dados?"))) return;
    const { error } = await supabase.rpc("delete_client_cascade", { _client_id: id! });
    if (error) { toast({ ...friendlyError(error, "Não foi possível excluir o cliente."), variant: "destructive" }); return; }
    toast({ title: "Cliente excluído!" }); navigate("/clientes");
  };

  // --- Novas ações úteis ---

  const duplicateLastLoan = async () => {
    if (!user) return;
    const last = contracts[0];
    if (!last) { toast({ title: "Nenhum empréstimo anterior", variant: "destructive" }); return; }
    if (!(await confirm(`Duplicar último empréstimo de R$ ${fmt(Number(last.capital))} (${last.num_installments}x)?`))) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: contract, error: cErr } = await supabase.from("contracts").insert({
        user_id: user.id, client_id: id!,
        capital: last.capital, interest_rate: last.interest_rate,
        num_installments: last.num_installments, installment_amount: last.installment_amount,
        frequency: last.frequency, start_date: new Date(today + "T12:00:00").toISOString(),
        late_fee_percent: last.late_fee_percent, daily_interest_percent: last.daily_interest_percent,
        total_amount: last.total_amount, total_interest: last.total_interest, status: "active",
        loan_mode: last.loan_mode, grace_periods: last.grace_periods,
        notes: `Renovação de contrato anterior (${formatBR(last.start_date)})`,
      }).select().single();
      if (cErr) throw cErr;
      const dueDates = generateDueDates(today, last.frequency, last.num_installments);
      await supabase.from("contract_installments").insert(
        dueDates.map((dd, i) => ({
          user_id: user.id, contract_id: contract.id, client_id: id!,
          installment_number: i + 1, amount: last.installment_amount, due_date: dd, status: "pending",
        }))
      );
      await supabase.from("transactions").insert({
        user_id: user.id, amount: Number(last.capital), type: "loan",
        description: `Renovação: empréstimo para ${client?.name} - ${last.num_installments}x`,
        client_id: id, contract_id: contract.id,
      });
      toast({ title: "Empréstimo duplicado!" });
      invAll();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const markContact = async () => {
    if (!user) return;
    await supabase.from("transactions").insert({
      user_id: user.id, amount: 0, type: "contact",
      description: `Contato realizado com ${client?.name}`,
      client_id: id,
    });
    toast({ title: "Contato registrado!" });
    invAll();
  };

  const quickNote = async () => {
    if (!user) return;
    const text = window.prompt("Anotação rápida (aparece no histórico):");
    if (!text || !text.trim()) return;
    await supabase.from("transactions").insert({
      user_id: user.id, amount: 0, type: "note",
      description: `📝 ${text.trim()}`,
      client_id: id,
    });
    toast({ title: "Anotação salva!" });
    invAll();
  };



  if (isLoading) return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );

  if (!client) return (
    <div className="text-center py-16"><User size={48} className="mx-auto text-muted-foreground/20 mb-4" /><p className="text-muted-foreground">Cliente não encontrado</p></div>
  );

  const address = client.address as any;
  const scoreClr = (client.credit_score || 0) >= 700 ? "text-success" : (client.credit_score || 0) >= 400 ? "text-warning" : "text-destructive";

  const tabs = [
    { key: "contratos" as const, label: "Contratos", Icon: FileText },
    { key: "parcelas" as const, label: "Parcelas", Icon: Receipt },
    { key: "historico" as const, label: "Histórico", Icon: Clock },
  ];





  const toolGroups: ToolGroup[] = [
    {
      label: "Contrato",
      actions: [
        { icon: Plus, label: "Novo Empréstimo", description: "Wizard completo com todas as opções", action: () => navigate(`/clientes/novo?clientId=${id}`) },
        { icon: Repeat, label: "Duplicar Último", description: "Renovação rápida com os mesmos valores", action: duplicateLastLoan, disabled: contracts.length === 0 },
        { icon: CheckCircle, label: "Quitar Todas", description: "Marca todas as parcelas pendentes como pagas", action: payAllPending },
        { icon: Edit, label: "Editar Cliente", description: "Nome, telefone, CPF, email", action: startEdit },
      ],
    },
    {
      label: "Cobrança",
      actions: [
        { icon: Send, label: "Cobrar Atrasadas", description: `${kpis.overdueInst.length} parcela(s) em atraso via WhatsApp`, action: sendAllOverdue, disabled: kpis.overdueInst.length === 0 },
        { icon: MessageSquare, label: "Enviar Portal", description: "Link do portal do cliente via WhatsApp", action: sendPortalLink },
        { icon: PhoneCall, label: "Marcar Contato", description: "Registra um contato realizado no histórico", action: markContact },
        { icon: StickyNote, label: "Anotação Rápida", description: "Adiciona uma nota no histórico do cliente", action: quickNote },
      ],
    },
    {
      label: "Documentos",
      actions: [
        { icon: Printer, label: "Gerar PDF", description: "Extrato completo do cliente em PDF", action: generatePDF },
        { icon: Download, label: "Exportar Resumo", description: "Copia resumo financeiro para a área de transferência", action: exportSummary },
        { icon: Copy, label: "Copiar Dados", description: "Nome, CPF, telefone e email", action: copyClientInfo },
      ],
    },
    {
      label: "Score & Status",
      actions: [
        { icon: Star, label: "Score +50", description: "Aumenta o score de crédito", action: () => updateScore(50) },
        { icon: TrendingUp, label: "Score -50", description: "Reduz o score de crédito", action: () => updateScore(-50) },
        { icon: Ban, label: client.status === "Ativo" ? "Inativar Cliente" : "Reativar Cliente", description: client.status === "Ativo" ? "Suspende novas operações" : "Volta a aceitar operações", action: toggleStatus },
        { icon: Trash2, label: "Excluir Cliente", description: "Remove cliente e todos os dados — irreversível", action: handleDelete, destructive: true },
      ],
    },
  ];


  const daysAsClient = client.created_at ? Math.max(1, Math.floor((Date.now() - new Date(client.created_at).getTime()) / 86400000)) : 0;
  const clientSince = client.created_at ? new Date(client.created_at).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).toUpperCase() : "—";
  const riskLabel = (client.credit_score || 0) >= 750 ? "Baixo Risco" : (client.credit_score || 0) >= 600 ? "Risco Moderado" : (client.credit_score || 0) >= 400 ? "Risco Elevado" : "Risco Alto";
  const riskTone = (client.credit_score || 0) >= 750 ? "text-emerald-400 border-emerald-400/30 bg-emerald-500/10" : (client.credit_score || 0) >= 600 ? "text-amber-300 border-amber-400/30 bg-amber-500/10" : "text-rose-400 border-rose-400/30 bg-rose-500/10";

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24" style={{ fontFamily: "'Manrope', 'Inter', sans-serif" }}>
      {/* ===== Banner Navy + Ações Rápidas + KPIs (padrão CRM) ===== */}
      <header className="space-y-5">
        {/* Banner escuro com ondas */}
        <div className="relative overflow-hidden rounded-[24px] border border-border/40 shadow-2xl shadow-primary/10"
             style={{ background: "linear-gradient(120deg, hsl(222 47% 11%) 0%, hsl(217 60% 18%) 60%, hsl(214 80% 28%) 100%)" }}>
          {/* Ondas decorativas à direita */}
          <svg className="pointer-events-none absolute inset-y-0 right-0 h-full w-[55%] opacity-70" viewBox="0 0 600 220" fill="none" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="waveGrad" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="hsl(210 100% 70%)" stopOpacity="0" />
                <stop offset="1" stopColor="hsl(210 100% 75%)" stopOpacity="0.55" />
              </linearGradient>
            </defs>
            {[0, 14, 28, 42, 56, 70].map((off, i) => (
              <path key={i}
                d={`M0 ${90 + off} Q 150 ${40 + off}, 300 ${90 + off} T 600 ${90 + off}`}
                stroke="url(#waveGrad)" strokeWidth="1.2" fill="none" opacity={0.9 - i * 0.12} />
            ))}
          </svg>
          <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

          {/* Voltar / Cliente desde */}
          <div className="relative z-10 flex items-center justify-between px-5 md:px-7 pt-4">
            <button onClick={() => navigate("/clientes")} className="p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/90 hover:bg-white/20 transition-colors" aria-label="Voltar">
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-white/90">
              <Calendar size={12} className="opacity-80" />
              <span className="opacity-75">Cliente desde</span>
              <span className="font-bold">{clientSince.toLowerCase()}</span>
            </div>
          </div>

          {/* Conteúdo principal do banner */}
          <div className="relative z-10 px-5 md:px-7 pt-5 pb-7 flex flex-col md:flex-row md:items-center gap-5">
            {/* Avatar circular */}
            <div className="relative shrink-0 mx-auto md:mx-0">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-white/15 backdrop-blur-md ring-4 ring-white/20 flex items-center justify-center overflow-hidden text-white text-4xl md:text-5xl font-extrabold"
                   style={{ fontFamily: "'Sora','Space Grotesk',sans-serif" }}>
                {client.avatar_url ? <img src={client.avatar_url} alt="" className="w-full h-full object-cover" /> : client.name?.charAt(0)?.toUpperCase()}
              </div>
              <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-lg ring-2 ring-[hsl(222_47%_11%)]"
                     style={{ background: "var(--gradient-button)" }} title="Trocar foto">
                <Camera size={12} className="text-primary-foreground" />
                <input type="file" accept="image/*" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !id) return;
                  const ext = file.name.split(".").pop();
                  const path = `${user!.id}/client-avatars/${id}.${ext}`;
                  const { error: upErr } = await supabase.storage.from("uploads").upload(path, file, { upsert: true });
                  if (!upErr) {
                    const url = await getSignedUploadUrl(path);
                    if (url) await supabase.from("clients").update({ avatar_url: url }).eq("id", id);
                    inv("client-detail");
                    toast({ title: "✓ Foto atualizada!" });
                  } else {
                    toast({ title: "Erro no upload", description: upErr.message, variant: "destructive" });
                  }
                }} className="hidden" />
              </label>
            </div>

            {/* Nome + chips */}
            <div className="min-w-0 flex-1 text-center md:text-left">
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/50 font-bold">Bem-vindo(a),</p>
              <h1 className="mt-0.5 text-3xl md:text-[36px] font-extrabold text-white leading-[1.05] tracking-tight truncate"
                  style={{ fontFamily: "'Sora','Space Grotesk',sans-serif", letterSpacing: "-0.02em" }}>
                {client.name}
              </h1>
              <p className="text-xs text-white/60 mt-1">Ficha do cliente</p>
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-1.5 mt-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${client.status === "Ativo" ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40" : "bg-white/10 text-white/70 ring-1 ring-white/20"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${client.status === "Ativo" ? "bg-emerald-400" : "bg-white/50"}`} />
                  {client.status}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ring-1 ${(client.credit_score || 0) >= 750 ? "bg-emerald-500/20 text-emerald-300 ring-emerald-400/40" : (client.credit_score || 0) >= 600 ? "bg-amber-500/20 text-amber-200 ring-amber-400/40" : "bg-rose-500/20 text-rose-300 ring-rose-400/40"}`}>
                  <ShieldCheck size={11} /> {riskLabel}
                </span>
                {client.cpf_cnpj && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold text-white/80 ring-1 ring-white/20 bg-white/5 font-mono">
                    {client.cpf_cnpj}
                  </span>
                )}
                {kpis.activeContracts.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-sky-200 bg-sky-500/20 ring-1 ring-sky-400/40">
                    <FileText size={11} /> {kpis.activeContracts.length} ativo{kpis.activeContracts.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Ações rápidas */}
        <div>
          <p className="text-sm font-bold text-foreground mb-3" style={{ fontFamily: "'Sora','Space Grotesk',sans-serif" }}>Ações rápidas</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
            {[
              { Icon: MessageSquare, label: "WhatsApp",   sub: "Enviar mensagem", tint: "bg-emerald-500 text-white",   onClick: () => { const p = getPhone(); if (p) window.open(`https://wa.me/${p}`, "_blank"); }, disabled: !getPhone() },
              { Icon: Phone,         label: "Ligar",      sub: "Fazer ligação",   tint: "bg-sky-500 text-white",       onClick: () => { const p = client.phone; if (p) window.open(`tel:${p.replace(/\D/g, "")}`, "_self"); }, disabled: !client.phone },
              { Icon: Mail,          label: "E-mail",     sub: "Enviar e-mail",   tint: "bg-violet-500 text-white",    onClick: () => { if (client.email) window.open(`mailto:${client.email}`, "_blank"); }, disabled: !client.email },
              { Icon: Send,          label: "Portal",     sub: "Acessar portal",  tint: "bg-amber-500 text-white",     onClick: sendPortalLink },
              { Icon: Plus,          label: "Empréstimo", sub: "Novo empréstimo", tint: "bg-primary text-primary-foreground", onClick: () => setNewLoanMode(true) },
            ].map((a) => (
              <button
                key={a.label}
                onClick={a.onClick}
                disabled={a.disabled}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-border/60 bg-card/70 hover:bg-card hover:border-border hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none text-left"
              >
                <span className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${a.tint}`}>
                  <a.Icon size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-foreground leading-none">{a.label}</span>
                  <span className="block text-[10px] text-muted-foreground truncate mt-0.5">{a.sub}</span>
                </span>
              </button>
            ))}
            <ClientToolsPanel
              open={showMoreActions}
              onOpenChange={setShowMoreActions}
              groups={toolGroups}
              trigger={
                <button className="group flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-border/60 bg-card/70 hover:bg-card hover:border-border hover:-translate-y-0.5 transition-all text-left">
                  <span className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-slate-500 text-white">
                    <Wrench size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-foreground leading-none">Mais</span>
                    <span className="block text-[10px] text-muted-foreground truncate mt-0.5">Outras ações</span>
                  </span>
                </button>
              }
            />
            <button onClick={startEdit} className="group flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-border/60 bg-card/70 hover:bg-card hover:border-border hover:-translate-y-0.5 transition-all text-left" title="Editar dados">
              <span className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-rose-500 text-white">
                <Edit size={16} />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-foreground leading-none">Editar</span>
                <span className="block text-[10px] text-muted-foreground truncate mt-0.5">Editar cliente</span>
              </span>
            </button>
          </div>
        </div>

        {/* KPI strip com ícone circular */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Capital ativo",  value: `R$ ${fmt(kpis.totalCapital)}`, sub: `${kpis.activeContracts.length} contrato(s)`, Icon: Wallet,      chip: "bg-primary text-primary-foreground" },
            { label: "Recebido",       value: `R$ ${fmt(kpis.totalPaid)}`,    sub: `${kpis.ltvPct}% do total`,                    Icon: CheckCircle, chip: "bg-emerald-500 text-white" },
            { label: "Lucro",          value: `R$ ${fmt(kpis.totalProfit)}`,  sub: `Ticket médio: R$ ${fmt(kpis.ticketMedio)}`,   Icon: TrendingUp,  chip: "bg-amber-500 text-white" },
            { label: "Próx. vencimento", value: kpis.nextDueInst ? formatBR(kpis.nextDueInst.due_date) : "—", sub: kpis.nextDueInst ? `R$ ${fmt(Number(kpis.nextDueInst.amount))}` : "Sem pendências", Icon: Calendar, chip: kpis.overdueInst.length > 0 ? "bg-rose-500 text-white" : "bg-sky-500 text-white" },
          ].map(k => (
            <div key={k.label} className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm p-4 flex items-center gap-3 hover:-translate-y-0.5 hover:border-border transition-all">
              <span className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center shadow-md ${k.chip}`}>
                <k.Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground truncate">{k.label}</p>
                <p className="text-lg md:text-[22px] font-extrabold text-foreground leading-tight tracking-tight tabular-nums truncate"
                   style={{ fontFamily: "'Sora','Space Grotesk',sans-serif" }}>{k.value}</p>
                <p className="text-[11px] text-muted-foreground truncate">{k.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </header>



      {/* ===== MODALS ===== */}

      {editMode && (
        <EditClienteModal
          editData={editData}
          setEditData={setEditData}
          onClose={() => setEditMode(false)}
          onSave={saveEdit}
        />
      )}

      {editAddressMode && (
        <EditAddressModal
          addrData={addrData}
          setAddrData={setAddrData}
          onClose={() => setEditAddressMode(false)}
          onSave={saveAddress}
          onBuscarCep={buscarCep}
        />
      )}

      {newLoanMode && (
        <NovoEmprestimoModal
          clientName={client.name}
          loanMode={loanMode}
          setLoanMode={setLoanMode}
          loanGracePeriods={loanGracePeriods}
          setLoanGracePeriods={setLoanGracePeriods}
          loanCapital={loanCapital}
          setLoanCapital={setLoanCapital}
          loanInstallments={loanInstallments}
          setLoanInstallments={setLoanInstallments}
          loanInterestRate={loanInterestRate}
          setLoanInterestRate={setLoanInterestRate}
          loanFreq={loanFreq}
          setLoanFreq={setLoanFreq}
          loanStartDate={loanStartDate}
          setLoanStartDate={setLoanStartDate}
          loanStart={loanStart}
          setLoanStart={setLoanStart}
          loanDailyFee={loanDailyFee}
          setLoanDailyFee={setLoanDailyFee}
          loanLateFee={loanLateFee}
          setLoanLateFee={setLoanLateFee}
          loanNotes={loanNotes}
          setLoanNotes={setLoanNotes}
          loanGraceDays={loanGraceDays}
          setLoanGraceDays={setLoanGraceDays}
          loanPaymentMethod={loanPaymentMethod}
          setLoanPaymentMethod={setLoanPaymentMethod}
          loanEarlyDiscount={loanEarlyDiscount}
          setLoanEarlyDiscount={setLoanEarlyDiscount}
          loanMaxInterestCap={loanMaxInterestCap}
          setLoanMaxInterestCap={setLoanMaxInterestCap}
          loanValueMode={loanValueMode}
          setLoanValueMode={setLoanValueMode}
          loanInstallmentValue={loanInstallmentValue}
          setLoanInstallmentValue={setLoanInstallmentValue}
          loanDailyMode={loanDailyMode}
          setLoanDailyMode={setLoanDailyMode}
          loanFirstDueAuto={loanFirstDueAuto}
          setLoanFirstDueAuto={setLoanFirstDueAuto}
          loanCustomDates={loanCustomDates}
          setLoanCustomDates={setLoanCustomDates}
          loanCalc={loanCalc}
          loanLoading={loanLoading}
          onClose={() => setNewLoanMode(false)}
          onSubmit={handleCreateLoan}
        />
      )}

      {editContract && (
        <EditContratoModal
          form={editContractForm}
          setForm={setEditContractForm}
          regen={editContractRegen}
          setRegen={setEditContractRegen}
          saving={editContractSaving}
          onClose={() => setEditContract(null)}
          onSave={handleSaveContract}
        />
      )}

      {editInst && (
        <EditParcelaModal
          inst={editInst}
          form={editInstForm}
          setForm={setEditInstForm}
          saving={editInstSaving}
          onClose={() => setEditInst(null)}
          onSave={handleSaveInst}
        />
      )}

      {partialPayModal && (
        <PagamentoModal
          inst={partialPayModal}
          amount={partialAmount}
          setAmount={setPartialAmount}
          method={payMethod}
          setMethod={setPayMethod}
          receiptFile={payReceiptFile}
          setReceiptFile={setPayReceiptFile}
          uploading={payUploading}
          onClose={() => { setPartialPayModal(null); setPayReceiptFile(null); setPayMethod("pix"); }}
          onSubmit={handlePartialPay}
        />
      )}

      {renegotiating && (
        <RenegociarModal
          contract={renegotiating}
          installments={installments.filter((i: any) => i.contract_id === renegotiating.id)}
          clientName={client?.name || ""}
          onClose={() => setRenegotiating(null)}
          onConfirm={handleRenegotiate}
        />
      )}




      {/* ===== CONTENT ===== */}




      {/* Alertas críticos (atraso / pendências urgentes) — antes do Resumo */}
      {(kpis.overdueInst.length > 0 || kpis.pendingInst.length > 0) && (
        <div className="flex items-center gap-2 flex-wrap">
          {kpis.overdueInst.length > 0 && (
            <button onClick={sendAllOverdue} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-400/30 text-xs font-bold hover:bg-rose-500/20 hover:-translate-y-0.5 transition-all">
              <AlertTriangle size={14} /> {kpis.overdueInst.length} parcela(s) em atraso · Cobrar todas
            </button>
          )}
          {kpis.pendingInst.length > 0 && (
            <button onClick={payAllPending} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-400/30 text-xs font-bold hover:bg-emerald-500/20 hover:-translate-y-0.5 transition-all">
              <CheckCircle size={14} /> Quitar todas as pendentes
            </button>
          )}
        </div>
      )}

      {/* Section: Informações — Dados do cliente (logo abaixo da faixa/header) */}
      <section id="sec-resumo" className="scroll-mt-24 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Contato & Endereço (2/3) */}
          <section className="lg:col-span-2 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><User size={14} /></div>
                <h3 className="text-sm font-bold text-foreground">Contato & Endereço</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={startEdit} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/60 text-muted-foreground text-[11px] font-semibold hover:bg-accent hover:text-foreground transition-all">
                  <Edit size={12} /> Editar dados
                </button>
                <button onClick={startEditAddress} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/60 text-muted-foreground text-[11px] font-semibold hover:bg-accent hover:text-foreground transition-all">
                  <MapPin size={12} /> Endereço
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { Icon: Phone, label: "Telefone", value: client.phone, tint: "text-sky-400 bg-sky-500/10 ring-sky-400/20", onClick: () => { if (client.phone) window.open(`tel:${client.phone.replace(/\D/g, "")}`, "_self"); } },
                { Icon: MessageSquare, label: "WhatsApp", value: client.whatsapp || client.phone, tint: "text-emerald-400 bg-emerald-500/10 ring-emerald-400/20", onClick: () => { const p = getPhone(); if (p) window.open(`https://wa.me/${p}`, "_blank"); } },
                { Icon: Mail, label: "E-mail", value: client.email, tint: "text-amber-400 bg-amber-500/10 ring-amber-400/20", onClick: () => { if (client.email) window.open(`mailto:${client.email}`, "_blank"); } },
                { Icon: User, label: "CPF/CNPJ", value: client.cpf_cnpj, tint: "text-violet-400 bg-violet-500/10 ring-violet-400/20", onClick: startEdit },
                { Icon: MapPin, label: "Cidade", value: address?.city ? `${address.city}/${address.state}` : null, tint: "text-rose-400 bg-rose-500/10 ring-rose-400/20", onClick: startEditAddress },
                { Icon: Calendar, label: "Cliente desde", value: client.created_at ? formatBR(client.created_at) : null, tint: "text-primary bg-primary/10 ring-primary/20", onClick: () => {} },
              ].map(item => (
                <button key={item.label} onClick={item.value ? item.onClick : startEdit}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-background/30 hover:bg-accent/60 hover:border-border transition-all text-left">
                  <div className={`w-10 h-10 rounded-xl ring-1 flex items-center justify-center shrink-0 ${item.tint}`}>
                    <item.Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.14em] font-semibold">{item.label}</p>
                    <p className="text-sm text-foreground font-semibold truncate">{item.value || <span className="text-muted-foreground/60 italic font-normal">Adicionar</span>}</p>
                  </div>
                </button>
              ))}
            </div>
            {address?.street && (
              <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border/40 flex items-center gap-1.5">
                <MapPin size={12} className="text-primary shrink-0" />
                <span className="truncate">{address.street}{address.number ? `, ${address.number}` : ""}{address.neighborhood ? ` — ${address.neighborhood}` : ""} · {address.city}/{address.state}</span>
              </p>
            )}
          </section>

          {/* Estatísticas do cliente (1/3) */}
          <section className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Activity size={14} /></div>
              <h3 className="text-sm font-bold text-foreground">Estatísticas</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Contratos", value: String(contracts.length), Icon: FileText },
                { label: "Parcelas pagas", value: `${kpis.paidInst.length}/${kpis.paidInst.length + kpis.overdueInst.length + kpis.pendingInst.length}`, Icon: CheckCircle },
                { label: "Taxa de atraso", value: `${kpis.latePayRate}%`, Icon: AlertTriangle, tone: kpis.latePayRate > 30 ? "text-rose-400" : kpis.latePayRate > 10 ? "text-amber-300" : "text-emerald-400" },
                { label: "Ticket médio", value: `R$ ${fmt(kpis.ticketMedio)}`, Icon: DollarSign },
                { label: "Cliente há", value: `${daysAsClient}d`, Icon: Calendar },
                { label: "Em atraso", value: String(kpis.overdueInst.length), Icon: AlertTriangle, tone: kpis.overdueInst.length ? "text-rose-400" : "text-foreground" },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-border/60 bg-background/40 p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <s.Icon size={11} />
                    <span className="text-[9px] uppercase tracking-[0.14em] font-semibold truncate">{s.label}</span>
                  </div>
                  <p className={`text-sm font-bold tabular-nums truncate ${s.tone || "text-foreground"}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>


      {/* Barra sticky de navegação por seções */}

      <div className="sticky top-2 z-20 flex gap-1 glass-card rounded-2xl p-1.5 backdrop-blur-xl">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); document.getElementById(`sec-${tab.key}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === tab.key ? "bg-primary/15 text-primary ring-1 ring-primary/30 shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"}`}>
            <tab.Icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Section: Documentos & Anexos (expande apenas ao clicar na aba) */}
      <section id="sec-documentos" className="scroll-mt-24 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md p-5">
        <button
          onClick={() => setActiveTab(activeTab === "documentos" ? "contratos" : "documentos")}
          className="w-full flex items-center justify-between"
          aria-expanded={activeTab === "documentos"}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><FileIcon size={14} /></div>
            <h3 className="text-sm font-bold text-foreground">Documentos & Anexos</h3>
            {clientDocs.length > 0 && <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{clientDocs.length}</span>}
          </div>
          <ChevronRight size={16} className={`text-muted-foreground transition-transform ${activeTab === "documentos" ? "rotate-90" : ""}`} />
        </button>

        {activeTab === "documentos" && (
          <div className="mt-4 space-y-3">
            <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-[11px] font-semibold cursor-pointer hover:bg-primary/20 transition-all ${docUploading ? "opacity-60 pointer-events-none" : ""}`}>
              <UploadCloud size={12} /> {docUploading ? "Enviando..." : "Anexar arquivo"}
              <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDoc(f); e.currentTarget.value = ""; }} />
            </label>
            {clientDocs.length === 0 ? (
              <EmptyState compact icon={FileIcon} title="Nenhum documento anexado" description="RG, comprovante de renda, contrato assinado..." />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {clientDocs.map((d: any) => {
                  const isImg = /\.(png|jpe?g|gif|webp|heic)$/i.test(d.name);
                  return (
                    <div key={d.name} className="group relative flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-background/40 hover:border-primary/40 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isImg ? "bg-violet-500/10 text-violet-400" : "bg-sky-500/10 text-sky-400"}`}>
                        {isImg ? <ImageIcon size={14} /> : <FileIcon size={14} />}
                      </div>
                      <button onClick={() => signedUrl(d.name)} className="flex-1 min-w-0 text-left">
                        <p className="text-[11px] text-foreground font-semibold truncate">{d.name.replace(/^\d+-/, "")}</p>
                        <p className="text-[9px] text-muted-foreground">{d.metadata?.size ? `${Math.round(d.metadata.size / 1024)} KB` : ""}</p>
                      </button>
                      <button onClick={() => deleteDoc(d.name)} className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/10 text-destructive transition-opacity" title="Remover">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>




      {/* Section: Contratos */}
      <section id="sec-contratos" className="scroll-mt-24">{(


        <div className="space-y-3">
          <button onClick={() => navigate(`/clientes/novo?clientId=${id}`)} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors">
            <Plus size={16} /> Novo Empréstimo
          </button>
          {contracts.length === 0 ? (
            <EmptyState compact title="Nenhum contrato" description="Clique em Novo Empréstimo para começar." />
          ) : contracts.map((c: any) => {
            const cInsts = installments.filter((i: any) => i.contract_id === c.id);
            const total = cInsts.length;
            const paid = cInsts.filter((i: any) => i.status === "paid").length;
            const overdue = cInsts.filter((i: any) => i.status === "overdue").length;
            const isPaid = total > 0 && paid === total;
            const status = isPaid
              ? { label: "Quitado", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" }
              : overdue > 0
              ? { label: `${overdue} em atraso`, cls: "bg-destructive/15 text-destructive border-destructive/30" }
              : { label: `${paid}/${total} pagas`, cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
            const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
            const accent = isPaid ? "from-emerald-500/60 via-emerald-400/30" : overdue > 0 ? "from-destructive/60 via-destructive/30" : "from-primary/60 via-primary/20";
            const barColor = isPaid ? "bg-emerald-500" : overdue > 0 ? "bg-destructive" : "bg-primary";
            return (
            <div key={c.id} className="group relative overflow-hidden bg-gradient-to-br from-card to-card/60 border border-border/60 rounded-2xl p-4 hover:border-primary/40 hover:shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.3)] transition-all">
              <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${accent} to-transparent`} />
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/contratos/${c.id}`)}>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-lg font-bold text-foreground tracking-tight tabular-nums">R$ {fmt(Number(c.capital))}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${status.cls}`}>{status.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    <span className="text-foreground/80 font-medium">{c.num_installments}×</span> R$ {fmt(Number(c.installment_amount))}
                    <span className="mx-1.5 opacity-40">·</span>{FREQ[c.frequency] || c.frequency}
                  </p>
                </div>
                <div className="text-right cursor-pointer shrink-0" onClick={() => navigate(`/contratos/${c.id}`)}>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{formatBR(c.start_date)}</p>
                  <p className="text-sm font-bold text-primary tabular-nums mt-0.5">+R$ {fmt(Number(c.total_interest))}</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Lucro</p>
                </div>
                <div className="flex items-center gap-1 shrink-0 pl-2 border-l border-border/40 flex-wrap justify-end">
                  <button
                    onClick={(e) => { e.stopPropagation(); exportContractPDF(c); }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/40 hover:bg-accent text-muted-foreground hover:text-foreground text-[11px] font-medium transition-colors"
                    title="Exportar contrato em PDF"
                  >
                    <Download size={13} /> PDF
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); sendContractWhatsApp(c); }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[11px] font-medium transition-colors"
                    title="Enviar contrato por WhatsApp"
                  >
                    <MessageSquare size={13} /> Enviar
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditContract(c); }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/40 hover:bg-accent text-muted-foreground hover:text-foreground text-[11px] font-medium transition-colors"
                    title="Editar empréstimo"
                  >
                    <Edit size={13} /> Editar
                  </button>
                  {c.status === "active" && !isPaid && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setRenegotiating(c); }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[11px] font-medium transition-colors"
                      title="Renegociar contrato"
                    >
                      <Repeat size={13} /> Renegociar
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteContract(c.id); }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-[11px] font-medium transition-colors"
                    title="Excluir empréstimo"
                  >
                    <Trash2 size={13} /> Excluir
                  </button>
                </div>
              </div>
              {total > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
                    <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground tabular-nums shrink-0">{pct}%</span>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}</section>


      {/* Section: Parcelas */}

      <section id="sec-parcelas" className="scroll-mt-24">{(

        <div className="space-y-6">
          {installments.length === 0 ? (
            <EmptyState icon={Receipt} title="Nenhuma parcela" description="As parcelas aparecerão aqui quando o contrato for criado." compact />
          ) : Object.entries(groupedInstallments).map(([cid, insts], gIdx) => {
            const contract = contracts.find((c: any) => c.id === cid);
            return (
              <div key={cid} className="rounded-2xl border border-border/60 bg-card/40 p-3 space-y-2">
                <div className="flex items-center justify-between px-1 mb-1 gap-2">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 min-w-0">
                    <FileText size={12} className="text-primary shrink-0" />
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono text-[10px]" title={`Contrato ${cid}`}>
                      Contrato {gIdx + 1} · #{String(cid).slice(0, 6)}
                    </span>
                    {contract && (
                      <span className="truncate text-muted-foreground normal-case font-medium">
                        R$ {fmt(Number(contract.capital))} · {formatBR(contract.start_date)}
                      </span>
                    )}
                  </h3>
                  <Badge variant="outline" className="text-[10px] py-0 h-5 shrink-0">
                    {insts.filter((i: any) => i.status === "paid").length}/{insts.length} pagas
                  </Badge>
                </div>
                <div className="space-y-2">
                  {insts.map((inst: any) => {
                    const isOverdue = inst.status === "overdue";
                    const isPaid = inst.status === "paid";
                    const partial = !isPaid && Number(inst.paid_amount || 0) > 0;
                    const contractFull = contracts.find((c: any) => c.id === inst.contract_id);
                    const lateFeePct = Number(contractFull?.late_fee_percent || 0);
                    const dailyPct = Number(contractFull?.daily_interest_percent || 0);
                    const base = Number(inst.amount || 0);
                    const dueMs = new Date(inst.due_date).getTime();
                    const daysOverdue = isOverdue ? Math.max(0, Math.floor((Date.now() - dueMs) / 86400000)) : 0;
                    const multaVal = isOverdue ? base * (lateFeePct / 100) : 0;
                    const jurosVal = isOverdue ? base * (dailyPct / 100) * daysOverdue : 0;
                    const feeLive = computeLateFee({
                      amount: base,
                      due_date: inst.due_date,
                      status: inst.status,
                      late_fee: inst.late_fee,
                      late_fee_percent: lateFeePct,
                      daily_interest_percent: dailyPct,
                    });
                    const totalDue = base + feeLive;
                    return (
                      <div key={inst.id} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors ${isOverdue ? "bg-destructive/5 border-destructive/15" : isPaid ? "bg-success/5 border-success/15" : "bg-card border-border"}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${isOverdue ? "bg-destructive/10 text-destructive" : isPaid ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                          {inst.installment_number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground flex items-center gap-2 flex-wrap">
                            R$ {fmt(base)}
                            {isOverdue && feeLive > 0 && (
                              <>
                                <span className="text-[10px] font-semibold text-destructive">
                                  + R$ {fmt(feeLive)} multa/juros
                                </span>
                                <span className="text-[10px] font-bold text-destructive">
                                  = R$ {fmt(totalDue)}
                                </span>
                              </>
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatBR(inst.due_date)}
                            {isOverdue && ` · ${daysOverdue} dia(s) em atraso`}
                            {inst.paid_at && ` · Pago: ${formatBR(inst.paid_at)}`}
                            {partial && ` · Parcial: R$ ${fmt(Number(inst.paid_amount))}`}
                            {inst.payment_method && ` · ${String(inst.payment_method).toUpperCase()}`}
                          </p>
                          {inst.receipt_url && (
                            <a href={inst.receipt_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline inline-flex items-center gap-1 mt-0.5">
                              <Receipt size={10} /> Ver comprovante
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isOverdue && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
                                  title="Ver cálculo da multa e juros" aria-label="Ver cálculo da multa e juros"
                                >
                                  <Info size={14} />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent align="end" className="w-80 p-0 overflow-hidden">
                                <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3">
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-destructive">
                                    Cálculo de atraso · Parcela #{inst.installment_number}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Vencimento {formatBR(inst.due_date)} · {daysOverdue} dia(s) atrás
                                  </p>
                                </div>
                                <div className="p-4 space-y-3 text-xs">
                                  <div className="flex items-center justify-between text-muted-foreground">
                                    <span>Valor da parcela</span>
                                    <span className="font-mono font-semibold text-foreground">R$ {fmt(base)}</span>
                                  </div>

                                  <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-foreground">Multa (aplicada 1x)</p>
                                    {lateFeePct > 0 ? (
                                      <>
                                        <p className="font-mono text-[11px] text-muted-foreground">
                                          R$ {fmt(base)} × {lateFeePct.toLocaleString("pt-BR")}% = <span className="text-destructive font-bold">R$ {fmt(multaVal)}</span>
                                        </p>
                                      </>
                                    ) : (
                                      <p className="text-[11px] text-muted-foreground italic">Sem multa configurada no contrato</p>
                                    )}
                                  </div>

                                  <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-foreground">Juros diários acumulados</p>
                                    {dailyPct > 0 ? (
                                      <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
                                        R$ {fmt(base)} × {dailyPct.toLocaleString("pt-BR")}% × {daysOverdue} dia(s) =<br />
                                        <span className="text-destructive font-bold">R$ {fmt(jurosVal)}</span>
                                      </p>
                                    ) : (
                                      <p className="text-[11px] text-muted-foreground italic">Sem juros diários configurados no contrato</p>
                                    )}
                                  </div>

                                  <div className="border-t border-border pt-3 space-y-1.5">
                                    <div className="flex items-center justify-between text-muted-foreground">
                                      <span>Multa + Juros</span>
                                      <span className="font-mono font-semibold text-destructive">R$ {fmt(feeLive)}</span>
                                    </div>
                                    {Number(inst.late_fee || 0) > 0 && Math.abs(Number(inst.late_fee) - feeLive) > 0.01 && (
                                      <p className="text-[10px] text-muted-foreground italic">
                                        Valor persistido pelo sistema: R$ {fmt(Number(inst.late_fee))}
                                      </p>
                                    )}
                                    <div className="flex items-center justify-between pt-1">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Total a pagar</span>
                                      <span className="font-mono text-sm font-bold text-destructive">R$ {fmt(totalDue)}</span>
                                    </div>
                                  </div>

                                  {(lateFeePct <= 0 && dailyPct <= 0) && (
                                    <div className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2">
                                      <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
                                      <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-snug">
                                        Este contrato não tem multa/juros configurados. Configure em "Editar contrato" para aplicar automaticamente.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                          <button onClick={() => openEditInst(inst)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground" title="Editar valor/vencimento"><Edit size={14} /></button>
                          {isPaid ? (
                            <button onClick={() => reversePayment(inst.id)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground" title="Estornar"><RotateCcw size={14} /></button>
                          ) : (
                            <>
                              <button onClick={() => sendBilling(inst)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground" title="Cobrar"><Send size={14} /></button>
                              <button onClick={() => { setPartialPayModal(inst); setPartialAmount(""); setPayMethod("pix"); setPayReceiptFile(null); }} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground" title="Parcial"><Percent size={14} /></button>
                              <button onClick={() => { setPartialPayModal(inst); setPartialAmount(String(inst.amount)); setPayMethod("pix"); setPayReceiptFile(null); }} className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-success/10 text-success hover:bg-success/20 transition-colors">Pagar</button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}</section>

      {/* Section: Histórico (timeline unificada) */}
      <section id="sec-historico" className="scroll-mt-24">{(() => {
        const events: any[] = [];
        // Contratos criados
        contracts.forEach((c: any) => events.push({
          id: `c-${c.id}`, date: c.created_at, type: "contract",
          title: `Contrato criado · R$ ${fmt(Number(c.capital))}`,
          subtitle: `${c.num_installments}x · ${FREQ[c.frequency] || c.frequency}`,
          icon: FileText, color: "text-primary", bg: "bg-primary/10",
        }));
        // Pagamentos (parcelas pagas)
        installments.filter((i: any) => i.status === "paid" && i.paid_at).forEach((i: any) => events.push({
          id: `i-${i.id}`, date: i.paid_at, type: "payment",
          title: `Parcela #${i.installment_number} paga`,
          subtitle: `R$ ${fmt(Number(i.paid_amount || i.amount))}`,
          icon: CheckCircle, color: "text-success", bg: "bg-success/10",
        }));
        // Lucros
        profits.forEach((p: any) => events.push({
          id: `p-${p.id}`, date: p.date, type: "profit",
          title: p.description, subtitle: `+ R$ ${fmt(Number(p.amount))}`,
          icon: TrendingUp, color: "text-success", bg: "bg-success/10",
        }));
        // Transações genéricas restantes (incluindo notas e contatos)
        transactions.filter((t: any) => t.type !== "payment").forEach((t: any) => {
          const isNote = t.type === "note";
          const isContact = t.type === "contact";
          events.push({
            id: `t-${t.id}`, date: t.date, type: t.type,
            title: t.description,
            subtitle: isNote || isContact ? "" : `R$ ${fmt(Number(t.amount))}`,
            icon: isNote ? StickyNote : isContact ? PhoneCall : DollarSign,
            color: isNote ? "text-warning" : isContact ? "text-primary" : "text-muted-foreground",
            bg: isNote ? "bg-warning/10" : isContact ? "bg-primary/10" : "bg-muted",
          });
        });
        const sorted = events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const filters = [
          { key: "all", label: "Tudo", count: sorted.length },
          { key: "contract", label: "Contratos", count: sorted.filter(e => e.type === "contract").length },
          { key: "payment", label: "Pagamentos", count: sorted.filter(e => e.type === "payment").length },
          { key: "profit", label: "Lucros", count: sorted.filter(e => e.type === "profit").length },
          { key: "note", label: "Notas", count: sorted.filter(e => e.type === "note").length },
          { key: "contact", label: "Contatos", count: sorted.filter(e => e.type === "contact").length },
        ] as const;
        const filtered = historyFilter === "all" ? sorted : sorted.filter(e => e.type === historyFilter);
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {filters.map(f => (
                <button key={f.key} onClick={() => setHistoryFilter(f.key as any)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${historyFilter === f.key ? "bg-primary/15 text-primary border-primary/40" : "bg-card/40 text-muted-foreground border-border/40 hover:text-foreground hover:border-border"}`}>
                  {f.label} <span className="opacity-60 ml-1">{f.count}</span>
                </button>
              ))}
            </div>
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">Nenhum evento nesta categoria</p>
            ) : (
              <div className="relative pl-6 space-y-3">
                <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
                {filtered.map(ev => (
                  <div key={ev.id} className="relative">
                    <div className={`absolute -left-[18px] top-3 w-3 h-3 rounded-full ${ev.bg} border-2 border-background`} />
                    <div className="bg-card border border-border rounded-2xl p-3 flex items-start gap-3 hover:border-primary/30 transition-colors">
                      <div className={`w-8 h-8 rounded-lg ${ev.bg} flex items-center justify-center shrink-0`}>
                        <ev.icon size={14} className={ev.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatBR(ev.date)} · {new Date(ev.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <p className={`text-sm font-bold ${ev.color} shrink-0`}>{ev.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}</section>
    </div>
  );
};

export default ClienteDetalhe;
