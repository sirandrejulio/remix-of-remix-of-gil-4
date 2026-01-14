import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, Users, Sparkles, Search, RefreshCw, 
  CheckCircle2, XCircle, Zap, Clock, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Components
import { UsersTable } from '@/components/admin/users/UsersTable';
import { UserRegistration } from '@/components/admin/users/UserRegistration';

interface UserWithRole {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  role: 'admin' | 'user';
  status: 'ativo' | 'pendente' | 'bloqueado';
  created_at: string;
}

// Stats Card Component
function StatsCard({ 
  label, 
  value, 
  icon: Icon, 
  gradient, 
  bgGlow,
  index 
}: { 
  label: string; 
  value: number; 
  icon: any; 
  gradient: string; 
  bgGlow: string;
  index: number;
}) {
  return (
    <Card 
      className={cn(
        "relative overflow-hidden border-border/30 bg-card/40 backdrop-blur-xl",
        "hover:border-border/50 transition-all duration-500 group",
        "animate-fade-in"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className={cn(
        "absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        bgGlow
      )} />
      
      <CardContent className="p-4 relative">
        <div className="flex items-center justify-between mb-3">
          <div className={cn("p-2 rounded-lg bg-gradient-to-br shadow-lg", gradient)}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div className="text-xs font-medium px-2 py-1 rounded-full bg-muted/50 text-muted-foreground">
            {label}
          </div>
        </div>
        <div className={cn("text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent", gradient)}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  
  // Filtros
  const [searchUsers, setSearchUsers] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // Stats
  const stats = useMemo(() => ({
    total: users.length,
    ativos: users.filter(u => u.status === 'ativo').length,
    pendentes: users.filter(u => u.status === 'pendente').length,
    bloqueados: users.filter(u => u.status === 'bloqueado').length,
  }), [users]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [profilesResult, rolesResult] = await Promise.all([
        supabase.from('profiles').select('id, nome, email, telefone, status, created_at').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id, role'),
      ]);

      const usersWithRoles: UserWithRole[] = (profilesResult.data || []).map((profile) => {
        const userRole = rolesResult.data?.find((r) => r.user_id === profile.id);
        return {
          ...profile,
          telefone: profile.telefone || null,
          role: (userRole?.role as 'admin' | 'user') || 'user',
          status: (profile.status as 'ativo' | 'pendente' | 'bloqueado') || 'ativo',
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtrar usuários
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = searchUsers === '' || 
        u.nome.toLowerCase().includes(searchUsers.toLowerCase()) ||
        u.email.toLowerCase().includes(searchUsers.toLowerCase());
      const matchesRole = filterRole === 'all' || u.role === filterRole;
      const matchesStatus = filterStatus === 'all' || u.status === filterStatus;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchUsers, filterRole, filterStatus]);

  // Alterar status do usuário
  const handleChangeUserStatus = async (userId: string, newStatus: 'ativo' | 'pendente' | 'bloqueado') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      toast.success(`Usuário ${newStatus === 'ativo' ? 'ativado' : newStatus === 'bloqueado' ? 'bloqueado' : 'marcado como pendente'}`);
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  // Alterar role do usuário
  const handleChangeUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success(`Perfil alterado para ${newRole === 'admin' ? 'Administrador' : 'Aluno'}`);
    } catch (error) {
      toast.error('Erro ao alterar perfil');
    }
  };

  // Excluir usuário
  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setUsers(users.filter(u => u.id !== userId));
      setSelectedUserIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      toast.success('Usuário excluído permanentemente');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Erro ao excluir usuário');
    }
  };

  // Excluir usuários em massa
  const handleBulkDelete = async () => {
    if (selectedUserIds.size === 0) return;

    try {
      const response = await supabase.functions.invoke('delete-user', {
        body: { userIds: Array.from(selectedUserIds) },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const deletedIds = response.data?.deleted || [];
      setUsers(users.filter(u => !deletedIds.includes(u.id)));
      setSelectedUserIds(new Set());
      toast.success(`${deletedIds.length} usuário(s) excluído(s) permanentemente`);
    } catch (error: any) {
      console.error('Error bulk deleting users:', error);
      toast.error(error.message || 'Erro ao excluir usuários');
    }
  };

  // Seleção
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(new Set(filteredUsers.filter(u => u.id !== user?.id).map(u => u.id)));
    } else {
      setSelectedUserIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  // Ações em massa
  const handleBulkStatusChange = async (newStatus: 'ativo' | 'bloqueado') => {
    if (selectedUserIds.size === 0) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .in('id', Array.from(selectedUserIds));

      if (error) throw error;

      setUsers(users.map(u => selectedUserIds.has(u.id) ? { ...u, status: newStatus } : u));
      setSelectedUserIds(new Set());
      toast.success(`${selectedUserIds.size} usuário(s) ${newStatus === 'ativo' ? 'ativado(s)' : 'bloqueado(s)'}`);
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/40 to-violet-500/40 rounded-full blur-2xl animate-pulse" />
          <div className="relative flex flex-col items-center gap-4">
            <div className="p-4 rounded-2xl bg-card/50 backdrop-blur-xl border border-border/30">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <p className="text-sm text-muted-foreground animate-pulse">Carregando...</p>
          </div>
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
                <Users className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
                Gestão de Usuários
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Gerenciamento de usuários e permissões
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={fetchData} 
              variant="outline" 
              size="sm"
              className="border-border/50 hover:bg-muted/50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <UserRegistration 
              onUserCreated={fetchData}
              currentUserId={user?.id}
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          label="Total" 
          value={stats.total} 
          icon={Users} 
          gradient="from-blue-500 to-cyan-500" 
          bgGlow="bg-blue-500/20"
          index={0}
        />
        <StatsCard 
          label="Ativos" 
          value={stats.ativos} 
          icon={CheckCircle2} 
          gradient="from-emerald-500 to-green-500" 
          bgGlow="bg-emerald-500/20"
          index={1}
        />
        <StatsCard 
          label="Pendentes" 
          value={stats.pendentes} 
          icon={Clock} 
          gradient="from-amber-500 to-yellow-500" 
          bgGlow="bg-amber-500/20"
          index={2}
        />
        <StatsCard 
          label="Bloqueados" 
          value={stats.bloqueados} 
          icon={XCircle} 
          gradient="from-red-500 to-rose-500" 
          bgGlow="bg-red-500/20"
          index={3}
        />
      </div>

      {/* Filtros */}
      <Card className="border-border/30 bg-card/40 backdrop-blur-xl overflow-hidden">
        <CardContent className="pt-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchUsers}
                onChange={(e) => setSearchUsers(e.target.value)}
                className="pl-10 bg-background/50 border-border/50 focus:border-primary/50"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full lg:w-36 bg-background/50 border-border/50">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="ativo">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      Ativos
                    </span>
                  </SelectItem>
                  <SelectItem value="pendente">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      Pendentes
                    </span>
                  </SelectItem>
                  <SelectItem value="bloqueado">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      Bloqueados
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-full lg:w-36 bg-background/50 border-border/50">
                  <SelectValue placeholder="Perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos perfis</SelectItem>
                  <SelectItem value="admin">Administradores</SelectItem>
                  <SelectItem value="user">Alunos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações em massa */}
      {selectedUserIds.size > 0 && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-violet-500/5 animate-fade-in overflow-hidden">
          <CardContent className="py-3 px-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="font-medium text-primary">
                {selectedUserIds.size} usuário(s) selecionado(s)
              </span>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => handleBulkStatusChange('ativo')}
                  className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/30"
                  variant="outline"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Ativar
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => handleBulkStatusChange('bloqueado')}
                  className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/30"
                  variant="outline"
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Bloquear
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleBulkDelete}
                  className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/30"
                  variant="outline"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Excluir
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setSelectedUserIds(new Set())}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de usuários */}
      <Card className="border-border/30 bg-card/40 backdrop-blur-xl overflow-hidden">
        <CardContent className="p-0">
          <UsersTable
            users={filteredUsers}
            selectedIds={selectedUserIds}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
            onChangeStatus={handleChangeUserStatus}
            onChangeRole={handleChangeUserRole}
            onDeleteUser={handleDeleteUser}
            currentUserId={user?.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
