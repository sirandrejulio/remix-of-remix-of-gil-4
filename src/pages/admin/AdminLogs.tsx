import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader2, Search, Activity, Zap, Clock, User, FileText, Sparkles, 
  RefreshCw, Download, ChevronLeft, ChevronRight, Eye, Calendar,
  Filter, Database, AlertTriangle, CheckCircle, XCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_name?: string;
}

const actionColors: Record<string, string> = {
  create: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  update: 'bg-primary/20 text-primary border border-primary/30',
  delete: 'bg-destructive/20 text-destructive border border-destructive/30',
  approve: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  reject: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  upload: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  login: 'bg-muted text-muted-foreground border border-border/50',
  config_update: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  export: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
};

const actionIcons: Record<string, React.ElementType> = {
  create: CheckCircle,
  update: RefreshCw,
  delete: XCircle,
  approve: CheckCircle,
  reject: AlertTriangle,
  upload: Download,
  login: User,
  config_update: Database,
  export: Download,
};

const ITEMS_PER_PAGE = 20;

export default function AdminLogs() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterResource, setFilterResource] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('all');

  const fetchLogs = useCallback(async () => {
    try {
      setIsRefreshing(true);
      
      // Build query
      let query = supabase
        .from('admin_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        let startDate: Date;
        
        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          default:
            startDate = new Date(0);
        }
        query = query.gte('created_at', startDate.toISOString());
      }

      // Apply action filter
      if (filterAction !== 'all') {
        query = query.eq('action', filterAction);
      }

      // Apply resource filter
      if (filterResource !== 'all') {
        query = query.eq('resource_type', filterResource);
      }

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data: logsData, count, error } = await query;

      if (error) throw error;

      setTotalCount(count || 0);

      if (logsData) {
        // Fetch user names
        const userIds = [...new Set(logsData.filter(l => l.user_id).map(l => l.user_id))];
        
        let profileMap = new Map<string, string>();
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, nome')
            .in('id', userIds);

          profileMap = new Map(profiles?.map(p => [p.id, p.nome]) || []);
        }

        const logsWithNames = logsData.map(log => ({
          ...log,
          details: log.details as Record<string, unknown> | null,
          user_name: log.user_id ? profileMap.get(log.user_id) || 'Usuário' : 'Sistema',
        }));

        // Apply search filter client-side
        const filtered = searchTerm 
          ? logsWithNames.filter(log => 
              log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
              log.resource_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
              log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              log.resource_id?.toLowerCase().includes(searchTerm.toLowerCase())
            )
          : logsWithNames;

        setLogs(filtered);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Erro ao carregar logs');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, filterAction, filterResource, dateFilter, searchTerm]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterAction, filterResource, dateFilter, searchTerm]);

  // Get unique values for filters
  const [uniqueActions, setUniqueActions] = useState<string[]>([]);
  const [uniqueResources, setUniqueResources] = useState<string[]>([]);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      const { data: actionsData } = await supabase
        .from('admin_logs')
        .select('action')
        .limit(1000);

      const { data: resourcesData } = await supabase
        .from('admin_logs')
        .select('resource_type')
        .limit(1000);

      if (actionsData) {
        setUniqueActions([...new Set(actionsData.map(l => l.action))]);
      }
      if (resourcesData) {
        setUniqueResources([...new Set(resourcesData.map(l => l.resource_type))]);
      }
    };

    fetchFilterOptions();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const exportLogs = async () => {
    try {
      const { data } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (data) {
        const csv = [
          ['Data', 'Usuário', 'Ação', 'Recurso', 'ID Recurso', 'Detalhes'].join(','),
          ...data.map(log => [
            formatDate(log.created_at),
            log.user_id || 'Sistema',
            log.action,
            log.resource_type,
            log.resource_id || '',
            JSON.stringify(log.details || {}).replace(/,/g, ';'),
          ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `admin_logs_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        toast.success('Logs exportados com sucesso!');
      }
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast.error('Erro ao exportar logs');
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const todayLogs = logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length;
  const uniqueUsers = new Set(logs.map(l => l.user_id)).size;

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
                <Activity className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
                Logs do Sistema
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Histórico de ações administrativas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={exportLogs}
              className="border-border/50 hover:border-primary/50"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={fetchLogs}
              disabled={isRefreshing}
              className="border-border/50 hover:border-primary/50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { icon: Activity, label: 'Total de Logs', value: totalCount, color: 'primary' },
          { icon: Zap, label: 'Ações Hoje', value: todayLogs, color: 'emerald' },
          { icon: User, label: 'Usuários Únicos', value: uniqueUsers, color: 'violet' },
          { icon: FileText, label: 'Tipos de Recurso', value: uniqueResources.length, color: 'orange' },
        ].map((stat, index) => (
          <Card 
            key={stat.label}
            className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value.toLocaleString()}</p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10 group-hover:scale-110 transition-transform duration-300">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ação, recurso, usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background/50 border-border/50"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-36 bg-background/50 border-border/50">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo período</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mês</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-36 bg-background/50 border-border/50">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas ações</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>{action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterResource} onValueChange={setFilterResource}>
                <SelectTrigger className="w-36 bg-background/50 border-border/50">
                  <Database className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Recurso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos recursos</SelectItem>
                  {uniqueResources.map(resource => (
                    <SelectItem key={resource} value={resource}>{resource}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table Card */}
      <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Registro de Atividades</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {logs.length} de {totalCount} registros
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/40 border-b border-border/50">
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Data/Hora
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Usuário
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      Ação
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">Recurso</TableHead>
                  <TableHead className="font-semibold">ID</TableHead>
                  <TableHead className="font-semibold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log, index) => {
                  const ActionIcon = actionIcons[log.action] || Activity;
                  return (
                    <TableRow 
                      key={log.id}
                      className="group hover:bg-primary/5 border-b border-border/30 transition-all duration-200"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <TableCell className="text-muted-foreground whitespace-nowrap font-mono text-sm">
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary/50 group-hover:bg-primary group-hover:shadow-[0_0_8px_hsl(var(--primary))] transition-all duration-300" />
                          {formatDate(log.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="font-medium">{log.user_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={`${actionColors[log.action] || 'bg-muted border-border/50'} transition-all duration-200 group-hover:scale-105`}
                        >
                          <ActionIcon className="h-3 w-3 mr-1" />
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-md bg-muted/50 text-sm font-medium">
                          {log.resource_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {log.resource_id ? (
                          <code className="px-2 py-0.5 rounded bg-muted/50 font-mono text-xs">
                            {log.resource_id.slice(0, 8)}...
                          </code>
                        ) : (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 rounded-full bg-muted/30 border border-border/50">
                          <Activity className="h-8 w-8 opacity-50" />
                        </div>
                        <p className="text-lg font-medium">Nenhum log encontrado</p>
                        <p className="text-sm text-muted-foreground/70">Tente ajustar os filtros de busca</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
              <p className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="border-border/50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="border-border/50"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Detalhes do Log
            </DialogTitle>
            <DialogDescription>
              Informações completas do registro
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Data/Hora</p>
                  <p className="font-mono text-sm">{formatDate(selectedLog.created_at)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Usuário</p>
                  <p className="font-medium">{selectedLog.user_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Ação</p>
                  <Badge className={actionColors[selectedLog.action] || 'bg-muted'}>
                    {selectedLog.action}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Recurso</p>
                  <p className="font-medium">{selectedLog.resource_type}</p>
                </div>
              </div>

              {selectedLog.resource_id && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">ID do Recurso</p>
                  <code className="block p-2 rounded bg-muted/50 font-mono text-sm break-all">
                    {selectedLog.resource_id}
                  </code>
                </div>
              )}

              {selectedLog.ip_address && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Endereço IP</p>
                  <code className="block p-2 rounded bg-muted/50 font-mono text-sm">
                    {selectedLog.ip_address}
                  </code>
                </div>
              )}

              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Detalhes</p>
                  <ScrollArea className="h-48">
                    <pre className="p-3 rounded bg-muted/50 font-mono text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {selectedLog.user_agent && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">User Agent</p>
                  <p className="text-xs text-muted-foreground break-all p-2 rounded bg-muted/30">
                    {selectedLog.user_agent}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
