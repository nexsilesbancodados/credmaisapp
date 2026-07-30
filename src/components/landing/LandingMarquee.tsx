import { motion } from "framer-motion";

const items = [
  "Cobrança automática no WhatsApp",
  "Juros diários calculados sozinhos",
  "Portal do cliente com PIX",
  "Carteira de investidores",
  "Agente de IA 24 horas",
  "Lucro em tempo real",
];

const LandingMarquee = () => {
  const loop = [...items, ...items];

  return (
    <section
      aria-label="Destaques do produto"
      className="relative border-y border-border bg-card/60 py-4 overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />

      <motion.div
        className="flex w-max items-center gap-10"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
      >
        {loop.map((text, i) => (
          <span
            key={`${text}-${i}`}
            className="flex items-center gap-10 text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground whitespace-nowrap"
          >
            {text}
            <span className="w-1.5 h-1.5 rounded-full bg-primary/70" aria-hidden />
          </span>
        ))}
      </motion.div>
    </section>
  );
};

export default LandingMarquee;
