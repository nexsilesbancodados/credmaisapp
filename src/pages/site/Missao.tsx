import { Reveal, Item, VexonShell, VexonSection, DiamondStar } from "@/components/vexon/VexonShell";
import { TextEffect } from "@/components/vexon/ui/text-effect";
import { Link } from "react-router-dom";

const VALUES = [
  { t: "Receber em dia é respeito", d: "Cobrança clara, na hora certa, com valor exato. Sem constrangimento e sem discussão." },
  { t: "Nada de trabalho manual", d: "Se o sistema pode calcular, lembrar ou enviar, ele faz. Seu tempo é para fechar negócio." },
  { t: "Transparência com o cliente", d: "Portal aberto por CPF: parcelas, juros, PIX e histórico visíveis a qualquer hora." },
  { t: "Decisão com número na mão", d: "Lucro, risco e inadimplência sempre atualizados — nunca no achismo." },
];

export default function Missao() {
  return (
    <VexonShell
      eyebrow="Nossa missão"
      title="Zero atraso invisível"
      intro="Nossa missão é simples: fazer com que nenhum atraso passe despercebido e nenhum lucro fique escondido em planilha."
    >
      <VexonSection label="manifesto">
        <Reveal className="max-w-5xl">
          <Item className="mb-8 flex items-center gap-4">
            <DiamondStar className="h-8 w-8 text-white" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">credmais® manifesto</span>
          </Item>
          <TextEffect
            as="h2"
            preset="blur"
            per="word"
            className="font-display text-3xl font-medium leading-tight tracking-tight text-white md:text-5xl"
          >
            Emprestar dinheiro já exige coragem. Cobrar não deveria exigir tempo, memória e desgaste.
          </TextEffect>
          <Item>
            <p className="mt-8 max-w-2xl text-sm font-light leading-relaxed text-[#E6E6E6] opacity-70 md:text-base">
              Construímos o CredMais para que cada real emprestado tenha caminho de volta desenhado: data, valor, juros,
              mensagem e comprovante. O resultado é uma carteira previsível e uma relação mais tranquila com o cliente.
            </p>
          </Item>
        </Reveal>
      </VexonSection>

      <VexonSection label="nossos valores" className="bg-black">
        <Reveal className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-white/10 md:grid-cols-2">
          {VALUES.map((v, i) => (
            <Item key={v.t} className="group relative bg-black/40 p-8 md:p-12">
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                [ 0{i + 1} ]
              </div>
              <div className="font-display mt-6 text-2xl font-medium tracking-tight text-white md:text-3xl">{v.t}</div>
              <p className="mt-4 max-w-md text-sm font-light leading-relaxed text-[#E6E6E6] opacity-70">{v.d}</p>
            </Item>
          ))}
        </Reveal>
      </VexonSection>

      <VexonSection label="para onde vamos">
        <Reveal className="flex flex-col items-start gap-8">
          <Item>
            <TextEffect
              as="h2"
              preset="blur"
              per="word"
              className="font-display max-w-3xl text-2xl font-medium leading-tight tracking-tight text-white md:text-4xl"
            >
              Queremos ser o padrão de gestão de crédito pessoal no Brasil — acessível, automático e justo.
            </TextEffect>
          </Item>
          <Item>
            <Link
              to="/planos"
              className="group relative overflow-hidden rounded-sm border border-white/30 bg-black/60 px-8 py-4 text-xs font-medium uppercase tracking-widest text-white backdrop-blur-3xl transition-all hover:bg-black/80 md:text-sm"
            >
              <div className="absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2 border-white/60 transition-transform group-hover:scale-110" />
              <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-white/60 transition-transform group-hover:scale-110" />
              <span className="relative z-10">Ver planos e começar</span>
            </Link>
          </Item>
        </Reveal>
      </VexonSection>
    </VexonShell>
  );
}
