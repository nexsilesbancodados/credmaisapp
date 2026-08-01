import { Link } from "react-router-dom";
import { ArrowRight, Check, MessageCircle, Percent, ShieldCheck, Wallet } from "lucide-react";
import { SiteHeader, SiteFooter, Card } from "@/components/site/SiteLayout";
import { PLAN_LIST } from "@/lib/plans";
import logo from "@/assets/credmais-logo.jpeg.asset.json";

const FEATURES = [
  { icon: Wallet, t: "Clientes e contratos", d: "Cadastro em etapas, parcelas geradas automaticamente e histórico completo de cada cliente." },
  { icon: Percent, t: "Juros de atraso automáticos", d: "4% ao dia calculados sozinhos. Você nunca mais faz conta na calculadora." },
  { icon: MessageCircle, t: "Cobrança no WhatsApp", d: "Lembretes e cobranças enviadas no dia certo, com PIX e link do portal do cliente." },
  { icon: ShieldCheck, t: "Lucro e inadimplência", d: "Quanto entrou, quanto falta e quanto sobrou de lucro — atualizado em tempo real." },
];

const STEPS = [
  ["01", "Cadastre o cliente", "Dados, documentos e empréstimo em poucos toques."],
  ["02", "O sistema gera as parcelas", "Datas, juros e frequência calculados na hora."],
  ["03", "A cobrança sai sozinha", "Lembrete antes, cobrança firme depois, com PIX."],
  ["04", "Você acompanha o lucro", "Recebimentos e resultado do mês em um painel."],
];

export default function Index() {
  return (
    <div className="min-h-screen bg-[#050B18] font-body text-white">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden px-5 pb-20 pt-16 md:pt-24">
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, #1B6EF3 0%, transparent 70%)" }}
        />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 md:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              Gestão de empréstimos pessoais
            </div>
            <h1 className="font-display mt-6 text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Empreste com controle.
              <br />
              <span className="text-[#3B8DFF]">Receba em dia.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-white/60 md:text-lg">
              O CredMais organiza sua carteira, calcula os juros de atraso e cobra por você no WhatsApp. Simples,
              direto e no seu bolso.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/checkout?plan=completo"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1B6EF3] px-6 py-4 text-sm font-medium text-white transition-colors hover:bg-[#3B8DFF]"
              >
                Assinar agora <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-4 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
              >
                Já sou cliente
              </Link>
            </div>
          </div>

          <div className="flex justify-center">
            <img
              src={logo.url}
              alt="Logo CredMais App: mascote águia azul"
              className="w-full max-w-sm rounded-full shadow-[0_0_80px_rgba(27,110,243,0.35)]"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-white/10 px-5 py-20">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="font-display text-2xl font-semibold tracking-tight md:text-4xl">
            Tudo que você precisa, sem complicação
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
            {FEATURES.map((f) => (
              <Card key={f.t}>
                <f.icon className="h-6 w-6 text-[#3B8DFF]" />
                <div className="font-display mt-5 text-lg font-medium">{f.t}</div>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{f.d}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="border-t border-white/10 px-5 py-20">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="font-display text-2xl font-semibold tracking-tight md:text-4xl">Como funciona</h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([n, t, d]) => (
              <Card key={n}>
                <div className="font-mono text-sm text-[#3B8DFF]">{n}</div>
                <div className="mt-4 text-sm font-medium uppercase tracking-wide">{t}</div>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{d}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section className="border-t border-white/10 px-5 py-20">
        <div className="mx-auto w-full max-w-5xl">
          <h2 className="font-display text-2xl font-semibold tracking-tight md:text-4xl">Planos</h2>
          <p className="mt-3 text-sm text-white/60">Clientes e contratos ilimitados nos dois planos.</p>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
            {PLAN_LIST.map((plan) => (
              <Card key={plan.tier} className={plan.highlight ? "border-[#1B6EF3]/60 bg-[#1B6EF3]/[0.06]" : ""}>
                <div className="font-display text-xl font-semibold">{plan.name}</div>
                <p className="mt-2 text-sm text-white/60">{plan.tagline}</p>
                <div className="mt-6 flex items-end gap-1">
                  <span className="font-display text-4xl font-bold">R$ {plan.priceLabel}</span>
                  <span className="pb-1 text-xs text-white/40">/mês</span>
                </div>
                <ul className="mt-6 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2 text-sm text-white/75">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#3B8DFF]" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={`/checkout?plan=${plan.tier}`}
                  className={`mt-8 flex items-center justify-center rounded-xl px-6 py-3.5 text-sm font-medium transition-colors ${
                    plan.highlight
                      ? "bg-[#1B6EF3] text-white hover:bg-[#3B8DFF]"
                      : "border border-white/15 text-white hover:bg-white/5"
                  }`}
                >
                  Assinar {plan.name}
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10 px-5 py-20 text-center">
        <div className="mx-auto w-full max-w-2xl">
          <h2 className="font-display text-2xl font-semibold tracking-tight md:text-4xl">
            Comece hoje a receber em dia
          </h2>
          <p className="mt-4 text-sm text-white/60">
            Sem instalação. Funciona no celular, tablet e computador.
          </p>
          <Link
            to="/checkout?plan=completo"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#1B6EF3] px-7 py-4 text-sm font-medium text-white transition-colors hover:bg-[#3B8DFF]"
          >
            Assinar agora <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
