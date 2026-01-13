import { forwardRef, useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Rocket, Shield, Clock } from "lucide-react";
import { Link } from "react-router-dom";

export const CTASection = forwardRef<HTMLElement, object>(function CTASection(_, ref) {
  const localRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = localRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={(node) => {
        localRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      className="py-24 lg:py-32 relative overflow-hidden"
    >
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />

      <div className="container relative">
        <div className="max-w-4xl mx-auto">
          {/* Main CTA Card */}
          <div
            className={`relative rounded-3xl border-2 border-primary/30 bg-card/50 backdrop-blur-xl p-8 md:p-12 lg:p-16 text-center overflow-hidden hover:border-primary/60 hover:shadow-xl hover:shadow-primary/20 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'
              }`}
          >
            {/* Decorative elements */}
            <div className="absolute top-4 left-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
            <div className="absolute bottom-4 right-4 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />

            <div className="relative space-y-8">
              <div className={`inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-5 py-2 text-sm font-semibold text-white transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}>
                <Rocket className="h-4 w-4" />
                <span>Comece sua jornada agora</span>
              </div>

              <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}>
                Sua aprovação está a um{" "}
                <span className="text-primary">clique de distância</span>
              </h2>

              <p className={`text-muted-foreground text-lg md:text-xl leading-relaxed max-w-2xl mx-auto transition-all duration-700 delay-[400ms] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}>
                Junte-se a milhares de candidatos que descobriram o poder da
                preparação inteligente. Pare de estudar mais e comece a estudar melhor.
              </p>

              {/* Trust badges */}
              <div className={`flex flex-wrap items-center justify-center gap-6 pt-4 transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Metodologia comprovada</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Acesso imediato</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Rocket className="h-4 w-4 text-primary" />
                  <span>Resultados rápidos</span>
                </div>
              </div>

              {/* CTA Button */}
              <div className={`pt-6 transition-all duration-700 delay-[600ms] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}>
                <Link to="/auth">
                  <Button
                    size="lg"
                    className="gap-3 text-lg px-10 py-7 shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 animate-pulse-slow"
                  >
                    Criar Conta Gratuita
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <p className="text-muted-foreground text-sm mt-4">
                  Sem compromisso • Cancele quando quiser
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
