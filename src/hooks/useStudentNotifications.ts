import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface StudentNotification {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  severidade: 'info' | 'success' | 'warning' | 'error';
  lida: boolean;
  action_url: string | null;
  created_at: string;
  user_id: string;
}

export function useStudentNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const unreadCount = notifications.filter(n => !n.lida).length;

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.error('Error fetching student notifications:', error);
        setNotifications([]);
        return;
      }

      if (data) {
        setNotifications(data as StudentNotification[]);
      }
    } catch (error) {
      console.error('Error fetching student notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    if (!user) return;

    const channel = supabase
      .channel(`student-notifications-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificacoes',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const newNotif = payload.new as StudentNotification;
        setNotifications(prev => [newNotif, ...prev]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notificacoes',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => 
          prev.map(n => n.id === payload.new.id ? payload.new as StudentNotification : n)
        );
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'notificacoes',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => prev.filter(n => n.id !== (payload.old as StudentNotification).id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, lida: true } : n)
      );
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    const unreadIds = notifications.filter(n => !n.lida).map(n => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .in('id', unreadIds);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
    }
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase
      .from('notificacoes')
      .delete()
      .eq('id', id);

    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  const clearAllNotifications = async () => {
    if (!user) return;

    const idsToDelete = notifications.map(n => n.id);
    if (idsToDelete.length === 0) return;

    const { error } = await supabase
      .from('notificacoes')
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

// Serviço para criar notificações de alunos
export const StudentNotificationService = {
  async checkDuplicate(tipo: string, userId: string): Promise<boolean> {
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    
    const { data } = await supabase
      .from('notificacoes')
      .select('id')
      .eq('tipo', tipo)
      .eq('user_id', userId)
      .gte('created_at', oneDayAgo.toISOString())
      .limit(1);
    
    return (data && data.length > 0);
  },

  async notify(userId: string, payload: {
    tipo: string;
    titulo: string;
    mensagem: string;
    severidade?: 'info' | 'success' | 'warning' | 'error';
    action_url?: string;
  }, checkDupe = true) {
    if (checkDupe) {
      const isDuplicate = await this.checkDuplicate(payload.tipo, userId);
      if (isDuplicate) {
        console.log(`Notification ${payload.tipo} already exists for user ${userId}, skipping`);
        return true;
      }
    }

    const { error } = await supabase
      .from('notificacoes')
      .insert([{
        user_id: userId,
        tipo: payload.tipo,
        titulo: payload.titulo,
        mensagem: payload.mensagem,
        severidade: payload.severidade || 'info',
        action_url: payload.action_url || null,
      }]);

    if (error) {
      console.error('Error creating student notification:', error);
    }
    return !error;
  },

  async simuladoConcluido(userId: string, pontuacao: number, totalQuestoes: number) {
    const percentual = Math.round((pontuacao / totalQuestoes) * 100);
    return this.notify(userId, {
      tipo: `simulado_concluido_${Date.now()}`,
      titulo: '📝 Simulado Concluído!',
      mensagem: `Você acertou ${pontuacao} de ${totalQuestoes} questões (${percentual}%)`,
      severidade: percentual >= 70 ? 'success' : 'info',
      action_url: '/dashboard',
    }, false);
  },

  async metaAlcancada(userId: string, metaNome: string, xpGanho: number) {
    return this.notify(userId, {
      tipo: 'meta_alcancada',
      titulo: '🏆 Meta Alcançada!',
      mensagem: `Parabéns! Você completou a meta "${metaNome}" e ganhou ${xpGanho} XP!`,
      severidade: 'success',
      action_url: '/dashboard',
    });
  },

  async nivelSubiu(userId: string, novoNivel: number) {
    return this.notify(userId, {
      tipo: `nivel_subiu_${novoNivel}`,
      titulo: '⚡ Nível Aumentado!',
      mensagem: `Você subiu para o nível ${novoNivel}! Continue estudando!`,
      severidade: 'success',
      action_url: '/dashboard',
    });
  },

  async choqueParetoAtivado(userId: string) {
    return this.notify(userId, {
      tipo: 'choque_pareto',
      titulo: '⚠️ Choque de Pareto',
      mensagem: 'Foque nas disciplinas do Grupo 1 antes de avançar!',
      severidade: 'warning',
      action_url: '/dashboard',
    });
  },

  async conquistaDesbloqueada(userId: string, conquista: string) {
    return this.notify(userId, {
      tipo: `conquista_${conquista.toLowerCase().replace(/\s+/g, '_')}`,
      titulo: '🎖️ Nova Conquista!',
      mensagem: `Você desbloqueou: ${conquista}`,
      severidade: 'success',
      action_url: '/dashboard',
    });
  },
};
