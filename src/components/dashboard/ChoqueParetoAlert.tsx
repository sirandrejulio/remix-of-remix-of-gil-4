import { useState, useEffect, useRef } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  X, 
  Zap,
  ArrowRight,
  Target
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { StudentNotificationService } from "@/hooks/useStudentNotifications";

interface ChoqueParetoAlertProps {
  onDismiss?: () => void;
}

const DISCIPLINAS_G1 = ["Informática", "Vendas e Negociação", "Língua Portuguesa", "Conhecimentos Bancários"];
const DISCIPLINAS_G2 = ["Matemática Financeira", "Matemática", "Atualidades", "Inglês"];
const LIMIAR_DOMINIO = 70; // 70% para considerar dominado

export function ChoqueParetoAlert({ onDismiss }: ChoqueParetoAlertProps) {
  const { user } = useAuth();
  const [showAlert, setShowAlert] = useState(false);
  const [disciplinasNaoDominadas, setDisciplinasNaoDominadas] = useState<string[]>([]);
  const [disciplinasG2Estudando, setDisciplinasG2Estudando] = useState<string[]>([]);
  const [mediaG1, setMediaG1] = useState(0);
  const [loading, setLoading] = useState(true);
  const notificationSent = useRef(false);

  useEffect(() => {
    const checkParetoStatus = async () => {
      if (!user) return;

      try {
        // Buscar respostas recentes (últimos 7 dias)
        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

        const { data: respostas } = await supabase
          .from('respostas')
          .select(`
            esta_correta,
            created_at,
            questoes (
              disciplina_id,
              disciplinas (nome)
            )
          `)
          .eq('user_id', user.id);

        if (!respostas || respostas.length === 0) {
          setLoading(false);
          return;
        }

        // Calcular desempenho por disciplina (total)
        const disciplineStats: Record<string, { correct: number; total: number }> = {};
        
        respostas.forEach((r: any) => {
          const disciplina = r.questoes?.disciplinas?.nome || 'Outras';
          if (!disciplineStats[disciplina]) {
            disciplineStats[disciplina] = { correct: 0, total: 0 };
          }
          disciplineStats[disciplina].total++;
          if (r.esta_correta) {
            disciplineStats[disciplina].correct++;
          }
        });

        // Verificar quais disciplinas do G1 NÃO estão dominadas
        const g1NaoDominadas: string[] = [];
        let somaG1 = 0;
        let countG1 = 0;

        DISCIPLINAS_G1.forEach(disc => {
          const stats = disciplineStats[disc] || { correct: 0, total: 0 };
          const porcentagem = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
          somaG1 += porcentagem;
          countG1++;
          
          if (porcentagem < LIMIAR_DOMINIO) {
            g1NaoDominadas.push(disc);
          }
        });

        const media = countG1 > 0 ? Math.round(somaG1 / countG1) : 0;
        setMediaG1(media);
        setDisciplinasNaoDominadas(g1NaoDominadas);

        // Verificar se está estudando G2 recentemente (últimos 7 dias)
        const respostasRecentes = respostas.filter((r: any) => 
          new Date(r.created_at) >= seteDiasAtras
        );

        const g2Estudando: string[] = [];
        respostasRecentes.forEach((r: any) => {
          const disciplina = r.questoes?.disciplinas?.nome || 'Outras';
          if (DISCIPLINAS_G2.includes(disciplina) && !g2Estudando.includes(disciplina)) {
            g2Estudando.push(disciplina);
          }
        });

        setDisciplinasG2Estudando(g2Estudando);

        // Mostrar alerta se: estudando G2 E G1 não dominado
        if (g2Estudando.length > 0 && g1NaoDominadas.length > 0 && media < LIMIAR_DOMINIO) {
          setShowAlert(true);
          
          // Enviar notificação apenas uma vez (deduplicação é feita no NotificationService)
          if (!notificationSent.current && user) {
            notificationSent.current = true;
            // A deduplicação no backend evita notificações repetidas nas últimas 24h
            StudentNotificationService.choqueParetoAtivado(user.id);
          }
        }

      } catch (error) {
        console.error('Error checking Pareto status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkParetoStatus();
  }, [user]);

  const handleDismiss = () => {
    setShowAlert(false);
    toast.info("Lembre-se: foque no Grupo 1 para maximizar sua nota!");
    onDismiss?.();
  };

  const handleFocarG1 = () => {
    setShowAlert(false);
    toast.success("Excelente decisão! Vamos focar no que realmente importa.", {
      description: "O Grupo 1 representa 75% da sua nota.",
      action: {
        label: "Ver Questões G1",
        onClick: () => window.location.href = "/questoes"
      }
    });
  };

  if (loading || !showAlert) return null;

  return (
    <div className="animate-fade-in">
      <Alert className="relative overflow-hidden border-destructive/50 bg-gradient-to-r from-destructive/10 via-destructive/5 to-transparent">
        {/* Efeito de brilho animado */}
        <div className="absolute inset-0 bg-gradient-to-r from-destructive/0 via-destructive/10 to-destructive/0 animate-pulse" />
        
        {/* Partículas flutuantes */}
        <div className="absolute top-2 right-20 w-3 h-3 rounded-full bg-destructive/30 animate-bounce" style={{ animationDelay: '0s' }} />
        <div className="absolute top-6 right-32 w-2 h-2 rounded-full bg-destructive/20 animate-bounce" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-4 right-24 w-2 h-2 rounded-full bg-destructive/25 animate-bounce" style={{ animationDelay: '1s' }} />

        <div className="relative flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="h-12 w-12 rounded-xl bg-destructive/20 flex items-center justify-center animate-pulse">
              <Zap className="h-6 w-6 text-destructive" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <AlertTitle className="flex items-center gap-2 text-destructive font-bold text-lg mb-2">
              <AlertTriangle className="h-5 w-5" />
              ⚡ CHOQUE DE PARETO!
            </AlertTitle>
            
            <AlertDescription className="text-foreground/80">
              <p className="mb-3">
                <strong>Atenção!</strong> Você está estudando disciplinas do <strong className="text-amber-500">Grupo 2</strong> (
                {disciplinasG2Estudando.join(", ")}) antes de dominar o <strong className="text-destructive">Grupo 1</strong>.
              </p>
              
              <div className="bg-background/50 rounded-lg p-3 mb-3 border border-destructive/20">
                <p className="text-sm font-medium mb-2">
                  📊 Seu desempenho no Grupo 1: <span className={cn(
                    "font-bold",
                    mediaG1 >= 70 ? "text-emerald-500" : "text-destructive"
                  )}>{mediaG1}%</span> (meta: 70%)
                </p>
                <p className="text-xs text-muted-foreground">
                  Disciplinas pendentes: <strong>{disciplinasNaoDominadas.join(", ")}</strong>
                </p>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                💡 O Grupo 1 representa <strong>75% da sua nota</strong>. Domine-o primeiro para maximizar sua aprovação.
              </p>

              <div className="flex flex-wrap gap-2">
                <Button 
                  size="sm" 
                  className="gap-2 bg-destructive hover:bg-destructive/90"
                  onClick={handleFocarG1}
                >
                  <Target className="h-4 w-4" />
                  Focar no Grupo 1
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleDismiss}
                  className="border-destructive/30 hover:bg-destructive/5"
                >
                  Entendi, continuar assim
                </Button>
              </div>
            </AlertDescription>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Alert>
    </div>
  );
}
