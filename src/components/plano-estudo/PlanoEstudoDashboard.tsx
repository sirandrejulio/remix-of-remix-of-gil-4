import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Clock, 
  Target, 
  Building2, 
  GraduationCap, 
  Sparkles,
  Edit2,
  AlertTriangle,
  TrendingUp,
  BookOpen,
  CheckCircle2,
  Zap,
  PieChart,
  LineChart,
  Trophy
} from "lucide-react";
import { ProgressoPareto } from "@/components/dashboard/ProgressoPareto";
import { EvolucaoParetoChart } from "@/components/dashboard/EvolucaoParetoChart";
import { MetasGamificacao } from "@/components/dashboard/MetasGamificacao";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface PlanoEstudoDashboardProps {
  planoData: any;
  onEdit: () => void;
}

const getConcursoNome = (id: string) => {
  const map: Record<string, string> = {
    banco_brasil: "Banco do Brasil",
    caixa: "Caixa Econômica Federal",
    bnb: "Banco do Nordeste",
    banrisul: "Banrisul",
  };
  return map[id] || id;
};

export function PlanoEstudoDashboard({ planoData, onEdit }: PlanoEstudoDashboardProps) {
  const [activeTab, setActiveTab] = useState("visao-geral");

  const planoGerado = planoData?.plano_gerado || {};
  const planoTexto = typeof planoGerado === 'string' ? planoGerado : planoGerado?.texto || '';
  const alertas = planoData?.alertas || [];

  // Calculate stats
  const diasEstudo = Object.entries(planoData?.disponibilidade || {}).filter(
    ([_, horarios]: [string, any]) => horarios?.length > 0
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg shadow-primary/25">
            <Calendar className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
              Meu Plano de Estudos
            </h1>
            <p className="text-muted-foreground">
              {getConcursoNome(planoData?.concurso)} • {planoData?.nivel_cargo === 'medio' ? 'Nível Médio' : 'Nível Superior'}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={onEdit} className="gap-2">
          <Edit2 className="h-4 w-4" />
          Editar Plano
        </Button>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <Card className="rounded-xl border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground mb-2">Alertas do Plano</h3>
                <ul className="space-y-1">
                  {alertas.map((alerta: string, idx: number) => (
                    <li key={idx} className="text-sm text-muted-foreground">• {alerta}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl border-violet-500/20 bg-white/[0.03]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Horas/Semana</p>
                <p className="text-xl font-bold text-foreground">{planoData?.horas_semanais_total || 0}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-violet-500/20 bg-white/[0.03]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dias de Estudo</p>
                <p className="text-xl font-bold text-foreground">{diasEstudo}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-violet-500/20 bg-white/[0.03]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Meta Acerto</p>
                <p className="text-xl font-bold text-foreground">{planoData?.meta_taxa_acerto || 70}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-violet-500/20 bg-white/[0.03]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                  {planoData?.plano_status === 'ativo' ? 'Ativo' : planoData?.plano_status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto bg-muted/30 p-1 rounded-xl">
          <TabsTrigger value="visao-geral" className="gap-2 rounded-lg">
            <BookOpen className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="progresso" className="gap-2 rounded-lg">
            <PieChart className="h-4 w-4" />
            Progresso Pareto
          </TabsTrigger>
          <TabsTrigger value="evolucao" className="gap-2 rounded-lg">
            <LineChart className="h-4 w-4" />
            Evolução
          </TabsTrigger>
          <TabsTrigger value="metas" className="gap-2 rounded-lg">
            <Trophy className="h-4 w-4" />
            Metas
          </TabsTrigger>
          <TabsTrigger value="desempenho" className="gap-2 rounded-lg">
            <TrendingUp className="h-4 w-4" />
            Desempenho
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="space-y-6">
          {/* Plano gerado */}
          <Card className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-violet-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-violet-500" />
                </div>
                Plano Gerado pela IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              {planoTexto ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{planoTexto}</ReactMarkdown>
                </div>
              ) : (
                <div className="space-y-4">
                  {planoGerado?.cronograma && (
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Cronograma Semanal</h4>
                      <pre className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg overflow-auto">
                        {JSON.stringify(planoGerado.cronograma, null, 2)}
                      </pre>
                    </div>
                  )}
                  {planoGerado?.disciplinas && (
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Distribuição por Disciplina</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Object.entries(planoGerado.disciplinas).map(([disc, horas]: [string, any]) => (
                          <div key={disc} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                            <span className="text-sm text-foreground">{disc}</span>
                            <Badge variant="outline">{horas}h</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!planoGerado?.cronograma && !planoGerado?.disciplinas && (
                    <p className="text-muted-foreground">
                      Seu plano de estudos foi configurado. Continue praticando e acompanhe seu progresso nas outras abas.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cronograma Visual */}
          <Card className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-violet-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-emerald-500" />
                </div>
                Sua Disponibilidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((dia, idx) => {
                  const diaKey = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'][idx];
                  const horarios = planoData?.disponibilidade?.[diaKey] || [];
                  const hasHorarios = horarios.length > 0;

                  return (
                    <div
                      key={dia}
                      className={cn(
                        "p-3 rounded-xl text-center transition-all",
                        hasHorarios
                          ? "bg-violet-500/10 border border-violet-500/30"
                          : "bg-muted/30 border border-border"
                      )}
                    >
                      <span className="text-xs font-medium text-muted-foreground">{dia}</span>
                      <p className={cn(
                        "text-lg font-bold mt-1",
                        hasHorarios ? "text-violet-500" : "text-muted-foreground"
                      )}>
                        {horarios.length}h
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progresso">
          <Card className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-violet-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <PieChart className="h-5 w-5 text-violet-500" />
                </div>
                Progresso Pareto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProgressoPareto />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evolucao">
          <Card className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-violet-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <LineChart className="h-5 w-5 text-emerald-500" />
                </div>
                Evolução Grupo 1 vs Grupo 2
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EvolucaoParetoChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metas">
          <Card className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-violet-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-amber-500" />
                </div>
                Metas e Conquistas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MetasGamificacao />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="desempenho">
          <Card className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-violet-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                Desempenho por Disciplina
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceChart />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
