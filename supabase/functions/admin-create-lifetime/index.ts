// Admin: cria (ou promove) um usuário com acesso vitalício.
//
// SEGURANÇA: esta função cria contas e, para e-mail já existente, TROCA A SENHA
// do dono daquele e-mail — é um caminho direto de tomada de conta. Antes rodava
// com `verify_jwt = false` (aberta a qualquer um na internet) e sem checar admin.
// Agora exige JWT válido de um admin da plataforma.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getPlatformAdminUser, unauthorized } from "../_shared/guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const caller = await getPlatformAdminUser(req);
    if (!caller) return unauthorized(corsHeaders);

    const { email, password, name } = await req.json();
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Try to find existing user
    let userId: string | null = null;
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (existing) {
      userId = existing.id;
      await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: name || email.split("@")[0] },
      });
      if (error) throw error;
      userId = data.user!.id;
    }

    const farFuture = "2099-12-31T00:00:00Z";
    await admin.from("profiles").update({
      subscription_type: "lifetime",
      subscription_expires_at: farFuture,
      trial_ends_at: farFuture,
      is_blocked: false,
    }).eq("id", userId);

    return new Response(JSON.stringify({ ok: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
