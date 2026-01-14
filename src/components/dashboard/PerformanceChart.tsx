import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, BarChart3, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DisciplinePerformance {
  nome: string;
  acertos: number;
  erros: number;
  taxa: number;
}

export function PerformanceChart() {
  const { user } = useAuth();
  const [data, setData] = useState<DisciplinePerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chartType, setChartType] = useState<'bar' | 'radar' | 'area'>('bar');

  useEffect(() => {
    const fetchPerformance = async () => {
      if (!user) return;

      try {
        const { data: respostas, error } = await supabase
          .from('respostas')
          .select(`
            esta_correta,
            questao_id,
            questoes (
              disciplina_id,
              disciplinas (
                nome
              )
            )
          `)
          .eq('user_id', user.id);

        if (error) throw error;

        const disciplineMap = new Map<string, { acertos: number; total: number }>();

        respostas?.forEach((r: any) => {
          const disciplina = r.questoes?.disciplinas?.nome || 'Sem disciplina';
          const current = disciplineMap.get(disciplina) || { acertos: 0, total: 0 };

          disciplineMap.set(disciplina, {
            acertos: current.acertos + (r.esta_correta ? 1 : 0),
            total: current.total + 1,
          });
        });

        const performanceData: DisciplinePerformance[] = Array.from(disciplineMap.entries())
          .map(([nome, stats]) => ({
            nome: nome.length > 12 ? nome.substring(0, 12) + '...' : nome,
            acertos: stats.acertos,
            erros: stats.total - stats.acertos,
            taxa: Math.round((stats.acertos / stats.total) * 100),
          }))
          .sort((a, b) => b.taxa - a.taxa)
          .slice(0, 8);

        setData(performanceData);
      } catch (error) {
        console.error('Error fetching performance:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPerformance();
  }, [user]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card px-4 py-3 rounded-xl border border-primary/20 shadow-[0_0_20px_hsl(var(--primary)/0.15)]">
          <p className="font-semibold text-foreground mb-1">{label}</p>
          <p className="text-sm text-primary font-medium">
            Taxa: {payload[0].value}%
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
            <div className="absolute inset-0 blur-xl bg-violet-500/20 animate-pulse" />
          </div>
          <span className="text-sm text-muted-foreground">Carregando dados...</span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <div className="relative mb-4">
          <BarChart3 className="h-16 w-16 opacity-20" />
          <div className="absolute inset-0 blur-2xl bg-violet-500/10" />
        </div>
        <p className="font-medium">Nenhum dado disponível ainda.</p>
        <p className="text-sm opacity-70">Faça simulados para acompanhar sua evolução!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="glass-card rounded-lg p-1">
          <Tabs value={chartType} onValueChange={(v) => setChartType(v as any)}>
            <TabsList className="bg-transparent h-8">
              {['bar', 'radar', 'area'].map((type) => (
                <TabsTrigger
                  key={type}
                  value={type}
                  className={cn(
                    "text-xs px-3 h-7 rounded-md transition-all",
                    "data-[state=active]:bg-violet-500 data-[state=active]:text-white",
                    "data-[state=active]:shadow-[0_0_10px_hsl(var(--violet-500)/0.3)]"
                  )}
                >
                  {type === 'bar' ? 'Barras' : type === 'radar' ? 'Radar' : 'Área'}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="h-80">
        {chartType === 'bar' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1} />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="taxa"
                fill="url(#barGradient)"
                radius={[0, 8, 8, 0]}
                animationDuration={1200}
                animationEasing="ease-out"
                filter="url(#glow)"
              />
            </BarChart>
          </ResponsiveContainer>
        )}

        {chartType === 'radar' && (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
              <defs>
                <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <PolarAngleAxis dataKey="nome" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Radar
                name="Taxa de Acerto"
                dataKey="taxa"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#radarGradient)"
                animationDuration={1200}
                animationEasing="ease-out"
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        )}

        {chartType === 'area' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="nome" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="taxa"
                stroke="#8b5cf6"
                strokeWidth={3}
                fill="url(#areaGradient)"
                animationDuration={1200}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
