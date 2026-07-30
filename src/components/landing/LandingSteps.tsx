import { UserPlus, FileSignature, Send, LineChart } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Cadastre o cliente",
    desc: "Nome, CPF, contato e documentos em um formulário guiado que leva menos de dois minutos.",
  },
  {
    icon: FileSignature,
    step: "02",
    title: "Monte o empréstimo",
    desc: "Valor, taxa, prazo e frequência. O sistema mostra parcela e lucro antes de você confirmar.",
  },
  {
    icon: Send,
    step: "03",
    title: "Deixe a cobrança rodar",
    desc: "Lembretes e cobranças saem no WhatsApp com PIX e link do portal, no dia certo.",
  },
  {
    icon: LineChart,
    step: "04",
    title: "Acompanhe o lucro",
    desc: "Painel diário com recebido, a receber, atrasos e ROI real da sua carteira.",
  },
];

const LandingSteps = () => {
  return (
    <section id="how" className="py-20 lg:py-28 bg-card border-y border-border">
      <div className="container mx-auto px-5 sm:px-6">
        <div className="max-w-2xl mb-12 lg:mb-16">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold mb-3">
            Como funciona
          </p>
          <h2 className="text-[clamp(1.75rem,3.6vw,2.75rem)] font-bold text-foreground leading-tight">
            Quatro passos entre a planilha e o controle total.
          </h2>
        </div>

        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map(({ icon: Icon, step, title, desc }) => (
            <li key={step} className="relative pt-6">
              <span className="absolute top-0 left-0 h-px w-full bg-border" aria-hidden />
              <span className="tnum font-editorial text-2xl font-bold text-primary">{step}</span>
              <span className="mt-4 mb-3 w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <Icon size={18} className="text-foreground" />
              </span>
              <h3 className="text-base font-bold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default LandingSteps;
