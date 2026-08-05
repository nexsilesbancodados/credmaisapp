import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLES = [
  "clients", "contracts", "contract_installments", "transactions",
  "expenses", "profits", "goals", "notes", "todos", "settings",
  "collectors", "collector_assignments", "vehicles", "rentals", "stock_items",
];

// ── Retenção ────────────────────────────────────────────────────────────────
// O backup rodava desde abril sem nunca apagar nada: 2.349 arquivos e 100 MB
// acumulados, crescendo junto com a carteira. Guardamos os últimos 30 dias
// inteiros e, para trás disso, só o arquivo do dia 1º de cada mês.
const DIAS_COMPLETOS = 30;

/** Decide se um backup deve ser mantido, a partir do nome `AAAA-MM-DD.json`. */
export function deveManter(nomeArquivo: string, hoje: Date): boolean {
  const data = nomeArquivo.replace(/\.json$/i, "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return true; // formato estranho: não mexe

  const d = new Date(`${data}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return true;

  const diasAtras = Math.floor((hoje.getTime() - d.getTime()) / 86400000);
  if (diasAtras < 0) return true;                  // data futura: não mexe
  if (diasAtras <= DIAS_COMPLETOS) return true;    // janela recente: mantém tudo
  return data.endsWith("-01");                     // mais antigo: só o dia 1º
}

/**
 * Apaga backups fora da política de retenção. Devolve quantos removeu.
 * Com `apenasConferir`, não apaga nada — só conta. Apagar backup é irreversível,
 * então existe um jeito de ver o estrago antes de causá-lo.
 */
async function aplicarRetencao(
  supabase: any,
  userId: string,
  hoje: Date,
  apenasConferir = false,
): Promise<number> {
  const { data: arquivos, error } = await supabase.storage
    .from("backups")
    .list(userId, { limit: 1000 });
  if (error || !arquivos) return 0;

  const remover = arquivos
    .filter((a: any) => a.name && !deveManter(a.name, hoje))
    .map((a: any) => `${userId}/${a.name}`);

  if (!remover.length) return 0;
  if (apenasConferir) return remover.length;

  const { error: delErr } = await supabase.storage.from("backups").remove(remover);
  return delErr ? 0 : remover.length;
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

  // ?conferir=1 → não grava backup novo, não apaga nada, só relata o que a
  // retenção removeria. Serve para inspecionar antes de deixar rodar de verdade.
  const apenasConferir = new URL(req.url).searchParams.get("conferir") === "1";

  // TRAVA DE SEGURANÇA — apagar backup é irreversível.
  //
  // O backup roda todo dia; a limpeza NÃO roda sozinha. Enquanto
  // `BACKUP_RETENTION_ENABLED` não for definido como "1" nos secrets, esta
  // função só GRAVA: nenhum arquivo é removido, nem por retenção nem por
  // pasta órfã. Assim o comportamento padrão é acumular — que desperdiça
  // espaço, mas nunca perde histórico.
  //
  // Para ligar: defina o secret e rode antes com ?conferir=1 para ver o que
  // sairia.
  const limpezaAutorizada = Deno.env.get("BACKUP_RETENTION_ENABLED") === "1";
  const podeApagar = limpezaAutorizada && !apenasConferir;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("is_blocked", false);

    const agora = new Date();
    const today = agora.toISOString().split("T")[0];
    let backedUp = 0;
    let removidosPorRetencao = 0;
    const errors: string[] = [];

    for (const p of profiles || []) {
      try {
        if (!apenasConferir) {
          const dump: Record<string, unknown[]> = {};
          for (const t of TABLES) {
            const { data } = await supabase.from(t).select("*").eq("user_id", p.id);
            dump[t] = data || [];
          }
          const path = `${p.id}/${today}.json`;
          const blob = new Blob([JSON.stringify(dump)], { type: "application/json" });
          const { error: upErr } = await supabase.storage
            .from("backups")
            .upload(path, blob, { upsert: true, contentType: "application/json" });
          if (upErr) throw upErr;
          backedUp++;
        }

        removidosPorRetencao += await aplicarRetencao(supabase, p.id, agora, !podeApagar);
      } catch (e) {
        errors.push(`${p.id}: ${e instanceof Error ? e.message : "?"}`);
      }
    }

    // ── Expurgo de contas que não existem mais (LGPD) ────────────────────────
    // Apagar a conta não apagava o backup: dados pessoais dos clientes daquele
    // assinante continuavam guardados por tempo indeterminado. Aqui varremos as
    // pastas órfãs — tanto de contas apagadas antes desta correção quanto de
    // qualquer falha futura no expurgo feito na hora da exclusão.
    let pastasOrfasRemovidas = 0;
    try {
      const { data: todosPerfis } = await supabase.from("profiles").select("id");
      const existentes = new Set((todosPerfis || []).map((p: any) => p.id));

      const { data: pastas } = await supabase.storage.from("backups").list("", { limit: 1000 });
      for (const pasta of pastas || []) {
        if (!pasta?.name || existentes.has(pasta.name)) continue;
        const { data: arquivos } = await supabase.storage
          .from("backups")
          .list(pasta.name, { limit: 1000 });
        const caminhos = (arquivos || []).map((a: any) => `${pasta.name}/${a.name}`);
        if (!caminhos.length) continue;
        if (!podeApagar) { pastasOrfasRemovidas++; continue; }
        const { error: rmErr } = await supabase.storage.from("backups").remove(caminhos);
        if (!rmErr) pastasOrfasRemovidas++;
      }
    } catch (e) {
      errors.push(`expurgo_orfaos: ${e instanceof Error ? e.message : "?"}`);
    }

    return new Response(
      JSON.stringify({
        modo: apenasConferir
          ? "conferencia (nada foi alterado)"
          : podeApagar ? "execucao (com limpeza)" : "execucao (limpeza DESLIGADA)",
        limpeza_autorizada: limpezaAutorizada,
        message: apenasConferir
          ? "Simulação: nenhum arquivo foi gravado nem apagado."
          : podeApagar
            ? `Backup de ${backedUp} usuário(s)`
            : `Backup de ${backedUp} usuário(s). Nenhum arquivo apagado — defina BACKUP_RETENTION_ENABLED=1 para ligar a limpeza.`,
        backedUp,
        removidosPorRetencao,
        pastasOrfasRemovidas,
        errors: errors.length ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
