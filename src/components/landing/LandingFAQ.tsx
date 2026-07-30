import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    q: "Preciso instalar algo no computador?",
    a: "Não. O CredMais App funciona no navegador do celular, tablet e computador. No celular você ainda pode instalá-lo como aplicativo na tela inicial.",
  },
  {
    q: "Como funciona a cobrança no WhatsApp?",
    a: "No plano Completo, o sistema envia mensagens curtas com o valor atualizado, a chave PIX e o link do portal do cliente nos dias que você definir. O agente de IA responde dúvidas e conduz o cliente até o pagamento.",
  },
  {
    q: "Meus clientes conseguem ver as parcelas deles?",
    a: "Sim. O portal do cliente é aberto com o CPF: ele vê parcelas, valores atualizados com juros e paga direto por PIX, sem precisar te ligar.",
  },
  {
    q: "Consigo trabalhar com juros diários e multa por atraso?",
    a: "Sim. Você define taxa, prazo, frequência (diária, semanal ou mensal), uso de dias úteis e os juros diários de atraso. O cálculo é feito automaticamente em cada parcela.",
  },
  {
    q: "Existe fidelidade ou multa para cancelar?",
    a: "Não. A assinatura é mensal e você cancela quando quiser, sem multa. Seus dados permanecem disponíveis para exportação.",
  },
  {
    q: "Posso trocar de plano depois?",
    a: "Pode, a qualquer momento. Ao subir para o Completo, as automações e o agente de IA são liberados na hora.",
  },
];

const LandingFAQ = () => {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 lg:py-28">
      <div className="container mx-auto px-5 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16" data-anim-group>
          <div data-anim="up">
            <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold mb-3">
              Dúvidas
            </p>
            <h2 className="text-[clamp(1.75rem,3.6vw,2.75rem)] font-bold text-foreground leading-tight">
              Perguntas frequentes.
            </h2>
            <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
              Ficou algo de fora? Fale com a gente no WhatsApp{" "}
              <a
                href="https://wa.me/5511964541758"
                className="text-primary font-semibold underline-offset-4 hover:underline"
              >
                (11) 96454-1758
              </a>
              .
            </p>
          </div>

          <div className="divide-y divide-border border-y border-border" data-anim="up">
            {faqs.map((item, i) => {
              const isOpen = open === i;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full flex items-start justify-between gap-4 py-5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="text-base font-semibold text-foreground">{item.q}</span>
                    <span className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                      {isOpen ? <Minus size={14} /> : <Plus size={14} />}
                    </span>
                  </button>
                  {isOpen && (
                    <p className="text-sm text-muted-foreground leading-relaxed pb-5 pr-10 animate-fade-in">
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingFAQ;
