import { useEffect, useState, useRef } from 'react';
import { DottedSurface } from "@/components/ui/dotted-surface";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBancaAnalises, BancaAnalise } from '@/hooks/useBancaAnalises';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import especialistaAvatar from '@/assets/especialista-avatar.png';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

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

const CentralAprovacao = () => {
  const navigate = useNavigate();
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
    pinAnalise 
  } = useBancaAnalises();
  
  const [selectedBanca, setSelectedBanca] = useState<string>('');
  const [selectedAnalise, setSelectedAnalise] = useState<BancaAnalise | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleGenerateAnalise = async () => {
    if (!selectedBanca) return;
    
    if (uploadedFile) {
      // Parse document and generate analysis
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
      // Generate analysis without document
      const analise = await createAnalise(selectedBanca);
      if (analise) {
        setSelectedAnalise(analise);
      }
    }
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
    if (!selectedAnalise) return;
    
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      let yPosition = margin;
      
      // Header
      pdf.setFillColor(245, 158, 11); // amber-500
      pdf.rect(0, 0, pageWidth, 35, 'F');
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Central da Aprovação', margin, 22);
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Análise de Banca: ${selectedAnalise.banca}`, margin, 30);
      
      yPosition = 50;
      
      // Title
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text(selectedAnalise.titulo, margin, yPosition);
      yPosition += 10;
      
      // Date
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Gerado em: ${new Date(selectedAnalise.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, margin, yPosition);
      yPosition += 15;
      
      // Content - Process markdown to plain text
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(11);
      
      const content = selectedAnalise.conteudo
        .replace(/#{1,6}\s*/g, '') // Remove markdown headers
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markers
        .replace(/\*([^*]+)\*/g, '$1') // Remove italic markers
        .replace(/`([^`]+)`/g, '$1') // Remove code markers
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
        .replace(/^\s*[-*+]\s*/gm, '• ') // Convert list markers to bullets
        .replace(/^\s*\d+\.\s*/gm, (match) => match); // Keep numbered lists
      
      const lines = content.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) {
          yPosition += 5;
          continue;
        }
        
        // Check for headers (lines that were bold or are short titles)
        const isHeader = trimmedLine.length < 60 && 
          (trimmedLine.endsWith(':') || 
           /^\d+\./.test(trimmedLine) ||
           trimmedLine.startsWith('•'));
        
        if (isHeader && !trimmedLine.startsWith('•')) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(12);
          yPosition += 3;
        } else {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(11);
        }
        
        const splitText = pdf.splitTextToSize(trimmedLine, maxWidth);
        
        for (const textLine of splitText) {
          if (yPosition > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.text(textLine, margin, yPosition);
          yPosition += 6;
        }
      }
      
      // Footer on each page
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
      
      // Save
      const fileName = `analise-${selectedAnalise.banca.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
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
  };

  const handleDeleteAnalise = async (id: string) => {
    await deleteAnalise(id);
    if (selectedAnalise?.id === id) {
      setSelectedAnalise(null);
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
              Carregando Central
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
            <div className="absolute top-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-40 left-10 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/5 to-transparent rounded-full blur-3xl" />
          </div>

          {/* Sidebar - Lista de Análises */}
          <aside className="w-full lg:w-80 border-r border-white/10 bg-black/60 backdrop-blur-xl flex flex-col">
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

              {/* Nova Análise */}
              <div className="space-y-3">
                <Select value={selectedBanca} onValueChange={setSelectedBanca}>
                  <SelectTrigger className="bg-muted/30 border-border/50">
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

                {/* Upload de Documento */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    Anexar documento (opcional)
                  </Label>
                  <div className="relative">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    {uploadedFile ? (
                      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border border-border/50">
                        <FileText className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <span className="text-xs truncate flex-1">{uploadedFile.name}</span>
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
                        className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg border border-dashed border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
                      >
                        <FileUp className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">PDF, DOC, DOCX ou TXT</span>
                      </label>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleGenerateAnalise}
                  disabled={!selectedBanca || isGenerating || isUploading}
                  className="w-full gap-2"
                >
                  {isGenerating || isUploading ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      {isUploading ? 'Processando...' : 'Gerando Análise...'}
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      {uploadedFile ? 'Analisar Documento' : 'Nova Análise'}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Lista de Análises */}
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Activity className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : analises.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Nenhuma análise ainda</p>
                    <p className="text-xs mt-1">Selecione uma banca e gere sua primeira análise</p>
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

          {/* Área Principal - Conteúdo da Análise */}
          <main className="flex-1 flex flex-col min-w-0 relative">
            {/* Header */}
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
                {selectedAnalise && (
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

            {/* Conteúdo */}
            <ScrollArea className="flex-1 relative">
              <div className="p-4 lg:p-6" ref={contentRef}>
                {selectedAnalise ? (
                  <div className="max-w-4xl mx-auto">
                    <Card className="bg-gradient-to-br from-muted/60 to-muted/30 border-border/50 shadow-xl">
                      <CardHeader>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center">
                              <FileText className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{selectedAnalise.banca}</CardTitle>
                              <p className="text-xs text-muted-foreground">
                                Gerado em {formatDate(selectedAnalise.created_at)}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            className="gap-2 lg:hidden"
                          >
                            {isExporting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown>{selectedAnalise.conteudo}</ReactMarkdown>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="h-full min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
                    {/* Hero */}
                    <div className="relative mb-8 animate-fade-in">
                      <div className="w-32 h-32 rounded-3xl flex items-center justify-center">
                        <img src={especialistaAvatar} alt="Central da Aprovação" className="w-28 h-28 object-contain" />
                      </div>
                      <div className="absolute inset-0 rounded-3xl bg-amber-500/10 blur-2xl animate-pulse" />
                      <div className="absolute -top-3 -right-3 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg animate-bounce">
                        <Award className="w-5 h-5 text-white" />
                      </div>
                      <div className="absolute -left-2 top-1/2 w-4 h-4 rounded-full bg-amber-500/50 animate-pulse" />
                      <div className="absolute -right-2 top-1/3 w-3 h-3 rounded-full bg-orange-500/50 animate-pulse" style={{ animationDelay: '500ms' }} />
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-bold mb-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
                      <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text">
                        Central da Aprovação
                      </span>
                    </h2>
                    <p className="text-muted-foreground max-w-md mb-10 animate-fade-in leading-relaxed" style={{ animationDelay: '150ms' }}>
                      Análise completa de bancas com IA especializada.
                      Descubra padrões, estratégias e maximize sua aprovação!
                    </p>

                    {/* Features */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 max-w-4xl animate-fade-in" style={{ animationDelay: '250ms' }}>
                      {[
                        { icon: BarChart3, title: 'Análise de Padrões', desc: 'Identifique os temas mais cobrados' },
                        { icon: Target, title: 'Lei de Pareto', desc: '80% do resultado com 20% do esforço' },
                        { icon: Upload, title: 'Upload de Documentos', desc: 'Envie PDFs e DOCs para análise' },
                        { icon: Download, title: 'Exportar PDF', desc: 'Baixe suas análises para estudar offline' }
                      ].map((feature, i) => (
                        <Card key={i} className="bg-gradient-to-br from-muted/40 to-muted/20 border-border/30">
                          <CardContent className="p-4 text-center">
                            <feature.icon className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                            <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                            <p className="text-xs text-muted-foreground">{feature.desc}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <p className="text-sm text-muted-foreground mt-8 flex items-center gap-2">
                      <ChevronRight className="w-4 h-4" />
                      Selecione uma banca na lateral e gere sua análise
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </main>
        </div>
      </div>
    </>
  );
};

// Componente para card de análise na sidebar
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
          ? "bg-primary/10 border-primary/30"
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