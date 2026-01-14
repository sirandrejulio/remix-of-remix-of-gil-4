import { useState } from "react";
import { DottedSurface } from "@/components/ui/dotted-surface";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { CheckCircle, XCircle, Home, RotateCcw, TrendingUp, Trophy, Target, Zap, BookOpen, AlertCircle, Filter } from "lucide-react";

type FilterType = "all" | "correct" | "incorrect";

const ResultadoSimulado = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>("all");

  const { answers, questions, correct, total } = location.state || {
    answers: {},
    questions: [],
    correct: 0,
    total: 0,
  };

  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Função auxiliar para comparar respostas de forma normalizada
  const isAnswerCorrect = (questionId: string, correctAnswer: string): boolean => {
    const userAnswer = answers[questionId];
    // Se não há resposta do usuário, é incorreta
    if (userAnswer === undefined || userAnswer === null || userAnswer === '') return false;
    // Se não há resposta correta definida, não podemos determinar
    if (!correctAnswer) return false;
    return String(userAnswer).trim().toUpperCase() === String(correctAnswer).trim().toUpperCase();
  };

  const correctQuestions = questions.filter(
    (q: any) => isAnswerCorrect(q.id, q.correctAnswer)
  );
  const incorrectQuestions = questions.filter(
    (q: any) => !isAnswerCorrect(q.id, q.correctAnswer)
  );

  const filteredQuestions = filter === "all"
    ? questions
    : filter === "correct"
      ? correctQuestions
      : incorrectQuestions;
  return (
    <>
      <DottedSurface />
      <div className="min-h-screen flex flex-col w-full relative">
        <Header />
        <main className="flex-1 container py-8">
          {/* Header com efeito tecnológico */}
          <div className="mb-8 text-center animate-fade-in">
            <div className="inline-flex items-center justify-center p-3 rounded-xl bg-primary/10 border border-primary/20 mb-4">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Resultado do Simulado</h1>
            <p className="text-muted-foreground mt-1">
              Confira seu desempenho e analise seus erros.
            </p>
          </div>

          {/* Score Card */}
          <Card className="max-w-md mx-auto mb-8 relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            <div className={`absolute top-0 right-0 w-40 h-40 rounded-bl-full opacity-30 ${percentage >= 70
              ? "bg-gradient-to-bl from-emerald-500/30 to-transparent"
              : percentage >= 50
                ? "bg-gradient-to-bl from-primary/30 to-transparent"
                : "bg-gradient-to-bl from-destructive/30 to-transparent"
              }`} />
            <CardContent className="pt-8 text-center relative">
              <div className="relative inline-block mb-4">
                <div
                  className={`inline-flex items-center justify-center h-36 w-36 rounded-full transition-all duration-500 ${percentage >= 70
                    ? "bg-emerald-500/10 text-emerald-500 shadow-[0_0_40px_-10px_hsl(142,76%,36%)]"
                    : percentage >= 50
                      ? "bg-primary/10 text-primary shadow-[0_0_40px_-10px_hsl(var(--primary))]"
                      : "bg-destructive/10 text-destructive shadow-[0_0_40px_-10px_hsl(var(--destructive))]"
                    }`}
                >
                  <div className="text-center">
                    <span className="text-5xl font-bold">{percentage}</span>
                    <span className="text-2xl">%</span>
                  </div>
                </div>
                <div className={`absolute -bottom-1 -right-1 p-2 rounded-full ${percentage >= 70
                  ? "bg-emerald-500 text-white"
                  : percentage >= 50
                    ? "bg-primary text-primary-foreground"
                    : "bg-destructive text-destructive-foreground"
                  }`}>
                  {percentage >= 70 ? (
                    <Trophy className="h-5 w-5" />
                  ) : percentage >= 50 ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <Target className="h-5 w-5" />
                  )}
                </div>
              </div>

              <h2 className="text-2xl font-bold text-foreground mb-2">
                <span className={percentage >= 70 ? "text-emerald-500" : percentage >= 50 ? "text-primary" : "text-destructive"}>
                  {correct}
                </span> de {total} questões
              </h2>

              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${percentage >= 70
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                : percentage >= 50
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-destructive/10 text-destructive border border-destructive/30"
                }`}>
                <Zap className="h-4 w-4" />
                {percentage >= 70
                  ? "Excelente desempenho! Continue assim!"
                  : percentage >= 50
                    ? "Bom progresso! Revise os pontos fracos."
                    : "Foco nos estudos! Analise seus erros."}
              </div>

              <div className="flex justify-center gap-4 mt-8">
                <Link to="/dashboard">
                  <Button variant="outline" className="gap-2 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300">
                    <Home className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <Link to="/simulados">
                  <Button className="gap-2 relative group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-foreground/0 via-primary-foreground/10 to-primary-foreground/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                    <RotateCcw className="h-4 w-4" />
                    Novo Simulado
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for Results */}
          <Tabs defaultValue="gabarito" className="max-w-4xl mx-auto animate-fade-in" style={{ animationDelay: '200ms' }}>
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 backdrop-blur-sm border border-border/50">
              <TabsTrigger value="gabarito" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <BookOpen className="h-4 w-4 mr-2" />
                Gabarito
              </TabsTrigger>
              <TabsTrigger value="erros" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <AlertCircle className="h-4 w-4 mr-2" />
                Análise de Erros ({incorrectQuestions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gabarito" className="mt-6">
              <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
                <CardHeader className="relative">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Gabarito Final</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Confira as respostas corretas
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
                    {questions.map((q: any, index: number) => {
                      const isCorrect = isAnswerCorrect(q.id, q.correctAnswer);
                      return (
                        <div
                          key={q.id}
                          className={`group flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${isCorrect
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:shadow-[0_0_15px_-3px_hsl(142,76%,36%)]"
                            : "bg-destructive/10 text-destructive border-destructive/30 hover:shadow-[0_0_15px_-3px_hsl(var(--destructive))]"
                            }`}
                          style={{ animationDelay: `${index * 30}ms` }}
                        >
                          <span className="text-xs text-muted-foreground mb-1">
                            Q{index + 1}
                          </span>
                          <span className="font-bold text-lg">{q.correctAnswer}</span>
                          {isCorrect ? (
                            <CheckCircle className="h-3 w-3 mt-1 opacity-70" />
                          ) : (
                            <XCircle className="h-3 w-3 mt-1 opacity-70" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="erros" className="mt-6 space-y-4">
              {/* Filtro */}
              <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Filtrar por:</span>
                    <Select value={filter} onValueChange={(value: FilterType) => setFilter(value)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Selecionar filtro" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas ({questions.length})</SelectItem>
                        <SelectItem value="correct">Certas ({correctQuestions.length})</SelectItem>
                        <SelectItem value="incorrect">Erradas ({incorrectQuestions.length})</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {filteredQuestions.length === 0 ? (
                <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
                  <CardContent className="py-12 text-center relative">
                    <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-4 shadow-[0_0_30px_-5px_hsl(142,76%,36%)]">
                      <CheckCircle className="h-10 w-10 text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      {filter === "incorrect" ? "Parabéns!" : "Nenhuma questão encontrada"}
                    </h3>
                    <p className="text-muted-foreground mt-2">
                      {filter === "incorrect"
                        ? "Você acertou todas as questões!"
                        : filter === "correct"
                          ? "Você não acertou nenhuma questão."
                          : "Não há questões para exibir."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredQuestions.map((q: any, index: number) => {
                  const isCorrect = isAnswerCorrect(q.id, q.correctAnswer);
                  return (
                    <Card
                      key={q.id}
                      className={`relative overflow-hidden bg-card/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300 ${isCorrect
                        ? "border-emerald-500/20 hover:shadow-emerald-500/5"
                        : "border-destructive/20 hover:shadow-destructive/5"
                        }`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br via-transparent to-transparent pointer-events-none ${isCorrect ? "from-emerald-500/5" : "from-destructive/5"
                        }`} />
                      <CardHeader className="pb-3 relative">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg border ${isCorrect
                              ? "bg-emerald-500/10 border-emerald-500/20"
                              : "bg-destructive/10 border-destructive/20"
                              }`}>
                              {isCorrect
                                ? <CheckCircle className="h-4 w-4 text-emerald-500" />
                                : <XCircle className="h-4 w-4 text-destructive" />
                              }
                            </div>
                            <Badge variant="outline" className="border-border/50">{q.discipline}</Badge>
                            <Badge variant="secondary" className="bg-muted/50">{q.topic}</Badge>
                          </div>
                          <span className="text-sm text-muted-foreground font-mono">
                            Questão {questions.indexOf(q) + 1}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 relative">
                        {/* Texto Base (se houver - verifica se tem ID válido) */}
                        {q.textoBase && q.textoBase.id && (
                          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                            <div className="flex items-start gap-2 mb-2">
                              <div className="p-1.5 rounded-lg bg-blue-500/10">
                                <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-blue-500">
                                  {q.textoBase.titulo || 'Texto Base'}
                                </span>
                                {(q.textoBase.autor || q.textoBase.fonte) && (
                                  <p className="text-[10px] text-muted-foreground">
                                    {q.textoBase.autor && <span>{q.textoBase.autor}</span>}
                                    {q.textoBase.autor && q.textoBase.fonte && <span> • </span>}
                                    {q.textoBase.fonte && <span>{q.textoBase.fonte}</span>}
                                  </p>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                              {q.textoBase.conteudo}
                            </p>
                          </div>
                        )}

                        <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                          <p className="text-foreground">{q.text}</p>
                        </div>

                        <div className="grid gap-2">
                          {q.options.map((opt: any) => (
                            <div
                              key={opt.letter}
                              className={`p-4 rounded-xl text-sm transition-all duration-300 ${opt.letter === q.correctAnswer
                                ? "bg-emerald-500/10 text-emerald-700 border-2 border-emerald-500/30 shadow-[0_0_15px_-5px_hsl(142,76%,36%)]"
                                : opt.letter === answers[q.id]
                                  ? "bg-destructive/10 text-destructive border-2 border-destructive/30"
                                  : "bg-muted/30 text-muted-foreground border border-border/50"
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>
                                  <span className={`inline-flex items-center justify-center h-6 w-6 rounded-md mr-3 text-sm font-bold ${opt.letter === q.correctAnswer
                                    ? "bg-emerald-500 text-white"
                                    : opt.letter === answers[q.id]
                                      ? "bg-destructive text-destructive-foreground"
                                      : "bg-muted text-muted-foreground"
                                    }`}>
                                    {opt.letter}
                                  </span>
                                  {opt.text}
                                </span>
                                {opt.letter === q.correctAnswer && (
                                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                                )}
                                {opt.letter === answers[q.id] && opt.letter !== q.correctAnswer && (
                                  <XCircle className="h-5 w-5 text-destructive" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 pt-2 text-sm p-3 rounded-lg bg-muted/20 border border-border/50">
                          <span className="text-muted-foreground">Sua resposta:</span>
                          <Badge
                            variant={isCorrect ? "default" : "destructive"}
                            className={isCorrect
                              ? "bg-emerald-500/20 text-white border border-emerald-500/30"
                              : "bg-destructive/20 text-white border border-destructive/30"
                            }
                          >
                            {answers[q.id] || "Sem resposta"}
                          </Badge>
                          <span className="text-muted-foreground/50">|</span>
                          <span className="text-muted-foreground">Correta:</span>
                          <Badge className="bg-emerald-500/20 text-white border border-emerald-500/30">
                            {q.correctAnswer}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ResultadoSimulado;
