import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Clock, MessageCircle, TrendingUp, TrendingDown } from "lucide-react";
import heroTiger from "@/assets/hero-tiger.jpg";
import AnimatedNumber from "./AnimatedNumber";

const heroChecks = [
  { icon: ShieldCheck, label: "Pagamento seguro via Mercado Pago" },
  { icon: Clock, label: "Pronto para usar em minutos" },
  { icon: MessageCircle, label: "Suporte de gente de verdade" },
];

const rows = [
  { name: "João Silva", info: "Parcela 3/10 · vence hoje", value: "R$ 1.200,00", ok: true },
  { name: "Maria Souza", info: "Parcela 6/12 · pago", value: "R$ 850,00", ok: true },
  { name: "Carlos Lima", info: "Parcela 2/8 · 3 dias em atraso", value: "R$ 1.040,00", ok: false },
];

const LandingHero = () => {
  return (
    <section id="home" className="relative overflow-hidden pt-28 pb-14 lg:pt-36 lg:pb-24">
      <div className="absolute inset-0 rule-grid opacity-[0.5] pointer-events-none" aria-hidden />
      <motion.div
        aria-hidden
        className="absolute -top-40 right-0 w-[520px] h-[520px] rounded-full bg-primary/10 blur-3xl pointer-events-none"
        animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute -bottom-32 -left-24 w-[420px] h-[420px] rounded-full bg-primary/[0.07] blur-3xl pointer-events-none"
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="container mx-auto px-5 sm:px-6 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Coluna editorial */}
          <div className="space-y-7 max-w-xl" data-hero>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] font-semibold text-primary uppercase tracking-[0.14em]">
                Cobrança automática ativa
              </span>
            </span>

            <h1 className="text-[clamp(2.25rem,5vw,3.75rem)] font-bold leading-[1.08] text-foreground">
              Gestão de empréstimos <span className="text-primary">inteligente</span> para o seu negócio.
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Do contrato à última parcela: clientes, prazos, juros e cobrança automática no WhatsApp em um
              só lugar. Você para de correr atrás de planilha e passa a enxergar cada real que tem a receber.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/checkout"
                  className="group inline-flex w-full items-center justify-center gap-2 px-7 py-4 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 transition-shadow hover:shadow-xl hover:shadow-primary/30"
                >
                  Começar agora
                  <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}>
                <a
                  href="#pricing"
                  className="inline-flex w-full items-center justify-center gap-2 px-7 py-4 rounded-xl bg-card border border-border font-semibold text-foreground transition-colors hover:border-primary/40"
                >
                  Ver planos e preços
                </a>
              </motion.div>
            </div>

            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3 pt-4">
              {heroChecks.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Icon size={15} className="text-primary flex-shrink-0" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Painel de prova do produto */}
          <motion.div
            className="relative"
            data-hero-panel
            initial={false}
            whileHover={{ rotateX: -1.5, rotateY: 2 }}
            transition={{ type: "spring", stiffness: 140, damping: 18 }}
            style={{ transformPerspective: 1200 }}
          >
            <div className="relative rounded-[2rem] border border-border bg-gradient-to-br from-secondary to-card p-5 sm:p-7 space-y-5">
              <div className="relative overflow-hidden rounded-2xl border border-border">
                <motion.img
                  src={heroTiger}
                  alt="Tigre representando força e controle na gestão de empréstimos"
                  width={1280}
                  height={1280}
                  className="w-full h-[180px] sm:h-[220px] object-cover object-center"
                  initial={{ scale: 1.12 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1] }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-card/10 to-transparent" />
                <p className="absolute bottom-3 left-4 font-editorial text-sm sm:text-base font-bold text-foreground">
                  Força e controle na sua carteira
                </p>
              </div>

              <div className="rounded-2xl bg-card border border-border p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-subtle font-semibold">
                      Painel do dia
                    </p>
                    <p className="font-editorial text-lg font-bold text-foreground mt-1">Sua carteira hoje</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Tempo real
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-[10px] uppercase tracking-wider text-subtle font-semibold">
                      Recebido hoje
                    </p>
                    <AnimatedNumber
                      value={15420}
                      decimals={2}
                      prefix="R$ "
                      className="tnum block text-lg sm:text-xl font-bold text-foreground mt-1 whitespace-nowrap"
                    />
                    <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        whileInView={{ width: "72%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-[10px] uppercase tracking-wider text-subtle font-semibold">
                      Inadimplência
                    </p>
                    <AnimatedNumber
                      value={2.4}
                      decimals={1}
                      suffix="%"
                      className="tnum block text-xl font-bold text-foreground mt-1"
                    />
                    <p className="flex items-center gap-1 text-[11px] text-primary mt-3 font-medium">
                      <TrendingDown size={12} /> 0,8% este mês
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-border divide-y divide-border">
                  {rows.map((row, i) => (
                    <motion.div
                      key={row.name}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                      initial={{ opacity: 0, x: 14 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + i * 0.12, duration: 0.5, ease: "easeOut" }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{row.name}</p>
                        <p className="text-[11px] text-subtle truncate">{row.info}</p>
                      </div>
                      <span
                        className={`tnum text-sm font-semibold whitespace-nowrap flex-shrink-0 ${
                          row.ok ? "text-foreground" : "text-destructive"
                        }`}
                      >
                        {row.value}
                      </span>
                    </motion.div>
                  ))}
                </div>

                <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
                  <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <TrendingUp size={14} className="text-primary" />
                    Agente de IA no WhatsApp
                  </span>
                  <span className="tnum text-xs font-bold text-foreground whitespace-nowrap">
                    142 mensagens · 98,2%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
