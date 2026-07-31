import { Reveal, Item, VexonShell, VexonSection } from "@/components/vexon/VexonShell";
import { TextEffect } from "@/components/vexon/ui/text-effect";

const PILLARS = [
  {
    n: "[1]",
    title: "Régua de cobrança automática",
    body: "O sistema sabe o que vence hoje, o que venceu ontem e o que já passou da conta. Cada cliente recebe a mensagem certa, no dia certo, com PIX e link do portal.",
  },
  {
    n: "[2]",
    title: "Juros de atraso no automático",
    body: "4% ao dia sobre a parcela, acumulando sozinho. Você nunca mais calcula multa na calculadora nem discute valor no WhatsApp.",
  },
  {
    n: "[3]",
    title: "Agente de IA 24 horas",
    body: "Ele conversa, negocia, envia comprovante de PIX, registra o pagamento e escala para você somente quando precisa de decisão humana.",
  },
  {
    n: "[4]",
    title: "Aging e risco da carteira",
    body: "Veja quem vai atrasar antes de atrasar: faixas de atraso, score do cliente e prioridade de cobrança do dia.",
  },
];

const FLOW = [
  { step: "01", label: "Contrato criado", body: "Parcelas geradas com juros, frequência e datas em segundos." },
  { step: "02", label: "Lembrete enviado", body: "Aviso antes do vencimento com PIX pronto para pagar." },
  { step: "03", label: "Atraso detectado", body: "Multa diária aplicada e cobrança firme disparada sozinha." },
  { step: "04", label: "Pagamento baixado", body: "Recebimento registrado, lucro atualizado, cliente regularizado." },
];

export default function Inteligencia() {
  return (
    <VexonShell
      eyebrow="Inteligência de cobrança"
      title="Cobrar sem cobrar"
      intro="A inteligência do CredMais transforma sua carteira em um sistema que trabalha sozinho: calcula, lembra, cobra, negocia e registra cada centavo."
    >
      <VexonSection label="os quatro pilares">
        <Reveal className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-white/10 md:grid-cols-2">
          {PILLARS.map((p) => (
            <Item key={p.n} className="group relative bg-black/40 p-8 md:p-10">
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">{p.n}</div>
              <div className="font-display mt-6 text-2xl font-medium tracking-tight text-white md:text-3xl">{p.title}</div>
              <p className="mt-4 max-w-md text-sm font-light leading-relaxed text-[#E6E6E6] opacity-70">{p.body}</p>
              <div className="absolute bottom-0 left-0 h-px w-0 bg-white/40 transition-all duration-700 group-hover:w-full" />
            </Item>
          ))}
        </Reveal>
      </VexonSection>

      <VexonSection label="como funciona na prática" className="bg-black">
        <TextEffect
          as="h2"
          preset="blur"
          per="word"
          className="font-display mb-14 max-w-4xl text-3xl font-medium leading-tight tracking-tight text-white md:text-5xl"
        >
          Do empréstimo ao pagamento, sem você lembrar de nada.
        </TextEffect>

        <Reveal className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {FLOW.map((f) => (
            <Item
              key={f.step}
              className="relative rounded-md border border-white/10 bg-black/40 p-6 backdrop-blur-md transition-colors hover:border-white/30"
            >
              <div className="absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2 border-white/30" />
              <div className="font-mono text-4xl font-bold text-white/15">{f.step}</div>
              <div className="mt-6 text-sm font-medium uppercase tracking-widest text-white">{f.label}</div>
              <p className="mt-3 text-xs leading-relaxed text-[#E6E6E6] opacity-60">{f.body}</p>
            </Item>
          ))}
        </Reveal>
      </VexonSection>
    </VexonShell>
  );
}
