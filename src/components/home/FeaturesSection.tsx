import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Target, TrendingUp, Crosshair, BarChart3, Sparkles } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const features = [
  {
    icon: Target,
    title: "Lei de Pareto 80/20",
    description: "Nosso algoritmo identifica os 20% dos temas que representam 80% das questões das provas. Pare de perder tempo com conteúdos que raramente caem e foque no que realmente importa para sua aprovação.",
    highlight: "Máxima eficiência",
  },
  {
    icon: Crosshair,
    title: "Engenharia Reversa das Provas",
    description: "Analisamos profundamente o DNA das provas anteriores para prever padrões, identificar armadilhas recorrentes e revelar os temas preferidos das bancas. Você estuda sabendo exatamente o que esperar.",
    highlight: "Previsibilidade",
  },
  {
    icon: Brain,
    title: "Inteligência Artificial Dual",
    description: "Dois motores de IA trabalham em conjunto para gerar simulados ultra-realistas, criar explicações personalizadas e adaptar o estudo ao seu perfil. Tecnologia de ponta a serviço da sua aprovação.",
    highlight: "Tecnologia avançada",
  },
  {
    icon: TrendingUp,
    title: "Análise de Desempenho",
    description: "Dashboards inteligentes mostram sua evolução em tempo real, identificam seus pontos fracos e sugerem os próximos passos. Cada minuto de estudo é otimizado para resultados máximos.",
    highlight: "Melhoria contínua",
  },
  {
    icon: BarChart3,
    title: "Simulados Estratégicos",
    description: "Provas completas com 60 questões seguindo a estrutura real dos concursos bancários. Timer realista, correção instantânea e análise detalhada de cada resposta para acelerar seu aprendizado.",
    highlight: "Prática realista",
  },
  {
    icon: Sparkles,
    title: "Especialista de Estudos IA",
    description: "Um mentor virtual disponível 24/7 para tirar dúvidas, explicar conceitos complexos e criar planos de estudo personalizados. Como ter um professor particular focado exclusivamente em você.",
    highlight: "Suporte ilimitado",
  },
];

export function FeaturesSection() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation<HTMLDivElement>();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.05 });

  return (
    <section className="py-24 lg:py-32 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      <div className="container relative">
        <div
          ref={headerRef}
          className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-white mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Metodologia Exclusiva</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">
            Ferramentas que{" "}
            <span className="text-primary">transformam</span> sua preparação
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
            Cada funcionalidade foi desenvolvida com um único objetivo:
            maximizar suas chances de aprovação nos principais concursos bancários do país.
          </p>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <Card
              key={feature.title}
              className={`group relative overflow-hidden border-primary/30 bg-card/50 backdrop-blur-xl hover:border-primary/60 hover:shadow-xl hover:shadow-primary/20 transition-all duration-700 ${gridVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
                }`}
              style={{ transitionDelay: gridVisible ? `${index * 100}ms` : '0ms' }}
            >
              {/* Glow effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <CardHeader className="pb-4 relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/20 group-hover:shadow-lg group-hover:shadow-primary/20">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-white bg-primary/10 px-3 py-1 rounded-full">
                    {feature.highlight}
                  </span>
                </div>
                <CardTitle className="text-xl font-bold">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <CardDescription className="text-base leading-relaxed text-muted-foreground">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
