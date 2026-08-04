import { supabase } from "@/integrations/supabase/client";

/**
 * Registra erros de front-end na tabela `client_errors`, para o dono do app
 * enxergar em /admin → Logs em vez de depender de cliente reclamando.
 *
 * Três cuidados, porque isto roda justamente quando algo já deu errado:
 *  - nunca lança: uma falha ao reportar não pode virar um segundo erro;
 *  - deduplica: um erro em laço de render dispararia centenas de escritas;
 *  - tem teto por sessão, para que uma página quebrada não vire enxurrada.
 */
const JANELA_DEDUPE_MS = 60_000;
const TETO_POR_SESSAO = 20;

const jaReportado = new Map<string, number>();
let enviadosNestaSessao = 0;

/** Assinatura estável do erro: mesma mensagem na mesma rota = mesmo problema. */
function assinatura(mensagem: string, rota: string): string {
  return `${rota}::${mensagem.slice(0, 200)}`;
}

function deveReportar(chave: string): boolean {
  if (enviadosNestaSessao >= TETO_POR_SESSAO) return false;

  const agora = Date.now();
  const visto = jaReportado.get(chave);
  if (visto && agora - visto < JANELA_DEDUPE_MS) return false;

  jaReportado.set(chave, agora);
  // Limpa entradas velhas para o mapa não crescer numa sessão longa
  for (const [k, t] of jaReportado) {
    if (agora - t > JANELA_DEDUPE_MS) jaReportado.delete(k);
  }
  return true;
}

export interface ContextoErro {
  origem: "error-boundary" | "window-error" | "promise-rejeitada" | "manual";
  [k: string]: unknown;
}

export async function reportError(
  erro: unknown,
  contexto: ContextoErro = { origem: "manual" },
): Promise<void> {
  try {
    const e = erro instanceof Error ? erro : new Error(String(erro));
    const mensagem = `${e.name}: ${e.message}`.slice(0, 2000);
    const rota = typeof window !== "undefined" ? window.location.pathname : "";

    if (!deveReportar(assinatura(mensagem, rota))) return;
    enviadosNestaSessao++;

    // Erro de chunk após deploy é ruído conhecido: o app já se recupera sozinho
    // recarregando, então não polui o painel com isso.
    if (/dynamically imported module|ChunkLoadError|Loading chunk/i.test(mensagem)) return;

    const { data } = await supabase.auth.getSession();

    await supabase.from("client_errors").insert({
      user_id: data.session?.user?.id ?? null,
      rota,
      mensagem,
      pilha: e.stack?.slice(0, 8000) ?? null,
      navegador: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 400) : null,
      contexto: contexto as any,
    });
  } catch {
    // Silêncio proposital: reportar erro nunca pode quebrar a tela.
  }
}

/** Liga os capturadores globais. Chamado uma vez, no boot do app. */
export function instalarCapturaDeErros() {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (ev) => {
    void reportError(ev.error ?? ev.message, {
      origem: "window-error",
      arquivo: (ev as ErrorEvent).filename,
      linha: (ev as ErrorEvent).lineno,
    });
  });

  window.addEventListener("unhandledrejection", (ev) => {
    void reportError((ev as PromiseRejectionEvent).reason, { origem: "promise-rejeitada" });
  });
}
