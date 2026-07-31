import { Reveal, Item, VexonShell, VexonSection } from "@/components/vexon/VexonShell";
import { TextEffect } from "@/components/vexon/ui/text-effect";
import { PLAN_LIST } from "@/lib/plans";
import { Link } from "react-router-dom";
import { Check, X, ArrowUpRight } from "lucide-react";

const FAQ = [
  ["Posso trocar de plano depois?", "Sim. A troca é imediata e o valor é ajustado na próxima cobrança."],
  ["Tem limite de clientes?", "Não. Clientes, contratos e parcelas são ilimitados nos dois planos."],
  ["Como funciona o pagamento?", "Assinatura mensal via Mercado Pago (PIX ou cartão), com liberação automática."],
  ["Preciso instalar algo?", "Não. Funciona no navegador do celular, tablet e computador, e pode ser instalado como app."],
];

export default function PlanosSite() {
  return (
    <VexonShell
      eyebrow="Planos"
      title="Escolha seu plano"
      intro="Dois planos, nenhuma pegadinha. Comece organizando a carteira e ligue a automação com IA quando quiser."
    >
      <VexonSection label="assinaturas">
        <Reveal className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {PLAN_LIST.map((plan) => (
            <Item
              key={plan.tier}
              className={`relative flex flex-col overflow-hidden rounded-md border bg-black/40 p-8 backdrop-blur-md md:p-12 ${
                plan.highlight ? "border-white/40" : "border-white/10"
              }`}
            >
              <div className="absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-white/40" />
              <div className="absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-white/40" />

              {plan.highlight && (
                <div className="mb-6 inline-flex w-fit items-center rounded-full bg-white px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-black">
                  Mais completo
                </div>
              )}

              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">Plano</div>
              <div className="font-display mt-3 text-3xl font-medium tracking-tight text-white md:text-4xl">
                {plan.name}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[#E6E6E6] opacity-60">{plan.tagline}</p>

              <div className="mt-8 flex items-end gap-2">
                <span className="font-display text-5xl font-bold tracking-tight text-white md:text-6xl">
                  R$ {plan.priceLabel}
                </span>
                <span className="pb-2 font-mono text-[11px] uppercase tracking-widest text-white/40">/ mês</span>
              </div>

              <ul className="mt-10 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-[#E6E6E6] opacity-80">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                    <span className="font-light leading-relaxed">{f}</span>
                  </li>
                ))}
                {plan.missing?.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-[#E6E6E6] opacity-35 line-through">
                    <X className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="font-light leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={`/checkout?plan=${plan.tier}`}
                className={`group relative mt-10 flex items-center justify-center gap-2 overflow-hidden rounded-sm px-8 py-4 text-xs font-medium uppercase tracking-widest transition-all md:text-sm ${
                  plan.highlight
                    ? "bg-white text-black hover:opacity-90"
                    : "border border-white/30 bg-black/60 text-white hover:bg-black/80"
                }`}
              >
                Assinar {plan.name}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </Item>
          ))}
        </Reveal>
      </VexonSection>

      <VexonSection label="perguntas frequentes" className="bg-black">
        <TextEffect
          as="h2"
          preset="blur"
          per="word"
          className="font-display mb-12 max-w-3xl text-3xl font-medium leading-tight tracking-tight text-white md:text-4xl"
        >
          Tudo que costumam perguntar antes de assinar.
        </TextEffect>
        <Reveal className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-white/10 md:grid-cols-2">
          {FAQ.map(([q, a]) => (
            <Item key={q} className="bg-black/40 p-8">
              <div className="text-sm font-medium uppercase tracking-widest text-white">{q}</div>
              <p className="mt-3 text-sm leading-relaxed text-[#E6E6E6] opacity-60">{a}</p>
            </Item>
          ))}
        </Reveal>
        <Reveal className="mt-12">
          <Item>
            <a
              href="https://wa.me/5511964541758"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-white opacity-70 transition-opacity hover:opacity-100"
            >
              Falar com o time — (11) 96454-1758
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </Item>
        </Reveal>
      </VexonSection>
    </VexonShell>
  );
}
