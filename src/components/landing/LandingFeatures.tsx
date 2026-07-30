import {
  Users,
  FileText,
  Bell,
  BarChart3,
  Smartphone,
  Bot,
  ShieldCheck,
  Wallet,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Clientes organizados",
    desc: "Cadastro completo em etapas, documentos, histórico e score de risco em uma ficha só.",
  },
  {
    icon: FileText,
    title: "Contratos flexíveis",
    desc: "Parcelado ou por porcentagem, diário, semanal ou mensal — com dias úteis e renegociação.",
  },
  {
    icon: Bell,
    title: "Cobrança que acontece",
    desc: "Mensagens curtas no WhatsApp com PIX e link do portal, disparadas na hora certa.",
  },
  {
    icon: Bot,
    title: "Agente de IA 24h",
    desc: "Responde dúvidas, negocia dentro das suas regras e devolve o cliente ao pagamento.",
  },
  {
    icon: BarChart3,
    title: "Lucro sem achismo",
    desc: "Capital na rua, recebido, a receber e ROI real de cada contrato, parcela por parcela.",
  },
  {
    icon: Wallet,
    title: "Carteira de investidores",
    desc: "Aportes, rendimento e extrato em PDF, com portal próprio para cada investidor.",
  },
  {
    icon: Smartphone,
    title: "Portal do cliente",
    desc: "Seu cliente entra com CPF, vê as parcelas e paga sozinho — sem te ligar.",
  },
  {
    icon: ShieldCheck,
    title: "Seguro por padrão",
    desc: "Dados isolados por conta, criptografia, backup diário e conformidade com a LGPD.",
  },
];

const LandingFeatures = () => {
  return (
    <section id="features" className="py-20 lg:py-28">
      <div className="container mx-auto px-5 sm:px-6">
        <div className="max-w-2xl mb-12 lg:mb-16" data-anim="up">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold mb-3">
            Recursos
          </p>
          <h2 className="text-[clamp(1.75rem,3.6vw,2.75rem)] font-bold text-foreground leading-tight">
            Tudo que a sua operação precisa, sem nada que atrapalhe.
          </h2>
          <p className="text-muted-foreground mt-4 leading-relaxed">
            Cada recurso existe para responder uma pergunta prática: quem me deve, quanto, quando e o que
            fazer agora.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5" data-anim-group>
          {features.map(({ icon: Icon, title, desc }) => (
            <article
              key={title}
              data-anim="up"
              className="paper-card p-6 flex flex-col gap-4 transition-transform duration-300 hover:-translate-y-1.5"
            >
              <span className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon size={19} className="text-primary" />
              </span>
              <div>
                <h3 className="text-base font-bold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingFeatures;
