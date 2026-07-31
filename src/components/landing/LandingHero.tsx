import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, ShieldCheck, Zap } from "lucide-react";
import eagleHero from "@/assets/eagle-hero.jpg";
import eagleMascot from "@/assets/eagle-mascot.png";
import AnimatedNumber from "./AnimatedNumber";

const LandingHero = () => {
  return (
    <section id="home" className="relative overflow-hidden pt-32 pb-16 lg:pt-40 lg:pb-24">
      <div className="absolute inset-0 rule-grid opacity-70 pointer-events-none" aria-hidden />
      <motion.div
        aria-hidden
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[780px] h-[520px] rounded-full bg-primary/[0.10] blur-[120px] pointer-events-none"
        animate={{ opacity: [0.55, 1, 0.55] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="container mx-auto px-5 sm:px-6 relative">
        {/* Faixa superior editorial */}
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          <span className="text-primary">Ed. 2026</span>
          <span className="flex-1 gold-line" />
          <span className="hidden sm:inline">Gestão de empréstimos</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-end mt-8" data-hero>
          <div className="lg:col-span-7 space-y-7">
            <h1 className="font-editorial text-[clamp(2.8rem,7.5vw,5.5rem)] leading-[0.95] text-foreground">
              A visão da <span className="gold-text italic">águia</span>
              <br />
              sobre cada real
              <br />
              que você empresta.
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
              Contratos, parcelas, juros diários e cobrança automática no WhatsApp em uma única
              plataforma. Você deixa a planilha e passa a operar com precisão.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/checkout"
                  className="group inline-flex w-full items-center justify-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold"
                >
                  Começar agora
                  <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <a
                  href="#features"
                  className="inline-flex w-full items-center justify-center gap-2 px-8 py-4 rounded-full border border-border text-foreground font-semibold hover:border-primary/50 transition-colors"
                >
                  Ver a plataforma
                </a>
              </motion.div>
            </div>

            <div className="flex flex-wrap items-center gap-x-7 gap-y-3 pt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-primary" /> Pagamento via Mercado Pago
              </span>
              <span className="flex items-center gap-2">
                <Zap size={15} className="text-primary" /> Ativo em minutos
              </span>
            </div>
          </div>

          {/* Retrato do mascote */}
          <div className="lg:col-span-5" data-hero-panel>
            <div className="relative rounded-[2rem] overflow-hidden border border-border">
              <img
                src={eagleHero}
                alt="Águia sobrevoando gráficos financeiros"
                width={1280}
                height={960}
                className="w-full h-[300px] sm:h-[400px] lg:h-[460px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />
              <img
                src={eagleMascot}
                alt=""
                aria-hidden
                width={96}
                height={96}
                loading="lazy"
                className="absolute top-5 left-5 w-14 h-14 object-contain opacity-90"
              />
              <p className="absolute bottom-5 left-6 right-6 font-editorial text-xl text-foreground">
                Nada passa despercebido.
              </p>
            </div>
          </div>
        </div>

        {/* Números */}
        <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border border border-border rounded-2xl overflow-hidden">
          {[
            { value: 4, suffix: "% ao dia", label: "Juros de atraso automáticos", decimals: 0 },
            { value: 98.2, suffix: "%", label: "Entrega das cobranças", decimals: 1 },
            { value: 142, suffix: "", label: "Mensagens enviadas por dia", decimals: 0 },
            { value: 2.4, suffix: "%", label: "Inadimplência média", decimals: 1 },
          ].map((stat) => (
            <div key={stat.label} className="p-5 sm:p-6">
              <AnimatedNumber
                value={stat.value}
                decimals={stat.decimals}
                suffix={stat.suffix}
                className="tnum block font-editorial text-2xl sm:text-3xl text-primary"
              />
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mt-2 leading-relaxed">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
