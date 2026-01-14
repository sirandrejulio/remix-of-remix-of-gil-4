import { Header } from "@/components/layout/Header";
import { DottedSurface } from "@/components/ui/dotted-surface";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Filter, BookOpen, ArrowLeft, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, History, Loader2, Zap, Target, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { QuestoesRespondidas } from "@/components/dashboard/QuestoesRespondidas";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 10;

interface TextoBase {
  id: string;
  titulo: string | null;
  conteudo: string;
  fonte: string | null;
  autor: string | null;
}

interface Question {
  id: string;
  discipline: string;
  disciplineId: string | null;
  topic: string;
  preview: string;
  fullText: string;
  alternatives: { letter: string; text: string }[];
  correctAnswer: string;
  origin: string;
  level: string;
  textoBase?: TextoBase | null;
}

interface Discipline {
  id: string;
  nome: string;
}

const Questoes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState("all");
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch disciplines
  useEffect(() => {
    const fetchDisciplines = async () => {
      const { data, error } = await supabase
        .from('disciplinas')
        .select('id, nome')
        .order('nome');
      
      if (!error && data) {
        setDisciplines(data);
      }
    };
    fetchDisciplines();
  }, []);

  // Fetch questions
  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('questoes')
          .select(`
            id,
            enunciado,
            tema,
            alternativa_a,
            alternativa_b,
            alternativa_c,
            alternativa_d,
            alternativa_e,
            resposta_correta,
            origem,
            nivel,
            disciplina_id,
            disciplinas(nome),
            textos_base(id, titulo, conteudo, fonte, autor)
          `)
          .eq('status_validacao', 'valida')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        const formattedQuestions: Question[] = (data || []).map((q: any) => ({
          id: q.id,
          discipline: q.disciplinas?.nome || 'Sem disciplina',
          disciplineId: q.disciplina_id,
          topic: q.tema || 'Tema geral',
          preview: q.enunciado.substring(0, 100) + (q.enunciado.length > 100 ? '...' : ''),
          fullText: q.enunciado,
          alternatives: [
            { letter: 'A', text: q.alternativa_a },
            { letter: 'B', text: q.alternativa_b },
            { letter: 'C', text: q.alternativa_c },
            { letter: 'D', text: q.alternativa_d },
            { letter: 'E', text: q.alternativa_e },
          ],
          correctAnswer: q.resposta_correta,
          origin: q.origem,
          level: q.nivel === 'facil' ? 'Fácil' : q.nivel === 'medio' ? 'Médio' : 'Difícil',
          textoBase: q.textos_base || null,
        }));

        setQuestions(formattedQuestions);
      } catch (error) {
        console.error('Error fetching questions:', error);
        toast.error('Erro ao carregar questões');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchesSearch =
        q.topic.toLowerCase().includes(search.toLowerCase()) ||
        q.preview.toLowerCase().includes(search.toLowerCase()) ||
        q.fullText.toLowerCase().includes(search.toLowerCase());
      const matchesDiscipline =
        disciplineFilter === "all" || q.disciplineId === disciplineFilter;
      return matchesSearch && matchesDiscipline;
    });
  }, [questions, search, disciplineFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, disciplineFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE);
  const paginatedQuestions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredQuestions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredQuestions, currentPage]);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const handleSelectQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const handleAnswerSelect = (letter: string) => {
    if (showResult) return;
    setSelectedAnswer(letter);
  };

  const handleConfirmAnswer = async () => {
    if (!selectedAnswer || !selectedQuestion || !user) return;
    
    setSaving(true);
    const isCorrect = selectedAnswer === selectedQuestion.correctAnswer;
    
    try {
      // Create a practice session entry (using a special simulado for practice)
      const { data: simulado, error: simuladoError } = await supabase
        .from('simulados')
        .select('id')
        .eq('user_id', user.id)
        .eq('tipo', 'pratica_avulsa')
        .eq('status', 'em_andamento')
        .maybeSingle();

      let simuladoId = simulado?.id;

      if (!simuladoId) {
        const { data: newSimulado, error: createError } = await supabase
          .from('simulados')
          .insert({
            user_id: user.id,
            titulo: 'Prática Avulsa',
            tipo: 'pratica_avulsa',
            total_questoes: 0,
            status: 'em_andamento'
          })
          .select('id')
          .single();

        if (createError) throw createError;
        simuladoId = newSimulado.id;
      }

      // Record the answer
      const { error: answerError } = await supabase
        .from('respostas')
        .insert({
          user_id: user.id,
          questao_id: selectedQuestion.id,
          simulado_id: simuladoId,
          resposta_selecionada: selectedAnswer,
          esta_correta: isCorrect,
          tempo_resposta_segundos: 0
        });

      if (answerError) throw answerError;

      setShowResult(true);
      
      if (isCorrect) {
        toast.success('Resposta correta!');
      } else {
        toast.error(`Incorreta. A resposta correta é ${selectedQuestion.correctAnswer}.`);
      }
    } catch (error) {
      console.error('Error saving answer:', error);
      toast.error('Erro ao salvar resposta');
      setShowResult(true);
    } finally {
      setSaving(false);
    }
  };

  const handleNextQuestion = () => {
    const currentIndex = filteredQuestions.findIndex(q => q.id === selectedQuestion?.id);
    if (currentIndex < filteredQuestions.length - 1) {
      handleSelectQuestion(filteredQuestions[currentIndex + 1]);
    }
  };

  return (
    <>
    <DottedSurface />
    <div className="min-h-screen flex flex-col w-full relative">
      <Header />
      <main className="flex-1 container py-6 lg:py-8">
        {/* Back Button */}
        <div className="mb-6 animate-fade-in">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>

        {/* Header com efeito glow */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4 animate-fade-in relative" style={{ animationDelay: '50ms' }}>
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600/50 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <BookOpen className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">Banco de Questões</h1>
              <p className="text-muted-foreground">
                Pratique e resolva questões por disciplina.
              </p>
            </div>
          </div>
          <Link to="/questoes/nova">
            <Button className="gap-2 shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300">
              <Plus className="h-4 w-4" />
              Nova Questão
            </Button>
          </Link>
        </div>

        {/* Tabs para Praticar e Histórico */}
        <Tabs defaultValue="praticar" className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          <TabsList className="mb-6 bg-muted/50 backdrop-blur-sm border border-border/50">
            <TabsTrigger value="praticar" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BookOpen className="h-4 w-4" />
              Praticar Questões
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <History className="h-4 w-4" />
              Questões Respondidas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="praticar">
            {/* Layout de duas colunas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Coluna Esquerda - Lista e Filtros */}
              <div className="lg:col-span-5 space-y-4">
                {/* Filters */}
                <Card className="animate-fade-in group relative overflow-hidden hover:shadow-lg transition-all duration-500" style={{ animationDelay: '150ms' }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <CardContent className="pt-4 pb-3 relative">
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por tema ou conteúdo..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="pl-10 border-border/50 focus:border-primary transition-colors"
                        />
                      </div>
                      <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
                        <SelectTrigger className="border-border/50 focus:border-primary">
                          <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                          <SelectValue placeholder="Filtrar por disciplina" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as Disciplinas</SelectItem>
                          {disciplines.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Questions List */}
                <Card className="animate-fade-in group relative overflow-hidden hover:shadow-xl transition-all duration-500 flex flex-col" style={{ animationDelay: '200ms' }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-emerald-500/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <CardHeader className="pb-2 relative">
                    <CardTitle className="text-base flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Target className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div>
                        <span className="block">Questões</span>
                        <span className="text-xs font-normal text-muted-foreground">{filteredQuestions.length} disponíveis</span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 relative flex-1 flex flex-col overflow-hidden">
                    <ScrollArea className="h-[400px]">
                      <div className="p-3 space-y-2">
                        {loading ? (
                          <div className="py-8 text-center">
                            <div className="relative inline-block">
                              <Loader2 className="h-10 w-10 text-primary animate-spin" />
                              <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
                            </div>
                            <p className="text-sm text-muted-foreground mt-3">
                              Carregando questões...
                            </p>
                          </div>
                        ) : filteredQuestions.length === 0 ? (
                          <div className="py-8 text-center">
                            <div className="h-16 w-16 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                              <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Nenhuma questão encontrada
                            </p>
                          </div>
                        ) : (
                          paginatedQuestions.map((question, index) => (
                            <div
                              key={question.id}
                              className={cn(
                                "p-3 rounded-xl border cursor-pointer transition-all duration-300 animate-fade-in",
                                "hover:shadow-lg",
                                selectedQuestion?.id === question.id
                                  ? "border-primary/50 bg-gradient-to-br from-primary/10 to-primary/5 shadow-[0_0_20px_hsl(var(--primary)/0.1)]"
                                  : "border-border hover:border-primary/30 hover:bg-muted/30"
                              )}
                              style={{ animationDelay: `${index * 30}ms` }}
                              onClick={() => handleSelectQuestion(question)}
                            >
                              <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                    <Badge 
                                      variant="secondary" 
                                      className={cn(
                                        "text-xs transition-all duration-300",
                                        selectedQuestion?.id === question.id && "bg-primary/20 text-primary"
                                      )}
                                    >
                                      {question.discipline}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {question.topic}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {question.preview}
                                  </p>
                                </div>
                                <ChevronRight className={cn(
                                  "h-4 w-4 text-muted-foreground flex-shrink-0 mt-1 transition-all duration-300",
                                  selectedQuestion?.id === question.id && "text-primary rotate-90"
                                )} />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-3 py-2 border-t border-border/50 bg-muted/20">
                        <div className="text-xs text-muted-foreground">
                          {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredQuestions.length)} de {filteredQuestions.length}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="h-7 w-7 p-0 hover:bg-primary/10"
                          >
                            <ChevronsLeft className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="h-7 w-7 p-0 hover:bg-primary/10"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </Button>
                          
                          {getPageNumbers().map((page, index) => (
                            typeof page === 'number' ? (
                              <Button
                                key={index}
                                variant={currentPage === page ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className={cn(
                                  "h-7 w-7 p-0 text-xs",
                                  currentPage === page ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/10'
                                )}
                              >
                                {page}
                              </Button>
                            ) : (
                              <span key={index} className="px-1 text-muted-foreground text-xs">...</span>
                            )
                          ))}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="h-7 w-7 p-0 hover:bg-primary/10"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="h-7 w-7 p-0 hover:bg-primary/10"
                          >
                            <ChevronsRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Coluna Direita - Área de Resolução */}
              <div className="lg:col-span-7 animate-fade-in" style={{ animationDelay: '250ms' }}>
                <Card className="h-full min-h-[500px] group relative overflow-hidden hover:shadow-2xl transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/5 blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
                  
                  {selectedQuestion ? (
                    <>
                      <CardHeader className="pb-3 relative border-b border-border/40">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-primary/20 text-primary border-0">{selectedQuestion.discipline}</Badge>
                            <Badge variant="outline">{selectedQuestion.topic}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                selectedQuestion.origin === "MANUAL"
                                  ? "secondary"
                                  : selectedQuestion.origin === "GOOGLE_GEMINI"
                                  ? "secondary"
                                  : "default"
                              }
                              className={cn(
                                selectedQuestion.origin === "GOOGLE_GEMINI" && "bg-violet-500/20 text-violet-600",
                                selectedQuestion.origin === "IA_PRINCIPAL" && "bg-primary/20 text-primary"
                              )}
                            >
                              {selectedQuestion.origin === "MANUAL"
                                ? "Manual"
                                : selectedQuestion.origin === "GOOGLE_GEMINI"
                                ? "Gemini"
                                : "IA Principal"}
                            </Badge>
                            <Badge 
                              variant="outline"
                              className={cn(
                                selectedQuestion.level === "Fácil" && "border-emerald-500/30 text-emerald-600",
                                selectedQuestion.level === "Médio" && "border-amber-500/30 text-amber-600",
                                selectedQuestion.level === "Difícil" && "border-destructive/30 text-destructive"
                              )}
                            >
                              {selectedQuestion.level}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4 relative">
                        {/* Texto Base (se houver) */}
                        {selectedQuestion.textoBase && (
                          <div className="p-5 rounded-xl bg-blue-500/5 border border-blue-500/20 animate-fade-in">
                            <div className="flex items-start gap-3 mb-3">
                              <div className="p-2 rounded-lg bg-blue-500/10">
                                <BookOpen className="h-4 w-4 text-blue-500" />
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-blue-500">
                                  {selectedQuestion.textoBase.titulo || 'Texto Base'}
                                </span>
                                {(selectedQuestion.textoBase.autor || selectedQuestion.textoBase.fonte) && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {selectedQuestion.textoBase.autor && <span>{selectedQuestion.textoBase.autor}</span>}
                                    {selectedQuestion.textoBase.autor && selectedQuestion.textoBase.fonte && <span> • </span>}
                                    {selectedQuestion.textoBase.fonte && <span>{selectedQuestion.textoBase.fonte}</span>}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="prose prose-sm max-w-none text-foreground/90 whitespace-pre-wrap">
                              {selectedQuestion.textoBase.conteudo}
                            </div>
                          </div>
                        )}

                        {/* Enunciado */}
                        <div className="p-4 rounded-xl bg-gradient-to-br from-muted/60 to-muted/30 border border-border/50">
                          <p className="text-foreground leading-relaxed">
                            {selectedQuestion.fullText}
                          </p>
                        </div>

                        {/* Alternativas */}
                        <div className="space-y-2">
                          {selectedQuestion.alternatives.map((alt, index) => {
                            const isSelected = selectedAnswer === alt.letter;
                            const isCorrect = alt.letter === selectedQuestion.correctAnswer;
                            const showCorrect = showResult && isCorrect;
                            const showWrong = showResult && isSelected && !isCorrect;

                            return (
                              <button
                                key={alt.letter}
                                onClick={() => handleAnswerSelect(alt.letter)}
                                className={cn(
                                  "w-full p-3 rounded-xl border text-left transition-all duration-300 animate-fade-in",
                                  "flex items-start gap-3 hover:shadow-lg",
                                  !showResult && isSelected && "border-primary/50 bg-gradient-to-br from-primary/10 to-primary/5 shadow-[0_0_15px_hsl(var(--primary)/0.1)]",
                                  !showResult && !isSelected && "hover:border-primary/30 hover:bg-muted/30",
                                  showCorrect && "border-emerald-500/50 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 shadow-[0_0_20px_hsl(142_71%_45%/0.15)]",
                                  showWrong && "border-destructive/50 bg-gradient-to-br from-destructive/15 to-destructive/5",
                                  showResult && !showCorrect && !showWrong && "opacity-50"
                                )}
                                style={{ animationDelay: `${index * 50}ms` }}
                              >
                                <span className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0 transition-all duration-300",
                                  !showResult && isSelected && "bg-primary text-primary-foreground shadow-lg",
                                  !showResult && !isSelected && "bg-muted text-muted-foreground",
                                  showCorrect && "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30",
                                  showWrong && "bg-destructive text-white",
                                  showResult && !showCorrect && !showWrong && "bg-muted text-muted-foreground"
                                )}>
                                  {alt.letter}
                                </span>
                                <span className={cn(
                                  "flex-1 text-sm pt-1.5",
                                  showCorrect && "text-emerald-700 font-medium",
                                  showWrong && "text-destructive"
                                )}>
                                  {alt.text}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex items-center gap-3 pt-2">
                          {!showResult ? (
                            <Button
                              onClick={handleConfirmAnswer}
                              disabled={!selectedAnswer || saving}
                              className={cn(
                                "flex-1 h-11 font-semibold shadow-lg transition-all duration-300",
                                "hover:shadow-xl hover:shadow-primary/25 hover:scale-[1.01]"
                              )}
                            >
                              {saving ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Salvando...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  Confirmar Resposta
                                </>
                              )}
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedAnswer(null);
                                  setShowResult(false);
                                }}
                                className="flex-1 h-11"
                              >
                                Tentar Novamente
                              </Button>
                              <Button
                                onClick={handleNextQuestion}
                                className="flex-1 h-11 gap-2 font-semibold shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all"
                              >
                                Próxima Questão
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>

                        {/* Feedback */}
                        {showResult && (
                          <div className={cn(
                            "p-4 rounded-xl border animate-fade-in",
                            selectedAnswer === selectedQuestion.correctAnswer
                              ? "border-emerald-500/50 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 shadow-[0_0_25px_hsl(142_71%_45%/0.1)]"
                              : "border-destructive/50 bg-gradient-to-br from-destructive/15 to-destructive/5"
                          )}>
                            <p className={cn(
                              "font-semibold flex items-center gap-2",
                              selectedAnswer === selectedQuestion.correctAnswer
                                ? "text-emerald-600"
                                : "text-destructive"
                            )}>
                              {selectedAnswer === selectedQuestion.correctAnswer ? (
                                <>
                                  <Zap className="h-5 w-5" />
                                  Resposta correta! Parabéns!
                                </>
                              ) : (
                                `✗ Resposta incorreta. A alternativa correta é ${selectedQuestion.correctAnswer}.`
                              )}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6 relative">
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-64 h-64 rounded-full bg-primary/5 blur-3xl animate-pulse" />
                      </div>
                      <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 relative shadow-xl shadow-primary/10">
                        <BookOpen className="h-10 w-10 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        Selecione uma questão
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Escolha uma questão na lista à esquerda para visualizar e resolver.
                      </p>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="historico" className="animate-fade-in">
            <Card className="overflow-hidden hover:shadow-xl transition-all duration-500">
              <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b border-border/40">
                <CardTitle className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <History className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="block">Questões Respondidas</span>
                    <span className="text-sm font-normal text-muted-foreground">Seu histórico de prática</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <QuestoesRespondidas />
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </main>
      <Footer />
    </div>
    </>
  );
};

export default Questoes;
