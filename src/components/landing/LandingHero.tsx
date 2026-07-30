import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Clock, MessageCircle, TrendingUp, TrendingDown } from "lucide-react";

const heroChecks = [
  { icon: ShieldCheck, label: "Pagamento seguro via Mercado Pago" },
  { icon: Clock, label: "Pronto para usar em minutos" },
  { icon: MessageCircle, label: "Suporte de gente de verdade" },
];

const LandingHero = () => {
  return (
    <section id="home" className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-28">
      <div className="absolute inset-0 rule-grid opacity-[0.5] pointer-events-none" aria-hidden />
      <div
        className="absolute -top-40 right-0 w-[520px] h-[520px] rounded-full bg-primary/10 blur-3xl pointer-events-none"
        aria-hidden
      />

      <div className="container mx-auto px-5 sm:px-6 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Coluna editorial */}
          <div className="space-y-7 max-w-xl">
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
              <Link
                to="/checkout"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:opacity-90 transition-all"
              >
                Começar agora
                <ArrowRight size={17} />
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-card border border-border font-semibold text-foreground hover:border-primary/40 transition-all"
              >
                Ver planos e preços
              </a>
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
          <div className="relative">
            <div className="relative rounded-[2rem] border border-border bg-gradient-to-br from-secondary to-card p-5 sm:p-7">
              <div className="rounded-2xl bg-card border border-border p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-subtle font-semibold">
                      Painel do dia
                    </p>
                    <p className="font-editorial text-lg font-bold text-foreground mt-1">Sua carteira hoje</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                    Tempo real
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-[10px] uppercase tracking-wider text-subtle font-semibold">
                      Recebido hoje
                    </p>
                    <p className="tnum text-xl font-bold text-foreground mt-1">R$ 15.420,00</p>
                    <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full w-[72%] bg-primary" />
                    </div>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-[10px] uppercase tracking-wider text-subtle font-semibold">
                      Inadimplência
                    </p>
                    <p className="tnum text-xl font-bold text-foreground mt-1">2,4%</p>
                    <p className="flex items-center gap-1 text-[11px] text-primary mt-3 font-medium">
                      <TrendingDown size={12} /> 0,8% este mês
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-border divide-y divide-border">
                  {[
                    { name: "João Silva", info: "Parcela 3/10 · vence hoje", value: "R$ 1.200,00", ok: true },
                    { name: "Maria Souza", info: "Parcela 6/12 · pago", value: "R$ 850,00", ok: true },
                    { name: "Carlos Lima", info: "Parcela 2/8 · 3 dias em atraso", value: "R$ 1.040,00", ok: false },
                  ].map((row) => (
                    <div key={row.name} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{row.name}</p>
                        <p className="text-[11px] text-subtle truncate">{row.info}</p>
                      </div>
                      <span
                        className={`tnum text-sm font-semibold ${
                          row.ok ? "text-foreground" : "text-destructive"
                        }`}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
                  <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <TrendingUp size={14} className="text-primary" />
                    Agente de IA no WhatsApp
                  </span>
                  <span className="tnum text-xs font-bold text-foreground">142 mensagens · 98,2%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
