import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";

const LandingCTA = () => {
  return (
    <section className="py-20 lg:py-28 bg-card border-t border-border">
      <div className="container mx-auto px-5 sm:px-6">
        <div
          data-anim="scale"
          className="relative overflow-hidden rounded-[2rem] border border-border bg-background px-7 py-12 sm:px-12 sm:py-16"
        >
          <div
            className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none"
            aria-hidden
          />
          <div className="relative max-w-2xl">
            <h2 className="text-[clamp(1.75rem,3.8vw,2.75rem)] font-bold text-foreground leading-tight">
              Comece hoje e receba a próxima parcela em dia.
            </h2>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              Leve seus contratos para um lugar onde nada se perde: cada parcela cobrada, cada real
              registrado e o lucro sempre visível.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link
                to="/checkout"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:opacity-90 transition-all"
              >
                Assinar agora
                <ArrowRight size={17} />
              </Link>
              <a
                href="https://wa.me/5511964541758"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl border border-border font-semibold text-foreground hover:border-primary/40 transition-all"
              >
                <MessageCircle size={17} />
                Falar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingCTA;
