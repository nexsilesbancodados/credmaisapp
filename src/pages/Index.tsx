import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingHero from "@/components/landing/LandingHero";
import LandingMarquee from "@/components/landing/LandingMarquee";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingWhy from "@/components/landing/LandingWhy";
import LandingPricing from "@/components/landing/LandingPricing";
import LandingFAQ from "@/components/landing/LandingFAQ";
import LandingCTA from "@/components/landing/LandingCTA";
import LandingFooter from "@/components/landing/LandingFooter";
import ScrollProgress from "@/components/landing/ScrollProgress";
import { useLandingMotion } from "@/components/landing/useLandingMotion";

const Index = () => {
  useLandingMotion();

  return (
    <div className="landing min-h-dvh selection:bg-primary/20">
      <ScrollProgress />
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingMarquee />
        <LandingFeatures />
        <LandingWhy />
        <LandingPricing />
        <LandingFAQ />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
};

export default Index;
