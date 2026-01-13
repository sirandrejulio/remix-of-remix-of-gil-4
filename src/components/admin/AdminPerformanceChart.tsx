import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, BarChart3, Users } from 'lucide-react';

interface DisciplineStats {
  nome: string;
  questoes: number;
  acertos: number;
  taxa: number;
}

interface UserPerformance {
  usuario: string;
  simulados: number;
  taxa: number;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function AdminPerformanceChart() {
  const [disciplineData, setDisciplineData] = useState<DisciplineStats[]>([]);
  const [userPerformance, setUserPerformance] = useState<UserPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar todas as respostas com disciplinas
        const { data: respostas, error } = await supabase
          .from('respostas')
          .select(`
            esta_correta,
            user_id,
            questoes (
              disciplinas (
                nome
              )
            )
          `);

        if (error) throw error;

        // Agregar por disciplina
        const disciplineMap = new Map<string, { total: number; acertos: number }>();
        
        respostas?.forEach((r: any) => {
          const disciplina = r.questoes?.disciplinas?.nome || 'Sem disciplina';
          const current = disciplineMap.get(disciplina) || { total: 0, acertos: 0 };
          
          disciplineMap.set(disciplina, {
            total: current.total + 1,
            acertos: current.acertos + (r.esta_correta ? 1 : 0),
          });
        });

        const disciplineStats: DisciplineStats[] = Array.from(disciplineMap.entries())
          .map(([nome, stats]) => ({
            nome: nome.length > 20 ? nome.substring(0, 20) + '...' : nome,
            questoes: stats.total,
            acertos: stats.acertos,
            taxa: Math.round((stats.acertos / stats.total) * 100),
          }))
          .sort((a, b) => b.questoes - a.questoes)
          .slice(0, 8);

        setDisciplineData(disciplineStats);

        // Agregar por usuário
        const userMap = new Map<string, { simulados: Set<string>; acertos: number; total: number }>();
        
        const { data: respostasComSimulado } = await supabase
          .from('respostas')
          .select(`
            esta_correta,
            simulado_id,
            user_id,
            profiles!respostas_user_id_fkey (
              nome
            )
          `);

        respostasComSimulado?.forEach((r: any) => {
          const usuario = r.profiles?.nome || 'Usuário';
          const current = userMap.get(usuario) || { simulados: new Set(), acertos: 0, total: 0 };
          
          if (r.simulado_id) current.simulados.add(r.simulado_id);
          current.total++;
          if (r.esta_correta) current.acertos++;
          
          userMap.set(usuario, current);
        });

        const userStats: UserPerformance[] = Array.from(userMap.entries())
          .map(([usuario, stats]) => ({
            usuario: usuario.length > 15 ? usuario.substring(0, 15) + '...' : usuario,
            simulados: stats.simulados.size,
            taxa: Math.round((stats.acertos / stats.total) * 100),
          }))
          .sort((a, b) => b.simulados - a.simulados)
          .slice(0, 10);

        setUserPerformance(userStats);
      } catch (error) {
        console.error('Error fetching admin performance:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <Card className="animate-fade-in">
        <CardContent className="flex items-center justify-center h-80">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Desempenho por Disciplina
          </CardTitle>
          <CardDescription>Visão agregada de todos os alunos</CardDescription>
        </CardHeader>
        <CardContent>
          {disciplineData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <BarChart3 className="h-16 w-16 mb-4 opacity-30" />
              <p>Nenhum dado disponível.</p>
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={disciplineData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="nome" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="acertos" 
                    name="Acertos"
                    fill="hsl(var(--chart-1))" 
                    radius={[4, 4, 0, 0]}
                    animationDuration={1000}
                  />
                  <Bar 
                    dataKey="questoes" 
                    name="Total"
                    fill="hsl(var(--chart-2))" 
                    radius={[4, 4, 0, 0]}
                    animationDuration={1000}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Top Usuários
          </CardTitle>
          <CardDescription>Usuários mais ativos e suas taxas de acerto</CardDescription>
        </CardHeader>
        <CardContent>
          {userPerformance.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Users className="h-16 w-16 mb-4 opacity-30" />
              <p>Nenhum dado disponível.</p>
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" />
                  <YAxis dataKey="usuario" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="simulados" 
                    name="Simulados"
                    fill="hsl(var(--chart-3))" 
                    radius={[0, 4, 4, 0]}
                    animationDuration={1000}
                  />
                  <Bar 
                    dataKey="taxa" 
                    name="Taxa %"
                    fill="hsl(var(--chart-4))" 
                    radius={[0, 4, 4, 0]}
                    animationDuration={1000}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
