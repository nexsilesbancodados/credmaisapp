import { Users, CalendarClock, MessageSquareText, LineChart, Wallet, ShieldCheck } from "lucide-react";
import eagleMascot from "@/assets/eagle-mascot.png";

const features = [
  {
    icon: Users,
    title: "Clientes e contratos",
    text: "Cadastro em etapas, histórico completo, score de crédito e renegociação sem sair da ficha.",
  },
  {
    icon: CalendarClock,
    title: "Parcelas e juros diários",
    text: "4% ao dia acumulativo aplicado automaticamente, com detalhamento de cada centavo cobrado.",
  },
  {
    icon: MessageSquareText,
    title: "Cobrança no WhatsApp",
    text: "Mensagens curtas com PIX e link do portal, disparadas por régua automática todos os dias.",
  },
  {
    icon: LineChart,
    title: "Painel e relatórios",
    text: "Lucro realizado, carteira ativa, inadimplência e comparativos de período em tempo real.",
  },
  {
    icon: Wallet,
    title: "Investidores",
    text: "Aportes, rateio de lucro e portal próprio com extrato em PDF para cada investidor.",
  },
  {
    icon: ShieldCheck,
    title: "Portal do cliente",
    text: "Acesso por CPF, segunda via, comprovantes e negociação — sem você atender no manual.",
  },
];

const LandingFeatures = () => {
  return (
    <section id="features" className="py-20 lg:py-28 relative">
      <div className="container mx-auto px-5 sm:px-6">
        <div className="max-w-2xl">
          <span className="text-[10px] uppercase tracking-[0.3em] text-primary">A plataforma</span>
          <h2 className="font-editorial text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.05] text-foreground mt-4">
            Tudo o que a sua operação faz no papel, feito aqui em segundos.
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border rounded-3xl overflow-hidden" data-anim-group>
          {features.map(({ icon: Icon, title, text }, i) => (
            <div key={title} data-anim="up" className="group bg-card p-7 sm:p-8 transition-colors hover:bg-secondary/60">
              <div className="flex items-center justify-between">
                <Icon size={22} className="text-primary" />
                <span className="tnum text-[11px] tracking-[0.2em] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="font-editorial text-2xl text-foreground mt-6">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mt-3">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center gap-6 rounded-3xl border border-border obsidian-card p-7 sm:p-9" data-anim="scale">
          <img
            src={eagleMascot}
            alt="Mascote águia CredMais"
            width={160}
            height={160}
            loading="lazy"
            className="w-24 h-24 sm:w-32 sm:h-32 object-contain flex-shrink-0"
          />
          <div className="text-center sm:text-left">
            <p className="font-editorial text-2xl sm:text-3xl text-foreground">
              A águia enxerga primeiro. Você cobra antes.
            </p>
            <p className="text-sm text-muted-foreground mt-3 max-w-xl">
              Alertas de vencimento, aging de carteira e agente de IA trabalhando 24h para que
              nenhuma parcela vire prejuízo.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingFeatures;
