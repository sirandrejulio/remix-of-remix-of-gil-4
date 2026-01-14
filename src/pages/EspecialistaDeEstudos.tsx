import { useEffect, useRef, useState } from 'react';
import { DottedSurface } from "@/components/ui/dotted-surface";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAIAgent } from '@/hooks/useAIAgent';
import { useIsMobile } from '@/hooks/use-mobile';
import { Header } from '@/components/layout/Header';
import { ChatMessage } from '@/components/especialista/ChatMessage';
import { ChatInput } from '@/components/especialista/ChatInput';
import { SessionsList } from '@/components/especialista/SessionsList';
import { DocumentsList } from '@/components/especialista/DocumentsList';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  GraduationCap,
  MessageSquare,
  FileText,
  Menu,
  X,
  Sparkles,
  BookOpen,
  FileEdit,
  Brain,
  Lightbulb,
  BarChart3,
  Zap,
  Activity,
  ChevronDown,
  Cpu,
  Wifi
} from 'lucide-react';
import { cn } from '@/lib/utils';
import especialistaAvatar from '@/assets/especialista-avatar.png';

const EspecialistaDeEstudos = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, isLoading: authLoading } = useAuth();
  const {
    messages,
    sessions,
    currentSession,
    documents,
    isLoading,
    fetchSessions,
    fetchDocuments,
    createSession,
    selectSession,
    sendMessage,
    deleteSession,
    uploadFiles,
    pinSession,
    renameSession
  } = useAIAgent();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('conversas');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchSessions();
      fetchDocuments();
    }
  }, [user, fetchSessions, fetchDocuments]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content: string, attachedFiles?: string[]) => {
    let messageContent = content;
    if (attachedFiles && attachedFiles.length > 0) {
      messageContent = `[Arquivos anexados: ${attachedFiles.join(', ')}]\n\n${content}`;
    }
    await sendMessage(messageContent);
  };

  const handleFileUpload = async (files: File[]) => {
    const uploadedNames = await uploadFiles(files);
    return uploadedNames;
  };

  const handleNewSession = async () => {
    const session = await createSession();
    if (session) {
      setSidebarOpen(false);
      setMobileMenuOpen(false);
    }
  };

  const handleCommand = (command: string) => {
    console.log('Command:', command);
  };

  const getSessionTitle = () => {
    if (!currentSession) return 'Novo Chat';
    return currentSession.titulo_customizado || currentSession.titulo;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-violet-500 flex items-center justify-center shadow-2xl shadow-primary/30 animate-pulse">
              <Cpu className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl animate-pulse" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
              <Wifi className="w-3 h-3 text-white animate-pulse" />
            </div>
          </div>
          <div className="text-center">
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
              Iniciando IA
            </span>
            <div className="flex items-center gap-1.5 justify-center mt-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile session selector component
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <span className="truncate text-sm font-medium">
              {getSessionTitle()}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </Button>
      </SheetTrigger>
      <SheetContent side="top" className="h-[70vh] p-0">
        <SheetHeader className="p-4 border-b border-border/50">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Conversas
          </SheetTitle>
        </SheetHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-[calc(100%-65px)] flex flex-col">
          <TabsList className="w-full rounded-none border-b border-border/50 bg-muted/30 p-1 mx-0">
            <TabsTrigger
              value="conversas"
              className={cn(
                "flex-1 gap-2 transition-all duration-300",
                "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                "data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25"
              )}
            >
              <MessageSquare className="w-4 h-4" />
              Conversas
            </TabsTrigger>
            <TabsTrigger
              value="documentos"
              className={cn(
                "flex-1 gap-2 transition-all duration-300",
                "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                "data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25"
              )}
            >
              <FileText className="w-4 h-4" />
              Documentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conversas" className="flex-1 m-0 overflow-hidden">
            <SessionsList
              sessions={sessions}
              currentSession={currentSession}
              onSelectSession={(session) => {
                selectSession(session);
                setMobileMenuOpen(false);
              }}
              onNewSession={handleNewSession}
              onDeleteSession={deleteSession}
              onPinSession={pinSession}
              onRenameSession={renameSession}
              isMobile={true}
            />
          </TabsContent>

          <TabsContent value="documentos" className="flex-1 m-0 overflow-hidden">
            <DocumentsList
              documents={documents}
              onDownload={() => { }}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );

  return (
    <>
      <DottedSurface />
      <div className="min-h-screen flex flex-col w-full relative">
        <Header />

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Background grid pattern */}
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
            <div className="absolute top-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-40 left-10 w-72 h-72 bg-violet-500/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/5 to-transparent rounded-full blur-3xl" />
          </div>

          {/* Mobile: Session selector at top */}
          {isMobile && (
            <div className="p-3 border-b border-white/10 bg-black/40 backdrop-blur-xl relative z-10">
              <MobileSessionSelector />
            </div>
          )}

          {/* Desktop: Sidebar toggle button */}
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "fixed bottom-4 left-4 z-50 lg:hidden",
                "h-12 w-12 rounded-xl shadow-xl",
                "bg-gradient-to-br from-primary to-primary/80",
                "hover:from-primary/90 hover:to-primary/70",
                "transition-all duration-300 hover:scale-105"
              )}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <X className="w-5 h-5 text-primary-foreground" />
              ) : (
                <Menu className="w-5 h-5 text-primary-foreground" />
              )}
            </Button>
          )}

          {/* Desktop Sidebar */}
          {!isMobile && (
            <>
              <aside
                className={cn(
                  'fixed lg:relative inset-y-0 left-0 z-40 w-80 border-r border-white/10',
                  'bg-black/60 backdrop-blur-xl transition-all duration-300 lg:translate-x-0',
                  sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
                )}
                style={{ top: '64px' }}
              >
                {/* Sidebar glow effect */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col relative">
                  <TabsList className="w-full rounded-none border-b border-white/10 bg-white/[0.02] backdrop-blur-sm p-1">
                    <TabsTrigger
                      value="conversas"
                      className={cn(
                        "flex-1 gap-2 transition-all duration-300",
                        "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                        "data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25"
                      )}
                    >
                      <MessageSquare className="w-4 h-4" />
                      Conversas
                    </TabsTrigger>
                    <TabsTrigger
                      value="documentos"
                      className={cn(
                        "flex-1 gap-2 transition-all duration-300",
                        "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                        "data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25"
                      )}
                    >
                      <FileText className="w-4 h-4" />
                      Documentos
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="conversas" className="flex-1 m-0">
                    <SessionsList
                      sessions={sessions}
                      currentSession={currentSession}
                      onSelectSession={(session) => {
                        selectSession(session);
                        setSidebarOpen(false);
                      }}
                      onNewSession={handleNewSession}
                      onDeleteSession={deleteSession}
                      onPinSession={pinSession}
                      onRenameSession={renameSession}
                    />
                  </TabsContent>

                  <TabsContent value="documentos" className="flex-1 m-0">
                    <DocumentsList
                      documents={documents}
                      onDownload={() => { }}
                    />
                  </TabsContent>
                </Tabs>
              </aside>

              {/* Mobile overlay for desktop sidebar */}
              {sidebarOpen && (
                <div
                  className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden animate-fade-in"
                  onClick={() => setSidebarOpen(false)}
                />
              )}
            </>
          )}

          {/* Main chat area */}
          <main className="flex-1 flex flex-col min-w-0 relative">
            {/* Header - Desktop only */}
            {!isMobile && (
              <div className="relative border-b border-white/10 p-4 flex items-center justify-between bg-black/40 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-primary/80 to-violet-500 flex items-center justify-center shadow-xl shadow-primary/25 transition-transform duration-300 group-hover:scale-105">
                      <GraduationCap className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {/* Animated ring */}
                    <div className="absolute inset-0 rounded-xl border-2 border-primary/30 animate-pulse" />
                  </div>
                  <div>
                    <h1 className="font-bold text-lg flex items-center gap-2">
                      <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                        Especialista de Estudos
                      </span>
                      <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                    </h1>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Cpu className="w-3 h-3" />
                      {getSessionTitle()}
                    </p>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                    <Activity className="w-3.5 h-3.5 text-primary animate-pulse" />
                    <span className="text-xs text-muted-foreground">IA Ativa</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-medium text-emerald-600">Online</span>
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 relative">
              <div className="p-4">
                {messages.length === 0 ? (
                  <div className="h-full min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
                    {/* Hero icon with enhanced glow */}
                    <div className="relative mb-8 animate-fade-in">
                      <div className="w-32 h-32 rounded-3xl flex items-center justify-center">
                        <img src={especialistaAvatar} alt="Especialista de Estudos" className="w-28 h-28 object-contain" />
                      </div>
                      <div className="absolute inset-0 rounded-3xl bg-primary/10 blur-2xl animate-pulse" />
                      <div className="absolute -top-3 -right-3 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg animate-bounce">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      {/* Orbiting elements */}
                      <div className="absolute -left-2 top-1/2 w-4 h-4 rounded-full bg-violet-500/50 animate-pulse" />
                      <div className="absolute -right-2 top-1/3 w-3 h-3 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: '500ms' }} />
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-bold mb-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
                      <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text">
                        Olá! Sou o Especialista
                      </span>
                    </h2>
                    <p className="text-muted-foreground max-w-md mb-10 animate-fade-in leading-relaxed" style={{ animationDelay: '150ms' }}>
                      Sua IA especializada em concursos bancários.
                      Pergunte qualquer coisa sobre seus estudos!
                    </p>

                    {/* Quick action buttons grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 max-w-4xl animate-fade-in" style={{ animationDelay: '250ms' }}>
                      <TooltipProvider>
                        {[
                          { icon: BookOpen, text: 'Criar plano de estudos', label: 'Plano', gradient: 'from-violet-500/10 to-violet-500/5', hoverGradient: 'hover:from-violet-500/20 hover:to-violet-500/10', iconColor: 'text-violet-500' },
                          { icon: FileEdit, text: 'Gerar resumo de conteúdo', label: 'Resumo', gradient: 'from-violet-500/10 to-violet-500/5', hoverGradient: 'hover:from-violet-500/20 hover:to-violet-500/10', iconColor: 'text-violet-500' },
                          { icon: Brain, text: 'Criar mapa mental', label: 'Mapa', gradient: 'from-violet-500/10 to-violet-500/5', hoverGradient: 'hover:from-violet-500/20 hover:to-violet-500/10', iconColor: 'text-violet-500' },
                          { icon: Lightbulb, text: 'Dicas de prova', label: 'Dicas', gradient: 'from-violet-500/10 to-violet-500/5', hoverGradient: 'hover:from-violet-500/20 hover:to-violet-500/10', iconColor: 'text-violet-500' },
                          { icon: BarChart3, text: 'Analisar meus erros', label: 'Analisar meus Erros', gradient: 'from-violet-500/10 to-violet-500/5', hoverGradient: 'hover:from-violet-500/20 hover:to-violet-500/10', iconColor: 'text-violet-500' },
                        ].map((item, i) => (
                          <Tooltip key={i}>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                className={cn(
                                  "h-auto py-4 px-3 flex-col gap-2 rounded-xl",
                                  "bg-gradient-to-br border border-violet-500/20",
                                  "hover:border-violet-500/30 hover:shadow-xl hover:shadow-violet-500/10",
                                  "transition-all duration-300 hover:scale-105 active:scale-95 bg-white/[0.02] backdrop-blur-xl",
                                  item.gradient,
                                  item.hoverGradient
                                )}
                                style={{ animationDelay: `${300 + i * 50}ms` }}
                                onClick={() => handleSendMessage(item.text)}
                              >
                                <div className={cn(
                                  "w-11 h-11 rounded-xl bg-background/80 flex items-center justify-center",
                                  "shadow-inner border border-border/30"
                                )}>
                                  <item.icon className={cn("w-5 h-5", item.iconColor)} />
                                </div>
                                <span className="text-xs font-semibold">{item.label}</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                              {item.text}
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </TooltipProvider>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-4xl mx-auto pb-4">
                    {messages.map((message, index) => (
                      <div
                        key={message.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <ChatMessage
                          role={message.role}
                          content={message.content}
                          timestamp={message.created_at}
                        />
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-4 p-5 rounded-2xl bg-gradient-to-br from-muted/60 to-muted/30 border border-border/50 mr-8 animate-fade-in shadow-lg backdrop-blur-sm">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                          <img src={especialistaAvatar} alt="Especialista" className="w-8 h-8 object-contain animate-pulse" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                            Especialista de Estudos
                            <Activity className="w-4 h-4 text-primary animate-pulse" />
                          </p>
                          <div className="flex gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-lg shadow-primary/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-lg shadow-primary/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-lg shadow-primary/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input with enhanced glow effect */}
            <div className="relative">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
              <div className="absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
              <ChatInput
                onSend={handleSendMessage}
                onCommand={handleCommand}
                onFileUpload={handleFileUpload}
                isLoading={isLoading}
              />
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default EspecialistaDeEstudos;