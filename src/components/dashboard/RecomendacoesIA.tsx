import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Loader2, 
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Target,
  Zap,
  BookOpen,
  Brain,
  Star,
  Flame,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Recomendacao {
  tipo: 'atencao' | 'evolucao' | 'dica';
  disciplina: string;
  titulo: string;
  descricao: string;
  prioridade: number;
  icon?: React.ReactNode;
}

// Dicas rotativas baseadas no dia - diferentes para cada dia da semana/mês
const getDailyTips = (): Recomendacao[] => {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  
  const allTips: Recomendacao[] = [
    // Conhecimentos Bancários
    {
      tipo: 'dica',
      disciplina: 'Conhecimentos Bancários',
      titulo: 'Sistema Financeiro Nacional',
      descricao: 'O BACEN é o órgão executor da política monetária. Memorize suas competências exclusivas!',
      prioridade: 3,
    },
    {
      tipo: 'dica',
      disciplina: 'Conhecimentos Bancários',
      titulo: 'Produtos Bancários',
      descricao: 'CDB e RDB: o primeiro é transferível, o segundo não. Essa diferença é frequente em provas!',
      prioridade: 3,
    },
    {
      tipo: 'dica',
      disciplina: 'Conhecimentos Bancários',
      titulo: 'Seguros e Previdência',
      descricao: 'PGBL deduz do IR até 12% da renda bruta. VGBL não deduz, mas tributa só o rendimento.',
      prioridade: 3,
    },
    // Vendas e Negociação
    {
      tipo: 'dica',
      disciplina: 'Vendas e Negociação',
      titulo: 'Técnicas de Vendas',
      descricao: 'Cross-selling é vender produtos complementares. Up-selling é oferecer versão superior.',
      prioridade: 3,
    },
    {
      tipo: 'dica',
      disciplina: 'Vendas e Negociação',
      titulo: 'Atendimento ao Cliente',
      descricao: 'SAC: gratuito e 24h. Ouvidoria: instância superior ao SAC, prazo de 10 dias úteis.',
      prioridade: 3,
    },
    // Português
    {
      tipo: 'dica',
      disciplina: 'Língua Portuguesa',
      titulo: 'Interpretação de Textos',
      descricao: 'CESGRANRIO adora questões sobre inferências. Diferencie o que está explícito do implícito!',
      prioridade: 3,
    },
    {
      tipo: 'dica',
      disciplina: 'Língua Portuguesa',
      titulo: 'Concordância Verbal',
      descricao: 'Sujeito posposto ao verbo é uma pegadinha clássica. Identifique o sujeito antes de responder.',
      prioridade: 3,
    },
    // Matemática
    {
      tipo: 'dica',
      disciplina: 'Matemática Financeira',
      titulo: 'Juros Compostos',
      descricao: 'M = C × (1 + i)^n. Decore as potências de 1,1 até 1,1^5 para agilizar cálculos.',
      prioridade: 3,
    },
    {
      tipo: 'dica',
      disciplina: 'Matemática Financeira',
      titulo: 'Desconto Comercial',
      descricao: 'Desconto = VN × d × n. O desconto comercial incide sobre o valor nominal, não o atual.',
      prioridade: 3,
    },
    // Informática
    {
      tipo: 'dica',
      disciplina: 'Informática',
      titulo: 'Segurança da Informação',
      descricao: 'Phishing usa engenharia social. Pharming redireciona DNS. Ambos visam roubo de dados.',
      prioridade: 3,
    },
    {
      tipo: 'dica',
      disciplina: 'Informática',
      titulo: 'Microsoft Office',
      descricao: 'Ctrl+Shift+V cola sem formatação. Atalho frequente em questões de Excel e Word.',
      prioridade: 3,
    },
    // Estratégia
    {
      tipo: 'evolucao',
      disciplina: 'Estratégia de Estudo',
      titulo: 'Técnica Pomodoro',
      descricao: '25 minutos de foco + 5 de pausa. A cada 4 ciclos, pausa de 15-30 min.',
      prioridade: 2,
    },
    {
      tipo: 'evolucao',
      disciplina: 'Estratégia de Estudo',
      titulo: 'Revisão Espaçada',
      descricao: 'Revise após 1, 7 e 30 dias. A retenção aumenta 80% com essa técnica.',
      prioridade: 2,
    },
    {
      tipo: 'atencao',
      disciplina: 'CESGRANRIO',
      titulo: 'Padrão da Banca',
      descricao: 'Enunciados longos escondem a pegadinha no final. Leia a última frase primeiro!',
      prioridade: 1,
    },
    {
      tipo: 'atencao',
      disciplina: 'CESGRANRIO',
      titulo: 'Alternativas Parecidas',
      descricao: 'Quando duas alternativas são muito similares, uma delas costuma ser a correta.',
      prioridade: 1,
    },
  ];

  // Seleciona 3 dicas diferentes baseadas no dia do ano
  const startIndex = (dayOfYear * 3) % allTips.length;
  const selected: Recomendacao[] = [];
  
  for (let i = 0; i < 3; i++) {
    selected.push(allTips[(startIndex + i * 5) % allTips.length]);
  }
  
  return selected;
};

export function RecomendacoesIA() {
  const { user } = useAuth();
  const [recomendacoes, setRecomendacoes] = useState<Recomendacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Ciclo automático entre as recomendações
  useEffect(() => {
    if (recomendacoes.length <= 1) return;
    
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % recomendacoes.length);
        setIsTransitioning(false);
      }, 300);
    }, 5000);

    return () => clearInterval(interval);
  }, [recomendacoes.length]);

  useEffect(() => {
    const generateRecomendacoes = async () => {
      if (!user) {
        setRecomendacoes(getDailyTips());
        setIsLoading(false);
        return;
      }

      try {
        // Buscar erros recorrentes
        const { data: erros } = await supabase
          .from('erros_analise')
          .select(`
            questao_id,
            questoes (
              tema,
              disciplinas (
                nome
              )
            )
          `)
          .eq('user_id', user.id);

        // Buscar respostas para análise
        const { data: respostas } = await supabase
          .from('respostas')
          .select(`
            esta_correta,
            questoes (
              tema,
              disciplinas (
                nome
              )
            )
          `)
          .eq('user_id', user.id);

        const recsGeradas: Recomendacao[] = [];

        // Análise de erros por disciplina
        const errosPorDisciplina = new Map<string, { count: number; temas: Map<string, number> }>();
        
        erros?.forEach((e: any) => {
          const disciplina = e.questoes?.disciplinas?.nome || 'Geral';
          const tema = e.questoes?.tema || 'Geral';
          
          const current = errosPorDisciplina.get(disciplina) || { count: 0, temas: new Map() };
          current.count++;
          current.temas.set(tema, (current.temas.get(tema) || 0) + 1);
          errosPorDisciplina.set(disciplina, current);
        });

        // Análise de acertos por disciplina
        const acertosPorDisciplina = new Map<string, { acertos: number; total: number }>();
        
        respostas?.forEach((r: any) => {
          const disciplina = r.questoes?.disciplinas?.nome || 'Geral';
          const current = acertosPorDisciplina.get(disciplina) || { acertos: 0, total: 0 };
          current.total++;
          if (r.esta_correta) current.acertos++;
          acertosPorDisciplina.set(disciplina, current);
        });

        // Gerar recomendação de atenção (disciplina com mais erros)
        const errosArray = Array.from(errosPorDisciplina.entries())
          .sort((a, b) => b[1].count - a[1].count);
        
        if (errosArray.length > 0) {
          const [disciplina, { count, temas }] = errosArray[0];
          const temaMaisErrado = Array.from(temas.entries())
            .sort((a, b) => b[1] - a[1])[0];
          const porcentagem = Math.round((count / (erros?.length || 1)) * 100);
          
          recsGeradas.push({
            tipo: 'atencao',
            disciplina,
            titulo: `Priorize ${temaMaisErrado?.[0] || disciplina}`,
            descricao: `Erro recorrente em ${porcentagem}% das tentativas. Foque no estudo de ${temaMaisErrado?.[0] || 'temas gerais'}.`,
            prioridade: 1,
          });
        }

        // Gerar recomendação de evolução (disciplina com bom desempenho)
        const acertosArray = Array.from(acertosPorDisciplina.entries())
          .filter(([_, stats]) => stats.total >= 5 && (stats.acertos / stats.total) >= 0.7)
          .sort((a, b) => (b[1].acertos / b[1].total) - (a[1].acertos / a[1].total));
        
        if (acertosArray.length > 0) {
          const [disciplina, stats] = acertosArray[0];
          const taxa = Math.round((stats.acertos / stats.total) * 100);
          
          recsGeradas.push({
            tipo: 'evolucao',
            disciplina,
            titulo: `Excelente em ${disciplina}!`,
            descricao: `Você acertou ${taxa}% das questões. Continue assim para manter o desempenho.`,
            prioridade: 2,
          });
        }

        // Completar com dicas diárias até ter 3
        const dailyTips = getDailyTips();
        while (recsGeradas.length < 3) {
          const tip = dailyTips[recsGeradas.length];
          if (tip && !recsGeradas.some(r => r.titulo === tip.titulo)) {
            recsGeradas.push(tip);
          } else {
            break;
          }
        }

        // Se ainda não tem 3, adicionar dicas fixas
        if (recsGeradas.length === 0) {
          recsGeradas.push(...getDailyTips());
        }

        setRecomendacoes(recsGeradas.slice(0, 3).sort((a, b) => a.prioridade - b.prioridade));
      } catch (error) {
        console.error('Error generating recomendacoes:', error);
        setRecomendacoes(getDailyTips());
      } finally {
        setIsLoading(false);
      }
    };

    generateRecomendacoes();
  }, [user]);

  const getIcon = (tipo: string, index: number) => {
    const icons = {
      atencao: [<AlertTriangle key="a" />, <Flame key="b" />, <Zap key="c" />],
      evolucao: [<TrendingUp key="a" />, <Award key="b" />, <Star key="c" />],
      dica: [<Lightbulb key="a" />, <Brain key="b" />, <BookOpen key="c" />],
    };
    const iconSet = icons[tipo as keyof typeof icons] || icons.dica;
    return iconSet[index % iconSet.length];
  };

  const getIconColors = (tipo: string) => {
    switch (tipo) {
      case 'atencao':
        return 'text-amber-500 bg-amber-500/10';
      case 'evolucao':
        return 'text-emerald-500 bg-emerald-500/10';
      default:
        return 'text-primary bg-primary/10';
    }
  };

  const getBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'atencao':
        return 'destructive';
      case 'evolucao':
        return 'default';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
          </div>
          <span className="text-sm text-muted-foreground">Analisando seu desempenho...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Indicadores de navegação */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {recomendacoes.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setIsTransitioning(true);
              setTimeout(() => {
                setActiveIndex(index);
                setIsTransitioning(false);
              }, 150);
            }}
            className={cn(
              "h-2 rounded-full transition-all duration-500",
              index === activeIndex 
                ? "w-8 bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.5)]" 
                : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
            aria-label={`Recomendação ${index + 1}`}
          />
        ))}
      </div>

      {/* Card de recomendação ativo com animação */}
      <div className="relative min-h-[180px]">
        {recomendacoes.map((rec, index) => (
          <div
            key={index}
            className={cn(
              "absolute inset-0 p-5 rounded-xl border transition-all duration-500",
              "bg-gradient-to-br from-muted/60 via-muted/30 to-transparent",
              index === activeIndex 
                ? "opacity-100 translate-y-0 scale-100" 
                : "opacity-0 translate-y-4 scale-95 pointer-events-none",
              isTransitioning && "opacity-0",
              rec.tipo === 'atencao' && "border-amber-500/30 shadow-[0_0_25px_hsl(38_92%_50%/0.1)]",
              rec.tipo === 'evolucao' && "border-emerald-500/30 shadow-[0_0_25px_hsl(142_71%_45%/0.1)]",
              rec.tipo === 'dica' && "border-primary/30 shadow-[0_0_25px_hsl(var(--primary)/0.1)]"
            )}
          >
            {/* Glow effect */}
            <div className={cn(
              "absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-30 pointer-events-none",
              rec.tipo === 'atencao' && "bg-amber-500",
              rec.tipo === 'evolucao' && "bg-emerald-500",
              rec.tipo === 'dica' && "bg-primary"
            )} />

            <div className="relative flex items-start gap-4">
              {/* Ícone animado */}
              <div className={cn(
                "p-3 rounded-xl transition-all duration-300",
                getIconColors(rec.tipo),
                "animate-pulse"
              )}>
                <div className="h-6 w-6">
                  {getIcon(rec.tipo, index)}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge 
                    variant={getBadgeVariant(rec.tipo) as any} 
                    className="text-xs animate-fade-in"
                  >
                    {rec.disciplina}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {rec.tipo === 'atencao' && '• Atenção'}
                    {rec.tipo === 'evolucao' && '• Parabéns!'}
                    {rec.tipo === 'dica' && '• Dica do Dia'}
                  </span>
                </div>
                <h4 className="font-semibold text-foreground mb-1.5 text-base">
                  {rec.titulo}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {rec.descricao}
                </p>
              </div>
            </div>

            {/* Progress bar animada */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/50 rounded-b-xl overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all",
                  rec.tipo === 'atencao' && "bg-amber-500",
                  rec.tipo === 'evolucao' && "bg-emerald-500",
                  rec.tipo === 'dica' && "bg-primary"
                )}
                style={{
                  animation: index === activeIndex ? 'progress 5s linear infinite' : 'none',
                  width: index === activeIndex ? '100%' : '0%',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Mini cards preview */}
      <div className="flex gap-2 mt-4">
        {recomendacoes.map((rec, index) => (
          <button
            key={index}
            onClick={() => {
              setIsTransitioning(true);
              setTimeout(() => {
                setActiveIndex(index);
                setIsTransitioning(false);
              }, 150);
            }}
            className={cn(
              "flex-1 p-3 rounded-lg border transition-all duration-300",
              "hover:scale-[1.02]",
              index === activeIndex 
                ? "bg-primary/10 border-primary/30" 
                : "bg-muted/30 border-border/50 opacity-60 hover:opacity-100"
            )}
          >
            <div className={cn("h-5 w-5 mx-auto", getIconColors(rec.tipo).split(' ')[0])}>
              {getIcon(rec.tipo, index)}
            </div>
            <p className="text-xs text-center mt-1.5 font-medium truncate">
              {rec.tipo === 'atencao' && 'Atenção'}
              {rec.tipo === 'evolucao' && 'Evolução'}
              {rec.tipo === 'dica' && 'Dica'}
            </p>
          </button>
        ))}
      </div>

      <style>{`
        @keyframes progress {
          from { transform: translateX(-100%); }
          to { transform: translateX(0%); }
        }
      `}</style>
    </div>
  );
}
