import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { MessageSquare, Plus, Trash2, Pin, PinOff, Pencil, Check, X, Sparkles } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

interface Session {
  id: string;
  titulo: string;
  titulo_customizado?: string | null;
  fixada?: boolean;
  ultima_interacao: string;
  created_at: string;
}

interface SessionsListProps {
  sessions: Session[];
  currentSession: Session | null;
  onSelectSession: (session: Session) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onPinSession?: (sessionId: string, pinned: boolean) => void;
  onRenameSession?: (sessionId: string, newTitle: string) => void;
  isMobile?: boolean;
}

export const SessionsList = ({
  sessions,
  currentSession,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onPinSession,
  onRenameSession,
  isMobile = false
}: SessionsListProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Hoje';
    if (days === 1) return 'Ontem';
    if (days < 7) return `${days} dias atrás`;
    return d.toLocaleDateString('pt-BR');
  };

  const getDisplayTitle = (session: Session) => {
    return session.titulo_customizado || session.titulo;
  };

  const handleStartEdit = (session: Session) => {
    setEditingId(session.id);
    setEditTitle(getDisplayTitle(session));
  };

  const handleSaveEdit = (sessionId: string) => {
    if (editTitle.trim() && onRenameSession) {
      onRenameSession(sessionId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  // Sort sessions: pinned first, then by last interaction
  const sortedSessions = [...sessions].sort((a, b) => {
    if (a.fixada && !b.fixada) return -1;
    if (!a.fixada && b.fixada) return 1;
    return new Date(b.ultima_interacao).getTime() - new Date(a.ultima_interacao).getTime();
  });

  const pinnedSessions = sortedSessions.filter(s => s.fixada);
  const unpinnedSessions = sortedSessions.filter(s => !s.fixada);

  const renderSession = (session: Session) => (
    <div
      key={session.id}
      className={cn(
        'group relative flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all duration-200',
        currentSession?.id === session.id
          ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30 shadow-lg shadow-primary/10'
          : 'hover:bg-muted/80 border border-transparent hover:border-border/50',
        session.fixada && 'bg-amber-500/5 border-amber-500/20'
      )}
      onClick={() => editingId !== session.id && onSelectSession(session)}
    >
      {/* Pin indicator */}
      {session.fixada && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
          <Pin className="w-2.5 h-2.5 text-white" />
        </div>
      )}

      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
        currentSession?.id === session.id
          ? "bg-primary/20"
          : "bg-muted"
      )}>
        <MessageSquare className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        {editingId === session.id ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="h-7 text-sm py-0"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit(session.id);
                if (e.key === 'Escape') handleCancelEdit();
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleSaveEdit(session.id)}
            >
              <Check className="w-3 h-3 text-emerald-500" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleCancelEdit}
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium truncate">
              {getDisplayTitle(session)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(session.ultima_interacao)}
            </p>
          </>
        )}
      </div>

      {editingId !== session.id && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity",
                isMobile && "opacity-100"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleStartEdit(session);
              }}
              className="gap-2 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              Renomear
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onPinSession?.(session.id, !session.fixada);
              }}
              className="gap-2 cursor-pointer"
            >
              {session.fixada ? (
                <>
                  <PinOff className="w-3.5 h-3.5" />
                  Desafixar
                </>
              ) : (
                <>
                  <Pin className="w-3.5 h-3.5" />
                  Fixar
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deletar conversa?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Todo o histórico desta conversa será perdido.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDeleteSession(session.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Deletar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className={cn("p-3", isMobile ? "pb-2" : "border-b border-border/50")}>
        <Button 
          onClick={onNewSession} 
          className={cn(
            "w-full gap-2 bg-gradient-to-r from-primary to-primary/80",
            "hover:from-primary/90 hover:to-primary/70",
            "shadow-lg shadow-primary/20 transition-all duration-300",
            "hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02]"
          )}
        >
          <Plus className="w-4 h-4" />
          Nova Conversa
          <Sparkles className="w-3 h-3 ml-auto opacity-60" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sessions.length === 0 ? (
            <div className="text-center py-8 px-4">
              <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Nenhuma conversa ainda
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Inicie uma nova conversa para começar
              </p>
            </div>
          ) : (
            <>
              {/* Pinned sessions */}
              {pinnedSessions.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-amber-600">
                    <Pin className="w-3 h-3" />
                    Fixadas ({pinnedSessions.length})
                  </div>
                  <div className="space-y-1">
                    {pinnedSessions.map(renderSession)}
                  </div>
                </div>
              )}

              {/* Unpinned sessions */}
              {unpinnedSessions.length > 0 && (
                <div>
                  {pinnedSessions.length > 0 && (
                    <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground mt-2">
                      <MessageSquare className="w-3 h-3" />
                      Recentes
                    </div>
                  )}
                  <div className="space-y-1">
                    {unpinnedSessions.map(renderSession)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};