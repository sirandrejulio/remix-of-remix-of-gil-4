import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Session {
  id: string;
  titulo: string;
  titulo_customizado?: string | null;
  fixada?: boolean;
  ultima_interacao: string;
  created_at: string;
}

interface AgentFile {
  id: string;
  nome_arquivo: string;
  tipo_arquivo: string;
  created_at: string;
}

interface AgentDocument {
  id: string;
  titulo: string;
  tipo: string;
  conteudo: string;
  created_at: string;
}

interface AIAgentResponse {
  success: boolean;
  response?: string;
  error?: string;
  action?: string;
}

export const useAIAgent = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [files, setFiles] = useState<AgentFile[]>([]);
  const [documents, setDocuments] = useState<AgentDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('ai_agent_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('ultima_interacao', { ascending: false });

    if (error) {
      console.error('Erro ao buscar sessões:', error);
      return;
    }

    setSessions(data || []);
  }, [user]);

  const fetchMessages = useCallback(async (sessionId: string) => {
    const { data, error } = await supabase
      .from('ai_agent_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar mensagens:', error);
      return;
    }

    setMessages((data || []).map(m => ({
      ...m,
      role: m.role as 'user' | 'assistant'
    })));
  }, []);

  const fetchFiles = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('ai_agent_files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar arquivos:', error);
      return;
    }

    setFiles(data || []);
  }, [user]);

  const fetchDocuments = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('ai_agent_documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar documentos:', error);
      return;
    }

    setDocuments(data || []);
  }, [user]);

  const createSession = useCallback(async (titulo?: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('ai_agent_sessions')
      .insert({
        user_id: user.id,
        titulo: titulo || 'Nova Conversa'
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar sessão:', error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar uma nova conversa",
        variant: "destructive"
      });
      return null;
    }

    setSessions(prev => [data, ...prev]);
    setCurrentSession(data);
    setMessages([]);
    return data;
  }, [user, toast]);

  const selectSession = useCallback(async (session: Session) => {
    setCurrentSession(session);
    await fetchMessages(session.id);
  }, [fetchMessages]);

  const pinSession = useCallback(async (sessionId: string, pinned: boolean) => {
    const { error } = await supabase
      .from('ai_agent_sessions')
      .update({ fixada: pinned })
      .eq('id', sessionId);

    if (error) {
      console.error('Erro ao fixar sessão:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a conversa",
        variant: "destructive"
      });
      return;
    }

    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, fixada: pinned } : s
    ));

    toast({
      title: pinned ? "Conversa fixada" : "Conversa desafixada",
      description: pinned 
        ? "A conversa aparecerá no topo da lista"
        : "A conversa voltou para a lista normal"
    });
  }, [toast]);

  const renameSession = useCallback(async (sessionId: string, newTitle: string) => {
    const { error } = await supabase
      .from('ai_agent_sessions')
      .update({ titulo_customizado: newTitle })
      .eq('id', sessionId);

    if (error) {
      console.error('Erro ao renomear sessão:', error);
      toast({
        title: "Erro",
        description: "Não foi possível renomear a conversa",
        variant: "destructive"
      });
      return;
    }

    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, titulo_customizado: newTitle } : s
    ));

    if (currentSession?.id === sessionId) {
      setCurrentSession(prev => prev ? { ...prev, titulo_customizado: newTitle } : null);
    }

    toast({
      title: "Conversa renomeada",
      description: "O nome da conversa foi atualizado"
    });
  }, [currentSession, toast]);

  const sendMessage = useCallback(async (content: string, action?: string, context?: Record<string, unknown>): Promise<AIAgentResponse | null> => {
    if (!user) return null;

    let session = currentSession;
    if (!session) {
      session = await createSession();
      if (!session) return null;
    }

    setIsLoading(true);

    // Add user message to UI immediately
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Save user message to database
      await supabase.from('ai_agent_messages').insert({
        session_id: session.id,
        role: 'user',
        content
      });

      // Get the current session token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('Usuário não autenticado');
      }

      // Call AI agent with explicit authorization header
      const fetchResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: content,
          sessionId: session.id,
          action,
          context
        })
      });

      if (!fetchResponse.ok) {
        const errorData = await fetchResponse.json();
        throw new Error(errorData.error || `Erro ${fetchResponse.status}`);
      }

      const responseData = await fetchResponse.json();

      if (responseData.error) throw new Error(responseData.error);

      if (responseData?.success && responseData?.response) {
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: responseData.response,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Save assistant message to database
        await supabase.from('ai_agent_messages').insert({
          session_id: session.id,
          role: 'assistant',
          content: responseData.response
        });

        // Update session last interaction
        await supabase
          .from('ai_agent_sessions')
          .update({ ultima_interacao: new Date().toISOString() })
          .eq('id', session.id);

        return responseData;
      } else {
        throw new Error(responseData?.error || 'Erro desconhecido');
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Não foi possível obter resposta do agente",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, currentSession, createSession, toast]);

  const generateDocument = useCallback(async (tipo: string, tema: string) => {
    if (!user || !currentSession) return null;

    const response = await sendMessage(
      `Gere um ${tipo} sobre: ${tema}`,
      'generate_document',
      { documentType: tipo, topic: tema }
    );

    if (response?.success && response?.response) {
      // Save document
      const { data, error } = await supabase
        .from('ai_agent_documents')
        .insert({
          user_id: user.id,
          session_id: currentSession.id,
          titulo: `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} - ${tema}`,
          tipo: tipo,
          conteudo: response.response
        })
        .select()
        .single();

      if (!error && data) {
        setDocuments(prev => [data, ...prev]);
        toast({
          title: "Documento gerado!",
          description: "O documento foi salvo e está disponível para download"
        });
        return data;
      }
    }

    return null;
  }, [user, currentSession, sendMessage, toast]);

  const deleteSession = useCallback(async (sessionId: string) => {
    const { error } = await supabase
      .from('ai_agent_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error('Erro ao deletar sessão:', error);
      toast({
        title: "Erro",
        description: "Não foi possível deletar a conversa",
        variant: "destructive"
      });
      return;
    }

    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSession?.id === sessionId) {
      setCurrentSession(null);
      setMessages([]);
    }

    toast({
      title: "Conversa deletada",
      description: "A conversa foi removida com sucesso"
    });
  }, [currentSession, toast]);

  const uploadFiles = useCallback(async (filesToUpload: File[]): Promise<string[]> => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para enviar arquivos",
        variant: "destructive"
      });
      return [];
    }

    // Create session if doesn't exist
    let session = currentSession;
    if (!session) {
      const newSession = await createSession();
      if (!newSession) {
        toast({
          title: "Erro",
          description: "Não foi possível criar uma conversa para anexar arquivos",
          variant: "destructive"
        });
        return [];
      }
      session = newSession;
    }

    const uploadedFileNames: string[] = [];

    for (const file of filesToUpload) {
      try {
        // Extract text for text files
        let extractedText: string | null = null;
        if (file.type === 'text/plain') {
          extractedText = await file.text();
        }

        // Save file record to database
        const { data, error } = await supabase
          .from('ai_agent_files')
          .insert({
            user_id: user.id,
            session_id: session.id,
            nome_arquivo: file.name,
            tipo_arquivo: file.type,
            tamanho_bytes: file.size,
            texto_extraido: extractedText,
            processado: true
          })
          .select()
          .single();

        if (error) throw error;

        uploadedFileNames.push(file.name);
        setFiles(prev => [data, ...prev]);
      } catch (err) {
        console.error('Erro ao fazer upload:', err);
        toast({
          title: "Erro no upload",
          description: `Não foi possível enviar ${file.name}`,
          variant: "destructive"
        });
      }
    }

    if (uploadedFileNames.length > 0) {
      toast({
        title: "Arquivos enviados",
        description: `${uploadedFileNames.length} arquivo(s) anexado(s) à conversa`
      });
    }

    return uploadedFileNames;
  }, [user, currentSession, createSession, toast]);

  return {
    messages,
    sessions,
    currentSession,
    files,
    documents,
    isLoading,
    fetchSessions,
    fetchMessages,
    fetchFiles,
    fetchDocuments,
    createSession,
    selectSession,
    sendMessage,
    generateDocument,
    deleteSession,
    uploadFiles,
    pinSession,
    renameSession
  };
};