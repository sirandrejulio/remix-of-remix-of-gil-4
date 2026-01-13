import { useState, useEffect } from 'react';
import { DottedSurface } from "@/components/ui/dotted-surface";
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  BarChart3, 
  LogOut,
  Menu,
  X,
  ChevronDown,
  Activity,
  Grid3X3,
  ArrowLeft,
  Zap,
  Brain,
  ChevronLeft,
  ChevronRight,
  Home,
  Sparkles
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AdminNotificationsSheet } from '@/components/notifications/AdminNotificationsSheet';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard, description: 'Visão geral' },
  { label: 'Módulos', path: '/admin/modulos', icon: Grid3X3, description: 'Áreas de gestão' },
  { label: 'Usuários', path: '/admin/usuarios', icon: Users, description: 'Gestão de usuários' },
  { label: 'Questões', path: '/admin/questoes', icon: FileText, description: 'Banco de questões' },
  { label: 'Especialista', path: '/admin/especialista', icon: Brain, description: 'Agente IA' },
  { label: 'Logs', path: '/admin/logs', icon: Activity, description: 'Auditoria' },
  { label: 'Estatísticas', path: '/admin/estatisticas', icon: BarChart3, description: 'Métricas' },
  { label: 'Config', path: '/admin/configuracoes', icon: Settings, description: 'Configurações' },
];

export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Restore collapsed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('admin-sidebar-collapsed');
    if (stored) setIsCollapsed(JSON.parse(stored));
  }, []);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('admin-sidebar-collapsed', JSON.stringify(newState));
  };

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getCurrentPageTitle = () => {
    const current = navItems.find(item => isActive(item.path));
    return current?.label || 'Admin';
  };

  return (
    <>
      <DottedSurface />
      <div className="min-h-screen w-full relative flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex flex-col",
            "bg-background/80 backdrop-blur-2xl",
            "border-r border-border/50",
            "transform transition-all duration-300 ease-out",
            "lg:translate-x-0",
            isCollapsed ? 'lg:w-20' : 'lg:w-72',
            isSidebarOpen ? 'translate-x-0 w-72 shadow-2xl shadow-primary/10' : '-translate-x-full'
          )}
        >
          {/* Glow effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 -left-20 w-40 h-40 bg-chart-2/10 rounded-full blur-3xl" />
          </div>

          {/* Logo Section */}
          <div className={cn(
            "flex items-center gap-3 p-4 border-b border-border/50",
            isCollapsed && "lg:justify-center lg:px-2"
          )}>
            <div className="relative group cursor-pointer" onClick={() => navigate('/admin')}>
              <div className={cn(
                "flex items-center justify-center rounded-xl",
                "bg-gradient-to-br from-primary via-primary to-chart-2",
                "shadow-lg shadow-primary/30",
                "transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-primary/40",
                isCollapsed ? "h-10 w-10 lg:h-12 lg:w-12" : "h-11 w-11"
              )}>
                <GraduationCap className={cn(
                  "text-primary-foreground",
                  isCollapsed ? "h-5 w-5 lg:h-6 lg:w-6" : "h-6 w-6"
                )} />
              </div>
              <div className="absolute inset-0 rounded-xl bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            
            {(!isCollapsed || isSidebarOpen) && (
              <div className="flex flex-col min-w-0 animate-fade-in">
                <span className="text-sm font-bold text-foreground tracking-tight truncate">
                  BANCÁRIO ÁGIL
                </span>
                <span className="text-xs font-semibold text-primary flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  PAINEL ADMIN
                </span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto scrollbar-thin">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              const NavContent = (
                <Link
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl text-sm font-medium",
                    "transition-all duration-300",
                    isCollapsed && !isSidebarOpen ? "lg:justify-center lg:px-3 lg:py-3 px-3 py-2.5" : "px-3 py-2.5",
                    active
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className={cn(
                    "relative flex items-center justify-center",
                    "transition-all duration-300",
                    active && "scale-110"
                  )}>
                    <Icon className={cn(
                      "h-5 w-5 transition-all duration-300",
                      active && "drop-shadow-lg"
                    )} />
                    {active && (
                      <div className="absolute inset-0 bg-primary-foreground/20 rounded-full blur-md" />
                    )}
                  </div>
                  
                  {(!isCollapsed || isSidebarOpen) && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {active && (
                        <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                      )}
                    </>
                  )}
                </Link>
              );

              if (isCollapsed && !isSidebarOpen) {
                return (
                  <Tooltip key={item.path} delayDuration={0}>
                    <TooltipTrigger asChild>
                      {NavContent}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="flex flex-col">
                      <span className="font-semibold">{item.label}</span>
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={item.path}>{NavContent}</div>;
            })}
          </nav>

          {/* Collapse Toggle - Desktop Only */}
          <div className="hidden lg:flex justify-center p-2 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="w-full gap-2 text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              {isCollapsed ? (
                <>
                  <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  <span>Recolher</span>
                </>
              )}
            </Button>
          </div>

          {/* User Section */}
          <div className={cn(
            "p-3 border-t border-border/50",
            isCollapsed && !isSidebarOpen && "lg:p-2"
          )}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={cn(
                    "w-full h-auto rounded-xl",
                    "hover:bg-secondary transition-all duration-300",
                    isCollapsed && !isSidebarOpen 
                      ? "lg:justify-center lg:p-2 justify-start gap-3 py-3 px-3" 
                      : "justify-start gap-3 py-3 px-3"
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className={cn(
                      "border-2 border-primary/30 transition-all duration-300",
                      isCollapsed && !isSidebarOpen ? "h-9 w-9 lg:h-10 lg:w-10" : "h-10 w-10"
                    )}>
                      <AvatarFallback className="bg-gradient-to-br from-primary/30 to-chart-2/30 text-primary text-sm font-semibold">
                        {profile ? getInitials(profile.nome) : 'AD'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-chart-3 border-2 border-background" />
                  </div>
                  
                  {(!isCollapsed || isSidebarOpen) && (
                    <>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-semibold truncate">{profile?.nome || 'Admin'}</p>
                        <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isCollapsed ? "center" : "end"} side={isCollapsed ? "right" : "top"} className="w-56">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Minha Conta
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="cursor-pointer gap-2">
                    <Home className="h-4 w-4" />
                    Área do Aluno
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer gap-2">
                  <LogOut className="h-4 w-4" />
                  Sair do Sistema
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden animate-fade-in"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main content area */}
        <div className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300",
          isCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        )}>
          {/* Header */}
          <header className="sticky top-0 z-30 flex items-center gap-4 px-4 lg:px-6 h-16 bg-background/80 backdrop-blur-xl border-b border-border/50">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={cn(
                "lg:hidden p-2.5 -ml-1 rounded-xl",
                "bg-secondary hover:bg-secondary/80",
                "transition-all duration-300"
              )}
              aria-label="Toggle menu"
            >
              {isSidebarOpen ? (
                <X className="h-5 w-5 text-foreground" />
              ) : (
                <Menu className="h-5 w-5 text-foreground" />
              )}
            </button>

            {/* Back button - Desktop */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="hidden lg:flex gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden xl:inline">Voltar</span>
            </Button>

            {/* Page Title - Mobile */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold text-sm">{getCurrentPageTitle()}</span>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Status Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-chart-3/10 border border-chart-3/20">
              <div className="w-2 h-2 rounded-full bg-chart-3 animate-pulse" />
              <span className="text-xs font-medium text-chart-3">Online</span>
            </div>

            {/* Notifications */}
            <AdminNotificationsSheet />
          </header>

          {/* Page content */}
          <main className="flex-1 p-4 lg:p-6 relative">
            {/* Subtle background effects */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute bottom-20 left-20 w-80 h-80 bg-chart-2/5 rounded-full blur-3xl" />
            </div>
            
            <div className="relative max-w-[1800px] mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
