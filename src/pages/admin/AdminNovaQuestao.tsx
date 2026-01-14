import { useState, useEffect, useMemo } from 'react';
import { useTabPersistence } from '@/hooks/useTabPersistence';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AutoTextarea } from '@/components/ui/auto-textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Save, FileText, Sparkles, BookOpen, CheckCircle, Lightbulb, Image as ImageIcon, FileUp, Edit, Trash2, Link2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { ImageUpload } from '@/components/questoes/ImageUpload';
import { MultipleQuestionUpload, ExtractedQuestionData } from '@/components/questoes/MultipleQuestionUpload';
import { TextoBaseManager, TextoBase } from '@/components/questoes/TextoBaseManager';
import { BulkDisciplineApply, BulkSelectCheckbox, FilterType } from '@/components/questoes/BulkDisciplineApply';
import { TextoBaseAssigner } from '@/components/questoes/TextoBaseAssigner';

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

export default function AdminNovaQuestao() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Persist tab state across navigation
  const [activeTab, setActiveTab] = useTabPersistence('adminNovaQuestao_activeTab', 'manual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  
  // Texto base for manual form - persisted
  const [selectedTextoBase, setSelectedTextoBase] = useTabPersistence<TextoBase | null>('adminNovaQuestao_textoBase', null);

  // For bulk questions from upload - persisted
  const [bulkQuestions, setBulkQuestions] = useTabPersistence<EditableQuestion[]>('adminNovaQuestao_bulkQuestions', []);
  const [selectedBulkIndices, setSelectedBulkIndices] = useTabPersistence<number[]>('adminNovaQuestao_selectedIndices', []);
  const [bulkFilterType, setBulkFilterType] = useTabPersistence<FilterType>('adminNovaQuestao_filterType', 'all');
  const [textoBaseAssignerOpen, setTextoBaseAssignerOpen] = useState(false);

  // Form data - persisted
  const initialFormData = useMemo(() => ({
    disciplina_id: '',
    tema: '',
    subtema: '',
    nivel: 'medio' as 'facil' | 'medio' | 'dificil',
    enunciado: '',
    alternativa_a: '',
    alternativa_b: '',
    alternativa_c: '',
    alternativa_d: '',
    alternativa_e: '',
    resposta_correta: '',
    explicacao: '',
    imagem_url: null as string | null,
    texto_base_id: null as string | null,
    banca: '',
    ano_referencia: null as number | null,
  }), []);

  const [formData, setFormData] = useTabPersistence('adminNovaQuestao_formData', initialFormData);

  useEffect(() => {
    const fetchDisciplinas = async () => {
      const { data } = await supabase.from('disciplinas').select('id, nome');
      setDisciplinas(data || []);
    };
    fetchDisciplinas();
  }, []);

  const handleQuestionsSelected = (questions: ExtractedQuestionData[]) => {
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
    setBulkQuestions(editableQuestions);
  };

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
  const filteredBulkQuestions = bulkQuestions.map((q, idx) => ({ ...q, originalIndex: idx }))
    .filter(q => bulkFilterType === 'all' || !q.disciplina_id);
  
  const questionsWithoutDiscipline = bulkQuestions.filter(q => !q.disciplina_id).length;

  const selectAllBulkFiltered = () => {
    setSelectedBulkIndices(filteredBulkQuestions.map(q => q.originalIndex));
  };

  // Handle texto base assignment to bulk questions
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
  const clearPersistedState = () => {
    const keys = [
      'adminNovaQuestao_activeTab', 'adminNovaQuestao_textoBase',
      'adminNovaQuestao_bulkQuestions', 'adminNovaQuestao_selectedIndices', 
      'adminNovaQuestao_filterType', 'adminNovaQuestao_formData'
    ];
    keys.forEach(key => sessionStorage.removeItem(key));
  };

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
        status_validacao: 'valida',
        created_by: user.id,
        texto_base_id: q.texto_base_id || null,
        banca: q.banca || null,
        ano_referencia: q.ano_referencia || null,
      }));

      const { error } = await supabase.from('questoes').insert(questionsToInsert);

      if (error) throw error;

      toast.success(`${bulkQuestions.length} questões salvas com sucesso!`);
      clearPersistedState();
      navigate("/admin/questoes");
    } catch (error) {
      console.error('Error saving questions:', error);
      toast.error("Erro ao salvar questões.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.disciplina_id) {
      toast.error('Selecione uma disciplina');
      return;
    }
    if (!formData.tema) {
      toast.error('Informe o tema');
      return;
    }
    if (!formData.enunciado) {
      toast.error('Informe o enunciado');
      return;
    }
    if (!formData.alternativa_a || !formData.alternativa_b || !formData.alternativa_c || !formData.alternativa_d || !formData.alternativa_e) {
      toast.error('Preencha todas as alternativas');
      return;
    }
    if (!formData.resposta_correta) {
      toast.error('Selecione a resposta correta');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('questoes').insert({
        disciplina_id: formData.disciplina_id,
        tema: formData.tema,
        subtema: formData.subtema || null,
        nivel: formData.nivel,
        enunciado: formData.enunciado,
        alternativa_a: formData.alternativa_a,
        alternativa_b: formData.alternativa_b,
        alternativa_c: formData.alternativa_c,
        alternativa_d: formData.alternativa_d,
        alternativa_e: formData.alternativa_e,
        resposta_correta: formData.resposta_correta,
        explicacao: formData.explicacao || null,
        imagem_url: formData.imagem_url,
        origem: 'MANUAL',
        status_validacao: 'valida',
        created_by: user?.id,
        texto_base_id: selectedTextoBase?.id || null,
        banca: formData.banca || null,
        ano_referencia: formData.ano_referencia || null,
      });

      if (error) throw error;

      toast.success('Questão criada com sucesso!');
      clearPersistedState();
      navigate('/admin/questoes');
    } catch (error) {
      console.error('Error creating question:', error);
      toast.error('Erro ao criar questão');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-violet-500/10 to-cyan-500/20 rounded-2xl blur-xl opacity-60" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-xl bg-card/40 backdrop-blur-xl border border-border/30">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="hover:bg-primary/10 hover:text-primary transition-colors">
              <Link to="/admin/questoes">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-violet-500/50 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative p-4 rounded-2xl bg-gradient-to-br from-primary to-violet-500 shadow-2xl shadow-primary/25">
                <FileText className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
                Nova Questão
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Adicione ou importe questões
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
            Importar Questões
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="animate-fade-in space-y-6">
          {bulkQuestions.length === 0 ? (
            <div className="space-y-6">
              <MultipleQuestionUpload onQuestionsSelected={handleQuestionsSelected} />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header with actions */}
              <Card className="border-border/50 bg-card/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <CardTitle>{bulkQuestions.length} Questões para Editar</CardTitle>
                        <CardDescription>
                          Edite as informações antes de salvar. Use "Atribuir Texto Base" para vincular textos às questões selecionadas.
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant="outline" 
                        onClick={() => setTextoBaseAssignerOpen(true)}
                        className="gap-2"
                      >
                        <Link2 className="h-4 w-4" />
                        Atribuir Texto Base
                      </Button>
                      <Button variant="outline" onClick={() => { setBulkQuestions([]); setSelectedBulkIndices([]); setBulkFilterType('all'); }}>
                        Cancelar
                      </Button>
                      <Button onClick={handleSaveBulkQuestions} disabled={isSubmitting} className="gap-2">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Salvar Todas ({bulkQuestions.length})
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Bulk discipline apply */}
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

              {/* Scrollable questions list */}
              <ScrollArea className="h-[600px]">
                <div className="space-y-6 pr-4">
                    {filteredBulkQuestions.map((question) => {
                      const idx = question.originalIndex;
                      return (
                      <Card key={idx} className={`border-border/50 bg-card/80 backdrop-blur-sm ${selectedBulkIndices.includes(idx) ? 'ring-2 ring-primary/50' : ''}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <BulkSelectCheckbox
                                index={idx}
                                isSelected={selectedBulkIndices.includes(idx)}
                                onToggle={toggleBulkSelect}
                              />
                              <Badge variant="secondary">Questão {idx + 1}</Badge>
                              <Badge variant="outline" className="text-xs">
                                {question.tema}{question.subtema ? ` / ${question.subtema}` : ''}
                              </Badge>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeBulkQuestion(idx)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Basic Info Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">Disciplina *</Label>
                            <Select
                              value={question.disciplina_id}
                              onValueChange={(v) => updateBulkQuestion(idx, 'disciplina_id', v)}
                            >
                              <SelectTrigger className="mt-1 bg-background/50">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {disciplinas.map((d) => (
                                  <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Tema</Label>
                            <Input
                              value={question.tema}
                              onChange={(e) => updateBulkQuestion(idx, 'tema', e.target.value)}
                              className="mt-1 bg-background/50"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Subtema</Label>
                            <Input
                              value={question.subtema}
                              onChange={(e) => updateBulkQuestion(idx, 'subtema', e.target.value)}
                              className="mt-1 bg-background/50"
                            />
                          </div>
                        </div>

                        {/* Second Row: Nível, Banca, Ano */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">Nível</Label>
                            <Select
                              value={question.nivel}
                              onValueChange={(v) => updateBulkQuestion(idx, 'nivel', v)}
                            >
                              <SelectTrigger className="mt-1 bg-background/50">
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
                            <Label className="text-xs text-muted-foreground">Banca (opcional)</Label>
                            <Input
                              value={question.banca || ''}
                              onChange={(e) => updateBulkQuestion(idx, 'banca', e.target.value)}
                              placeholder="Ex: CESPE, FCC..."
                              className="mt-1 bg-background/50"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Ano (opcional)</Label>
                            <Input
                              type="number"
                              value={question.ano_referencia || ''}
                              onChange={(e) => updateBulkQuestion(idx, 'ano_referencia', e.target.value)}
                              placeholder="Ex: 2024"
                              className="mt-1 bg-background/50"
                            />
                          </div>
                        </div>

                        {/* Enunciado */}
                        <div>
                          <Label className="text-xs text-muted-foreground">Enunciado *</Label>
                          <AutoTextarea
                            value={question.enunciado}
                            onChange={(e) => updateBulkQuestion(idx, 'enunciado', e.target.value)}
                            minRows={2}
                            maxRows={8}
                            className="mt-1 bg-background/50"
                          />
                        </div>

                        {/* Alternatives */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Alternativas</Label>
                          {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                            <div key={letter} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`resposta_${idx}`}
                                value={letter}
                                checked={question.resposta_correta === letter}
                                onChange={() => updateBulkQuestion(idx, 'resposta_correta', letter)}
                                className="h-4 w-4 accent-emerald-500"
                              />
                              <span className={`font-bold w-6 ${question.resposta_correta === letter ? 'text-emerald-500' : ''}`}>
                                {letter})
                              </span>
                              <Input
                                value={(question as any)[`alternativa_${letter.toLowerCase()}`]}
                                onChange={(e) => updateBulkQuestion(idx, `alternativa_${letter.toLowerCase()}` as keyof EditableQuestion, e.target.value)}
                                className="flex-1 bg-background/50"
                                placeholder={`Alternativa ${letter}`}
                              />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                      );
                    })}
                </div>
              </ScrollArea>

              {/* Bottom Save Button */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => { setBulkQuestions([]); }}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveBulkQuestions} disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar Todas ({bulkQuestions.length})
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="manual" className="animate-fade-in">
          <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Animated Border */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              </div>

              <CardHeader className="relative">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                    <BookOpen className="h-5 w-5 text-blue-400" />
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors duration-300">Informações Básicas</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">Disciplina *</Label>
                    <Select
                      value={formData.disciplina_id}
                      onValueChange={(v) => setFormData({ ...formData, disciplina_id: v })}
                    >
                      <SelectTrigger className="mt-1.5 bg-background/50 border-border/50 focus:border-primary/50 transition-all">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {disciplinas.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">Nível *</Label>
                    <Select
                      value={formData.nivel}
                      onValueChange={(v) => setFormData({ ...formData, nivel: v as typeof formData.nivel })}
                    >
                      <SelectTrigger className="mt-1.5 bg-background/50 border-border/50 focus:border-primary/50 transition-all">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="facil">Fácil</SelectItem>
                        <SelectItem value="medio">Médio</SelectItem>
                        <SelectItem value="dificil">Difícil</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">Tema *</Label>
                    <Input
                      value={formData.tema}
                      onChange={(e) => setFormData({ ...formData, tema: e.target.value })}
                      placeholder="Ex: Segurança da Informação"
                      className="mt-1.5 bg-background/50 border-border/50 focus:border-primary/50 transition-all"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">Subtema</Label>
                    <Input
                      value={formData.subtema}
                      onChange={(e) => setFormData({ ...formData, subtema: e.target.value })}
                      placeholder="Ex: Criptografia"
                      className="mt-1.5 bg-background/50 border-border/50 focus:border-primary/50 transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">Banca (opcional)</Label>
                    <Input
                      value={formData.banca}
                      onChange={(e) => setFormData({ ...formData, banca: e.target.value })}
                      placeholder="Ex: CESPE, FCC, FGV..."
                      className="mt-1.5 bg-background/50 border-border/50 focus:border-primary/50 transition-all"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">Ano (opcional)</Label>
                    <Input
                      type="number"
                      value={formData.ano_referencia || ''}
                      onChange={(e) => setFormData({ ...formData, ano_referencia: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="Ex: 2024"
                      min={1990}
                      max={new Date().getFullYear()}
                      className="mt-1.5 bg-background/50 border-border/50 focus:border-primary/50 transition-all"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Question Text */}
            <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 animate-fade-in" style={{ animationDelay: '150ms' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <CardHeader className="relative">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 group-hover:scale-110 transition-transform duration-300">
                    <FileText className="h-5 w-5 text-purple-400" />
                  </div>
                  <CardTitle className="group-hover:text-purple-400 transition-colors duration-300">Enunciado</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <AutoTextarea
                  value={formData.enunciado}
                  onChange={(e) => setFormData({ ...formData, enunciado: e.target.value })}
                  placeholder="Digite o enunciado da questão..."
                  minRows={4}
                  maxRows={15}
                  className="bg-background/50 border-border/50 focus:border-purple-500/50 transition-all"
                />
                
                {/* Image Upload Section */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Imagem da Questão (Opcional)
                  </Label>
                  <ImageUpload
                    imageUrl={formData.imagem_url}
                    onImageChange={(url) => setFormData({ ...formData, imagem_url: url })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Alternatives */}
            <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <CardHeader className="relative">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="group-hover:text-emerald-400 transition-colors duration-300">Alternativas</CardTitle>
                    <CardDescription>Preencha todas as alternativas e selecione a correta</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-4">
                {['A', 'B', 'C', 'D', 'E'].map((letter, index) => (
                  <div 
                    key={letter} 
                    className={`flex gap-4 items-start p-3 rounded-lg border transition-all duration-300 animate-fade-in ${
                      formData.resposta_correta === letter 
                        ? 'bg-emerald-500/10 border-emerald-500/30' 
                        : 'bg-muted/20 border-border/50 hover:border-primary/30'
                    }`}
                    style={{ animationDelay: `${250 + index * 50}ms` }}
                  >
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="radio"
                        name="resposta_correta"
                        value={letter}
                        checked={formData.resposta_correta === letter}
                        onChange={(e) => setFormData({ ...formData, resposta_correta: e.target.value })}
                        className="h-4 w-4 accent-emerald-500"
                      />
                      <span className={`font-bold w-6 ${formData.resposta_correta === letter ? 'text-emerald-400' : ''}`}>
                        {letter})
                      </span>
                    </div>
                    <AutoTextarea
                      value={(formData as any)[`alternativa_${letter.toLowerCase()}`]}
                      onChange={(e) =>
                        setFormData({ ...formData, [`alternativa_${letter.toLowerCase()}`]: e.target.value })
                      }
                      placeholder={`Alternativa ${letter}`}
                      minRows={1}
                      maxRows={6}
                      className="flex-1 bg-background/50 border-border/50 focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Explanation */}
            <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 animate-fade-in" style={{ animationDelay: '250ms' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <CardHeader className="relative">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 group-hover:scale-110 transition-transform duration-300">
                    <Lightbulb className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <CardTitle className="group-hover:text-amber-400 transition-colors duration-300">Explicação (Opcional)</CardTitle>
                    <CardDescription>Justificativa da resposta correta</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <AutoTextarea
                  value={formData.explicacao}
                  onChange={(e) => setFormData({ ...formData, explicacao: e.target.value })}
                  placeholder="Explique por que a alternativa selecionada é a correta..."
                  minRows={3}
                  maxRows={10}
                  className="bg-background/50 border-border/50 focus:border-amber-500/50 transition-all"
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Texto Base Manager */}
            <TextoBaseManager
              onSelect={(texto) => setSelectedTextoBase(texto)}
              selectedId={selectedTextoBase?.id}
              mode="select"
            />

            <Card className="group sticky top-6 relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-emerald-500/50 transition-all duration-500 hover:shadow-xl hover:shadow-emerald-500/10 animate-fade-in" style={{ animationDelay: '300ms' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Animated Border */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
              </div>

              <CardHeader className="relative">
                <CardTitle className="text-lg group-hover:text-emerald-400 transition-colors duration-300">Salvar Questão</CardTitle>
                <CardDescription>
                  {selectedTextoBase 
                    ? `Vinculada ao texto: "${selectedTextoBase.titulo || 'Sem título'}"` 
                    : 'A questão será salva como pendente para revisão'}
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <Button 
                  type="submit" 
                  className="w-full gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 transition-all duration-300"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Salvar Questão
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm animate-fade-in" style={{ animationDelay: '350ms' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-400" />
                  Dicas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5" />
                    Escreva enunciados claros e objetivos
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5" />
                    Use alternativas com tamanho similar
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5" />
                    Evite "pegadinhas" ou ambiguidades
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5" />
                    Adicione uma explicação detalhada
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
          </form>
        </TabsContent>
      </Tabs>

      {/* Texto Base Assigner Dialog */}
      <TextoBaseAssigner
        questions={questionsForAssigner}
        onAssign={handleTextoBaseAssign}
        isOpen={textoBaseAssignerOpen}
        onClose={() => setTextoBaseAssignerOpen(false)}
      />
    </div>
  );
}
