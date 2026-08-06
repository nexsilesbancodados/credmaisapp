/**
 * Roda o type check do Deno em todas as funções de servidor.
 *
 * Existe porque o type check delas estava quebrado e ninguém via. Enquanto ele
 * falha, não serve para pegar erro nenhum — e foi assim que passou despercebido
 * o `auto-late-fees` descartando `max_interest_cap_percent` do mapa de
 * configuração: o TypeScript apontava exatamente essa linha, no meio de outros
 * seis arquivos que também falhavam por motivos banais. O teto de juros que o
 * operador definia não limitava nada.
 */
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const raiz = "supabase/functions";
const alvos = readdirSync(raiz, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
  .map((e) => join(raiz, e.name, "index.ts"))
  .filter((p) => existsSync(p));

// `deno` nem sempre está no PATH (no Windows deste projeto ele vem pelo npx).
// Tenta o binário direto e cai para o npx — sem isso o script "falhava" em todos
// os arquivos por não achar o comando, que é pior que não checar nada: parece
// erro de tipo em 41 funções e ninguém olha.
const temDeno = spawnSync("deno", ["--version"], { encoding: "utf8", shell: true }).status === 0;
const [cmd, prefixo] = temDeno ? ["deno", []] : ["npx", ["deno"]];

const falhas = [];
for (const arquivo of alvos) {
  const r = spawnSync(cmd, [...prefixo, "check", arquivo], { encoding: "utf8", shell: true });
  if (r.status !== 0) {
    const detalhe = `${r.stderr || ""}${r.stdout || ""}`
      .split("\n")
      .filter((l) => /TS\d+|error:/.test(l) && !/^error: Type checking failed/.test(l))
      .slice(0, 2)
      .join("\n      ");
    falhas.push(`  ${arquivo}\n      ${detalhe}`);
  }
}

if (falhas.length) {
  console.error(`\n${falhas.length} de ${alvos.length} função(ões) de servidor com erro de tipo:\n`);
  console.error(falhas.join("\n\n"));
  console.error("");
  process.exit(1);
}

console.log(`Funções de servidor: ${alvos.length} verificadas, nenhum erro de tipo.`);
