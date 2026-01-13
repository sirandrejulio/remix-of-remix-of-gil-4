import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FileUp, File, X, CheckCircle2, AlertCircle, Loader2,
  ChevronLeft, ChevronRight, Save, Edit2, Trash2, AlertTriangle,
  FileText, Check, Image as ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ImageUpload } from "@/components/questoes/ImageUpload";
import { parseQuestions, hasStructuredQuestionFormat } from "@/lib/questionParser";

interface ExtractedQuestion {
  id: string;
  enunciado: string;
  alternativa_a: string;
  alternativa_b: string;
  alternativa_c: string;
  alternativa_d: string;
  alternativa_e: string;
  resposta_correta: string;
  disciplina: string;
  tema: string;
  nivel: string;
  banca: string;
  explicacao?: string;
  imagem_url?: string | null;
  score_qualidade: number;
  nivel_confianca: string;
  issues: string[];
  selected: boolean;
}

type UploadStep = 'upload' | 'extracting' | 'review' | 'saving';

export const UploadQuestoes = () => {
  const { user } = useAuth();
  const [step, setStep] = useState<UploadStep>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestion[]>([]);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [fileName, setFileName] = useState('');
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [savingProgress, setSavingProgress] = useState(0);

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // Remove data URL prefix to get pure base64
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

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Tamanho máximo: 10MB.');
      return;
    }

    setFileName(file.name);
    setStep('extracting');
    setExtractionProgress(10);

    try {
      let text = '';
      const isTxtFile = file.type === 'text/plain' || file.name.endsWith('.txt');

      // For TXT files, read directly
      if (isTxtFile) {
        text = await readFileAsText(file);
        setExtractionProgress(30);

        // Try local parsing first for structured formats
        if (hasStructuredQuestionFormat(text)) {
          console.log(`[UploadQuestoes] Detected structured format, using local parser`);
          setExtractionProgress(50);

          const parseResult = parseQuestions(text);

          if (parseResult.success && parseResult.questions.length > 0) {
            console.log(`[UploadQuestoes] Local parser extracted ${parseResult.questions.length} questions`);
            console.log(`[UploadQuestoes] Stats: Padrão 1: ${parseResult.stats.padrao1}, Padrão 2: ${parseResult.stats.padrao2}`);

            // Convert to ExtractedQuestion format
            const questionsWithSelection = parseResult.questions.map((q, idx) => ({
              id: `local-${idx}`,
              enunciado: q.enunciado,
              alternativa_a: q.alternativa_a,
              alternativa_b: q.alternativa_b,
              alternativa_c: q.alternativa_c,
              alternativa_d: q.alternativa_d,
              alternativa_e: q.alternativa_e,
              resposta_correta: q.resposta_correta,
              disciplina: 'Conhecimentos Gerais',
              tema: q.tema,
              nivel: 'medio',
              banca: q.banca || 'Não identificada',
              explicacao: undefined,
              score_qualidade: q.confidence === 'alto' ? 90 : q.confidence === 'medio' ? 70 : 50,
              nivel_confianca: q.confidence,
              issues: [],
              selected: true,
              imagem_url: null
            }));

            setExtractedQuestions(questionsWithSelection);
            setSelectedQuestionIndex(0);
            setExtractionProgress(100);

            setTimeout(() => {
              setStep('review');
              toast.success(`${parseResult.questions.length} questões extraídas com parser local!`);
            }, 500);

            return;
          }

          // Log errors if local parsing failed
          if (parseResult.errors.length > 0) {
            console.log(`[UploadQuestoes] Local parser errors:`, parseResult.errors);
          }
        }
      } else {
        // For PDF and DOC files, use the parse-document edge function
        toast.info('Processando documento com IA...');
        setExtractionProgress(20);

        const base64Data = await readFileAsBase64(file);
        setExtractionProgress(30);

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

        setExtractionProgress(50);

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

      setExtractionProgress(60);

      // Fallback to edge function for extraction
      console.log(`[UploadQuestoes] Using edge function for extraction`);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-questions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ text, fileName: file.name })
        }
      );

      setExtractionProgress(85);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro na extração');
      }

      if (data.questions.length === 0) {
        toast.warning('Nenhuma questão encontrada no arquivo');
        setStep('upload');
        return;
      }

      // Add selected flag and imagem_url to each question
      const questionsWithSelection = data.questions.map((q: any) => ({
        ...q,
        selected: true,
        imagem_url: null
      }));

      setExtractedQuestions(questionsWithSelection);
      setSelectedQuestionIndex(0);
      setExtractionProgress(100);

      setTimeout(() => {
        setStep('review');
        toast.success(`${data.questions.length} questões extraídas!`);
      }, 500);

    } catch (error) {
      console.error('Extraction error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao extrair questões');
      setStep('upload');
    }
  }, [user]);

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

  const updateQuestion = (field: keyof ExtractedQuestion, value: string | boolean) => {
    setExtractedQuestions(prev => prev.map((q, i) =>
      i === selectedQuestionIndex ? { ...q, [field]: value } : q
    ));
  };

  const toggleQuestionSelection = (index: number) => {
    setExtractedQuestions(prev => prev.map((q, i) =>
      i === index ? { ...q, selected: !q.selected } : q
    ));
  };

  const removeQuestion = (index: number) => {
    setExtractedQuestions(prev => prev.filter((_, i) => i !== index));
    if (selectedQuestionIndex >= extractedQuestions.length - 1) {
      setSelectedQuestionIndex(Math.max(0, extractedQuestions.length - 2));
    }
  };

  const saveQuestions = async () => {
    const selectedQuestions = extractedQuestions.filter(q => q.selected);

    if (selectedQuestions.length === 0) {
      toast.error('Selecione pelo menos uma questão');
      return;
    }

    setStep('saving');
    setSavingProgress(0);

    try {
      for (let i = 0; i < selectedQuestions.length; i++) {
        const q = selectedQuestions[i];

        const insertData: any = {
          enunciado: q.enunciado,
          alternativa_a: q.alternativa_a,
          alternativa_b: q.alternativa_b,
          alternativa_c: q.alternativa_c,
          alternativa_d: q.alternativa_d,
          alternativa_e: q.alternativa_e,
          resposta_correta: q.resposta_correta,
          tema: q.tema,
          nivel: q.nivel,
          banca: q.banca,
          explicacao: q.explicacao,
          imagem_url: q.imagem_url,
          origem: 'PDF_IMPORTADO',
          status_validacao: 'pendente',
          score_qualidade: q.score_qualidade,
          nivel_confianca: q.nivel_confianca,
          created_by: user?.id
        };

        const { error } = await supabase.from('questoes').insert(insertData);

        if (error) {
          console.error('Error saving question:', error);
        }

        setSavingProgress(Math.round(((i + 1) / selectedQuestions.length) * 100));
      }

      toast.success(`${selectedQuestions.length} questões salvas com sucesso!`);

      // Reset state
      setExtractedQuestions([]);
      setFileName('');
      setStep('upload');

    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erro ao salvar questões');
      setStep('review');
    }
  };

  const currentQuestion = extractedQuestions[selectedQuestionIndex];
  const selectedCount = extractedQuestions.filter(q => q.selected).length;

  // Upload Step
  if (step === 'upload') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-primary" />
            Upload de Questões
          </CardTitle>
          <CardDescription>
            Envie arquivos TXT com questões para extração automática. Revise antes de salvar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            className={cn(
              "relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200",
              isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            )}
          >
            <input
              type="file"
              accept=".txt,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-4">
              <div className={cn(
                "h-16 w-16 rounded-2xl flex items-center justify-center transition-colors",
                isDragging ? "bg-primary/20" : "bg-muted"
              )}>
                <FileUp className={cn(
                  "h-8 w-8 transition-colors",
                  isDragging ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <p className="font-medium text-lg text-foreground">
                  Arraste um arquivo ou clique para selecionar
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Formatos suportados: TXT (recomendado), PDF, DOC
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            Extraindo Questões com IA
          </CardTitle>
          <CardDescription>
            Análise minuciosa de {fileName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Progress value={extractionProgress} className="h-3" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-colors",
              extractionProgress >= 10 ? "border-primary/50 bg-primary/5" : "border-border"
            )}>
              {extractionProgress >= 10 ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : (
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
              )}
              <div>
                <p className="text-sm font-medium">Lendo Documento</p>
                <p className="text-xs text-muted-foreground">Extraindo texto do arquivo</p>
              </div>
            </div>

            <div className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-colors",
              extractionProgress >= 50 ? "border-primary/50 bg-primary/5" : "border-border"
            )}>
              {extractionProgress >= 50 ? (
                extractionProgress >= 85 ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                )
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-muted" />
              )}
              <div>
                <p className="text-sm font-medium">Análise com IA</p>
                <p className="text-xs text-muted-foreground">Processando chunks com retry automático</p>
              </div>
            </div>

            <div className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-colors",
              extractionProgress >= 85 ? "border-primary/50 bg-primary/5" : "border-border"
            )}>
              {extractionProgress >= 85 ? (
                extractionProgress >= 95 ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                )
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-muted" />
              )}
              <div>
                <p className="text-sm font-medium">Identificando Gabaritos</p>
                <p className="text-xs text-muted-foreground">Validação precisa das respostas</p>
              </div>
            </div>

            <div className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-colors",
              extractionProgress >= 95 ? "border-primary/50 bg-primary/5" : "border-border"
            )}>
              {extractionProgress >= 95 ? (
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-muted" />
              )}
              <div>
                <p className="text-sm font-medium">Gerando Explicações</p>
                <p className="text-xs text-muted-foreground">Conteúdo didático automático</p>
              </div>
            </div>
          </div>

          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">
              {extractionProgress < 30 ? 'Preparando documento...' :
                extractionProgress < 60 ? 'Processando com IA (arquivos grandes podem demorar mais)...' :
                  extractionProgress < 85 ? 'Validando questões extraídas...' :
                    extractionProgress < 95 ? 'Removendo duplicatas...' :
                      'Finalizando extração...'}
            </p>
            <p className="text-xs text-muted-foreground">
              Arquivos grandes são processados em partes para maior precisão
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Saving Step
  if (step === 'saving') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            Salvando Questões
          </CardTitle>
          <CardDescription>
            Enviando {selectedCount} questões para o banco...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={savingProgress} className="h-2" />
          <p className="text-sm text-muted-foreground text-center">
            {savingProgress}% concluído
          </p>
        </CardContent>
      </Card>
    );
  }

  // Review Step
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Revisão de Questões
              </CardTitle>
              <CardDescription className="mt-1">
                {extractedQuestions.length} questões extraídas de {fileName}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Check className="h-3 w-3" />
                {selectedCount} selecionadas
              </Badge>
              <Button onClick={saveQuestions} disabled={selectedCount === 0} className="gap-2">
                <Save className="h-4 w-4" />
                Salvar Selecionadas
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Question List */}
        <div className="lg:col-span-4">
          <Card className="h-[600px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Lista de Questões</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[530px]">
                <div className="p-3 space-y-2">
                  {extractedQuestions.map((q, index) => (
                    <div
                      key={q.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all",
                        selectedQuestionIndex === index
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50",
                        !q.selected && "opacity-50"
                      )}
                      onClick={() => setSelectedQuestionIndex(index)}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={q.selected}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleQuestionSelection(index);
                          }}
                          className="mt-1 h-4 w-4 rounded border-border"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <Badge
                              variant={q.score_qualidade >= 70 ? "default" : q.score_qualidade >= 40 ? "secondary" : "destructive"}
                              className="text-xs"
                            >
                              {q.score_qualidade}%
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {q.disciplina?.substring(0, 15) || 'N/A'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {q.enunciado.substring(0, 80)}...
                          </p>
                          {q.issues.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 text-amber-600">
                              <AlertTriangle className="h-3 w-3" />
                              <span className="text-xs">{q.issues.length} aviso(s)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Question Editor */}
        <div className="lg:col-span-8">
          <Card className="h-[600px]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Edit2 className="h-4 w-4" />
                  Editar Questão {selectedQuestionIndex + 1}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedQuestionIndex(Math.max(0, selectedQuestionIndex - 1))}
                    disabled={selectedQuestionIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {selectedQuestionIndex + 1} / {extractedQuestions.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedQuestionIndex(Math.min(extractedQuestions.length - 1, selectedQuestionIndex + 1))}
                    disabled={selectedQuestionIndex === extractedQuestions.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Separator orientation="vertical" className="h-6" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeQuestion(selectedQuestionIndex)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {currentQuestion?.issues.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {currentQuestion.issues.map((issue, i) => (
                    <Badge key={i} variant="outline" className="text-xs text-amber-600 border-amber-300">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {issue}
                    </Badge>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {currentQuestion && (
                <ScrollArea className="h-[500px]">
                  <div className="p-4 space-y-4">
                    {/* Metadata */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Disciplina</label>
                        <Input
                          value={currentQuestion.disciplina}
                          onChange={(e) => updateQuestion('disciplina', e.target.value)}
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Tema</label>
                        <Input
                          value={currentQuestion.tema}
                          onChange={(e) => updateQuestion('tema', e.target.value)}
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Nível</label>
                        <Select
                          value={currentQuestion.nivel}
                          onValueChange={(v) => updateQuestion('nivel', v)}
                        >
                          <SelectTrigger className="mt-1 h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="facil">Fácil</SelectItem>
                            <SelectItem value="medio">Médio</SelectItem>
                            <SelectItem value="dificil">Difícil</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Resposta</label>
                        <Select
                          value={currentQuestion.resposta_correta}
                          onValueChange={(v) => updateQuestion('resposta_correta', v)}
                        >
                          <SelectTrigger className="mt-1 h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                            <SelectItem value="D">D</SelectItem>
                            <SelectItem value="E">E</SelectItem>
                            <SelectItem value="?">?</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Enunciado */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Enunciado</label>
                      <Textarea
                        value={currentQuestion.enunciado}
                        onChange={(e) => updateQuestion('enunciado', e.target.value)}
                        className="mt-1 min-h-[100px] text-sm"
                      />
                    </div>

                    {/* Image Upload */}
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <ImageIcon className="h-3 w-3" />
                        Imagem (Opcional)
                      </Label>
                      <div className="mt-1">
                        <ImageUpload
                          imageUrl={currentQuestion.imagem_url || null}
                          onImageChange={(url) => updateQuestion('imagem_url', url || '')}
                        />
                      </div>
                    </div>

                    {/* Alternatives */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Alternativas</label>
                      {['A', 'B', 'C', 'D', 'E'].map((letter) => {
                        const key = `alternativa_${letter.toLowerCase()}` as keyof ExtractedQuestion;
                        const isCorrect = currentQuestion.resposta_correta === letter;
                        return (
                          <div key={letter} className="flex items-start gap-2">
                            <Badge
                              variant={isCorrect ? "default" : "outline"}
                              className={cn("mt-1.5 w-6 h-6 p-0 flex items-center justify-center", isCorrect && "bg-emerald-500")}
                            >
                              {letter}
                            </Badge>
                            <Input
                              value={currentQuestion[key] as string}
                              onChange={(e) => updateQuestion(key, e.target.value)}
                              className={cn(
                                "flex-1 text-sm",
                                isCorrect && "border-emerald-500/50 bg-emerald-500/5"
                              )}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Explicação */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Explicação (opcional)</label>
                      <Textarea
                        value={currentQuestion.explicacao || ''}
                        onChange={(e) => updateQuestion('explicacao', e.target.value)}
                        className="mt-1 min-h-[60px] text-sm"
                        placeholder="Adicione uma explicação para a resposta correta..."
                      />
                    </div>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => {
            setExtractedQuestions([]);
            setStep('upload');
          }}
        >
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button onClick={saveQuestions} disabled={selectedCount === 0} className="gap-2">
          <Save className="h-4 w-4" />
          Salvar {selectedCount} Questões
        </Button>
      </div>
    </div>
  );
};
