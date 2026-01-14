import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Search, Target, Lightbulb, CheckCircle, Zap } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export function MethodologySection() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation<HTMLDivElement>();
  const { ref: paretoRef, isVisible: paretoVisible } = useScrollAnimation<HTMLDivElement>();
  const { ref: engRef, isVisible: engVisible } = useScrollAnimation<HTMLDivElement>();

  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      <div className="absolute top-1/2 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute top-1/3 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

      <div className="container relative">
        <div
          ref={headerRef}
          className={`text-center mb-16 transition-all duration-700 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-white mb-6">
            <Lightbulb className="h-4 w-4" />
            Nossa Metodologia
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            A Ciência Por Trás da <span className="text-primary">Sua Aprovação</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Combinamos duas estratégias comprovadas para maximizar sua eficiência nos estudos
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Lei de Pareto */}
          <div ref={paretoRef}>
            <Card className={`group relative overflow-hidden border-primary/30 bg-card/50 backdrop-blur-xl hover:border-primary/60 hover:shadow-xl hover:shadow-primary/20 transition-all duration-700 ${paretoVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'
              }`}>
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <CardHeader className="pb-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                  <div className="px-3 py-1 rounded-full bg-primary/10 text-white text-sm font-semibold">
                    Princípio 80/20
                  </div>
                </div>
                <CardTitle className="text-2xl md:text-3xl font-bold">
                  Lei de Pareto
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <p className="text-muted-foreground leading-relaxed text-base">
                  A <span className="text-foreground font-semibold">Lei de Pareto</span>, também conhecida como Princípio 80/20,
                  revela que aproximadamente <span className="text-primary font-bold">80% dos resultados</span> vêm de apenas
                  <span className="text-primary font-bold"> 20% das causas</span>. Nos concursos bancários, isso significa que
                  uma pequena fração dos conteúdos representa a maioria das questões cobradas.
                </p>

                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      <span className="text-foreground font-medium">Na prática:</span> Ao analisar milhares de questões do
                      Banco do Brasil, Caixa e BNB, identificamos os temas que mais aparecem e priorizamos seu estudo.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Como isso te ajuda:
                  </h4>
                  <ul className="space-y-2">
                    {[
                      "Estude menos e aprenda mais focando no que realmente cai",
                      "Economize meses de preparação eliminando conteúdo irrelevante",
                      "Aumente sua taxa de acertos dominando os temas mais cobrados",
                      "Reduza a ansiedade sabendo exatamente o que priorizar"
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-border/50">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">80%</div>
                    <div className="text-xs text-muted-foreground">dos resultados</div>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">20%</div>
                    <div className="text-xs text-muted-foreground">do conteúdo</div>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">3x</div>
                    <div className="text-xs text-muted-foreground">mais eficiência</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Engenharia Reversa */}
          <div ref={engRef}>
            <Card className={`group relative overflow-hidden border-primary/30 bg-card/50 backdrop-blur-xl hover:border-primary/60 hover:shadow-xl hover:shadow-primary/20 transition-all duration-700 delay-200 ${engVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
              }`}>
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <CardHeader className="pb-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                    <Search className="h-8 w-8 text-primary" />
                  </div>
                  <div className="px-3 py-1 rounded-full bg-primary/10 text-white text-sm font-semibold">
                    Análise de Padrões
                  </div>
                </div>
                <CardTitle className="text-2xl md:text-3xl font-bold">
                  Engenharia Reversa por Questões
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <p className="text-muted-foreground leading-relaxed text-base">
                  A <span className="text-foreground font-semibold">Engenharia Reversa</span> é a estratégia de
                  <span className="text-primary font-bold"> desconstruir as provas anteriores</span> para entender exatamente
                  o que as bancas cobram. Em vez de estudar toda a teoria, analisamos as questões reais para
                  <span className="text-primary font-bold"> mapear padrões, pegadinhas e formatos recorrentes</span>.
                </p>

                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      <span className="text-foreground font-medium">Na prática:</span> Catalogamos milhares de questões
                      por tema, subtema e nível de dificuldade, identificando exatamente como a banca formula as perguntas.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Como isso te ajuda:
                  </h4>
                  <ul className="space-y-2">
                    {[
                      "Entenda a 'mente da banca' e antecipe o que será cobrado",
                      "Reconheça pegadinhas clássicas e evite erros bobos",
                      "Treine com questões reais no formato exato da prova",
                      "Desenvolva intuição para identificar a resposta correta"
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-border/50">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">5.000+</div>
                    <div className="text-xs text-muted-foreground">questões analisadas</div>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">100+</div>
                    <div className="text-xs text-muted-foreground">padrões mapeados</div>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">95%</div>
                    <div className="text-xs text-muted-foreground">de precisão</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
