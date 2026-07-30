import { motion } from "framer-motion";
import { Check, ArrowRight, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PLAN_LIST } from "@/lib/plans";

const LandingPricing = () => {
  const navigate = useNavigate();

  const goCheckout = (tier: string) => navigate(`/checkout?plan=${tier}`);

  return (
    <section id="pricing" className="py-24 bg-black/50 relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-display font-bold text-white mb-6"
          >
            Dois planos. <span className="text-gradient-gold">Zero complicação.</span>
          </motion.h2>
          <p className="text-white/40 max-w-xl mx-auto">
            Comece com a gestão completa da sua carteira. Quando quiser cobrar no automático com
            inteligência artificial, é só subir de plano — sem fidelidade.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {PLAN_LIST.map((plan, i) => (
            <motion.div
              key={plan.tier}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative p-8 md:p-10 rounded-[2.5rem] border backdrop-blur-xl flex flex-col ${
                plan.highlight
                  ? "bg-white/[0.06] border-white/25 shadow-2xl shadow-blue-500/10"
                  : "bg-white/[0.03] border-white/10"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-white text-black text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-white/20 whitespace-nowrap">
                  MAIS ESCOLHIDO
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-display font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-sm text-white/40 leading-relaxed min-h-[40px]">{plan.tagline}</p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-white/40 text-lg">R$</span>
                  <span className="text-5xl font-bold text-white tracking-tight">{plan.priceLabel}</span>
                  <span className="text-white/40 text-sm">,00/mês</span>
                </div>
                <span className="text-white/30 text-xs mt-1 block italic">sem fidelidade, cancele quando quiser</span>
              </div>

              <div className="space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-blue-400" />
                    </div>
                    <span className="text-sm text-white/70">{feature}</span>
                  </div>
                ))}
                {plan.missing?.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 opacity-40">
                    <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X size={12} className="text-white/50" />
                    </div>
                    <span className="text-sm text-white/50 line-through">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => goCheckout(plan.tier)}
                className={`mt-8 w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 group ${
                  plan.highlight
                    ? "bg-white text-black hover:bg-white/90 shadow-xl shadow-white/10"
                    : "bg-white/[0.06] text-white border border-white/15 hover:bg-white/[0.12]"
                }`}
              >
                ASSINAR {plan.name.toUpperCase()}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <p className="text-[10px] text-white/20 mt-4 text-center leading-relaxed">
                Pagamento seguro via Mercado Pago · Pix, cartão ou boleto
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-500/[0.03] rounded-full blur-[120px] -z-10" />
    </section>
  );
};

export default LandingPricing;
