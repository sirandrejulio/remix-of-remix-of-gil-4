import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { MethodologySection } from "@/components/home/MethodologySection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { DisciplinesSection } from "@/components/home/DisciplinesSection";
import { CTASection } from "@/components/home/CTASection";
import { DottedSurface } from "@/components/ui/dotted-surface";

const Index = () => {
  return (
    <>
      <DottedSurface />
      <div className="min-h-screen flex flex-col w-full relative">
        <Header />
        <main className="flex-1">
          <HeroSection />
          <MethodologySection />
          <FeaturesSection />
          <DisciplinesSection />
          <CTASection />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
