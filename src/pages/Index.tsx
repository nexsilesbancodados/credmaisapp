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
    <div className="min-h-screen bg-[#050B18] font-body text-white">
      <Grain />
      <SiteHeader />

      {/* Hero — logo em tela cheia */}
      <section className="relative min-h-[92vh] overflow-hidden">
        <img
          src={heroLogoWide.url}
          alt="CredMais App — mascote águia azul"
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg,#050B18 0%,#050B18cc 38%,transparent 62%,#050B18cc 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg,transparent 0%,transparent 55%,#050B18 100%)",
          }}
        />
        <div className="relative mx-auto grid w-full max-w-[1160px] min-h-[92vh] items-center px-4 sm:px-6 lg:px-8 pb-24 pt-32 md:pt-24">
          <div className="max-w-xl">
            <Eyebrow>Gestão de empréstimos pessoais</Eyebrow>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                to="/checkout?plan=completo"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-semibold text-[#050B18] transition-all hover:-translate-y-[2px] hover:shadow-[0_14px_40px_rgba(123,178,255,0.28)]"
              >
                Assinar agora
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-full border border-white/25 px-7 py-4 text-sm font-medium text-white/90 transition-colors hover:border-white/50 hover:bg-white/10 hover:text-white"
              >
                Já sou cliente
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-white/50">
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
              className="mt-6 inline-flex items-center gap-1.5 text-sm text-[#3B8DFF] hover:text-white md:mt-0"
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
                <div className="font-mono text-[12px] text-[#3B8DFF]/80">{f.n}</div>
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
            <div className="absolute left-[7px] top-2 hidden h-[calc(100%-2rem)] w-px bg-gradient-to-b from-[#1B6EF3]/70 via-white/10 to-transparent md:block" />
            <div className="grid gap-8 md:grid-cols-2 md:gap-x-16 md:gap-y-12">
              {STEPS.map(([t, d], i) => (
                <div key={t} className="relative md:pl-10">
                  <div className="absolute -left-[calc(1.5rem+1px)] top-[9px] hidden h-[15px] w-[15px] items-center justify-center rounded-full border border-[#1B6EF3]/50 bg-[#050B18] md:flex">
                    <span className="h-[5px] w-[5px] rounded-full bg-[#3B8DFF]" />
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
                    ? "border-[#1B6EF3]/45 from-[#1B6EF3]/[0.12] shadow-[0_30px_80px_-40px_rgba(27,110,243,0.6)]"
                    : ""
                }
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-8 rounded-full bg-[#1B6EF3] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
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
                      <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[#3B8DFF]" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={`/checkout?plan=${plan.tier}`}
                  className={`mt-8 flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition-all hover:-translate-y-[1px] ${
                    plan.highlight
                      ? "bg-white text-[#050B18] hover:shadow-[0_12px_32px_rgba(255,255,255,0.18)]"
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
          style={{ background: "radial-gradient(circle,#1B6EF3 0%,transparent 70%)" }}
        />
        <div className="relative mx-auto w-full max-w-2xl text-center">
          <img src={logo} alt="" className="mx-auto h-14 w-14 rounded-full ring-1 ring-[#1B6EF3]/40" loading="lazy" />
          <h2 className="font-display mt-8 text-[clamp(1.8rem,4.6vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
            Comece hoje a receber em dia
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[15px] text-white/55">
            Coloque sua carteira no app e deixe a cobrança acontecer sem você lembrar.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/checkout?plan=completo"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-semibold text-[#050B18] transition-all hover:-translate-y-[2px] hover:shadow-[0_14px_40px_rgba(123,178,255,0.28)]"
            >
              Assinar agora
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="https://wa.me/5511964541758"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-7 py-4 text-sm font-medium text-white/75 transition-colors hover:border-white/35 hover:text-white"
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
