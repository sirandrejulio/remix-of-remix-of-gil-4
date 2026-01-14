import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Upload, Loader2, Sparkles, FileUp, Zap, ChevronLeft, ChevronRight, Check, RefreshCw, Files
} from 'lucide-react';

export interface ExtractedQuestionData {
  enunciado: string;
  alternativas: { a: string; b: string; c: string; d: string; e: string };
  resposta_correta: string;
  disciplina: string;
  tema: string;
  subtema?: string;
  nivel: 'facil' | 'medio' | 'dificil';
  banca?: string;
  ano_referencia?: number;
  explicacao?: string;
}

interface QuestionUploadFillProps {
  onQuestionExtracted: (question: ExtractedQuestionData) => void;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const ACCEPTED_EXTENSIONS = ['.pdf', '.txt', '.doc', '.docx'];

export function QuestionUploadFill({ onQuestionExtracted }: QuestionUploadFillProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestionData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const hasImageReference = (text: string): boolean => {
    const imagePatterns = [
      /\[imagem\]/i, /\[figura\]/i, /\[gráfico\]/i, /\[tabela\]/i,
      /\(ver figura\)/i, /\(ver imagem\)/i, /conforme a figura/i,
      /observe a imagem/i, /analise o gráfico/i, /de acordo com a figura/i,
      /na figura (abaixo|acima)/i, /figura \d+/i, /imagem \d+/i,
    ];
    return imagePatterns.some(pattern => pattern.test(text));
  };

  const isQuestionComplete = (q: any): boolean => {
    if (!q.enunciado || q.enunciado.length < 30) return false;
    if (!q.alternativas) return false;
    const alts = q.alternativas;
    if (!alts.a || !alts.b || !alts.c || !alts.d || !alts.e) return false;
    if (!q.resposta_correta || !['A', 'B', 'C', 'D', 'E'].includes(q.resposta_correta.toUpperCase())) return false;
    return true;
  };

  const extractQuestionsFromFile = async (file: File): Promise<ExtractedQuestionData[]> => {
    let extractedText = '';

    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      extractedText = await readFileAsText(file);
    } else {
      const base64 = await readFileAsBase64(file);
      
      const { data: parseData, error: parseError } = await supabase.functions.invoke('parse-document', {
        body: {
          fileData: base64,
          fileName: file.name,
          fileType: file.type || 'application/pdf'
        }
      });

      // Check for errors in both parseError and parseData.error
      const errorMsg = parseError?.message || parseData?.error || '';
      
      if (parseError || parseData?.error) {
        if (errorMsg.includes('CREDITS_EXHAUSTED') || errorMsg.includes('402') || errorMsg.includes('créditos') || errorMsg.includes('credits')) {
          throw new Error('Créditos insuficientes na API. Adicione créditos em Settings → Workspace → Usage.');
        }
        if (errorMsg.includes('RATE_LIMITED') || errorMsg.includes('429')) {
          throw new Error('Limite de requisições excedido. Aguarde alguns segundos e tente novamente.');
        }
        throw new Error(`Falha ao extrair texto de ${file.name}: ${errorMsg}`);
      }
      
      if (!parseData?.text) {
        throw new Error(`Não foi possível extrair texto de ${file.name}`);
      }
      extractedText = parseData.text;
    }

    if (!extractedText || extractedText.length < 100) {
      return [];
    }

    // Use extract-questions (FREE - no AI credits needed)
    const { data: extractData, error: extractError } = await supabase.functions.invoke('extract-questions', {
      body: {
        text: extractedText.substring(0, 100000),
        fileName: file.name
      }
    });

    if (extractError || !extractData?.success) {
      const errMsg = extractError?.message || extractData?.error || '';
      throw new Error(`Erro ao extrair questões de ${file.name}: ${errMsg}`);
    }

    const rawQuestions = extractData.questions || [];

    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      return [];
    }

    return rawQuestions
      .filter(q => {
        const enunciadoHasImage = hasImageReference(q.enunciado || '');
        return !enunciadoHasImage && q.enunciado && q.enunciado.length > 20;
      })
      .map(q => ({
        enunciado: q.enunciado || '',
        alternativas: {
          a: q.alternativa_a || '',
          b: q.alternativa_b || '',
          c: q.alternativa_c || '',
          d: q.alternativa_d || '',
          e: q.alternativa_e || ''
        },
        resposta_correta: (q.resposta_correta || '?').toUpperCase(),
        disciplina: q.disciplina || 'Conhecimentos Gerais',
        tema: q.tema || 'Geral',
        subtema: q.subtema || undefined,
        nivel: (['facil', 'medio', 'dificil'].includes(q.nivel) ? q.nivel : 'medio') as 'facil' | 'medio' | 'dificil',
        banca: q.banca || undefined,
        ano_referencia: q.ano_referencia || undefined,
        explicacao: q.explicacao || undefined
      }));
  };

  const processFiles = async (files: File[]) => {
    setIsProcessing(true);
    setProgress(0);
    setExtractedQuestions([]);
    setCurrentIndex(0);
    setTotalFiles(files.length);

    const allQuestions: ExtractedQuestionData[] = [];
    let processedFiles = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentFileIndex(i + 1);
        setStatusMessage(`Processando ${file.name} (${i + 1}/${files.length})...`);
        setProgress(Math.round((i / files.length) * 80));

        try {
          const questions = await extractQuestionsFromFile(file);
          allQuestions.push(...questions);
          processedFiles++;
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          toast.error(`Erro ao processar ${file.name}`);
        }
      }

      setProgress(100);

      if (allQuestions.length === 0) {
        throw new Error('Nenhuma questão válida encontrada nos arquivos');
      }

      setExtractedQuestions(allQuestions);
      setCurrentIndex(0);
      toast.success(`${allQuestions.length} questões extraídas de ${processedFiles} arquivo(s)!`);

    } catch (error) {
      console.error('Process error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao processar arquivos');
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setTotalFiles(0);
      setCurrentFileIndex(0);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(isValidFile);
    
    if (droppedFiles.length === 0) {
      toast.error('Nenhum arquivo válido. Use PDF, TXT, DOC ou DOCX.');
      return;
    }
    
    processFiles(droppedFiles);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files).filter(isValidFile) : [];
    
    if (selectedFiles.length === 0) {
      toast.error('Nenhum arquivo válido selecionado.');
      return;
    }
    
    processFiles(selectedFiles);
    e.target.value = '';
  };

  const isValidFile = (file: File): boolean => {
    if (ACCEPTED_TYPES.includes(file.type)) return true;
    return ACCEPTED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));
  };

  const handleSelectQuestion = (index: number) => {
    setCurrentIndex(index);
  };

  const handleUseQuestion = () => {
    if (extractedQuestions.length > 0 && currentIndex < extractedQuestions.length) {
      onQuestionExtracted(extractedQuestions[currentIndex]);
      toast.success('Campos preenchidos automaticamente!');
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < extractedQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const resetUpload = () => {
    setExtractedQuestions([]);
    setCurrentIndex(0);
  };

  // Processing state
  if (isProcessing) {
    return (
      <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse" />
              <div className="relative p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            </div>

            <div className="text-center">
              <h3 className="font-semibold text-foreground">Processando Arquivos</h3>
              <p className="text-sm text-muted-foreground mt-1">{statusMessage}</p>
              {totalFiles > 1 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Arquivo {currentFileIndex} de {totalFiles}
                </p>
              )}
            </div>

            <div className="w-full max-w-xs">
              <Progress value={progress} className="h-2" />
              <p className="text-center text-xs text-muted-foreground mt-1">{progress}%</p>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="h-3 w-3 text-amber-500" />
              <span>Extraindo questões (gratuito)...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Questions extracted - show list
  if (extractedQuestions.length > 0) {
    const currentQuestion = extractedQuestions[currentIndex];
    
    return (
      <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Check className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-base">{extractedQuestions.length} Questões Extraídas</CardTitle>
                <CardDescription className="text-xs">Selecione uma questão para preencher o formulário</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={resetUpload}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Novo Upload
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Question selector */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handlePrev} 
              disabled={currentIndex === 0}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <ScrollArea className="flex-1">
              <div className="flex gap-1 pb-2">
                {extractedQuestions.map((_, idx) => (
                  <Button
                    key={idx}
                    variant={idx === currentIndex ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSelectQuestion(idx)}
                    className="h-7 w-7 p-0 text-xs shrink-0"
                  >
                    {idx + 1}
                  </Button>
                ))}
              </div>
            </ScrollArea>

            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleNext} 
              disabled={currentIndex === extractedQuestions.length - 1}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Current question preview */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">{currentQuestion.disciplina}</Badge>
              <Badge variant="outline" className="text-xs">{currentQuestion.tema}</Badge>
              <Badge variant={currentQuestion.nivel === 'facil' ? 'secondary' : currentQuestion.nivel === 'dificil' ? 'destructive' : 'default'} className="text-xs">
                {currentQuestion.nivel}
              </Badge>
              {currentQuestion.banca && <Badge variant="outline" className="text-xs">{currentQuestion.banca}</Badge>}
            </div>
            
            <p className="text-sm text-foreground line-clamp-3">{currentQuestion.enunciado}</p>
            
            <div className="text-xs text-muted-foreground">
              Resposta: <span className="font-semibold text-emerald-500">{currentQuestion.resposta_correta}</span>
            </div>
          </div>

          {/* Use button */}
          <Button onClick={handleUseQuestion} className="w-full">
            <Check className="h-4 w-4 mr-2" />
            Usar Questão {currentIndex + 1} e Preencher Formulário
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Upload state
  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      <CardHeader className="relative pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <FileUp className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Preencher via Upload</CardTitle>
            <CardDescription className="text-xs">Importe documentos para extrair questões automaticamente</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative pt-2">
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 ${
            isDragging 
              ? 'border-primary bg-primary/5 scale-[1.01]' 
              : 'border-border/50 hover:border-primary/50 hover:bg-muted/30'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".pdf,.txt,.doc,.docx"
            multiple
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          <div className="flex flex-col items-center gap-2">
            <div className="p-2 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
              <Files className="h-5 w-5 text-primary" />
            </div>
            
            <div>
              <p className="text-sm font-medium text-foreground">
                Arraste ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Múltiplos arquivos: PDF, TXT, DOC, DOCX
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-1 mt-1">
              {ACCEPTED_EXTENSIONS.map(ext => (
                <Badge key={ext} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {ext.toUpperCase()}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 p-2 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-start gap-2">
            <Sparkles className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              Selecione múltiplos arquivos de uma vez. A IA extrai todas as questões válidas e você escolhe qual usar.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
