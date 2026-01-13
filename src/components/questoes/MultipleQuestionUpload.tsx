import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { parseQuestions, hasStructuredQuestionFormat } from '@/lib/questionParser';
import {
  Upload, Loader2, Sparkles, FileUp, Zap, Check, RefreshCw, Files, CheckSquare, Square, Trash2
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

interface MultipleQuestionUploadProps {
  onQuestionsSelected: (questions: ExtractedQuestionData[]) => void;
  maxQuestions?: number;
}

const ACCEPTED_TYPES = [
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const ACCEPTED_EXTENSIONS = ['.txt', '.doc', '.docx'];

// Limite aumentado para não “sumir” questões na etapa de seleção.
const MAX_QUESTIONS = 500;

export function MultipleQuestionUpload({ onQuestionsSelected, maxQuestions = MAX_QUESTIONS }: MultipleQuestionUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestionData[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
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

  const extractQuestionsFromFile = async (file: File): Promise<ExtractedQuestionData[]> => {
    let extractedText = '';
    const isTxtFile = file.type === 'text/plain' || file.name.endsWith('.txt');

    if (isTxtFile) {
      extractedText = await readFileAsText(file);

      // Try local parsing first for TXT files with structured format
      if (hasStructuredQuestionFormat(extractedText)) {


        const parseResult = parseQuestions(extractedText);

        if (parseResult.success && parseResult.questions.length > 0) {
          console.log(`[MultipleQuestionUpload] Local parser extracted ${parseResult.questions.length} questions`);
          console.log(`[MultipleQuestionUpload] Stats: Padrão 1: ${parseResult.stats.padrao1}, Padrão 2: ${parseResult.stats.padrao2}`);

          // Convert parsed questions to ExtractedQuestionData format
          return parseResult.questions
            .filter(q => !hasImageReference(q.enunciado))
            .map(q => ({
              enunciado: q.enunciado,
              alternativas: {
                a: q.alternativa_a,
                b: q.alternativa_b,
                c: q.alternativa_c,
                d: q.alternativa_d,
                e: q.alternativa_e
              },
              resposta_correta: q.resposta_correta,
              disciplina: 'Conhecimentos Gerais',
              tema: q.tema,
              subtema: q.subtema,
              nivel: 'medio' as const,
              banca: q.banca,
              ano_referencia: q.ano_referencia,
              explicacao: undefined
            }));
        }

        // If local parser failed, log errors and fallback to edge function
        if (parseResult.errors.length > 0) {
          console.log(`[MultipleQuestionUpload] Local parser errors:`, parseResult.errors);
        }
      }
    } else {
      const base64 = await readFileAsBase64(file);

      const { data: parseData, error: parseError } = await supabase.functions.invoke('parse-document', {
        body: {
          fileData: base64,
          fileName: file.name,
          fileType: file.type || 'application/pdf'
        }
      });

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

    // Fallback to edge function for extraction
    console.log(`[MultipleQuestionUpload] Using edge function for ${file.name}`);

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
    setSelectedIndices(new Set());
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

      const limitedQuestions = allQuestions.slice(0, maxQuestions);

      if (allQuestions.length > maxQuestions) {
        toast.warning(`Apenas as primeiras ${maxQuestions} questões foram carregadas.`);
      }

      setExtractedQuestions(limitedQuestions);
      setSelectedIndices(new Set(limitedQuestions.map((_, i) => i)));
      toast.success(`${limitedQuestions.length} questões extraídas de ${processedFiles} arquivo(s)!`);

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
      toast.error('Nenhum arquivo válido. Use TXT, DOC ou DOCX.');
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

  const toggleQuestion = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
  };

  const selectAll = () => {
    setSelectedIndices(new Set(extractedQuestions.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedIndices(new Set());
  };

  const removeSelected = () => {
    const remaining = extractedQuestions.filter((_, i) => !selectedIndices.has(i));
    setExtractedQuestions(remaining);
    setSelectedIndices(new Set());
    if (remaining.length === 0) {
      toast.info('Todas as questões foram removidas.');
    }
  };

  const handleUseSelected = () => {
    console.log('extractedQuestions:', extractedQuestions.length);
    console.log('selectedIndices:', Array.from(selectedIndices));

    const selected = extractedQuestions.filter((_, i) => selectedIndices.has(i));
    console.log('selected after filter:', selected.length);

    if (selected.length === 0) {
      toast.error('Selecione pelo menos uma questão.');
      return;
    }

    // Call the callback first, then reset
    onQuestionsSelected(selected);

    // Reset state after callback
    setExtractedQuestions([]);
    setSelectedIndices(new Set());
  };

  const resetUpload = () => {
    setExtractedQuestions([]);
    setSelectedIndices(new Set());
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

  // Questions extracted - show list with checkboxes
  if (extractedQuestions.length > 0) {
    return (
      <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] max-h-[900px]">
        {/* Fixed Header */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shrink-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <Check className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-xl">
                    {extractedQuestions.length} Questões Extraídas
                  </CardTitle>
                  <CardDescription className="text-sm mt-1">
                    <span className="text-primary font-medium">{selectedIndices.size}</span> selecionada(s) de {extractedQuestions.length}
                  </CardDescription>
                </div>
              </div>
              <Button variant="outline" onClick={resetUpload} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Novo Upload
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-0 pb-4">
            {/* Actions bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button variant="outline" onClick={selectAll} className="gap-2">
                <CheckSquare className="h-4 w-4" />
                Selecionar Todas
              </Button>
              <Button variant="outline" onClick={deselectAll} className="gap-2">
                <Square className="h-4 w-4" />
                Desmarcar Todas
              </Button>
              {selectedIndices.size > 0 && (
                <Button variant="destructive" onClick={removeSelected} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Remover Selecionadas ({selectedIndices.size})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Scrollable Questions List */}
        <div className="flex-1 mt-4 overflow-hidden rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-4">
              {extractedQuestions.map((question, idx) => (
                <Card
                  key={idx}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${selectedIndices.has(idx)
                    ? 'ring-2 ring-primary bg-primary/5 border-primary/40'
                    : 'border-border/50 hover:border-primary/30 bg-card/80'
                    }`}
                  onClick={() => toggleQuestion(idx)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="pt-1">
                        <Checkbox
                          checked={selectedIndices.has(idx)}
                          onCheckedChange={() => toggleQuestion(idx)}
                          className="h-5 w-5"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-3">
                        {/* Header com badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="default" className="text-xs px-3 py-1">
                            Questão {idx + 1}
                          </Badge>
                          <Badge variant="outline" className="text-xs px-3 py-1">
                            {question.tema}
                          </Badge>
                          {question.subtema && (
                            <Badge variant="outline" className="text-xs px-3 py-1 bg-primary/5">
                              {question.subtema}
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-xs px-3 py-1 ${question.nivel === 'facil' ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5' :
                              question.nivel === 'dificil' ? 'text-red-500 border-red-500/30 bg-red-500/5' :
                                'text-amber-500 border-amber-500/30 bg-amber-500/5'
                              }`}
                          >
                            {question.nivel === 'facil' ? 'Fácil' : question.nivel === 'dificil' ? 'Difícil' : 'Médio'}
                          </Badge>
                          <Badge variant="outline" className="text-xs px-3 py-1 text-emerald-500 border-emerald-500/30 bg-emerald-500/5">
                            Resposta: {question.resposta_correta}
                          </Badge>
                        </div>

                        {/* Enunciado */}
                        <div className="bg-muted/30 rounded-lg p-4 border border-border/30">
                          <p className="text-sm text-foreground leading-relaxed line-clamp-4">
                            {question.enunciado}
                          </p>
                        </div>

                        {/* Preview das alternativas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div className={`p-2 rounded-md bg-muted/20 ${question.resposta_correta === 'A' ? 'ring-1 ring-emerald-500/50' : ''}`}>
                            <span className="font-semibold">A)</span> {question.alternativas.a.substring(0, 60)}...
                          </div>
                          <div className={`p-2 rounded-md bg-muted/20 ${question.resposta_correta === 'B' ? 'ring-1 ring-emerald-500/50' : ''}`}>
                            <span className="font-semibold">B)</span> {question.alternativas.b.substring(0, 60)}...
                          </div>
                          <div className={`p-2 rounded-md bg-muted/20 ${question.resposta_correta === 'C' ? 'ring-1 ring-emerald-500/50' : ''}`}>
                            <span className="font-semibold">C)</span> {question.alternativas.c.substring(0, 60)}...
                          </div>
                          <div className={`p-2 rounded-md bg-muted/20 ${question.resposta_correta === 'D' ? 'ring-1 ring-emerald-500/50' : ''}`}>
                            <span className="font-semibold">D)</span> {question.alternativas.d.substring(0, 60)}...
                          </div>
                          {question.alternativas.e && (
                            <div className={`p-2 rounded-md bg-muted/20 md:col-span-2 ${question.resposta_correta === 'E' ? 'ring-1 ring-emerald-500/50' : ''}`}>
                              <span className="font-semibold">E)</span> {question.alternativas.e.substring(0, 60)}...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Fixed Footer - Use Selected Button */}
        <div className="shrink-0 mt-4">
          <Button
            onClick={handleUseSelected}
            disabled={selectedIndices.size === 0}
            size="lg"
            className="w-full gap-3 h-14 text-lg font-semibold"
          >
            <Sparkles className="h-5 w-5" />
            Usar {selectedIndices.size} Questão(ões) Selecionada(s)
          </Button>
        </div>
      </div>
    );
  }

  // Upload state
  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <Files className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Upload de Questões</CardTitle>
            <CardDescription className="text-sm mt-1">
              Envie arquivos TXT, DOC ou DOCX com questões formatadas
            </CardDescription>
          </div>
        </div>

        {/* Warning about question limit */}
        <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-3">
            <Zap className="h-5 w-5" />
            Limite máximo: {maxQuestions} questões por upload
          </p>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div
          className={`relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300 ${isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border/50 hover:border-primary/30 hover:bg-muted/20'
            }`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
        >
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="relative">
              <div className={`absolute inset-0 rounded-full blur-xl transition-all duration-300 ${isDragging ? 'bg-primary/40' : 'bg-primary/20'
                }`} />
              <div className={`relative p-6 rounded-full border transition-all duration-300 ${isDragging
                ? 'bg-primary/20 border-primary/40 scale-110'
                : 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20'
                }`}>
                <FileUp className={`h-12 w-12 transition-all duration-300 ${isDragging ? 'text-primary scale-110' : 'text-primary/70'
                  }`} />
              </div>
            </div>

            <div>
              <p className="font-semibold text-lg text-foreground">
                {isDragging ? 'Solte os arquivos aqui' : 'Arraste e solte arquivos'}
              </p>
              <p className="text-muted-foreground mt-2">
                ou clique para selecionar do seu computador
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {ACCEPTED_EXTENSIONS.map((ext) => (
                <Badge key={ext} variant="secondary" className="text-sm px-4 py-2">
                  {ext.toUpperCase().replace('.', '')}
                </Badge>
              ))}
            </div>

            <input
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(',')}
              multiple
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground justify-center">
          <Zap className="h-4 w-4 text-amber-500" />
          <span>Extração gratuita via Regex • Máximo {maxQuestions} questões por upload</span>
        </div>
      </CardContent>
    </Card>
  );
}
