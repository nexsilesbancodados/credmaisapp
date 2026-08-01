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

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050B18]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="CredMais App" className="h-9 w-9 rounded-full" loading="eager" />
          <span className="font-display text-base font-semibold tracking-tight text-white">
            Cred<span className="text-[#3B8DFF]">Mais</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={`text-sm transition-colors ${
                pathname === n.to ? "text-white" : "text-white/60 hover:text-white"
              }`}
            >
              {n.label}
            </Link>
          ))}
          <Link to="/login" className="text-sm text-white/60 transition-colors hover:text-white">
            Entrar
          </Link>
          <Link
            to="/checkout?plan=completo"
            className="rounded-lg bg-[#1B6EF3] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3B8DFF]"
          >
            Assinar
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-white md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-[#050B18] px-5 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {[...NAV, { to: "/login", label: "Entrar" }].map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-3 text-sm text-white/80 hover:bg-white/5 hover:text-white"
              >
                {n.label}
              </Link>
            ))}
            <Link
              to="/checkout?plan=completo"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-lg bg-[#1B6EF3] px-4 py-3 text-center text-sm font-medium text-white"
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
    <footer className="border-t border-white/10 bg-[#050B18] px-5 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="" className="h-8 w-8 rounded-full" loading="lazy" />
          <div>
            <div className="font-display text-sm font-semibold text-white">CredMais App</div>
            <div className="text-xs text-white/40">Gestão de empréstimos e cobrança</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="hover:text-white">
              {n.label}
            </Link>
          ))}
          <a href="https://wa.me/5511964541758" target="_blank" rel="noreferrer" className="hover:text-white">
            (11) 96454-1758
          </a>
          <Link to="/privacidade" className="hover:text-white">
            Privacidade
          </Link>
        </div>
      </div>
      <div className="mx-auto mt-8 w-full max-w-6xl text-xs text-white/30">
        © {new Date().getFullYear()} CredMais App. Todos os direitos reservados.
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
      <SiteHeader />
      <section className="mx-auto w-full max-w-6xl px-5 pb-12 pt-16 md:pt-24">
        <div className="text-xs uppercase tracking-[0.2em] text-[#3B8DFF]">{eyebrow}</div>
        <h1 className="font-display mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/60">{intro}</p>
      </section>
      <main className="mx-auto w-full max-w-6xl px-5 pb-20">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8 ${className}`}>{children}</div>
  );
}
