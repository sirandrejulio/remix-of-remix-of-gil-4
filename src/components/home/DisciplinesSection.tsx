import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Landmark, Building, CheckCircle2, Star, FileCheck } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const banks = [
  {
    name: "Banco do Brasil",
    icon: Building2,
    color: "from-yellow-500/20 to-yellow-600/10",
    borderColor: "border-yellow-500/30",
    description: "O maior banco da América Latina oferece milhares de vagas anualmente com salários iniciais atrativos e excelentes benefícios.",
    benefits: ["Salário inicial: R$ 3.600+", "Participação nos lucros", "Plano de carreira estruturado", "Estabilidade garantida"]
  },
  {
    name: "Caixa Econômica Federal",
    icon: Landmark,
    color: "from-blue-500/20 to-blue-600/10",
    borderColor: "border-blue-500/30",
    description: "Responsável pelo FGTS e programas habitacionais, a Caixa é uma das instituições mais desejadas por concurseiros.",
    benefits: ["Salário inicial: R$ 3.700+", "Jornada de 6 horas", "Auxílio alimentação", "Previdência complementar"]
  },
  {
    name: "Banco do Nordeste",
    icon: Building,
    color: "from-red-500/20 to-red-600/10",
    borderColor: "border-red-500/30",
    description: "Maior banco de desenvolvimento regional da América Latina, com foco em impacto social e crescimento sustentável.",
    benefits: ["Salário inicial: R$ 3.800+", "Atuação regional", "Programas de capacitação", "Qualidade de vida"]
  },
];

export function DisciplinesSection() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation<HTMLDivElement>();
  const { ref: cardsRef, isVisible: cardsVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.1 });

  return (
    <section className="py-24 lg:py-32 bg-muted/30 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-3xl" />

      <div className="container relative">
        <div
          ref={headerRef}
          className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-white mb-6">
            <Star className="h-3.5 w-3.5" />
            <span>Concursos em Foco</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">
            Preparação focada nos{" "}
            <span className="text-primary">maiores bancos</span> do Brasil
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
            Nossa metodologia foi desenvolvida analisando centenas de provas anteriores
            para garantir que você domine exatamente o que cai.
          </p>
        </div>

        <div ref={cardsRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {banks.map((bank, index) => (
            <Card
              key={bank.name}
              className={`group relative overflow-hidden border-2 border-primary/30 bg-card/50 backdrop-blur-xl hover:border-primary/60 hover:shadow-xl hover:shadow-primary/20 transition-all duration-700 ${cardsVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'
                }`}
              style={{ transitionDelay: cardsVisible ? `${index * 150}ms` : '0ms' }}
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50`} />

              <CardHeader className="relative pb-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-14 w-14 rounded-2xl bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <bank.icon className="h-7 w-7 text-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{bank.name}</h3>
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-white mt-1">
                      <FileCheck className="h-3.5 w-3.5" />
                      <span>Provas analisadas</span>
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {bank.description}
                </p>
              </CardHeader>

              <CardContent className="relative pt-0">
                <div className="space-y-3">
                  {bank.benefits.map((benefit, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 text-sm text-foreground"
                    >
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
