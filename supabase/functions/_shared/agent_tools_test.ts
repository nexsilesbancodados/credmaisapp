import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { AGENT_TOOLS, executeTool } from "./agent_tools.ts";

const today = "2026-07-25";

function mkSupabase(overrides: Record<string, any> = {}) {
  return {
    rpc: (name: string, _args: any) => {
      if (overrides.rpc && overrides.rpc[name]) return overrides.rpc[name];
      return { data: [], error: null };
    },
    from: (_tbl: string) => ({
      select: () => ({
        eq: () => ({
          neq: () => ({
            order: () => ({
              limit: () => overrides.installments || { data: [], error: null },
              lt: () => ({ limit: () => overrides.installments || { data: [], error: null } }),
            }),
          }),
          maybeSingle: () => overrides.single || { data: null, error: null },
        }),
      }),
    }),
  } as any;
}

Deno.test("catálogo de tools está válido", () => {
  assertEquals(AGENT_TOOLS.length, 5);
  for (const t of AGENT_TOOLS) {
    assertEquals(typeof t.name, "string");
    assertEquals(typeof t.description, "string");
    assertEquals(typeof (t.input_schema as any).type, "string");
  }
});

Deno.test("buscar_cliente_por_cpf rejeita CPF inválido", async () => {
  const r = await executeTool(
    "buscar_cliente_por_cpf",
    { cpf: "123" },
    { supabase: mkSupabase(), siteUrl: "https://x", today },
  );
  assertEquals(r.ok, false);
});

Deno.test("buscar_cliente_por_cpf retorna cliente confirmado", async () => {
  const sup = mkSupabase({
    rpc: {
      search_clients_by_document: {
        data: [{ id: "abc", name: "João", status: "active" }],
        error: null,
      },
    },
  });
  const r = await executeTool(
    "buscar_cliente_por_cpf",
    { cpf: "12345678901" },
    { supabase: sup, siteUrl: "https://x", today },
  );
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals((r.data as any).client_id, "abc");
    assertEquals((r.data as any).name, "João");
  }
});

Deno.test("listar_parcelas_em_aberto calcula multa + juros", async () => {
  const sup = mkSupabase({
    installments: {
      data: [
        {
          id: "p1",
          installment_number: 1,
          amount: 1000,
          paid_amount: 0,
          due_date: "2026-07-15", // 10 dias de atraso
          status: "pending",
          late_fee_percent: 2, // 2% => 20
          daily_interest_percent: 0.1, // 0.1% * 10 dias = 1% => 10
        },
      ],
      error: null,
    },
  });
  const r = await executeTool(
    "listar_parcelas_em_aberto",
    { client_id: "cli-1" },
    { supabase: sup, siteUrl: "https://x", today },
  );
  assertEquals(r.ok, true);
  if (r.ok) {
    const p = (r.data as any).parcelas[0];
    assertEquals(p.dias_atraso, 10);
    assertEquals(p.multa, 20);
    assertEquals(p.juros_diarios, 10);
    assertEquals(p.total_com_encargos, 1030);
  }
});

Deno.test("escalar_para_humano sempre retorna handoff", async () => {
  const r = await executeTool(
    "escalar_para_humano",
    { motivo: "pediu_desconto", resumo: "Cliente pediu 30% off" },
    { supabase: mkSupabase(), siteUrl: "https://x", today },
  );
  assertEquals(r.ok, true);
  if (r.ok) assertEquals((r.data as any).handoff, true);
});

Deno.test("tool desconhecida retorna erro", async () => {
  const r = await executeTool(
    "nao_existe",
    {},
    { supabase: mkSupabase(), siteUrl: "https://x", today },
  );
  assertEquals(r.ok, false);
  if (!r.ok) assertStringIncludes(r.error, "tool_desconhecida");
});
