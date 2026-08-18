import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { SiteHeader, SiteFooter, Card, Grain, Eyebrow } from "@/components/site/SiteLayout";
import { PLAN_LIST } from "@/lib/plans";
import logo from "@/assets/credmais-logo.jpg";
import heroEagle from "@/assets/hero-eagle-only.jpg";

const FEATURES = [
  {
    n: "01",
    t: "Carteira e contratos",
    d: "Cadastro em etapas, parcelas geradas na hora e o histórico inteiro de cada cliente em uma página.",
  },
  {
    n: "02",
    t: "Juros de atraso no automático",
    d: "4% ao dia sobre a parcela, acumulando sozinho. Você nunca mais abre a calculadora.",
  },
  {
    n: "03",
    t: "Cobrança pelo WhatsApp",
    d: "Lembrete antes do vencimento, cobrança firme depois — com PIX e link do portal do cliente.",
  },
  {
    n: "04",
    t: "Lucro e inadimplência",
    d: "Quanto entrou, quanto falta e quanto sobrou de verdade. Atualizado a cada recebimento.",
  },
];

const STEPS = [
  ["Cadastre o cliente", "Dados, documentos e as condições do empréstimo em poucos toques."],
  ["O sistema monta o contrato", "Datas, frequência, parcelas e juros calculados na hora."],
  ["A cobrança sai sozinha", "Mensagem no dia certo, com valor atualizado e PIX pronto."],
  ["Você só acompanha", "Recebimentos, atrasos e resultado do mês em um painel só."],
];

export default function Index() {
  return (
    <div className="min-h-screen bg-[#090908] font-body text-white">
      <Grain />
      <SiteHeader />

      {/* Hero — águia em tela cheia, CTA no espaço livre à esquerda */}
      <section className="relative min-h-[calc(100svh-4rem)] overflow-hidden border-b border-white/[0.08]">
        <img
          src={heroEagle}
          alt="CredMais App — mascote águia azul"
          width={1920}
          height={1080}
          className="absolute inset-y-0 right-0 h-full w-full object-cover object-[68%_center] opacity-35 grayscale sm:opacity-45 lg:w-[62%] lg:object-right"
          loading="eager"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg,#090908 0%,#090908 44%,rgba(9,9,8,.82) 62%,rgba(9,9,8,.22) 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg,rgba(9,9,8,.1) 0%,transparent 45%,#090908 100%)",
          }}
        />
        <div className="relative mx-auto grid w-full max-w-[1280px] min-h-[calc(100svh-4rem)] items-center px-4 py-16 sm:px-6 sm:py-20 lg:px-10 lg:py-24">
          <div className="max-w-[650px]">
            <Eyebrow>Gestão de empréstimos pessoais</Eyebrow>
            <h1 className="font-display mt-6 text-[clamp(2.7rem,7vw,5.4rem)] font-semibold leading-[.94] tracking-[-0.055em] text-[#f2eee5]">
              Empreste com controle.
              <br /> Receba em dia.
            </h1>
            <p className="mt-7 max-w-lg text-[15px] leading-7 text-white/60 sm:text-base">
              O CredMais organiza sua carteira, calcula os juros de atraso e cobra por você no WhatsApp.
            </p>
            <div className="mt-9 grid gap-3 sm:flex sm:flex-row sm:items-center">
              <Link
                to="/checkout?plan=completo"
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#ebe5d8] px-7 text-sm font-semibold text-[#12110f] transition-all hover:bg-white"
              >
                Assinar agora
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 bg-white/[0.025] px-7 text-sm font-medium text-white/80 backdrop-blur-xl transition-colors hover:border-white/30 hover:bg-white/[0.06] hover:text-white"
              >
                Já sou cliente
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-white/38 sm:text-xs">
              <span>Sem instalar nada</span>
              <span className="h-1 w-1 rounded-full bg-white/25" />
              <span>Celular, tablet e computador</span>
              <span className="h-1 w-1 rounded-full bg-white/25" />
              <span>Cancele quando quiser</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features — lista editorial, sem grid de cards genérico */}
      <section className="border-t border-white/[0.07] px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="mx-auto w-full max-w-[1160px]">
          <div className="md:flex md:items-end md:justify-between">
            <div>
              <Eyebrow>O que o app faz</Eyebrow>
              <h2 className="font-display mt-6 max-w-xl text-[clamp(1.7rem,4vw,2.8rem)] font-semibold leading-[1.06] tracking-[-0.03em]">
                Tudo que você precisa,
                <br className="hidden sm:block" /> sem complicação
              </h2>
            </div>
            <Link
              to="/inteligencia"
              className="mt-6 inline-flex items-center gap-1.5 text-sm text-[#c9c1ae] hover:text-white md:mt-0"
            >
              Ver como a cobrança funciona <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-14 border-t border-white/[0.07]">
            {FEATURES.map((f) => (
              <div
                key={f.n}
                className="group grid grid-cols-1 gap-4 border-b border-white/[0.07] py-7 transition-colors hover:bg-white/[0.02] md:grid-cols-[70px_1fr_1.1fr] md:items-baseline md:gap-8 md:py-9"
              >
                <div className="font-mono text-[12px] text-[#c9c1ae]/75">{f.n}</div>
                <h3 className="font-display text-[19px] font-medium tracking-[-0.01em] md:text-[22px]">{f.t}</h3>
                <p className="text-[14px] leading-relaxed text-white/50 md:text-[15px]">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona — timeline */}
      <section className="border-t border-white/[0.07] px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="mx-auto w-full max-w-[1160px]">
          <Eyebrow>Como funciona</Eyebrow>
          <h2 className="font-display mt-6 max-w-lg text-[clamp(1.7rem,4vw,2.8rem)] font-semibold leading-[1.06] tracking-[-0.03em]">
            Quatro passos e a cobrança roda sem você
          </h2>

          <div className="relative mt-14 md:pl-6">
            <div className="absolute left-[7px] top-2 hidden h-[calc(100%-2rem)] w-px bg-gradient-to-b from-[#c9c1ae]/55 via-white/10 to-transparent md:block" />
            <div className="grid gap-8 md:grid-cols-2 md:gap-x-16 md:gap-y-12">
              {STEPS.map(([t, d], i) => (
                <div key={t} className="relative md:pl-10">
                  <div className="absolute -left-[calc(1.5rem+1px)] top-[9px] hidden h-[15px] w-[15px] items-center justify-center rounded-full border border-[#c9c1ae]/45 bg-[#090908] md:flex">
                    <span className="h-[5px] w-[5px] rounded-full bg-[#c9c1ae]" />
                  </div>
                  <div className="font-mono text-[12px] text-white/30">0{i + 1}</div>
                  <h3 className="font-display mt-2 text-[18px] font-medium">{t}</h3>
                  <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-white/50">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Planos */}
      <section className="border-t border-white/[0.07] px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="mx-auto w-full max-w-[1000px]">
          <Eyebrow>Planos</Eyebrow>
          <h2 className="font-display mt-6 text-[clamp(1.7rem,4vw,2.8rem)] font-semibold leading-[1.06] tracking-[-0.03em]">
            Escolha o seu
          </h2>
          <p className="mt-4 text-sm text-white/50">Clientes e contratos ilimitados nos dois planos.</p>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
            {PLAN_LIST.map((plan) => (
              <Card
                key={plan.tier}
                className={
                  plan.highlight
                    ? "border-[#c9c1ae]/35 bg-[#c9c1ae]/[0.035] shadow-[0_30px_80px_-45px_rgba(201,193,174,.28)]"
                    : ""
                }
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-8 rounded-lg bg-[#d8d0bd] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#151411]">
                    Mais completo
                  </span>
                )}
                <div className="font-display text-lg font-semibold">{plan.name}</div>
                <p className="mt-2 text-[13px] text-white/50">{plan.tagline}</p>
                <div className="mt-7 flex items-end gap-1.5">
                  <span className="font-display text-[42px] font-semibold leading-none tracking-[-0.03em]">
                    R$ {plan.priceLabel}
                  </span>
                  <span className="pb-1 text-xs text-white/35">/mês</span>
                </div>
                <ul className="mt-7 space-y-2.5 border-t border-white/[0.07] pt-7">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-[13.5px] text-white/70">
                      <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[#c9c1ae]" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={`/checkout?plan=${plan.tier}`}
                  className={`mt-8 flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition-all hover:-translate-y-[1px] ${
                    plan.highlight
                      ? "bg-[#ebe5d8] text-[#12110f] hover:bg-white"
                      : "border border-white/15 text-white hover:border-white/35"
                  }`}
                >
                  Assinar {plan.name}
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative overflow-hidden border-t border-white/[0.07] px-4 sm:px-6 lg:px-8 py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[-260px] left-1/2 h-[460px] w-[860px] -translate-x-1/2 rounded-full opacity-40 blur-[120px]"
          style={{ background: "radial-gradient(circle,rgba(201,193,174,.3) 0%,transparent 70%)" }}
        />
        <div className="relative mx-auto w-full max-w-2xl text-center">
          <img src={logo} alt="" className="mx-auto h-14 w-14 rounded-xl object-cover grayscale ring-1 ring-white/15" loading="lazy" />
          <h2 className="font-display mt-8 text-[clamp(1.8rem,4.6vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
            Comece hoje a receber em dia
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[15px] text-white/55">
            Coloque sua carteira no app e deixe a cobrança acontecer sem você lembrar.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/checkout?plan=completo"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#ebe5d8] px-7 py-4 text-sm font-semibold text-[#12110f] transition-all hover:bg-white"
            >
              Assinar agora
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="https://wa.me/5511964541758"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-7 py-4 text-sm font-medium text-white/75 transition-colors hover:border-white/35 hover:bg-white/[.04] hover:text-white"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
