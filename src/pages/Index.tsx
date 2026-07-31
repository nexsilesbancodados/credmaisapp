/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { motion, useScroll, useTransform, useMotionValue, useSpring, type Variants } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { CursorFollower } from "@/components/vexon/ui/cursor-follower";
import { CursorProvider, CursorFollow } from "@/components/vexon/ui/cursor";
import { Preloader } from "@/components/vexon/Preloader";
import { ParticleOrb } from "@/components/vexon/ParticleOrb";
import { TextEffect } from "@/components/vexon/ui/text-effect";
import { PLAN_LIST } from "@/lib/plans";
import Lenis from "lenis";

const DiamondStar = ({ className }: { className?: string }) => (
  <motion.div
    animate={{ rotateY: 360 }}
    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
    className={className}
    style={{ transformStyle: "preserve-3d" }}
  >
    <svg 
      viewBox="0 0 100 100" 
      className="h-full w-full"
      fill="currentColor"
    >
      <path d="M50 0C50 35 65 50 100 50C65 50 50 65 50 100C50 65 35 50 0 50C35 50 50 35 50 0Z" />
    </svg>
  </motion.div>
);

const NavLink = ({ children }: { children: React.ReactNode }) => (
  <a
    href="#"
    className="group flex items-center gap-1 text-[11px] font-medium tracking-widest text-[#8E9299] transition-colors hover:text-white"
  >
    {children}
    <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
  </a>
);

const HoverCardImage = ({ src, alt, className = "" }: { src: string; alt: string; className?: string }) => {
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const [isHovered, setIsHovered] = React.useState(false);

  const mouseXSpring = useSpring(x, { stiffness: 80, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 80, damping: 20 });

  const moveX = useTransform(mouseXSpring, [0, 1], [-25, 25]);
  const moveY = useTransform(mouseYSpring, [0, 1], [-25, 25]);

  return (
    <>
      <div 
        className="absolute inset-0 z-30"
        onMouseEnter={() => setIsHovered(true)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          x.set((e.clientX - rect.left) / rect.width);
          y.set((e.clientY - rect.top) / rect.height);
        }}
        onMouseLeave={() => {
          x.set(0.5);
          y.set(0.5);
          setIsHovered(false);
        }}
      />
      <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
        <motion.img 
          src={src} 
          alt={alt}
          animate={{ 
            scale: isHovered ? 0.95 : 0.65 
          }}
          transition={{
            type: "spring",
            stiffness: 60,
            damping: 25
          }}
          style={{ 
            x: moveX,
            y: moveY,
          }}
          className={`h-full w-full object-cover opacity-60 group-hover:opacity-90 transition-opacity duration-700 ${className}`}
          referrerPolicy="no-referrer"
        />
      </div>
    </>
  );
};

export default function App() {
  const [loading, setLoading] = React.useState(true);
  
  useEffect(() => {
    if (loading) {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
      window.scrollTo(0, 0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      
      const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
      });

      lenis.scrollTo(0, { immediate: true });

      function raf(time: number) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }

      requestAnimationFrame(raf);

      return () => {
        lenis.destroy();
      };
    }
  }, [loading]);

  const { scrollY } = useScroll();
  const videoScale = useTransform(scrollY, [0, 800], [1, 1.2]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 100, opacity: 0, rotateX: 15, scale: 0.9, filter: "blur(10px)" },
    visible: { 
      y: 0, 
      opacity: 1, 
      rotateX: 0, 
      scale: 1,
      filter: "blur(0px)",
      transition: { 
        duration: 0.8, 
        ease: [0.16, 1, 0.3, 1] as const 
      } 
    },
  };

  const cardVariants: Variants = {
    hidden: { y: 100, opacity: 0, rotateX: 15, scale: 0.9, filter: "blur(10px)" },
    visible: { 
      y: 0, 
      opacity: 1, 
      rotateX: 0, 
      scale: 1,
      filter: "blur(0px)",
      transition: { 
        duration: 1.6, 
        ease: [0.16, 1, 0.3, 1] as const 
      } 
    },
  };

  return (
    <div className="relative min-h-screen bg-black font-sans selection:bg-white selection:text-black">
      <Preloader onComplete={() => {
        setLoading(false);
      }} />
      
      {/* Background — Three.js particle halo (replaces the looped video) */}
      <motion.div
        style={{ scale: loading ? 1 : videoScale }}
        className="fixed inset-0 z-0 origin-center"
      >
        <ParticleOrb className="h-full w-full" start={!loading} />
      </motion.div>

      {!loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >

      {/* Navigation */}
      <nav className="fixed top-0 left-0 z-50 flex w-full items-start justify-between px-6 py-6 md:px-10 md:py-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col gap-6 md:gap-10"
        >
          <div className="font-logo text-2xl font-bold tracking-tighter md:text-3xl text-white">
            CREDMAIS
          </div>
          <div className="hidden font-mono text-[11px] tracking-[0.2em] text-[#E6E6E6] md:block uppercase opacity-50">
            [ V.01.3.N ]
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-end gap-2"
        >
          <a href="#inteligencia" className="group flex items-center gap-1 text-[11px] font-medium tracking-widest text-[#8E9299] transition-colors hover:text-white uppercase">
            INTELIGÊNCIA DE COBRANÇA
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
          <a href="#sobre" className="group flex items-center gap-1 text-[11px] font-medium tracking-widest text-[#8E9299] transition-colors hover:text-white uppercase">
            SOBRE O CREDMAIS
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
          <a href="#missao" className="group flex items-center gap-1 text-[11px] font-medium tracking-widest text-[#8E9299] transition-colors hover:text-white uppercase">
            NOSSA MISSÃO
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
          <a href="#planos" className="group flex items-center gap-1 text-[11px] font-medium tracking-widest text-white transition-colors hover:opacity-70 uppercase">
            PLANOS
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </motion.div>
      </nav>

      <div className="relative z-10">
        {/* Section 1: Hero */}
        <section id="inteligencia" className="flex min-h-screen items-center px-6 pt-32 pb-40 md:px-10 md:pt-20 md:pb-20">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid w-full grid-cols-1 lg:grid-cols-12 lg:gap-10"
          >
            {/* Left Column - Big Headline */}
            <div className="flex flex-col justify-center lg:col-span-8">
              <motion.div variants={itemVariants} className="mb-6 font-mono text-[10px] tracking-[0.2em] text-[#E6E6E6] md:text-[11px]">
                [ INTELIGÊNCIA DE COBRANÇA ]
              </motion.div>
              
              <motion.h1 
                variants={itemVariants}
                className="font-display text-[12vw] leading-[0.9] font-bold uppercase tracking-tight md:text-[7vw] lg:text-[6vw] text-white"
              >
                <div className="flex items-center gap-4">
                  <TextEffect 
                    preset="blur" 
                    per="char" 
                    as="div"
                    className="[mask-image:linear-gradient(to_right,rgba(0,0,0,0.15),white_85%)] inline-block text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                  >
                    COBRANÇA QUE
                  </TextEffect>
                </div>
                <div className="flex items-center gap-4 text-[#E6E6E6] md:gap-8">
                  <div className="relative">
                    <DiamondStar className="h-[0.8em] w-[0.8em] text-white" />
                  </div>
                  <TextEffect 
                    preset="blur" 
                    per="char" 
                    delay={0.5} 
                    as="span" 
                    className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                  >
                    TRABALHA NO
                  </TextEffect>
                </div>
                <div className="flex items-center gap-4">
                  <TextEffect 
                    preset="blur" 
                    per="char" 
                    delay={1}
                    as="div"
                    className="[mask-image:linear-gradient(to_right,white_15%,rgba(0,0,0,0.15))] inline-block text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                  >
                    SEU LUGAR
                  </TextEffect>
                </div>
              </motion.h1>
            </div>

            {/* Right Column - Info & Actions */}
            <div className="flex flex-col justify-end gap-8 pt-12 md:gap-12 lg:col-span-4 pb-12 md:pb-20 translate-y-[58px]">
               <motion.div variants={itemVariants} className="flex items-center justify-start">
                  <div className="text-3xl font-light text-[#E6E6E6] tracking-tighter md:text-4xl">
                    ( <span className="font-mono font-bold">A</span> )
                  </div>
               </motion.div>

               <motion.p 
                variants={itemVariants}
                className="max-w-xs text-xs leading-relaxed text-[#E6E6E6] md:text-sm"
               >
                  O CredMais organiza contratos, calcula juros de atraso e cobra cada cliente no WhatsApp automaticamente — para você receber em dia sem planilha.
               </motion.p>

               <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4 md:gap-6">
                  <Link to="/checkout" className="relative group overflow-hidden rounded-sm bg-black/60 backdrop-blur-3xl px-6 py-3 text-xs font-medium tracking-wide transition-all hover:bg-black/80 md:px-8 md:py-4 md:text-sm text-white border border-white/30">
                    <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-white/60 transition-transform group-hover:scale-110" />
                    <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-white/60 transition-transform group-hover:scale-110" />
                    <span className="relative z-10 uppercase tracking-widest">Quero cobrar no automático</span>
                  </Link>
                  <Link to="/login" className="text-xs font-medium tracking-wide text-white transition-colors hover:opacity-70 md:text-sm">
                    Acessar meu painel
                  </Link>

               </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Section 2: About / Cards */}
        <section id="sobre" className="bg-black/40 flex min-h-screen flex-col justify-center px-6 py-20 backdrop-blur-3xl md:px-10 border-t border-white/5">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            className="mb-20 grid grid-cols-1 gap-12 lg:grid-cols-12"
          >
            <div className="lg:col-span-4">
              <motion.div variants={itemVariants} className="font-mono text-[11px] tracking-[0.2em] text-[#E6E6E6] opacity-50 uppercase">
                / sobre o credmais
              </motion.div>
            </div>
            <div className="lg:col-span-8">
              <TextEffect 
                as="h2"
                preset="blur" 
                per="word"
                className="font-display mb-8 text-3xl font-medium leading-tight text-white md:text-5xl lg:max-w-4xl tracking-tight"
              >
                Nossa tecnologia acompanha cada parcela, cada atraso e cada pagamento para mostrar exatamente quem deve, quanto deve e o que fazer agora.
              </TextEffect>
              <motion.p 
                variants={itemVariants}
                className="max-w-2xl text-sm leading-relaxed text-[#E6E6E6] opacity-60 md:text-base font-light"
              >
                É como ter um gerente financeiro trabalhando 24 horas por dia: ele lembra o cliente, envia o PIX, registra o pagamento e mantém sua carteira sempre sob controle.
              </motion.p>
            </div>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            {/* Card 1 */}
            <motion.div variants={cardVariants} className="group relative aspect-[4/5] overflow-hidden rounded-md bg-black/10 backdrop-blur-md border border-white/10">
              <div className="absolute top-0 right-0 z-40 h-5 w-5 border-t-2 border-r-2 border-white/40" />
              <div className="absolute bottom-0 left-0 z-40 h-5 w-5 border-b-2 border-l-2 border-white/40" />
              <div className="absolute top-4 left-4 z-40 font-mono text-[10px] text-white/40 uppercase tracking-widest">[1]</div>
              <CursorProvider className="h-full w-full">
                <CursorFollow>
                  <div className="z-50 px-3 py-1.5 rounded-full bg-white text-black text-[10px] font-mono uppercase tracking-widest shadow-2xl flex items-center gap-1.5 border border-black/10 whitespace-nowrap min-w-max">
                    Saiba mais
                    <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                </CursorFollow>
                <HoverCardImage 
                  src="https://lh3.googleusercontent.com/d/1AmTkr4HCx8i3d_u4Tn9wo7tJpmEdmJsA" 
                  alt="Contratos organizados"
                />
                <div className="absolute inset-x-0 bottom-0 z-10 h-1/2 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-8 flex flex-col justify-end pointer-events-none">
                  <div className="font-display text-2xl font-medium text-white tracking-tight">Controle total</div>
                  <div className="mt-2 text-sm leading-relaxed text-[#E6E6E6] opacity-70 font-light">
                    Cada contrato, parcela e pagamento registrado em tempo real. Sem planilha, sem cálculo manual.
                  </div>
                </div>
              </CursorProvider>
            </motion.div>

            {/* Card 2 */}
            <motion.div variants={cardVariants} className="group relative aspect-[4/5] overflow-hidden rounded-md bg-black/10 backdrop-blur-md border border-white/10">
              <div className="absolute top-0 right-0 z-40 h-5 w-5 border-t-2 border-r-2 border-white/40" />
              <div className="absolute bottom-0 left-0 z-40 h-5 w-5 border-b-2 border-l-2 border-white/40" />
              <div className="absolute top-4 left-4 z-40 font-mono text-[10px] text-white/40 uppercase tracking-widest">[2]</div>
              <CursorProvider className="h-full w-full">
                <CursorFollow>
                  <div className="z-50 px-3 py-1.5 rounded-full bg-white text-black text-[10px] font-mono uppercase tracking-widest shadow-2xl flex items-center gap-1.5 border border-black/10 whitespace-nowrap min-w-max">
                    Conhecer
                    <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                </CursorFollow>
                <HoverCardImage 
                  src="https://lh3.googleusercontent.com/d/1BP_La8v_6o2vK6gt8IbR7bOJktOrhJrS" 
                  alt="Análise de risco"
                />
                <div className="absolute inset-x-0 bottom-0 z-10 h-1/2 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-8 flex flex-col justify-end pointer-events-none">
                  <div className="font-display text-2xl font-medium text-white tracking-tight">Risco na hora</div>
                  <div className="mt-2 text-sm leading-relaxed text-[#E6E6E6] opacity-70 font-light">
                    A IA mostra quem vai atrasar, quem já atrasou e quanto cobrar — antes do prejuízo aparecer.
                  </div>
                </div>
              </CursorProvider>
            </motion.div>

            {/* Card 3 - Action Card */}
            <motion.div variants={cardVariants} className="group relative aspect-[4/5] overflow-hidden rounded-md bg-black/10 backdrop-blur-md border border-white/10">
              <div className="absolute top-0 right-0 z-40 h-5 w-5 border-t-2 border-r-2 border-white/40" />
              <div className="absolute bottom-0 left-0 z-40 h-5 w-5 border-b-2 border-l-2 border-white/40" />
              <div className="absolute top-4 left-4 z-40 font-mono text-[10px] text-white/40 uppercase tracking-widest">[3]</div>
              <CursorProvider className="h-full w-full">
                <CursorFollow>
                  <div className="z-50 px-3 py-1.5 rounded-full bg-white text-black text-[10px] font-mono uppercase tracking-widest shadow-2xl flex items-center gap-1.5 border border-black/10 whitespace-nowrap min-w-max">
                    Ativar
                    <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                </CursorFollow>
                <HoverCardImage 
                  src="https://lh3.googleusercontent.com/d/11FnLKGrE5ttRp6whRdkpM7VWbIlcxfxH" 
                  alt="Automação de cobrança"
                />
                <div className="absolute inset-x-0 bottom-0 z-10 h-1/2 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-8 flex flex-col justify-end pointer-events-none">
                  <div className="font-display text-2xl font-medium text-white tracking-tight">Cobrança automática</div>
                  <div className="mt-2 text-sm leading-relaxed text-[#E6E6E6] opacity-70 font-light">
                    Mensagens no WhatsApp com PIX e link do portal, disparadas sozinhas nos dias certos.
                  </div>
                </div>
              </CursorProvider>
            </motion.div>
          </motion.div>
        </section>

        {/* Section 3: About Us Modular Grid */}
        <section id="missao" className="relative z-10 border-t border-white/5 bg-black font-sans">
          <div className="grid grid-cols-1 border-b border-white/5 md:grid-cols-4">
            {/* Box 1: Brand/Context */}
            <div className="flex min-h-[200px] flex-col justify-between border-b border-white/5 p-8 md:border-b-0">
              <div className="font-logo text-xl font-bold tracking-tighter text-white opacity-80">
                CREDMAIS®
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-white opacity-40">
                [ desde 2024 ]
              </div>
            </div>

            {/* Box 2: Big Interactive Catchphrase */}
            <div className="flex flex-col justify-center p-8 md:col-span-3 lg:p-12 border-b border-white/5">
              <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.4em] text-white opacity-30">
                / nossa missão:
              </div>
              <h3 className="font-display text-[12vw] font-bold leading-[0.9] uppercase tracking-tight md:text-[8vw] lg:text-[7vw] text-white">
                <span className="flex flex-wrap items-center gap-x-4">
                  <TextEffect 
                    preset="blur" 
                    per="char" 
                    className="inline-block text-white"
                  >
                    Receba em
                  </TextEffect>
                  <TextEffect 
                    preset="blur" 
                    per="char" 
                    delay={0.5}
                    className="[mask-image:linear-gradient(to_right,rgba(0,0,0,0.15),white_85%)] inline-block text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                  >
                    dia
                  </TextEffect>
                  <span className="relative inline-flex items-center">
                    <DiamondStar className="h-[0.8em] w-[0.8em] text-white" />
                  </span>
                </span>
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4">
            {/* Box 3: Empty space / Visual Detail */}
            <div className="hidden md:block">
              <div className="flex h-full items-center justify-center opacity-10">
                {/* Vertical line removed */}
              </div>
            </div>

            {/* Box 4: Metadata */}
            <div className="flex flex-col gap-6 border-b border-white/5 p-8 md:border-b-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-white/10 bg-white/5">
                <div className="h-1 w-1 rounded-full animate-pulse bg-white" />
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white opacity-40">
                tecnologia de cobrança para quem empresta.
              </div>
            </div>

            {/* Box 5: Long Text Description */}
            <div className="flex flex-col justify-center p-8 md:col-span-2 lg:p-12">
              <p className="max-w-xl text-sm font-light leading-relaxed text-white opacity-60 md:text-base">
                Transforme sua operação em uma empresa de crédito organizada: contratos padronizados, juros diários calculados automaticamente, portal para o cliente pagar sozinho e relatórios claros de lucro.
              </p>
              <div className="mt-8 flex items-center gap-4">
                <button className="group flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-70">
                  Nosso manifesto
                  <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Marquee Section */}
          <div className="w-full overflow-hidden border-t border-white/5 py-12 md:py-20">
            <motion.div 
              animate={{ x: [0, -1000] }}
              transition={{ 
                duration: 20, 
                repeat: Infinity, 
                ease: "linear",
              }}
              whileHover={{ animationPlayState: "paused" }} // This doesn't work directly in motion, using CSS instead below
              className="flex whitespace-nowrap hover:[animation-play-state:paused]"
              style={{ 
                animation: 'marquee 40s linear infinite',
              }}
            >
              {[
                "Contratos", "Parcelas", "Juros diários", "WhatsApp", "Portal", "PIX", "Relatórios", "Investidores", "Agente de IA", "Renegociação",
                "Contratos", "Parcelas", "Juros diários", "WhatsApp", "Portal", "PIX", "Relatórios", "Investidores", "Agente de IA", "Renegociação"
              ].map((company, idx) => (
                <span 
                  key={idx} 
                  className="mx-8 cursor-default text-[32px] font-bold tracking-tighter text-white/20 transition-all hover:scale-110 hover:text-white md:mx-16 md:text-[48px]"
                >
                  {company}
                </span>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Section 4: Planos */}
        <section id="planos" className="relative z-10 border-t border-white/5 bg-black px-6 py-24 md:px-10 md:py-32">
          <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.4em] text-white opacity-30">
            / planos e assinatura
          </div>
          <h2 className="max-w-4xl font-display text-[11vw] font-bold uppercase leading-[0.92] tracking-tight text-white md:text-[6vw]">
            Escolha como
            <br />
            <span className="opacity-40">vai operar</span>
          </h2>
          <p className="mt-6 max-w-xl text-sm font-light leading-relaxed text-white opacity-50 md:text-base">
            Assinatura mensal, sem fidelidade. Cancele quando quiser. Acesso liberado em segundos após a confirmação do pagamento.
          </p>

          <div className="mt-16 grid grid-cols-1 gap-px border border-white/10 bg-white/10 md:grid-cols-2">
            {PLAN_LIST.map((plan, idx) => (
              <motion.div
                key={plan.tier}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: idx * 0.1 }}
                className="group relative flex flex-col bg-black p-8 lg:p-12"
              >
                {plan.highlight && (
                  <div className="absolute right-6 top-6 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.3em] text-white opacity-60">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-white" />
                    recomendado
                  </div>
                )}

                <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-white opacity-40">
                  plano {plan.tier}
                </div>

                <div className="mt-6 flex items-end gap-2">
                  <span className="font-mono text-sm text-white opacity-40">R$</span>
                  <span className="font-display text-[18vw] font-bold leading-[0.85] tracking-tighter text-white md:text-[7vw]">
                    {plan.priceLabel}
                  </span>
                  <span className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white opacity-40">
                    /mês
                  </span>
                </div>

                <p className="mt-4 max-w-sm text-sm font-light leading-relaxed text-white opacity-50">
                  {plan.tagline}
                </p>

                <div className="mt-10 flex flex-col gap-3 border-t border-white/5 pt-8">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-3">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-white opacity-60" />
                      <span className="text-[13px] font-light leading-relaxed text-white opacity-70">{f}</span>
                    </div>
                  ))}
                  {plan.missing?.map((f) => (
                    <div key={f} className="flex items-start gap-3">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-white opacity-15" />
                      <span className="text-[13px] font-light leading-relaxed text-white opacity-25 line-through">
                        {f}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-12 flex flex-wrap items-center gap-6">
                  <Link
                    to={`/checkout?plan=${plan.tier}`}
                    className={`group/btn flex items-center gap-2 border px-6 py-4 text-[11px] font-medium uppercase tracking-[0.25em] transition-all ${
                      plan.highlight
                        ? "border-white bg-white text-black hover:bg-white/85"
                        : "border-white/20 text-white hover:border-white/60"
                    }`}
                  >
                    Assinar {plan.name}
                    <ArrowUpRight className="h-3 w-3 transition-transform group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5" />
                  </Link>
                  <Link
                    to="/planos"
                    className="font-mono text-[10px] uppercase tracking-[0.25em] text-white opacity-40 transition-opacity hover:opacity-80"
                  >
                    ver detalhes
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-3 font-mono text-[9px] uppercase tracking-[0.3em] text-white opacity-30">
            <span>[ pix · cartão · boleto ]</span>
            <span>[ sem fidelidade ]</span>
            <span>[ suporte no whatsapp ]</span>
          </div>
        </section>

        {/* Footer Branding */}
        <footer className="relative z-10 w-full pt-20 pb-12 px-6 md:pb-16 md:px-10 bg-black">
          <div className="absolute inset-x-0 top-0 h-40 -z-10 backdrop-blur-xl progressive-blur" />
        </footer>
      </div>
        </motion.div>
      )}
      <CursorFollower />
    </div>
  );
}
