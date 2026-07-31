import { Reveal, Item, VexonShell, VexonSection } from "@/components/vexon/VexonShell";
import { TextEffect } from "@/components/vexon/ui/text-effect";

const MODULES = [
  { k: "Clientes e contratos", v: "Cadastro em etapas, documentos, histórico e score em uma ficha única." },
  { k: "Cobranças do dia", v: "Quem vence hoje, quem atrasou, valor com e sem multa, quitação parcial." },
  { k: "Portais externos", v: "Portal do cliente por CPF e portal do cobrador por token." },
  { k: "Carteira e investidores", v: "Aportes, rendimentos e extratos em PDF para cada investidor." },
  { k: "Lucros e relatórios", v: "Lucro realizado, projetado, gastos e inadimplência por período." },
  { k: "WhatsApp integrado", v: "Inbox, agente de IA, disparos e menus interativos dentro do app." },
];

export default function SobreCredmais() {
  return (
    <VexonShell
      eyebrow="Sobre o CredMais"
      title="Quem empresta merece controle"
      intro="O CredMais nasceu na prática de quem vive de emprestar: nada de planilha, caderno ou memória. Um só app para carteira, cobrança e lucro."
    >
      <VexonSection label="o que nos move">
        <Reveal className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <Item className="lg:col-span-7">
            <TextEffect
              as="h2"
              preset="blur"
              per="word"
              className="font-display text-3xl font-medium leading-tight tracking-tight text-white md:text-5xl"
            >
              Trocamos o improviso por um sistema que acompanha cada parcela, cada atraso e cada pagamento.
            </TextEffect>
          </Item>
          <Item className="lg:col-span-5">
            <p className="text-sm font-light leading-relaxed text-[#E6E6E6] opacity-70 md:text-base">
              Você empresta e o CredMais assume o resto: gera as parcelas, aplica os juros de atraso, envia a cobrança
              no WhatsApp, recebe pelo PIX e mostra em tempo real quanto entrou e quanto sobrou de lucro.
            </p>
            <p className="mt-6 text-sm font-light leading-relaxed text-[#E6E6E6] opacity-50">
              É a mesma disciplina de uma financeira grande, na mão de quem trabalha sozinho ou com uma equipe pequena.
            </p>
          </Item>
        </Reveal>
      </VexonSection>

      <VexonSection label="módulos do app" className="bg-black">
        <Reveal className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-white/10 md:grid-cols-3">
          {MODULES.map((m) => (
            <Item key={m.k} className="group bg-black/40 p-8 transition-colors hover:bg-white/[0.04]">
              <div className="font-display text-xl font-medium tracking-tight text-white">{m.k}</div>
              <p className="mt-3 text-xs leading-relaxed text-[#E6E6E6] opacity-60">{m.v}</p>
            </Item>
          ))}
        </Reveal>
      </VexonSection>

      <VexonSection label="feito para o dia a dia">
        <Reveal className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            ["No celular", "App fluido no bolso, com navegação inferior e cobrança em dois toques."],
            ["No computador", "Painel completo, atalhos de teclado e relatórios prontos para imprimir."],
            ["Sem treinamento", "Fluxos guiados por etapas: qualquer pessoa da equipe usa no primeiro dia."],
          ].map(([t, d]) => (
            <Item key={t} className="rounded-md border border-white/10 bg-black/40 p-8 backdrop-blur-md">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">{t}</div>
              <p className="mt-4 text-sm leading-relaxed text-[#E6E6E6] opacity-70">{d}</p>
            </Item>
          ))}
        </Reveal>
      </VexonSection>
    </VexonShell>
  );
}
