import { useState } from 'react';
import { Bell, CheckCheck, Info, AlertTriangle, AlertCircle, CheckCircle2, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAdminNotifications, AdminNotification } from '@/hooks/useAdminNotifications';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const severityConfig = {
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  success: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  error: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
};

export function AdminNotificationsSheet() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    clearAllNotifications,
  } = useAdminNotifications();

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-BR');
  };

  const handleNotificationClick = (notification: AdminNotification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.action_url) {
      setIsOpen(false);
      navigate(notification.action_url);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-9 w-9 rounded-lg hover:bg-muted/80 transition-colors"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold animate-pulse"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-96 p-0">
        <SheetHeader className="p-4 border-b border-border/50 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-base">Notificações Admin</SheetTitle>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="h-5 text-[10px]">
                  {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllAsRead}
                  className="text-xs h-7 px-2"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Marcar lidas
                </Button>
              )}
              {notifications.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={clearAllNotifications}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  title="Limpar todas"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Bell className="h-8 w-8 opacity-50" />
              </div>
              <p className="text-sm font-medium">Nenhuma notificação</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Tudo tranquilo por aqui!</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {notifications.map((notification) => {
                const config = severityConfig[notification.severity] || severityConfig.info;
                const Icon = config.icon;
                
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 relative cursor-pointer hover:bg-muted/50 transition-all duration-200 group",
                      !notification.read && "bg-primary/5"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                        config.bg
                      )}>
                        <Icon className={cn("h-5 w-5", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-sm line-clamp-1",
                            !notification.read ? "font-semibold" : "font-medium"
                          )}>
                            {notification.title}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    {!notification.read && (
                      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
