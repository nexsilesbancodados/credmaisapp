// SDR (Sales Development Representative) — Agente completo de qualificação
// de leads via WhatsApp. Combina uma máquina de estados determinística
// (para não perder contexto entre mensagens) com uma camada de IA opcional
// para dar naturalidade e entender pedidos fora do script.
//
// Fluxo:
//   new         -> saudação + pergunta o nome
//   qualifying  -> coleta valor -> finalidade -> renda -> CPF -> email
//   simulated   -> envia simulação da parcela e pergunta se aprova
//   handoff     -> avisa humano; needs_human = true
//   lost        -> lead pediu para parar / desqualificou
//
// A tabela `leads` guarda o estado por (user_id, phone).

import { callAnthropic } from "./anthropic.ts";

export interface Lead {
  id?: string;
  user_id: string;
  phone: string;
  name?: string | null;
  cpf?: string | null;
  email?: string | null;
  amount_requested?: number | null;
  income_monthly?: number | null;
  purpose?: string | null;
  term_months?: number | null;
  stage: LeadStage;
  score: number;
  tags: string[];
  notes: Record<string, any>;
  ai_summary?: string | null;
  last_message_at?: string | null;
  next_followup_at?: string | null;
}

export type LeadStage =
  | "new"
  | "qualifying"
  | "simulated"
  | "handoff"
  | "won"
  | "lost";

/* ─────────────── Parsers determinísticos ─────────────── */

export function parseCPF(text: string): string | null {
  const digits = (text.match(/\d/g) || []).join("");
  const m = digits.match(/(\d{11})/);
  if (!m) return null;
  // valida dígito verificador
  const cpf = m[1];
  if (/^(\d)\1{10}$/.test(cpf)) return null;
  const calc = (base: string, factor: number) => {
    let s = 0;
    for (let i = 0; i < base.length; i++) s += Number(base[i]) * (factor - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = calc(cpf.slice(0, 9), 10);
  const d2 = calc(cpf.slice(0, 10), 11);
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]) ? cpf : null;
}

export function parseEmail(text: string): string | null {
  const m = (text || "").match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m ? m[0].toLowerCase() : null;
}

/**
 * Extrai valor em reais. Aceita "5000", "5 mil", "5.000,00", "R$ 3k", "10k".
 */
export function parseMoney(text: string): number | null {
  if (!text) return null;
  const t = text.toLowerCase().replace(/r\$\s*/g, "");
  // "5 mil", "10 mil reais"
  const mil = t.match(/(\d+[.,]?\d*)\s*mil/);
  if (mil) return Math.round(parseFloat(mil[1].replace(",", ".")) * 1000);
  // "5k", "10k"
  const k = t.match(/(\d+[.,]?\d*)\s*k\b/);
  if (k) return Math.round(parseFloat(k[1].replace(",", ".")) * 1000);
  // valores como 5.000,00 / 5000 / 5000,50
  const br = t.match(/(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)/);
  if (br) {
    const raw = br[1].replace(/\./g, "").replace(",", ".");
    const n = parseFloat(raw);
    if (!isNaN(n) && n >= 50) return Math.round(n * 100) / 100;
  }
  // dígitos puros
  const num = t.match(/\b(\d{3,7})\b/);
  if (num) return Number(num[1]);
  return null;
}

export function parseName(text: string, pushName?: string): string | null {
  const t = (text || "").trim();
  const m1 = t.match(/(?:meu nome (?:é|eh)|me chamo|sou (?:o|a)?|aqui (?:é|eh) (?:o|a)?)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]{2,60})/i);
  if (m1) return capitalizeName(m1[1].trim());
  // Se a mensagem é curta e parece só um nome (2+ palavras alfabéticas)
  if (t.length <= 60 && /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]{2,60}$/.test(t) && t.split(/\s+/).length >= 2) {
    return capitalizeName(t);
  }
  if (pushName && /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]{2,60}$/.test(pushName)) {
    return capitalizeName(pushName);
  }
  return null;
}

function capitalizeName(n: string) {
  return n
    .toLowerCase()
    .split(/\s+/)
    .map(w => (w.length <= 2 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

const PURPOSE_KEYWORDS: Array<[RegExp, string]> = [
  [/quita(r|ção)|paga(r|mento)\s*(de\s*)?d[ií]vida|nome\s*(sujo|limpo)|serasa|spc/i, "Quitar dívidas"],
  [/reforma|obra|constru|casa|im[oó]vel/i, "Reforma / imóvel"],
  [/carro|moto|ve[ií]culo|autom[oó]vel/i, "Veículo"],
  [/neg[oó]cio|empresa|com[eé]rcio|capital de giro|estoque|mercadoria/i, "Capital de giro"],
  [/emerg[eê]ncia|urg[eê]ncia|hospital|sa[uú]de|rem[eé]dio/i, "Emergência / saúde"],
  [/estudo|faculdade|curso|escola/i, "Educação"],
  [/viagem|f[eé]rias/i, "Viagem"],
];

export function parsePurpose(text: string): string | null {
  for (const [rx, label] of PURPOSE_KEYWORDS) if (rx.test(text)) return label;
  const t = (text || "").trim();
  if (t.length >= 4 && t.length <= 120 && /[a-zà-ÿ]/i.test(t)) return t;
  return null;
}

/* ─────────────── Cálculo de score ─────────────── */

export function scoreLead(l: Partial<Lead>, settings: any): number {
  let s = 0;
  if (l.name) s += 15;
  if (l.cpf) s += 20;
  if (l.email) s += 5;
  if (l.amount_requested) s += 15;
  if (l.purpose) s += 10;
  if (l.income_monthly) {
    s += 15;
    // Renda coerente com o valor pedido (3x renda mensal é confortável)
    if (l.amount_requested && l.income_monthly >= l.amount_requested / 6) s += 10;
  }
  const min = Number(settings?.min_loan_amount || 100);
  const max = Number(settings?.max_loan_amount || 100000);
  if (l.amount_requested && l.amount_requested >= min && l.amount_requested <= max) s += 10;
  return Math.min(100, s);
}

/* ─────────────── Simulação ─────────────── */

export function simulate(amount: number, term: number, monthlyRatePct: number) {
  const n = Math.max(1, Math.min(60, Math.round(term || 6)));
  const total = amount * (1 + (monthlyRatePct / 100) * n);
  const parcela = total / n;
  return {
    total: Math.round(total * 100) / 100,
    parcela: Math.round(parcela * 100) / 100,
    n,
  };
}

const money = (v: number) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`;

/* ─────────────── Máquina de estados ─────────────── */

export interface SdrContext {
  lead: Partial<Lead>;
  incomingText: string;
  pushName?: string | null;
  settings: any;
  profile: any;
  companyName: string;
  history?: Array<{ role: "user" | "bot"; text: string }>;
}

export interface SdrDecision {
  reply: string;
  updates: Partial<Lead>;
  stage: LeadStage;
  needsHuman: boolean;
  handoffReason?: string;
  intent: string;
}

export function decide(ctx: SdrContext): SdrDecision {
  const text = (ctx.incomingText || "").trim();
  const low = text.toLowerCase();
  const lead = ctx.lead || {};
  const updates: Partial<Lead> = {};

  // stop / desqualifica
  if (/(parar|para de|cancela|remove|não\s*quero|nao\s*quero)/i.test(low) && /(mensagem|contato|falar|voc[eê])/i.test(low)) {
    return {
      reply: "Sem problema! Não vou mais te enviar mensagens por aqui. Se mudar de ideia é só chamar. 👋",
      updates: { stage: "lost", tags: mergeTags(lead.tags, ["optout"]) },
      stage: "lost",
      needsHuman: false,
      intent: "optout",
    };
  }

  // pede humano
  if (/(atendente|humano|pessoa|falar com (algu[eé]m|o dono|gerente|respons[aá]vel))/i.test(low)) {
    return {
      reply: `Claro! Já estou chamando um consultor da *${ctx.companyName}* pra continuar com você por aqui. 🙋‍♂️`,
      updates: { stage: "handoff", tags: mergeTags(lead.tags, ["pediu_humano"]) },
      stage: "handoff",
      needsHuman: true,
      handoffReason: "Lead pediu atendimento humano",
      intent: "handoff",
    };
  }

  // Extrai o que veio na mensagem, sem depender do estado
  const nameFound = !lead.name ? parseName(text, ctx.pushName || undefined) : null;
  if (nameFound) updates.name = nameFound;

  const cpfFound = parseCPF(text);
  if (cpfFound && !lead.cpf) updates.cpf = cpfFound;

  const emailFound = parseEmail(text);
  if (emailFound && !lead.email) updates.email = emailFound;

  // Valor / renda / finalidade — heurística contextual
  const money1 = parseMoney(text);
  if (money1) {
    if (!lead.amount_requested && /(quero|preciso|pegar|empr[eé]stimo|valor|r\$|mil|k)/i.test(low)) {
      updates.amount_requested = money1;
    } else if (!lead.income_monthly && /(ganho|renda|sal[aá]rio|recebo|fatur)/i.test(low)) {
      updates.income_monthly = money1;
    } else if (!lead.amount_requested) {
      updates.amount_requested = money1;
    } else if (!lead.income_monthly && money1 !== lead.amount_requested) {
      updates.income_monthly = money1;
    }
  }

  const purposeFound = !lead.purpose ? parsePurpose(text) : null;
  if (purposeFound && purposeFound !== lead.name) updates.purpose = purposeFound;

  const merged: Partial<Lead> = { ...lead, ...updates };

  // Decide próxima pergunta com base no que ainda falta
  const empresa = ctx.companyName;
  const firstName = (merged.name || "").split(/\s+/)[0] || "";
  const oi = firstName ? `${firstName}, ` : "";

  // NEW → primeiro contato
  if (!lead.name && !merged.name) {
    return {
      reply: `Oi! 👋 Aqui é da *${empresa}*, atendimento de empréstimos. Antes de simular pra você, me diz seu *nome completo*, por favor. 😊`,
      updates: { ...updates, stage: "qualifying" },
      stage: "qualifying",
      needsHuman: false,
      intent: "ask_name",
    };
  }

  if (!merged.amount_requested) {
    return {
      reply: `Prazer, ${firstName}! 🤝\nQuanto você está precisando pegar emprestado? Pode mandar o valor aproximado (ex.: *R$ 3.000*, *5 mil*).`,
      updates: { ...updates, stage: "qualifying" },
      stage: "qualifying",
      needsHuman: false,
      intent: "ask_amount",
    };
  }

  const min = Number(ctx.settings?.min_loan_amount || 100);
  const max = Number(ctx.settings?.max_loan_amount || 100000);
  if (merged.amount_requested < min || merged.amount_requested > max) {
    return {
      reply: `${oi}o valor solicitado (*${money(merged.amount_requested)}*) está fora da nossa faixa hoje (${money(min)} a ${money(max)}). Consegue ajustar o valor ou prefere que um consultor te chame?`,
      updates: { ...updates, tags: mergeTags(merged.tags, ["fora_faixa"]) },
      stage: "qualifying",
      needsHuman: false,
      intent: "amount_out_of_range",
    };
  }

  if (!merged.purpose) {
    return {
      reply: `Show! Anotei *${money(merged.amount_requested)}*.\nPra qual finalidade é o empréstimo? (ex.: quitar dívida, reforma, capital de giro, emergência)`,
      updates: { ...updates, stage: "qualifying" },
      stage: "qualifying",
      needsHuman: false,
      intent: "ask_purpose",
    };
  }

  if (!merged.income_monthly) {
    return {
      reply: `Anotado: *${merged.purpose}*. 👍\nQual é sua *renda mensal* aproximada? Isso me ajuda a montar a melhor condição pra você.`,
      updates: { ...updates, stage: "qualifying" },
      stage: "qualifying",
      needsHuman: false,
      intent: "ask_income",
    };
  }

  if (!merged.cpf) {
    return {
      reply: `Perfeito. Pra deixar sua proposta pronta, me passa seu *CPF* (só números). 🔒 Uso apenas pra análise interna.`,
      updates: { ...updates, stage: "qualifying" },
      stage: "qualifying",
      needsHuman: false,
      intent: "ask_cpf",
    };
  }

  // Simulação
  const rate = Number(ctx.settings?.default_interest_rate || ctx.profile?.default_interest_rate || 15);
  const term = merged.term_months || Number(ctx.settings?.default_term_months || 6);
  const sim = simulate(merged.amount_requested, term, rate);

  const proposalTag = mergeTags(merged.tags, ["simulado"]);
  const score = scoreLead(merged, ctx.settings);

  return {
    reply:
      `Aqui está sua simulação, ${firstName}: ✨\n\n` +
      `• Valor: *${money(merged.amount_requested)}*\n` +
      `• Parcelas: *${sim.n}x de ${money(sim.parcela)}*\n` +
      `• Total: *${money(sim.total)}*\n` +
      `• Finalidade: ${merged.purpose}\n\n` +
      `O que prefere fazer agora?\n` +
      `1️⃣ *OK* — aprovo e quero fechar\n` +
      `2️⃣ *Mudar prazo* (ex.: "quero em 10x" ou "em 12 parcelas")\n` +
      `3️⃣ *Mudar valor* (ex.: "quero R$ 4.000")\n` +
      `4️⃣ *Falar com atendente*`,
    updates: {
      ...updates,
      stage: "simulated",
      score,
      tags: proposalTag,
      notes: {
        ...(merged.notes || {}),
        last_simulation: { parcela: sim.parcela, n: sim.n, total: sim.total, rate, at: new Date().toISOString() },
      },
    },
    stage: "simulated",
    needsHuman: false,
    intent: "simulation",
  };
}

/**
 * Após a simulação, detecta aceite / recusa / alteração.
 */
export function handleSimulatedReply(ctx: SdrContext): SdrDecision {
  const t = (ctx.incomingText || "").toLowerCase();
  const lead = ctx.lead;
  const empresa = ctx.companyName;
  const firstName = (lead.name || "").split(/\s+/)[0] || "";

  if (/(ok|aprovo|fechado|topo|aceito|pode fechar|bora|quero sim|sim, quero|beleza)/i.test(t)) {
    return {
      reply: `Fechou, ${firstName}! 🎉 Já estou chamando um consultor da *${empresa}* pra finalizar seu contrato. Fica por aqui!`,
      updates: { stage: "handoff", tags: mergeTags(lead.tags, ["aceite_simulacao"]), score: 95 },
      stage: "handoff",
      needsHuman: true,
      handoffReason: "Lead aceitou a simulação",
      intent: "accept",
    };
  }

  if (/(n[aã]o|nao quero|caro|muito|abusivo|desisti|deixa pra l[aá])/i.test(t)) {
    return {
      reply: `Sem stress, ${firstName}. Consegue me dizer o que ficou fora do combinado? Posso simular outro valor ou prazo pra ver se encaixa melhor. 🤔`,
      updates: { tags: mergeTags(lead.tags, ["objecao"]) },
      stage: "simulated",
      needsHuman: false,
      intent: "objection",
    };
  }

  // Novo prazo? (ex.: "em 10x", "12 parcelas", "quero em 8 vezes")
  const termMatch = t.match(/(\d{1,2})\s*(x|parcelas?|vezes|meses|m[eê]s)/);
  if (termMatch) {
    const newTerm = Math.max(1, Math.min(60, parseInt(termMatch[1], 10)));
    return decide({
      ...ctx,
      lead: { ...lead, term_months: newTerm, stage: "qualifying", notes: lead.notes || {} },
    });
  }

  // Novo valor?
  const newAmount = parseMoney(ctx.incomingText);
  if (newAmount) {
    return decide({
      ...ctx,
      lead: { ...lead, amount_requested: newAmount, stage: "qualifying", notes: lead.notes || {} },
    });
  }

  return {
    reply: `${firstName ? firstName + ", " : ""}me diz o que prefere: responder *ok* pra fechar, mudar *prazo* (ex.: "em 10x"), mudar *valor* (ex.: "R$ 4.000") ou *falar com atendente*. 🙂`,
    updates: {},
    stage: "simulated",
    needsHuman: false,
    intent: "await_answer",
  };
}

function mergeTags(existing: string[] | undefined, add: string[]): string[] {
  const set = new Set([...(existing || []), ...add]);
  return Array.from(set);
}

/**
 * Camada de IA opcional — reformula a resposta com mais naturalidade,
 * mantendo o mesmo conteúdo. Usa Anthropic se disponível; senão devolve
 * a resposta determinística intacta.
 */
export async function polishWithAI(
  base: string,
  ctx: SdrContext,
  history: Array<{ role: "user" | "bot"; text: string }>,
): Promise<string> {
  try {
    if (!Deno.env.get("ANTHROPIC_API_KEY")) return base;
    const system =
      `Você é um SDR (pré-vendas) da empresa ${ctx.companyName}, especializada em empréstimos pessoais. ` +
      `Reescreva a resposta abaixo mantendo TODAS as informações, valores e perguntas, ` +
      `com tom humano, brasileiro, cordial e curto (máx 4 linhas + emojis moderados). ` +
      `Não invente valores, não prometa aprovação, não peça dados diferentes dos que já estão na resposta. ` +
      `Se houver histórico, personalize levemente sem repetir cumprimentos já feitos.`;
    const hist = (history || []).slice(-6).map(h => `${h.role === "bot" ? "Assistente" : "Cliente"}: ${h.text}`).join("\n");
    const user =
      `Histórico:\n${hist}\n\n` +
      `Resposta base (reescreva mantendo o conteúdo):\n"""${base}"""`;
    const out = await callAnthropic({
      system,
      messages: [{ role: "user", content: user }],
      maxTokens: 400,
      temperature: 0.6,
    });
    const cleaned = (out || "").trim().replace(/^"+|"+$/g, "");
    return cleaned.length > 10 ? cleaned : base;
  } catch (_) {
    return base;
  }
}
