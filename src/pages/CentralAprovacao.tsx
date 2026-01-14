import { useEffect, useState, useRef, useCallback } from 'react';
import { DottedSurface } from "@/components/ui/dotted-surface";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBancaAnalises, BancaAnalise } from '@/hooks/useBancaAnalises';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Award,
  BarChart3,
  Sparkles,
  Plus,
  Trash2,
  Pin,
  PinOff,
  MoreVertical,
  FileText,
  Target,
  TrendingUp,
  Cpu,
  Wifi,
  Activity,
  Zap,
  ChevronRight,
  ArrowLeft,
  Upload,
  Download,
  FileUp,
  X,
  Loader2,
  Send,
  Bot,
  User,
  Copy,
  Check,
  ChevronDown,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import especialistaAvatar from '@/assets/especialista-avatar.png';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { useIsMobile } from '@/hooks/use-mobile';

const BANCAS = [
  'CESGRANRIO',
  'FCC',
  'CESPE/CEBRASPE',
  'FGV',
  'VUNESP',
  'IBFC',
  'IADES',
  'Quadrix'
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const CentralAprovacao = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, isLoading: authLoading } = useAuth();
  const { 
    analises, 
    isLoading, 
    isGenerating, 
    isUploading,
    createAnalise, 
    createAnaliseFromDocument,
    parseDocument,
    deleteAnalise, 
    pinAnalise,
    fetchAnalises
  } = useBancaAnalises();
  
  const [selectedBanca, setSelectedBanca] = useState<string>('');
  const [selectedAnalise, setSelectedAnalise] = useState<BancaAnalise | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // When selecting an analysis, load it as the first message
  useEffect(() => {
    if (selectedAnalise) {
      setChatMessages([
        {
          id: 'analysis-' + selectedAnalise.id,
          role: 'assistant',
          content: selectedAnalise.conteudo,
          timestamp: new Date(selectedAnalise.created_at)
        }
      ]);
    } else {
      setChatMessages([]);
    }
  }, [selectedAnalise]);

  const handleGenerateAnalise = async () => {
    if (!selectedBanca) return;
    
    // Add user message
    const userMessage: ChatMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: uploadedFile 
        ? `Analise o documento "${uploadedFile.name}" para a banca ${selectedBanca}` 
        : `Gere uma análise completa da banca ${selectedBanca}`,
      timestamp: new Date()
    };
    setChatMessages([userMessage]);
    
    if (uploadedFile) {
      const documentText = await parseDocument(uploadedFile);
      if (documentText) {
        const analise = await createAnaliseFromDocument(selectedBanca, documentText, uploadedFile.name);
        if (analise) {
          setSelectedAnalise(analise);
          setUploadedFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      }
    } else {
      const analise = await createAnalise(selectedBanca);
      if (analise) {
        setSelectedAnalise(analise);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSendingMessage) return;
    
    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsSendingMessage(true);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      // Build context from previous messages
      const conversationContext = chatMessages.map(m => 
        `${m.role === 'user' ? 'Aluno' : 'Especialista'}: ${m.content}`
      ).join('\n\n');
      
      const response = await supabase.functions.invoke('ai-agent-chat', {
        body: {
          message: `Contexto da conversa anterior sobre análise de banca ${selectedAnalise?.banca || selectedBanca}:

${conversationContext}

Nova pergunta do aluno: ${userMsg.content}

Responda como um especialista em concursos bancários, focando na Lei de Pareto (80/20), estratégias práticas e conhecimento específico sobre a banca em questão. Seja detalhado mas objetivo.`,
          action: 'followup_analise_banca',
          context: { 
            banca: selectedAnalise?.banca || selectedBanca,
            analiseId: selectedAnalise?.id 
          }
        },
        headers: {
          Authorization: `Bearer ${sessionData?.session?.access_token}`
        }
      });

      if (response.error) throw response.error;

      const assistantContent = response.data?.response || response.data?.message || 'Desculpe, não consegui processar sua pergunta.';
      
      const assistantMsg: ChatMessage = {
        id: 'assistant-' + Date.now(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao processar sua pergunta. Tente novamente.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain'
      ];
      const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt'];
      
      const hasValidExtension = allowedExtensions.some(ext => 
        file.name.toLowerCase().endsWith(ext)
      );
      
      if (!allowedTypes.includes(file.type) && !hasValidExtension) {
        toast.error('Formato não suportado. Use PDF, DOC, DOCX ou TXT.');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 10MB.');
        return;
      }
      
      setUploadedFile(file);
      toast.success(`Arquivo "${file.name}" selecionado`);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportPDF = async () => {
    if (!selectedAnalise && chatMessages.length === 0) return;
    
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      let yPosition = margin;
      
      // Header
      pdf.setFillColor(245, 158, 11);
      pdf.rect(0, 0, pageWidth, 35, 'F');
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Central da Aprovação', margin, 22);
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Análise de Banca: ${selectedAnalise?.banca || selectedBanca}`, margin, 30);
      
      yPosition = 50;
      
      // Export all chat messages
      for (const msg of chatMessages) {
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = margin;
        }
        
        // Role header
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(msg.role === 'user' ? 59 : 139, msg.role === 'user' ? 130 : 92, msg.role === 'user' ? 246 : 246);
        pdf.text(msg.role === 'user' ? '👤 Você' : '🎓 Especialista', margin, yPosition);
        yPosition += 6;
        
        // Content
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        
        const content = msg.content
          .replace(/#{1,6}\s*/g, '')
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\*([^*]+)\*/g, '$1')
          .replace(/`([^`]+)`/g, '$1')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/^\s*[-*+]\s*/gm, '• ');
        
        const splitText = pdf.splitTextToSize(content, maxWidth);
        
        for (const line of splitText) {
          if (yPosition > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.text(line, margin, yPosition);
          yPosition += 5;
        }
        
        yPosition += 8;
      }
      
      // Footer
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Página ${i} de ${totalPages} | Central da Aprovação - Lei de Pareto aplicada`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
      
      const fileName = `analise-${(selectedAnalise?.banca || selectedBanca).toLowerCase().replace(/[^a-z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSelectAnalise = (analise: BancaAnalise) => {
    setSelectedAnalise(analise);
    setSelectedBanca(analise.banca);
    setMobileMenuOpen(false);
  };

  const handleNewAnalise = () => {
    setSelectedAnalise(null);
    setChatMessages([]);
    setSelectedBanca('');
  };

  const handleDeleteAnalise = async (id: string) => {
    await deleteAnalise(id);
    if (selectedAnalise?.id === id) {
      setSelectedAnalise(null);
      setChatMessages([]);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center shadow-2xl shadow-amber-500/30 animate-pulse">
              <Award className="w-10 h-10 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-amber-500/30 blur-xl animate-pulse" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
              <Wifi className="w-3 h-3 text-white animate-pulse" />
            </div>
          </div>
          <div className="text-center">
            <span className="text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              Carregando Central
            </span>
            <div className="flex items-center gap-1.5 justify-center mt-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile session selector
  const MobileSessionSelector = () => (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-between gap-2 h-12 px-4",
            "bg-gradient-to-r from-muted/50 to-muted/30",
            "border border-border/50 rounded-xl",
            "hover:from-muted hover:to-muted/50"
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center flex-shrink-0">
              <Award className="w-4 h-4 text-amber-500" />
            </div>
            <span className="truncate text-sm font-medium">
              {selectedAnalise?.titulo || 'Nova Análise'}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </Button>
      </SheetTrigger>
      <SheetContent side="top" className="h-[70vh] p-0">
        <SheetHeader className="p-4 border-b border-border/50">
          <SheetTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Análises de Banca
          </SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <Button onClick={handleNewAnalise} className="w-full gap-2 mb-4">
            <Plus className="w-4 h-4" />
            Nova Análise
          </Button>
          <ScrollArea className="h-[calc(70vh-140px)]">
            <div className="space-y-2">
              {analises.map((analise) => (
                <AnaliseCard
                  key={analise.id}
                  analise={analise}
                  isSelected={selectedAnalise?.id === analise.id}
                  onSelect={handleSelectAnalise}
                  onDelete={handleDeleteAnalise}
                  onPin={pinAnalise}
                  formatDate={formatDate}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <>
      <DottedSurface />
      <div className="min-h-screen flex flex-col w-full relative">
        <Header />

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Background effects */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.02]"
              style={{
                backgroundImage: `
                linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
              `,
                backgroundSize: '40px 40px'
              }}
            />
            <div className="absolute top-20 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
            <div className="absolute bottom-40 left-10 w-72 h-72 bg-orange-500/5 rounded-full blur-3xl" />
          </div>

          {/* Mobile selector */}
          {isMobile && (
            <div className="p-3 border-b border-white/10 bg-black/40 backdrop-blur-xl relative z-10">
              <MobileSessionSelector />
            </div>
          )}

          {/* Desktop Sidebar */}
          {!isMobile && (
            <aside className="w-80 border-r border-white/10 bg-black/60 backdrop-blur-xl flex flex-col">
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/dashboard')}
                    className="h-9 w-9"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <h2 className="font-bold text-lg flex items-center gap-2">
                      Central da Aprovação
                      <Award className="w-5 h-5 text-amber-500" />
                    </h2>
                    <p className="text-xs text-muted-foreground">Análise de Bancas</p>
                  </div>
                </div>

                <Button onClick={handleNewAnalise} className="w-full gap-2 mb-3">
                  <Plus className="w-4 h-4" />
                  Nova Análise
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Activity className="w-6 h-6 animate-spin text-amber-500" />
                    </div>
                  ) : analises.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Nenhuma análise ainda</p>
                      <p className="text-xs mt-1">Gere sua primeira análise</p>
                    </div>
                  ) : (
                    <>
                      {analises.filter(a => a.fixada).length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-muted-foreground px-2 mb-2 flex items-center gap-1">
                            <Pin className="w-3 h-3" />
                            Fixadas
                          </p>
                          {analises.filter(a => a.fixada).map((analise) => (
                            <AnaliseCard
                              key={analise.id}
                              analise={analise}
                              isSelected={selectedAnalise?.id === analise.id}
                              onSelect={handleSelectAnalise}
                              onDelete={handleDeleteAnalise}
                              onPin={pinAnalise}
                              formatDate={formatDate}
                            />
                          ))}
                        </div>
                      )}
                      
                      {analises.filter(a => !a.fixada).length > 0 && (
                        <div>
                          {analises.filter(a => a.fixada).length > 0 && (
                            <p className="text-xs text-muted-foreground px-2 mb-2">Recentes</p>
                          )}
                          {analises.filter(a => !a.fixada).map((analise) => (
                            <AnaliseCard
                              key={analise.id}
                              analise={analise}
                              isSelected={selectedAnalise?.id === analise.id}
                              onSelect={handleSelectAnalise}
                              onDelete={handleDeleteAnalise}
                              onPin={pinAnalise}
                              formatDate={formatDate}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </aside>
          )}

          {/* Main Chat Area */}
          <main className="flex-1 flex flex-col min-w-0 relative">
            {/* Header */}
            {!isMobile && (
              <div className="relative border-b border-white/10 p-4 flex items-center justify-between bg-black/40 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center shadow-xl shadow-amber-500/25 transition-transform duration-300 group-hover:scale-105">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute inset-0 rounded-xl bg-amber-500/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute inset-0 rounded-xl border-2 border-amber-500/30 animate-pulse" />
                  </div>
                  <div>
                    <h1 className="font-bold text-lg flex items-center gap-2">
                      <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                        {selectedAnalise ? selectedAnalise.titulo : 'Central da Aprovação'}
                      </span>
                      <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                    </h1>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Target className="w-3 h-3" />
                      {selectedAnalise ? `Banca: ${selectedAnalise.banca}` : 'Análise de Bancas com IA'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {chatMessages.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportPDF}
                      disabled={isExporting}
                      className="gap-2"
                    >
                      {isExporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">Exportar PDF</span>
                    </Button>
                  )}
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs text-muted-foreground">Lei de Pareto</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-medium text-emerald-600">IA Ativa</span>
                  </div>
                </div>
              </div>
            )}

            {/* Messages Area */}
            <ScrollArea className="flex-1 relative">
              <div className="p-4">
                {chatMessages.length === 0 && !selectedAnalise ? (
                  // Empty state - New Analysis Form
                  <div className="h-full min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
                    <div className="relative mb-8 animate-fade-in">
                      <div className="w-32 h-32 rounded-3xl flex items-center justify-center">
                        <img src={especialistaAvatar} alt="Central da Aprovação" className="w-28 h-28 object-contain" />
                      </div>
                      <div className="absolute inset-0 rounded-3xl bg-amber-500/10 blur-2xl animate-pulse" />
                      <div className="absolute -top-3 -right-3 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg animate-bounce">
                        <Award className="w-5 h-5 text-white" />
                      </div>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                      <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text">
                        Central da Aprovação
                      </span>
                    </h2>
                    <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
                      Análise completa de bancas com IA especializada.
                      Descubra padrões, estratégias e maximize sua aprovação!
                    </p>

                    {/* New Analysis Form */}
                    <div className="w-full max-w-md space-y-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
                      <Select value={selectedBanca} onValueChange={setSelectedBanca}>
                        <SelectTrigger className="bg-muted/30 border-border/50 h-12">
                          <SelectValue placeholder="Selecione a banca" />
                        </SelectTrigger>
                        <SelectContent>
                          {BANCAS.map((banca) => (
                            <SelectItem key={banca} value={banca}>
                              {banca}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Upload */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Upload className="w-3 h-3" />
                          Anexar documento (opcional)
                        </Label>
                        <Input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={handleFileChange}
                          className="hidden"
                          id="file-upload"
                        />
                        {uploadedFile ? (
                          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                            <FileText className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <span className="text-sm truncate flex-1">{uploadedFile.name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={handleRemoveFile}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <label
                            htmlFor="file-upload"
                            className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg border border-dashed border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
                          >
                            <FileUp className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">PDF, DOC, DOCX ou TXT</span>
                          </label>
                        )}
                      </div>

                      <Button
                        onClick={handleGenerateAnalise}
                        disabled={!selectedBanca || isGenerating || isUploading}
                        className="w-full gap-2 h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                      >
                        {isGenerating || isUploading ? (
                          <>
                            <Activity className="w-4 h-4 animate-spin" />
                            {isUploading ? 'Processando...' : 'Gerando Análise...'}
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4" />
                            {uploadedFile ? 'Analisar Documento' : 'Gerar Análise'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Chat Messages
                  <div className="space-y-4 max-w-4xl mx-auto pb-4">
                    {chatMessages.map((message, index) => (
                      <ChatMessageComponent
                        key={message.id}
                        role={message.role}
                        content={message.content}
                        timestamp={message.timestamp}
                        index={index}
                      />
                    ))}
                    {(isGenerating || isSendingMessage) && (
                      <div className="flex gap-4 p-5 rounded-2xl bg-gradient-to-br from-muted/60 to-muted/30 border border-border/50 mr-8 animate-fade-in shadow-lg backdrop-blur-sm">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                          <img src={especialistaAvatar} alt="Especialista" className="w-8 h-8 object-contain animate-pulse" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                            Central da Aprovação
                            <Activity className="w-4 h-4 text-amber-500 animate-pulse" />
                          </p>
                          <div className="flex gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-lg shadow-amber-500/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-lg shadow-amber-500/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-lg shadow-amber-500/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Chat Input - Only show when in conversation */}
            {(chatMessages.length > 0 || selectedAnalise) && (
              <div className="relative">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                <div className="absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                <div className="border-t border-border/50 bg-background/90 backdrop-blur-xl p-3 sm:p-4">
                  <div className="flex items-end gap-2 max-w-4xl mx-auto">
                    <div className="flex-1 relative">
                      <Textarea
                        ref={textareaRef}
                        value={inputMessage}
                        onChange={handleTextareaChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Faça uma pergunta sobre a análise..."
                        className={cn(
                          "min-h-[44px] max-h-[150px] resize-none text-sm py-3 pr-4",
                          "rounded-xl border-border/50 bg-muted/30",
                          "focus:border-amber-500/50 focus:ring-amber-500/20",
                          "placeholder:text-muted-foreground/50",
                          "transition-all duration-200"
                        )}
                        disabled={isGenerating || isSendingMessage}
                        rows={1}
                      />
                    </div>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={handleSendMessage}
                            disabled={!inputMessage.trim() || isSendingMessage || isGenerating}
                            size="icon"
                            className={cn(
                              "flex-shrink-0 h-11 w-11 rounded-xl",
                              "bg-gradient-to-br from-amber-500 to-orange-500",
                              "hover:from-amber-600 hover:to-orange-600",
                              "shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30",
                              "transition-all duration-200 hover:scale-105 active:scale-95",
                              "disabled:opacity-50 disabled:shadow-none disabled:scale-100"
                            )}
                          >
                            {isSendingMessage ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Enviar (Enter)
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <p className="text-[10px] text-muted-foreground/50 mt-2 text-center">
                    Enter enviar • Shift+Enter nova linha
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
};

// Chat Message Component
interface ChatMessageComponentProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  index: number;
}

const ChatMessageComponent = ({ role, content, timestamp, index }: ChatMessageComponentProps) => {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'group flex gap-3 p-4 rounded-2xl transition-all duration-200 animate-fade-in',
        isUser 
          ? 'bg-gradient-to-br from-amber-500/15 to-orange-500/5 ml-4 sm:ml-12 border border-amber-500/20' 
          : 'bg-gradient-to-br from-muted/80 to-muted/40 mr-4 sm:mr-12 border border-border/50 backdrop-blur-sm'
      )}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div
        className={cn(
          'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-105',
          isUser 
            ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-amber-500/20' 
            : 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-500 shadow-amber-500/10'
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Award className="w-4 h-4" />}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-semibold text-sm",
              isUser ? "text-amber-500" : "text-foreground"
            )}>
              {isUser ? 'Você' : '🏆 Central da Aprovação'}
            </span>
            <span className="text-xs text-muted-foreground/60">
              {timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          
          {!isUser && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {copied ? 'Copiado!' : 'Copiar resposta'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="mb-0.5">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-amber-500">{children}</strong>,
              code: ({ children }) => (
                <code className="bg-muted/80 px-1.5 py-0.5 rounded-md text-sm font-mono border border-border/50">{children}</code>
              ),
              pre: ({ children }) => (
                <pre className="bg-muted/80 p-4 rounded-xl overflow-x-auto my-3 border border-border/50 text-sm">{children}</pre>
              ),
              h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2 text-foreground">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2 text-foreground">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1 text-foreground">{children}</h3>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-amber-500/50 pl-4 italic text-muted-foreground my-2">{children}</blockquote>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

// Analysis Card Component
interface AnaliseCardProps {
  analise: BancaAnalise;
  isSelected: boolean;
  onSelect: (analise: BancaAnalise) => void;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  formatDate: (date: string) => string;
}

const AnaliseCard = ({ analise, isSelected, onSelect, onDelete, onPin, formatDate }: AnaliseCardProps) => {
  return (
    <div
      className={cn(
        "group p-3 rounded-xl cursor-pointer transition-all duration-200 mb-2",
        "border border-transparent",
        isSelected
          ? "bg-amber-500/10 border-amber-500/30"
          : "hover:bg-muted/50 hover:border-border/50"
      )}
      onClick={() => onSelect(analise)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {analise.fixada && <Pin className="w-3 h-3 text-amber-500 flex-shrink-0" />}
            <span className="font-medium text-sm truncate">{analise.banca}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {analise.resumo || 'Análise de banca'}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {formatDate(analise.created_at)}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border-white/10">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onPin(analise.id, !analise.fixada);
              }}
            >
              {analise.fixada ? (
                <>
                  <PinOff className="w-4 h-4 mr-2" />
                  Desafixar
                </>
              ) : (
                <>
                  <Pin className="w-4 h-4 mr-2" />
                  Fixar
                </>
              )}
            </DropdownMenuItem>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-black/90 backdrop-blur-xl border-white/10">
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir análise?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. A análise será permanentemente removida.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(analise.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default CentralAprovacao;