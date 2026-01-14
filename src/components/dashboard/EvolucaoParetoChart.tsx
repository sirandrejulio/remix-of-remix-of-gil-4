import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart
} from "recharts";
import {
  TrendingUp,
  Calendar,
  Target,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DailyProgress {
  data: string;
  dataFormatada: string;
  grupo1: number;
  grupo2: number;
  meta: number;
}

const DISCIPLINAS_G1 = ["Informática", "Vendas e Negociação", "Língua Portuguesa", "Conhecimentos Bancários"];
const DISCIPLINAS_G2 = ["Matemática Financeira", "Matemática", "Atualidades", "Inglês"];

export function EvolucaoParetoChart() {
  const { user } = useAuth();
  const [data, setData] = useState<DailyProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [ultimoG1, setUltimoG1] = useState(0);
  const [ultimoG2, setUltimoG2] = useState(0);
  const [tendenciaG1, setTendenciaG1] = useState<'up' | 'down' | 'stable'>('stable');

  useEffect(() => {
    const fetchEvolution = async () => {
      if (!user) return;

      try {
        // Buscar todas as respostas dos últimos 30 dias
        const trintaDiasAtras = subDays(new Date(), 30);

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
          .eq('user_id', user.id)
          .gte('created_at', trintaDiasAtras.toISOString())
          .order('created_at', { ascending: true });

        if (!respostas || respostas.length === 0) {
          setLoading(false);
          return;
        }

        // Criar intervalo de dias
        const hoje = new Date();
        const dias = eachDayOfInterval({
          start: trintaDiasAtras,
          end: hoje
        });

        // Acumular respostas por dia
        const acumuladoPorDia: Record<string, {
          g1: { correct: number; total: number };
          g2: { correct: number; total: number };
        }> = {};

        // Inicializar todos os dias
        dias.forEach(dia => {
          const key = format(dia, 'yyyy-MM-dd');
          acumuladoPorDia[key] = {
            g1: { correct: 0, total: 0 },
            g2: { correct: 0, total: 0 }
          };
        });

        // Preencher com dados reais (acumulativo)
        const acumuladoG1 = { correct: 0, total: 0 };
        const acumuladoG2 = { correct: 0, total: 0 };

        respostas.forEach((r: any) => {
          const disciplina = r.questoes?.disciplinas?.nome || 'Outras';
          const diaKey = format(new Date(r.created_at), 'yyyy-MM-dd');

          if (DISCIPLINAS_G1.includes(disciplina)) {
            acumuladoG1.total++;
            if (r.esta_correta) acumuladoG1.correct++;
          } else if (DISCIPLINAS_G2.includes(disciplina)) {
            acumuladoG2.total++;
            if (r.esta_correta) acumuladoG2.correct++;
          }

          // Atualizar o acumulado do dia
          if (acumuladoPorDia[diaKey]) {
            acumuladoPorDia[diaKey].g1 = { ...acumuladoG1 };
            acumuladoPorDia[diaKey].g2 = { ...acumuladoG2 };
          }
        });

        // Propagar valores para dias sem atividade (manter último valor conhecido)
        let lastG1 = { correct: 0, total: 0 };
        let lastG2 = { correct: 0, total: 0 };

        // Converter para array do gráfico
        const chartData: DailyProgress[] = dias.map(dia => {
          const key = format(dia, 'yyyy-MM-dd');
          const dayData = acumuladoPorDia[key];

          // Se tem dados neste dia, atualizar last
          if (dayData.g1.total > lastG1.total) {
            lastG1 = dayData.g1;
          }
          if (dayData.g2.total > lastG2.total) {
            lastG2 = dayData.g2;
          }

          const g1Percent = lastG1.total > 0 ? Math.round((lastG1.correct / lastG1.total) * 100) : 0;
          const g2Percent = lastG2.total > 0 ? Math.round((lastG2.correct / lastG2.total) * 100) : 0;

          return {
            data: key,
            dataFormatada: format(dia, "dd/MM", { locale: ptBR }),
            grupo1: g1Percent,
            grupo2: g2Percent,
            meta: 70
          };
        });

        // Filtrar apenas os últimos 14 dias para visualização mais limpa
        const ultimos14Dias = chartData.slice(-14);
        setData(ultimos14Dias);

        // Definir últimos valores
        const ultimo = ultimos14Dias[ultimos14Dias.length - 1];
        if (ultimo) {
          setUltimoG1(ultimo.grupo1);
          setUltimoG2(ultimo.grupo2);

          // Calcular tendência (comparar com 7 dias atrás)
          const seteAtras = ultimos14Dias[ultimos14Dias.length - 8];
          if (seteAtras) {
            const diff = ultimo.grupo1 - seteAtras.grupo1;
            if (diff > 5) setTendenciaG1('up');
            else if (diff < -5) setTendenciaG1('down');
            else setTendenciaG1('stable');
          }
        }

      } catch (error) {
        console.error('Error fetching evolution data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvolution();
  }, [user]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-violet-500" />
              <span className="text-muted-foreground">Grupo 1:</span>
              <span className="font-bold text-violet-500">{payload[0]?.value}%</span>
            </p>
            <p className="text-sm flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-fuchsia-500" />
              <span className="text-muted-foreground">Grupo 2:</span>
              <span className="font-bold text-fuchsia-500">{payload[1]?.value}%</span>
            </p>
            <p className="text-sm flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500/50" />
              <span className="text-muted-foreground">Meta:</span>
              <span className="font-medium text-emerald-500">70%</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm text-muted-foreground">Carregando evolução...</span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h4 className="font-medium text-muted-foreground mb-2">Sem dados de evolução</h4>
        <p className="text-sm text-muted-foreground/70">
          Continue estudando para visualizar sua evolução ao longo do tempo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com estatísticas */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-violet-500" />
            <span className="text-sm font-medium">Grupo 1</span>
            <Badge
              variant="outline"
              className={cn(
                "ml-1",
                ultimoG1 >= 70 ? "border-emerald-500 text-emerald-500" : "border-violet-500 text-violet-500"
              )}
            >
              {ultimoG1}%
            </Badge>
            {tendenciaG1 === 'up' && (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-fuchsia-500" />
            <span className="text-sm font-medium">Grupo 2</span>
            <Badge variant="outline" className="ml-1 border-fuchsia-500 text-fuchsia-500">
              {ultimoG2}%
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Target className="h-4 w-4 text-emerald-500" />
          <span>Meta: 70%</span>
        </div>
      </div>

      {/* Gráfico */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorG1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorG2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#d946ef" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="dataFormatada"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Linha de meta */}
            <Line
              type="monotone"
              dataKey="meta"
              stroke="hsl(142 76% 36%)"
              strokeDasharray="5 5"
              strokeWidth={2}
              dot={false}
              name="Meta"
            />

            {/* Área e Linha Grupo 1 */}
            <Area
              type="monotone"
              dataKey="grupo1"
              stroke="#8b5cf6"
              fillOpacity={1}
              fill="url(#colorG1)"
              strokeWidth={3}
              name="Grupo 1"
              dot={{ r: 3, fill: '#8b5cf6' }}
              activeDot={{ r: 6, fill: '#8b5cf6' }}
            />

            {/* Área e Linha Grupo 2 */}
            <Area
              type="monotone"
              dataKey="grupo2"
              stroke="#d946ef"
              fillOpacity={1}
              fill="url(#colorG2)"
              strokeWidth={3}
              name="Grupo 2"
              dot={{ r: 3, fill: '#d946ef' }}
              activeDot={{ r: 6, fill: '#d946ef' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda explicativa */}
      <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg border">
        <Zap className="h-4 w-4 text-violet-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          <strong>Estratégia Pareto:</strong> Mantenha o Grupo 1 (violeta) acima da linha verde de meta (70%)
          antes de focar no Grupo 2 (fúcsia). O Grupo 1 representa 75% da sua nota final.
        </p>
      </div>
    </div>
  );
}
