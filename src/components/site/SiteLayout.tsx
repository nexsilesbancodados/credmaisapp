import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import logo from "@/assets/credmais-logo.jpg";

const NAV = [
  { to: "/inteligencia", label: "Cobrança" },
  { to: "/sobre-credmais", label: "O app" },
  { to: "/missao", label: "Missão" },
  { to: "/planos", label: "Planos" },
];

/** Fine film-grain overlay — keeps the deep navy from looking flat/synthetic. */
export function Grain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1] opacity-[0.055] mix-blend-soft-light"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-[#5B8FD9]">
      <span className="h-px w-8 bg-[#1B6EF3]/60" />
      {children}
    </div>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#050B18]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] w-full max-w-[1160px] items-center justify-between px-5">
        <Link to="/" className="group flex items-center gap-3">
          <img
            src={logo}
            alt="CredMais App"
            className="h-9 w-9 rounded-full ring-1 ring-[#1B6EF3]/40 transition-shadow group-hover:shadow-[0_0_18px_rgba(27,110,243,0.5)]"
            loading="eager"
          />
          <span className="font-display text-[15px] font-semibold tracking-[-0.01em] text-white">
            Cred<span className="text-[#3B8DFF]">Mais</span>
          </span>
        </Link>

        <nav className="hidden items-center md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={`relative px-4 py-2 text-[13px] tracking-wide transition-colors ${
                pathname === n.to ? "text-white" : "text-white/55 hover:text-white"
              }`}
            >
              {n.label}
              {pathname === n.to && (
                <span className="absolute inset-x-4 -bottom-[1px] h-px bg-[#3B8DFF]" />
              )}
            </Link>
          ))}
          <span className="mx-3 h-4 w-px bg-white/10" />
          <Link to="/login" className="px-2 text-[13px] text-white/55 transition-colors hover:text-white">
            Entrar
          </Link>
          <Link
            to="/checkout?plan=completo"
            className="ml-3 rounded-full bg-white px-5 py-2 text-[13px] font-semibold text-[#050B18] transition-transform hover:-translate-y-[1px] hover:shadow-[0_8px_24px_rgba(255,255,255,0.15)]"
          >
            Assinar
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-white md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/[0.07] bg-[#050B18] px-5 py-4 md:hidden">
          <div className="flex flex-col">
            {[...NAV, { to: "/login", label: "Entrar" }].map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between border-b border-white/[0.06] py-4 text-[15px] text-white/80"
              >
                {n.label}
                <span className="text-[#3B8DFF]">↗</span>
              </Link>
            ))}
            <Link
              to="/checkout?plan=completo"
              onClick={() => setOpen(false)}
              className="mt-5 rounded-full bg-white px-4 py-3.5 text-center text-sm font-semibold text-[#050B18]"
            >
              Assinar agora
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative border-t border-white/[0.07] bg-[#040915] px-5 py-14">
      <div className="mx-auto flex w-full max-w-[1160px] flex-col gap-10 md:flex-row md:justify-between">
        <div className="max-w-xs">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="h-9 w-9 rounded-full ring-1 ring-[#1B6EF3]/30" loading="lazy" />
            <div className="font-display text-sm font-semibold text-white">CredMais App</div>
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-white/45">
            Carteira, parcelas, juros de atraso e cobrança no WhatsApp em um só lugar.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-[13px] sm:gap-x-20">
          <div className="col-span-2 text-[11px] uppercase tracking-[0.28em] text-white/30 sm:col-span-1">
            Navegar
          </div>
          <div className="hidden text-[11px] uppercase tracking-[0.28em] text-white/30 sm:block">Contato</div>
          <div className="flex flex-col gap-2.5 text-white/60">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="w-fit hover:text-white">
                {n.label}
              </Link>
            ))}
            <Link to="/privacidade" className="w-fit hover:text-white">
              Privacidade
            </Link>
          </div>
          <div className="flex flex-col gap-2.5 text-white/60">
            <a href="https://wa.me/5511964541758" target="_blank" rel="noreferrer" className="w-fit hover:text-white">
              (11) 96454-1758
            </a>
            <Link to="/login" className="w-fit hover:text-white">
              Acessar painel
            </Link>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-12 flex w-full max-w-[1160px] flex-col gap-2 border-t border-white/[0.06] pt-6 text-[11px] text-white/25 sm:flex-row sm:justify-between">
        <span>© {new Date().getFullYear()} CredMais App</span>
        <span>São Paulo, Brasil</span>
      </div>
    </footer>
  );
}

export function SitePage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050B18] font-body text-white">
      <Grain />
      <SiteHeader />
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full opacity-30 blur-[110px]"
          style={{ background: "radial-gradient(circle,#1B6EF3 0%,transparent 70%)" }}
        />
        <div className="relative mx-auto w-full max-w-[1160px] px-5 pb-14 pt-16 md:pt-24">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="font-display mt-6 max-w-3xl text-[clamp(2rem,6vw,3.6rem)] font-semibold leading-[1.03] tracking-[-0.03em]">
            {title}
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-white/55 md:text-base">{intro}</p>
        </div>
      </section>
      <main className="relative mx-auto w-full max-w-[1160px] px-5 pb-24">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-[20px] border border-white/[0.08] bg-gradient-to-b from-white/[0.045] to-transparent p-6 transition-colors hover:border-white/20 md:p-8 ${className}`}
    >
      {children}
    </div>
  );
}
