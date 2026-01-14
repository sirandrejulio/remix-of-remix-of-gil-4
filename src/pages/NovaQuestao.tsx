import { Header } from "@/components/layout/Header";
import { DottedSurface } from "@/components/ui/dotted-surface";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useTabPersistence } from "@/hooks/useTabPersistence";
import { Save, ArrowLeft, FileText, BookOpen, ListChecks, Sparkles, CheckCircle, Zap, Image as ImageIcon, Lightbulb, Loader2, FileUp, Edit, Trash2, Link2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ImageUpload } from "@/components/questoes/ImageUpload";
import { MultipleQuestionUpload, ExtractedQuestionData } from "@/components/questoes/MultipleQuestionUpload";
import { BulkDisciplineApply, BulkSelectCheckbox, FilterType } from "@/components/questoes/BulkDisciplineApply";
import { StudentTextoBaseAssigner } from "@/components/questoes/StudentTextoBaseAssigner";
import { StudentTextoBaseCreator, StudentTextoBase } from "@/components/questoes/StudentTextoBaseCreator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Disciplina {
  id: string;
  nome: string;
}

interface EditableQuestion {
  disciplina_id: string;
  tema: string;
  subtema: string;
  nivel: 'facil' | 'medio' | 'dificil';
  enunciado: string;
  alternativa_a: string;
  alternativa_b: string;
  alternativa_c: string;
  alternativa_d: string;
  alternativa_e: string;
  resposta_correta: string;
  explicacao: string;
  texto_base_id?: string | null;
  banca?: string;
  ano_referencia?: number | null;
}

const levels = [
  { value: "facil", label: "Fácil" },
  { value: "medio", label: "Médio" },
  { value: "dificil", label: "Difícil" },
];

// Em /questoes/nova, antes de salvar, queremos rolagem (não paginação) para revisar todas as questões.
const BULK_ITEMS_PER_PAGE = 10000;

const NovaQuestao = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Persist tab state across navigation
  const [activeTab, setActiveTab] = useTabPersistence('novaQuestao_activeTab', 'manual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  
  // Texto base for manual form - persisted
  const [selectedTextoBase, setSelectedTextoBase] = useTabPersistence<StudentTextoBase | null>('novaQuestao_textoBase', null);
  
  // Texto base for bulk import (shared across all) - persisted
  const [bulkTextoBase, setBulkTextoBase] = useTabPersistence<StudentTextoBase | null>('novaQuestao_bulkTextoBase', null);

  // For bulk questions from upload - persisted
  const [bulkQuestions, setBulkQuestions] = useTabPersistence<EditableQuestion[]>('novaQuestao_bulkQuestions', []);
  const [selectedBulkIndices, setSelectedBulkIndices] = useTabPersistence<number[]>('novaQuestao_selectedIndices', []);
  const [bulkFilterType, setBulkFilterType] = useTabPersistence<FilterType>('novaQuestao_filterType', 'all');
  const [textoBaseAssignerOpen, setTextoBaseAssignerOpen] = useState(false);
  const [bulkCurrentPage, setBulkCurrentPage] = useState(1);
  
  // Form data - persisted
  const initialFormData = useMemo(() => ({
    disciplina_id: "",
    topic: "",
    level: "medio",
    text: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    optionE: "",
    correctAnswer: "",
    imageUrl: null as string | null,
    explicacao: "",
    banca: "",
    ano_referencia: null as number | null,
  }), []);

  const [formData, setFormData] = useTabPersistence('novaQuestao_formData', initialFormData);

  useEffect(() => {
    const fetchDisciplinas = async () => {
      const { data } = await supabase.from('disciplinas').select('id, nome');
      setDisciplinas(data || []);
    };
    fetchDisciplinas();
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleQuestionsSelected = useCallback((questions: ExtractedQuestionData[]) => {
    console.log('handleQuestionsSelected called with', questions.length, 'questions');
    const editableQuestions: EditableQuestion[] = questions.map(q => ({
      disciplina_id: '',
      tema: q.tema || '',
      subtema: q.subtema || '',
      nivel: q.nivel,
      enunciado: q.enunciado,
      alternativa_a: q.alternativas.a,
      alternativa_b: q.alternativas.b,
      alternativa_c: q.alternativas.c,
      alternativa_d: q.alternativas.d,
      alternativa_e: q.alternativas.e,
      resposta_correta: q.resposta_correta,
      explicacao: q.explicacao || '',
      banca: q.banca || '',
      ano_referencia: q.ano_referencia || null,
    }));
    console.log('Setting bulkQuestions to', editableQuestions.length, 'items');
    setBulkQuestions(editableQuestions);
  }, []);

  const updateBulkQuestion = (index: number, field: keyof EditableQuestion, value: string) => {
    setBulkQuestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeBulkQuestion = (index: number) => {
    setBulkQuestions(prev => prev.filter((_, i) => i !== index));
    setSelectedBulkIndices(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i));
  };

  // Bulk selection handlers
  const toggleBulkSelect = (index: number) => {
    setSelectedBulkIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const selectAllBulk = () => {
    setSelectedBulkIndices(bulkQuestions.map((_, i) => i));
  };

  const deselectAllBulk = () => {
    setSelectedBulkIndices([]);
  };

  const applyBulkDiscipline = (disciplinaId: string, indices: number[]) => {
    setBulkQuestions(prev => {
      const updated = [...prev];
      indices.forEach(idx => {
        if (updated[idx]) {
          updated[idx] = { ...updated[idx], disciplina_id: disciplinaId };
        }
      });
      return updated;
    });
    const disciplinaNome = disciplinas.find(d => d.id === disciplinaId)?.nome || 'Disciplina';
    toast.success(`${disciplinaNome} aplicada a ${indices.length} questão(ões)`);
    setSelectedBulkIndices([]);
  };

  // Filtered questions for display
  const filteredBulkQuestions = useMemo(() => {
    return bulkQuestions.map((q, idx) => ({ ...q, originalIndex: idx }))
      .filter(q => bulkFilterType === 'all' || !q.disciplina_id);
  }, [bulkQuestions, bulkFilterType]);
  
  const questionsWithoutDiscipline = bulkQuestions.filter(q => !q.disciplina_id).length;

  // Pagination for bulk questions
  const bulkTotalPages = Math.ceil(filteredBulkQuestions.length / BULK_ITEMS_PER_PAGE);
  const paginatedBulkQuestions = useMemo(() => {
    const startIndex = (bulkCurrentPage - 1) * BULK_ITEMS_PER_PAGE;
    return filteredBulkQuestions.slice(startIndex, startIndex + BULK_ITEMS_PER_PAGE);
  }, [filteredBulkQuestions, bulkCurrentPage]);

  // Reset page when filter changes
  useEffect(() => {
    setBulkCurrentPage(1);
  }, [bulkFilterType]);

  // Se o total de páginas diminuir (ex.: mudou itens por página), evita ficar em uma página inexistente
  useEffect(() => {
    setBulkCurrentPage((p) => Math.min(p, Math.max(1, bulkTotalPages)));
  }, [bulkTotalPages, setBulkCurrentPage]);

  const getBulkPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (bulkTotalPages <= maxVisiblePages) {
      for (let i = 1; i <= bulkTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (bulkCurrentPage > 3) pages.push('...');
      const start = Math.max(2, bulkCurrentPage - 1);
      const end = Math.min(bulkTotalPages - 1, bulkCurrentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (bulkCurrentPage < bulkTotalPages - 2) pages.push('...');
      pages.push(bulkTotalPages);
    }
    return pages;
  };

  const selectAllBulkFiltered = () => {
    setSelectedBulkIndices(filteredBulkQuestions.map(q => q.originalIndex));
  };

  // Handle texto base assignment to bulk questions (versão segura para alunos)
  const handleTextoBaseAssign = (textoBaseId: string | null, questionIndices: number[]) => {
    setBulkQuestions(prev => {
      const updated = [...prev];
      questionIndices.forEach(idx => {
        if (updated[idx]) {
          updated[idx] = { ...updated[idx], texto_base_id: textoBaseId };
        }
      });
      return updated;
    });
  };

  // Prepare questions for the assigner
  const questionsForAssigner = bulkQuestions.map((q, idx) => ({
    index: idx,
    enunciado: q.enunciado,
    tema: q.tema,
    texto_base_id: q.texto_base_id
  }));

  // Clear all persisted state after successful save
  const clearPersistedState = useCallback(() => {
    const keys = [
      'novaQuestao_activeTab', 'novaQuestao_textoBase', 'novaQuestao_bulkTextoBase',
      'novaQuestao_bulkQuestions', 'novaQuestao_selectedIndices', 'novaQuestao_filterType',
      'novaQuestao_formData'
    ];
    keys.forEach(key => sessionStorage.removeItem(key));
  }, []);

  const handleSaveBulkQuestions = async () => {
    if (!user) {
      toast.error("Você precisa estar logado.");
      return;
    }

    // Validate all questions
    for (let i = 0; i < bulkQuestions.length; i++) {
      const q = bulkQuestions[i];
      if (!q.disciplina_id) {
        toast.error(`Questão ${i + 1}: Selecione uma disciplina.`);
        return;
      }
      if (!q.enunciado.trim()) {
        toast.error(`Questão ${i + 1}: Informe o enunciado.`);
        return;
      }
      if (!q.resposta_correta) {
        toast.error(`Questão ${i + 1}: Selecione a resposta correta.`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const questionsToInsert = bulkQuestions.map(q => ({
        disciplina_id: q.disciplina_id,
        tema: q.tema || 'Geral',
        subtema: q.subtema || null,
        enunciado: q.enunciado,
        alternativa_a: q.alternativa_a,
        alternativa_b: q.alternativa_b,
        alternativa_c: q.alternativa_c,
        alternativa_d: q.alternativa_d,
        alternativa_e: q.alternativa_e,
        resposta_correta: q.resposta_correta,
        nivel: q.nivel,
        explicacao: q.explicacao || null,
        origem: 'PDF_IMPORTADO' as const,
        status_validacao: 'pendente',
        created_by: user.id,
        texto_base_id: q.texto_base_id || bulkTextoBase?.id || null,
        banca: q.banca || null,
        ano_referencia: q.ano_referencia || null,
      }));

      const { error } = await supabase.from('questoes').insert(questionsToInsert);

      if (error) throw error;

      toast.success(`${bulkQuestions.length} questões salvas com sucesso!`);
      clearPersistedState();
      navigate("/questoes");
    } catch (error) {
      console.error('Error saving questions:', error);
      toast.error("Erro ao salvar questões.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Você precisa estar logado.");
      return;
    }

    // Validation
    if (!formData.disciplina_id) {
      toast.error("Selecione uma disciplina.");
      return;
    }
    if (!formData.topic.trim()) {
      toast.error("Informe o tema da questão.");
      return;
    }
    if (!formData.text.trim()) {
      toast.error("Digite o enunciado da questão.");
      return;
    }
    if (
      !formData.optionA.trim() ||
      !formData.optionB.trim() ||
      !formData.optionC.trim() ||
      !formData.optionD.trim() ||
      !formData.optionE.trim()
    ) {
      toast.error("Preencha todas as alternativas.");
      return;
    }
    if (!formData.correctAnswer) {
      toast.error("Selecione a alternativa correta.");
      return;
    }

    setIsSubmitting(true);

    try {
      const insertData = {
        disciplina_id: formData.disciplina_id,
        tema: formData.topic,
        enunciado: formData.text,
        alternativa_a: formData.optionA,
        alternativa_b: formData.optionB,
        alternativa_c: formData.optionC,
        alternativa_d: formData.optionD,
        alternativa_e: formData.optionE,
        resposta_correta: formData.correctAnswer,
        nivel: formData.level as 'facil' | 'medio' | 'dificil',
        imagem_url: formData.imageUrl,
        explicacao: formData.explicacao || null,
        origem: 'MANUAL' as const,
        status_validacao: 'pendente' as const,
        created_by: user.id,
        texto_base_id: selectedTextoBase?.id || null,
        banca: formData.banca || null,
        ano_referencia: formData.ano_referencia || null,
      };
      
      const { error } = await supabase.from('questoes').insert(insertData);

      if (error) throw error;

      toast.success("Questão enviada para revisão!", {
        description: "A questão será analisada pelo administrador antes de ficar disponível.",
      });

      clearPersistedState();
      navigate("/questoes");
    } catch (error) {
      console.error('Error creating question:', error);
      toast.error("Erro ao salvar questão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <DottedSurface />
    <div className="min-h-screen flex flex-col w-full relative">
      <Header />
      <main className="flex-1 container py-8">
        {/* Header com efeito tecnológico */}
        <div className="mb-8 animate-fade-in">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground hover:bg-primary/5 mb-4 transition-all duration-300"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent blur-xl opacity-50" />
            <div className="relative flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                <FileText className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Nova Questão</h1>
                <p className="text-muted-foreground mt-1">
                  Cadastre manualmente ou importe questões de documentos.
                </p>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/50">
            <TabsTrigger value="manual" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Edit className="h-4 w-4" />
              Cadastro Manual
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileUp className="h-4 w-4" />
              Upload de Questões
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="animate-fade-in">
            {bulkQuestions.length === 0 ? (
              <MultipleQuestionUpload onQuestionsSelected={handleQuestionsSelected} />
            ) : (
              <div className="flex flex-col h-[calc(100vh-180px)] min-h-[700px]">
                {/* Fixed Header with actions */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm shrink-0">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle className="h-6 w-6 text-emerald-500" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{bulkQuestions.length} Questões para Editar</CardTitle>
                          <CardDescription className="text-sm mt-1">
                            {bulkTextoBase 
                              ? `Com texto base: "${bulkTextoBase.titulo || 'Sem título'}"` 
                              : 'Edite as informações antes de salvar'}
                            {questionsWithoutDiscipline > 0 && (
                              <span className="text-amber-500 ml-2">• {questionsWithoutDiscipline} sem disciplina</span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        <Button 
                          variant="outline" 
                          onClick={() => setTextoBaseAssignerOpen(true)}
                          className="gap-2"
                        >
                          <Link2 className="h-4 w-4" />
                          Atribuir Texto Base
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => { setBulkQuestions([]); setBulkTextoBase(null); setSelectedBulkIndices([]); setBulkFilterType('all'); }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Bulk discipline apply - compact */}
                <div className="shrink-0 mt-4">
                  <BulkDisciplineApply
                    disciplinas={disciplinas}
                    questionsCount={filteredBulkQuestions.length}
                    questionsWithoutDiscipline={questionsWithoutDiscipline}
                    selectedIndices={selectedBulkIndices}
                    filterType={bulkFilterType}
                    onFilterChange={setBulkFilterType}
                    onToggleSelect={toggleBulkSelect}
                    onSelectAll={selectAllBulkFiltered}
                    onDeselectAll={deselectAllBulk}
                    onApplyDiscipline={applyBulkDiscipline}
                  />
                </div>

                {/* Scrollable questions list - FULL HEIGHT */}
                <div className="flex-1 mt-4 overflow-hidden rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm">
                  <ScrollArea className="h-full">
                    <div className="p-6 space-y-6">
                      {paginatedBulkQuestions.map((question) => {
                        const idx = question.originalIndex;
                        const hasErrors = !question.disciplina_id || !question.resposta_correta;
                        return (
                          <Card 
                            key={idx} 
                            className={`transition-all duration-200 hover:shadow-lg ${
                              selectedBulkIndices.includes(idx) 
                                ? 'ring-2 ring-primary border-primary/40' 
                                : hasErrors 
                                  ? 'border-amber-500/50 bg-amber-500/5' 
                                  : 'border-border/50 bg-card/80'
                            }`}
                          >
                            <CardHeader className="pb-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <BulkSelectCheckbox
                                    index={idx}
                                    isSelected={selectedBulkIndices.includes(idx)}
                                    onToggle={toggleBulkSelect}
                                  />
                                  <Badge variant="default" className="text-sm px-4 py-1.5">
                                    Questão {idx + 1}
                                  </Badge>
                                  <Badge variant="outline" className="text-sm px-3 py-1">
                                    {question.tema}{question.subtema ? ` / ${question.subtema}` : ''}
                                  </Badge>
                                  {hasErrors && (
                                    <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/50">
                                      Pendências
                                    </Badge>
                                  )}
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => removeBulkQuestion(idx)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 w-10"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </Button>
                              </div>
                            </CardHeader>
                            
                            <CardContent className="space-y-5 pt-0">
                              {/* Row 1: Disciplina, Tema, Subtema */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Disciplina *</Label>
                                  <Select
                                    value={question.disciplina_id}
                                    onValueChange={(v) => updateBulkQuestion(idx, 'disciplina_id', v)}
                                  >
                                    <SelectTrigger className={`h-11 ${!question.disciplina_id ? 'border-amber-500/50' : ''}`}>
                                      <SelectValue placeholder="Selecione a disciplina" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {disciplinas.map((d) => (
                                        <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Tema</Label>
                                  <Input
                                    value={question.tema}
                                    onChange={(e) => updateBulkQuestion(idx, 'tema', e.target.value)}
                                    className="h-11"
                                    placeholder="Tema da questão"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Subtema</Label>
                                  <Input
                                    value={question.subtema}
                                    onChange={(e) => updateBulkQuestion(idx, 'subtema', e.target.value)}
                                    className="h-11"
                                    placeholder="Subtema (opcional)"
                                  />
                                </div>
                              </div>

                              {/* Row 2: Nível, Banca, Ano */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Nível</Label>
                                  <Select
                                    value={question.nivel}
                                    onValueChange={(v) => updateBulkQuestion(idx, 'nivel', v)}
                                  >
                                    <SelectTrigger className="h-11">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {levels.map((l) => (
                                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Banca (opcional)</Label>
                                  <Input
                                    value={question.banca || ''}
                                    onChange={(e) => updateBulkQuestion(idx, 'banca', e.target.value)}
                                    placeholder="Ex: CESPE, FCC..."
                                    className="h-11"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Ano (opcional)</Label>
                                  <Input
                                    type="number"
                                    value={question.ano_referencia || ''}
                                    onChange={(e) => updateBulkQuestion(idx, 'ano_referencia', e.target.value)}
                                    placeholder="Ex: 2024"
                                    className="h-11"
                                  />
                                </div>
                              </div>

                              {/* Enunciado - Larger */}
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Enunciado *</Label>
                                <div className="bg-muted/20 rounded-lg p-1 border border-border/30">
                                  <Textarea
                                    value={question.enunciado}
                                    onChange={(e) => updateBulkQuestion(idx, 'enunciado', e.target.value)}
                                    className="min-h-[120px] max-h-[300px] resize-y border-0 bg-transparent focus-visible:ring-0"
                                    placeholder="Digite o enunciado da questão..."
                                  />
                                </div>
                              </div>

                              {/* Alternativas - Better Layout */}
                              <div className="space-y-3">
                                <Label className="text-sm font-medium">Alternativas (selecione a correta)</Label>
                                <div className="space-y-3">
                                  {['A', 'B', 'C', 'D', 'E'].map((letter) => {
                                    const isCorrect = question.resposta_correta === letter;
                                    return (
                                      <div 
                                        key={letter} 
                                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                          isCorrect 
                                            ? 'bg-emerald-500/10 border-emerald-500/40' 
                                            : 'bg-muted/10 border-border/30 hover:border-border/50'
                                        }`}
                                      >
                                        <input
                                          type="radio"
                                          name={`resposta_${idx}`}
                                          value={letter}
                                          checked={isCorrect}
                                          onChange={() => updateBulkQuestion(idx, 'resposta_correta', letter)}
                                          className="h-5 w-5 accent-emerald-500 shrink-0 cursor-pointer"
                                        />
                                        <span className={`font-bold text-base w-6 shrink-0 ${isCorrect ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                                          {letter})
                                        </span>
                                        <Input
                                          value={(question as any)[`alternativa_${letter.toLowerCase()}`]}
                                          onChange={(e) => updateBulkQuestion(idx, `alternativa_${letter.toLowerCase()}` as keyof EditableQuestion, e.target.value)}
                                          className={`flex-1 h-10 ${isCorrect ? 'border-emerald-500/30' : ''}`}
                                          placeholder={`Alternativa ${letter}`}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>

                {/* Fixed Footer - Save Button */}
                <div className="shrink-0 mt-4 flex justify-between items-center gap-4 p-4 rounded-xl bg-card/50 border border-border/50">
                  <div className="text-sm text-muted-foreground">
                    {filteredBulkQuestions.length} questões • {questionsWithoutDiscipline === 0 ? (
                      <span className="text-emerald-500">Todas preenchidas ✓</span>
                    ) : (
                      <span className="text-amber-500">{questionsWithoutDiscipline} sem disciplina</span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setBulkQuestions([])}
                      className="gap-2"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleSaveBulkQuestions} 
                      disabled={isSubmitting} 
                      size="lg"
                      className="gap-3 h-12 px-8 text-base font-semibold"
                    >
                      {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                      Salvar Todas ({bulkQuestions.length})
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="animate-fade-in">
            <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in" style={{ animationDelay: '100ms' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
                <CardHeader className="relative">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle>Informações Básicas</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 relative">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="discipline" className="text-sm font-medium">Disciplina *</Label>
                      <Select
                        value={formData.disciplina_id}
                        onValueChange={(v) => handleChange("disciplina_id", v)}
                      >
                        <SelectTrigger id="discipline" className="bg-background/50 border-border/50 hover:border-primary/30 transition-colors">
                          <SelectValue placeholder="Selecione a disciplina" />
                        </SelectTrigger>
                        <SelectContent className="bg-card/95 backdrop-blur-xl border-border/50">
                          {disciplinas.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="level" className="text-sm font-medium">Nível *</Label>
                      <Select
                        value={formData.level}
                        onValueChange={(v) => handleChange("level", v)}
                      >
                        <SelectTrigger id="level" className="bg-background/50 border-border/50 hover:border-primary/30 transition-colors">
                          <SelectValue placeholder="Selecione o nível" />
                        </SelectTrigger>
                        <SelectContent className="bg-card/95 backdrop-blur-xl border-border/50">
                          {levels.map((l) => (
                            <SelectItem key={l.value} value={l.value}>
                              {l.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="topic" className="text-sm font-medium">Tema / Subtema *</Label>
                    <Input
                      id="topic"
                      placeholder="Ex: Sistema Financeiro Nacional"
                      value={formData.topic}
                      onChange={(e) => handleChange("topic", e.target.value)}
                      className="bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-300"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="banca" className="text-sm font-medium">Banca (opcional)</Label>
                      <Input
                        id="banca"
                        placeholder="Ex: CESPE, FCC, FGV..."
                        value={formData.banca}
                        onChange={(e) => handleChange("banca", e.target.value)}
                        className="bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ano" className="text-sm font-medium">Ano (opcional)</Label>
                      <Input
                        id="ano"
                        type="number"
                        placeholder="Ex: 2024"
                        value={formData.ano_referencia || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, ano_referencia: e.target.value ? parseInt(e.target.value) : null }))}
                        min={1990}
                        max={new Date().getFullYear()}
                        className="bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-300"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Question Text */}
              <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in" style={{ animationDelay: '200ms' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
                <CardHeader className="relative">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <Sparkles className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <CardTitle>Enunciado</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Digite o texto completo da questão
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative space-y-4">
                  <Textarea
                    placeholder="Digite o enunciado da questão aqui..."
                    value={formData.text}
                    onChange={(e) => handleChange("text", e.target.value)}
                    className="min-h-[180px] max-h-[400px] resize-y overflow-y-auto bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-300"
                  />
                  
                  {/* Image Upload Section */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      Imagem da Questão (Opcional)
                    </Label>
                    <ImageUpload
                      imageUrl={formData.imageUrl}
                      onImageChange={(url) => handleChange("imageUrl", url || "")}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Explicação */}
              <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in" style={{ animationDelay: '250ms' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent pointer-events-none" />
                <CardHeader className="relative">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <Lightbulb className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <CardTitle>Explicação (Opcional)</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <span className="inline-flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        Justificativa da resposta correta
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <Textarea
                    placeholder="Explique por que a alternativa selecionada é a correta..."
                    value={formData.explicacao}
                    onChange={(e) => handleChange("explicacao", e.target.value)}
                    className="min-h-[100px] max-h-[300px] resize-y overflow-y-auto bg-background/50 border-border/50 focus:border-amber-500/50 transition-all duration-300"
                  />
                </CardContent>
              </Card>

              {/* Options */}
              <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in" style={{ animationDelay: '300ms' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent pointer-events-none" />
                <CardHeader className="relative">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <ListChecks className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <CardTitle>Alternativas</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <span className="inline-flex h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                        Preencha as 5 alternativas e marque a correta
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <RadioGroup
                    value={formData.correctAnswer}
                    onValueChange={(v) => handleChange("correctAnswer", v)}
                    className="space-y-4"
                  >
                    {["A", "B", "C", "D", "E"].map((letter, index) => (
                      <div 
                        key={letter} 
                        className={`group flex items-start gap-3 p-4 rounded-xl border-2 transition-all duration-300 ${
                          formData.correctAnswer === letter
                            ? "border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_20px_-5px_hsl(142,76%,36%,0.3)]"
                            : "border-border/50 hover:border-primary/30 hover:bg-primary/5"
                        }`}
                        style={{ animationDelay: `${(index + 4) * 50}ms` }}
                      >
                        <RadioGroupItem
                          value={letter}
                          id={`option-${letter}`}
                          className="mt-3"
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={`option-${letter}`}
                            className="flex items-center gap-2 text-sm font-medium"
                          >
                            <span className={`inline-flex items-center justify-center h-6 w-6 rounded-md text-xs font-bold transition-colors ${
                              formData.correctAnswer === letter
                                ? "bg-emerald-500 text-white"
                                : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                            }`}>
                              {letter}
                            </span>
                            Alternativa {letter}
                            {formData.correctAnswer === letter && (
                              <CheckCircle className="h-4 w-4 text-emerald-500 ml-auto" />
                            )}
                          </Label>
                          <Textarea
                            placeholder={`Texto da alternativa ${letter}...`}
                            value={formData[`option${letter}` as keyof typeof formData] as string}
                            onChange={(e) =>
                              handleChange(`option${letter}`, e.target.value)
                            }
                            className="mt-2 min-h-[60px] max-h-[150px] resize-y overflow-y-auto bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-300"
                          />
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Texto Base Creator for manual form (versão segura para alunos - só cria novos) */}
              <StudentTextoBaseCreator
                onTextoCreated={(texto) => setSelectedTextoBase(texto)}
                selectedTexto={selectedTextoBase}
                onClearSelection={() => setSelectedTextoBase(null)}
              />

              {/* Submit Card */}
              <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card/80 to-card/50 backdrop-blur-sm sticky top-6 animate-fade-in" style={{ animationDelay: '400ms' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent pointer-events-none" />
                <CardHeader className="relative">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Enviar Questão</CardTitle>
                      <CardDescription>
                        A questão será enviada para revisão
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative space-y-4">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                      <span>Pendente de aprovação</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Após enviar, a questão será analisada antes de ficar disponível nos simulados.
                    </p>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full gap-2 relative overflow-hidden group"
                    disabled={isSubmitting}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Enviar para Revisão
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Tips Card */}
              <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm animate-fade-in" style={{ animationDelay: '500ms' }}>
                <CardHeader className="pb-3 relative">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    Dicas
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <span>Escreva enunciados claros e objetivos</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <span>Alternativas devem ter tamanho similar</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <span>Evite "pegadinhas" ou ambiguidades</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <span>Adicione uma explicação detalhada</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
            </form>
          </TabsContent>
        </Tabs>

        {/* Student Texto Base Assigner Dialog (versão segura - só cria novos textos) */}
        <StudentTextoBaseAssigner
          questions={questionsForAssigner}
          onAssign={handleTextoBaseAssign}
          isOpen={textoBaseAssignerOpen}
          onClose={() => setTextoBaseAssignerOpen(false)}
        />
      </main>
      <Footer />
    </div>
    </>
  );
};

export default NovaQuestao;
