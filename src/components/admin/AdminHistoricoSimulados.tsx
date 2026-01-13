import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, 
  BookOpen,
  Calendar,
  Users,
  Trophy
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SimuladoAgregado {
  id: string;
  titulo: string;
  tipo: string;
  total_questoes: number;
  created_at: string;
  participantes: number;
  taxaMedia: number;
}

export function AdminHistoricoSimulados() {
  const [simulados, setSimulados] = useState<SimuladoAgregado[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSimulados = async () => {
      try {
        const { data: simuladosData, error } = await supabase
          .from('simulados')
          .select('*')
          .eq('status', 'concluido')
          .order('created_at', { ascending: false })
          .limit(30);

        if (error) throw error;

        // Buscar estatísticas agregadas
        const simuladosComStats = await Promise.all(
          (simuladosData || []).map(async (sim) => {
            const { data: respostas } = await supabase
              .from('respostas')
              .select('esta_correta, user_id')
              .eq('simulado_id', sim.id);

            const participantes = new Set(respostas?.map(r => r.user_id)).size;
            const acertos = respostas?.filter(r => r.esta_correta).length || 0;
            const total = respostas?.length || 1;
            const taxaMedia = Math.round((acertos / total) * 100);

            return {
              id: sim.id,
              titulo: sim.titulo,
              tipo: sim.tipo,
              total_questoes: sim.total_questoes,
              created_at: sim.created_at,
              participantes,
              taxaMedia,
            };
          })
        );

        setSimulados(simuladosComStats);
      } catch (error) {
        console.error('Error fetching simulados:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSimulados();
  }, []);

  if (isLoading) {
    return (
      <Card className="animate-fade-in">
        <CardContent className="flex items-center justify-center h-80">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Histórico de Simulados (Sistema)
        </CardTitle>
        <CardDescription>
          {simulados.length} simulados concluídos
        </CardDescription>
      </CardHeader>
      <CardContent>
        {simulados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <BookOpen className="h-16 w-16 mb-4 opacity-30" />
            <p>Nenhum simulado concluído ainda.</p>
          </div>
        ) : (
          <ScrollArea className="h-96 pr-4">
            <div className="space-y-4">
              {simulados.map((sim, index) => (
                <div
                  key={sim.id}
                  className="p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-foreground">{sim.titulo}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {sim.tipo}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {sim.total_questoes} questões
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Taxa Média de Acerto</span>
                      <span className="font-medium">{sim.taxaMedia}%</span>
                    </div>
                    <Progress value={sim.taxaMedia} className="h-2" />
                    
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {sim.participantes} participantes
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(sim.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3 w-3" />
                        {sim.taxaMedia >= 70 ? 'Bom desempenho' : 'Precisa melhorar'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
