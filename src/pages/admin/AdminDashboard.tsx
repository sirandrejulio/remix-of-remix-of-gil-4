import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  FileText, 
  BookOpen, 
  TrendingUp, 
  Loader2,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Upload,
  UserPlus,
  ClipboardCheck,
  BarChart3,
  Target,
  History,
  Zap,
  Sparkles,
  Activity
} from 'lucide-react';
import { AdminPerformanceChart } from '@/components/admin/AdminPerformanceChart';
import { AdminQuestoesRespondidas } from '@/components/admin/AdminQuestoesRespondidas';
import { AdminHistoricoSimulados } from '@/components/admin/AdminHistoricoSimulados';
import { cn } from '@/lib/utils';

interface Stats {
  totalUsers: number;
  totalQuestions: number;
  totalSimulations: number;
  avgAccuracy: number;
  pendingQuestions: number;
  validQuestions: number;
  pendingInvites: number;
}

interface RecentActivity {
  id: string;
  type: 'user' | 'question' | 'simulation' | 'invite';
  action: string;
  description: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [
          usersResult, 
          questionsResult, 
          simulationsResult, 
          performanceResult,
          pendingQuestionsResult,
          validQuestionsResult,
          pendingInvitesResult,
          recentUsersResult,
          recentQuestionsResult,
        ] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('questoes').select('id', { count: 'exact', head: true }),
          supabase.from('simulados').select('id', { count: 'exact', head: true }),
          supabase.from('performance').select('taxa_acerto'),
          supabase.from('questoes').select('id', { count: 'exact', head: true }).eq('status_validacao', 'pendente'),
          supabase.from('questoes').select('id', { count: 'exact', head: true }).eq('status_validacao', 'valida'),
          supabase.from('invites').select('id', { count: 'exact', head: true }).is('used_at', null),
          supabase.from('profiles').select('id, nome, created_at').order('created_at', { ascending: false }).limit(3),
          supabase.from('questoes').select('id, tema, created_at').order('created_at', { ascending: false }).limit(3),
        ]);

        const avgAccuracy = performanceResult.data?.length 
          ? performanceResult.data.reduce((acc, p) => acc + Number(p.taxa_acerto || 0), 0) / performanceResult.data.length
          : 0;

        setStats({
          totalUsers: usersResult.count || 0,
          totalQuestions: questionsResult.count || 0,
          totalSimulations: simulationsResult.count || 0,
          avgAccuracy: Math.round(avgAccuracy * 100) / 100,
          pendingQuestions: pendingQuestionsResult.count || 0,
          validQuestions: validQuestionsResult.count || 0,
          pendingInvites: pendingInvitesResult.count || 0,
        });

        const activities: RecentActivity[] = [];
        
        recentUsersResult.data?.forEach(user => {
          activities.push({
            id: user.id,
            type: 'user',
            action: 'Novo usuário',
            description: user.nome,
            created_at: user.created_at,
          });
        });

        recentQuestionsResult.data?.forEach(q => {
          activities.push({
            id: q.id,
            type: 'question',
            action: 'Questão criada',
            description: q.tema,
            created_at: q.created_at,
          });
        });

        activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRecentActivities(activities.slice(0, 5));
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse" />
          </div>
          <span className="text-sm text-muted-foreground">Carregando dashboard...</span>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Usuários',
      value: stats?.totalUsers || 0,
      description: 'Total cadastrados',
      icon: Users,
      color: 'from-primary/20 to-primary/5',
      iconColor: 'text-primary',
      borderColor: 'border-primary/20',
      glowColor: 'shadow-primary/20',
      path: '/admin/usuarios',
    },
    {
      title: 'Questões',
      value: stats?.totalQuestions || 0,
      description: `${stats?.validQuestions || 0} válidas`,
      icon: FileText,
      color: 'from-emerald-500/20 to-emerald-500/5',
      iconColor: 'text-emerald-500',
      borderColor: 'border-emerald-500/20',
      glowColor: 'shadow-emerald-500/20',
      path: '/admin/questoes',
    },
    {
      title: 'Simulados',
      value: stats?.totalSimulations || 0,
      description: 'Realizados',
      icon: BookOpen,
      color: 'from-violet-500/20 to-violet-500/5',
      iconColor: 'text-violet-500',
      borderColor: 'border-violet-500/20',
      glowColor: 'shadow-violet-500/20',
      path: '/admin/estatisticas',
    },
    {
      title: 'Taxa Média',
      value: `${stats?.avgAccuracy || 0}%`,
      description: 'De acertos',
      icon: TrendingUp,
      color: 'from-amber-500/20 to-amber-500/5',
      iconColor: 'text-amber-500',
      borderColor: 'border-amber-500/20',
      glowColor: 'shadow-amber-500/20',
      path: '/admin/estatisticas',
    },
  ];

  const quickActions = [
    {
      title: 'Upload de Provas',
      description: 'Importar PDFs',
      icon: Upload,
      path: '/admin/upload',
      variant: 'outline' as "default" | "outline",
      highlight: false,
    },
    {
      title: 'Convidar Usuário',
      description: `${stats?.pendingInvites || 0} pendentes`,
      icon: UserPlus,
      path: '/admin/usuarios',
      variant: 'outline' as "default" | "outline",
      highlight: false,
    },
  ];

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user': return <Users className="h-4 w-4 text-primary" />;
      case 'question': return <FileText className="h-4 w-4 text-emerald-600" />;
      case 'simulation': return <BookOpen className="h-4 w-4 text-violet-600" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in relative">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-xl shadow-primary/25">
            <Zap className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
              Dashboard Admin
              <Sparkles className="h-6 w-6 text-amber-500 animate-pulse" />
            </h1>
            <p className="text-muted-foreground mt-0.5">Visão geral do sistema Bancário Ágil</p>
          </div>
        </div>
        <Button asChild className="shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300">
          <Link to="/admin/modulos">
            Ver Módulos
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} to={card.path}>
              <Card 
                className={cn(
                  "group cursor-pointer animate-fade-in relative overflow-hidden",
                  "hover:shadow-xl transition-all duration-500",
                  `hover:${card.glowColor}`,
                  card.borderColor
                )}
                style={{ animationDelay: `${(index + 1) * 75}ms` }}
              >
                {/* Background gradient */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                  card.color
                )} />
                
                {/* Glow effect */}
                <div className={cn(
                  "absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-500",
                  card.iconColor.replace('text-', 'bg-')
                )} />

                <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300",
                    "bg-gradient-to-br group-hover:scale-110 group-hover:shadow-lg",
                    card.color
                  )}>
                    <Icon className={cn("h-6 w-6", card.iconColor)} />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-3xl font-bold tabular-nums">{card.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                </CardContent>

                {/* Animated line */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
                  <div className={cn(
                    "h-full w-1/3 translate-x-[-100%] group-hover:translate-x-[400%] transition-transform duration-1000",
                    card.iconColor.replace('text-', 'bg-')
                  )} />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Actions */}
        <Card className="animate-fade-in group relative overflow-hidden hover:shadow-xl transition-all duration-500" style={{ animationDelay: '350ms' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-primary/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <CardHeader className="pb-4 relative">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              Ações Rápidas
            </CardTitle>
            <CardDescription className="text-sm">Acesso direto às principais funções</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 relative">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.title}
                  variant={action.variant}
                  className={cn(
                    "w-full justify-start h-auto py-3 rounded-xl transition-all duration-300",
                    action.highlight && "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20",
                    !action.highlight && "hover:bg-muted/50 hover:translate-x-1"
                  )}
                  style={{ animationDelay: `${400 + index * 50}ms` }}
                  asChild
                >
                  <Link to={action.path}>
                    <div className={cn(
                      "p-2 rounded-lg mr-3",
                      action.highlight ? "bg-primary-foreground/20" : "bg-muted"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="flex-1 text-left text-sm font-medium">{action.title}</span>
                    <Badge 
                      variant={action.highlight ? "secondary" : "outline"} 
                      className={cn(
                        "ml-2 text-xs",
                        action.highlight && "bg-primary-foreground/20 text-primary-foreground border-0"
                      )}
                    >
                      {action.description}
                    </Badge>
                  </Link>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="animate-fade-in group relative overflow-hidden hover:shadow-xl transition-all duration-500" style={{ animationDelay: '400ms' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-violet-500/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <CardHeader className="pb-4 relative">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center">
                <Activity className="h-4 w-4 text-violet-500" />
              </div>
              Atividade Recente
            </CardTitle>
            <CardDescription className="text-sm">Últimas ações no sistema</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            {recentActivities.length === 0 ? (
              <div className="text-center py-8">
                <div className="h-16 w-16 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <Clock className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Nenhuma atividade recente registrada.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((activity, index) => (
                  <div 
                    key={activity.id} 
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: `${450 + index * 50}ms` }}
                  >
                    <div className="p-2 rounded-lg bg-background shadow-sm">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.action}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.description}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-muted/50">
                      {formatTime(activity.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="desempenho" className="animate-fade-in" style={{ animationDelay: '500ms' }}>
        <TabsList className="mb-4 bg-muted/50 backdrop-blur-sm border border-border/50">
          <TabsTrigger value="desempenho" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Desempenho</span>
          </TabsTrigger>
          <TabsTrigger value="questoes" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Questões</span>
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="desempenho" className="animate-fade-in">
          <Card className="overflow-hidden hover:shadow-xl transition-all duration-500">
            <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b border-border/40">
              <CardTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="block">Desempenho Geral</span>
                  <span className="text-sm font-normal text-muted-foreground">Métricas de todos os usuários</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <AdminPerformanceChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questoes" className="animate-fade-in">
          <Card className="overflow-hidden hover:shadow-xl transition-all duration-500">
            <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-transparent border-b border-border/40">
              <CardTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center">
                  <Target className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <span className="block">Questões Respondidas</span>
                  <span className="text-sm font-normal text-muted-foreground">Histórico de respostas do sistema</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <AdminQuestoesRespondidas />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="animate-fade-in">
          <Card className="overflow-hidden hover:shadow-xl transition-all duration-500">
            <CardHeader className="bg-gradient-to-r from-violet-500/10 to-transparent border-b border-border/40">
              <CardTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center">
                  <History className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <span className="block">Histórico de Simulados</span>
                  <span className="text-sm font-normal text-muted-foreground">Simulados realizados no sistema</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <AdminHistoricoSimulados />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* System Status */}
      <Card className="animate-fade-in group relative overflow-hidden hover:shadow-xl transition-all duration-500" style={{ animationDelay: '550ms' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <CardHeader className="pb-4 relative">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            Status do Sistema
          </CardTitle>
          <CardDescription className="text-sm">Integrações e serviços ativos</CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { name: 'IA Principal (Lovable)', status: 'Ativo', icon: Sparkles },
              { name: 'Google Gemini', status: 'Ativo', icon: Zap },
              { name: 'Supabase', status: 'Conectado', icon: Activity },
            ].map((service, index) => (
              <div 
                key={service.name} 
                className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50 hover:shadow-lg transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${600 + index * 50}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <service.icon className="h-4 w-4 text-emerald-500" />
                  </div>
                  <span className="text-sm font-medium">{service.name}</span>
                </div>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                  {service.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
