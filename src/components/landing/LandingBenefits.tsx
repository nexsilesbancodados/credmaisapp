import { Quote } from "lucide-react";

const stats = [
  { label: "Operações ativas", value: "2.500+" },
  { label: "Clientes gerenciados", value: "150 mil+" },
  { label: "Aumento na recuperação", value: "32%" },
  { label: "Dados protegidos", value: "100%" },
];

const benefits = [
  {
    title: "Suporte que responde rápido",
    desc: "Gente de verdade no WhatsApp para destravar sua operação no mesmo dia.",
  },
  {
    title: "Novidades sem custo extra",
    desc: "Toda melhoria e recurso novo já entra na sua conta, sem upgrade surpresa.",
  },
  {
    title: "Ambiente seguro de ponta a ponta",
    desc: "Contratos e dados de clientes protegidos com criptografia e backup diário.",
  },
  {
    title: "Feito para dar resultado",
    desc: "Menos atraso, menos calote e um lucro que você acompanha parcela por parcela.",
  },
];

const LandingBenefits = () => {
  return (
    <section id="benefits" className="py-20 lg:py-28">
      <div className="container mx-auto px-5 sm:px-6 space-y-16 lg:space-y-20">
        {/* Faixa de números */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-6 rounded-[2rem] border border-border bg-card px-6 py-10 sm:px-10">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="tnum font-editorial text-[clamp(1.6rem,3vw,2.25rem)] font-bold text-foreground">
                {stat.value}
              </p>
              <p className="text-[10px] sm:text-[11px] text-subtle uppercase tracking-[0.14em] font-semibold mt-2">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Benefícios + depoimento */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-16 items-start">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold mb-3">
              Benefícios
            </p>
            <h2 className="text-[clamp(1.75rem,3.6vw,2.75rem)] font-bold text-foreground leading-tight mb-8">
              Por que quem empresta escolhe o CredMais App.
            </h2>
            <div className="divide-y divide-border">
              {benefits.map((item) => (
                <div key={item.title} className="py-5 first:pt-0">
                  <h3 className="text-base font-bold text-foreground mb-1.5">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <figure className="paper-card p-8 sm:p-10">
            <Quote size={28} className="text-primary mb-6" />
            <blockquote className="font-editorial text-xl sm:text-2xl leading-snug text-foreground">
              “Eu controlava tudo em caderno e planilha. Hoje abro o painel de manhã, vejo quem vence no dia
              e a cobrança já saiu sozinha.”
            </blockquote>
            <figcaption className="mt-8 pt-6 border-t border-border">
              <p className="text-sm font-bold text-foreground">Operação com 180 contratos ativos</p>
              <p className="text-xs text-subtle mt-1">Cliente CredMais App desde 2024</p>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
};

export default LandingBenefits;
