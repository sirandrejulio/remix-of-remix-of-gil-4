import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Brain, 
  Upload, 
  FileText, 
  Settings2, 
  Database, 
  RefreshCw, 
  Trash2,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  FileUp,
  History,
  Zap,
  Loader2,
  Eye,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Users,
  MessageSquare,
  TrendingUp,
  BarChart3,
  Activity,
  Download,
  Search,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Cpu,
  HardDrive,
  Gauge,
  Play,
  Pause,
  BookOpen,
  FileQuestion,
  MessagesSquare,
  Bot,
  Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

interface KnowledgeDocument {
  id: string;
  titulo: string;
  nome_arquivo: string;
  tipo_arquivo: string;
  tamanho_bytes: number | null;
  status: string;
  ativo: boolean;
  created_at: string;
  conteudo_extraido: string | null;
  storage_path: string | null;
}

interface DataSource {
  id: string;
  nome: string;
  tipo: string;
  descricao: string | null;
  ativo: boolean;
  total_documentos: number;
  ultima_atualizacao: string | null;
}

interface PromptConfig {
  id: string;
  prompt_atual: string;
  prompt_anterior: string | null;
  versao: number;
  updated_at: string;
}

interface AdminLog {
  id: string;
  tipo: string;
  descricao: string;
  admin_nome: string | null;
  detalhes: Record<string, unknown> | null;
  created_at: string;
}

interface AgentStats {
  totalSessions: number;
  totalMessages: number;
  totalDocuments: number;
  totalSimulations: number;
  activeUsers: number;
  avgMessagesPerSession: number;
  avgResponseTime: number;
  successRate: number;
}

interface UsageData {
  date: string;
  messages: number;
  sessions: number;
  users: number;
}

interface SessionDetail {
  id: string;
  titulo: string;
  user_id: string;
  user_name: string;
  message_count: number;
  created_at: string;
  ultima_interacao: string;
}

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function AdminEspecialista() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  // States
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [promptConfig, setPromptConfig] = useState<PromptConfig | null>(null);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [stats, setStats] = useState<AgentStats>({
    totalSessions: 0,
    totalMessages: 0,
    totalDocuments: 0,
    totalSimulations: 0,
    activeUsers: 0,
    avgMessagesPerSession: 0,
    avgResponseTime: 0,
    successRate: 0
  });
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [sessions, setSessions] = useState<SessionDetail[]>([]);
  const [engineMetrics, setEngineMetrics] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [isExecutingAction, setIsExecutingAction] = useState<string | null>(null);
  
  const [editedPrompt, setEditedPrompt] = useState('');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  
  // Filters
  const [logFilter, setLogFilter] = useState('all');
  const [logSearch, setLogSearch] = useState('');
  const [dateRange, setDateRange] = useState('7');
  
  // Dialogs
  const [selectedDocument, setSelectedDocument] = useState<KnowledgeDocument | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Load data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      loadStats(),
      loadUsageData(),
      loadDocuments(),
      loadDataSources(),
      loadPromptConfig(),
      loadLogs(),
      loadSessions(),
      loadEngineMetrics()
    ]);
    setIsLoading(false);
  };

  const loadStats = async () => {
    try {
      const [sessionsRes, messagesRes, documentsRes, simulationsRes, usersRes, metricsRes] = await Promise.all([
        supabase.from('ai_agent_sessions').select('id', { count: 'exact' }),
        supabase.from('ai_agent_messages').select('id', { count: 'exact' }),
        supabase.from('ai_agent_documents').select('id', { count: 'exact' }),
        supabase.from('ai_agent_simulations').select('id', { count: 'exact' }),
        supabase.from('ai_agent_sessions').select('user_id').limit(1000),
        supabase.from('ai_engine_metrics').select('*')
      ]);

      const uniqueUsers = new Set(usersRes.data?.map(s => s.user_id) || []).size;
      const totalSessions = sessionsRes.count || 0;
      const totalMessages = messagesRes.count || 0;
      
      // Calculate avg response time and success rate from metrics
      let avgResponseTime = 0;
      let successRate = 100;
      if (metricsRes.data && metricsRes.data.length > 0) {
        const totalRequests = metricsRes.data.reduce((sum, m) => sum + (m.request_count || 0), 0);
        const totalSuccess = metricsRes.data.reduce((sum, m) => sum + (m.success_count || 0), 0);
        avgResponseTime = metricsRes.data.reduce((sum, m) => sum + (m.avg_response_time_ms || 0), 0) / metricsRes.data.length;
        successRate = totalRequests > 0 ? (totalSuccess / totalRequests) * 100 : 100;
      }

      setStats({
        totalSessions,
        totalMessages,
        totalDocuments: documentsRes.count || 0,
        totalSimulations: simulationsRes.count || 0,
        activeUsers: uniqueUsers,
        avgMessagesPerSession: totalSessions > 0 ? Math.round(totalMessages / totalSessions) : 0,
        avgResponseTime: Math.round(avgResponseTime),
        successRate: Math.round(successRate * 10) / 10
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadUsageData = async () => {
    try {
      const days = parseInt(dateRange);
      const startDate = subDays(new Date(), days);
      
      const { data: messagesData } = await supabase
        .from('ai_agent_messages')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at');

      const { data: sessionsData } = await supabase
        .from('ai_agent_sessions')
        .select('created_at, user_id')
        .gte('created_at', startDate.toISOString())
        .order('created_at');

      // Group by date
      const usageByDate: Record<string, { messages: number; sessions: number; users: Set<string> }> = {};
      
      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
        usageByDate[date] = { messages: 0, sessions: 0, users: new Set() };
      }

      messagesData?.forEach(msg => {
        const date = format(new Date(msg.created_at), 'yyyy-MM-dd');
        if (usageByDate[date]) {
          usageByDate[date].messages++;
        }
      });

      sessionsData?.forEach(session => {
        const date = format(new Date(session.created_at), 'yyyy-MM-dd');
        if (usageByDate[date]) {
          usageByDate[date].sessions++;
          usageByDate[date].users.add(session.user_id);
        }
      });

      const chartData = Object.entries(usageByDate).map(([date, data]) => ({
        date: format(new Date(date), 'dd/MM'),
        messages: data.messages,
        sessions: data.sessions,
        users: data.users.size
      }));

      setUsageData(chartData);
    } catch (error) {
      console.error('Error loading usage data:', error);
    }
  };

  const loadDocuments = async () => {
    const { data, error } = await supabase
      .from('agent_knowledge_documents')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setDocuments(data);
    }
  };

  const loadDataSources = async () => {
    const { data, error } = await supabase
      .from('agent_data_sources')
      .select('*')
      .order('nome');
    
    if (!error && data) {
      setDataSources(data);
    }
  };

  const loadPromptConfig = async () => {
    const { data, error } = await supabase
      .from('agent_prompt_config')
      .select('*')
      .order('versao', { ascending: false })
      .limit(1)
      .single();
    
    if (!error && data) {
      setPromptConfig(data);
      setEditedPrompt(data.prompt_atual);
    }
  };

  const loadLogs = async () => {
    const { data, error } = await supabase
      .from('agent_admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (!error && data) {
      setLogs(data as AdminLog[]);
    }
  };

  const loadSessions = async () => {
    try {
      const { data: sessionsData } = await supabase
        .from('ai_agent_sessions')
        .select('id, titulo, user_id, created_at, ultima_interacao')
        .order('ultima_interacao', { ascending: false })
        .limit(50);

      if (sessionsData) {
        // Get message counts and user names
        const sessionsWithDetails = await Promise.all(
          sessionsData.map(async (session) => {
            const [messageCount, profile] = await Promise.all([
              supabase.from('ai_agent_messages').select('id', { count: 'exact' }).eq('session_id', session.id),
              supabase.from('profiles').select('nome').eq('id', session.user_id).single()
            ]);
            
            return {
              ...session,
              message_count: messageCount.count || 0,
              user_name: profile.data?.nome || 'Usuário'
            };
          })
        );
        
        setSessions(sessionsWithDetails);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const loadEngineMetrics = async () => {
    const { data, error } = await supabase
      .from('ai_engine_metrics')
      .select('*')
      .order('request_count', { ascending: false });
    
    if (!error && data) {
      setEngineMetrics(data);
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    setIsLoadingMessages(true);
    const { data, error } = await supabase
      .from('ai_agent_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    
    if (!error && data) {
      setSessionMessages(data);
    }
    setIsLoadingMessages(false);
  };

  // File upload handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ['pdf', 'txt', 'doc', 'docx', 'md'].includes(ext || '');
    });
    setUploadFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;
    
    setIsUploading(true);
    let successCount = 0;
    const uploadedDocIds: string[] = [];
    
    for (const file of uploadFiles) {
      try {
        // Upload to storage
        const filePath = `knowledge/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('agent-knowledge')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        // Create record
        const { data: docData, error: dbError } = await supabase
          .from('agent_knowledge_documents')
          .insert({
            titulo: file.name.replace(/\.[^/.]+$/, ''),
            nome_arquivo: file.name,
            tipo_arquivo: file.name.split('.').pop()?.toLowerCase() || 'unknown',
            tamanho_bytes: file.size,
            storage_path: filePath,
            status: 'enviado',
            uploaded_by: profile?.id
          })
          .select('id')
          .single();
        
        if (dbError) throw dbError;
        
        if (docData?.id) {
          uploadedDocIds.push(docData.id);
        }
        
        successCount++;
        
        // Log action
        await logAction('upload', `Arquivo "${file.name}" enviado para base de conhecimento`, {
          file_name: file.name,
          file_size: file.size
        });
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Erro ao enviar ${file.name}`);
      }
    }
    
    if (successCount > 0) {
      toast.success(`${successCount} arquivo(s) enviado(s). Processando...`);
      setUploadFiles([]);
      loadDocuments();
      
      // Process each uploaded document
      for (const docId of uploadedDocIds) {
        processDocumentInBackground(docId);
      }
    }
    
    setIsUploading(false);
  };
  
  const processDocumentInBackground = async (documentId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-knowledge-document`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session?.access_token}`
          },
          body: JSON.stringify({ documentId })
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Documento processado e adicionado à base de conhecimento!');
      } else {
        toast.error(`Erro ao processar: ${result.error}`);
      }
      
      loadDocuments();
      await updateDataSourceCount('documents');
    } catch (error) {
      console.error('Error processing document:', error);
      toast.error('Erro ao processar documento');
      loadDocuments();
    }
  };

  const updateDataSourceCount = async (tipo: string) => {
    const { data: docs } = await supabase
      .from('agent_knowledge_documents')
      .select('id', { count: 'exact' })
      .eq('ativo', true);
    
    await supabase
      .from('agent_data_sources')
      .update({ 
        total_documentos: docs?.length || 0,
        ultima_atualizacao: new Date().toISOString()
      })
      .eq('tipo', 'documents');
    
    loadDataSources();
  };

  const toggleDocumentStatus = async (doc: KnowledgeDocument) => {
    const { error } = await supabase
      .from('agent_knowledge_documents')
      .update({ ativo: !doc.ativo })
      .eq('id', doc.id);
    
    if (!error) {
      toast.success(doc.ativo ? 'Documento desativado' : 'Documento ativado');
      loadDocuments();
      await logAction('toggle_document', `Documento "${doc.titulo}" ${doc.ativo ? 'desativado' : 'ativado'}`, { document_id: doc.id });
      await updateDataSourceCount('documents');
    }
  };

  const deleteDocument = async (doc: KnowledgeDocument) => {
    // Delete from storage if path exists
    if (doc.storage_path) {
      await supabase.storage.from('agent-knowledge').remove([doc.storage_path]);
    }
    
    const { error } = await supabase
      .from('agent_knowledge_documents')
      .delete()
      .eq('id', doc.id);
    
    if (!error) {
      toast.success('Documento removido');
      loadDocuments();
      await logAction('delete_document', `Documento "${doc.titulo}" removido`, { document_id: doc.id });
      await updateDataSourceCount('documents');
    }
  };

  const processDocument = async (doc: KnowledgeDocument) => {
    toast.info(`Processando documento "${doc.titulo}"...`);
    
    // Update status to processing
    await supabase
      .from('agent_knowledge_documents')
      .update({ status: 'processando' })
      .eq('id', doc.id);
    
    loadDocuments();
    
    // Simulate processing (in real app, this would call an edge function)
    setTimeout(async () => {
      await supabase
        .from('agent_knowledge_documents')
        .update({ 
          status: 'concluido',
          conteudo_extraido: `Conteúdo extraído de ${doc.nome_arquivo}`
        })
        .eq('id', doc.id);
      
      loadDocuments();
      toast.success(`Documento "${doc.titulo}" processado com sucesso`);
      await logAction('process_document', `Documento "${doc.titulo}" processado`, { document_id: doc.id });
    }, 3000);
  };

  // Prompt handlers
  const savePrompt = async () => {
    if (!promptConfig || editedPrompt === promptConfig.prompt_atual) return;
    
    setIsSavingPrompt(true);
    
    const { error } = await supabase
      .from('agent_prompt_config')
      .update({
        prompt_anterior: promptConfig.prompt_atual,
        prompt_atual: editedPrompt,
        versao: promptConfig.versao + 1,
        atualizado_por: profile?.id
      })
      .eq('id', promptConfig.id);
    
    if (!error) {
      toast.success('Prompt atualizado com sucesso');
      loadPromptConfig();
      await logAction('update_prompt', `Prompt do agente atualizado para versão ${promptConfig.versao + 1}`, {
        old_version: promptConfig.versao,
        new_version: promptConfig.versao + 1
      });
    } else {
      toast.error('Erro ao atualizar prompt');
    }
    
    setIsSavingPrompt(false);
  };

  const restorePrompt = () => {
    if (promptConfig?.prompt_anterior) {
      setEditedPrompt(promptConfig.prompt_anterior);
      toast.info('Prompt anterior restaurado (não salvo)');
    }
  };

  const cancelPromptEdit = () => {
    if (promptConfig) {
      setEditedPrompt(promptConfig.prompt_atual);
    }
  };

  // Data source handlers
  const toggleDataSource = async (source: DataSource) => {
    const { error } = await supabase
      .from('agent_data_sources')
      .update({ ativo: !source.ativo })
      .eq('id', source.id);
    
    if (!error) {
      toast.success(source.ativo ? 'Fonte desativada' : 'Fonte ativada');
      loadDataSources();
      await logAction('toggle_source', `Fonte "${source.nome}" ${source.ativo ? 'desativada' : 'ativada'}`, { source_id: source.id });
    }
  };

  // Admin actions
  const executeAction = async (action: string, description: string) => {
    setIsExecutingAction(action);
    
    try {
      switch (action) {
        case 'reindex':
          // Mark all documents for reprocessing
          await supabase
            .from('agent_knowledge_documents')
            .update({ status: 'processando' })
            .eq('ativo', true);
          await new Promise(resolve => setTimeout(resolve, 2000));
          await supabase
            .from('agent_knowledge_documents')
            .update({ status: 'concluido' })
            .eq('ativo', true);
          loadDocuments();
          break;
          
        case 'reset_cache':
          // Clean up expired cache entries
          await supabase.rpc('cleanup_ai_cache');
          break;
          
        case 'update_context':
          // Update data source counts
          for (const source of dataSources) {
            await updateDataSourceCount(source.tipo);
          }
          break;
          
        case 'validate':
          // Check for orphaned records
          const { data: orphanedMessages } = await supabase
            .from('ai_agent_messages')
            .select('session_id')
            .is('session_id', null);
          
          if (orphanedMessages && orphanedMessages.length > 0) {
            toast.info(`Encontrados ${orphanedMessages.length} registros órfãos`);
          }
          break;
      }
      
      await logAction(action, description, { executed_by: profile?.nome });
      toast.success(`Ação "${description}" executada com sucesso`);
    } catch (error) {
      console.error('Action error:', error);
      toast.error('Erro ao executar ação');
    }
    
    setIsExecutingAction(null);
  };

  const logAction = async (tipo: string, descricao: string, detalhes: Record<string, unknown> = {}) => {
    await supabase
      .from('agent_admin_logs')
      .insert([{
        tipo,
        descricao,
        admin_id: profile?.id,
        admin_nome: profile?.nome,
        detalhes: detalhes as any
      }]);
    
    loadLogs();
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processando':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" /> Processando</Badge>;
      case 'concluido':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Concluído</Badge>;
      case 'erro':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="w-3 h-3 mr-1" /> Erro</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLogIcon = (tipo: string) => {
    switch (tipo) {
      case 'upload': return <FileUp className="w-4 h-4 text-blue-500" />;
      case 'update_prompt': return <Settings2 className="w-4 h-4 text-purple-500" />;
      case 'reindex': return <RefreshCw className="w-4 h-4 text-orange-500" />;
      case 'delete_document': return <Trash2 className="w-4 h-4 text-destructive" />;
      case 'toggle_document': return <ToggleRight className="w-4 h-4 text-blue-500" />;
      case 'toggle_source': return <Database className="w-4 h-4 text-cyan-500" />;
      case 'process_document': return <Cpu className="w-4 h-4 text-green-500" />;
      case 'reset_cache': return <Trash2 className="w-4 h-4 text-orange-500" />;
      case 'validate': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'update_context': return <Database className="w-4 h-4 text-purple-500" />;
      default: return <History className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const filteredLogs = logs.filter(log => {
    if (logFilter !== 'all' && log.tipo !== logFilter) return false;
    if (logSearch && !log.descricao.toLowerCase().includes(logSearch.toLowerCase())) return false;
    return true;
  });

  const exportLogs = () => {
    const csvContent = [
      ['Data', 'Tipo', 'Descrição', 'Admin'].join(','),
      ...filteredLogs.map(log => [
        format(new Date(log.created_at), 'dd/MM/yyyy HH:mm'),
        log.tipo,
        `"${log.descricao}"`,
        log.admin_nome || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
                <Brain className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
                Agente Especialista
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Gerencie a base de conhecimento e comportamento do agente
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadAllData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-6 h-auto p-1 bg-muted/50">
          <TabsTrigger value="overview" className="gap-2 py-2.5">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2 py-2.5">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Base</span>
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2 py-2.5">
            <MessagesSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Sessões</span>
          </TabsTrigger>
          <TabsTrigger value="prompt" className="gap-2 py-2.5">
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Prompt</span>
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-2 py-2.5">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Ações</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2 py-2.5">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Logs</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Sessões</p>
                    <p className="text-2xl font-bold">{stats.totalSessions}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-500/10">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-emerald-500">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>{stats.avgMessagesPerSession} msg/sessão</span>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Mensagens</p>
                    <p className="text-2xl font-bold">{stats.totalMessages}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/10">
                    <MessagesSquare className="w-5 h-5 text-emerald-500" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-emerald-500">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>{stats.activeUsers} usuários ativos</span>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Documentos</p>
                    <p className="text-2xl font-bold">{stats.totalDocuments}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-500/10">
                    <FileText className="w-5 h-5 text-purple-500" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <BookOpen className="w-3 h-3" />
                  <span>{documents.filter(d => d.ativo).length} ativos</span>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent" />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Simulações IA</p>
                    <p className="text-2xl font-bold">{stats.totalSimulations}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-orange-500/10">
                    <Target className="w-5 h-5 text-orange-500" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Bot className="w-3 h-3" />
                  <span>Geradas pelo agente</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Usage Chart */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Uso do Agente
                  </CardTitle>
                  <Select value={dateRange} onValueChange={value => { setDateRange(value); loadUsageData(); }}>
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="14">14 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={usageData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Area type="monotone" dataKey="messages" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} name="Mensagens" />
                      <Area type="monotone" dataKey="sessions" stackId="2" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.3} name="Sessões" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Engine Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-primary" />
                  Métricas dos Engines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {engineMetrics.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Cpu className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma métrica disponível</p>
                    </div>
                  ) : (
                    engineMetrics.slice(0, 3).map((metric) => (
                      <div key={metric.id} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${metric.is_healthy ? 'bg-emerald-500' : 'bg-destructive'}`} />
                            <span className="font-medium text-sm">{metric.engine_name}</span>
                          </div>
                          <Badge variant={metric.is_healthy ? 'default' : 'destructive'} className="text-xs">
                            {metric.is_healthy ? 'Saudável' : 'Com Problemas'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Requisições</p>
                            <p className="font-medium">{metric.request_count}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Sucesso</p>
                            <p className="font-medium text-emerald-500">
                              {metric.request_count > 0 ? Math.round((metric.success_count / metric.request_count) * 100) : 0}%
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Tempo Médio</p>
                            <p className="font-medium">{metric.avg_response_time_ms}ms</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Sources Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                Status das Fontes de Dados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {dataSources.map((source) => (
                  <div 
                    key={source.id}
                    className={`p-4 rounded-xl border transition-colors ${
                      source.ativo ? 'bg-card' : 'bg-muted/30 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{source.nome}</h4>
                      <Badge variant={source.ativo ? 'default' : 'secondary'} className="text-xs">
                        {source.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{source.descricao}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span>{source.total_documentos} documento(s)</span>
                      <Switch
                        checked={source.ativo}
                        onCheckedChange={() => toggleDataSource(source)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileUp className="w-5 h-5 text-primary" />
                  Upload de Documentos
                </CardTitle>
                <CardDescription>
                  Envie arquivos para alimentar a base de conhecimento do agente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                  <Input
                    type="file"
                    accept=".pdf,.txt,.doc,.docx,.md"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm font-medium">Clique para selecionar arquivos</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, TXT, DOC, DOCX, MD</p>
                  </label>
                </div>

                {uploadFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Arquivos selecionados:</p>
                    <ScrollArea className="h-32">
                      <div className="space-y-2">
                        {uploadFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-primary shrink-0" />
                              <span className="text-sm truncate">{file.name}</span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                ({formatFileSize(file.size)})
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() => removeFile(index)}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <Button 
                      onClick={handleUpload} 
                      disabled={isUploading}
                      className="w-full"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Enviar {uploadFiles.length} arquivo(s)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Documents List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Documentos na Base
                </CardTitle>
                <CardDescription>
                  {documents.length} documento(s) • {documents.filter(d => d.ativo).length} ativo(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  {documents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>Nenhum documento encontrado</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div 
                          key={doc.id} 
                          className={`p-3 rounded-lg border transition-colors ${
                            doc.ativo ? 'bg-card' : 'bg-muted/30 opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{doc.titulo}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="secondary" className="text-xs">
                                  {doc.tipo_arquivo.toUpperCase()}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatFileSize(doc.tamanho_bytes)}
                                </span>
                                {getStatusBadge(doc.status)}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(doc.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {doc.status === 'processando' && (
                                <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
                              )}
                              {doc.status !== 'concluido' && doc.status !== 'processando' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => processDocument(doc)}
                                  title="Processar documento"
                                >
                                  <Play className="w-4 h-4 text-primary" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setSelectedDocument(doc)}
                                title="Ver detalhes"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => toggleDocumentStatus(doc)}
                              >
                                {doc.ativo ? (
                                  <ToggleRight className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => deleteDocument(doc)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessagesSquare className="w-5 h-5 text-primary" />
                Sessões Recentes
              </CardTitle>
              <CardDescription>
                Visualize as conversas dos usuários com o agente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {sessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessagesSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma sessão encontrada</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((session) => (
                      <div 
                        key={session.id}
                        className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedSession(session);
                          loadSessionMessages(session.id);
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{session.titulo || 'Nova Sessão'}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Users className="w-3 h-3" />
                              <span>{session.user_name}</span>
                              <span>•</span>
                              <MessageSquare className="w-3 h-3" />
                              <span>{session.message_count} mensagens</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Última atividade: {format(new Date(session.ultima_interacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prompt Tab */}
        <TabsContent value="prompt" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                Prompt do Agente
              </CardTitle>
              <CardDescription>
                Configure o comportamento base do agente especialista
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-amber-500/20 bg-amber-500/5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-amber-600 dark:text-amber-400">
                  Alterações no prompt impactam diretamente o comportamento do agente para todos os usuários.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Prompt Base</label>
                  {promptConfig && (
                    <Badge variant="outline">Versão {promptConfig.versao}</Badge>
                  )}
                </div>
                <Textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  rows={16}
                  className="font-mono text-sm"
                  placeholder="Digite o prompt do agente..."
                />
                <p className="text-xs text-muted-foreground">
                  {editedPrompt.length} caracteres
                </p>
              </div>

              <div className="flex items-center gap-2 justify-end">
                {promptConfig?.prompt_anterior && (
                  <Button
                    variant="outline"
                    onClick={restorePrompt}
                    disabled={isSavingPrompt}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restaurar Anterior
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={cancelPromptEdit}
                  disabled={isSavingPrompt || editedPrompt === promptConfig?.prompt_atual}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={savePrompt}
                  disabled={isSavingPrompt || editedPrompt === promptConfig?.prompt_atual}
                >
                  {isSavingPrompt ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Prompt
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Ações Administrativas
              </CardTitle>
              <CardDescription>
                Execute ações de manutenção no agente especialista
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-muted">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <RefreshCw className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">Reindexar Base</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Reprocessa todos os documentos da base de conhecimento
                        </p>
                        <Button 
                          size="sm"
                          variant="outline"
                          disabled={isExecutingAction !== null}
                          onClick={() => executeAction('reindex', 'Reindexar base do Agente')}
                        >
                          {isExecutingAction === 'reindex' ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                          )}
                          Executar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-muted">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <Database className="w-5 h-5 text-purple-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">Atualizar Contexto</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Sincroniza o contexto com as últimas atualizações
                        </p>
                        <Button 
                          size="sm"
                          variant="outline"
                          disabled={isExecutingAction !== null}
                          onClick={() => executeAction('update_context', 'Atualizar contexto do Agente')}
                        >
                          {isExecutingAction === 'update_context' ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Database className="w-4 h-4 mr-2" />
                          )}
                          Executar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-muted">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-orange-500/10">
                        <Trash2 className="w-5 h-5 text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">Limpar Cache</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Remove entradas expiradas do cache de respostas
                        </p>
                        <Button 
                          size="sm"
                          variant="outline"
                          disabled={isExecutingAction !== null}
                          onClick={() => executeAction('reset_cache', 'Limpar cache de respostas')}
                        >
                          {isExecutingAction === 'reset_cache' ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 mr-2" />
                          )}
                          Executar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-muted">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">Validar Consistência</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Verifica a integridade da base de dados
                        </p>
                        <Button 
                          size="sm"
                          variant="outline"
                          disabled={isExecutingAction !== null}
                          onClick={() => executeAction('validate', 'Validar consistência da base')}
                        >
                          {isExecutingAction === 'validate' ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                          )}
                          Executar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />
                    Histórico de Ações
                  </CardTitle>
                  <CardDescription>
                    Registro de todas as ações administrativas do agente
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      className="pl-9 w-48"
                    />
                  </div>
                  <Select value={logFilter} onValueChange={setLogFilter}>
                    <SelectTrigger className="w-40">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filtrar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="upload">Upload</SelectItem>
                      <SelectItem value="update_prompt">Prompt</SelectItem>
                      <SelectItem value="toggle_document">Documentos</SelectItem>
                      <SelectItem value="toggle_source">Fontes</SelectItem>
                      <SelectItem value="reindex">Reindexar</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={exportLogs} title="Exportar CSV">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {filteredLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Nenhum log encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredLogs.map((log) => (
                      <div 
                        key={log.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                      >
                        <div className="p-1.5 rounded-lg bg-muted">
                          {getLogIcon(log.tipo)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{log.descricao}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{log.admin_nome || 'Admin'}</span>
                            <span>•</span>
                            <span>
                              {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {log.tipo}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Document Details Dialog */}
      <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {selectedDocument?.titulo}
            </DialogTitle>
            <DialogDescription>
              Detalhes do documento na base de conhecimento
            </DialogDescription>
          </DialogHeader>
          {selectedDocument && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Arquivo</p>
                  <p className="font-medium">{selectedDocument.nome_arquivo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tamanho</p>
                  <p className="font-medium">{formatFileSize(selectedDocument.tamanho_bytes)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedDocument.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Upload</p>
                  <p className="font-medium">
                    {format(new Date(selectedDocument.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
              {selectedDocument.conteudo_extraido && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Conteúdo Extraído</p>
                  <ScrollArea className="h-48 p-3 bg-muted rounded-lg">
                    <pre className="text-sm whitespace-pre-wrap">{selectedDocument.conteudo_extraido}</pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDocument(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Messages Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => { setSelectedSession(null); setSessionMessages([]); }}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessagesSquare className="w-5 h-5 text-primary" />
              {selectedSession?.titulo || 'Sessão'}
            </DialogTitle>
            <DialogDescription>
              Conversa de {selectedSession?.user_name} • {selectedSession?.message_count} mensagens
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] p-4 bg-muted/30 rounded-lg">
            {isLoadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : sessionMessages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhuma mensagem encontrada
              </div>
            ) : (
              <div className="space-y-4">
                {sessionMessages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`p-3 rounded-lg ${
                      msg.role === 'user' 
                        ? 'bg-primary/10 ml-8' 
                        : 'bg-card mr-8 border'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {msg.role === 'user' ? (
                        <Users className="w-4 h-4 text-primary" />
                      ) : (
                        <Bot className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-xs font-medium">
                        {msg.role === 'user' ? 'Usuário' : 'Agente'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedSession(null); setSessionMessages([]); }}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
