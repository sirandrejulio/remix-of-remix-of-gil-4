import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Star,
  Flame,
  Target,
  Medal,
  Crown,
  Zap,
  Gift,
  Lock,
  Check,
  TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { StudentNotificationService } from "@/hooks/useStudentNotifications";

interface Meta {
  id: string;
  disciplina: string;
  meta_porcentagem: number;
  atual_porcentagem: number;
  nivel: number;
  xp: number;
  xp_proximo_nivel: number;
  conquistada: boolean;
}

interface Conquista {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  desbloqueada: boolean;
  data_desbloqueio?: string;
}

const NIVEIS = [
  { nivel: 1, nome: "Iniciante", xp: 0, cor: "text-muted-foreground" },
  { nivel: 2, nome: "Estudante", xp: 100, cor: "text-emerald-500" },
  { nivel: 3, nome: "Dedicado", xp: 300, cor: "text-blue-500" },
  { nivel: 4, nome: "Avançado", xp: 600, cor: "text-violet-500" },
  { nivel: 5, nome: "Especialista", xp: 1000, cor: "text-amber-500" },
  { nivel: 6, nome: "Mestre", xp: 1500, cor: "text-destructive" },
];

const CONQUISTAS_PADRAO: Conquista[] = [
  { id: "1", nome: "Primeiro Passo", descricao: "Complete seu primeiro simulado", icone: "star", desbloqueada: false },
  { id: "2", nome: "Dedicação", descricao: "Estude 7 dias seguidos", icone: "flame", desbloqueada: false },
  { id: "3", nome: "Domínio G1", descricao: "Atinja 70% no Grupo 1", icone: "trophy", desbloqueada: false },
  { id: "4", nome: "Perfeição", descricao: "Acerte 100% em um simulado", icone: "crown", desbloqueada: false },
  { id: "5", nome: "Maratonista", descricao: "Responda 500 questões", icone: "medal", desbloqueada: false },
  { id: "6", nome: "Pareto Master", descricao: "Domine todas disciplinas do G1", icone: "target", desbloqueada: false },
];

const DISCIPLINAS_G1 = ["Informática", "Vendas e Negociação", "Língua Portuguesa", "Conhecimentos Bancários"];

export function MetasGamificacao() {
  const { user } = useAuth();
  const [metas, setMetas] = useState<Meta[]>([]);
  const [conquistas, setConquistas] = useState<Conquista[]>(CONQUISTAS_PADRAO);
  const [xpTotal, setXpTotal] = useState(0);
  const [nivelAtual, setNivelAtual] = useState(NIVEIS[0]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const previousLevel = useRef(0);
  const notifiedConquests = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Buscar respostas do usuário
        const { data: respostas } = await supabase
          .from('respostas')
          .select(`
            esta_correta,
            created_at,
            questao:questoes (
              disciplina
            )
          `)
          .eq('user_id', user.id);

        // Buscar simulados
        const { data: simulados } = await supabase
          .from('simulados')
          .select('*')
          .eq('user_id', user.id);

        if (!respostas) {
          setLoading(false);
          return;
        }

        // Calcular desempenho por disciplina
        const disciplineStats: Record<string, { correct: number; total: number }> = {};

        respostas.forEach((r: any) => {
          const disciplina = r.questao?.disciplina || 'Outras';
          if (!disciplineStats[disciplina]) {
            disciplineStats[disciplina] = { correct: 0, total: 0 };
          }
          disciplineStats[disciplina].total++;
          if (r.esta_correta) {
            disciplineStats[disciplina].correct++;
          }
        });

        // Calcular XP baseado em acertos
        const totalAcertos = respostas.filter((r: any) => r.esta_correta).length;
        const xp = totalAcertos * 10 + (simulados?.length || 0) * 50;
        setXpTotal(xp);

        // Determinar nível
        const nivel = NIVEIS.reduce((acc, n) => xp >= n.xp ? n : acc, NIVEIS[0]);
        setNivelAtual(nivel);

        // Notificar se subiu de nível (deduplicação é feita no NotificationService)
        if (previousLevel.current > 0 && nivel.nivel > previousLevel.current && user) {
          // O NotificationService verifica se já existe uma notificação de nível nas últimas 24h
          StudentNotificationService.nivelSubiu(user.id, nivel.nivel);
          toast.success(`Parabéns! Você subiu para o nível ${nivel.nivel}: ${nivel.nome}!`);
        }
        previousLevel.current = nivel.nivel;

        // Calcular streak de dias
        const diasEstudo = new Set(respostas.map((r: any) =>
          new Date(r.created_at).toDateString()
        ));
        setStreak(diasEstudo.size);

        // Criar metas para disciplinas do G1
        const metasCalculadas: Meta[] = DISCIPLINAS_G1.map((disc, index) => {
          const stats = disciplineStats[disc] || { correct: 0, total: 0 };
          const porcentagem = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
          const xpDisc = stats.correct * 10;
          const nivelDisc = NIVEIS.reduce((acc, n) => xpDisc >= n.xp ? n : acc, NIVEIS[0]);
          const proxNivel = NIVEIS.find(n => n.xp > xpDisc) || NIVEIS[NIVEIS.length - 1];

          return {
            id: `${index}`,
            disciplina: disc,
            meta_porcentagem: 70,
            atual_porcentagem: porcentagem,
            nivel: nivelDisc.nivel,
            xp: xpDisc,
            xp_proximo_nivel: proxNivel.xp,
            conquistada: porcentagem >= 70,
          };
        });

        setMetas(metasCalculadas);

        // Verificar conquistas
        const conquistasAtualizadas = [...CONQUISTAS_PADRAO];

        // Primeiro Passo
        if (simulados && simulados.length > 0) {
          conquistasAtualizadas[0].desbloqueada = true;
        }

        // Dedicação (7+ dias)
        if (diasEstudo.size >= 7) {
          conquistasAtualizadas[1].desbloqueada = true;
        }

        // Domínio G1 (70%+ média G1)
        const mediaG1 = metasCalculadas.reduce((acc, m) => acc + m.atual_porcentagem, 0) / metasCalculadas.length;
        if (mediaG1 >= 70) {
          conquistasAtualizadas[2].desbloqueada = true;
        }

        // Perfeição (100% em simulado) - verificar via simulados
        const temPerfeito = simulados?.some((s: any) => s.pontuacao === 100);
        if (temPerfeito) {
          conquistasAtualizadas[3].desbloqueada = true;
        }

        // Maratonista (500+ questões)
        if (respostas.length >= 500) {
          conquistasAtualizadas[4].desbloqueada = true;
        }

        // Pareto Master (todas G1 >= 70%)
        if (metasCalculadas.every(m => m.conquistada)) {
          conquistasAtualizadas[5].desbloqueada = true;
        }

        // Notificar novas conquistas (deduplicação é feita no NotificationService)
        if (user) {
          conquistasAtualizadas.forEach((conquista, index) => {
            if (conquista.desbloqueada && !notifiedConquests.current.has(conquista.id)) {
              // Verifica se é uma conquista nova (não estava desbloqueada antes)
              if (!CONQUISTAS_PADRAO[index].desbloqueada) {
                notifiedConquests.current.add(conquista.id);
                // O NotificationService usa tipo único por conquista para evitar duplicatas
                StudentNotificationService.conquistaDesbloqueada(user.id, conquista.nome);
              }
            }
          });
        }

        setConquistas(conquistasAtualizadas);

      } catch (error) {
        console.error('Error fetching gamification data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const getIconComponent = (icone: string) => {
    switch (icone) {
      case "star": return Star;
      case "flame": return Flame;
      case "trophy": return Trophy;
      case "crown": return Crown;
      case "medal": return Medal;
      case "target": return Target;
      default: return Star;
    }
  };

  const proximoNivel = NIVEIS.find(n => n.xp > xpTotal) || NIVEIS[NIVEIS.length - 1];
  const progressoNivel = nivelAtual === proximoNivel
    ? 100
    : Math.round(((xpTotal - nivelAtual.xp) / (proximoNivel.xp - nivelAtual.xp)) * 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm text-muted-foreground">Carregando conquistas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Nível e XP */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-500/50 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <Badge className="absolute -bottom-2 -right-2 bg-fuchsia-500 text-xs px-2">
              Nv.{nivelAtual.nivel}
            </Badge>
          </div>
          <div>
            <h3 className={cn("text-xl font-bold", nivelAtual.cor)}>{nivelAtual.nome}</h3>
            <p className="text-sm text-muted-foreground">{xpTotal} XP Total</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-gradient-to-r from-violet-500/5 to-fuchsia-500/10 px-4 py-2 rounded-xl border border-violet-500/20">
          <Flame className="h-5 w-5 text-violet-500" />
          <div>
            <span className="text-lg font-bold text-violet-500">{streak}</span>
            <span className="text-xs text-muted-foreground ml-1">dias de estudo</span>
          </div>
        </div>
      </div>

      {/* Barra de Progresso do Nível */}
      <Card className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border animate-fade-in group relative overflow-hidden transition-all duration-500 border-violet-500/20">
        <div className="absolute inset-0 bg-gradient-to-br opacity-10 group-hover:opacity-20 transition-opacity duration-500 from-violet-500/5 to-violet-500/5"></div>
        <CardContent className="py-4 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progresso para {proximoNivel.nome}</span>
            <span className="text-sm text-muted-foreground">
              {xpTotal} / {proximoNivel.xp} XP
            </span>
          </div>
          <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-1000 rounded-full"
              style={{ width: `${progressoNivel}%` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
          </div>
        </CardContent>
      </Card>

      {/* Metas por Disciplina */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metas.map((meta, index) => (
          <Card
            key={meta.id}
            className={cn(
              "rounded-2xl bg-white/[0.03] backdrop-blur-xl border animate-fade-in group relative overflow-hidden hover:shadow-xl transition-all duration-500",
              meta.conquistada
                ? "border-emerald-500/50 hover:shadow-emerald-500/10"
                : "border-violet-500/20 hover:shadow-violet-500/10"
            )}
          >
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
              meta.conquistada ? "from-emerald-500/5 to-emerald-500/5" : "from-violet-500/5 to-violet-500/5"
            )}></div>
            <div className={cn(
              "absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500",
              meta.conquistada ? "bg-emerald-500" : "bg-violet-500"
            )}></div>

            {meta.conquistada && (
              <div className="absolute top-3 right-3 z-10">
                <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Check className="h-4 w-4 text-white" />
                </div>
              </div>
            )}

            <CardContent className="pt-4 pb-4 relative z-0">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                  meta.conquistada
                    ? "bg-emerald-500/20"
                    : "bg-violet-500/10"
                )}>
                  <Target className={cn(
                    "h-5 w-5 transition-colors duration-300",
                    meta.conquistada ? "text-emerald-500" : "text-violet-500"
                  )} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{meta.disciplina}</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs backdrop-blur-sm">
                      Nível {meta.nivel}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {meta.xp} XP
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Meta: {meta.meta_porcentagem}%</span>
                  <span className={cn(
                    "font-bold",
                    meta.atual_porcentagem >= 70 ? "text-emerald-500" :
                      meta.atual_porcentagem >= 50 ? "text-amber-500" : "text-destructive"
                  )}>
                    {meta.atual_porcentagem}%
                  </span>
                </div>
                <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-700 rounded-full",
                      meta.atual_porcentagem >= 70 ? "bg-emerald-500" :
                        meta.atual_porcentagem >= 50 ? "bg-amber-500" : "bg-destructive"
                    )}
                    style={{ width: `${Math.min(meta.atual_porcentagem, 100)}%` }}
                  />
                  {/* Marcador da meta */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-foreground/50"
                    style={{ left: `${meta.meta_porcentagem}%` }}
                  />
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-2xl">
                <div className={cn(
                  "h-full w-1/3 translate-x-[-100%] group-hover:translate-x-[400%] transition-transform duration-1000",
                  meta.conquistada ? "bg-emerald-500" : "bg-violet-500"
                )}></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conquistas */}
      <Card className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border animate-fade-in group relative overflow-hidden transition-all duration-500 border-violet-500/20">
        <div className="absolute inset-0 bg-gradient-to-br opacity-10 group-hover:opacity-20 transition-opacity duration-500 from-violet-500/5 to-violet-500/5"></div>
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-violet-500"></div>

        <CardHeader className="pb-3 relative">
          <CardTitle className="flex items-center gap-2 text-base">
            <Medal className="h-5 w-5 text-violet-500" />
            Conquistas
            <Badge variant="outline" className="ml-2">
              {conquistas.filter(c => c.desbloqueada).length}/{conquistas.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {conquistas.map((conquista) => {
              const IconComponent = getIconComponent(conquista.icone);
              return (
                <div
                  key={conquista.id}
                  className={cn(
                    "relative p-3 rounded-xl border transition-all duration-300",
                    conquista.desbloqueada
                      ? "bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 border-violet-500/30"
                      : "bg-muted/30 border-border opacity-50"
                  )}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center",
                      conquista.desbloqueada
                        ? "bg-violet-500/20"
                        : "bg-muted"
                    )}>
                      {conquista.desbloqueada ? (
                        <IconComponent className="h-5 w-5 text-violet-500" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium">{conquista.nome}</p>
                      <p className="text-[10px] text-muted-foreground">{conquista.descricao}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
            <div className="h-full w-1/3 translate-x-[-100%] group-hover:translate-x-[400%] transition-transform duration-1000 bg-violet-500"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
