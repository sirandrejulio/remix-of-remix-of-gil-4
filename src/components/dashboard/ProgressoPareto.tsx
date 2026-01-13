import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Monitor,
  ShoppingCart,
  FileText,
  Building2,
  Calculator,
  Globe,
  BookOpen,
  TrendingUp,
  Zap,
  Target
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface DisciplineProgress {
  name: string;
  icon: typeof Monitor;
  correct: number;
  total: number;
  percentage: number;
  weight: number;
}

const GRUPO_1_DISCIPLINES = [
  { name: "Informática", icon: Monitor, weight: 22.5 },
  { name: "Vendas e Negociação", icon: ShoppingCart, weight: 22.5 },
  { name: "Língua Portuguesa", icon: FileText, weight: 15 },
  { name: "Conhecimentos Bancários", icon: Building2, weight: 15 },
];

const GRUPO_2_DISCIPLINES = [
  { name: "Matemática Financeira", icon: Calculator, weight: 7.5 },
  { name: "Matemática", icon: Calculator, weight: 7.5 },
  { name: "Atualidades", icon: Globe, weight: 5 },
  { name: "Inglês", icon: BookOpen, weight: 5 },
];

export function ProgressoPareto() {
  const { user } = useAuth();
  const [grupo1Data, setGrupo1Data] = useState<DisciplineProgress[]>([]);
  const [grupo2Data, setGrupo2Data] = useState<DisciplineProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [grupo1Average, setGrupo1Average] = useState(0);
  const [grupo2Average, setGrupo2Average] = useState(0);
  const [animatedGrupo1, setAnimatedGrupo1] = useState(0);
  const [animatedGrupo2, setAnimatedGrupo2] = useState(0);

  useEffect(() => {
    const fetchProgress = async () => {
      if (!user) return;

      try {
        const { data: respostas } = await supabase
          .from('respostas')
          .select(`
            esta_correta,
            questao:questoes (
              disciplina
            )
          `)
          .eq('user_id', user.id);

        if (!respostas) {
          setLoading(false);
          return;
        }

        // Agrupa por disciplina
        const disciplineStats: Record<string, { correct: number; total: number }> = {};

        respostas.forEach((r: any) => {
          const disciplina = r.questao?.disciplina || 'Outras';
          if (!disciplineStats[disciplina]) {
            disciplineStats[disciplina] = { correct: 0, total: 0 };
          }
          disciplineStats[disciplina].total++;
          if (r.esta_correta) {
            disciplineStats[disciplina].correct++;
          }
        });

        // Processa Grupo 1
        const grupo1Processed = GRUPO_1_DISCIPLINES.map(d => {
          const stats = disciplineStats[d.name] || { correct: 0, total: 0 };
          return {
            ...d,
            correct: stats.correct,
            total: stats.total,
            percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
          };
        });

        // Processa Grupo 2
        const grupo2Processed = GRUPO_2_DISCIPLINES.map(d => {
          const stats = disciplineStats[d.name] || { correct: 0, total: 0 };
          return {
            ...d,
            correct: stats.correct,
            total: stats.total,
            percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
          };
        });

        setGrupo1Data(grupo1Processed);
        setGrupo2Data(grupo2Processed);

        // Calcula médias ponderadas
        const grupo1TotalWeight = GRUPO_1_DISCIPLINES.reduce((acc, d) => acc + d.weight, 0);
        const grupo1WeightedSum = grupo1Processed.reduce((acc, d) => acc + (d.percentage * d.weight), 0);
        const avg1 = grupo1TotalWeight > 0 ? Math.round(grupo1WeightedSum / grupo1TotalWeight) : 0;

        const grupo2TotalWeight = GRUPO_2_DISCIPLINES.reduce((acc, d) => acc + d.weight, 0);
        const grupo2WeightedSum = grupo2Processed.reduce((acc, d) => acc + (d.percentage * d.weight), 0);
        const avg2 = grupo2TotalWeight > 0 ? Math.round(grupo2WeightedSum / grupo2TotalWeight) : 0;

        setGrupo1Average(avg1);
        setGrupo2Average(avg2);

      } catch (error) {
        console.error('Error fetching progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [user]);

  // Animação dos números
  useEffect(() => {
    const duration = 1200;
    const steps = 30;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setAnimatedGrupo1(Math.round(grupo1Average * easeOut));
      setAnimatedGrupo2(Math.round(grupo2Average * easeOut));

      if (currentStep >= steps) {
        clearInterval(interval);
        setAnimatedGrupo1(grupo1Average);
        setAnimatedGrupo2(grupo2Average);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [grupo1Average, grupo2Average]);

  const getProgressColor = (percentage: number) => {
    if (percentage >= 70) return "bg-emerald-500";
    if (percentage >= 50) return "bg-amber-500";
    return "bg-destructive";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm text-muted-foreground">Carregando progresso...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Visual */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-500/50 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Lei de Pareto 80/20</h3>
            <p className="text-xs text-muted-foreground">Foque no que realmente importa</p>
          </div>
        </div>
      </div>

      {/* Cards dos Grupos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grupo 1 - Alta Prioridade */}
        {/* Grupo 1 - Alta Prioridade */}
        <Card className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border animate-fade-in group relative overflow-hidden hover:shadow-xl transition-all duration-500 hover:shadow-violet-500/10 border-violet-500/20">
          <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 from-violet-500/5 to-violet-500/5"></div>
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-violet-500"></div>

          <CardHeader className="pb-3 relative">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-base">
                <Badge className="px-3 py-1 gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 border-none">
                  <Target className="h-3.5 w-3.5 text-white" />
                  <span className="text-white">GRUPO 1</span>
                </Badge>
                <span className="text-sm font-medium text-muted-foreground">Alta Prioridade</span>
              </CardTitle>
              <div className="text-right">
                <span className="text-3xl font-bold text-violet-500 tabular-nums">{animatedGrupo1}%</span>
                <span className="text-xs text-muted-foreground block">≈75% da nota</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 relative">
            {grupo1Data.map((discipline, index) => (
              <div
                key={discipline.name}
                className="space-y-2 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <discipline.icon className="h-4 w-4 text-violet-500" />
                    </div>
                    <span className="font-medium text-foreground">{discipline.name}</span>
                    <span className="text-xs text-muted-foreground">({discipline.weight} pts)</span>
                  </div>
                  <span className={cn(
                    "font-semibold tabular-nums",
                    discipline.percentage >= 70 ? "text-emerald-500" :
                      discipline.percentage >= 50 ? "text-amber-500" : "text-destructive"
                  )}>
                    {discipline.percentage}%
                  </span>
                </div>
                <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-700 rounded-full",
                      getProgressColor(discipline.percentage)
                    )}
                    style={{ width: `${discipline.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{discipline.correct} acertos</span>
                  <span>{discipline.total} questões</span>
                </div>
              </div>
            ))}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
              <div className="h-full w-1/3 translate-x-[-100%] group-hover:translate-x-[400%] transition-transform duration-1000 bg-violet-500"></div>
            </div>
          </CardContent>
        </Card>

        {/* Grupo 2 - Manutenção */}
        {/* Grupo 2 - Manutenção */}
        <Card className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border animate-fade-in group relative overflow-hidden hover:shadow-xl transition-all duration-500 hover:shadow-violet-500/10 border-violet-500/20">
          <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 from-violet-500/5 to-violet-500/5"></div>
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-violet-500"></div>

          <CardHeader className="pb-3 relative">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-base">
                <Badge className="px-3 py-1 gap-1.5 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 border-none">
                  <TrendingUp className="h-3.5 w-3.5 text-white" />
                  <span className="text-white">GRUPO 2</span>
                </Badge>
                <span className="text-sm font-medium text-muted-foreground">Manutenção</span>
              </CardTitle>
              <div className="text-right">
                <span className="text-3xl font-bold text-violet-500 tabular-nums">{animatedGrupo2}%</span>
                <span className="text-xs text-muted-foreground block">≈25% da nota</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 relative">
            {grupo2Data.map((discipline, index) => (
              <div
                key={discipline.name}
                className="space-y-2 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <discipline.icon className="h-4 w-4 text-violet-500" />
                    </div>
                    <span className="font-medium text-foreground">{discipline.name}</span>
                    <span className="text-xs text-muted-foreground">({discipline.weight} pts)</span>
                  </div>
                  <span className={cn(
                    "font-semibold tabular-nums",
                    discipline.percentage >= 70 ? "text-emerald-500" :
                      discipline.percentage >= 50 ? "text-amber-500" : "text-destructive"
                  )}>
                    {discipline.percentage}%
                  </span>
                </div>
                <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-700 rounded-full",
                      getProgressColor(discipline.percentage)
                    )}
                    style={{ width: `${discipline.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{discipline.correct} acertos</span>
                  <span>{discipline.total} questões</span>
                </div>
              </div>
            ))}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
              <div className="h-full w-1/3 translate-x-[-100%] group-hover:translate-x-[400%] transition-transform duration-1000 bg-violet-500"></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dica Estratégica */}
      <Card className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border animate-fade-in group relative overflow-hidden transition-all duration-500 border-violet-500/20">
        <div className="absolute inset-0 bg-gradient-to-br opacity-10 group-hover:opacity-20 transition-opacity duration-500 from-violet-500/5 to-violet-500/5"></div>
        <CardContent className="py-4 relative">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
              <Zap className="h-4 w-4 text-violet-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-1">💡 Estratégia Pareto</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Domine primeiro o <strong>Grupo 1</strong> (Informática, Vendas, Português e Conhecimentos Bancários)
                que representa <strong>75% da sua nota</strong>. Só avance para o Grupo 2 após atingir 70%+ no Grupo 1.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
