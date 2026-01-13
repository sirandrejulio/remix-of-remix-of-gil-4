import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import {
  Loader2,
  BookOpen,
  Calendar,
  Clock,
  Trophy,
  Eye,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Simulado {
  id: string;
  titulo: string;
  tipo: string;
  total_questoes: number;
  data_inicio: string;
  data_fim: string | null;
  status: string;
  acertos: number;
  percentual: number;
  tempo_minutos: number | null;
}

export function HistoricoSimulados() {
  const { user } = useAuth();
  const [simulados, setSimulados] = useState<Simulado[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSimulados = async () => {
      if (!user) return;

      try {
        // Buscar simulados comuns (não do especialista)
        const { data: simuladosData, error } = await supabase
          .from('simulados')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;

        // Para cada simulado, buscar estatísticas
        const simuladosComEstatisticas = await Promise.all(
          (simuladosData || []).map(async (sim) => {
            const { data: respostas } = await supabase
              .from('respostas')
              .select('esta_correta')
              .eq('simulado_id', sim.id);

            const acertos = respostas?.filter(r => r.esta_correta).length || 0;
            const total = respostas?.length || sim.total_questoes;
            const percentual = total > 0 ? Math.round((acertos / total) * 100) : 0;

            let tempoMinutos = null;
            if (sim.data_inicio && sim.data_fim) {
              const inicio = new Date(sim.data_inicio);
              const fim = new Date(sim.data_fim);
              tempoMinutos = Math.round((fim.getTime() - inicio.getTime()) / 60000);
            }

            return {
              id: sim.id,
              titulo: sim.titulo,
              tipo: sim.tipo,
              total_questoes: sim.total_questoes,
              data_inicio: sim.data_inicio,
              data_fim: sim.data_fim,
              status: sim.status,
              acertos,
              percentual,
              tempo_minutos: tempoMinutos,
            };
          })
        );

        setSimulados(simuladosComEstatisticas);
      } catch (error) {
        console.error('Error fetching simulados:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSimulados();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'concluido':
        return <Badge className="bg-emerald-500/20 text-white border-emerald-500/30">Concluído</Badge>;
      case 'em_andamento':
        return <Badge className="bg-amber-500/20 text-white border-amber-500/30">Em andamento</Badge>;
      case 'cancelado':
        return <Badge className="bg-destructive/20 text-white border-destructive/30">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPerformanceIndicator = (percentual: number) => {
    if (percentual >= 70) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (percentual >= 50) {
      return <TrendingUp className="h-4 w-4 text-amber-500" />;
    } else {
      return <TrendingDown className="h-4 w-4 text-destructive" />;
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-card border-primary/10 animate-fade-in">
        <CardContent className="flex items-center justify-center h-80">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
            </div>
            <span className="text-sm text-muted-foreground">Carregando histórico...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-primary/10 overflow-hidden animate-fade-in">
      {/* Decorative glow */}
      <div className="absolute top-0 left-1/2 w-64 h-64 bg-gradient-to-br from-violet-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      <CardHeader className="relative">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center shadow-[0_0_15px_hsl(262_83%_58%/0.15)]">
            <BookOpen className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <CardTitle>Histórico de Simulados</CardTitle>
            <CardDescription>{simulados.length} simulados realizados</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        {simulados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="relative mb-4">
              <BookOpen className="h-16 w-16 opacity-20" />
              <div className="absolute inset-0 blur-2xl bg-primary/10" />
            </div>
            <p className="font-medium">Nenhum simulado realizado ainda.</p>
            <Link to="/simulados" className="mt-4">
              <Button className="shadow-[0_0_15px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.35)]">
                Iniciar Primeiro Simulado
              </Button>
            </Link>
          </div>
        ) : (
          <ScrollArea className="h-96 pr-4">
            <div className="space-y-4">
              {simulados.map((sim, index) => (
                <div
                  key={sim.id}
                  className="group relative overflow-hidden rounded-xl border border-violet-500/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-500 hover:shadow-xl hover:shadow-violet-500/10 hover:border-violet-500/20 animate-fade-in"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 from-violet-500/10 to-transparent pointer-events-none" />
                  <div className="p-4 relative">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-foreground group-hover:text-violet-500 transition-colors">{sim.titulo}</h4>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {getStatusBadge(sim.status)}
                          <Badge variant="outline" className="text-xs bg-muted/50">
                            {sim.tipo}
                          </Badge>
                        </div>
                      </div>
                      {sim.status === 'concluido' && (
                        <Link to={`/simulado/resultado?id=${sim.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 hover:bg-primary/10 hover:text-primary transition-all"
                          >
                            <Eye className="h-4 w-4" />
                            Ver
                          </Button>
                        </Link>
                      )}
                    </div>

                    {sim.status === 'concluido' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Desempenho</span>
                          <div className="flex items-center gap-2">
                            <div className={`p-1 rounded-md ${sim.percentual >= 70 ? 'bg-emerald-500/10' :
                              sim.percentual >= 50 ? 'bg-amber-500/10' : 'bg-destructive/10'
                              }`}>
                              {getPerformanceIndicator(sim.percentual)}
                            </div>
                            <span className="font-semibold">{sim.percentual}%</span>
                          </div>
                        </div>
                        <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ${sim.percentual >= 70 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_10px_hsl(142_71%_45%/0.4)]' :
                              sim.percentual >= 50 ? 'bg-gradient-to-r from-amber-500 to-amber-400 shadow-[0_0_10px_hsl(38_92%_50%/0.4)]' :
                                'bg-gradient-to-r from-destructive to-red-400 shadow-[0_0_10px_hsl(var(--destructive)/0.4)]'
                              }`}
                            style={{ width: `${sim.percentual}%` }}
                          />
                        </div>

                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Trophy className="h-3.5 w-3.5 text-violet-500" />
                            {sim.acertos}/{sim.total_questoes} acertos
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(sim.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                          {sim.tempo_minutos && (
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {sim.tempo_minutos} min
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
