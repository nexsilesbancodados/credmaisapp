// Restauração de backup — o outro lado do auto-backup, que não existia.
//
// Um backup que nunca foi restaurado é uma hipótese, não um backup. Esta função
// existe para (a) conferir que os arquivos gravados são íntegros e completos e
// (b) devolver os dados quando algo der errado.
//
// Só admin da plataforma executa. O padrão é CONFERÊNCIA (dry run): lê o arquivo
// e relata o que ele contém, sem escrever nada. Para gravar de fato é preciso
// mandar `confirmar: "RESTAURAR"` explicitamente.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPlatformAdminUser, unauthorized } from "../_shared/guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Ordem importa na gravação: pai antes de filho, senão a chave estrangeira falha.
const ORDEM_TABELAS = [
  "clients", "contracts", "contract_installments", "transactions",
  "expenses", "profits", "goals", "notes", "todos", "settings",
  "collectors", "collector_assignments", "vehicles", "rentals", "stock_items",
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const caller = await getPlatformAdminUser(req);
  if (!caller) return unauthorized(corsHeaders);

  const body = await req.json().catch(() => ({}));
  const userId: string = body?.user_id ?? "";
  const data: string = body?.data ?? "";           // AAAA-MM-DD
  const gravar = body?.confirmar === "RESTAURAR";  // sem isto, só confere

  if (!userId) return json({ error: "informe user_id" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Sem data: lista o que existe para aquele usuário.
  if (!data) {
    const { data: arquivos, error } = await admin.storage
      .from("backups")
      .list(userId, { limit: 1000, sortBy: { column: "name", order: "desc" } });
    if (error) return json({ error: error.message }, 500);
    return json({
      user_id: userId,
      disponiveis: (arquivos || []).map((a: any) => a.name.replace(/\.json$/, "")),
    });
  }

  // Lê o arquivo do dia pedido.
  const caminho = `${userId}/${data}.json`;
  const { data: arquivo, error: dlErr } = await admin.storage.from("backups").download(caminho);
  if (dlErr || !arquivo) return json({ error: "backup_nao_encontrado", caminho }, 404);

  let dump: Record<string, any[]>;
  try {
    dump = JSON.parse(await arquivo.text());
  } catch {
    return json({ error: "backup_corrompido", caminho }, 422);
  }

  // Conferência: o que o arquivo tem × o que a base tem hoje.
  const relatorio: Record<string, { no_backup: number; na_base_hoje: number; gravados?: number }> = {};
  for (const tabela of ORDEM_TABELAS) {
    const linhas = Array.isArray(dump[tabela]) ? dump[tabela] : [];
    const { count } = await admin
      .from(tabela)
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    relatorio[tabela] = { no_backup: linhas.length, na_base_hoje: count ?? 0 };
  }

  if (!gravar) {
    return json({
      modo: "conferencia",
      caminho,
      integro: true,
      relatorio,
      aviso: 'Nada foi gravado. Para restaurar de verdade, envie confirmar: "RESTAURAR".',
    });
  }

  // Gravação: upsert por id. Nunca apaga — linhas criadas depois do backup
  // permanecem. Restaurar é devolver o que existia, não voltar o relógio.
  const erros: string[] = [];
  for (const tabela of ORDEM_TABELAS) {
    const linhas = Array.isArray(dump[tabela]) ? dump[tabela] : [];
    if (!linhas.length) continue;
    const { error } = await admin.from(tabela).upsert(linhas, { onConflict: "id" });
    if (error) erros.push(`${tabela}: ${error.message}`);
    else relatorio[tabela].gravados = linhas.length;
  }

  return json({
    modo: "restauracao",
    caminho,
    relatorio,
    erros: erros.length ? erros : undefined,
  });
});
