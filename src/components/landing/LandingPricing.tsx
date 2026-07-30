import { Check, X, ArrowRight, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PLAN_LIST } from "@/lib/plans";

const LandingPricing = () => {
  const navigate = useNavigate();
  const goCheckout = (tier: string) => navigate(`/checkout?plan=${tier}`);

  return (
    <section id="pricing" className="py-20 lg:py-28 bg-card border-y border-border">
      <div className="container mx-auto px-5 sm:px-6">
        <div className="max-w-2xl mb-12 lg:mb-16" data-anim="up">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold mb-3">
            Planos
          </p>
          <h2 className="text-[clamp(1.75rem,3.6vw,2.75rem)] font-bold text-foreground leading-tight">
            Dois planos. Zero complicação.
          </h2>
          <p className="text-muted-foreground mt-4 leading-relaxed">
            Comece com a gestão completa da sua carteira. Quando quiser cobrar no automático com
            inteligência artificial, é só subir de plano — sem fidelidade.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-5xl" data-anim-group>
          {PLAN_LIST.map((plan) => (
            <article
              key={plan.tier}
              data-anim="scale"
              className={`relative rounded-[2rem] border p-7 sm:p-9 flex flex-col transition-transform duration-300 hover:-translate-y-2 ${
                plan.highlight
                  ? "border-primary bg-background shadow-xl shadow-primary/10"
                  : "border-border bg-background"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-7 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-[0.14em]">
                  Mais escolhido
                </span>
              )}

              <h3 className="font-editorial text-2xl font-bold text-foreground">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mt-2">{plan.tagline}</p>

              <div className="flex items-end gap-1.5 mt-7 mb-7">
                <span className="text-sm font-semibold text-muted-foreground mb-2">R$</span>
                <span className="tnum font-editorial text-[3rem] leading-none font-bold text-foreground">
                  {plan.priceLabel}
                </span>
                <span className="text-sm text-subtle mb-2">/mês</span>
              </div>

              <ul className="space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check size={16} className="text-primary mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
                {plan.missing?.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-subtle">
                    <X size={16} className="mt-0.5 flex-shrink-0" />
                    <span className="line-through">{f}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => goCheckout(plan.tier)}
                className={`mt-8 inline-flex items-center justify-center gap-2 w-full px-6 py-4 rounded-xl font-semibold transition-all ${
                  plan.highlight
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90"
                    : "border border-border text-foreground hover:border-primary/40"
                }`}
              >
                Assinar {plan.name}
                <ArrowRight size={16} />
              </button>
            </article>
          ))}
        </div>

        <p className="flex items-center gap-2 text-xs text-subtle mt-6">
          <ShieldCheck size={14} className="text-primary" />
          Pagamento processado pelo Mercado Pago · cancele quando quiser
        </p>
      </div>
    </section>
  );
};

export default LandingPricing;
