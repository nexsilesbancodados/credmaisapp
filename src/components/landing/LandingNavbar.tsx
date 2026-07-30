import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useWhiteLabel } from "@/contexts/WhiteLabelContext";
import eagleLogo from "@/assets/eagle-logo.webp";

const navLinks = [
  { name: "Início", href: "#home" },
  { name: "Recursos", href: "#features" },
  { name: "Dúvidas", href: "#faq" },
  { name: "Planos", href: "#pricing" },
  { name: "Contato", href: "#contact" },
];

const LandingNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { config } = useWhiteLabel();

  const logoSrc = config.companyLogo || eagleLogo;
  const brandTitle = config.companyName || "CredMais App";

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-background/85 backdrop-blur-xl py-3 border-b border-border"
          : "bg-transparent py-5"
      }`}
    >
      <div className="container mx-auto px-5 sm:px-6 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-3 text-left"
          aria-label={brandTitle}
        >
          <img src={logoSrc} alt={brandTitle} className="w-9 h-9 rounded-xl border border-border" />
          <span className="flex flex-col leading-none">
            <span className="font-editorial text-base sm:text-lg font-bold text-foreground">
              {brandTitle}
            </span>
            <span className="text-[9px] text-subtle tracking-[0.18em] uppercase mt-1">
              Gestão de empréstimos
            </span>
          </span>
        </button>

        <nav className="hidden lg:flex items-center gap-7">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.name}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
          >
            Entrar
          </Link>
          <Link
            to="/checkout"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            Assinar agora
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden text-foreground p-2 -mr-2"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b border-border overflow-hidden"
          >
            <div className="flex flex-col p-6 gap-5">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-base font-medium text-muted-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                <Link
                  to="/login"
                  className="text-center py-3 rounded-xl border border-border text-foreground font-semibold"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Entrar
                </Link>
                <Link
                  to="/checkout"
                  className="text-center py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Assinar agora
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default LandingNavbar;
