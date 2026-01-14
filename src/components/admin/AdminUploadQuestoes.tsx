import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  FileUp, Loader2, AlertCircle, CheckCircle2, Brain, Target, BookOpen, Sparkles, Pause, Play
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type UploadStep = 'upload' | 'extracting' | 'done';

interface ExtractionStats {
  total: number;
  gabarito_identified: number;
  with_explanation: number;
  avg_quality: number;
  engine: string;
  cached: boolean;
  batches_processed: number;
  total_batches: number;
}

interface AdminUploadQuestoesProps {
  onComplete?: () => void;
}

// Configurações para processamento em lotes
const BATCH_SIZE = 50000; // 50k caracteres por lote
const BATCH_OVERLAP = 2000; // 2k de overlap para não cortar questões
const DELAY_BETWEEN_BATCHES = 3000; // 3s entre lotes para evitar rate limit

export const AdminUploadQuestoes = ({ onComplete }: AdminUploadQuestoesProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<UploadStep>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractedCount, setExtractedCount] = useState(0);
  const [extractionStats, setExtractionStats] = useState<ExtractionStats | null>(null);
  const [processingMessage, setProcessingMessage] = useState('');
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const pauseRef = useRef(false);
  const allQuestionsRef = useRef<any[]>([]);

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const splitIntoBatches = (text: string): string[] => {
    if (text.length <= BATCH_SIZE) return [text];
    
    const batches: string[] = [];
    let start = 0;
    
    while (start < text.length) {
      let end = Math.min(start + BATCH_SIZE, text.length);
      
      // Tentar quebrar em um ponto natural (início de questão)
      if (end < text.length) {
        const searchArea = text.substring(end - 500, Math.min(end + 500, text.length));
        const breakMatch = searchArea.match(/\n\s*\d+[\.\)]\s/);
        if (breakMatch && breakMatch.index !== undefined) {
          end = end - 500 + breakMatch.index;
        }
      }
      
      batches.push(text.substring(start, end));
      start = Math.max(end - BATCH_OVERLAP, start + 1); // Overlap para não perder questões
    }
    
    return batches;
  };

  const processBatch = async (batchText: string, batchIndex: number, totalBatches: number): Promise<any[]> => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-questions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ 
          text: batchText, 
          fileName: `${fileName}_lote_${batchIndex + 1}_de_${totalBatches}` 
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error(`Batch ${batchIndex + 1} error:`, data.error);
      return [];
    }

    return data.questions || [];
  };

  const deduplicateQuestions = (questions: any[]): any[] => {
    const seen = new Map<string, any>();
    
    for (const q of questions) {
      // Usar os primeiros 100 caracteres do enunciado como chave
      const key = (q.enunciado || '').toLowerCase().trim().substring(0, 100);
      if (key.length > 20 && !seen.has(key)) {
        seen.set(key, q);
      } else if (key.length > 20) {
        // Se já existe, manter o de maior qualidade
        const existing = seen.get(key);
        if (q.score_qualidade > (existing?.score_qualidade || 0)) {
          seen.set(key, q);
        }
      }
    }
    
    return Array.from(seen.values());
  };

  const processFile = useCallback(async (file: File) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    const supportedTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    const isSupported = supportedTypes.includes(file.type) || 
      file.name.endsWith('.txt') || 
      file.name.endsWith('.pdf') || 
      file.name.endsWith('.doc') || 
      file.name.endsWith('.docx');

    if (!isSupported) {
      toast.error('Formato não suportado. Use PDF, TXT, DOC ou DOCX.');
      return;
    }

    if (file.size > 30 * 1024 * 1024) { // Aumentado para 30MB
      toast.error('Arquivo muito grande. Tamanho máximo: 30MB.');
      return;
    }

    setFileName(file.name);
    setStep('extracting');
    setExtractionProgress(2);
    setProcessingMessage('Iniciando processamento...');
    allQuestionsRef.current = [];
    pauseRef.current = false;
    setIsPaused(false);

    try {
      let text = '';

      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        setProcessingMessage('Lendo arquivo de texto...');
        text = await readFileAsText(file);
        setExtractionProgress(10);
      } else {
        setProcessingMessage('Processando documento com IA...');
        setExtractionProgress(5);

        const base64Data = await readFileAsBase64(file);
        setExtractionProgress(8);

        const parseResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-document`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ 
              fileData: base64Data, 
              fileName: file.name,
              fileType: file.type 
            })
          }
        );

        setExtractionProgress(15);
        setProcessingMessage('Extraindo texto do documento...');

        const parseData = await parseResponse.json();

        if (!parseResponse.ok || !parseData.success) {
          throw new Error(parseData.error || 'Erro ao processar documento');
        }

        text = parseData.text;
      }

      if (text.length < 100) {
        toast.error('Arquivo muito curto para extração de questões');
        setStep('upload');
        return;
      }

      // Dividir em lotes
      const batches = splitIntoBatches(text);
      setTotalBatches(batches.length);
      
      console.log(`Documento dividido em ${batches.length} lotes`);
      console.log(`Tamanho total: ${text.length} caracteres`);

      setExtractionProgress(20);
      setProcessingMessage(`Preparando ${batches.length} lotes para processamento...`);

      // Processar cada lote
      for (let i = 0; i < batches.length; i++) {
        // Verificar pausa
        while (pauseRef.current) {
          await delay(500);
        }

        setCurrentBatch(i + 1);
        const progress = 20 + Math.floor((i / batches.length) * 60);
        setExtractionProgress(progress);
        setProcessingMessage(`Processando lote ${i + 1} de ${batches.length} (${Math.round(batches[i].length / 1000)}k chars)...`);

        try {
          const batchQuestions = await processBatch(batches[i], i, batches.length);
          
          if (batchQuestions.length > 0) {
            allQuestionsRef.current.push(...batchQuestions);
            console.log(`Lote ${i + 1}: ${batchQuestions.length} questões (total acumulado: ${allQuestionsRef.current.length})`);
          }
        } catch (batchError) {
          console.error(`Erro no lote ${i + 1}:`, batchError);
          // Continuar com próximos lotes mesmo se um falhar
        }

        // Delay entre lotes para evitar rate limit
        if (i < batches.length - 1) {
          setProcessingMessage(`Aguardando antes do próximo lote...`);
          await delay(DELAY_BETWEEN_BATCHES);
        }
      }

      // Remover duplicatas
      setExtractionProgress(82);
      setProcessingMessage('Removendo questões duplicadas...');
      const uniqueQuestions = deduplicateQuestions(allQuestionsRef.current);

      console.log(`Total após deduplicação: ${uniqueQuestions.length} questões`);

      if (uniqueQuestions.length === 0) {
        toast.warning('Nenhuma questão encontrada no arquivo');
        setStep('upload');
        return;
      }

      setExtractionProgress(85);
      setProcessingMessage(`Salvando ${uniqueQuestions.length} questões no banco de dados...`);

      // Salvar em lotes de 50 para não sobrecarregar
      let savedCount = 0;
      const SAVE_BATCH_SIZE = 50;
      
      for (let i = 0; i < uniqueQuestions.length; i += SAVE_BATCH_SIZE) {
        const batch = uniqueQuestions.slice(i, i + SAVE_BATCH_SIZE);
        
        const insertData = batch.map(q => ({
          enunciado: q.enunciado,
          alternativa_a: q.alternativa_a,
          alternativa_b: q.alternativa_b,
          alternativa_c: q.alternativa_c,
          alternativa_d: q.alternativa_d,
          alternativa_e: q.alternativa_e,
          resposta_correta: q.resposta_correta,
          tema: q.tema || 'Geral',
          subtema: q.subtema,
          nivel: q.nivel || 'medio',
          banca: q.banca,
          ano_referencia: q.ano_referencia,
          explicacao: q.explicacao,
          origem: 'PDF_IMPORTADO' as const,
          status_validacao: 'pendente',
          score_qualidade: q.score_qualidade,
          nivel_confianca: q.nivel_confianca,
          documento_origem: file.name,
          created_by: user.id
        }));

        const { error, data } = await supabase.from('questoes').insert(insertData).select('id');
        if (!error && data) {
          savedCount += data.length;
        }
        
        const saveProgress = 85 + Math.floor((i / uniqueQuestions.length) * 14);
        setExtractionProgress(saveProgress);
        setProcessingMessage(`Salvando questões... ${savedCount}/${uniqueQuestions.length}`);
      }

      // Calcular estatísticas
      const withGabarito = uniqueQuestions.filter(q => q.resposta_correta && q.resposta_correta !== '?').length;
      const withExplanation = uniqueQuestions.filter(q => q.explicacao && q.explicacao.length > 20).length;
      const avgQuality = Math.round(uniqueQuestions.reduce((s, q) => s + (q.score_qualidade || 0), 0) / uniqueQuestions.length);

      setExtractionStats({
        total: savedCount,
        gabarito_identified: withGabarito,
        with_explanation: withExplanation,
        avg_quality: avgQuality,
        engine: 'unified',
        cached: false,
        batches_processed: batches.length,
        total_batches: batches.length
      });

      setExtractedCount(savedCount);
      setExtractionProgress(100);
      setProcessingMessage('Concluído!');
      
      setTimeout(() => {
        setStep('done');
        toast.success(`${savedCount} questões extraídas e enviadas para revisão!`, {
          description: `Processados ${batches.length} lotes | Gabaritos: ${withGabarito}/${savedCount}`
        });
      }, 500);

    } catch (error) {
      console.error('Extraction error:', error);
      
      // Se já extraiu algumas questões, permitir salvar parcialmente
      if (allQuestionsRef.current.length > 0) {
        toast.warning(`Erro durante processamento. ${allQuestionsRef.current.length} questões foram extraídas parcialmente.`);
        // Tentar salvar o que foi extraído
        const uniqueQuestions = deduplicateQuestions(allQuestionsRef.current);
        
        let savedCount = 0;
        for (const q of uniqueQuestions) {
          const { error: insertError } = await supabase.from('questoes').insert({
            enunciado: q.enunciado,
            alternativa_a: q.alternativa_a,
            alternativa_b: q.alternativa_b,
            alternativa_c: q.alternativa_c,
            alternativa_d: q.alternativa_d,
            alternativa_e: q.alternativa_e,
            resposta_correta: q.resposta_correta,
            tema: q.tema || 'Geral',
            nivel: q.nivel || 'medio',
            banca: q.banca,
            origem: 'PDF_IMPORTADO' as const,
            status_validacao: 'pendente',
            documento_origem: file.name,
            created_by: user.id
          });
          if (!insertError) savedCount++;
        }
        
        if (savedCount > 0) {
          setExtractedCount(savedCount);
          setStep('done');
          toast.success(`${savedCount} questões salvas (processamento parcial)`);
          return;
        }
      }
      
      toast.error(error instanceof Error ? error.message : 'Erro ao extrair questões');
      setStep('upload');
    }
  }, [user, fileName]);

  const togglePause = () => {
    pauseRef.current = !pauseRef.current;
    setIsPaused(!isPaused);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }, [processFile]);

  const goToReview = () => {
    navigate('/admin/questoes');
  };

  const uploadAnother = () => {
    setStep('upload');
    setFileName('');
    setExtractedCount(0);
    setExtractionProgress(0);
    setCurrentBatch(0);
    setTotalBatches(0);
    allQuestionsRef.current = [];
  };

  // Upload Step
  if (step === 'upload') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-primary" />
            Importar Questões
          </CardTitle>
          <CardDescription>
            Envie arquivos PDF, TXT, DOC ou DOCX com questões. Suporta documentos grandes (1000+ questões) com processamento em lotes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            className={cn(
              "relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200",
              isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            )}
          >
            <input
              type="file"
              accept=".txt,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-3">
              <div className={cn(
                "h-14 w-14 rounded-2xl flex items-center justify-center transition-colors",
                isDragging ? "bg-primary/20" : "bg-muted"
              )}>
                <FileUp className={cn(
                  "h-7 w-7 transition-colors",
                  isDragging ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Arraste um arquivo ou clique para selecionar
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Formatos suportados: PDF, TXT, DOC, DOCX (máx. 30MB)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Documentos grandes são processados em lotes automaticamente
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Extracting Step
  if (step === 'extracting') {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-violet-500/10">
          <CardTitle className="flex items-center gap-2">
            <div className="relative">
              <Brain className="h-5 w-5 text-primary" />
              <Sparkles className="h-3 w-3 text-violet-500 absolute -top-1 -right-1 animate-pulse" />
            </div>
            Análise Minuciosa com IA
          </CardTitle>
          <CardDescription>
            Processando {fileName}
            {totalBatches > 1 && ` (Lote ${currentBatch}/${totalBatches})`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <Progress value={extractionProgress} className="h-3" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className={cn("h-4 w-4", !isPaused && "animate-spin")} />
              {processingMessage}
            </div>
            
            {totalBatches > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={togglePause}
                className="gap-1"
              >
                {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                {isPaused ? 'Continuar' : 'Pausar'}
              </Button>
            )}
          </div>

          {/* Progresso dos lotes */}
          {totalBatches > 1 && (
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex justify-between text-sm mb-2">
                <span>Progresso dos lotes</span>
                <span className="font-medium">{currentBatch}/{totalBatches}</span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: totalBatches }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-2 flex-1 rounded-full transition-colors",
                      i < currentBatch ? "bg-primary" : 
                      i === currentBatch - 1 ? "bg-primary/50 animate-pulse" : 
                      "bg-muted"
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Questões extraídas até agora */}
          {allQuestionsRef.current.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-sm text-emerald-700">
                {allQuestionsRef.current.length} questões extraídas até agora
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <Target className="h-4 w-4 text-emerald-500" />
              <span className="text-xs">Identificando gabaritos</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <BookOpen className="h-4 w-4 text-blue-500" />
              <span className="text-xs">Gerando explicações</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Done Step
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-green-500/10">
        <CardTitle className="flex items-center gap-2 text-emerald-600">
          <CheckCircle2 className="h-5 w-5" />
          Extração Concluída com Sucesso!
        </CardTitle>
        <CardDescription>
          {extractedCount} questões extraídas de {fileName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {/* Estatísticas da extração */}
        {extractionStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-foreground">{extractionStats.total}</p>
              <p className="text-xs text-muted-foreground">Questões</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/10 text-center">
              <p className="text-2xl font-bold text-emerald-600">{extractionStats.gabarito_identified}</p>
              <p className="text-xs text-muted-foreground">Gabaritos</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10 text-center">
              <p className="text-2xl font-bold text-blue-600">{extractionStats.with_explanation}</p>
              <p className="text-xs text-muted-foreground">Com Explicação</p>
            </div>
            <div className="p-3 rounded-lg bg-violet-500/10 text-center">
              <p className="text-2xl font-bold text-violet-600">{extractionStats.avg_quality}%</p>
              <p className="text-xs text-muted-foreground">Qualidade Média</p>
            </div>
          </div>
        )}

        {/* Badges de informação */}
        <div className="flex flex-wrap gap-2">
          {extractionStats?.batches_processed && extractionStats.batches_processed > 1 && (
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {extractionStats.batches_processed} lotes processados
            </Badge>
          )}
          <Badge variant="outline" className="gap-1">
            <Brain className="h-3 w-3" />
            Motor: IA Unificada
          </Badge>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            As questões estão com status "Pendente" e precisam ser revisadas antes de ficarem disponíveis para simulados.
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button onClick={goToReview} className="flex-1">
            Ir para Revisão
          </Button>
          <Button onClick={uploadAnother} variant="outline" className="flex-1">
            Enviar Outro Arquivo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
