import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Target, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export function HeroSection() {

  const { ref: headingRef, isVisible: headingVisible } = useScrollAnimation<HTMLHeadingElement>();
  const { ref: subheadingRef, isVisible: subheadingVisible } = useScrollAnimation<HTMLParagraphElement>();
  const { ref: ctaRef, isVisible: ctaVisible } = useScrollAnimation<HTMLDivElement>();
  const { ref: statsRef, isVisible: statsVisible } = useScrollAnimation<HTMLDivElement>();

  return (
    <section className="relative min-h-[90vh] flex items-center">
      <div className="container relative py-20 md:py-28 lg:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-6">

          {/* Main heading */}
          <h1
            ref={headingRef}
            className={`text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-[1.1] tracking-tight transition-all duration-700 delay-100 ${headingVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
          >
            Domine os{" "}
            <span className="text-primary relative">
              Concursos Bancários
              <svg className="absolute -bottom-2 left-0 w-full h-3 text-primary/30" viewBox="0 0 200 8" preserveAspectRatio="none">
                <path d="M0 7 Q50 0 100 7 T200 7" stroke="currentColor" strokeWidth="3" fill="none" />
              </svg>
            </span>{" "}
            com Engenharia Reversa
          </h1>

          {/* Subheading */}
          <p
            ref={subheadingRef}
            className={`text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed transition-all duration-700 delay-200 ${subheadingVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
          >
            Sistema revolucionário que decodifica os padrões das provas de{" "}
            <span className="text-foreground font-semibold">Banco do Brasil</span>,{" "}
            <span className="text-foreground font-semibold">Caixa Econômica</span> e{" "}
            <span className="text-foreground font-semibold">Banco do Nordeste</span>.
            Estude apenas os <span className="text-primary font-semibold">20% que garantem 80% da sua aprovação</span>.
          </p>

          {/* CTA Buttons */}
          <div
            ref={ctaRef}
            className={`flex flex-col sm:flex-row gap-4 justify-center pt-6 transition-all duration-700 delay-300 ${ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
          >
            <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto gap-2 shadow-lg shadow-primary/25 text-lg px-8 py-6 animate-pulse-slow">
                Começar Agora
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div
            ref={statsRef}
            className={`grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 pt-10 transition-all duration-700 delay-[400ms] ${statsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
          >
            <div className="group p-6 rounded-2xl bg-card/50 backdrop-blur-xl border border-primary/30 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/20 transition-all duration-300">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Target className="h-6 w-6 text-primary" />
                <div className="text-3xl md:text-4xl font-bold text-primary">80/20</div>
              </div>
              <div className="text-sm text-muted-foreground">Lei de Pareto Aplicada</div>
            </div>
            <div className="group p-6 rounded-2xl bg-card/50 backdrop-blur-xl border border-primary/30 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/20 transition-all duration-300">
              <div className="flex items-center justify-center gap-3 mb-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                <div className="text-3xl md:text-4xl font-bold text-primary">5.000+</div>
              </div>
              <div className="text-sm text-muted-foreground">Questões Analisadas</div>
            </div>
            <div className="group p-6 rounded-2xl bg-card/50 backdrop-blur-xl border border-primary/30 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/20 transition-all duration-300">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Zap className="h-6 w-6 text-primary" />
                <div className="text-3xl md:text-4xl font-bold text-primary">Multi-IA</div>
              </div>
              <div className="text-sm text-muted-foreground">Geração Inteligente</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
