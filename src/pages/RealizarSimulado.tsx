import { Header } from "@/components/layout/Header";
import { DottedSurface } from "@/components/ui/dotted-surface";
import { SimuladoTimer } from "@/components/simulado/SimuladoTimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Flag, Send, Zap, BookOpen, Target, CheckCircle2, XCircle, Lightbulb, ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

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
  topic: string;
  text: string;
  options: { letter: string; text: string }[];
  correctAnswer: string;
  explanation?: string;
  origin: string;
  textoBase?: TextoBase | null;
}

const RealizarSimulado = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [simuladoId, setSimuladoId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [corrections, setCorrections] = useState<Record<string, { isCorrect: boolean; correctAnswer: string }>>({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Fetch questions from database
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      const stateData = location.state as {
        simuladoId?: string;
        type?: string;
        engine?: string;
        disciplineId?: string
      } | null;

      if (!stateData?.simuladoId) {
        toast.error("Simulado não encontrado");
        navigate('/simulados');
        return;
      }

      setSimuladoId(stateData.simuladoId);

      try {
        // Fetch the simulado with its questions
        const { data: simulado, error: simuladoError } = await supabase
          .from('simulados')
          .select('*')
          .eq('id', stateData.simuladoId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (simuladoError || !simulado) {
          toast.error("Simulado não encontrado");
          navigate('/simulados');
          return;
        }

        // Check if already finished
        if (simulado.status === 'concluido') {
          navigate('/simulado/resultado', {
            state: {
              simuladoId: simulado.id
            }
          });
          return;
        }

        // Fetch questions for this simulado
        const { data: simuladoQuestoes, error: questoesError } = await supabase
          .from('simulado_questoes')
          .select(`
            ordem,
            questao_id,
            questoes (
              id,
              enunciado,
              tema,
              alternativa_a,
              alternativa_b,
              alternativa_c,
              alternativa_d,
              alternativa_e,
              resposta_correta,
              explicacao,
              origem,
              texto_base_id,
              disciplinas(nome),
              textos_base(id, titulo, conteudo, fonte, autor)
            )
          `)
          .eq('simulado_id', stateData.simuladoId)
          .order('ordem');

        if (questoesError) {
          console.error('Error fetching questions:', questoesError);
        }

        let formattedQuestions: Question[] = [];

        if (simuladoQuestoes && simuladoQuestoes.length > 0) {
          formattedQuestions = simuladoQuestoes
            .filter((sq: any) => sq.questoes)
            .map((sq: any) => {
              // Verifica se a questão TEM texto_base_id E se textos_base foi retornado com id válido
              const hasTextoBaseId = sq.questoes.texto_base_id && sq.questoes.texto_base_id.length > 0;
              const textoBaseData = sq.questoes.textos_base;
              const textoBase = hasTextoBaseId && textoBaseData && textoBaseData.id && textoBaseData.conteudo
                ? textoBaseData
                : null;

              return {
                id: sq.questoes.id,
                discipline: sq.questoes.disciplinas?.nome || 'Geral',
                topic: sq.questoes.tema || 'Tema geral',
                text: sq.questoes.enunciado,
                options: [
                  { letter: 'A', text: sq.questoes.alternativa_a },
                  { letter: 'B', text: sq.questoes.alternativa_b },
                  { letter: 'C', text: sq.questoes.alternativa_c },
                  { letter: 'D', text: sq.questoes.alternativa_d },
                  { letter: 'E', text: sq.questoes.alternativa_e },
                ],
                correctAnswer: sq.questoes.resposta_correta,
                explanation: sq.questoes.explicacao,
                origin: sq.questoes.origem,
                textoBase,
              };
            });
        }

        // If no questions linked, try to fetch random questions based on simulado config
        // Uses unified question bank - only validated questions (status_validacao = 'valida')
        if (formattedQuestions.length === 0) {
          let query = supabase
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
              explicacao,
              origem,
              texto_base_id,
              disciplinas(nome),
              textos_base(id, titulo, conteudo, fonte, autor)
            `)
            .eq('status_validacao', 'valida')
            .limit(simulado.total_questoes || 60);

          if (simulado.disciplina_filtro) {
            query = query.eq('disciplina_id', simulado.disciplina_filtro);
          }

          const { data: randomQuestions, error: randomError } = await query;

          if (!randomError && randomQuestions) {
            // Shuffle questions
            const shuffled = randomQuestions.sort(() => Math.random() - 0.5);

            formattedQuestions = shuffled.map((q: any) => {
              // Verifica se a questão TEM texto_base_id E se textos_base foi retornado com id válido
              const hasTextoBaseId = q.texto_base_id && q.texto_base_id.length > 0;
              const textoBaseData = q.textos_base;
              const textoBase = hasTextoBaseId && textoBaseData && textoBaseData.id && textoBaseData.conteudo
                ? textoBaseData
                : null;

              return {
                id: q.id,
                discipline: q.disciplinas?.nome || 'Geral',
                topic: q.tema || 'Tema geral',
                text: q.enunciado,
                options: [
                  { letter: 'A', text: q.alternativa_a },
                  { letter: 'B', text: q.alternativa_b },
                  { letter: 'C', text: q.alternativa_c },
                  { letter: 'D', text: q.alternativa_d },
                  { letter: 'E', text: q.alternativa_e },
                ],
                correctAnswer: q.resposta_correta,
                explanation: q.explicacao,
                origin: q.origem,
                textoBase,
              };
            });

            // Link questions to simulado
            if (formattedQuestions.length > 0) {
              const linksToInsert = formattedQuestions.map((q, index) => ({
                simulado_id: stateData.simuladoId,
                questao_id: q.id,
                ordem: index + 1,
              }));

              await supabase.from('simulado_questoes').insert(linksToInsert);
            }
          }
        }

        // Fetch any existing answers
        const { data: existingAnswers } = await supabase
          .from('respostas')
          .select('questao_id, resposta_usuario, esta_correta')
          .eq('simulado_id', stateData.simuladoId)
          .eq('user_id', user.id);

        if (existingAnswers) {
          const answersMap: Record<string, string> = {};
          const correctionsMap: Record<string, { isCorrect: boolean; correctAnswer: string }> = {};

          existingAnswers.forEach((ans: any) => {
            answersMap[ans.questao_id] = ans.resposta_usuario;
            const question = formattedQuestions.find(q => q.id === ans.questao_id);
            if (question) {
              correctionsMap[ans.questao_id] = {
                isCorrect: ans.esta_correta,
                correctAnswer: question.correctAnswer
              };
            }
          });

          setAnswers(answersMap);
          setCorrections(correctionsMap);
        }

        setQuestions(formattedQuestions);
      } catch (error) {
        console.error('Error loading simulado:', error);
        toast.error("Erro ao carregar simulado");
        navigate('/simulados');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [user, location.state, navigate]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading || questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="relative inline-block mb-4">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
            </div>
            <p className="text-muted-foreground">
              {loading ? 'Carregando questões...' : 'Nenhuma questão disponível para este simulado'}
            </p>
            {!loading && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate('/simulados')}
              >
                Voltar aos Simulados
              </Button>
            )}
          </div>
        </main>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const currentCorrection = corrections[question.id];
  const isAnswered = answers[question.id] !== undefined;

  const handleAnswer = async (value: string) => {
    if (corrections[question.id] || !user || !simuladoId) return;

    setAnswers((prev) => ({ ...prev, [question.id]: value }));

    // Correção instantânea
    const isCorrect = value === question.correctAnswer;
    setCorrections((prev) => ({
      ...prev,
      [question.id]: { isCorrect, correctAnswer: question.correctAnswer }
    }));

    // Save answer to database
    try {
      await supabase.from('respostas').insert({
        user_id: user.id,
        questao_id: question.id,
        simulado_id: simuladoId,
        resposta_selecionada: value,
        esta_correta: isCorrect,
        tempo_resposta_segundos: timeElapsed
      });
    } catch (error) {
      console.error('Error saving answer:', error);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const handleFlag = () => {
    setFlagged((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestion)) {
        newSet.delete(currentQuestion);
      } else {
        newSet.add(currentQuestion);
      }
      return newSet;
    });
  };

  const handleFinish = async () => {
    if (!user || !simuladoId) return;

    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      toast.warning(`Você ainda tem ${questions.length - answeredCount} questões sem resposta.`);
      return;
    }

    setSubmitting(true);

    try {
      // Calculate results
      let correct = 0;
      questions.forEach((q) => {
        if (answers[q.id] === q.correctAnswer) {
          correct++;
        }
      });

      const pontuacao = Math.round((correct / questions.length) * 100);

      // Update simulado status
      await supabase
        .from('simulados')
        .update({
          status: 'concluido',
          pontuacao,
          acertos: correct,
          erros: questions.length - correct,
          data_fim: new Date().toISOString()
        })
        .eq('id', simuladoId)
        .eq('user_id', user.id);

      toast.success(`Simulado concluído! ${correct}/${questions.length} (${pontuacao}%)`);

      navigate("/simulado/resultado", {
        state: {
          answers,
          questions,
          correct,
          total: questions.length,
          simuladoId
        },
      });
    } catch (error) {
      console.error('Error finishing simulado:', error);
      toast.error("Erro ao finalizar simulado");
    } finally {
      setSubmitting(false);
    }
  };

  const getOptionStyle = (optionLetter: string) => {
    const userAnswer = answers[question.id];
    const correction = corrections[question.id];

    if (!correction) {
      return userAnswer === optionLetter
        ? "border-primary bg-primary/10 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)]"
        : "border-border/50 hover:border-primary/50 hover:bg-primary/5";
    }

    if (optionLetter === correction.correctAnswer) {
      return "border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]";
    }

    if (userAnswer === optionLetter && !correction.isCorrect) {
      return "border-destructive bg-destructive/10 shadow-[0_0_20px_-5px_hsl(var(--destructive)/0.4)]";
    }

    return "border-border/30 bg-muted/20 opacity-60";
  };

  const getLetterStyle = (optionLetter: string) => {
    const userAnswer = answers[question.id];
    const correction = corrections[question.id];

    if (!correction) {
      return userAnswer === optionLetter
        ? "bg-primary text-primary-foreground"
        : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary";
    }

    if (optionLetter === correction.correctAnswer) {
      return "bg-emerald-500 text-white";
    }

    if (userAnswer === optionLetter && !correction.isCorrect) {
      return "bg-destructive text-destructive-foreground";
    }

    return "bg-muted/50 text-muted-foreground";
  };

  const getNavigatorStyle = (index: number, questionId: string) => {
    const correction = corrections[questionId];

    if (currentQuestion === index) {
      return "bg-primary text-primary-foreground shadow-[0_0_15px_-3px_hsl(var(--primary))] scale-110";
    }

    if (correction) {
      return correction.isCorrect
        ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/30"
        : "bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30";
    }

    if (flagged.has(index)) {
      return "bg-orange-500/20 text-orange-500 border-2 border-orange-500/50 hover:bg-orange-500/30";
    }

    return "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/50";
  };

  return (
    <>
      <DottedSurface />
      <div className="min-h-screen flex flex-col w-full relative">
        <Header />
        <main className="flex-1 container py-6">
          {/* Botão Voltar */}
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 hover:bg-primary/10 transition-all duration-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          {/* Progress Bar com efeito tecnológico */}
          <div className="mb-6 animate-fade-in">
            <div className="relative p-4 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
              <div className="relative flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    Questão <span className="text-primary font-bold">{currentQuestion + 1}</span> de {questions.length}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <SimuladoTimer initialTime={timeElapsed} onTimeUpdate={setTimeElapsed} />
                  <Badge
                    variant={flagged.has(currentQuestion) ? "destructive" : "outline"}
                    className={cn(flagged.size > 0 && "bg-orange-500/20 text-orange-500 border-orange-500/30")}
                  >
                    <Flag className="h-3 w-3 mr-1" />
                    {flagged.size} marcadas
                  </Badge>
                </div>
              </div>
              <div className="relative">
                <Progress value={progress} className="h-2.5 bg-muted/50" />
                <div
                  className="absolute top-0 h-2.5 bg-gradient-to-r from-primary/50 to-primary rounded-full transition-all duration-300 blur-sm"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Question Card */}
            <div className="lg:col-span-3">
              <Card className="animate-fade-in relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
                <CardHeader className="border-b border-border/50 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-zinc-700 text-foreground bg-transparent mb-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-flag h-3 w-3 mr-1">
                            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                            <line x1="4" x2="4" y1="22" y2="15"></line>
                          </svg>
                          {question.discipline}
                        </div>
                        <CardTitle className="text-base font-normal text-muted-foreground mt-1">
                          {question.topic}
                        </CardTitle>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentCorrection && (
                        <div className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-zinc-700 text-foreground bg-transparent animate-scale-in">
                          {currentCorrection.isCorrect ? (
                            <><CheckCircle2 className="h-3 w-3 mr-1" /> Correto</>
                          ) : (
                            <><XCircle className="h-3 w-3 mr-1" /> Incorreto</>
                          )}
                        </div>
                      )}
                      <Button
                        variant={flagged.has(currentQuestion) ? "destructive" : "outline"}
                        size="sm"
                        onClick={handleFlag}
                        className={cn(
                          "transition-all duration-300",
                          flagged.has(currentQuestion)
                            ? "bg-destructive/20 border-destructive/50 hover:bg-destructive/30"
                            : "hover:border-orange-500/50 hover:text-orange-500"
                        )}
                      >
                        <Flag className="h-4 w-4 mr-2" />
                        {flagged.has(currentQuestion) ? "Marcada" : "Marcar"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 relative">
                  {/* Texto Base (quando existir) */}
                  {question.textoBase && (
                    <div className="mb-6 p-5 rounded-xl bg-blue-500/5 border border-blue-500/20 animate-fade-in">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <BookOpen className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-blue-500">
                            {question.textoBase.titulo || 'Texto Base'}
                          </span>
                          {(question.textoBase.autor || question.textoBase.fonte) && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {question.textoBase.autor && <span>{question.textoBase.autor}</span>}
                              {question.textoBase.autor && question.textoBase.fonte && <span> • </span>}
                              {question.textoBase.fonte && <span>{question.textoBase.fonte}</span>}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="prose prose-sm max-w-none text-foreground/90 whitespace-pre-wrap">
                        {question.textoBase.conteudo}
                      </div>
                    </div>
                  )}

                  {/* Enunciado da Questão */}
                  <div className="mb-6 p-4 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-lg text-foreground leading-relaxed">{question.text}</p>
                  </div>

                  <RadioGroup
                    value={answers[question.id] || ""}
                    onValueChange={handleAnswer}
                    className="space-y-3"
                    disabled={!!currentCorrection}
                  >
                    {question.options.map((option, index) => (
                      <div
                        key={option.letter}
                        className={cn(
                          "group flex items-start space-x-3 p-4 rounded-xl border-2 transition-all duration-300",
                          currentCorrection ? "" : "cursor-pointer",
                          getOptionStyle(option.letter)
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                        onClick={() => !currentCorrection && handleAnswer(option.letter)}
                      >
                        <RadioGroupItem
                          value={option.letter}
                          id={option.letter}
                          className="mt-1"
                          disabled={!!currentCorrection}
                        />
                        <Label htmlFor={option.letter} className={cn("flex-1", !currentCorrection && "cursor-pointer")}>
                          <span className={cn("inline-flex items-center justify-center h-6 w-6 rounded-md mr-3 text-sm font-bold transition-colors", getLetterStyle(option.letter))}>
                            {option.letter}
                          </span>
                          <span className="text-foreground">{option.text}</span>
                          {currentCorrection && option.letter === currentCorrection.correctAnswer && (
                            <CheckCircle2 className="inline-block ml-2 h-4 w-4 text-emerald-500" />
                          )}
                          {currentCorrection && !currentCorrection.isCorrect && answers[question.id] === option.letter && (
                            <XCircle className="inline-block ml-2 h-4 w-4 text-destructive" />
                          )}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>

                  {/* Explicação da Questão */}
                  {currentCorrection && question.explanation && (
                    <div className="mt-6 animate-fade-in">
                      <div className={cn(
                        "p-4 rounded-xl border-2",
                        currentCorrection.isCorrect
                          ? "bg-emerald-500/5 border-emerald-500/30"
                          : "bg-amber-500/5 border-amber-500/30"
                      )}>
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            currentCorrection.isCorrect
                              ? "bg-emerald-500/20 text-emerald-500"
                              : "bg-amber-500/20 text-amber-500"
                          )}>
                            <Lightbulb className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className={cn(
                              "font-semibold mb-2",
                              currentCorrection.isCorrect ? "text-emerald-500" : "text-amber-500"
                            )}>
                              {currentCorrection.isCorrect ? "Parabéns! Você acertou!" : "Explicação da Resposta"}
                            </h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {question.explanation}
                            </p>
                            <p className="mt-2 text-sm font-medium text-foreground">
                              Resposta correta: <span className="text-emerald-500 font-bold">{currentCorrection.correctAnswer}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/50">
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={currentQuestion === 0}
                      className="border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Anterior
                    </Button>

                    {currentQuestion === questions.length - 1 ? (
                      <Button
                        onClick={handleFinish}
                        disabled={submitting}
                        className="gap-2 shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Finalizando...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Finalizar Simulado
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleNext}
                        className="gap-2 shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300"
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Question Navigator */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24 animate-fade-in border-border/50 bg-card/80 backdrop-blur-sm" style={{ animationDelay: '200ms' }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Navegação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-2">
                    {questions.map((q, index) => (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQuestion(index)}
                        className={cn(
                          "h-10 rounded-lg font-medium text-sm transition-all duration-300",
                          getNavigatorStyle(index, q.id)
                        )}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="h-3 w-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
                      <span className="text-muted-foreground">Correta</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="h-3 w-3 rounded bg-destructive/30 border border-destructive/50" />
                      <span className="text-muted-foreground">Incorreta</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="h-3 w-3 rounded bg-orange-500/30 border border-orange-500/50" />
                      <span className="text-muted-foreground">Marcada</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default RealizarSimulado;
