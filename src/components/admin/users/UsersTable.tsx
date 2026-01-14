import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  CheckCircle2, Clock, XCircle, Shield, MoreVertical, 
  UserCheck, UserX, Trash2, Edit3, Loader2, AlertTriangle, Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserWithRole {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  role: 'admin' | 'user';
  status: 'ativo' | 'pendente' | 'bloqueado';
  created_at: string;
}

interface UsersTableProps {
  users: UserWithRole[];
  selectedIds: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onChangeStatus: (userId: string, status: 'ativo' | 'pendente' | 'bloqueado') => void;
  onChangeRole: (userId: string, role: 'admin' | 'user') => void;
  onDeleteUser: (userId: string) => Promise<void>;
  currentUserId?: string;
}

const roleConfig = {
  admin: { 
    label: 'Admin', 
    className: 'bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-purple-400 border-purple-500/30',
    icon: Shield 
  },
  user: { 
    label: 'Aluno', 
    className: 'bg-muted/50 text-muted-foreground border-border/50',
    icon: null 
  },
};

const statusConfig = {
  ativo: { 
    label: 'Ativo', 
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    icon: CheckCircle2,
    dotColor: 'bg-emerald-500'
  },
  pendente: { 
    label: 'Pendente', 
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    icon: Clock,
    dotColor: 'bg-amber-500'
  },
  bloqueado: { 
    label: 'Bloqueado', 
    className: 'bg-red-500/10 text-red-400 border-red-500/30',
    icon: XCircle,
    dotColor: 'bg-red-500'
  },
};

function getInitials(nome: string) {
  return nome
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function UsersTable({ 
  users, 
  selectedIds, 
  onSelectAll, 
  onSelectOne, 
  onChangeStatus, 
  onChangeRole,
  onDeleteUser,
  currentUserId 
}: UsersTableProps) {
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const isAllSelected = users.length > 0 && users.every(u => selectedIds.has(u.id));

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    
    setIsDeleting(true);
    try {
      await onDeleteUser(userToDelete.id);
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
    }
  };

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-muted/20 mb-4">
          <UserX className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum usuário encontrado</h3>
        <p className="text-sm text-muted-foreground">Ajuste os filtros ou convide novos usuários</p>
      </div>
    );
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border border-border/30">
        {/* Glass effect header */}
        <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-muted/20 to-transparent pointer-events-none" />
        
        <Table>
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableHead className="w-12">
                <Checkbox 
                  checked={isAllSelected}
                  onCheckedChange={onSelectAll}
                  className="border-border/50"
                />
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold">Usuário</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Telefone</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Perfil</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Cadastro</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user, index) => {
              const status = statusConfig[user.status];
              const role = roleConfig[user.role];
              const StatusIcon = status.icon;
              const isCurrentUser = user.id === currentUserId;
              
              return (
                <TableRow 
                  key={user.id} 
                  className={cn(
                    "border-border/20 transition-all duration-300",
                    "hover:bg-muted/30",
                    selectedIds.has(user.id) && "bg-primary/5",
                    "animate-fade-in"
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <TableCell>
                    <Checkbox 
                      checked={selectedIds.has(user.id)}
                      onCheckedChange={(checked) => onSelectOne(user.id, !!checked)}
                      disabled={isCurrentUser}
                      className="border-border/50"
                    />
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10 border-2 border-border/30">
                          <AvatarFallback className={cn(
                            "text-sm font-semibold",
                            user.role === 'admin' 
                              ? "bg-gradient-to-br from-purple-500/20 to-violet-500/20 text-purple-400"
                              : "bg-gradient-to-br from-primary/10 to-primary/5 text-primary"
                          )}>
                            {getInitials(user.nome)}
                          </AvatarFallback>
                        </Avatar>
                        {/* Online indicator */}
                        <div className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                          status.dotColor
                        )} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate flex items-center gap-2">
                          {user.nome}
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                              Você
                            </Badge>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {user.telefone ? (
                      <a 
                        href={`https://wa.me/55${user.telefone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {user.telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">Não informado</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild disabled={isCurrentUser}>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={cn(
                            "h-auto p-0 hover:bg-transparent",
                            isCurrentUser && "cursor-not-allowed opacity-70"
                          )}
                        >
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "gap-1.5 transition-all cursor-pointer hover:opacity-80",
                              status.className
                            )}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Alterar Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onChangeStatus(user.id, 'ativo')}>
                          <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                          Ativar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onChangeStatus(user.id, 'pendente')}>
                          <Clock className="h-4 w-4 mr-2 text-amber-500" />
                          Pendente
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onChangeStatus(user.id, 'bloqueado')}>
                          <XCircle className="h-4 w-4 mr-2 text-red-500" />
                          Bloquear
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild disabled={isCurrentUser}>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={cn(
                            "h-auto p-0 hover:bg-transparent",
                            isCurrentUser && "cursor-not-allowed opacity-70"
                          )}
                        >
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "gap-1.5 transition-all cursor-pointer hover:opacity-80",
                              role.className
                            )}
                          >
                            {role.icon && <role.icon className="h-3 w-3" />}
                            {role.label}
                          </Badge>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Alterar Perfil</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onChangeRole(user.id, 'user')}>
                          👨‍🎓 Aluno
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onChangeRole(user.id, 'admin')}>
                          🛡️ Administrador
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(user.created_at), "dd MMM yyyy", { locale: ptBR })}
                  </TableCell>
                  
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/50">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          className="gap-2"
                          disabled={isCurrentUser}
                          onClick={() => onChangeStatus(user.id, user.status === 'ativo' ? 'bloqueado' : 'ativo')}
                        >
                          {user.status === 'ativo' ? (
                            <>
                              <UserX className="h-4 w-4 text-amber-500" />
                              Bloquear
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 text-emerald-500" />
                              Ativar
                            </>
                          )}
                        </DropdownMenuItem>
                        {!isCurrentUser && (
                          <DropdownMenuItem 
                            className="gap-2 text-destructive focus:text-destructive"
                            onClick={() => setUserToDelete(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir Permanentemente
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent className="border-destructive/30 bg-card/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Excluir Usuário Permanentemente
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a excluir permanentemente o usuário:
              </p>
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="font-semibold text-foreground">{userToDelete?.nome}</p>
                <p className="text-sm text-muted-foreground">{userToDelete?.email}</p>
              </div>
              <p className="text-destructive font-medium">
                Esta ação é irreversível! Todos os dados do usuário serão excluídos.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Permanentemente
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
