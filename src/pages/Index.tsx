import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingHero from "@/components/landing/LandingHero";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingSteps from "@/components/landing/LandingSteps";
import LandingDashboardPreview from "@/components/landing/LandingDashboardPreview";
import LandingBenefits from "@/components/landing/LandingBenefits";
import LandingPricing from "@/components/landing/LandingPricing";
import LandingFAQ from "@/components/landing/LandingFAQ";
import LandingCTA from "@/components/landing/LandingCTA";
import LandingFooter from "@/components/landing/LandingFooter";

const Index = () => {
  return (
    <div className="landing min-h-dvh selection:bg-primary/20">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingFeatures />
        <LandingSteps />
        <LandingDashboardPreview />
        <LandingBenefits />
        <LandingPricing />
        <LandingFAQ />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
};

export default Index;
