// ============================================================================
// Helper compartilhado de IA.
//
// Antes chamava a API da Anthropic direto e todas as funções de IA do app
// quebravam com "Your credit balance is too low to access the Anthropic API".
// Agora o caminho padrão é o Lovable AI Gateway (OpenAI-compatible), que já é
// usado no resto do app. A Anthropic continua como reserva: se não houver
// LOVABLE_API_KEY mas houver ANTHROPIC_API_KEY, usamos a Anthropic.
//
// A assinatura pública (callAnthropic / callAnthropicJSON / ANTHROPIC_MODEL)
// foi mantida de propósito para não mexer nas 11 funções que já a importam.
// ============================================================================

export const ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929";

/** Modelo usado no Lovable AI Gateway. */
export const AI_MODEL = "google/gemini-2.5-flash";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | any[];
}

export interface CallAnthropicParams {
  system: string;
  messages: AnthropicMessage[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

/** Converte o conteúdo (string ou blocos Anthropic) para texto simples. */
function toText(content: string | any[]): string {
  if (typeof content === "string") return content;
  return (content || [])
    .map((b: any) => (typeof b === "string" ? b : b?.text || ""))
    .filter(Boolean)
    .join("\n");
}

async function callGateway(params: CallAnthropicParams, apiKey: string): Promise<string> {
  const resp = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: params.maxTokens || 1024,
      temperature: params.temperature ?? 0.7,
      messages: [
        { role: "system", content: params.system },
        ...params.messages.map((m) => ({ role: m.role, content: toText(m.content) })),
      ],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Lovable AI Gateway ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  return data?.choices?.[0]?.message?.content || "";
}

/** DeepSeek (OpenAI-compatible). */
async function callDeepSeek(params: CallAnthropicParams, apiKey: string): Promise<string> {
  const resp = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      max_tokens: params.maxTokens || 1024,
      temperature: params.temperature ?? 0.7,
      messages: [
        { role: "system", content: params.system },
        ...params.messages.map((m) => ({ role: m.role, content: toText(m.content) })),
      ],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`DeepSeek ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  return data?.choices?.[0]?.message?.content || "";
}



async function callAnthropicDirect(params: CallAnthropicParams, apiKey: string): Promise<string> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: params.model || ANTHROPIC_MODEL,
      max_tokens: params.maxTokens || 1024,
      temperature: params.temperature ?? 0.7,
      system: params.system,
      messages: params.messages,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Anthropic API ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  return data.content?.[0]?.text || "";
}

/** Chama a IA. Retorna o texto da resposta. */
export async function callAnthropic(params: CallAnthropicParams): Promise<string> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

  if (lovableKey) {
    try {
      return await callGateway(params, lovableKey);
    } catch (err) {
      if (!anthropicKey) throw err;
      console.error("Gateway falhou, tentando Anthropic:", err);
    }
  }

  if (anthropicKey) return await callAnthropicDirect(params, anthropicKey);
  throw new Error("Nenhuma chave de IA configurada (LOVABLE_API_KEY ou ANTHROPIC_API_KEY)");
}

/** Chama a IA esperando uma resposta JSON. Faz parse automático. */
export async function callAnthropicJSON<T = any>(params: CallAnthropicParams): Promise<T> {
  const text = await callAnthropic(params);
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Resposta sem JSON válido");
  return JSON.parse(match[0]) as T;
}
