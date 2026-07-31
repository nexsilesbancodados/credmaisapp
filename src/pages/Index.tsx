/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { CursorFollower } from "@/components/vexon/ui/cursor-follower";
import { CursorProvider, CursorFollow } from "@/components/vexon/ui/cursor";
import { Preloader } from "@/components/vexon/Preloader";
import { ParticleOrb } from "@/components/vexon/ParticleOrb";
import { TextEffect } from "@/components/vexon/ui/text-effect";
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 100, opacity: 0, rotateX: 15, scale: 0.9, filter: "blur(10px)" },
    visible: { 
      y: 0, 
      opacity: 1, 
      rotateX: 0, 
      scale: 1,
      filter: "blur(0px)",
      transition: { 
        duration: 0.8, 
        ease: [0.16, 1, 0.3, 1] 
      } 
    },
  };

  const cardVariants = {
    hidden: { y: 100, opacity: 0, rotateX: 15, scale: 0.9, filter: "blur(10px)" },
    visible: { 
      y: 0, 
      opacity: 1, 
      rotateX: 0, 
      scale: 1,
      filter: "blur(0px)",
      transition: { 
        duration: 1.6, 
        ease: [0.16, 1, 0.3, 1] 
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
            VEXON
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
          <a href="#ai-intelligence" className="group flex items-center gap-1 text-[11px] font-medium tracking-widest text-[#8E9299] transition-colors hover:text-white uppercase">
            AI INTELLIGENCE
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
          <a href="#about-vexon" className="group flex items-center gap-1 text-[11px] font-medium tracking-widest text-[#8E9299] transition-colors hover:text-white uppercase">
            ABOUT VEXON
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
          <a href="#mission-intelligence" className="group flex items-center gap-1 text-[11px] font-medium tracking-widest text-[#8E9299] transition-colors hover:text-white uppercase">
            MISSION INTELLIGENCE
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </motion.div>
      </nav>

      <div className="relative z-10">
        {/* Section 1: Hero */}
        <section id="ai-intelligence" className="flex min-h-screen items-center px-6 pt-32 pb-40 md:px-10 md:pt-20 md:pb-20">
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
                [ AI INTELLIGENCE ]
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
                    WHERE RAW DATA
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
                    BECOMES YOUR
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
                    UNFAIR ADVANTAGE
                  </TextEffect>
                </div>
              </motion.h1>
            </div>

            {/* Right Column - Info & Actions */}
            <div className="flex flex-col justify-end gap-8 pt-12 md:gap-12 lg:col-span-4 pb-12 md:pb-20 translate-y-[58px]">
               <motion.div variants={itemVariants} className="flex items-center justify-between">
                  <div className="text-3xl font-light text-[#E6E6E6] tracking-tighter md:text-4xl">
                    ( <span className="font-mono font-bold">A</span> )
                  </div>
                  <div className="font-mono text-[10px] tracking-[0.2em] text-[#E6E6E6] md:text-[11px]">
                    [ 001 / 003 ]
                  </div>
               </motion.div>

               <motion.p 
                variants={itemVariants}
                className="max-w-xs text-xs leading-relaxed text-[#E6E6E6] md:text-sm"
               >
                  Vexon AI unifies data, workflows, and signals into one intelligence system so SaaS teams can automate decisions and scale smarter.
               </motion.p>

               <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4 md:gap-6">
                  <button className="relative group overflow-hidden rounded-sm bg-black/60 backdrop-blur-3xl px-6 py-3 text-xs font-medium tracking-wide transition-all hover:bg-black/80 md:px-8 md:py-4 md:text-sm text-white border border-white/30">
                    <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-white/60 transition-transform group-hover:scale-110" />
                    <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-white/60 transition-transform group-hover:scale-110" />
                    <span className="relative z-10 uppercase tracking-widest">building with ai</span>
                  </button>
                  <button className="text-xs font-medium tracking-wide text-white transition-colors hover:opacity-70 md:text-sm">
                    Watch Demo
                  </button>
               </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Section 2: About / Cards */}
        <section id="about-vexon" className="bg-black/40 flex min-h-screen flex-col justify-center px-6 py-20 backdrop-blur-3xl md:px-10 border-t border-white/5">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            className="mb-20 grid grid-cols-1 gap-12 lg:grid-cols-12"
          >
            <div className="lg:col-span-4">
              <motion.div variants={itemVariants} className="font-mono text-[11px] tracking-[0.2em] text-[#E6E6E6] opacity-50 uppercase">
                / about vexon
              </motion.div>
            </div>
            <div className="lg:col-span-8">
              <TextEffect 
                as="h2"
                preset="blur" 
                per="word"
                className="font-display mb-8 text-3xl font-medium leading-tight text-white md:text-5xl lg:max-w-4xl tracking-tight"
              >
                Our technology analyzes subtle data cues, emotional patterns, and visual energy signatures to generate a personalized reading just for you.
              </TextEffect>
              <motion.p 
                variants={itemVariants}
                className="max-w-2xl text-sm leading-relaxed text-[#E6E6E6] opacity-60 md:text-base font-light"
              >
                Think of it as a mirror for your inner world—revealing the colors, moods, and energy you project into the universe. Whether you're here for self-discovery, spiritual curiosity, or just for fun.
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
                    Read More
                    <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                </CursorFollow>
                <HoverCardImage 
                  src="https://lh3.googleusercontent.com/d/1AmTkr4HCx8i3d_u4Tn9wo7tJpmEdmJsA" 
                  alt="Digital Architecture"
                />
                <div className="absolute inset-x-0 bottom-0 z-10 h-1/2 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-8 flex flex-col justify-end pointer-events-none">
                  <div className="font-display text-2xl font-medium text-white tracking-tight">Signal Capture</div>
                  <div className="mt-2 text-sm leading-relaxed text-[#E6E6E6] opacity-70 font-light">
                    Every click, churn signal, and revenue event — ingested in real time. No SQL. No data team required.
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
                    Explore
                    <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                </CursorFollow>
                <HoverCardImage 
                  src="https://lh3.googleusercontent.com/d/1BP_La8v_6o2vK6gt8IbR7bOJktOrhJrS" 
                  alt="Perception Network"
                />
                <div className="absolute inset-x-0 bottom-0 z-10 h-1/2 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-8 flex flex-col justify-end pointer-events-none">
                  <div className="font-display text-2xl font-medium text-white tracking-tight">Pattern Engine</div>
                  <div className="mt-2 text-sm leading-relaxed text-[#E6E6E6] opacity-70 font-light">
                    AI surfaces what matters: who's about to convert, who's about to leave, and why — before it happens.
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
                    Deploy
                    <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                </CursorFollow>
                <HoverCardImage 
                  src="https://lh3.googleusercontent.com/d/11FnLKGrE5ttRp6whRdkpM7VWbIlcxfxH" 
                  alt="Energy Background"
                />
                <div className="absolute inset-x-0 bottom-0 z-10 h-1/2 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-8 flex flex-col justify-end pointer-events-none">
                  <div className="font-display text-2xl font-medium text-white tracking-tight">Action Layer</div>
                  <div className="mt-2 text-sm leading-relaxed text-[#E6E6E6] opacity-70 font-light">
                    Triggers that fire automatically. Slack alerts, CRM updates, onboarding flows — driven by data, not gut feeling.
                  </div>
                </div>
              </CursorProvider>
            </motion.div>
          </motion.div>
        </section>

        {/* Section 3: About Us Modular Grid */}
        <section id="mission-intelligence" className="relative z-10 border-t border-white/5 bg-black font-sans">
          <div className="grid grid-cols-1 border-b border-white/5 md:grid-cols-4">
            {/* Box 1: Brand/Context */}
            <div className="flex min-h-[200px] flex-col justify-between border-b border-white/5 p-8 md:border-b-0">
              <div className="font-logo text-xl font-bold tracking-tighter text-white opacity-80">
                VEXON®
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-white opacity-40">
                [ established 2024 ]
              </div>
            </div>

            {/* Box 2: Big Interactive Catchphrase */}
            <div className="flex flex-col justify-center p-8 md:col-span-3 lg:p-12 border-b border-white/5">
              <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.4em] text-white opacity-30">
                / mission intelligence:
              </div>
              <h3 className="font-display text-[12vw] font-bold leading-[0.9] uppercase tracking-tight md:text-[8vw] lg:text-[7vw] text-white">
                <span className="flex flex-wrap items-center gap-x-4">
                  <TextEffect 
                    preset="blur" 
                    per="char" 
                    className="inline-block text-white"
                  >
                    Figures for any
                  </TextEffect>
                  <TextEffect 
                    preset="blur" 
                    per="char" 
                    delay={0.5}
                    className="[mask-image:linear-gradient(to_right,rgba(0,0,0,0.15),white_85%)] inline-block text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                  >
                    innovation
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
                propulsion systems for modern workflows.
              </div>
            </div>

            {/* Box 5: Long Text Description */}
            <div className="flex flex-col justify-center p-8 md:col-span-2 lg:p-12">
              <p className="max-w-xl text-sm font-light leading-relaxed text-white opacity-60 md:text-base">
                Transform your raw data signatures into high-fidelity patent figures and technical schemas. Our rendering engine produces clean, publication-ready visuals across complex diagrams, UI architecture, and neural mapping patterns.
              </p>
              <div className="mt-8 flex items-center gap-4">
                <button className="group flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-70">
                  Read philosophy
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
                "Medium", "Outreach", "Adobe", "Framer", "Amazon", "GitHub", "Hopin", "Notion", "Linear", "Vercel",
                "Medium", "Outreach", "Adobe", "Framer", "Amazon", "GitHub", "Hopin", "Notion", "Linear", "Vercel"
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
