import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/brevo.ts";
import { callAnthropic } from "../_shared/anthropic.ts";
import { parseMemory, summarizeIntents, lastApproach, pushIntent, serializeMemory } from "../_shared/memory.ts";
import { renderTemplate, renderMessage } from "../_shared/messageTemplate.ts";
import { assertReplySafe } from "../_shared/bot_utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EscalationRule {
  days: number;   // >0 = dias em atraso; <=0 = dias antes do vencimento (D-3 = -3)
  channel: string; // whatsapp | email | both
  template: string;
}

function generatePixCopyPaste(pixKey: string, amount: number, merchantName = "SISTEMA JUROS") {
  const gui = "000201";
  const pixGui = "0014br.gov.bcb.pix";
  const pixKeyTag = `01${pixKey.length.toString().padStart(2, "0")}${pixKey}`;
  const merchantAccountInfo = `26${(pixGui.length + pixKeyTag.length).toString().padStart(2, "0")}${pixGui}${pixKeyTag}`;
  const merchantCategory = "52040000";
  const currency = "5303986";
  const amountStr = amount.toFixed(2);
  const transactionAmount = `54${amountStr.length.toString().padStart(2, "0")}${amountStr}`;
  const countryCode = "5802BR";
  const name = merchantName.substring(0, 25).toUpperCase();
  const merchantNameTag = `59${name.length.toString().padStart(2, "0")}${name}`;
  const merchantCity = "6009SAO PAULO";
  const additionalData = "62070503***";
  const payload = `${gui}${merchantAccountInfo}${merchantCategory}${currency}${transactionAmount}${countryCode}${merchantNameTag}${merchantCity}${additionalData}6304`;
  let crc = 0xFFFF;
  for (const b of new TextEncoder().encode(payload)) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
  }
  return payload + (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
}

function buildNegotiationOffer(totalAmount: number, daysOverdue: number) {
  let discount = 0;
  let installments = 0;
  if (daysOverdue >= 60) { discount = 25; installments = 6; }
  else if (daysOverdue >= 30) { discount = 15; installments = 4; }
  else if (daysOverdue >= 15) { discount = 10; installments = 3; }
  else return null;
  const cashAmount = totalAmount * (1 - discount / 100);
  const perInstallment = totalAmount / installments;
  return {
    discount, cashAmount, installments, perInstallment,
    text: `\n\n💡 *Proposta de acordo:*\n• À vista com ${discount}% OFF: *R$ ${cashAmount.toFixed(2)}*\n• Em ${installments}x de R$ ${perInstallment.toFixed(2)}\n\nResponda *ACORDO* para negociar.`,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  // SEGURANÇA (M4): cron protegido por segredo obrigatório.
  const cronSecret = Deno.env.get("CRON_SECRET");
  const providedSecret = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret") ?? "";
  if (!cronSecret || providedSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const dayOfWeek = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][now.getDay()];

    const { data: allSettings } = await supabase.from("settings").select("*").eq("bot_enabled", true);
    if (!allSettings?.length) {
      return new Response(JSON.stringify({ message: "Nenhum bot ativo", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Plano Essencial (R$199) não inclui automações/IA — pula esses usuários.
    const { data: essencialProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("plan_tier", "essencial");
    const essencialIds = new Set((essencialProfiles ?? []).map((p: any) => p.id));

    let totalSent = 0, totalEmail = 0, totalSkipped = 0;
    const results: any[] = [];

    for (const settings of allSettings) {
      const userId = settings.user_id;
      if (essencialIds.has(userId)) {
        results.push({ user_id: userId, sent: 0, skipped: 1, errors: ["Plano Essencial: automações desativadas"] });
        continue;
      }
      const errors: string[] = [];
      let sent = 0, emailSent = 0, skipped = 0;

      const workDays = (settings.bot_work_days as string[]) || ["mon", "tue", "wed", "thu", "fri"];
      if (!workDays.includes(dayOfWeek)) {
        results.push({ user_id: userId, sent: 0, skipped: 1, errors: ["Dia não útil"] });
        continue;
      }

      const apiUrl = (settings.whatsapp_api_url || "").replace(/\/$/, "");
      const apiKey = settings.whatsapp_api_key || "";
      const instanceName = settings.whatsapp_instance || "";
      const waConfigured = apiUrl && apiKey && instanceName;

      const { count: sentToday } = await supabase
        .from("audit_logs").select("id", { count: "exact", head: true })
        .eq("user_id", userId).eq("entity_type", "auto_collection")
        .eq("action", "message_sent").gte("created_at", `${todayStr}T00:00:00Z`);

      const maxPerDay = settings.bot_max_messages_per_day ?? 50;
      if ((sentToday || 0) >= maxPerDay) {
        results.push({ user_id: userId, sent: 0, skipped: 1, errors: ["Limite diário atingido"] });
        continue;
      }
      const remaining = maxPerDay - (sentToday || 0);

      const escalationRules = (settings.bot_escalation_rules as EscalationRule[]) || [];
      if (!escalationRules.length) {
        results.push({ user_id: userId, sent: 0, skipped: 0, errors: ["Sem regras"] });
        continue;
      }

      // Régua escalonada: separamos regras de pré-vencimento (days<=0) e atraso (days>0)
      const preDueRules  = escalationRules.filter(r => Number(r.days) <= 0).sort((a,b) => a.days - b.days); // -3 antes de -1
      const overdueRules = escalationRules.filter(r => Number(r.days) >  0).sort((a,b) => b.days - a.days); // 30 antes de 3

      // Janela de leitura das parcelas — pega o maior D-N configurado (default 7)
      const maxLookAhead = preDueRules.length
        ? Math.max(7, ...preDueRules.map(r => Math.abs(Number(r.days))))
        : 0;
      const lookAheadDate = new Date(now.getTime() + maxLookAhead * 86400000).toISOString();

      // ATENÇÃO — este filtro paralisava a cobrança automática.
      //
      // Era `.eq("status", "pending")`. Só que o `auto-late-fees` roda às 03:00 e
      // marca toda parcela vencida como "overdue". A partir daí ela sumia daqui
      // para sempre: o bot só enxergava a parcela na janela entre o vencimento e
      // a virada da madrugada seguinte.
      //
      // Na prática, as réguas de 1, 3, 7, 15 e 30 dias de atraso NUNCA disparavam
      // — o bot conversava só com quem tinha acabado de vencer. Em 2026-08-05
      // eram 265 parcelas e R$ 74.459 invisíveis para a cobrança automática, a
      // mais antiga vencida desde 01/06.
      //
      // A regra correta é a mesma do painel: em aberto = não paga e não cancelada.
      const { data: installments } = await supabase
        .from("contract_installments")
        .select("id, amount, due_date, client_id, installment_number, late_fee")
        .eq("user_id", userId)
        .not("status", "in", '("paid","cancelled")')
        .lte("due_date", lookAheadDate);

      if (!installments?.length) {
        results.push({ user_id: userId, sent: 0, skipped: 0, errors: [] });
        continue;
      }

      const clientIds = [...new Set(installments.map(i => i.client_id))];
      const { data: clients } = await supabase
        .from("clients").select("id, name, phone, whatsapp, email, credit_score, bot_memory").in("id", clientIds);
      const clientMap = new Map((clients || []).map(c => [c.id, c]));

      const { data: profile } = await supabase
        .from("profiles").select("name, billing_message, pix_key, pix_key_type").eq("id", userId).single();

      const { data: templates } = await supabase
        .from("message_templates").select("*").eq("user_id", userId).eq("is_active", true);

      const companyName = settings.company_name || profile?.name || "Sistema Juros";

      // Agrupa por cliente
      const byClient = new Map<string, typeof installments>();
      for (const inst of installments) {
        const list = byClient.get(inst.client_id) || [];
        list.push(inst);
        byClient.set(inst.client_id, list);
      }

      for (const [clientId, insts] of byClient) {
        if (sent + emailSent >= remaining) break;
        const client = clientMap.get(clientId);
        if (!client) continue;

        const phone = client.whatsapp || client.phone;
        const email = client.email;

        // Descobre parcela mais atrasada OU mais próxima do vencimento
        let selectedDays = -9999;   // valor "dias em atraso" (negativo = pré-vencimento)
        let selectedInst = insts[0];
        for (const i of insts) {
          const days = Math.floor((now.getTime() - new Date(i.due_date).getTime()) / 86400000);
          if (days > selectedDays) { selectedDays = days; selectedInst = i; }
        }

        // Escolhe a regra: se está em atraso, usa a maior faixa vencida atingida;
        // caso contrário, tenta bater com uma regra pré-vencimento (D-N).
        let matchingRule: EscalationRule | undefined;
        let isPreDue = false;
        if (selectedDays > 0) {
          matchingRule = overdueRules.find(r => selectedDays >= r.days);
        } else {
          // pré-vencimento — só dispara EXATAMENTE no dia D-N configurado
          const daysUntilDue = Math.abs(selectedDays); // 0,1,2,3...
          matchingRule = preDueRules.find(r => Math.abs(Number(r.days)) === daysUntilDue);
          isPreDue = !!matchingRule;
        }
        if (!matchingRule) continue;

        // Intervalo mínimo entre duas mensagens para o MESMO cliente.
        //
        // Antes era fixo no código (20h antes do vencimento; 5h a partir de 30
        // dias de atraso, o que permitia ~4 mensagens por dia para a mesma
        // pessoa) e o campo "Intervalo entre cobranças (h)" de Configurações
        // nunca era lido — o operador ajustava um número que não ajustava nada.
        //
        // Agora o valor configurado manda. A severidade continua encurtando o
        // intervalo, mas nunca abaixo da metade do que foi configurado, para
        // "24h" não virar 5h sem o operador saber.
        const configurado = Number(settings.bot_retry_interval_hours) || 24;
        const pisoSeveridade = Math.max(1, Math.ceil(configurado / 2));
        const cooldownHours = isPreDue
          ? configurado
          : selectedDays >= 30 ? pisoSeveridade
          : selectedDays >= 8 ? Math.max(pisoSeveridade, Math.ceil(configurado * 0.75))
          : configurado;
        const cutoff = new Date(now.getTime() - cooldownHours * 3600000).toISOString();

        const { data: alreadySent } = await supabase
          .from("audit_logs").select("id, created_at, details")
          .eq("user_id", userId).eq("entity_type", "auto_collection")
          .eq("entity_id", clientId).order("created_at", { ascending: false }).limit(5);
        const withinCooldown = alreadySent?.find(r => new Date(r.created_at as string).getTime() >= new Date(cutoff).getTime());
        if (withinCooldown) { skipped++; continue; }
        // Últimas mensagens enviadas — para banir repetição no prompt
        const recentSentTexts: string[] = (alreadySent || [])
          .map(r => (r.details as any)?.message_preview)
          .filter((s: any) => typeof s === "string" && s.length > 0)
          .slice(0, 3);

        const { data: history } = await supabase
          .from("contract_installments").select("status, paid_at, due_date")
          .eq("user_id", userId).eq("client_id", clientId)
          .order("due_date", { ascending: false }).limit(20);

        // "Parar ao detectar pagamento": o campo existia em Configurações e nunca
        // era lido. Se o cliente pagou alguma parcela desde a última cobrança, ele
        // está respondendo — insistir é o caminho mais curto para irritar quem já
        // está pagando. Só vale quando o operador liga a opção.
        if (settings.bot_stop_on_payment !== false) {
          const ultimaCobranca = alreadySent?.[0]?.created_at as string | undefined;
          if (ultimaCobranca) {
            const pagouDepois = history?.some(
              (h) => h.paid_at && new Date(h.paid_at).getTime() > new Date(ultimaCobranca).getTime(),
            );
            if (pagouDepois) { skipped++; continue; }
          }
        }

        const paidCount = history?.filter(h => h.status === "paid").length || 0;
        const lateCount = history?.filter(h =>
          h.status === "paid" && h.paid_at && new Date(h.paid_at) > new Date(h.due_date)
        ).length || 0;
        const totalHist = history?.length || 0;
        const reliability = totalHist ? Math.round((paidCount / totalHist) * 100) : 0;

        // Juros diário composto (4% a.d. padrão) calculado ao vivo — nunca depende
        // apenas do late_fee gravado, que pode estar desatualizado.
        const liveLateFee = (i: any) => {
          const base = Number(i.amount) || 0;
          const due = new Date(String(i.due_date).slice(0, 10) + "T00:00:00");
          const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
          const days = Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86400000));
          if (!base || days <= 0) return Number(i.late_fee) || 0;
          const rate = (Number(i.daily_interest_percent) > 0 ? Number(i.daily_interest_percent) : 4) / 100;
          const fee = Math.round(base * (Math.pow(1 + rate, days) - 1) * 100) / 100;
          return Math.max(fee, Number(i.late_fee) || 0);
        };
        const totalLateFees = insts.reduce((s, i) => s + liveLateFee(i), 0);
        const totalAmount = insts.reduce((s, i) => s + Number(i.amount) + liveLateFee(i), 0);
        // A taxa aparecia como "4% ao dia" escrito à mão na mensagem e no
        // prompt da IA, enquanto o cálculo já usava a taxa do contrato. Hoje os
        // 74 contratos em atraso são todos 4%, então o número está certo — mas
        // no dia em que uma taxa mudar, o cliente receberia por escrito um
        // percentual que não é o dele. Aqui o texto passa a sair do dado.
        const taxasNoLote = [...new Set(insts.map((i: any) => Number(i.daily_interest_percent) > 0 ? Number(i.daily_interest_percent) : 4))];
        const taxaTexto = taxasNoLote.length === 1
          ? `${String(taxasNoLote[0]).replace(".", ",")}% ao dia`
          : "juros diários do contrato";
        let message = "";
        const daysOverdue = Math.max(0, selectedDays);
        const daysUntilDue = Math.max(0, -selectedDays);

        // ─── Memória de intenções do cliente ─────────────────────────────
        // Personaliza o próximo envio: se prometeu pagar, cobre a promessa;
        // se pediu desconto, ofereça um acordo; se abriu o portal, chame
        // para pagar por lá; nunca repita a mesma abordagem duas vezes.
        const clientMemory = parseMemory((client as any).bot_memory);
        const intentSummary = summarizeIntents(clientMemory, 5);
        const priorApproach = lastApproach(clientMemory);
        const intentsList = Array.isArray(clientMemory.intencoes) ? clientMemory.intencoes : [];
        const has = (t: string) => intentsList.some((i: any) => i && i.tipo === t);
        const promiseIntent = intentsList.find((i: any) => i && i.tipo === "prometeu_pagar");
        const personalizations: string[] = [];
        if (has("prometeu_pagar") && promiseIntent) personalizations.push(`Cliente PROMETEU pagar (registro ${promiseIntent.data}${promiseIntent.detalhe ? " – " + promiseIntent.detalhe : ""}). Cobre a promessa com respeito, sem repetir a mesma frase.`);
        if (has("pediu_desconto")) personalizations.push("Cliente JÁ PEDIU DESCONTO — vá direto ao acordo, sem retórica.");
        if (has("dificuldade")) personalizations.push("Cliente sinalizou DIFICULDADE FINANCEIRA — tom empático, ofereça parcelar.");
        if (has("abriu_portal")) personalizations.push("Cliente ABRIU O PORTAL recentemente — reforce o CTA de pagar pelo portal, não repita o link.");
        if (has("hostil")) personalizations.push("Cliente ficou HOSTIL — desarme, seja curto, ofereça falar com humano.");
        if (has("pediu_prazo")) personalizations.push("Cliente PEDIU PRAZO antes — proponha data concreta, não repita a pergunta.");

        // Escolhe uma nova abordagem — DIFERENTE da última usada
        const stageApproach = isPreDue ? "lembrete_amigavel"
          : selectedDays >= 30 ? "cobranca_firme"
          : selectedDays >= 15 ? "acordo_desconto"
          : selectedDays >= 7 ? "cobranca_padrao"
          : "cobranca_padrao";
        // Escolhe uma nova abordagem — DIFERENTE das últimas usadas
        const approachPool: Record<string, string[]> = {
          lembrete_amigavel: ["lembrete_amigavel", "pergunta_confirmacao", "aviso_curto", "cta_portal"],
          cobranca_firme: ["cobranca_firme", "proposta_acordo", "ultimatum_educado", "escalonamento_juridico"],
          acordo_desconto: ["acordo_desconto", "condicao_especial", "parcelamento_flex", "desconto_a_vista"],
          cobranca_padrao: ["cobranca_padrao", "opcao_parcelar", "pergunta_previsao", "cta_portal"],
        };
        const recentApproaches = (intentsList || [])
          .map((i: any) => i && typeof i.abordagem === "string" ? i.abordagem : null)
          .filter(Boolean).slice(0, 3) as string[];
        const pool = approachPool[stageApproach] || [stageApproach];
        const candidates = pool.filter(a => !recentApproaches.includes(a));
        const nextApproach = (candidates.length ? candidates : pool)[
          Math.floor(Math.random() * (candidates.length ? candidates.length : pool.length))
        ];

        // ── Anti-repetição: helpers Jaccard ────────────────────────────
        const cleanTxt = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9áéíóúàãõâêîôûç ]+/gi, " ").replace(/\s+/g, " ").trim();
        const jaccard = (a: string, b: string) => {
          const A = new Set(cleanTxt(a).split(" ").filter(Boolean));
          const B = new Set(cleanTxt(b).split(" ").filter(Boolean));
          if (!A.size || !B.size) return 0;
          const inter = [...A].filter(x => B.has(x)).length;
          const uni = new Set([...A, ...B]).size;
          return uni ? inter / uni : 0;
        };
        const maxSimVs = (candidate: string) =>
          recentSentTexts.length ? Math.max(...recentSentTexts.map(t => jaccard(candidate, t))) : 0;

        if (settings.bot_use_ai && anthropicKey) {
          const tone = settings.bot_tone || "profissional";
          const severity = isPreDue ? "AMIGÁVEL — só um lembrete gentil"
            : selectedDays >= 30 ? "FIRME e direta"
            : selectedDays >= 15 ? "assertiva mas respeitosa"
            : selectedDays >= 7 ? "preocupada e clara"
            : "amigável e gentil";
          const buildPrompt = (extraDiversity: string) => `Gere mensagem WhatsApp personalizada:
CLIENTE: ${client.name}
${isPreDue ? `PARCELA VENCE EM ${daysUntilDue} DIA(S)` : `PARCELA EM ATRASO: ${daysOverdue} DIA(S)`}
VALOR TOTAL ATUALIZADO (com juros de atraso): R$ ${totalAmount.toFixed(2)} (${insts.length} parcela(s))
${totalLateFees > 0 ? `JUROS DE ATRASO JÁ INCLUÍDOS: R$ ${totalLateFees.toFixed(2)} (${taxaTexto}) — SEMPRE informe o valor total atualizado com os juros.` : ""}
SCORE: ${client.credit_score ?? 100}/100
HISTÓRICO: ${paidCount}/${totalHist} pagas (${reliability}% confiabilidade)
INTENÇÕES RECENTES:
${intentSummary || '(nenhuma)'}
ABORDAGEM DESTA MENSAGEM: "${nextApproach}" (últimas usadas: ${recentApproaches.join(", ") || "nenhuma"} — NÃO repita).
${recentSentTexts.length ? `MENSAGENS JÁ ENVIADAS RECENTEMENTE (PROIBIDO REPETIR frases, aberturas, estruturas ou palavras marcantes destas):\n${recentSentTexts.map((t, i) => `#${i + 1}: ${t.slice(0, 260)}`).join("\n")}\nEscreva algo VISIVELMENTE diferente: outra abertura, outra ordem, outro tom, outro CTA.` : ""}
${personalizations.length ? "AJUSTES OBRIGATÓRIOS:\n- " + personalizations.join("\n- ") : ""}
${isPreDue ? "Apenas LEMBRE, sem cobrar. Sugira o pagamento antecipado via PIX." : ""}
${settings.bot_negotiation_enabled && selectedDays >= 15 ? "MENCIONE proposta de acordo abaixo." : ""}
${extraDiversity}`;
          const systemPrompt = `Você é especialista em recuperação de crédito da empresa ${companyName}. Tom: ${tone}. Severidade atual: ${severity}. NUNCA diga que é uma IA. Use português brasileiro. Máximo 4 linhas curtas. Emojis discretos (1-2). Gere APENAS o texto da mensagem, sem aspas, sem comentários. REGRA CRÍTICA: cada mensagem precisa ser NOVA — nunca repita aberturas ("Olá X,", "Identificamos…"), nem estrutura, nem frases das mensagens anteriores desse cliente.`;
          try {
            message = await callAnthropic({
              system: systemPrompt,
              messages: [{ role: "user", content: buildPrompt("") }],
              temperature: 0.85, maxTokens: 400,
            });
            message = (message || "").trim();
            // Se ficou muito parecido com envios anteriores → regenerar com mais diversidade
            if (message && maxSimVs(message) >= 0.5) {
              const retry = await callAnthropic({
                system: systemPrompt,
                messages: [{ role: "user", content: buildPrompt("A mensagem gerada anteriormente ficou parecida com envios passados. REESCREVA do zero com abertura diferente, verbos diferentes, ordem diferente e outro CTA.") }],
                temperature: 1.0, maxTokens: 400,
              });
              const retryTxt = (retry || "").trim();
              if (retryTxt && maxSimVs(retryTxt) < maxSimVs(message)) message = retryTxt;
            }

            // Guarda-corpo antes de enviar. O webhook do WhatsApp já validava a
            // resposta da IA; o disparo automático não validava nada — e aqui o
            // texto vai direto para o devedor, assinado com o nome do credor.
            // Bloqueia principalmente vazamento de dado de OUTRO cliente e oferta
            // de acordo quando a negociação está desligada.
            if (message) {
              const guarda = assertReplySafe({
                reply: message,
                currentClient: client,
                otherClientsSample: (clients || []).filter((c: any) => c.id !== client.id).slice(0, 25),
                negotiationEnabled: !!settings.bot_negotiation_enabled,
              } as any);
              if (guarda.block) {
                console.warn(`[auto-collection] mensagem da IA bloqueada (${guarda.reasons.join(", ")}) — usando o texto padrão`);
                // Campos de `audit_logs` num insert de `bot_actions_log`: o
                // registro era recusado e o bloqueio da IA não deixava rastro.
                await supabase.from("bot_actions_log").insert({
                  user_id: userId, client_id: client.id,
                  tool_name: "ai_reply_blocked", success: false,
                  tool_input: { origem: "auto_collection" },
                  tool_output: { reasons: guarda.reasons, preview: message.slice(0, 200) },
                }).then(() => {}, () => {});
                message = ""; // cai no template/mensagem padrão logo abaixo
              }
            }
          } catch (aiErr) { console.error("Anthropic fail:", aiErr); }
        }


        if (!message) {
          // Variáveis disponíveis para QUALQUER texto configurável desta mensagem.
          // Antes cada trecho substituía um subconjunto diferente: o template
          // trocava 5 variáveis mas só em {chaves} (e a tela ensina [colchetes],
          // então os 8 templates prontos chegavam literais ao cliente), a saudação
          // trocava 2, e a mensagem de encerramento não trocava nenhuma.
          const varsMensagem = {
            nome: client.name,
            empresa: companyName,
            valor: `R$ ${totalAmount.toFixed(2)}`,
            parcelas: String(insts.length),
            dias: String(isPreDue ? daysUntilDue : daysOverdue),
            numero: insts[0]?.installment_number != null ? String(insts[0].installment_number) : "",
            parcela: insts[0]?.installment_number != null ? String(insts[0].installment_number) : "",
            data: insts[0]?.due_date ? new Date(insts[0].due_date).toLocaleDateString("pt-BR") : "",
            juros: `R$ ${totalLateFees.toFixed(2)}`,
            pix: profile?.pix_key ?? "",
            // Link genérico do portal: o cliente entra com CPF + data de
            // nascimento. Esta função não emite token de sessão, e mandar um
            // link com token por disparo automático aumentaria a exposição —
            // o token abre o dossiê inteiro para quem receber a mensagem.
            portal: `${(Deno.env.get("SITE_URL") ?? "https://www.credmaisapp.com.br").replace(/\/+$/, "")}/portal-cliente`,
          };

          const template = templates?.find(t => t.name.toLowerCase().includes(matchingRule.template.toLowerCase()));
          if (template) {
            const r = renderTemplate(template.content, varsMensagem);
            message = r.texto;
            if (r.desconhecidas.length) {
              console.warn(`[auto-collection] template "${template.name}" usa variáveis inexistentes:`, r.desconhecidas);
            }
          } else {
            const baseGreet = settings.bot_greeting_message
              ? renderMessage(settings.bot_greeting_message, varsMensagem)
              : `Olá ${client.name}`;
            // Rotaciona aberturas para NÃO repetir a mesma mensagem toda vez
            const greetVariants = isPreDue
              ? [`${baseGreet}, tudo bem?`, `Oi ${client.name}!`, `${client.name}, passando rapidinho aqui.`, `E aí, ${client.name}?`]
              : [`${baseGreet},`, `${client.name}, tudo certo?`, `Oi ${client.name},`, `${client.name}, precisamos alinhar um ponto.`];
            const bodyPreVariants = [
              `⏰ Só um lembrete: sua parcela de R$ ${totalAmount.toFixed(2)} vence em ${daysUntilDue} dia(s).`,
              `📅 Passando pra avisar: vencimento em ${daysUntilDue} dia(s) — R$ ${totalAmount.toFixed(2)}.`,
              `💡 Falta ${daysUntilDue} dia(s) pra sua parcela de R$ ${totalAmount.toFixed(2)}.`,
              `🔔 Aviso rápido: R$ ${totalAmount.toFixed(2)} programado(s) daqui a ${daysUntilDue} dia(s).`,
            ];
            const bodyOverVariants = [
              `Identificamos ${insts.length} parcela(s) pendente(s) — R$ ${totalAmount.toFixed(2)}. Atraso de ${daysOverdue} dia(s).`,
              `Está com ${insts.length} parcela(s) em aberto totalizando R$ ${totalAmount.toFixed(2)} (${daysOverdue} dia(s) em atraso).`,
              `Pendência: R$ ${totalAmount.toFixed(2)} em ${insts.length} parcela(s), ${daysOverdue} dia(s) sem pagamento.`,
              `Verificamos aqui: R$ ${totalAmount.toFixed(2)} em atraso há ${daysOverdue} dia(s).`,
            ];
            // A mensagem de encerramento não passava por substituição nenhuma:
            // quem escrevesse "Att, {empresa}" mandava "Att, {empresa}" ao cliente.
            const closing = settings.bot_closing_message
              ? renderMessage(settings.bot_closing_message, varsMensagem)
              : "Qualquer dúvida, chama aqui.";
            const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
            if (isPreDue) {
              message = `${pick(greetVariants)}\n\n${pick(bodyPreVariants)}\nSe preferir, já deixe o pagamento agendado.`;
            } else {
              message = `${pick(greetVariants)}\n\n${pick(bodyOverVariants)}\n\n${closing}`;
            }
          }
          // Variação por intenção no template básico (evita eco literal)
          if (has("prometeu_pagar") && promiseIntent) {
            message += `\n\nVocê havia combinado pagar em ${promiseIntent.data}${promiseIntent.detalhe ? " (" + promiseIntent.detalhe + ")" : ""}. Conseguiu se organizar?`;
          } else if (has("pediu_desconto")) {
            message += `\n\nComo você comentou sobre condição especial, posso avaliar um acordo — me diga se prefere à vista com desconto ou parcelar.`;
          } else if (has("dificuldade")) {
            message += `\n\nSei que o momento tá difícil — se puder pagar hoje uma parte, já ajuda. Me chame que a gente combina.`;
          } else if (has("abriu_portal")) {
            message += `\n\n(Vi que você abriu o portal recentemente — se precisar de ajuda pra concluir, me chama por aqui.)`;
          }
          // Detalhamento dos juros de atraso sempre visível
          if (totalLateFees > 0 && !/juros/i.test(message)) {
            const principal = totalAmount - totalLateFees;
            message += `\n\nDetalhe: parcela(s) R$ ${principal.toFixed(2)} + juros de atraso R$ ${totalLateFees.toFixed(2)} (${taxaTexto} · ${daysOverdue} dia(s))\nTotal atualizado: R$ ${totalAmount.toFixed(2)}`;
          }
        }


        if (!isPreDue && settings.bot_negotiation_enabled) {
          const offer = buildNegotiationOffer(totalAmount, daysOverdue);
          if (offer) message += offer.text;
        }

        if (settings.bot_send_pix && profile?.pix_key) {
          try {
            const pixCode = generatePixCopyPaste(profile.pix_key, totalAmount, companyName);
            message += `\n\n💳 *PIX para pagamento*\nChave: ${profile.pix_key}\n\n*Copia e Cola:*\n\`${pixCode}\``;
          } catch { message += `\n\n💰 PIX: ${profile.pix_key}`; }
        }

        let waOk = false;
        if (waConfigured && phone && (matchingRule.channel === "whatsapp" || matchingRule.channel === "both" || !matchingRule.channel)) {
          const cleanPhone = phone.replace(/\D/g, "");
          const recipient = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
          try {
            const sendResp = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
              method: "POST",
              headers: { "Content-Type": "application/json", apikey: apiKey },
              body: JSON.stringify({ number: recipient, text: message }),
            });
            if (sendResp.ok) {
              waOk = true; sent++;
              await supabase.from("audit_logs").insert({
                user_id: userId, entity_type: "auto_collection", action: "message_sent",
                entity_id: clientId,
                details: {
                  client_name: client.name, phone: recipient, channel: "whatsapp",
                  rule: matchingRule, days_overdue: daysOverdue, days_until_due: daysUntilDue,
                  pre_due: isPreDue, amount: totalAmount, reliability, ai_generated: !!settings.bot_use_ai,
                  approach: nextApproach,
                  message_preview: (message || "").slice(0, 400),
                },
              });
              // Registra a abordagem usada NA MEMÓRIA do cliente (evita repetir no próximo cron)
              try {
                const todayStr = new Date().toISOString().slice(0, 10);
                const memUpd = pushIntent(clientMemory, {
                  tipo: "silencio", // será atualizado pela resposta do cliente, se houver
                  data: todayStr,
                  abordagem: nextApproach,
                  canal: "whatsapp",
                  detalhe: `${isPreDue ? `pré ${daysUntilDue}d` : `atraso ${daysOverdue}d`} R$${totalAmount.toFixed(2)}`,
                });
                await supabase.from("clients").update({ bot_memory: serializeMemory(memUpd) }).eq("id", clientId);
              } catch (memErr) { console.error("[memory] auto-collection push failed:", memErr); }
            } else { errors.push(`${client.name}: ${await sendResp.text()}`); }
          } catch (err) { errors.push(`${client.name}: ${err instanceof Error ? err.message : "Erro envio"}`); }
        }

        const shouldEmail = email && (
          matchingRule.channel === "email" || matchingRule.channel === "both" ||
          (!waOk && !waConfigured) || (!waOk && daysOverdue >= 15) || daysOverdue >= 30
        );

        if (shouldEmail) {
          const subject = isPreDue
            ? `⏰ Lembrete: parcela vence em ${daysUntilDue} dia(s) - ${companyName}`
            : daysOverdue >= 30
              ? `⚠️ Pendência ${daysOverdue} dias em atraso - ${companyName}`
              : `Lembrete de pagamento - ${companyName}`;
          const html = `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px">
              <h2 style="color:#1e293b">Olá, ${client.name}</h2>
              <div style="background:white;padding:20px;border-radius:8px;border:1px solid #e5e7eb;white-space:pre-wrap;line-height:1.6;color:#334155">${message.replace(/</g, "&lt;")}</div>
              <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:24px">Mensagem automática de ${companyName}.</p>
            </div>`;
          try {
            const res = await sendEmail({ to: [{ email, name: client.name }], subject, htmlContent: html });
            if (!res.error) {
              emailSent++;
              await supabase.from("audit_logs").insert({
                user_id: userId, entity_type: "auto_collection", action: "message_sent",
                entity_id: clientId,
                details: {
                  client_name: client.name, email, channel: "email",
                  rule: matchingRule, days_overdue: daysOverdue, days_until_due: daysUntilDue,
                  pre_due: isPreDue, amount: totalAmount, reliability, ai_generated: !!settings.bot_use_ai,
                  approach: nextApproach,
                  message_preview: (message || "").slice(0, 400),
                },
              });
            } else { errors.push(`${client.name} (email): ${JSON.stringify(res.error).slice(0, 120)}`); }
          } catch (err) { errors.push(`${client.name} (email): ${err instanceof Error ? err.message : "Erro"}`); }
        }
      }

      totalSent += sent; totalEmail += emailSent; totalSkipped += skipped;
      results.push({ user_id: userId, sent, email_sent: emailSent, skipped, errors });

      if ((sent + emailSent) > 0 && settings.bot_notify_owner) {
        await supabase.from("notifications").insert({
          user_id: userId,
          message: `🤖 Bot: ${sent} WhatsApp + ${emailSent} email enviados${settings.bot_use_ai ? " (IA)" : ""}.`,
          type: "collection_auto", from: "Bot de Cobranças", link: "/auditoria",
        });
      }
    }

    return new Response(
      JSON.stringify({ message: "Sucesso", total_sent: totalSent, total_email: totalEmail, total_skipped: totalSkipped, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("auto-collection error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
