import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  action_url: string | null;
  created_at: string;
  user_id: string | null;
}

export function useAdminNotifications() {
  const { user, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!user || !isAdmin) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.error('Error fetching admin notifications:', error);
        setNotifications([]);
        return;
      }

      if (data) {
        setNotifications(data as AdminNotification[]);
      }
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    fetchNotifications();

    if (!user || !isAdmin) return;

    const channel = supabase
      .channel('admin-notifications-channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'admin_notifications',
      }, (payload) => {
        const newNotif = payload.new as AdminNotification;
        setNotifications(prev => [newNotif, ...prev]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'admin_notifications',
      }, (payload) => {
        setNotifications(prev => 
          prev.map(n => n.id === payload.new.id ? payload.new as AdminNotification : n)
        );
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'admin_notifications',
      }, (payload) => {
        setNotifications(prev => prev.filter(n => n.id !== (payload.old as AdminNotification).id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin, fetchNotifications]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('admin_notifications')
      .update({ read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from('admin_notifications')
      .update({ read: true })
      .in('id', unreadIds);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase
      .from('admin_notifications')
      .delete()
      .eq('id', id);

    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  const clearAllNotifications = async () => {
    const idsToDelete = notifications.map(n => n.id);
    if (idsToDelete.length === 0) return;

    const { error } = await supabase
      .from('admin_notifications')
      .delete()
      .in('id', idsToDelete);

    if (!error) {
      setNotifications([]);
    }
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    refetch: fetchNotifications,
  };
}

// Serviço para criar notificações de admin
export const AdminNotificationService = {
  async notify(payload: {
    type: string;
    title: string;
    message: string;
    severity?: 'info' | 'success' | 'warning' | 'error';
    action_url?: string;
  }) {
    const { error } = await supabase
      .from('admin_notifications')
      .insert([{
        type: payload.type,
        title: payload.title,
        message: payload.message,
        severity: payload.severity || 'info',
        action_url: payload.action_url || null,
      }]);

    if (error) {
      console.error('Error creating admin notification:', error);
    }
    return !error;
  },

  async erroSistema(detalhe: string) {
    return this.notify({
      type: 'erro_sistema',
      title: '🚨 Erro no Sistema',
      message: detalhe,
      severity: 'error',
    });
  },

  async novoUsuario(nome: string, email: string) {
    return this.notify({
      type: 'novo_usuario',
      title: '👤 Novo Usuário',
      message: `${nome} (${email}) se cadastrou no sistema`,
      severity: 'info',
      action_url: '/admin/usuarios',
    });
  },
};
