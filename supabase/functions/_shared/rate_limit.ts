// ============================================================================
// Rate limit em memória (token bucket) para Edge Functions públicas.
// ----------------------------------------------------------------------------
// Escopo: por isolate. Não é distribuído — dois isolates podem cada um permitir
// N/segundo. Para APIs de webhook (chamadas concentradas em poucos IPs) isso já
// filtra abuso trivial sem custo extra. Para rate limit global forte, migrar
// para uma tabela em `public` com uma função `try_consume(key, capacity, refill)`.
// ============================================================================

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  key: string; // chave (ex.: `wa:<ip>`, `mp:<ip>`)
  capacity: number; // tokens máximos
  refillPerSec: number; // tokens repostos por segundo
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function consume(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const cur = buckets.get(opts.key) || { tokens: opts.capacity, updatedAt: now };
  const elapsedSec = Math.max(0, (now - cur.updatedAt) / 1000);
  const refill = elapsedSec * opts.refillPerSec;
  const tokens = Math.min(opts.capacity, cur.tokens + refill);
  if (tokens >= 1) {
    const next = { tokens: tokens - 1, updatedAt: now };
    buckets.set(opts.key, next);
    return { allowed: true, remaining: Math.floor(next.tokens), retryAfterMs: 0 };
  }
  buckets.set(opts.key, { tokens, updatedAt: now });
  const deficit = 1 - tokens;
  const retryAfterMs = Math.ceil((deficit / opts.refillPerSec) * 1000);
  return { allowed: false, remaining: 0, retryAfterMs };
}

export function ipFromRequest(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") || "";
  const first = xff.split(",")[0]?.trim();
  if (first) return first;
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unknown";
}

/** Aplica rate limit e retorna Response 429 pronta se estourou; senão null. */
export function guard(
  req: Request,
  prefix: string,
  capacity: number,
  refillPerSec: number,
  headers: Record<string, string> = {},
): Response | null {
  const key = `${prefix}:${ipFromRequest(req)}`;
  const r = consume({ key, capacity, refillPerSec });
  if (r.allowed) return null;
  return new Response(JSON.stringify({ error: "rate_limit_exceeded" }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(Math.ceil(r.retryAfterMs / 1000)),
      ...headers,
    },
  });
}
