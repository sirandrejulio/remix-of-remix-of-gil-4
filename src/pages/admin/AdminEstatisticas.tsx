import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader2, BarChart3, PieChart as PieChartIcon, FileText, MessageSquare, TrendingUp, 
  Zap, Sparkles, Users, Target, Brain, Award, Calendar, RefreshCw, Clock, CheckCircle,
  XCircle, Activity, Database
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend
} from 'recharts';
import { toast } from 'sonner';

interface DisciplinaStats {
  nome: string;
  total: number;
  acertos: number;
  taxa: number;
}

interface OrigemStats {
  origem: string;
  count: number;
}

interface UserStats {
  id: string;
  nome: string;
  total_simulados: number;
  total_respostas: number;
  taxa_acerto: number;
}

interface PerformanceByDay {
  date: string;
  respostas: number;
  acertos: number;
  taxa: number;
}

interface AIMetrics {
  engine_name: string;
  request_count: number;
  success_count: number;
  failure_count: number;
  avg_response_time_ms: number;
  is_healthy: boolean;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function AdminEstatisticas() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [disciplinaStats, setDisciplinaStats] = useState<DisciplinaStats[]>([]);
  const [origemStats, setOrigemStats] = useState<OrigemStats[]>([]);
  const [totalSimulados, setTotalSimulados] = useState(0);
  const [totalRespostas, setTotalRespostas] = useState(0);
  const [totalQuestoes, setTotalQuestoes] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [taxaAcertoGlobal, setTaxaAcertoGlobal] = useState(0);
  const [topUsers, setTopUsers] = useState<UserStats[]>([]);
  const [performanceByDay, setPerformanceByDay] = useState<PerformanceByDay[]>([]);
  const [aiMetrics, setAiMetrics] = useState<AIMetrics[]>([]);
  const [periodoFiltro, setPeriodoFiltro] = useState('30');
  const [activeTab, setActiveTab] = useState('geral');

  const fetchStats = async () => {
    try {
      setIsRefreshing(true);
      
      // Fetch questions with discipline info
      const { data: questoes, count: questoesCount } = await supabase
        .from('questoes')
        .select('disciplina_id, origem', { count: 'exact' });

      setTotalQuestoes(questoesCount || 0);

      const { data: disciplinas } = await supabase
        .from('disciplinas')
        .select('id, nome');

      // Fetch all responses
      const { data: respostas, count: respostasCount } = await supabase
        .from('respostas')
        .select('questao_id, esta_correta, user_id, created_at', { count: 'exact' });

      setTotalRespostas(respostasCount || 0);

      // Calculate global accuracy
      if (respostas && respostas.length > 0) {
        const acertos = respostas.filter(r => r.esta_correta).length;
        setTaxaAcertoGlobal(Math.round((acertos / respostas.length) * 100));
      }

      // Get question discipline map
      const { data: questoesComDisciplina } = await supabase
        .from('questoes')
        .select('id, disciplina_id');
      
      const questaoToDisciplina = new Map(questoesComDisciplina?.map(q => [q.id, q.disciplina_id]) || []);

      // Group stats by discipline with accuracy
      const discMap = new Map<string, { total: number; acertos: number }>();
      (questoes || []).forEach((q) => {
        if (q.disciplina_id) {
          const current = discMap.get(q.disciplina_id) || { total: 0, acertos: 0 };
          discMap.set(q.disciplina_id, { ...current, total: current.total + 1 });
        }
      });

      // Add accuracy data from responses
      (respostas || []).forEach(r => {
        if (r.questao_id) {
          const disciplinaId = questaoToDisciplina.get(r.questao_id);
          if (disciplinaId) {
            const current = discMap.get(disciplinaId) || { total: 0, acertos: 0 };
            if (r.esta_correta) {
              discMap.set(disciplinaId, { ...current, acertos: current.acertos + 1 });
            }
          }
        }
      });

      const discStats = (disciplinas || [])
        .map((d) => {
          const stats = discMap.get(d.id) || { total: 0, acertos: 0 };
          const respostasDisc = (respostas || []).filter(r => questaoToDisciplina.get(r.questao_id) === d.id);
          const taxa = respostasDisc.length > 0 ? Math.round((stats.acertos / respostasDisc.length) * 100) : 0;
          return {
            nome: d.nome,
            total: stats.total,
            acertos: stats.acertos,
            taxa,
          };
        })
        .filter((d) => d.total > 0)
        .sort((a, b) => b.total - a.total);

      setDisciplinaStats(discStats);

      // Group by origin
      const origemMap = new Map<string, number>();
      (questoes || []).forEach((q) => {
        origemMap.set(q.origem, (origemMap.get(q.origem) || 0) + 1);
      });

      const origemLabels: Record<string, string> = {
        MANUAL: 'Manual',
        GOOGLE_GEMINI: 'Gemini',
        IA_PRINCIPAL: 'IA Principal',
        PDF_IMPORTADO: 'PDF',
      };

      const origStats = Array.from(origemMap.entries()).map(([origem, count]) => ({
        origem: origemLabels[origem] || origem,
        count,
      }));

      setOrigemStats(origStats);

      // Fetch simulados count
      const { count: simCount } = await supabase
        .from('simulados')
        .select('id', { count: 'exact', head: true });

      setTotalSimulados(simCount || 0);

      // Fetch users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });

      setTotalUsers(usersCount || 0);

      // Fetch top users by performance
      const userRespostas = new Map<string, { total: number; acertos: number }>();
      (respostas || []).forEach(r => {
        const current = userRespostas.get(r.user_id) || { total: 0, acertos: 0 };
        userRespostas.set(r.user_id, {
          total: current.total + 1,
          acertos: current.acertos + (r.esta_correta ? 1 : 0),
        });
      });

      const userIds = Array.from(userRespostas.keys());
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nome')
        .in('id', userIds);

      const userSimulados = new Map<string, number>();
      const { data: simulados } = await supabase
        .from('simulados')
        .select('user_id');
      
      (simulados || []).forEach(s => {
        userSimulados.set(s.user_id, (userSimulados.get(s.user_id) || 0) + 1);
      });

      const topUsersData: UserStats[] = (profiles || [])
        .map(p => {
          const stats = userRespostas.get(p.id) || { total: 0, acertos: 0 };
          return {
            id: p.id,
            nome: p.nome,
            total_simulados: userSimulados.get(p.id) || 0,
            total_respostas: stats.total,
            taxa_acerto: stats.total > 0 ? Math.round((stats.acertos / stats.total) * 100) : 0,
          };
        })
        .filter(u => u.total_respostas > 0)
        .sort((a, b) => b.taxa_acerto - a.taxa_acerto)
        .slice(0, 10);

      setTopUsers(topUsersData);

      // Performance by day (last N days based on filter)
      const days = parseInt(periodoFiltro);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const dayMap = new Map<string, { respostas: number; acertos: number }>();
      (respostas || []).forEach(r => {
        const date = new Date(r.created_at).toISOString().split('T')[0];
        if (new Date(date) >= startDate) {
          const current = dayMap.get(date) || { respostas: 0, acertos: 0 };
          dayMap.set(date, {
            respostas: current.respostas + 1,
            acertos: current.acertos + (r.esta_correta ? 1 : 0),
          });
        }
      });

      const perfByDay = Array.from(dayMap.entries())
        .map(([date, stats]) => ({
          date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          respostas: stats.respostas,
          acertos: stats.acertos,
          taxa: stats.respostas > 0 ? Math.round((stats.acertos / stats.respostas) * 100) : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setPerformanceByDay(perfByDay);

      // Fetch AI metrics
      const { data: aiData } = await supabase
        .from('ai_engine_metrics')
        .select('*')
        .order('request_count', { ascending: false });

      setAiMetrics(aiData || []);

    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [periodoFiltro]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
          <Loader2 className="h-8 w-8 animate-spin text-primary relative z-10" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-violet-500/10 to-cyan-500/20 rounded-2xl blur-xl opacity-60" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-xl bg-card/40 backdrop-blur-xl border border-border/30">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-violet-500/50 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative p-4 rounded-2xl bg-gradient-to-br from-primary to-violet-500 shadow-2xl shadow-primary/25">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
                Estatísticas
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Análise detalhada do sistema
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={periodoFiltro} onValueChange={setPeriodoFiltro}>
              <SelectTrigger className="w-40 bg-background/50 border-border/50">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="icon"
              onClick={fetchStats}
              disabled={isRefreshing}
              className="border-border/50 hover:border-primary/50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Users, label: 'Usuários', value: totalUsers, sublabel: 'cadastrados', color: 'primary' },
          { icon: FileText, label: 'Questões', value: totalQuestoes, sublabel: 'no banco', color: 'emerald' },
          { icon: Target, label: 'Simulados', value: totalSimulados, sublabel: 'realizados', color: 'violet' },
          { icon: MessageSquare, label: 'Respostas', value: totalRespostas, sublabel: 'registradas', color: 'orange' },
        ].map((stat, index) => (
          <Card 
            key={stat.label}
            className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full opacity-50" />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stat.value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.sublabel}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 group-hover:scale-110 transition-transform duration-300">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Global Accuracy Card */}
      <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-primary/5 to-violet-500/5" />
        <CardContent className="p-6 relative">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-primary shadow-lg">
                <Award className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Taxa de Acerto Global</h3>
                <p className="text-muted-foreground text-sm">Média de acertos em todas as respostas</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-5xl font-bold text-primary">{taxaAcertoGlobal}%</p>
                <p className="text-sm text-muted-foreground">de {totalRespostas.toLocaleString()} respostas</p>
              </div>
              <div className="h-16 w-16 relative">
                <svg className="h-16 w-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="hsl(var(--muted))"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="hsl(var(--primary))"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${taxaAcertoGlobal * 1.76} 176`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card/80 border border-border/50 p-1">
          <TabsTrigger value="geral" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="h-4 w-4 mr-2" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="h-4 w-4 mr-2" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="evolucao" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <TrendingUp className="h-4 w-4 mr-2" />
            Evolução
          </TabsTrigger>
          <TabsTrigger value="ia" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Brain className="h-4 w-4 mr-2" />
            IA
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="geral" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Questions by Discipline */}
            <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
              <CardHeader className="relative">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Questões por Disciplina</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                      Distribuição e taxa de acerto
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                {disciplinaStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={disciplinaStats} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value, name) => [value, name === 'total' ? 'Questões' : 'Taxa %']}
                      />
                      <Legend />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Questões" />
                      <Bar dataKey="taxa" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} name="Taxa %" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="p-4 rounded-full bg-muted/30 border border-border/50 mb-4">
                      <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground">Nenhuma questão cadastrada</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Questions by Origin */}
            <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
              <CardHeader className="relative">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <PieChartIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Questões por Origem</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Como as questões foram criadas
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                {origemStats.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={origemStats}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ origem, percent }) => `${origem} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                          stroke="hsl(var(--background))"
                          strokeWidth={2}
                        >
                          {origemStats.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-4 mt-2">
                      {origemStats.map((stat, index) => (
                        <div key={stat.origem} className="flex items-center gap-2">
                          <span 
                            className="h-3 w-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm text-muted-foreground">{stat.origem}: {stat.count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="p-4 rounded-full bg-muted/30 border border-border/50 mb-4">
                      <PieChartIcon className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground">Nenhuma questão cadastrada</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="usuarios" className="space-y-6">
          <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            <CardHeader className="relative">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Top 10 Usuários por Performance</CardTitle>
                  <CardDescription>Ranking baseado na taxa de acerto</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {topUsers.map((user, index) => (
                    <div 
                      key={user.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? 'bg-yellow-500 text-yellow-950' :
                          index === 1 ? 'bg-gray-400 text-gray-950' :
                          index === 2 ? 'bg-orange-500 text-orange-950' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{user.nome}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.total_simulados} simulados • {user.total_respostas} respostas
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">{user.taxa_acerto}%</p>
                          <p className="text-xs text-muted-foreground">taxa de acerto</p>
                        </div>
                        {user.taxa_acerto >= 80 ? (
                          <CheckCircle className="h-6 w-6 text-emerald-500" />
                        ) : user.taxa_acerto >= 60 ? (
                          <Activity className="h-6 w-6 text-yellow-500" />
                        ) : (
                          <XCircle className="h-6 w-6 text-destructive" />
                        )}
                      </div>
                    </div>
                  ))}
                  {topUsers.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground">Nenhum usuário com respostas registradas</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evolution Tab */}
        <TabsContent value="evolucao" className="space-y-6">
          <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            <CardHeader className="relative">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Evolução de Respostas</CardTitle>
                  <CardDescription>Respostas e taxa de acerto por dia</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              {performanceByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={performanceByDay} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRespostas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorAcertos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="respostas" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1} 
                      fill="url(#colorRespostas)" 
                      name="Respostas"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="acertos" 
                      stroke="hsl(var(--chart-2))" 
                      fillOpacity={1} 
                      fill="url(#colorAcertos)" 
                      name="Acertos"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <TrendingUp className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Sem dados no período selecionado</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Taxa de Acerto ao Longo do Tempo */}
          <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
            <CardHeader className="relative">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Target className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <CardTitle>Taxa de Acerto por Dia</CardTitle>
                  <CardDescription>Evolução da performance geral</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              {performanceByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={performanceByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value) => [`${value}%`, 'Taxa de Acerto']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="taxa" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--chart-2))', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: 'hsl(var(--chart-2))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Sem dados no período selecionado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Tab */}
        <TabsContent value="ia" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {aiMetrics.map((metric) => (
              <Card 
                key={metric.engine_name}
                className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm"
              >
                <div className={`absolute top-0 left-0 w-full h-1 ${metric.is_healthy ? 'bg-emerald-500' : 'bg-destructive'}`} />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{metric.engine_name}</CardTitle>
                    </div>
                    <Badge variant={metric.is_healthy ? 'default' : 'destructive'} className="text-xs">
                      {metric.is_healthy ? 'Saudável' : 'Problemas'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Requisições</p>
                      <p className="text-xl font-bold">{metric.request_count.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Sucesso</p>
                      <p className="text-xl font-bold text-emerald-500">
                        {metric.request_count > 0 
                          ? Math.round((metric.success_count / metric.request_count) * 100) 
                          : 0}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{metric.avg_response_time_ms}ms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500">{metric.success_count}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-destructive">{metric.failure_count}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {aiMetrics.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Brain className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Nenhuma métrica de IA registrada</p>
                  <p className="text-sm text-muted-foreground/70">As métricas aparecerão após o uso dos serviços de IA</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
