import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  BookOpen, 
  Brain, 
  Users, 
  Mail, 
  Activity, 
  Settings,
  ArrowRight,
  Database,
  Shield,
  Sparkles,
  Layers,
  CheckCircle2,
  Lock,
  TrendingUp,
  Zap,
  BarChart3,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Module {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  color: string;
  bgGradient: string;
  stats: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

const modules: Module[] = [
  {
    id: 'questoes',
    title: 'Banco de Questões',
    description: 'Cadastro, classificação e gestão de questões por banca, disciplina e tema.',
    icon: FileText,
    path: '/admin/questoes',
    color: 'text-chart-4',
    bgGradient: 'from-chart-4/20 via-chart-4/10 to-transparent',
    stats: 'CRUD Completo',
    badge: 'Ativo',
    badgeVariant: 'default',
  },
  {
    id: 'simulados',
    title: 'Simulados & Provas',
    description: 'Estatísticas de simulados, desempenho de candidatos e análise detalhada.',
    icon: BookOpen,
    path: '/admin/estatisticas',
    color: 'text-chart-1',
    bgGradient: 'from-chart-1/20 via-chart-1/10 to-transparent',
    stats: 'Análise Avançada',
  },
  {
    id: 'especialista',
    title: 'Agente Especialista',
    description: 'Upload de materiais, base de conhecimento e configuração do agente IA.',
    icon: Brain,
    path: '/admin/especialista',
    color: 'text-chart-5',
    bgGradient: 'from-chart-5/20 via-chart-5/10 to-transparent',
    stats: 'IA Integrada',
    badge: 'Novo',
    badgeVariant: 'secondary',
  },
  {
    id: 'usuarios',
    title: 'Gestão de Usuários',
    description: 'Listar, ativar/desativar, alterar permissões e visualizar histórico.',
    icon: Users,
    path: '/admin/usuarios',
    color: 'text-chart-3',
    bgGradient: 'from-chart-3/20 via-chart-3/10 to-transparent',
    stats: 'RBAC Ativo',
  },
  {
    id: 'convites',
    title: 'Sistema de Convites',
    description: 'Gerar convites com tipo de usuário, expiração e rastreamento.',
    icon: Mail,
    path: '/admin/usuarios',
    color: 'text-chart-2',
    bgGradient: 'from-chart-2/20 via-chart-2/10 to-transparent',
    stats: 'Token Único',
  },
  {
    id: 'logs',
    title: 'Logs & Auditoria',
    description: 'Registro de todas as ações administrativas do sistema.',
    icon: Activity,
    path: '/admin/logs',
    color: 'text-muted-foreground',
    bgGradient: 'from-muted/40 via-muted/20 to-transparent',
    stats: 'Histórico Completo',
  },
  {
    id: 'configuracoes',
    title: 'Configurações',
    description: 'Parâmetros do sistema, integrações e configurações globais.',
    icon: Settings,
    path: '/admin/configuracoes',
    color: 'text-muted-foreground',
    bgGradient: 'from-muted/40 via-muted/20 to-transparent',
    stats: 'Personalizável',
  },
];

interface RbacRole {
  role: string;
  permissions: string;
  icon: React.ElementType;
  color: string;
}

const rbacRoles: RbacRole[] = [
  { 
    role: 'Admin', 
    permissions: 'Acesso total ao sistema',
    icon: Shield,
    color: 'text-destructive'
  },
  { 
    role: 'Tutor', 
    permissions: 'Gestão de conteúdo (futuro)',
    icon: BookOpen,
    color: 'text-chart-5'
  },
  { 
    role: 'Aluno', 
    permissions: 'Área de estudos',
    icon: Users,
    color: 'text-chart-3'
  },
];

const securityFeatures = [
  { text: 'RLS (Row Level Security) ativo', icon: Lock },
  { text: 'Políticas de acesso por função', icon: Shield },
  { text: 'Logs de auditoria independentes', icon: Activity },
  { text: 'Sem compartilhamento entre módulos', icon: Database },
];

const statsCards = [
  { label: 'Módulos Ativos', value: '7', icon: Layers, color: 'text-primary' },
  { label: 'Uptime Sistema', value: '99.9%', icon: TrendingUp, color: 'text-chart-3' },
  { label: 'Última Sync', value: '2min', icon: Clock, color: 'text-chart-4' },
];

export default function AdminModulos() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-chart-2/5 to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-primary/30 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500" />
              <div className="relative p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-chart-2/20 border border-primary/30">
                <Layers className="h-10 w-10 text-primary" />
              </div>
            </div>
            
            <div className="flex-1">
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
                Módulos Administrativos
                <Sparkles className="h-6 w-6 text-primary animate-pulse" />
              </h1>
              <p className="text-muted-foreground mt-1">
                Central de gestão e configuração do sistema
              </p>
            </div>

            {/* Quick Stats */}
            <div className="hidden xl:flex items-center gap-4">
              {statsCards.map((stat, index) => (
                <div 
                  key={stat.label}
                  className="flex items-center gap-3 px-4 py-2 rounded-xl bg-secondary/50 border border-border/50"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                  <div>
                    <p className="text-lg font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Stats */}
      <div className="grid grid-cols-3 gap-3 xl:hidden">
        {statsCards.map((stat, index) => (
          <Card 
            key={stat.label}
            className="border-border/50 bg-card/50 backdrop-blur-sm animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <stat.icon className={cn("h-6 w-6 mb-2", stat.color)} />
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modules Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {modules.map((module, index) => {
          const Icon = module.icon;
          return (
            <Card 
              key={module.id} 
              className={cn(
                "group relative overflow-hidden",
                "border-border/50 bg-card/50 backdrop-blur-sm",
                "hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10",
                "transition-all duration-500 animate-fade-in"
              )}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              {/* Background Gradient */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                module.bgGradient
              )} />
              
              {/* Top accent line */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <CardHeader className="relative pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className={cn(
                    "relative p-3 rounded-xl",
                    "bg-secondary border border-border/50",
                    "group-hover:scale-110 group-hover:border-primary/30",
                    "transition-all duration-300"
                  )}>
                    <Icon className={cn("h-6 w-6", module.color)} />
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    {module.badge && (
                      <Badge variant={module.badgeVariant || 'default'} className="text-[10px] px-2">
                        {module.badge}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">
                      {module.stats}
                    </span>
                  </div>
                </div>
                
                <CardTitle className="text-base mt-4 group-hover:text-primary transition-colors duration-300">
                  {module.title}
                </CardTitle>
                <CardDescription className="text-xs line-clamp-2 min-h-[2.5rem]">
                  {module.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="relative pt-0">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn(
                    "w-full justify-between",
                    "hover:bg-primary/10 hover:text-primary",
                    "border border-transparent hover:border-primary/30",
                    "transition-all duration-300"
                  )}
                  asChild
                >
                  <Link to={module.path}>
                    <span>Acessar Módulo</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* RBAC & Security Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* RBAC Card */}
        <Card className={cn(
          "group relative overflow-hidden",
          "border-border/50 bg-card/50 backdrop-blur-sm",
          "hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10",
          "transition-all duration-500 animate-fade-in"
        )} style={{ animationDelay: '450ms' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-chart-2/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="relative p-2.5 rounded-xl bg-primary/10 border border-primary/20 group-hover:scale-110 transition-transform duration-300">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="group-hover:text-primary transition-colors duration-300">
                  Controle de Permissões
                </CardTitle>
                <CardDescription>Sistema RBAC com níveis isolados</CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="relative space-y-3">
            {rbacRoles.map((item, index) => (
              <div 
                key={item.role}
                className={cn(
                  "flex items-center gap-4 p-3 rounded-xl",
                  "bg-secondary/50 border border-border/50",
                  "hover:border-primary/30 hover:bg-secondary/80",
                  "transition-all duration-300 animate-fade-in"
                )}
                style={{ animationDelay: `${500 + index * 80}ms` }}
              >
                <div className={cn(
                  "p-2 rounded-lg bg-background/50 border border-border/50"
                )}>
                  <item.icon className={cn("h-4 w-4", item.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-semibold", item.color)}>{item.role}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.permissions}</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-chart-3 flex-shrink-0" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Data Isolation Card */}
        <Card className={cn(
          "group relative overflow-hidden",
          "border-border/50 bg-card/50 backdrop-blur-sm",
          "hover:border-chart-3/50 hover:shadow-xl hover:shadow-chart-3/10",
          "transition-all duration-500 animate-fade-in"
        )} style={{ animationDelay: '500ms' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-chart-3/5 via-transparent to-chart-4/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="relative p-2.5 rounded-xl bg-chart-3/10 border border-chart-3/20 group-hover:scale-110 transition-transform duration-300">
                <Database className="h-6 w-6 text-chart-3" />
              </div>
              <div>
                <CardTitle className="group-hover:text-chart-3 transition-colors duration-300">
                  Isolamento de Dados
                </CardTitle>
                <CardDescription>Segurança em camadas independentes</CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="relative space-y-3">
            {securityFeatures.map((item, index) => (
              <div 
                key={item.text}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl",
                  "hover:bg-chart-3/5",
                  "transition-all duration-300 animate-fade-in"
                )}
                style={{ animationDelay: `${550 + index * 80}ms` }}
              >
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-chart-3/50 rounded-full blur-sm animate-pulse" />
                  <div className="relative p-1.5 rounded-lg bg-chart-3/10 border border-chart-3/20">
                    <item.icon className="h-4 w-4 text-chart-3" />
                  </div>
                </div>
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                  {item.text}
                </span>
              </div>
            ))}
            
            {/* Security Badge */}
            <div className="flex items-center gap-2 pt-2 mt-2 border-t border-border/50">
              <Zap className="h-4 w-4 text-chart-3" />
              <span className="text-xs text-chart-3 font-medium">Sistema 100% Seguro</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
