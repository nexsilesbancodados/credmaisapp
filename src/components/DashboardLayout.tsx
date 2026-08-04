import { useState, useEffect, lazy, Suspense } from "react";

import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import Breadcrumbs from "@/components/Breadcrumbs";
import GlobalAnnouncement from "@/components/GlobalAnnouncement";
import InstallAppBanner from "@/components/InstallAppBanner";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAppMode, isPlatformPath, isNeutralPath } from "@/contexts/AppModeContext";

// Defer heavy overlays — they're only rendered after user interaction.
const GlobalSearch = lazy(() => import("@/components/GlobalSearch"));
const QuickPaymentModal = lazy(() => import("@/components/QuickPaymentModal"));
const KeyboardShortcutsHelp = lazy(() => import("@/components/KeyboardShortcutsHelp"));
const OnboardingTourAuto = lazy(() =>
  import("@/components/onboarding/OnboardingTour").then((m) => ({ default: m.OnboardingTourAuto }))
);

const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const { mode } = useAppMode();
  usePushNotifications();

  // Subscription enforcement lives in ProtectedRoute (single source of truth).

  // Em modo plataforma o dono do app não vê tela de operação: se cair numa por
  // link antigo ou URL digitada, volta para o painel. Trocar para "Minha operação"
  // no seletor libera tudo de novo.
  const blockedByMode =
    mode === "platform" &&
    !isPlatformPath(location.pathname) &&
    !isNeutralPath(location.pathname);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const inField = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (!inField && !e.metaKey && !e.ctrlKey && !e.altKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        setPayOpen((prev) => !prev);
      }
      if (e.key === "Escape") { setSearchOpen(false); setPayOpen(false); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Improvement #14: Auto-collapse sidebar on small desktop screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1100 && !isMobile) setCollapsed(true);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobile]);

  if (blockedByMode) return <Navigate to="/admin" replace />;

  return (
    <div className="min-h-dvh bg-background relative overflow-x-hidden">
      {/* Static mesh gradients — no animation (animated blur is one of the heaviest paints). */}
      <div className="pointer-events-none absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/[0.04] rounded-full blur-[80px] -z-10" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[480px] h-[480px] bg-indigo-500/[0.03] rounded-full blur-[70px] -z-10" />

      {/* Desktop: sidebar */}
      {!isMobile && (
        <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
      )}

      <div className={`transition-[margin] duration-300 ${isMobile ? "ml-0" : collapsed ? "ml-[76px]" : "ml-[260px]"}`}>
        <TopBar onSearchClick={() => setSearchOpen(true)} />

        <GlobalAnnouncement />
        <InstallAppBanner />
        <Breadcrumbs />
        <main
          className={`max-w-[1600px] mx-auto min-w-0 ${
            isMobile
              ? "px-3 py-3 pb-[calc(7.5rem+env(safe-area-inset-bottom))]"
              : "px-4 py-4 sm:px-5 sm:py-5 md:px-6 md:py-6 lg:px-8 lg:py-8"
          }`}
        >
          <Outlet />
        </main>
      </div>


      {/* Mobile: bottom nav */}
      {isMobile && <MobileBottomNav />}


      <Suspense fallback={null}>
        {searchOpen && <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />}
        {payOpen && <QuickPaymentModal open={payOpen} onClose={() => setPayOpen(false)} />}
        <KeyboardShortcutsHelp />
        <OnboardingTourAuto />
      </Suspense>
    </div>
  );
};

export default DashboardLayout;
