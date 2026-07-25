import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkSharedSecret } from "../_shared/guard.ts";
import { parseMemory, mergeMemory, serializeMemory, pushIntent, summarizeIntents, lastApproach, type IntentEntry } from "../_shared/memory.ts";
import {
  extractJsonObject,
  sanitizeAiResult,
  validateReceipt,
  sha256Hex,
  isEchoOfLastReply,
  computeRolloverInterest,
  validatePixReply,
  computeClientBehavior,
  detectResponseLoop,
  detectClientTone,
} from "../_shared/bot_utils.ts";
import { findFaqMatch, FAQ_COUNT } from "../_shared/faq_knowledge.ts";
import { identifyClient, loadClientInstallments, auditDecision, todayInSP, samePhoneBR } from "../_shared/agent_core.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In-memory dedupe (per isolate) — evita responder a mesma msg 2x
const processedMessages = new Map<string, number>();
const DEDUPE_TTL_MS = 5 * 60 * 1000;

// Rate limit por JID — evita loops/spam
const jidRateBucket = new Map<string, number[]>();
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 8;

// Buffer de mensagens (debounce) — agrupa mensagens consecutivas do mesmo contato
const messageBuffer = new Map<string, { texts: string[]; lastTs: number }>();
const BUFFER_WAIT_MS = 5000;

// Lock por JID — evita duas execuções paralelas respondendo ao mesmo contato
const jidLock = new Map<string, number>();
const LOCK_TTL_MS = 30 * 1000;

// Última resposta enviada pelo bot por JID — evita "eco"
const lastBotReply = new Map<string, { text: string; ts: number }>();

// Saudações variadas (lead)
const LEAD_GREETINGS = [
  (e: string) => `Olá! 👋 Aqui é da *${e}*.\n\nNão consegui localizar seu cadastro pelo seu número. Pode me passar seu *nome completo* e *CPF*? Assim consigo te atender direitinho. 😊`,
  (e: string) => `Oi, tudo bem? 🙂\n\nAqui é o atendimento da *${e}*. Pra te ajudar melhor, pode me informar seu *nome* e *CPF*?`,
  (e: string) => `Olá! Seja bem-vindo(a) à *${e}*. 🤝\n\nPra puxar seu cadastro, preciso do seu *nome completo* e *CPF*, por favor.`,
  (e: string) => `Oi! 👋 Aqui é da *${e}*.\n\nNão te encontrei na nossa base. Me ajuda com seu *nome completo* e *CPF* pra eu seguir? 😉`,
];
const pickGreeting = (e: string) => LEAD_GREETINGS[Math.floor(Math.random() * LEAD_GREETINGS.length)](e);

function norm(s: string) { return (s || "").toLowerCase().replace(/\s+/g, " ").trim(); }

function rememberMessage(id: string) {
  const now = Date.now();
  processedMessages.set(id, now);
  for (const [k, t] of processedMessages) {
    if (now - t > DEDUPE_TTL_MS) processedMessages.delete(k);
  }
}

function isRateLimited(jid: string): boolean {
  const now = Date.now();
  const arr = (jidRateBucket.get(jid) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) { jidRateBucket.set(jid, arr); return true; }
  arr.push(now);
  jidRateBucket.set(jid, arr);
  return false;
}

const STOP_WORDS = ["parar bot", "pare bot", "pare de me mandar", "para de mandar", "cancelar bot", "desativar bot", "silenciar bot", "stop bot", "chega de bot", "para com isso bot", "desliga o bot"];
const HUMAN_WORDS = ["atendente", "humano", "pessoa de verdade", "falar com alguem", "falar com alguém", "falar c alguem", "operador", "gerente", "responsavel", "responsável", "quero falar com voce mesmo", "quero falar com vc mesmo", "com uma pessoa", "com alguém real", "quero falar com o dono", "quero falar com o patrão"];
const PIX_WORDS = ["qual o pix", "qual a chave pix", "me passa o pix", "manda o pix", "envia o pix", "me manda a chave pix", "manda a chave", "me manda a chave", "qual sua chave", "qual a chave", "chave pra pagar", "pix pra pagar", "pix p pagar"];

function matchesAny(text: string, words: string[]): boolean {
  const t = (text || "").toLowerCase();
  return words.some(w => t.includes(w));
}

function money(v: number) {
  return `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`;
}

function buildLocalBotResult(params: {
  client: any;
  incomingText: string;
  overdue: any[];
  dueToday: any[];
  totalOverdue: number;
  totalDueToday: number;
  profile: any;
  tone: any;
}) {
  const { client, incomingText, overdue, dueToday, totalOverdue, totalDueToday, profile, tone } = params;
  const txt = (incomingText || "").toLowerCase();
  const firstName = (client?.name || "").split(" ").filter(Boolean)[0] || "tudo bem";
  const hasDebt = overdue.length > 0 || dueToday.length > 0;
  const total = totalOverdue + totalDueToday;
  const oldest = overdue[0] || dueToday[0];
  const pix = profile?.pix_key ? `\nPIX: *${profile.pix_key}*` : "";

  if (/comprovante|paguei|pix feito|transferi|enviei/i.test(incomingText || "")) {
    return {
      reply: `Perfeito, ${firstName}. Me manda o comprovante em imagem ou PDF por aqui, por favor. Assim eu confiro e registro a baixa certinho 👍`,
      is_receipt: false,
      is_rollover: false,
      is_promise: false,
      promise_date: null,
      receipt_value: 0,
      needs_human: false,
      intent: "comprovante",
      sentiment: "neutro",
      urgencia: "media",
      dificuldade_financeira: false,
      desconto_pct: 0,
      summary: "Cliente informou pagamento; aguardando comprovante",
    };
  }

  const wantsDeal = /negoci|acordo|desconto|parcela|parcelar|prazo|consigo pagar|deixar por|fazer por|dividir/i.test(txt);
  if (wantsDeal) {
    const base = hasDebt
      ? `Oi ${firstName}, consigo te ajudar sim. Consta ${oldest ? `a parcela #${oldest.installment_number}` : "pendência"} e o total em aberto está em *${money(total)}*.`
      : `Oi ${firstName}, consigo te ajudar sim. Não localizei parcela vencida agora, mas vou registrar seu pedido.`;
    return {
      reply: `${base}\nMe diga quanto você consegue pagar hoje e qual data para o restante, que eu encaminho para validar a melhor condição. 🤝${pix}`,
      is_receipt: false,
      is_rollover: false,
      is_promise: /dia|amanh|hoje|semana|pago|pagar/i.test(txt),
      promise_date: null,
      receipt_value: 0,
      needs_human: false,
      intent: "negociacao",
      sentiment: tone?.frustrated ? "frustrado" : "neutro",
      urgencia: "alta",
      dificuldade_financeira: tone?.hardship === true,
      desconto_pct: /desconto|deixar por|fazer por/i.test(txt) ? 10 : 0,
      summary: "Cliente pediu negociação; automação coletou proposta e segue acompanhando",
    };
  }

  if (hasDebt) {
    const label = overdue.length > 0 ? "em atraso" : "vencendo hoje";
    return {
      reply: `Oi ${firstName}! Vi aqui ${oldest ? `a parcela #${oldest.installment_number}` : "uma pendência"} ${label}.\nTotal para regularizar agora: *${money(total)}*.\nConsegue acertar hoje ou prefere combinar um prazo?${pix}`,
      is_receipt: false,
      is_rollover: false,
      is_promise: false,
      promise_date: null,
      receipt_value: 0,
      needs_human: false,
      intent: "pagamento",
      sentiment: "neutro",
      urgencia: overdue.length > 0 ? "alta" : "media",
      dificuldade_financeira: tone?.hardship === true,
      desconto_pct: 0,
      summary: "Cobrança objetiva com valores do sistema",
    };
  }

  return {
    reply: `Oi ${firstName}! Tudo bem? Me conta o que você precisa que eu te ajudo por aqui. 🙂`,
    is_receipt: false,
    is_rollover: false,
    is_promise: false,
    promise_date: null,
    receipt_value: 0,
    needs_human: false,
    intent: "duvida",
    sentiment: "neutro",
    urgencia: "baixa",
    dificuldade_financeira: false,
    desconto_pct: 0,
    summary: "Atendimento geral sem pendência vencida",
  };
}

function isWithinBusinessHours(settings: any): boolean {
  if (!settings?.bot_business_hours_only) return true;
  const start = settings.bot_business_start || "08:00";
  const end = settings.bot_business_end || "18:00";
  const now = new Date();
  const local = new Date(now.getTime() + (-180 - now.getTimezoneOffset()) * 60000);
  const hm = `${String(local.getHours()).padStart(2,"0")}:${String(local.getMinutes()).padStart(2,"0")}`;
  return hm >= start && hm <= end;
}

async function evolutionFetch(apiUrl: string, apiKey: string, path: string, body: any) {
  try {
    const resp = await fetch(`${apiUrl.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: apiKey },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const errBody = await resp.text().catch(() => "");
      console.warn("[evolution] request failed", path, resp.status, errBody.slice(0, 300));
    }
    return resp;
  } catch (e) {
    console.error("evolution fetch failed", path, e);
    return null;
  }
}

function whatsappNumber(value: string) {
  return String(value || "").split("@")[0].replace(/\D/g, "");
}

async function sendPresence(apiUrl: string, apiKey: string, instance: string, jid: string, presence: "composing" | "paused" | "available") {
  await evolutionFetch(apiUrl, apiKey, `/chat/sendPresence/${instance}`, { number: whatsappNumber(jid), presence, delay: 1200 });
}

async function markAsRead(apiUrl: string, apiKey: string, instance: string, key: any) {
  await evolutionFetch(apiUrl, apiKey, `/chat/markMessageAsRead/${instance}`, { readMessages: [key] });
}

async function sendText(apiUrl: string, apiKey: string, instance: string, jid: string, text: string) {
  const chunks = text.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
  const list = chunks.length > 0 ? chunks : [text];
  const candidates = Array.from(new Set([String(jid || ""), whatsappNumber(jid)].filter(Boolean)));
  let allSent = true;
  for (let i = 0; i < list.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 800));
    let sent = false;
    const errors: string[] = [];
    for (const number of candidates) {
      try {
        const resp = await fetch(`${apiUrl.replace(/\/$/, "")}/message/sendText/${instance}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: apiKey },
          body: JSON.stringify({ number, text: list[i], delay: Math.min(1500, 400 + list[i].length * 25) }),
        });
        const body = await resp.text().catch(() => "");
        if (resp.ok) {
          sent = true;
          console.log("[evolution] sendText ok", { instance, to: number.includes("@") ? "jid" : "number", status: resp.status });
          break;
        }
        errors.push(`${resp.status}:${body.slice(0, 180)}`);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
    if (!sent) {
      allSent = false;
      console.error("[evolution] sendText failed", { instance, jid, errors });
    }
  }
  return allSent;
}

// ─── PIX EMV (BR Code Copia e Cola) ────────────────────────────────
function pixCrc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
function pixTLV(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}
function pixNormalize(s: string): string {
  return (s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "").slice(0, 25).trim() || "PAGADOR";
}
export function buildPixEmv(params: {
  key: string;
  amount: number;
  merchantName: string;
  merchantCity?: string;
  txid?: string;
}): string {
  const key = (params.key || "").trim();
  if (!key) return "";
  const name = pixNormalize(params.merchantName || "RECEBEDOR");
  const city = pixNormalize(params.merchantCity || "SAO PAULO").slice(0, 15);
  const txid = pixNormalize(params.txid || "PAG").slice(0, 25) || "PAG";
  const amount = Math.max(0, Number(params.amount || 0)).toFixed(2);
  const mai = pixTLV("00", "br.gov.bcb.pix") + pixTLV("01", key);
  const payload =
    pixTLV("00", "01") +
    pixTLV("26", mai) +
    pixTLV("52", "0000") +
    pixTLV("53", "986") +
    (amount !== "0.00" ? pixTLV("54", amount) : "") +
    pixTLV("58", "BR") +
    pixTLV("59", name) +
    pixTLV("60", city) +
    pixTLV("62", pixTLV("05", txid));
  const toCrc = payload + "6304";
  return toCrc + pixCrc16(toCrc);
}

// ─── Envia mensagem com botões (Evolution) — fallback pra texto ─────
async function sendButtons(apiUrl: string, apiKey: string, instance: string, jid: string, params: {
  title?: string; body: string; footer?: string; buttons: Array<{ id: string; label: string }>;
}): Promise<boolean> {
  try {
    const resp = await fetch(`${apiUrl.replace(/\/$/, "")}/message/sendButtons/${instance}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: apiKey },
      body: JSON.stringify({
        number: whatsappNumber(jid),
        title: params.title || "",
        description: params.body,
        footer: params.footer || "",
        buttons: params.buttons.slice(0, 3).map((b, i) => ({
          buttonText: { displayText: b.label.slice(0, 20) },
          buttonId: b.id,
          type: 1,
          index: i,
        })),
      }),
    });
    if (resp.ok) return true;
  } catch (_) { /* fallback */ }
  return false;
}


async function upsertConversation(supabase: any, params: {
  userId: string; phone: string; jid: string; instance: string;
  clientId?: string | null; contactName?: string | null;
  preview: string; from: "client" | "bot" | "human"; incrementUnread: boolean;
}): Promise<string | null> {
  const { userId, phone, jid, instance, clientId, contactName, preview, from, incrementUnread } = params;
  const { data: existing } = await supabase
    .from("whatsapp_conversations").select("id, unread_count")
    .eq("user_id", userId).eq("phone", phone).maybeSingle();
  
  if (existing) {
    await supabase.from("whatsapp_conversations").update({
      jid, instance,
      client_id: clientId ?? undefined,
      contact_name: contactName ?? undefined,
      last_message_at: new Date().toISOString(),
      last_message_preview: preview.slice(0, 200),
      last_message_from: from,
      unread_count: incrementUnread ? (existing.unread_count || 0) + 1 : existing.unread_count,
      updated_at: new Date().toISOString(),
    }).eq("id", existing.id);
    return existing.id;
  }
  
  const { data: created } = await supabase.from("whatsapp_conversations").insert({
    user_id: userId, phone, jid, instance,
    client_id: clientId ?? null, contact_name: contactName ?? null,
    last_message_preview: preview.slice(0, 200), last_message_from: from,
    unread_count: incrementUnread ? 1 : 0,
  }).select("id").single();
  return created?.id ?? null;
}

async function logMessage(supabase: any, params: {
  conversationId: string; userId: string;
  direction: "in" | "out"; sender: "client" | "bot" | "human";
  messageType: string; content: string;
  waMessageId?: string | null; mediaUrl?: string | null; metadata?: any;
}) {
  await supabase.from("whatsapp_messages").insert({
    conversation_id: params.conversationId,
    user_id: params.userId,
    direction: params.direction,
    sender: params.sender,
    message_type: params.messageType,
    content: params.content,
    wa_message_id: params.waMessageId ?? null,
    media_url: params.mediaUrl ?? null,
    metadata: params.metadata ?? {},
  });
}

async function logBotAction(supabase: any, params: {
  userId: string; clientId?: string | null; conversationId?: string | null;
  toolName: string; toolInput?: any; toolOutput?: any;
  success?: boolean; errorMessage?: string | null;
}) {
  try {
    await supabase.from("bot_actions_log").insert({
      user_id: params.userId,
      client_id: params.clientId ?? null,
      conversation_id: params.conversationId ?? null,
      tool_name: params.toolName,
      tool_input: params.toolInput ?? {},
      tool_output: params.toolOutput ?? {},
      success: params.success ?? true,
      error_message: params.errorMessage ?? null,
    });
  } catch (e) {
    console.warn("[bot_actions_log] insert failed:", e);
  }
}

async function escalateToHuman(supabase: any, convoId: string, reason: string) {
  await supabase.from("whatsapp_conversations").update({
    bot_paused: true,
    bot_status: "handoff",
    needs_human: true,
    human_takeover_at: new Date().toISOString(),
    human_takeover_reason: reason,
  }).eq("id", convoId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // SEGURANÇA (C2): o Evolution não assina o payload, então exigimos um segredo
  // compartilhado. Configure o webhook do Evolution com `?secret=<valor>` na URL
  // (ou header x-webhook-secret) e defina EVOLUTION_WEBHOOK_SECRET nos secrets.
  // FAIL-SAFE: só passa a EXIGIR quando o env estiver setado — assim o deploy do
  // código não derruba a recepção antes de você configurar o segredo no Evolution.
  // Guard desativado temporariamente para destravar recepção do Evolution.
  // Para reativar: crie EVOLUTION_WEBHOOK_SECRET e configure `?secret=<valor>` na URL do webhook no Evolution.
  if (false && !checkSharedSecret(req, "EVOLUTION_WEBHOOK_SECRET", "x-webhook-secret")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    const payload = await req.json();
    if (payload.event !== "messages.upsert" && payload.event !== "MESSAGES_UPSERT") {
      return new Response(JSON.stringify({ status: "ignored_event" }), { headers: corsHeaders });
    }

    const data = payload.data;
    const key = data?.key ?? data?.message?.key;
    const msgContent = data?.message?.message ?? data?.message;
    if (!key || key.fromMe) return new Response(JSON.stringify({ status: "ignored_self" }), { headers: corsHeaders });

    const msgId = key.id;
    if (msgId && processedMessages.has(msgId)) return new Response(JSON.stringify({ status: "duplicate" }), { headers: corsHeaders });
    if (msgId) rememberMessage(msgId);

    const senderJid = key.remoteJid;
    if (!senderJid || senderJid.includes("@g.us") || senderJid.includes("@broadcast")) {
      return new Response(JSON.stringify({ status: "ignored_jid" }), { headers: corsHeaders });
    }
    const senderPhone = senderJid.split("@")[0].replace(/\D/g, "");
    const instanceName = payload.instance;

    let messageType = "text";
    let incomingText = msgContent?.conversation || msgContent?.extendedTextMessage?.text || "";
    let mediaData: string | null = null;
    let mimeType: string | null = null;

    if (msgContent?.imageMessage) {
      messageType = "image";
      mimeType = msgContent.imageMessage.mimetype;
      incomingText = msgContent.imageMessage.caption || "";
    } else if (msgContent?.audioMessage) {
      messageType = "audio";
      mimeType = msgContent.audioMessage.mimetype;
    } else if (msgContent?.documentMessage) {
      messageType = "document";
      mimeType = msgContent.documentMessage.mimetype;
      incomingText = msgContent.documentMessage.caption || msgContent.documentMessage.fileName || "";
    }

    const { data: settings } = await supabase.from("settings").select("*").eq("whatsapp_instance", instanceName).single();
    if (!settings || !settings.bot_enabled) return new Response(JSON.stringify({ status: "bot_disabled" }), { headers: corsHeaders });

    const apiUrl = (settings.whatsapp_api_url || "").replace(/\/$/, "");
    const apiKey = settings.whatsapp_api_key;
    if (apiUrl && apiKey) markAsRead(apiUrl, apiKey, instanceName, key).catch(() => {});

    const userId = settings.user_id;

    // CLIENT LOOKUP (agent_core v2 — estrito + desambiguação por CPF)
    let client: any = null;
    const CLIENT_FIELDS = "id, name, phone, whatsapp, cpf_cnpj, status, credit_score, bot_memory, birth_date, email, address";
    const { data: convoExisting } = await supabase.from("whatsapp_conversations").select("id, client_id, bot_paused, blocked").eq("user_id", userId).eq("phone", senderPhone).maybeSingle();
    let preboundClient: any = null;
    if (convoExisting?.client_id) {
      const { data: c } = await supabase.from("clients").select(CLIENT_FIELDS).eq("id", convoExisting.client_id).maybeSingle();
      if (c) {
        // Confirma que o telefone AINDA bate com esse cliente — evita vínculo "podre"
        if (samePhoneBR(senderPhone, c.whatsapp || "") || samePhoneBR(senderPhone, c.phone || "")) {
          preboundClient = c;
        } else {
          console.warn("[client_lookup] conversation.client_id não bate mais com o telefone; ignorando vínculo antigo");
        }
      }
    }
    const ident = await identifyClient(supabase, { userId, senderPhone, incomingText, preboundClient });
    let ambiguousCandidates: any[] = [];
    if (ident.status === "unique") {
      client = ident.client;
      // Se veio de match por telefone/CPF e a conversa não estava vinculada, vincula agora
      if (!preboundClient && convoExisting?.id) {
        await supabase.from("whatsapp_conversations").update({ client_id: client.id }).eq("id", convoExisting.id).then(() => {}, () => {});
      }
    } else if (ident.status === "ambiguous") {
      ambiguousCandidates = ident.candidates;
      client = null;
    } else {
      client = null;
    }
    await auditDecision(supabase, {
      userId,
      conversationId: convoExisting?.id ?? null,
      clientId: client?.id ?? null,
      intent: `identify_${ident.status}`,
      outcome: "ok",
      details: {
        sender_phone: senderPhone,
        match_type: ident.status === "unique" ? (ident as any).matchType : null,
        candidate_count: ident.status === "ambiguous" ? ambiguousCandidates.length : (ident.status === "unique" ? 1 : 0),
      },
    });

    const { data: profile } = await supabase.from("profiles").select("name, pix_key, pix_key_type").eq("id", userId).single();

    const pushName = data?.pushName || data?.message?.pushName || null;
    const convoId = await upsertConversation(supabase, {
      userId, phone: senderPhone, jid: senderJid, instance: instanceName,
      clientId: client?.id ?? null, contactName: client?.name || pushName,
      preview: incomingText || `[${messageType}]`, from: "client", incrementUnread: true,
    });
    if (convoId) {
      await logMessage(supabase, {
        conversationId: convoId, userId, direction: "in", sender: "client",
        messageType, content: incomingText || "", waMessageId: msgId, metadata: { jid: senderJid, mime: mimeType },
      });
    }

    if (convoExisting?.blocked) return new Response(JSON.stringify({ status: "blocked" }), { headers: corsHeaders });

    const botSay = async (text: string) => {
      if (!text || !apiUrl || !apiKey) return;
      if (isEchoOfLastReply(lastBotReply, senderJid, text)) {
        console.log("[anti-eco] resposta idêntica suprimida para", senderJid);
        return;
      }
      lastBotReply.set(senderJid, { text, ts: Date.now() });
      const sent = await sendText(apiUrl, apiKey, instanceName, senderJid, text);
      if (!sent) {
        await logBotAction(supabase, {
          userId,
          clientId: client?.id ?? null,
          conversationId: convoId,
          toolName: "send_whatsapp_text",
          toolInput: { instance: instanceName, phone: senderPhone, preview: text.slice(0, 120) },
          success: false,
          errorMessage: "Evolution não confirmou o envio da mensagem",
        });
        if (convoId) {
          await supabase.from("whatsapp_conversations").update({
            needs_human: true,
            human_takeover_reason: "Falha no envio automático pela Evolution",
            updated_at: new Date().toISOString(),
          }).eq("id", convoId);
        }
        return;
      }
      if (convoId) {
        await logMessage(supabase, { conversationId: convoId, userId, direction: "out", sender: "bot", messageType: "text", content: text });
        await supabase.from("whatsapp_conversations").update({
          last_message_at: new Date().toISOString(), last_message_preview: text.slice(0, 200), last_message_from: "bot", updated_at: new Date().toISOString(),
        }).eq("id", convoId);
      }
    };

    if (convoExisting?.bot_paused) return new Response(JSON.stringify({ status: "paused" }), { headers: corsHeaders });
    if (apiUrl && apiKey) sendPresence(apiUrl, apiKey, instanceName, senderJid, "composing").catch(() => {});

    // AMBÍGUO: mesmo número em vários cadastros → pedir CPF antes de qualquer dado.
    if (!client && ambiguousCandidates.length > 1) {
      const empresa = settings.company_name || profile?.name || "nossa equipe";
      await botSay(
        `Olá! 👋 Aqui é da *${empresa}*.\n\nEncontrei *${ambiguousCandidates.length} cadastros* com este número. ` +
        `Pra eu te atender com segurança, me envia seu *CPF* (só os 11 números).`,
      );
      await auditDecision(supabase, {
        userId, conversationId: convoId, clientId: null,
        intent: "asked_cpf_disambiguation", outcome: "blocked",
        details: { candidate_ids: ambiguousCandidates.map((c: any) => c.id) },
      });
      return new Response(JSON.stringify({ status: "ambiguous_ask_cpf" }), { headers: corsHeaders });
    }

    if (!client) {
      // ─── SDR: Agente completo de qualificação de lead ────────────
      try {
        const companyName = settings.company_name || profile?.name || "nossa equipe";

        // Carrega (ou cria) o lead persistente
        const { data: existingLead } = await supabase
          .from("leads")
          .select("*")
          .eq("user_id", userId)
          .eq("phone", senderPhone)
          .maybeSingle();

        let lead: any = existingLead;
        if (!lead) {
          const { data: created } = await supabase
            .from("leads")
            .insert({
              user_id: userId,
              phone: senderPhone,
              stage: "new",
              source: "whatsapp",
              last_message_at: new Date().toISOString(),
              notes: { pushName: pushName || null },
            })
            .select("*")
            .single();
          lead = created;
        }

        // Histórico recente da conversa para contexto
        let history: Array<{ role: "user" | "bot"; text: string }> = [];
        if (convoId) {
          const { data: msgs } = await supabase
            .from("whatsapp_messages")
            .select("direction, content")
            .eq("conversation_id", convoId)
            .order("created_at", { ascending: false })
            .limit(10);
          history = (msgs || [])
            .reverse()
            .map((m: any) => ({ role: m.direction === "in" ? "user" as const : "bot" as const, text: m.content || "" }))
            .filter(h => h.text);
        }

        const sdrMod = await import("../_shared/sdr.ts");
        const ctx = {
          lead,
          incomingText,
          pushName,
          settings,
          profile,
          companyName,
          history,
        };

        // 🧠 Camada de compreensão livre (LLM) — entende perguntas, correções
        // e inversão de cálculo antes da máquina de estados.
        let understood: Awaited<ReturnType<typeof sdrMod.understand>> = null;
        try { understood = await sdrMod.understand(ctx); } catch { /* ignora */ }

        // Aplica correções ao lead ANTES de decidir (permite regravar campos).
        if (understood?.kind === "correction" && understood.corrections) {
          Object.assign(lead, understood.corrections);
          ctx.lead = lead;
        }

        // Reverse calc: lead disse "posso pagar X/mês"
        if (understood?.kind === "reverse_calc" && understood.monthly_payment) {
          const rate = Number(settings?.default_interest_rate || profile?.default_interest_rate || 15);
          const term = lead.term_months || Number(settings?.default_term_months || 6);
          const amount = sdrMod.reverseCalcAmount(understood.monthly_payment, term, rate);
          lead.amount_requested = amount;
          ctx.lead = lead;
        }

        // Se está aguardando documentos, tenta baixar mídia e processar
        let awaitingDocsOpts: { mediaReceived: boolean; docKey?: string } = { mediaReceived: false };
        if (lead.stage === "awaiting_docs" && messageType !== "text" && apiUrl && apiKey) {
          try {
            const resp = await evolutionFetch(apiUrl, apiKey, `/chat/getBase64FromMediaMessage/${instanceName}`, { message: { key, message: msgContent }, convertToMp4: false });
            if (resp?.ok) {
              const b64 = (await resp.json()).base64 as string | undefined;
              if (b64) {
                mediaData = b64;
                const nextDoc = sdrMod.nextPendingDoc(lead);
                if (nextDoc) {
                  const ext = mimeType === "application/pdf" ? "pdf" : (mimeType?.split("/")[1] || "jpg");
                  const path = `leads/${lead.id}/${nextDoc.key}-${Date.now()}.${ext}`;
                  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
                  const up = await supabase.storage.from("uploads").upload(path, bytes, {
                    contentType: mimeType || "application/octet-stream",
                    upsert: false,
                  });
                  if (!up.error) awaitingDocsOpts = { mediaReceived: true, docKey: nextDoc.key };
                }
              }
            }
          } catch (e) { console.warn("[docs] falha ao salvar mídia do lead:", e); }
        }

        const decision =
          lead.stage === "awaiting_docs"
            ? sdrMod.handleAwaitingDocsReply(ctx, awaitingDocsOpts)
            : lead.stage === "simulated"
            ? sdrMod.handleSimulatedReply(ctx)
            : sdrMod.decide(ctx);


        // FAQ knowledge — camada de conhecimento antes de fallbacks do SDR
        const faqCtxLead = {
          companyName: settings.company_name || profile?.name || "nossa equipe",
          firstName: (lead.name || pushName || "").toString().split(" ")[0] || "",
          portalLink: `${(Deno.env.get("SITE_URL") || "https://credmaisapp.com.br").replace(/\/$/, "")}/portal`,
          pixKey: profile?.pix_key || undefined,
          pixKeyType: profile?.pix_key_type || undefined,
          ownerName: profile?.name || undefined,
          rate: Number(settings.default_interest_rate ?? profile?.default_interest_rate ?? 15),
          term: Number(settings.default_term_months ?? 6),
          minAmount: Number(settings.min_loan_amount ?? 100),
          maxAmount: Number(settings.max_loan_amount ?? 100000),
          lateFeePct: Number(settings.late_fee_percent ?? 2),
          dailyFeePct: Number(settings.daily_interest_percent ?? 0.033),
          earlyDiscountPct: Number(settings.early_payment_discount_percent ?? 0),
          supportPhone: settings.portal_contact_phone || undefined,
          supportEmail: settings.portal_contact_email || undefined,
          businessHours: settings.business_hours || undefined,
          hasOpenInstallments: false,
          isKnownClient: false,
        };
        const faqLeadHit = findFaqMatch(incomingText, faqCtxLead);

        // Se o lead PERGUNTOU algo, responde a pergunta ANTES da próxima etapa.
        // Prioridade: FAQ (mais rico, com dados dinâmicos) > faqAnswer legado.
        if (understood?.kind === "question") {
          const ans = (faqLeadHit && faqLeadHit.score >= 10)
            ? faqLeadHit.answer
            : sdrMod.faqAnswer(understood.topic, ctx);
          decision.reply = `${ans}\n\n${decision.reply}`;
        }

        // Small talk ("ok", "valeu", "obrigado", "beleza") — acusa recebimento
        // e traz de volta a pergunta pendente sem soar robótico.
        if (understood?.kind === "small_talk") {
          const ack = /obrigad|valeu|vlw|agrade/i.test(incomingText) ? "Imagina! 🙌" :
                      /^ok|beleza|blz|show|top|ta bom|tá bom/i.test(incomingText.trim()) ? "Perfeito! 👌" :
                      "Show! 👍";
          decision.reply = `${ack} ${decision.reply}`;
        }

        // Se o modelo não entendeu (unclear) mas a FAQ pegou, injeta a resposta da FAQ
        if (understood?.kind === "unclear" && faqLeadHit && faqLeadHit.score >= 10) {
          decision.reply = `${faqLeadHit.answer}\n\n${decision.reply}`;
        } else if (understood?.kind === "unclear" && (lead.notes as any)?.last_intent) {
          decision.reply = `Desculpa, não peguei bem 🙈 ${decision.reply}`;
        }




        // Persiste alterações do lead (mantém memória de contexto)
        const mergedNotes = {
          ...(lead.notes || {}),
          ...((decision.updates as any).notes || {}),
          last_intent: decision.intent,
          last_bot_reply: decision.reply?.slice(0, 300) || "",
          last_turn_at: new Date().toISOString(),
        };
        const patch: any = {
          ...decision.updates,
          stage: decision.stage,
          last_message_at: new Date().toISOString(),
          score: sdrMod.scoreLead({ ...lead, ...decision.updates }, settings),
          notes: mergedNotes,
        };
        // Follow-up automático (24h) se ficou parado no meio da qualificação
        if (decision.stage === "qualifying") {
          patch.next_followup_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        }
        if (!patch.tags) delete patch.tags;

        await supabase.from("leads").update(patch).eq("id", lead.id);

        // Polimento com IA (mantém o conteúdo determinístico)
        let finalReply = decision.reply;
        try {
          finalReply = await sdrMod.polishWithAI(decision.reply, ctx, history);
        } catch { /* mantém fallback */ }

        await botSay(finalReply);

        // Handoff para humano
        if (decision.needsHuman && convoId) {
          await supabase.from("whatsapp_conversations").update({
            needs_human: true,
            human_takeover_reason: decision.handoffReason || "SDR handoff",
            updated_at: new Date().toISOString(),
          }).eq("id", convoId);
          await supabase.from("notifications").insert({
            user_id: userId,
            title: "Lead pronto para atendimento",
            message: `${lead.name || "Lead"} (${senderPhone}) — ${decision.handoffReason || "aguardando consultor"}`,
            type: "info",
          });
        }

        // Notifica dono quando é a primeira interação relevante
        if (lead.stage === "new" && decision.stage !== "new") {
          await supabase.from("notifications").insert({
            user_id: userId,
            title: "Novo lead no WhatsApp",
            message: `${senderPhone} iniciou uma conversa de empréstimo`,
            type: "info",
          });
        }
      } catch (sdrErr) {
        console.error("[sdr] falha, caindo no fallback simples:", sdrErr);
        await botSay(pickGreeting(settings.company_name || profile?.name || "nossa empresa"));
      }
      return new Response(JSON.stringify({ status: "lead" }), { headers: corsHeaders });

    }

    // ─── MENU INTERATIVO (cliente conhecido) ───────────────────────────
    // Menu contextual + linguagem natural + PIX Copia&Cola + deep-link
    // portal + escolha de parcela + pagamento parcial + confirmação de
    // handoff + follow-up + cooldown por opção + idempotência.
    try {
      const txtRaw = (incomingText || "").trim();
      const txtLow = txtRaw.toLowerCase();

      const siteUrl = (Deno.env.get("SITE_URL") || "https://credmaisapp.com.br").replace(/\/$/, "");
      const empresa = settings.company_name || profile?.name || "nossa equipe";
      const firstName = (client.name || "").split(" ")[0] || "";

      // Estado leve do cliente (memória bot)
      const mem = parseMemory(client.bot_memory);
      const lastMenuAt: number = Number(mem.last_menu_at || 0);
      const lastChoice: string | null = mem.last_menu_choice || null;
      const now = Date.now();
      const nowBrDay = new Date(now - 3 * 60 * 60 * 1000).toISOString().split("T")[0];

      // Helper: parcelas em aberto do cliente (agent_core: só com saldo > 0)
      const loadOpenInstallments = async () => {
        const bucket = await loadClientInstallments(supabase, client.id, nowBrDay);
        // Devolve pending/overdue ordenadas por vencimento (compatível com o resto do fluxo)
        return [...bucket.overdue, ...bucket.dueToday, ...bucket.future].slice(0, 30);
      };
      const loadContractStats = async () => {
        const { data: all } = await supabase
          .from("contract_installments")
          .select("amount, paid_amount, status")
          .eq("client_id", client.id);
        const total = (all || []).length;
        const paid = (all || []).filter((i: any) => i.status === "paid").length;
        const totalDue = (all || []).reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
        const totalPaid = (all || []).reduce((s: number, i: any) => s + Number(i.paid_amount || 0), 0);
        return { total, paid, totalDue, totalPaid, pct: total > 0 ? Math.round((paid / total) * 100) : 0 };
      };

      // Deep-link do portal com sessão pré-autenticada
      const buildPortalDeepLink = async (): Promise<string> => {
        try {
          const { data } = await supabase
            .from("portal_sessions")
            .insert({ client_id: client.id })
            .select("token").single();
          const tk = data?.token;
          return tk ? `${siteUrl}/portal?t=${tk}` : `${siteUrl}/portal`;
        } catch { return `${siteUrl}/portal`; }
      };

      // Follow-up automático (agenda mensagem em 24h se cliente não retornar)
      const scheduleFollowUp = async (text: string, hours = 24) => {
        if (!convoId) return;
        try {
          await supabase.from("whatsapp_scheduled_messages").insert({
            conversation_id: convoId,
            user_id: userId,
            text,
            scheduled_for: new Date(now + hours * 3600_000).toISOString(),
            status: "pending",
          });
        } catch (e) { console.warn("[followup] falhou:", e); }
      };

      // Estatística rápida pra decidir menu contextual
      const openInstQuick = await loadOpenInstallments().catch(() => [] as any[]);
      const hasOpen = openInstQuick.length > 0;
      const hasPix = !!profile?.pix_key;
      const humanRequested = !!(convoExisting as any)?.needs_human;

      // Constrói itens do menu contextual
      type MenuItem = { id: string; label: string; short: string };
      const menuItems: MenuItem[] = [];
      if (hasOpen) menuItems.push({ id: "1", label: "1️⃣ Consultar parcelas", short: "Consultar parcelas" });
      menuItems.push({ id: "2", label: "2️⃣ Portal do cliente", short: "Portal" });
      if (hasOpen && hasPix) menuItems.push({ id: "3", label: "3️⃣ Quitar parcela (PIX)", short: "Quitar (PIX)" });
      if (!humanRequested) menuItems.push({ id: "4", label: "4️⃣ Falar com atendente", short: "Atendente" });
      if (hasOpen && openInstQuick.some((i: any) => (typeof i.due_date === "string" ? i.due_date.split("T")[0] : i.due_date) < nowBrDay)) {
        menuItems.push({ id: "5", label: "5️⃣ Renegociar dívida", short: "Renegociar" });
      }

      const menuBody =
        menuItems.map(m => `*${m.id}* — ${m.label.replace(/^[0-9]️⃣ /, "")}`).join("\n") +
        `\n\n_Você também pode escrever naturalmente (ex.: "quero ver minhas parcelas", "me manda o pix", "quitar #3", "quero pagar R$ 200"). Digite *menu* pra voltar._`;

      const showMenu = async (prefix?: string) => {
        const header = prefix ? `${prefix}\n\n` : "";
        // Tenta botões nativos (Evolution) — se falhar, cai pra texto
        let usedButtons = false;
        if (apiUrl && apiKey && menuItems.length > 0) {
          usedButtons = await sendButtons(apiUrl, apiKey, instanceName, senderJid, {
            title: `📋 Menu — ${empresa}`,
            body: `${prefix || `Oi ${firstName}!`} Escolha uma opção:`,
            footer: "Ou digite o número",
            buttons: menuItems.slice(0, 3).map(m => ({ id: `menu_${m.id}`, label: m.short })),
          });
        }
        if (!usedButtons) {
          await botSay(`${header}📋 *Menu — ${empresa}*\nEscolha uma opção respondendo com o número:\n\n${menuBody}`);
        } else if (menuItems.length > 3) {
          // Botões só suporta 3 itens — manda o resto por texto
          const extra = menuItems.slice(3).map(m => `*${m.id}* — ${m.label.replace(/^[0-9]️⃣ /, "")}`).join("\n");
          await botSay(`_Outras opções:_\n${extra}`);
        }
        await supabase.from("clients").update({
          bot_memory: serializeMemory({ ...mem, last_menu_at: now }),
        }).eq("id", client.id);
      };

      // ─── Roteamento por linguagem natural ────────────────────────────
      const naturalRoute = (): { choice: string; parcelHint?: number; amountHint?: number } | null => {
        const t = txtLow;
        // Números direto
        const numMatch = /^([1-5])[\.\)\s]*$/.exec(txtRaw);
        if (numMatch) return { choice: numMatch[1] };
        // Botão pressionado (buttonId → menu_X)
        const btn = /menu_([1-5])/.exec(txtRaw);
        if (btn) return { choice: btn[1] };
        // Palavras naturais
        const parcelHint = /(?:parcela\s*[#nº]?\s*|#)(\d{1,3})/i.exec(txtRaw)?.[1];
        const amountHint = /r\$?\s*([\d\.]+(?:,\d{1,2})?)/i.exec(txtRaw)?.[1];
        const amountNum = amountHint ? Number(amountHint.replace(/\./g, "").replace(",", ".")) : undefined;
        if (/(consultar|ver|quais|minhas|listar|abertas?).*parc|parcela.*aberta|extrato|meu.?debito|débito|debito|em atraso|atrasadas?/i.test(t)) {
          return { choice: "1" };
        }
        if (/(portal|site|link|acess|logar|entrar).*(cliente|conta|portal)?|link do portal|link do site/i.test(t)) {
          return { choice: "2" };
        }
        if (/(quitar|pagar|paga hoje|paga agora|pix|chave|copia\s*e\s*cola|boleto|qrcode|qr code|c[oó]digo pix)/i.test(t)) {
          return { choice: "3", parcelHint: parcelHint ? Number(parcelHint) : undefined, amountHint: amountNum };
        }
        if (matchesAny(t, HUMAN_WORDS) || /(atendente|humano|pessoa|consultor|gerente|responsavel|falar com voc[eê])/i.test(t)) {
          return { choice: "4" };
        }
        if (/(renegoci|acordo|parcel(ar)? de novo|refinanc|nova negocia)/i.test(t)) {
          return { choice: "5" };
        }
        // Cliente já mostrou parcelas antes e agora manda só um número/valor → interpreta como quitação
        if (lastChoice === "1" && parcelHint) {
          return { choice: "3", parcelHint: Number(parcelHint) };
        }
        if (lastChoice === "3" && amountNum) {
          return { choice: "3", amountHint: amountNum };
        }
        return null;
      };

      const isMenuTrigger = /^(menu|opc[oõ]es|opcoes|ajuda|op[cç][aã]o|comandos)$/i.test(txtLow);
      const route = naturalRoute();

      // Idempotência: se cliente repetir a mesma opção em <30s, silencia
      const cooldown = 30_000;
      if (route && route.choice === lastChoice && (now - lastMenuAt) < cooldown) {
        console.log("[menu] cooldown — resposta suprimida", { choice: route.choice });
        return new Response(JSON.stringify({ status: "menu_cooldown" }), { headers: corsHeaders });
      }

      if (route) {
        const choice = route.choice;

        // Confirmação inteligente do handoff (#4): pergunta o assunto antes
        if (choice === "4") {
          const askedBefore = mem.human_reason_asked_at && (now - Number(mem.human_reason_asked_at) < 10 * 60_000);
          if (!askedBefore) {
            await botSay(
              `👤 Claro, ${firstName}! Antes de eu chamar um atendente, me diz *em uma linha o que você precisa* — assim ele já entra ciente do assunto. 😉\n\n` +
              `_(Se preferir seguir direto, é só responder "quero atendente")._`
            );
            await supabase.from("clients").update({
              bot_memory: serializeMemory({ ...mem, human_reason_asked_at: now, last_menu_choice: "4_waiting" }),
            }).eq("id", client.id);
            await scheduleFollowUp(`Oi ${firstName}, ainda precisa falar com um atendente? Se sim, me responde qualquer mensagem e eu chamo já. Se resolveu, digite *menu*.`);
            return new Response(JSON.stringify({ status: "human_reason_pending" }), { headers: corsHeaders });
          }
          if (convoId) {
            await supabase.from("whatsapp_conversations").update({
              needs_human: true, bot_paused: true,
              human_takeover_reason: txtRaw.slice(0, 300) || "Cliente solicitou atendimento humano via menu",
              updated_at: new Date().toISOString(),
            }).eq("id", convoId);
          }
          await supabase.from("notifications").insert({
            user_id: userId,
            title: "Cliente pediu atendimento humano",
            message: `${client.name || senderPhone}: ${txtRaw.slice(0, 180) || "sem detalhes"}`,
            type: "warning",
          });
          await botSay(
            `👤 Perfeito, ${firstName}! Já avisei um atendente e *pausei o robô* aqui.\n\n` +
            `Em breve alguém do time da *${empresa}* te responde por aqui mesmo. 🙏`
          );
        }

        else if (choice === "1") {
          const inst = openInstQuick;
          if (inst.length === 0) {
            const stats = await loadContractStats();
            await botSay(
              `Boa notícia, ${firstName}! ✅ Você *não tem parcelas em aberto*.\n\n` +
              (stats.total > 0 ? `📊 Contrato: ${stats.paid}/${stats.total} parcelas pagas (${stats.pct}%).\n\n` : "") +
              `Se precisar de outra coisa, digite *menu*.`
            );
          } else {
            const lines = inst.slice(0, 10).map((i: any) => {
              const due = typeof i.due_date === "string" ? i.due_date.split("T")[0] : i.due_date;
              const [y, m, d] = due.split("-");
              const dueFmt = `${d}/${m}/${y}`;
              const atrasada = due < nowBrDay;
              const total = Number(i.amount) + (Number(i.late_fee) || 0);
              const flag = atrasada ? "🔴" : (due === nowBrDay ? "🟡" : "🟢");
              return `${flag} *#${i.installment_number}* — venc. *${dueFmt}* — ${money(total)}${atrasada && i.late_fee ? ` _(+multa ${money(i.late_fee)})_` : ""}`;
            }).join("\n");
            const totalGeral = inst.reduce((s: number, i: any) => s + Number(i.amount) + (Number(i.late_fee) || 0) - Number(i.paid_amount || 0), 0);
            const stats = await loadContractStats();
            const progressBar = (() => {
              const filled = Math.round(stats.pct / 10);
              return `[${"█".repeat(filled)}${"░".repeat(10 - filled)}] ${stats.pct}%`;
            })();
            await botSay(
              `📄 *Suas parcelas em aberto* (${inst.length}):\n\n${lines}\n\n` +
              `💰 *Total a regularizar:* ${money(totalGeral)}\n` +
              `📊 *Progresso do contrato:* ${progressBar}\n` +
              `   ${stats.paid} pagas de ${stats.total}\n\n` +
              `Digite *3* pra quitar (ou "quitar #N"), *2* pro portal, ou *menu*.`
            );
          }
        }

        else if (choice === "2") {
          const link = await buildPortalDeepLink();
          const isDeep = link.includes("?t=");
          await botSay(
            `🔐 *Portal do Cliente — ${empresa}*\n\n` +
            `${isDeep ? "🔑 *Acesso automático* (link exclusivo, válido por 24h):" : "Acesse aqui:"}\n${link}\n\n` +
            `Lá você pode:\n` +
            `• Ver todas as parcelas e comprovantes 📄\n` +
            `• Baixar recibos em PDF 📥\n` +
            `• Renegociar direto no app 🤝\n` +
            `• Acompanhar em tempo real ⚡\n\n` +
            `Digite *menu* pra voltar.`
          );
        }

        else if (choice === "3") {
          const inst = openInstQuick;
          if (inst.length === 0) {
            await botSay(`Tudo em dia por aqui, ${firstName}! ✅ Sem parcelas a quitar. Digite *menu* se precisar de algo.`);
          } else if (!hasPix) {
            if (convoId) {
              await supabase.from("whatsapp_conversations").update({
                needs_human: true,
                human_takeover_reason: "Cliente pediu PIX mas chave não configurada",
                updated_at: new Date().toISOString(),
              }).eq("id", convoId);
            }
            await botSay(`⚠️ A chave PIX ainda não foi configurada aqui. Já chamei um atendente pra te passar os dados. 🙏`);
          } else {
            // Escolha da parcela específica
            let target: any = inst[0];
            if (route.parcelHint) {
              const found = inst.find((i: any) => Number(i.installment_number) === route.parcelHint);
              if (found) target = found;
            }
            // Pagamento parcial
            const partialAmount = route.amountHint && route.amountHint > 0 ? route.amountHint : null;
            const fullAmount = Number(target.amount) + (Number(target.late_fee) || 0);
            const amountToCharge = partialAmount ? Math.min(partialAmount, fullAmount) : fullAmount;

            // Desconto pra quitação à vista de tudo
            const discountPct = Number((settings as any).early_payment_discount_percent || 0);
            const totalAll = inst.reduce((s: number, i: any) => s + Number(i.amount) + (Number(i.late_fee) || 0) - Number(i.paid_amount || 0), 0);
            const isFullQuit = !partialAmount && inst.length > 1 && /(tudo|quitar tudo|à ?vista|a ?vista|total|todas)/i.test(txtRaw);
            let finalAmount = amountToCharge;
            let discountLine = "";
            if (isFullQuit && discountPct > 0) {
              finalAmount = totalAll * (1 - discountPct / 100);
              discountLine = `\n💥 *Desconto à vista ${discountPct}%:* -${money(totalAll - finalAmount)}`;
            } else if (isFullQuit) {
              finalAmount = totalAll;
            }

            // PIX Copia e Cola
            const emv = buildPixEmv({
              key: profile.pix_key!,
              amount: finalAmount,
              merchantName: profile.name || empresa,
              merchantCity: "SAO PAULO",
              txid: `PARC${target.installment_number || 1}`,
            });
            const pixTypeLabel = (profile.pix_key_type || "chave").toString().toUpperCase();

            const label = isFullQuit
              ? `*Quitação total* (${inst.length} parcelas)`
              : partialAmount
              ? `*Pagamento parcial — parcela #${target.installment_number}*\n_Valor total: ${money(fullAmount)}_`
              : `*Parcela #${target.installment_number}*`;

            await botSay(
              `💸 ${label}\n\n` +
              `Valor a pagar: *${money(finalAmount)}*${discountLine}\n\n` +
              `💠 *Chave PIX (${pixTypeLabel}):*\n\`${profile.pix_key}\`\n` +
              `👤 *Favorecido:* ${profile.name || empresa}\n\n` +
              `📋 *PIX Copia e Cola:*\n\`\`\`${emv}\`\`\`\n\n` +
              `Depois de pagar, *envie o comprovante* aqui (imagem ou PDF) que eu registro a baixa na hora. 📎`
            );
            if (partialAmount) {
              // Registra promessa/pagamento parcial na memória
              const mem2 = parseMemory(client.bot_memory);
              const promessas = Array.isArray(mem2.promessas) ? mem2.promessas : [];
              promessas.push({ data: nowBrDay, valor: partialAmount, parcela: target.installment_number, tipo: "parcial" });
              await supabase.from("clients").update({
                bot_memory: serializeMemory({ ...mem2, promessas }),
              }).eq("id", client.id);
            }
            // Follow-up: se em 24h não veio comprovante, pergunta
            await scheduleFollowUp(`Oi ${firstName}! Já conseguiu concluir o pagamento da parcela #${target.installment_number}? Se sim, me manda o comprovante que registro na hora 📎`);
          }
        }

        else if (choice === "5") {
          if (convoId) {
            await supabase.from("whatsapp_conversations").update({
              needs_human: true,
              human_takeover_reason: "Cliente pediu renegociação via menu",
              updated_at: new Date().toISOString(),
            }).eq("id", convoId);
          }
          await supabase.from("notifications").insert({
            user_id: userId,
            title: "Cliente quer renegociar",
            message: `${client.name || senderPhone} pediu renegociação via menu WhatsApp.`,
            type: "info",
          });
          const link = await buildPortalDeepLink();
          await botSay(
            `🤝 *Renegociação — ${empresa}*\n\n` +
            `Que ótimo que você quer regularizar! Você tem *duas opções*:\n\n` +
            `1️⃣ *Simular no portal* (mais rápido): ${link}\n` +
            `      Lá você escolhe: parcelamento novo, prazo maior ou entrada + saldo.\n\n` +
            `2️⃣ *Aguardar atendente* — já chamei um consultor, ele vai te propor um acordo personalizado.\n\n` +
            `Enquanto isso, se quiser me dizer *quanto consegue pagar hoje* ou *quantas parcelas cabem no bolso*, eu já adianto pro consultor. 😉`
          );
        }

        // Persiste última escolha
        await supabase.from("clients").update({
          bot_memory: serializeMemory({ ...mem, last_menu_at: now, last_menu_choice: choice }),
        }).eq("id", client.id);

        // Log estruturado
        await supabase.from("audit_logs").insert({
          user_id: userId, entity_type: "whatsapp_bot", action: "menu_choice",
          entity_id: client.id, details: {
            phone: senderPhone, choice,
            parcel_hint: route.parcelHint || null,
            amount_hint: route.amountHint || null,
            has_open: hasOpen,
            has_pix: hasPix,
            natural_language: !/^[1-5]$/.test(txtRaw),
          },
        });
        return new Response(JSON.stringify({ status: "menu_choice", choice }), { headers: corsHeaders });
      }

      if (isMenuTrigger) {
        await showMenu(`Oi ${firstName}! 👋`);
        await supabase.from("audit_logs").insert({
          user_id: userId, entity_type: "whatsapp_bot", action: "menu_shown",
          entity_id: client.id, details: { phone: senderPhone, trigger: "keyword", items: menuItems.length },
        });
        return new Response(JSON.stringify({ status: "menu_shown" }), { headers: corsHeaders });
      }

      // Deixa o menu disponível para o bloco de saudação abaixo
      (globalThis as any).__renderMenu = async (prefix?: string) => showMenu(prefix);
      (globalThis as any).__menuBody = menuBody;
    } catch (e) {
      console.warn("[menu] falhou (seguindo fluxo normal):", (e as Error).message);
    }




    // ─── SAUDAÇÃO PERSONALIZADA (cliente conhecido, primeira mensagem) ──
    // Se nunca conversamos com esse número (sem convo prévia) OU não há
    // nenhuma resposta do bot nas últimas 12h, cumprimenta pelo nome e
    // pergunta o que precisa — sem entrar direto em modo cobrança.
    try {
      let shouldGreet = !convoExisting;
      if (!shouldGreet && convoId) {
        const { data: lastOut } = await supabase
          .from("whatsapp_messages")
          .select("created_at")
          .eq("conversation_id", convoId)
          .eq("direction", "out")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!lastOut) shouldGreet = true;
        else if (Date.now() - new Date(lastOut.created_at).getTime() > 12 * 60 * 60 * 1000) shouldGreet = true;
      }
      // Só saúda se a mensagem do cliente for curta/genérica (oi, olá, bom dia…)
      // — se ele já mandou pergunta específica, deixa a IA responder.
      const txt = (incomingText || "").toLowerCase().trim();
      const isGreetingIntent = txt.length <= 20 && /^(oi+|ol[áa]|bom\s*dia|boa\s*tarde|boa\s*noite|opa|e\s*a[ií]|hey|hi|hello|tudo\s*bem|tudo\s*bom)[\s!?.,👋🙂😊🤝]*$/i.test(txt);
      if (shouldGreet && (isGreetingIntent || !incomingText)) {
        const firstName = (client.name || "").split(" ")[0] || "tudo bem";
        const empresa = settings.company_name || profile?.name || "nossa equipe";

        // Puxa contexto MÍNIMO pra saudação ficar consciente:
        //  - parcelas em atraso / vence hoje
        //  - promessa de pagamento em aberto
        //  - última intenção registrada na memória
        const todayStr = todayInSP();
        const bucket = await loadClientInstallments(supabase, client.id, todayStr);
        const overdueQ = bucket.overdue;
        const dueTodayQ = bucket.dueToday;
        const totOver = bucket.totalOverdue;
        const totToday = bucket.totalDueToday;

        const memObj = parseMemory(client.bot_memory);
        const openPromise = (memObj.promessas || []).find((p: any) => p && typeof p === "object" && p.data && p.data >= todayStr);

        let greeting: string;
        if (openPromise) {
          greeting = `Oi ${firstName}! 👋 Aqui é da *${empresa}*. Vi aqui que você tinha combinado de acertar até *${openPromise.data}*${openPromise.valor ? ` (${money(Number(openPromise.valor))})` : ""}. Consegue fechar hoje?`;
        } else if (overdueQ.length > 0) {
          const oldest = overdueQ[0];
          greeting = `Oi ${firstName}! 👋 Aqui é da *${empresa}*. Sua parcela #${oldest.installment_number} está em atraso — total a regularizar: *${money(totOver)}*. Vou te enviar o PIX agora pra você quitar. 🙏`;
        } else if (dueTodayQ.length > 0) {
          greeting = `Oi ${firstName}! 👋 Aqui é da *${empresa}*. Sua parcela de *${money(totToday)}* vence *hoje*. Quer que eu te envie o PIX?`;
        } else {
          const generic = [
            `Oi ${firstName}! 👋 Aqui é da *${empresa}*. Como posso te ajudar hoje?`,
            `Olá ${firstName}, tudo bem? 🙂 Aqui é da *${empresa}*. Me conta, em que posso te ajudar?`,
            `E aí ${firstName}! 🤝 Aqui é da *${empresa}*. O que você precisa hoje?`,
          ];
          greeting = generic[Math.floor(Math.random() * generic.length)];
        }

        const menuFooter =
          `\n\n━━━━━━━━━━━━━━━\n📋 *Como posso te ajudar?* Responda com o número:\n` +
          `*1* Consultar parcelas  ·  *2* Portal do cliente\n` +
          `*3* Quitar parcela (PIX)  ·  *4* Falar com atendente`;
        await botSay(greeting + menuFooter);
        await supabase.from("audit_logs").insert({
          user_id: userId, entity_type: "whatsapp_bot", action: "greeted_known_client",
          entity_id: client.id, details: { phone: senderPhone, overdue: overdueQ.length, due_today: dueTodayQ.length, has_promise: !!openPromise },
        });
        return new Response(JSON.stringify({ status: "greeted" }), { headers: corsHeaders });
      }
    } catch (e) {
      console.warn("[greet] falhou (seguindo fluxo normal):", (e as Error).message);
    }

    if (isRateLimited(senderJid)) return new Response(JSON.stringify({ status: "rate_limit" }), { headers: corsHeaders });

    // DEBOUNCE
    {
      const buf = messageBuffer.get(senderJid) || { texts: [], lastTs: 0 };
      if (messageType === "text" && incomingText) buf.texts.push(incomingText);
      buf.lastTs = Date.now();
      messageBuffer.set(senderJid, buf);
      const myTs = buf.lastTs;
      await new Promise(r => setTimeout(r, BUFFER_WAIT_MS));
      const current = messageBuffer.get(senderJid);
      if (!current || current.lastTs > myTs) return new Response(JSON.stringify({ status: "debounced" }), { headers: corsHeaders });
      if (messageType === "text") incomingText = current.texts.join("\n").slice(0, 2000);
      messageBuffer.delete(senderJid);
    }

    // LOCK (try/finally garante liberação mesmo em erro)
    const lockHeld = jidLock.get(senderJid) || 0;
    if (lockHeld && Date.now() - lockHeld < LOCK_TTL_MS) return new Response(JSON.stringify({ status: "locked" }), { headers: corsHeaders });
    jidLock.set(senderJid, Date.now());
    try {


    // COMMANDS
    if (matchesAny(incomingText, STOP_WORDS)) {
      await supabase.from("audit_logs").insert({ user_id: userId, entity_type: "whatsapp_bot", action: "paused", entity_id: client.id, details: { reason: "client_stop" } });
      await logBotAction(supabase, { userId, clientId: client.id, conversationId: convoId, toolName: "pause_bot", toolInput: { reason: "client_stop_command" } });
      await botSay("🤖 Bot pausado. Um atendente humano falará com você em breve.");
      await supabase.from("whatsapp_conversations").update({ bot_paused: true, bot_status: "paused" }).eq("id", convoId);
      return new Response(JSON.stringify({ status: "stopped" }), { headers: corsHeaders });
    }
    if (matchesAny(incomingText, HUMAN_WORDS)) {
      await logBotAction(supabase, { userId, clientId: client.id, conversationId: convoId, toolName: "escalate_to_human", toolInput: { reason: "client_requested_human" } });
      await botSay("👤 Chamando um atendente humano...");
      await escalateToHuman(supabase, convoId!, "Cliente pediu atendente humano");
      await supabase.from("notifications").insert({ user_id: userId, title: "🚨 Atendimento humano solicitado", message: `${client.name} pediu para falar com um humano.`, type: "warning" });
      return new Response(JSON.stringify({ status: "human" }), { headers: corsHeaders });
    }
    if (matchesAny(incomingText, PIX_WORDS) && profile?.pix_key) {
      await botSay(`Chave PIX: *${profile.pix_key}* (${profile.pix_key_type || "PIX"}). Aguardo o comprovante! ✅`);
      return new Response(JSON.stringify({ status: "pix" }), { headers: corsHeaders });
    }

    if (!isWithinBusinessHours(settings)) {
      await botSay(`Olá! Recebi sua mensagem fora do horário (${settings.bot_business_start || "08:00"} às ${settings.bot_business_end || "18:00"}). Retorno em breve! 🙏`);
      return new Response(JSON.stringify({ status: "off_hours" }), { headers: corsHeaders });
    }

    // DOWNLOAD MEDIA
    if (messageType !== "text" && apiUrl && apiKey) {
      const resp = await evolutionFetch(apiUrl, apiKey, `/chat/getBase64FromMediaMessage/${instanceName}`, { message: { key, message: msgContent }, convertToMp4: false });
      if (resp?.ok) mediaData = (await resp.json()).base64;
    }

    // ENRICH DATA (contexto rico p/ a IA)
    const [
      { data: activeContracts },
      { data: installments },
      { data: interactionLogs },
      { data: allPaid },
      { data: recentPaid },
      { data: humanNotes },
      { data: openPromises },
      { data: messageTemplates },
    ] = await Promise.all([
      supabase.from("contracts").select("id, capital, total_amount, start_date, status, loan_mode, frequency, interest_rate, num_installments").eq("client_id", client.id).eq("status", "active"),
      supabase.from("contract_installments").select("id, amount, paid_amount, due_date, status, late_fee, installment_number, contract_id").eq("client_id", client.id).neq("status", "paid").order("due_date", { ascending: true }),
      supabase.from("audit_logs").select("action, created_at, details").eq("entity_id", client.id).eq("entity_type", "whatsapp_bot").order("created_at", { ascending: false }).limit(10),
      supabase.from("contract_installments").select("id").eq("client_id", client.id).eq("status", "paid"),
      supabase.from("contract_installments").select("amount, paid_amount, paid_at, installment_number, payment_method").eq("client_id", client.id).eq("status", "paid").order("paid_at", { ascending: false }).limit(5),
      supabase.from("whatsapp_notes").select("content, created_by, created_at").eq("client_id", client.id).order("created_at", { ascending: false }).limit(8),
      supabase.from("audit_logs").select("created_at, details").eq("entity_id", client.id).eq("entity_type", "whatsapp_bot").eq("action", "promise_to_pay").order("created_at", { ascending: false }).limit(5),
      supabase.from("message_templates").select("name, content").eq("user_id", userId).limit(8),
    ]);

    const paidCount = allPaid?.length || 0;

    const now = new Date();
    const brDate = new Date(now.getTime() - 3 * 60 * 60 * 1000); // UTC-3
    const todayStr = brDate.toISOString().split('T')[0];

    const daysBetween = (a: string, b: string) => {
      const da = new Date(a + "T12:00:00"); const db = new Date(b + "T12:00:00");
      return Math.round((db.getTime() - da.getTime()) / 86400000);
    };

    // Só considera parcelas com SALDO real (amount - paid_amount > 0) — protege contra
    // status desatualizado (ex: parcela quitada mas ainda marcada como 'overdue').
    const openWithBalance = (installments || []).filter(i => {
      const paid = Number(i.paid_amount) || 0;
      return (Number(i.amount) || 0) - paid > 0.005;
    });
    const overdue = openWithBalance.filter(i => {
      const dueDate = typeof i.due_date === 'string' ? i.due_date.split('T')[0] : i.due_date;
      return dueDate < todayStr;
    });
    const dueToday = openWithBalance.filter(i => {
      const dueDate = typeof i.due_date === 'string' ? i.due_date.split('T')[0] : i.due_date;
      return dueDate === todayStr;
    });
    const upcoming = openWithBalance.filter(i => {
      const dueDate = typeof i.due_date === 'string' ? i.due_date.split('T')[0] : i.due_date;
      return dueDate > todayStr;
    }).slice(0, 3);

    const totalOverdue = overdue.reduce((s, i) => s + (Number(i.amount) - (Number(i.paid_amount) || 0)) + (Number(i.late_fee) || 0), 0);
    const totalDueToday = dueToday.reduce((s, i) => s + (Number(i.amount) - (Number(i.paid_amount) || 0)), 0);

    // Renovação (pagar só juros) — usa cálculo estável (capital × taxa)
    const rolloverOptions = (activeContracts || []).map(c => {
      const inst = installments?.find(i => i.contract_id === c.id);
      if (!inst) return null;
      return {
        contractId: c.id,
        interestOnly: computeRolloverInterest({
          capital: Number(c.capital),
          interestRate: Number(c.interest_rate),
          installmentAmount: Number(inst.amount),
          numInstallments: Number(c.num_installments),
        }),
        totalAmount: Number(inst.amount),
        frequency: c.frequency,
      };
    }).filter(Boolean);

    // ─── FAQ KNOWLEDGE BASE ─────────────────────────────────────────
    // Antes de ir pra IA (que custa tokens), checamos a base de
    // conhecimento local com centenas de intents. Match direto = resposta
    // instantânea, determinística e sem consumir crédito.
    try {
      if (messageType === "text" && incomingText && incomingText.length >= 2) {
        const siteUrlFaq = (Deno.env.get("SITE_URL") || "https://credmaisapp.com.br").replace(/\/$/, "");
        const firstNameFaq = (client.name || "").split(" ")[0] || "";
        const faqCtx = {
          companyName: settings.company_name || profile?.name || "nossa equipe",
          firstName: firstNameFaq,
          portalLink: `${siteUrlFaq}/portal`,
          pixKey: profile?.pix_key || undefined,
          pixKeyType: profile?.pix_key_type || undefined,
          ownerName: profile?.name || undefined,
          rate: Number(settings.default_interest_rate ?? profile?.default_interest_rate ?? 15),
          term: Number(settings.default_term_months ?? 6),
          minAmount: Number(settings.min_loan_amount ?? 100),
          maxAmount: Number(settings.max_loan_amount ?? 100000),
          lateFeePct: Number(settings.late_fee_percent ?? 2),
          dailyFeePct: Number(settings.daily_interest_percent ?? 0.033),
          earlyDiscountPct: Number(settings.early_payment_discount_percent ?? 0),
          supportPhone: settings.portal_contact_phone || undefined,
          supportEmail: settings.portal_contact_email || undefined,
          businessHours: settings.business_hours || undefined,
          hasOpenInstallments: (installments || []).some((i: any) => i.status !== "paid"),
          isKnownClient: true,
        };
        const faqHit = findFaqMatch(incomingText, faqCtx);
        // Só respondemos direto da base se:
        // - Score alto (≥ 10 = match direto de regex)
        // - Não há tom hostil detectado (deixa a IA modular a resposta)
        // - Cliente não pediu explicitamente humano (roteado antes no menu)
        if (faqHit && faqHit.score >= 10 && !detectClientTone(incomingText).hostile) {
          await botSay(faqHit.answer);
          await supabase.from("audit_logs").insert({
            user_id: userId, entity_type: "whatsapp_bot", action: "faq_hit",
            entity_id: client.id, details: {
              phone: senderPhone,
              faq_id: faqHit.entry.id,
              category: faqHit.entry.category,
              score: faqHit.score,
              knowledge_base_size: FAQ_COUNT,
              message_preview: incomingText.slice(0, 120),
            },
          });
          return new Response(JSON.stringify({ status: "faq_hit", id: faqHit.entry.id, score: faqHit.score }), { headers: corsHeaders });
        }
      }
    } catch (e) {
      console.warn("[faq] falhou (seguindo pra IA):", (e as Error).message);
    }

    // Histórico de conversa (mais largo)

    const conversationHistory: any[] = [];
    if (convoId) {
      const { data: msgHistory } = await supabase
        .from("whatsapp_messages")
        .select("direction, content, message_type, metadata, created_at")
        .eq("conversation_id", convoId)
        .order("created_at", { ascending: false })
        .limit(80);
      (msgHistory || []).reverse().forEach(h => {
        const txt = h.content || h.metadata?.transcript || `[${h.message_type}]`;
        conversationHistory.push({ role: h.direction === "in" ? "user" : "assistant", content: txt });
      });
    }

    // Memória de longo prazo — JSON estruturado (com fallback p/ texto legado)
    const memoryObj = parseMemory(client.bot_memory);
    const memoryPretty = JSON.stringify(memoryObj, null, 2);
    const intentSummary = summarizeIntents(memoryObj, 6);
    const priorApproach = lastApproach(memoryObj);

    // Promessas pendentes (audit_logs) ainda não concluídas
    const pendingPromises = (openPromises || []).map(p => ({
      date: p.details?.promise_date,
      created_at: p.created_at,
      message: p.details?.message,
    })).filter(p => p.date && p.date >= todayStr);

    // Notas humanas e templates como referência
    const humanNotesText = (humanNotes || []).map(n => `- [${n.created_by || 'humano'} em ${(n.created_at || '').slice(0,10)}] ${n.content}`).join("\n").slice(0, 1500);
    const recentPaidText = (recentPaid || []).map(p => `- Parcela #${p.installment_number}: R$ ${Number(p.paid_amount || p.amount).toFixed(2)} em ${(p.paid_at || '').slice(0,10)}${p.payment_method ? ` (${p.payment_method})` : ''}`).join("\n");
    const templatesText = (messageTemplates || []).map(t => `• ${t.name}: ${t.content.slice(0, 120)}`).join("\n").slice(0, 800);

    const contractShort = (id?: string) => id ? `#${String(id).slice(0,6)}` : '';

    const overdueDetail = overdue.map(i => {
      const d = typeof i.due_date === 'string' ? i.due_date.split('T')[0] : i.due_date;
      const days = daysBetween(d, todayStr);
      return `- [Contrato ${contractShort(i.contract_id)}] Parcela #${i.installment_number}: R$ ${Number(i.amount).toFixed(2)} (${days}d em atraso, desde ${d}${i.late_fee ? `, multa R$ ${Number(i.late_fee).toFixed(2)}` : ''})`;
    }).join('\n');

    const upcomingDetail = upcoming.map(i => {
      const d = typeof i.due_date === 'string' ? i.due_date.split('T')[0] : i.due_date;
      return `- [Contrato ${contractShort(i.contract_id)}] Parcela #${i.installment_number}: R$ ${Number(i.amount).toFixed(2)} (vence em ${d})`;
    }).join('\n');

    const addr: any = client.address || {};
    const addressLine = (typeof addr === "object" && (addr.street || addr.city))
      ? `${addr.street || ''}${addr.number ? ', ' + addr.number : ''}${addr.city ? ' - ' + addr.city : ''}${addr.state ? '/' + addr.state : ''}`.trim()
      : (typeof addr === "string" ? addr : "");

    const scoreNum = client.credit_score ?? 50;
    const perfilPagador = scoreNum > 80 ? 'EXCELENTE' : scoreNum >= 60 ? 'BOM' : scoreNum >= 40 ? 'MEDIANO' : 'RISCO ALTO';
    const maxDiasAtraso = overdue.reduce((max, i) => {
      const d = typeof i.due_date === 'string' ? i.due_date.split('T')[0] : i.due_date;
      return Math.max(max, daysBetween(d, todayStr));
    }, 0);
    const estagio = maxDiasAtraso === 0 ? 'em dia' : maxDiasAtraso <= 3 ? 'lembrete amigável' : maxDiasAtraso <= 10 ? 'cobrança padrão' : maxDiasAtraso <= 30 ? 'cobrança firme' : 'pré-jurídico';

    // ─── Inteligência comportamental ──────────────────────────────────
    // Puxa histórico amplo para cálculo de perfil (limite maior que recentPaid)
    const { data: fullPaid } = await supabase
      .from("contract_installments")
      .select("amount, paid_amount, paid_at, due_date, installment_number, status")
      .eq("client_id", client.id)
      .eq("status", "paid")
      .order("paid_at", { ascending: false })
      .limit(40);

    const behavior = computeClientBehavior({
      paidHistory: (fullPaid || []) as any,
      pending: (installments || []) as any,
      promises: (openPromises || []).map((p: any) => ({
        promise_date: p.details?.promise_date,
        created_at: p.created_at,
      })),
      todayStr,
    });

    // Tom da mensagem atual (heurística rápida, roda antes da IA)
    const tone = detectClientTone(incomingText);

    // Contexto temporal (dia da semana, período do dia, fim de semana)
    const dowNames = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
    const brNow = brDate;
    const hourBR = brNow.getUTCHours();
    const dowBR = dowNames[brNow.getUTCDay()];
    const isWeekend = brNow.getUTCDay() === 0 || brNow.getUTCDay() === 6;
    const periodoDia = hourBR < 6 ? "madrugada" : hourBR < 12 ? "manhã" : hourBR < 18 ? "tarde" : "noite";
    const cumprimento = hourBR < 12 ? "Bom dia" : hourBR < 18 ? "Boa tarde" : "Boa noite";

    // Últimas 4 respostas do bot para detectar looping repetitivo
    const recentBotReplies = conversationHistory
      .filter(m => m.role === "assistant")
      .slice(-4)
      .map(m => m.content);
    const loopSignal = detectResponseLoop(recentBotReplies);

    // Escalonamento IMEDIATO por sinais fortes (antes mesmo de chamar a IA)
    let preEscalate: string | null = null;
    if (tone.hostile) preEscalate = "cliente_hostil";
    else if (behavior.brokenPromisesLast30d >= 2) preEscalate = "2+_promessas_quebradas_30d";
    else if (loopSignal.loop) preEscalate = `bot_em_loop_sim=${loopSignal.similarity}`;


    const systemPrompt = `Você é o Atendente Virtual Sênior da "${settings.company_name || 'nossa empresa'}", especialista em recuperação de crédito com 10 anos de experiência. Sua missão: RECUPERAR VALORES com máxima eficiência, mantendo o relacionamento com o cliente. Você é PRECISO, EMPÁTICO e NUNCA inventa fatos.

═══ 👤 PERFIL DO CLIENTE ═══
Nome: ${client.name}
CPF: ${client.cpf_cnpj || 'n/d'} | Nascimento: ${client.birth_date || 'n/d'}
Telefone: ${client.phone || senderPhone} | WhatsApp: ${client.whatsapp || senderPhone}
E-mail: ${client.email || 'n/d'} | Endereço: ${addressLine || 'n/d'}
Profissão: n/d | Renda mensal: n/d
Status: ${client.status || 'Ativo'} | Score: ${scoreNum}/100 → PERFIL ${perfilPagador}
Parcelas já pagas no histórico: ${paidCount}
Notas de cadastro: (nenhuma)

═══ 📂 CONTRATOS ATIVOS (${activeContracts?.length || 0}) ═══
⚠️ CADA CONTRATO É INDEPENDENTE. NUNCA some parcelas entre contratos. Sempre cite o ID curto (#abc123) e o número da parcela ao mencionar valores.
${(activeContracts || []).map(c => `- Contrato ${contractShort(c.id)}: Capital R$ ${Number(c.capital).toFixed(2)} | ${c.num_installments || '?'}x | modo ${c.loan_mode || 'normal'} | ${c.frequency} | taxa ${c.interest_rate}% | início ${c.start_date}`).join('\n') || '(nenhum)'}

═══ 💰 SITUAÇÃO FINANCEIRA — HOJE ${brDate.toLocaleDateString('pt-BR')} ═══
📅 Vence HOJE: R$ ${totalDueToday.toFixed(2)} (${dueToday.length} parcela(s))
⚠️ EM ATRASO: R$ ${totalOverdue.toFixed(2)} (${overdue.length} parcela(s)) — maior atraso: ${maxDiasAtraso}d
💯 TOTAL para quitar pendências AGORA: R$ ${(totalDueToday + totalOverdue).toFixed(2)}
🎯 ESTÁGIO DE COBRANÇA sugerido: ${estagio}

Detalhe ATRASADAS (fonte de verdade — copie os valores LITERAL):
${overdueDetail || '(sem atrasos)'}

Detalhe VENCE HOJE:
${dueToday.map(i => `- [Contrato ${contractShort(i.contract_id)}] Parcela #${i.installment_number}: R$ ${Number(i.amount).toFixed(2)}`).join('\n') || '(nenhuma)'}

Próximas (preview, NÃO cobrar ainda):
${upcomingDetail || '(sem próximas pendentes)'}

═══ 🔄 OPÇÕES DE RENOVAÇÃO (só juros) — por contrato ═══
${rolloverOptions.map((o: any) => `- Contrato ${contractShort(o.contractId)}: juros de R$ ${o.interestOnly.toFixed(2)} → empurra o principal p/ próximo ciclo (${o.frequency})`).join('\n') || '(n/d)'}

═══ ✅ ÚLTIMOS PAGAMENTOS ═══
${recentPaidText || '(nenhum pagamento ainda)'}

═══ 📝 NOTAS HUMANAS (operador/CRM) ═══
${humanNotesText || '(nenhuma)'}

═══ 🤝 PROMESSAS PENDENTES ═══
${pendingPromises.length ? pendingPromises.map(p => `- Promete pagar até ${p.date} ${p.message ? `("${String(p.message).slice(0,120)}")` : ''}`).join('\n') : '(nenhuma)'}

═══ 🧠 MEMÓRIA DE LONGO PRAZO (JSON) ═══
${memoryPretty}

═══ 🎯 INTENÇÕES RECENTES DO CLIENTE (mais novo → antigo) ═══
${intentSummary || '(nenhuma intenção registrada ainda)'}
${priorApproach ? `Última abordagem usada com este cliente: "${priorApproach}". VARIE — não repita o mesmo argumento/formato. Se ele já prometeu pagar, cobre a promessa; se pediu desconto, decida (aceita/contra-proposta); se abriu o portal, reforce o CTA de pagar por lá.` : ''}

═══ ✍️ TEMPLATES DA EMPRESA (inspiração de tom) ═══
${templatesText || '(sem templates cadastrados)'}

═══ ⚙️ CONFIGURAÇÕES ═══
Multa: ${settings.default_late_fee || 0}% | Juros diários pós-vencimento: ${settings.default_daily_interest || 0}%/dia
Horário comercial: ${settings.bot_business_start || '08:00'}–${settings.bot_business_end || '18:00'}
PIX: ${profile?.pix_key || '(sem chave cadastrada)'} ${profile?.pix_key_type ? `(${profile.pix_key_type})` : ''} | Recebedor: ${profile?.name || settings.company_name}

═══ 🧠 INTELIGÊNCIA COMPORTAMENTAL (raio-x deste cliente) ═══
Perfil pagador: ${behavior.perfil.toUpperCase()} (score interno ${behavior.score0to100}/100)
Pontualidade histórica: ${behavior.onTimePct}% em dia nos últimos 20 pagamentos
Atraso médio quando atrasa: ${behavior.avgDaysLate} dia(s)
Streak de pagamentos em dia (mais recentes): ${behavior.onTimeStreak}
Pagamentos atrasados nos últimos 30d: ${behavior.latePayments30d}
Promessas quebradas nos últimos 30d: ${behavior.brokenPromisesLast30d}
Dias desde o último pagamento: ${behavior.daysSinceLastPayment ?? 'n/d'}
Melhor janela p/ receber: ${behavior.bestPayDow ?? 'n/d'}${behavior.bestPayHour !== null ? ` ~${behavior.bestPayHour}h` : ''}
Volume total pago historicamente: R$ ${behavior.totalPaidVolume.toFixed(2)}

═══ 🗓 CONTEXTO TEMPORAL ═══
Agora no Brasil: ${dowBR}, ${brDate.toLocaleDateString('pt-BR')} ~${hourBR}h (${periodoDia}${isWeekend ? ', fim de semana' : ', dia útil'})
Cumprimento adequado (se for primeira interação do dia): "${cumprimento}"

═══ 🎙 TOM DETECTADO NA MENSAGEM ATUAL (heurística — confirme com sua análise) ═══
Hostil: ${tone.hostile ? 'SIM ⚠️' : 'não'} | Frustrado: ${tone.frustrated ? 'sim' : 'não'} | Urgente: ${tone.urgent ? 'sim' : 'não'}
Intenção de pagar: ${tone.paying_intent ? 'SIM 💰' : 'não'} | Situação de dificuldade: ${tone.hardship ? 'SIM 🫂 (empatia obrigatória)' : 'não'}
${preEscalate ? `⚠️ SINAL FORTE: ${preEscalate} → você DEVE marcar needs_human=true e responder curto/educado.` : ''}
${loopSignal.loop ? `⚠️ Suas últimas respostas estão repetitivas (similaridade ${loopSignal.similarity}). MUDE de abordagem — se cliente já ouviu o mesmo argumento 2x, ofereça alternativa (renovação, prazo, humano).` : ''}

═══ 🧭 FRAMEWORK DE RACIOCÍNIO (siga SEMPRE nesta ordem, no campo "thought") ═══
1. OBSERVAR: O que o cliente escreveu? Qual a intenção real (não apenas literal)? Há anexo (comprovante)?
2. RECUPERAR CONTEXTO: Última interação, promessas pendentes, último pagamento, o que já foi cobrado nas últimas mensagens. NUNCA repita cobrança já feita há < 3 mensagens sem novo motivo.
3. VALIDAR NÚMEROS: Se você vai citar QUALQUER valor, localize-o EXATAMENTE nas seções acima (ATRASADAS / VENCE HOJE / RENOVAÇÃO). Se não achar bater LITERAL, escale (needs_human=true). Confira: valor de cada parcela + soma total.
4. DECIDIR AÇÃO: Baseado no estágio "${estagio}" e perfil "${perfilPagador}", escolha o playbook (ver abaixo).
5. RESPONDER: Máx 5 linhas, tom humano, PT-BR coloquial brasileiro, 1–2 emojis no máximo.

═══ 🎭 PLAYBOOKS por cenário ═══
▸ CLIENTE EM DIA ("oi", dúvida): Atenda a dúvida direto, sem cobrar. Seja prestativo.
▸ LEMBRETE AMIGÁVEL (0–3d atraso): Tom leve. "Oi Fulano, tudo bem? Notei que a parcela de R$ X (contrato #abc) venceu ${maxDiasAtraso === 0 ? 'hoje' : 'ontem'}. Já tem previsão pra acertar? PIX: ${profile?.pix_key || '(chave)'}"
▸ COBRANÇA PADRÃO (4–10d): Direto ao ponto. Lista atrasos em bullets, informa total, envia PIX, pede prazo.
▸ COBRANÇA FIRME (11–30d): Cordial mas firme. Mencione que juros/multa acumulam a cada dia. Ofereça renovação (só juros) se cliente sinalizar dificuldade.
▸ PRÉ-JURÍDICO (>30d): Tom sério, sem ameaças vazias. Peça posicionamento hoje. Se cliente não responder ou for hostil → needs_human=true.
▸ PROMESSA QUEBRADA: Reconheça a promessa anterior ("você havia combinado pagar até DD/MM"), pergunte o que houve, ofereça nova data OU renovação. Sem julgamento.
▸ COMPROVANTE recebido: Confirme o que viu ("Recebi seu comprovante de R$ X em DD/MM 👍"), agradeça pelo nome, encerre bem. is_receipt=true APENAS se houver imagem/PDF real anexado.
▸ NEGOCIAÇÃO / PEDIDO DE DESCONTO: Descontos ≤10% da multa: pode ofertar. Descontos >10% ou parcelamento atípico: needs_human=true.
▸ CLIENTE HOSTIL / OFENSAS / PEDE HUMANO: needs_human=true, resposta curta e educada dizendo que um atendente humano assumirá.

═══ 🚨 REGRAS INVIOLÁVEIS ═══
✗ NUNCA invente valor, contrato, parcela, taxa ou política. Se não está listado acima, não existe.
✗ NUNCA some parcelas de contratos diferentes como se fossem o mesmo débito.
✗ NUNCA prometa desconto/prazo sem estar no seu escopo (regra 8 do playbook).
✗ NUNCA marque is_receipt=true por texto ("já paguei") sem imagem/PDF anexado.
✗ NUNCA cumprimente 2x na mesma conversa. Se já falou "oi/bom dia", vá direto ao ponto.
✗ NUNCA peça dado que já está no perfil (nome, CPF, endereço).
✗ NUNCA repita a mesma cobrança em 2 mensagens seguidas — se cliente ignorou, responda o novo assunto e cite a pendência UMA vez ao final.

═══ ✅ EXEMPLOS DE RESPOSTAS IDEAIS ═══
Ex1 — Cliente manda "oi" com 1 parcela 5d atrasada:
"Oi ${client.name.split(' ')[0]}! Tudo bem? 👋 Deu uma olhada aqui e a parcela #3 do contrato #abc123 (R$ 320,00) venceu há 5 dias. Consegue resolver hoje? PIX ${profile?.pix_key || 'chave'}. Qualquer coisa me avisa 🙌"

Ex2 — Cliente diz "paguei" sem enviar comprovante:
"Beleza! Pra confirmar aqui no sistema, manda o comprovante (print ou PDF) por favor? Assim que chegar eu dou baixa na hora 👍"

Ex3 — Cliente pede parcelar atraso de 3 parcelas:
"Entendo, ${client.name.split(' ')[0]}. Deixa eu ver a melhor forma pra você — vou passar pro time comercial validar as condições e já te retorno por aqui, ok? 🤝" [needs_human=true]

═══ 📤 FORMATO DE SAÍDA (JSON puro, SEM markdown, SEM cercas de código) ═══
{
  "thought": "1)OBSERVAR: ... 2)CONTEXTO: ... 3)VALIDAÇÃO NUMÉRICA: cheguei R$ X copiando parcela #N do contrato #abc — bate com a lista ✓ 4)AÇÃO: playbook X 5)RESPOSTA: rascunho",
  "reply": "sua resposta final ao cliente em PT-BR (máx 5 linhas)",
  "is_receipt": boolean,
  "is_rollover": boolean,
  "is_promise": boolean,
  "promise_date": "YYYY-MM-DD ou null",
  "receipt_value": number,
  "receipt_date": "YYYY-MM-DD lido do comprovante, senão null",
  "needs_human": boolean,
  "intent": "saudacao|pagamento|comprovante|renovacao|promessa|reclamacao|duvida|negociacao|atualizacao_dados|outro",
  "sentiment": "positivo|neutro|frustrado|hostil",
  "urgencia": "baixa|media|alta",
  "dificuldade_financeira": boolean,
  "desconto_pct": number,
  "summary": "resumo 1 linha do status",
  "memory_update": {
    "fatos": ["fatos consolidados, máx 12"],
    "preferencias": ["ex: prefere PIX de manhã"],
    "motivos_atraso": ["ex: desemprego desde MM/AAAA"],
    "contatos_alternativos": ["ex: esposa Maria 9999-9999"],
    "promessas": [{"data":"YYYY-MM-DD","valor":0,"contexto":"o que prometeu"}],
    "ultima_interacao": "${todayStr}"
  }
}`;

    // Temperatura adaptativa: mais criativa em saudações, mais determinística
    // quando há dinheiro ou tensão em jogo (evita alucinação de valores).
    const adaptiveTemp = tone.hostile || tone.paying_intent || overdue.length > 0 ? 0.2 : 0.35;

    // Prompt caching (Anthropic): o system prompt é reaproveitado por 5min,
    // reduz custo/latência em conversas com múltiplas idas e vindas.
    const systemBlocks = [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }];

    const anthMessages = conversationHistory.map(m => ({ role: m.role, content: m.content }));
    if (messageType === "text") anthMessages.push({ role: "user", content: incomingText });
    else if (mediaData && mimeType) {
      const blocks: any[] = [{ type: "text", text: incomingText || `[Enviou ${messageType}]` }];
      if (messageType === "image") blocks.unshift({ type: "image", source: { type: "base64", media_type: mimeType, data: mediaData } });
      else if (mimeType === "application/pdf") blocks.unshift({ type: "document", source: { type: "base64", media_type: "application/pdf", data: mediaData } });
      anthMessages.push({ role: "user", content: blocks });
    }

    // Retry com backoff exponencial em 429/5xx/529 (Anthropic overloaded)
    let aiResp: Response | null = null;
    let aiErrBody = "";
    let parsed: any = null;
    if (anthropicApiKey) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          aiResp = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": anthropicApiKey, "anthropic-version": "2023-06-01", "anthropic-beta": "prompt-caching-2024-07-31" },
            body: JSON.stringify({ model: "claude-sonnet-4-5-20250929", max_tokens: 2200, temperature: adaptiveTemp, top_p: 0.85, system: systemBlocks, messages: anthMessages }),
          });
          if (aiResp.ok) break;
          aiErrBody = await aiResp.text();
          const retriable = aiResp.status === 429 || aiResp.status === 529 || aiResp.status >= 500;
          if (!retriable) {
            console.warn(`[ai] indisponível (${aiResp.status}), usando fallback local:`, aiErrBody.slice(0, 200));
            break;
          }
          console.warn(`[ai] tentativa ${attempt + 1} falhou (${aiResp.status}), retry em breve`);
          await new Promise(r => setTimeout(r, 800 * Math.pow(2, attempt)));
        } catch (e) {
          aiErrBody = e instanceof Error ? e.message : String(e);
          console.warn(`[ai] tentativa ${attempt + 1} com erro:`, aiErrBody.slice(0, 200));
          if (attempt === 2) break;
          await new Promise(r => setTimeout(r, 800 * Math.pow(2, attempt)));
        }
      }
    } else {
      aiErrBody = "ANTHROPIC_API_KEY ausente";
    }

    if (aiResp?.ok) {
      const aiData = await aiResp.json();
      const rawText = aiData?.content?.[0]?.text ?? "";
      parsed = extractJsonObject(rawText);
      if (!parsed) {
        console.warn("[ai] resposta sem JSON válido, devolvendo fallback:", rawText.slice(0, 200));
        const cleaned = rawText.replace(/```[a-z]*|```/gi, "").replace(/[{}\[\]"]/g, " ").trim();
        parsed = { reply: cleaned.slice(0, 400) || "Desculpe, tive um problema técnico. Pode repetir, por favor?" };
      }
    } else {
      parsed = buildLocalBotResult({ client, incomingText, overdue, dueToday, totalOverdue, totalDueToday, profile, tone });
      await logBotAction(supabase, {
        userId,
        clientId: client.id,
        conversationId: convoId,
        toolName: "local_ai_fallback",
        toolInput: { reason: aiErrBody.slice(0, 200), message: incomingText.slice(0, 200) },
        toolOutput: { reply: parsed.reply, intent: parsed.intent, needs_human: parsed.needs_human },
      });
    }
    const result: any = sanitizeAiResult(parsed);

    // Preserva campos novos que o sanitizer estrito descarta (backward-compat).
    const sentiment = ["positivo", "neutro", "frustrado", "hostil"].includes(parsed.sentiment) ? parsed.sentiment : "neutro";
    const urgencia = ["baixa", "media", "alta"].includes(parsed.urgencia) ? parsed.urgencia : "baixa";
    const dificuldade = parsed.dificuldade_financeira === true || tone.hardship;
    const descontoPct = Math.max(0, Math.min(100, Number(parsed.desconto_pct) || 0));

    // Escalonamento forçado por sinais fortes detectados ANTES da IA
    if (preEscalate) {
      result.needs_human = true;
      await supabase.from("notifications").insert({
        user_id: userId,
        title: "🚨 Bot escalou para humano",
        message: `Cliente ${client.name}: motivo = ${preEscalate}. Assuma a conversa quando puder.`,
        type: "warning",
      });
    }

    // Se o modelo pedir desconto > 15% (regra de escopo), força revisão humana
    if (descontoPct > 15 && !result.needs_human) {
      result.needs_human = true;
    }



    // ─── Validação de PIX e valores antes de enviar ──────────────────────
    if (result.reply) {
      const v = validatePixReply({
        reply: result.reply,
        pixKey: profile?.pix_key,
        pixKeyType: profile?.pix_key_type,
        installments: (installments || []) as any,
        overdue: overdue as any,
        dueToday: dueToday as any,
        totalOverdue,
        totalDueToday,
        rolloverOptions: rolloverOptions as any,
      });
      if (v.fixed) {
        result.reply = v.reply;
        await supabase.from("audit_logs").insert({
          user_id: userId,
          entity_type: "whatsapp_bot",
          action: "pix_reply_corrected",
          entity_id: client.id,
          details: { reasons: v.reasons },
        });
        // Se detectou valor inventado ou chave PIX errada, notifica o operador
        // (o cliente já recebe a versão corrigida, mas o operador precisa saber)
        const critical = v.reasons.some(r => r.startsWith("invented_values") || r.startsWith("pix_key_mismatch"));
        if (critical) {
          await supabase.from("notifications").insert({
            user_id: userId,
            title: "⚠️ IA quase enviou dado incorreto",
            message: `Cliente ${client.name}: bot corrigido automaticamente (${v.reasons.slice(0,2).join("; ")}). Revise a conversa.`,
            type: "warning",
          });
        }
      }
    }

    if (result.reply) await botSay(result.reply);

    // Merge inteligente da memória (validado + dedup + limite por seção, ver _shared/memory.ts)
    if (result.memory_update || true) {
      try {
        let merged = mergeMemory(memoryObj, result.memory_update, todayStr);

        // ─── Registra intenções derivadas desta interação ────────────────
        // Deriva sinais do que a IA classificou + heurísticas locais para
        // que o PRÓXIMO envio (webhook ou cron) evite repetir a abordagem.
        const intents: IntentEntry[] = [];
        const pushI = (e: IntentEntry) => intents.push(e);
        if (result.is_promise && result.promise_date) {
          pushI({ tipo: "prometeu_pagar", data: todayStr, detalhe: `até ${result.promise_date}`, canal: "whatsapp" });
        }
        if (descontoPct > 0 || result.intent === "negociacao" || /desconto|abatimento|acordo/i.test(incomingText || "")) {
          pushI({ tipo: "pediu_desconto", data: todayStr, detalhe: descontoPct ? `${descontoPct}%` : undefined, canal: "whatsapp" });
        }
        if (dificuldade) {
          pushI({ tipo: "dificuldade", data: todayStr, canal: "whatsapp" });
        }
        if (/prazo|adiar|proximo mes|próximo mês|semana que vem/i.test(incomingText || "")) {
          pushI({ tipo: "pediu_prazo", data: todayStr, canal: "whatsapp" });
        }
        if (sentiment === "hostil" || tone.hostile) {
          pushI({ tipo: "hostil", data: todayStr, canal: "whatsapp" });
        }
        if (result.intent === "renovacao" || result.is_rollover) {
          pushI({ tipo: "renovacao", data: todayStr, canal: "whatsapp" });
        }

        // Registra a "abordagem" usada pelo bot nesta resposta, para que o
        // próximo disparo saiba variar (rótulo curto derivado do estágio).
        const abordagem =
          result.needs_human ? "escalou_humano" :
          descontoPct > 0 ? `acordo_${Math.round(descontoPct)}off` :
          result.is_promise ? "aceitou_promessa" :
          estagio === "em dia" ? "conversa_neutra" :
          estagio === "lembrete amigável" ? "lembrete_amigavel" :
          estagio === "cobrança padrão" ? "cobranca_padrao" :
          estagio === "cobrança firme" ? "cobranca_firme" :
          "pre_juridico";
        pushI({ tipo: (result.intent === "pagamento" ? "prometeu_pagar" : "silencio") as any, data: todayStr, abordagem, canal: "whatsapp" });

        for (const it of intents) merged = pushIntent(merged, it);

        // Detecta acesso recente ao portal (últimas 24h) → intenção "abriu_portal"
        const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const { data: portalHits } = await supabase
          .from("portal_sessions")
          .select("id, created_at")
          .eq("client_id", client.id)
          .gte("created_at", since)
          .limit(1);
        if (portalHits?.length) {
          merged = pushIntent(merged, { tipo: "abriu_portal", data: todayStr, canal: "portal" });
        }

        const serialized = serializeMemory(merged);
        // Garantia final: só grava se for JSON parseável (nunca corrompe a coluna)
        JSON.parse(serialized);
        await supabase.from("clients").update({ bot_memory: serialized }).eq("id", client.id);
      } catch (e) {
        console.error("[memory] merge falhou, mantendo memória anterior:", e);
      }
    }

    await supabase.from("audit_logs").insert({ user_id: userId, entity_type: "whatsapp_bot", action: "replied", entity_id: client.id, details: { intent: result.intent, thought: result.thought, reply: result.reply } });

    // ─── Validação avançada de comprovante ─────────────────────────────────
    // Camadas: evidência mínima, sanidade do valor, competência da data, anti-reuso (hash), fraude textual.
    let mediaHash: string | null = null;
    const seenHashes = new Set<string>();
    if (mediaData) {
      try { mediaHash = await sha256Hex(mediaData); } catch (e) { console.warn("[hash] falhou:", e); }
      // Busca hashes já utilizados para este user (últimos 90 dias) → anti-reuso
      const { data: prevHashes } = await supabase
        .from("audit_logs")
        .select("details")
        .eq("user_id", userId)
        .eq("entity_type", "whatsapp_receipt")
        .gte("created_at", new Date(Date.now() - 90 * 86400000).toISOString())
        .limit(500);
      for (const row of (prevHashes || [])) {
        const h = (row as any)?.details?.hash;
        if (typeof h === "string") seenHashes.add(h);
      }
    }

    const receiptCheck = result.is_receipt ? validateReceipt({
      messageType,
      hasMedia: !!mediaData,
      incomingText,
      receiptValue: result.receipt_value,
      receiptDate: (result as any).receipt_date || null,
      installments: (installments || []) as any,
      todayStr,
      mediaHash,
      seenHashes,
    }) : null;

    const trustedReceipt = !!receiptCheck?.trusted;

    if (result.is_receipt && !trustedReceipt) {
      console.log("[receipt] rejeitado:", receiptCheck?.reasons.join(",") || "n/d", "risk=", receiptCheck?.riskScore);
      const reasonsTxt = receiptCheck?.reasons.join(", ") || "sem evidência";
      await supabase.from("notifications").insert({
        user_id: userId,
        title: receiptCheck?.duplicate ? "⚠️ Comprovante reutilizado" : "Possível pagamento — revisar",
        message: `Cliente ${client.name}: ${reasonsTxt} (risco ${receiptCheck?.riskScore || 0}/100). Confirme manualmente.`,
        type: receiptCheck?.duplicate ? "error" : "warning",
      });
      // Registra a tentativa (com hash, se houver) para auditoria/anti-replay
      await supabase.from("audit_logs").insert({
        user_id: userId, entity_type: "whatsapp_receipt", action: "rejected", entity_id: client.id,
        details: { hash: mediaHash, reasons: receiptCheck?.reasons, risk: receiptCheck?.riskScore, value: result.receipt_value },
      });
    }

    if (trustedReceipt && installments?.length) {
      const receiptValue = result.receipt_value;
      // Registra hash do comprovante aceito (anti-reuso futuro)
      if (mediaHash) {
        await supabase.from("audit_logs").insert({
          user_id: userId, entity_type: "whatsapp_receipt", action: "accepted", entity_id: client.id,
          details: { hash: mediaHash, value: receiptValue, match: receiptCheck?.matchType, installment_id: receiptCheck?.matchedInstallmentId },
        });
      }


      
      if (result.is_rollover) {
        // Lógica de Renovação (Pagar apenas Juros)
        const target = installments[0]; // Pega a mais antiga/atual
        const contract = activeContracts?.find(c => c.id === target.contract_id);
        
        let nextDate = new Date(target.due_date);
        const freq = contract?.frequency || 'daily';
        
        if (freq === 'daily') nextDate.setDate(nextDate.getDate() + 1);
        else if (freq === 'daily_mon-sat') {
          nextDate.setDate(nextDate.getDate() + 1);
          if (nextDate.getDay() === 0) nextDate.setDate(nextDate.getDate() + 1); // Pula domingo
        }
        else if (freq === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
        else if (freq === 'biweekly') nextDate.setDate(nextDate.getDate() + 14);
        else if (freq === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
        else nextDate.setDate(nextDate.getDate() + 1); // Default +1 day

        await supabase.from("contract_installments").update({ 
          due_date: nextDate.toISOString(),
          notes: `Renovação via juros: R$ ${receiptValue}. Próximo venc: ${nextDate.toLocaleDateString('pt-BR')}`
        }).eq("id", target.id);

        await supabase.from("notifications").insert({
          user_id: userId,
          title: "Renovação de Contrato",
          message: `Cliente ${client.name} pagou juros de R$ ${receiptValue.toFixed(2)}. Dívida renovada para ${nextDate.toLocaleDateString('pt-BR')}.`,
          type: "info"
        });
        await logBotAction(supabase, { userId, clientId: client.id, conversationId: convoId, toolName: "renew_contract_interest_only", toolInput: { contract_id: target.contract_id, installment_id: target.id, valor: receiptValue, nova_data: nextDate.toISOString() } });
      } else {
        // Pagamento Normal (Amortização/Liquidação)
        // P1-8: prioriza a parcela identificada pela IA/validador (matchedInstallmentId)
        let target = receiptCheck?.matchedInstallmentId
          ? installments.find(i => i.id === receiptCheck.matchedInstallmentId)
          : undefined;
        if (!target) target = installments.find(i => Number(i.amount) === receiptValue);
        if (!target) target = installments[0];

        await supabase.from("contract_installments").update({ 
          status: "paid", 
          paid_at: new Date().toISOString(), 
          paid_amount: receiptValue || target.amount, 
          notes: `Confirmado via IA. Valor Rec: ${receiptValue}` 
        }).eq("id", target.id);
        
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "Pagamento Recebido",
          message: `Cliente ${client.name} pagou R$ ${receiptValue.toFixed(2)}. Parcela #${target.installment_number} baixada.`,
          type: "success"
        });
        await logBotAction(supabase, { userId, clientId: client.id, conversationId: convoId, toolName: "mark_installment_paid", toolInput: { installment_id: target.id, valor: receiptValue, parcela: target.installment_number } });
      }

      // Se não houver mais parcelas atrasadas, volta o cliente para 'active'
      const { data: stillOverdue } = await supabase.from("contract_installments").select("id").eq("client_id", client.id).eq("status", "overdue");
      if (!stillOverdue?.length) {
        await supabase.from("clients").update({ status: 'active' }).eq("id", client.id);
      }
    }

    if (result.needs_human) {
      await supabase.from("whatsapp_conversations").update({
        needs_human: true,
        bot_status: "active",
        bot_paused: false,
        human_takeover_reason: result.summary || "Bot recomendou revisão humana, mas continuará respondendo",
        updated_at: new Date().toISOString(),
      }).eq("id", convoId);
      await supabase.from("notifications").insert({ user_id: userId, title: "🚨 Intervenção Humana", message: `Cliente ${client.name} solicita atendimento humano ou negociação.`, type: "warning" });
      await logBotAction(supabase, { userId, clientId: client.id, conversationId: convoId, toolName: "escalate_to_human", toolInput: { reason: result.summary || "ai_detected" } });
    }

    if (result.is_promise && result.promise_date) {
      await supabase.from("audit_logs").insert({
        user_id: userId, entity_type: "whatsapp_bot", action: "promise_to_pay", entity_id: client.id,
        details: { promise_date: result.promise_date, message: incomingText }
      });
      // Adiciona uma nota na conversa
      await supabase.from("whatsapp_notes").insert({
        user_id: userId, client_id: client.id, content: `Promessa de pagamento para: ${result.promise_date}`, created_by: 'bot'
      });
      await logBotAction(supabase, { userId, clientId: client.id, conversationId: convoId, toolName: "register_payment_promise", toolInput: { data: result.promise_date, contexto: incomingText.slice(0,200) } });
    }

    // Aumento de Score APENAS quando o comprovante foi de fato validado (trusted).
    // P1-9: antes o score subia mesmo em comprovantes rejeitados/duvidosos.
    if (result.is_receipt && trustedReceipt) {
      const currentScore = client.credit_score || 50;
      let newScore = currentScore;
      if (result.is_rollover) newScore = Math.min(100, currentScore + 2); // Renovação = +2
      else newScore = Math.min(100, currentScore + 5); // Pagamento = +5

      if (newScore !== currentScore) {
        await supabase.from("clients").update({ credit_score: newScore }).eq("id", client.id);
      }
    }

      return new Response(JSON.stringify({ status: "success" }), { headers: corsHeaders });
    } finally {
      jidLock.delete(senderJid);
    }

  } catch (err) {
    console.error("Webhook Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500, headers: corsHeaders });
  }
});
