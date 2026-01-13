import { Header } from "@/components/layout/Header";
import { DottedSurface } from "@/components/ui/dotted-surface";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { Play, Brain, Sparkles, BookOpen, Clock, ArrowLeft, History, Loader2, Zap, Target, Activity } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { HistoricoSimulados } from "@/components/dashboard/HistoricoSimulados";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Discipline {
  id: string;
  nome: string;
}

const Simulados = () => {
  const { user } = useAuth();
  const [simulationType, setSimulationType] = useState<"complete" | "thematic">("complete");
  const [aiEngine, setAiEngine] = useState<"primary" | "gemini">("primary");
  const [disciplineId, setDisciplineId] = useState("");
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  // Fetch disciplines from database
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

  const handleStartSimulation = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para iniciar um simulado.");
      return;
    }

    if (simulationType === "thematic" && !disciplineId) {
      toast.error("Selecione uma disciplina para o simulado temático.");
      return;
    }

    setIsCreating(true);

    try {
      const selectedDiscipline = disciplines.find(d => d.id === disciplineId);
      const titulo = simulationType === "complete"
        ? `Simulado Completo - ${new Date().toLocaleDateString('pt-BR')}`
        : `Simulado Temático: ${selectedDiscipline?.nome || ''} - ${new Date().toLocaleDateString('pt-BR')}`;

      // Create simulado in database
      const { data: simulado, error: createError } = await supabase
        .from('simulados')
        .insert({
          user_id: user.id,
          titulo,
          tipo: simulationType === "complete" ? "completo" : "tematico",
          disciplina_filtro: simulationType === "thematic" ? disciplineId : null,
          total_questoes: 60,
          status: 'em_andamento',
          data_inicio: new Date().toISOString()
        })
        .select('id')
        .single();

      if (createError) throw createError;

      toast.success("Simulado criado!", {
        description: `Motor: ${aiEngine === "primary" ? "IA Principal" : "Google Gemini"}`,
      });

      // Navigate to simulation page with the created simulado ID
      navigate("/simulado/realizar", {
        state: {
          simuladoId: simulado.id,
          type: simulationType,
          engine: aiEngine,
          disciplineId: simulationType === "thematic" ? disciplineId : null
        }
      });
    } catch (error) {
      console.error('Error creating simulado:', error);
      toast.error("Erro ao criar simulado. Tente novamente.");
    } finally {
      setIsCreating(false);
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
          <div className="mb-8 animate-fade-in relative" style={{ animationDelay: '50ms' }}>
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg shadow-primary/25">
                  <Target className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                    Simulados
                  </h1>
                  <p className="text-muted-foreground">
                    Configure e inicie seu simulado ou veja seu histórico.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs para Gerar e Histórico */}
          <Tabs defaultValue="gerar" className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <TabsList className="mb-6 bg-muted/50 backdrop-blur-sm border border-border/50">
              <TabsTrigger value="gerar" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Play className="h-4 w-4" />
                Gerar Simulado
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <History className="h-4 w-4" />
                Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gerar">
              <div className="max-w-2xl mx-auto space-y-4">
                {/* Simulation Type */}
                <Card
                  className="animate-fade-in group relative overflow-hidden hover:shadow-xl transition-all duration-500"
                  style={{ animationDelay: '150ms' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-primary/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <CardHeader className="pb-4 relative">
                    <CardTitle className="flex items-center gap-3 text-base">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <span className="block">Tipo de Simulado</span>
                        <span className="text-xs font-normal text-muted-foreground">Escolha entre simulado completo ou temático</span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <RadioGroup
                      value={simulationType}
                      onValueChange={(value) => setSimulationType(value as "complete" | "thematic")}
                      className="space-y-3"
                    >
                      <div
                        className={cn(
                          "flex items-start space-x-3 p-4 rounded-xl border transition-all duration-300 cursor-pointer",
                          "hover:shadow-lg",
                          simulationType === 'complete'
                            ? 'border-primary/50 bg-gradient-to-br from-primary/10 to-primary/5 shadow-[0_0_20px_hsl(var(--primary)/0.1)]'
                            : 'border-border hover:border-primary/30 hover:bg-muted/30'
                        )}
                      >
                        <RadioGroupItem value="complete" id="complete" className="mt-0.5" />
                        <div className="flex-1">
                          <Label htmlFor="complete" className="text-sm font-semibold cursor-pointer flex items-center gap-2">
                            Simulado Completo
                            {simulationType === 'complete' && (
                              <Badge className="bg-primary/20 text-white border-0 text-xs">Selecionado</Badge>
                            )}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            60 questões distribuídas por todas as disciplinas, seguindo a estrutura oficial.
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {['Português (15)', 'Inglês (5)', 'Matemática (10)', 'Mat. Financeira (10)', 'Bancários (10)', 'Informática (5)', 'Vendas (5)'].map((item, i) => (
                              <Badge
                                key={item}
                                variant="outline"
                                className="text-xs animate-fade-in"
                                style={{ animationDelay: `${i * 50}ms` }}
                              >
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div
                        className={cn(
                          "flex items-start space-x-3 p-4 rounded-xl border transition-all duration-300 cursor-pointer",
                          "hover:shadow-lg",
                          simulationType === 'thematic'
                            ? 'border-violet-500/50 bg-gradient-to-br from-violet-500/10 to-violet-500/5 shadow-[0_0_20px_hsl(262_83%_58%/0.1)]'
                            : 'border-border hover:border-violet-500/30 hover:bg-muted/30'
                        )}
                      >
                        <RadioGroupItem value="thematic" id="thematic" className="mt-0.5" />
                        <div className="flex-1">
                          <Label htmlFor="thematic" className="text-sm font-semibold cursor-pointer flex items-center gap-2">
                            Simulado Temático
                            {simulationType === 'thematic' && (
                              <Badge className="bg-violet-500/20 text-white border-0 text-xs">Selecionado</Badge>
                            )}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            60 questões focadas em uma única disciplina para estudo aprofundado.
                          </p>
                          {simulationType === "thematic" && (
                            <div className="mt-3 animate-fade-in">
                              <Select value={disciplineId} onValueChange={setDisciplineId}>
                                <SelectTrigger className="w-full border-violet-500/30 focus:border-violet-500">
                                  <SelectValue placeholder="Selecione a disciplina" />
                                </SelectTrigger>
                                <SelectContent>
                                  {disciplines.map((d) => (
                                    <SelectItem key={d.id} value={d.id}>
                                      {d.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>

                {/* AI Engine Selection */}
                <Card
                  className="animate-fade-in group relative overflow-hidden hover:shadow-xl transition-all duration-500"
                  style={{ animationDelay: '200ms' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-violet-500/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <CardHeader className="pb-4 relative">
                    <CardTitle className="flex items-center gap-3 text-base">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Brain className="h-5 w-5 text-violet-500" />
                      </div>
                      <div>
                        <span className="block">Motor de IA</span>
                        <span className="text-xs font-normal text-muted-foreground">Selecione o motor de geração das questões</span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <RadioGroup
                      value={aiEngine}
                      onValueChange={(value) => setAiEngine(value as "primary" | "gemini")}
                      className="grid grid-cols-1 md:grid-cols-2 gap-3"
                    >
                      <div
                        className={cn(
                          "flex items-start space-x-3 p-4 rounded-xl border transition-all duration-300 cursor-pointer",
                          "hover:shadow-lg",
                          aiEngine === 'primary'
                            ? 'border-primary/50 bg-gradient-to-br from-primary/10 to-primary/5 shadow-[0_0_20px_hsl(var(--primary)/0.1)]'
                            : 'border-border hover:border-primary/30 hover:bg-muted/30'
                        )}
                      >
                        <RadioGroupItem value="primary" id="primary" className="mt-0.5" />
                        <div className="flex-1">
                          <Label htmlFor="primary" className="text-sm font-semibold cursor-pointer flex items-center gap-2">
                            <Sparkles className={cn(
                              "h-4 w-4 transition-all duration-300",
                              aiEngine === 'primary' ? "text-primary animate-pulse" : "text-muted-foreground"
                            )} />
                            IA Principal
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Motor nativo otimizado para o estilo CESGRANRIO.
                          </p>
                        </div>
                      </div>

                      <div
                        className={cn(
                          "flex items-start space-x-3 p-4 rounded-xl border transition-all duration-300 cursor-pointer",
                          "hover:shadow-lg",
                          aiEngine === 'gemini'
                            ? 'border-violet-500/50 bg-gradient-to-br from-violet-500/10 to-violet-500/5 shadow-[0_0_20px_hsl(262_83%_58%/0.1)]'
                            : 'border-border hover:border-violet-500/30 hover:bg-muted/30'
                        )}
                      >
                        <RadioGroupItem value="gemini" id="gemini" className="mt-0.5" />
                        <div className="flex-1">
                          <Label htmlFor="gemini" className="text-sm font-semibold cursor-pointer flex items-center gap-2">
                            <Brain className={cn(
                              "h-4 w-4 transition-all duration-300",
                              aiEngine === 'gemini' ? "text-violet-500 animate-pulse" : "text-muted-foreground"
                            )} />
                            Google Gemini
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Motor complementar com variações criativas.
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>

                {/* Summary Panel */}
                <Card className="animate-fade-in group relative overflow-hidden hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 border-primary/20" style={{ animationDelay: '250ms' }}>
                  {/* Animated background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5" />
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary/10 blur-3xl animate-pulse" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-violet-500/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

                  <CardHeader className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-t-xl border-b border-border/40">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Resumo do Simulado
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-4 relative">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                      <span className="text-sm text-muted-foreground">Tipo:</span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "transition-all duration-300",
                          simulationType === "complete"
                            ? "bg-primary/20 text-white border border-zinc-700"
                            : "bg-violet-500/20 text-white border border-zinc-700"
                        )}
                      >
                        {simulationType === "complete" ? "Completo" : "Temático"}
                      </Badge>
                    </div>

                    {simulationType === "thematic" && disciplineId && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 animate-fade-in">
                        <span className="text-sm text-muted-foreground">Disciplina:</span>
                        <Badge variant="outline" className="border-violet-500/30 text-violet-600">
                          {disciplines.find((d) => d.id === disciplineId)?.nome}
                        </Badge>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                      <span className="text-sm text-muted-foreground">Motor:</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "transition-all duration-300",
                          aiEngine === "primary"
                            ? "border-primary/30 text-white"
                            : "border-violet-500/30 text-white"
                        )}
                      >
                        {aiEngine === "primary" ? "IA Principal" : "Google Gemini"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                      <span className="text-sm text-muted-foreground">Questões:</span>
                      <span className="font-bold text-foreground text-lg">60</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t border-border/40">
                      <Clock className="h-4 w-4" />
                      <span>Tempo estimado: ~3 horas</span>
                    </div>

                    <div className="pt-3">
                      <Button
                        className={cn(
                          "w-full h-12 gap-2 font-semibold shadow-lg transition-all duration-300",
                          "hover:shadow-xl hover:shadow-primary/25 hover:scale-[1.02]",
                          "bg-gradient-to-r from-primary to-primary/80"
                        )}
                        size="lg"
                        onClick={handleStartSimulation}
                        disabled={isCreating}
                      >
                        {isCreating ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Criando Simulado...
                          </>
                        ) : (
                          <>
                            <Play className="h-5 w-5" />
                            Iniciar Simulado
                            <Activity className="h-4 w-4 ml-1 opacity-50" />
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Progress bar decorativa */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-violet-500/50 to-primary/50 rounded-b-xl overflow-hidden">
                      <div className="h-full w-1/3 bg-primary animate-[shimmer_2s_infinite] rounded-full" />
                    </div>
                  </CardContent>
                </Card>
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
                      <span className="block">Histórico de Simulados</span>
                      <span className="text-sm font-normal text-muted-foreground">Seus simulados anteriores</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <HistoricoSimulados />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
        <Footer />

        <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
      </div>
    </>
  );
};

export default Simulados;
