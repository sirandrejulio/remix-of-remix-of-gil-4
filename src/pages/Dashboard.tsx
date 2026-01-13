import { Header } from "@/components/layout/Header";
import { DottedSurface } from "@/components/ui/dotted-surface";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  Play,
  TrendingUp,
  Target,
  Clock,
  BookOpen,
  Brain,
  ArrowLeft,
  BarChart3,
  Sparkles,
  Zap,
  Activity,
  PieChart,
  Trophy,
  LineChart,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { ProgressoPareto } from "@/components/dashboard/ProgressoPareto";
import { RecomendacoesIA } from "@/components/dashboard/RecomendacoesIA";
import { MetasGamificacao } from "@/components/dashboard/MetasGamificacao";
import { ChoqueParetoAlert } from "@/components/dashboard/ChoqueParetoAlert";
import { EvolucaoParetoChart } from "@/components/dashboard/EvolucaoParetoChart";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [stats, setStats] = useState({
    simulados: 0,
    questoes: 0,
    taxaAcerto: 0,
    tempoEstudo: 0,
  });

  const [animatedStats, setAnimatedStats] = useState({
    simulados: 0,
    questoes: 0,
    taxaAcerto: 0,
    tempoEstudo: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        const [simuladosRes, respostasRes] = await Promise.all([
          supabase
            .from('simulados')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('respostas')
            .select('esta_correta, tempo_resposta_segundos')
            .eq('user_id', user.id),
        ]);

        const totalQuestoes = respostasRes.data?.length || 0;
        const acertos = respostasRes.data?.filter(r => r.esta_correta).length || 0;
        const taxa = totalQuestoes > 0 ? Math.round((acertos / totalQuestoes) * 100) : 0;
        const tempoTotal = respostasRes.data?.reduce((acc, r) => acc + (r.tempo_resposta_segundos || 0), 0) || 0;
        const tempoHoras = Math.round(tempoTotal / 3600);

        setStats({
          simulados: simuladosRes.count || 0,
          questoes: totalQuestoes,
          taxaAcerto: taxa,
          tempoEstudo: tempoHoras,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, [user]);

  // Animação de contagem dos números
  useEffect(() => {
    const duration = 1500;
    const steps = 30;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setAnimatedStats({
        simulados: Math.round(stats.simulados * easeOut),
        questoes: Math.round(stats.questoes * easeOut),
        taxaAcerto: Math.round(stats.taxaAcerto * easeOut),
        tempoEstudo: Math.round(stats.tempoEstudo * easeOut),
      });

      if (currentStep >= steps) {
        clearInterval(interval);
        setAnimatedStats(stats);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [stats]);

  const statCards = [
    {
      label: "Taxa de Acerto",
      value: `${animatedStats.taxaAcerto}%`,
      icon: TrendingUp,
      color: "from-violet-500/20 to-violet-500/5",
      iconColor: "text-violet-500",
      borderColor: "border-violet-500/20",
      glowColor: "shadow-violet-500/20"
    },
    {
      label: "Tempo de Estudo",
      value: `${animatedStats.tempoEstudo}h`,
      icon: Clock,
      color: "from-violet-500/20 to-violet-500/5",
      iconColor: "text-violet-500",
      borderColor: "border-violet-500/20",
      glowColor: "shadow-violet-500/20"
    },
  ];

  return (
    <>
      <DottedSurface />
      <div className="min-h-screen flex flex-col w-full relative">
        <Header />
        <main className="flex-1 container py-6 lg:py-8">

          {/* Header com efeito glow */}
          <div className="mb-8 animate-fade-in relative" style={{ animationDelay: '50ms' }}>
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg shadow-primary/25">
                  <Zap className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                    Olá, {profile?.nome?.split(' ')[0] || 'Estudante'}!
                  </h1>
                  <p className="text-muted-foreground">
                    Acompanhe seu progresso e gerencie seus estudos.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Alerta de Choque de Pareto */}
          <div className="mb-6">
            <ChoqueParetoAlert />
          </div>

          {/* Stats Grid com efeitos */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {statCards.map((stat, index) => (
              <Card
                key={stat.label}
                className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border animate-fade-in group relative overflow-hidden hover:shadow-xl transition-all duration-500 hover:shadow-violet-500/10 border-violet-500/20"
                style={{ animationDelay: `${(index + 1) * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 from-violet-500/5 to-violet-500/5"></div>
                <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-violet-500"></div>

                <CardContent className="pt-5 pb-4 relative">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300 bg-gradient-to-br from-violet-500/5 to-violet-500/5 group-hover:scale-110 group-hover:shadow-lg">
                      <stat.icon className="h-6 w-6 transition-transform duration-300 text-violet-500" />
                    </div>
                    <div>
                      <div className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight tabular-nums">
                        {stat.value}
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">
                        {stat.label}
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
                    <div className="h-full w-1/3 translate-x-[-100%] group-hover:translate-x-[400%] transition-transform duration-1000 bg-violet-500"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions com animações */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            {/* Card Principal - Gerar Simulado */}
            <Card
              className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border animate-fade-in group relative overflow-hidden hover:shadow-xl transition-all duration-500 hover:shadow-violet-500/10 border-violet-500/20 flex flex-col"
              style={{ animationDelay: '500ms' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 from-violet-500/5 to-violet-500/5"></div>
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-violet-500"></div>

              <CardHeader className="pb-3 relative">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-300 bg-gradient-to-br from-violet-500/5 to-violet-500/5 group-hover:scale-110 group-hover:shadow-lg">
                    <Play className="h-7 w-7 text-violet-500 transition-transform duration-300" />
                  </div>
                  <div>
                    <span className="block">Gerar Simulado</span>
                    <span className="text-xs font-normal text-muted-foreground">Teste seus conhecimentos</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 relative flex-1 flex flex-col justify-end">
                <p className="text-sm text-muted-foreground mb-4">
                  Inicie um novo simulado completo baseado no seu desempenho
                </p>
                <Link to="/simulados">
                  <Button className="w-full h-12 px-5 py-2 text-sm font-semibold gap-2 shadow-lg hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-300 group-hover:scale-[1.02] bg-violet-500 hover:bg-violet-600 text-white">
                    <Sparkles className="h-5 w-5 animate-pulse" />
                    Começar Agora
                    <Activity className="h-4 w-4 ml-1 opacity-50" />
                  </Button>
                </Link>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
                  <div className="h-full w-1/3 translate-x-[-100%] group-hover:translate-x-[400%] transition-transform duration-1000 bg-violet-500"></div>
                </div>
              </CardContent>
            </Card>

            {/* Especialista de Estudos */}
            <Card
              className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border animate-fade-in group relative overflow-hidden hover:shadow-xl transition-all duration-500 hover:shadow-violet-500/10 border-violet-500/20 flex flex-col"
              style={{ animationDelay: '600ms' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 from-violet-500/5 to-violet-500/5"></div>
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-violet-500"></div>

              <CardHeader className="pb-3 relative">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-300 bg-gradient-to-br from-violet-500/5 to-violet-500/5 group-hover:scale-110 group-hover:shadow-lg">
                    <Brain className="h-7 w-7 text-violet-500 transition-transform duration-300" />
                  </div>
                  <div>
                    <span className="block">Especialista de Estudos</span>
                    <span className="text-xs font-normal text-muted-foreground">Tire dúvidas com nossa IA</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 relative flex-1 flex flex-col justify-end">
                <p className="text-sm text-muted-foreground mb-4">
                  Converse com nossa IA especializada para esclarecer suas dúvidas
                </p>
                <Link to="/especialista-de-estudos">
                  <Button className="w-full h-12 px-5 py-2 text-sm font-semibold gap-2 shadow-lg hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-300 group-hover:scale-[1.02] bg-violet-500 hover:bg-violet-600">
                    <Sparkles className="h-5 w-5 animate-pulse" />
                    Acessar Agora
                    <Activity className="h-4 w-4 ml-1 opacity-50" />
                  </Button>
                </Link>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
                  <div className="h-full w-1/3 translate-x-[-100%] group-hover:translate-x-[400%] transition-transform duration-1000 bg-violet-500"></div>
                </div>
              </CardContent>
            </Card>

            {/* Banco de Questões */}
            <Card
              className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border animate-fade-in group relative overflow-hidden hover:shadow-xl transition-all duration-500 hover:shadow-violet-500/10 border-violet-500/20 flex flex-col"
              style={{ animationDelay: '700ms' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 from-violet-500/5 to-violet-500/5"></div>
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-violet-500"></div>

              <CardHeader className="pb-3 relative">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-300 bg-gradient-to-br from-violet-500/5 to-violet-500/5 group-hover:scale-110 group-hover:shadow-lg">
                    <Target className="h-7 w-7 text-violet-500 transition-transform duration-300" />
                  </div>
                  <div>
                    <span className="block">Banco de Questões</span>
                    <span className="text-xs font-normal text-muted-foreground">Explore e pratique questões</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 relative flex-1 flex flex-col justify-end">
                <p className="text-sm text-muted-foreground mb-4">
                  Acesse nosso banco completo de questões para praticar
                </p>
                <Link to="/questoes">
                  <Button className="w-full h-12 px-5 py-2 text-sm font-semibold gap-2 shadow-lg hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-300 group-hover:scale-[1.02] bg-violet-500 hover:bg-violet-600">
                    <Sparkles className="h-5 w-5 animate-pulse" />
                    Acessar Agora
                    <Activity className="h-4 w-4 ml-1 opacity-50" />
                  </Button>
                </Link>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
                  <div className="h-full w-1/3 translate-x-[-100%] group-hover:translate-x-[400%] transition-transform duration-1000 bg-violet-500"></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progresso Pareto Section */}
          <div className="mb-8 animate-fade-in" style={{ animationDelay: '800ms' }}>
            <Card className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border overflow-hidden hover:shadow-xl transition-all duration-500 hover:shadow-violet-500/10 border-violet-500/20 group relative">
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 from-violet-500/5 to-violet-500/5"></div>
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-violet-500"></div>

              <CardHeader className="pb-2 relative">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300 bg-gradient-to-br from-violet-500/5 to-violet-500/5 group-hover:scale-110 group-hover:shadow-lg">
                    <PieChart className="h-6 w-6 transition-transform duration-300 text-violet-500" />
                  </div>
                  <div>
                    <span className="block">Progresso Pareto</span>
                    <span className="text-xs font-normal text-muted-foreground">Análise estratégica do seu desempenho</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 relative">
                <ProgressoPareto />
                <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
                  <div className="h-full w-1/3 translate-x-[-100%] group-hover:translate-x-[400%] transition-transform duration-1000 bg-violet-500"></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Evolução Pareto Chart Section */}
          <div className="mb-8 animate-fade-in" style={{ animationDelay: '900ms' }}>
            <Card className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border overflow-hidden hover:shadow-xl transition-all duration-500 hover:shadow-violet-500/10 border-violet-500/20 group relative">
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 from-violet-500/5 to-violet-500/5"></div>
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-violet-500"></div>

              <CardHeader className="pb-2 relative">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300 bg-gradient-to-br from-violet-500/5 to-violet-500/5 group-hover:scale-110 group-hover:shadow-lg">
                    <LineChart className="h-6 w-6 transition-transform duration-300 text-violet-500" />
                  </div>
                  <div>
                    <span className="block">Evolução Grupo 1 vs Grupo 2</span>
                    <span className="text-xs font-normal text-muted-foreground">Acompanhe seu progresso ao longo do tempo</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 relative">
                <EvolucaoParetoChart />
                <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
                  <div className="h-full w-1/3 translate-x-[-100%] group-hover:translate-x-[400%] transition-transform duration-1000 bg-violet-500"></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Metas e Gamificação Section */}
          <div className="mb-8 animate-fade-in" style={{ animationDelay: '1000ms' }}>
            <Card className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border overflow-hidden hover:shadow-xl transition-all duration-500 hover:shadow-violet-500/10 border-violet-500/20 group relative">
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 from-violet-500/5 to-violet-500/5"></div>
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-violet-500"></div>

              <CardHeader className="pb-2 relative">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300 bg-gradient-to-br from-violet-500/5 to-violet-500/5 group-hover:scale-110 group-hover:shadow-lg">
                    <Trophy className="h-6 w-6 transition-transform duration-300 text-violet-500" />
                  </div>
                  <div>
                    <span className="block">Metas e Conquistas</span>
                    <span className="text-xs font-normal text-muted-foreground">Sistema de gamificação por disciplina</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 relative">
                <MetasGamificacao />
                <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
                  <div className="h-full w-1/3 translate-x-[-100%] group-hover:translate-x-[400%] transition-transform duration-1000 bg-violet-500"></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Desempenho */}
            <div className="animate-fade-in" style={{ animationDelay: '1100ms' }}>
              <Card className="h-full rounded-2xl bg-white/[0.03] backdrop-blur-xl border overflow-hidden hover:shadow-xl transition-all duration-500 hover:shadow-violet-500/10 border-violet-500/20 group relative">
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 from-violet-500/5 to-violet-500/5"></div>
                <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-violet-500"></div>

                <CardHeader className="pb-2 relative">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300 bg-gradient-to-br from-violet-500/5 to-violet-500/5 group-hover:scale-110 group-hover:shadow-lg">
                      <BarChart3 className="h-6 w-6 transition-transform duration-300 text-violet-500" />
                    </div>
                    <div>
                      <span className="block">Desempenho por Disciplina</span>
                      <span className="text-xs font-normal text-muted-foreground">Acompanhe sua evolução</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 relative">
                  <PerformanceChart />
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
                    <div className="h-full w-1/3 translate-x-[-100%] group-hover:translate-x-[400%] transition-transform duration-1000 bg-violet-500"></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recomendações */}
            <div className="animate-fade-in" style={{ animationDelay: '1200ms' }}>
              <Card className="h-full rounded-2xl bg-white/[0.03] backdrop-blur-xl border overflow-hidden hover:shadow-xl transition-all duration-500 hover:shadow-violet-500/10 border-violet-500/20 group relative">
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 from-violet-500/5 to-violet-500/5"></div>
                <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-violet-500"></div>

                <CardHeader className="pb-2 relative">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300 bg-gradient-to-br from-violet-500/5 to-violet-500/5 group-hover:scale-110 group-hover:shadow-lg">
                      <Sparkles className="h-6 w-6 transition-transform duration-300 text-violet-500 animate-pulse" />
                    </div>
                    <div>
                      <span className="block">Recomendações da IA</span>
                      <span className="text-xs font-normal text-muted-foreground">Sugestões personalizadas para seu estudo</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 relative">
                  <RecomendacoesIA />
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
                    <div className="h-full w-1/3 translate-x-[-100%] group-hover:translate-x-[400%] transition-transform duration-1000 bg-violet-500"></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Dashboard;
