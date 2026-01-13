import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Filter,
  BookOpen,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface QuestaoRespondida {
  id: string;
  questao_id: string;
  esta_correta: boolean;
  resposta_usuario: string;
  created_at: string;
  tempo_resposta_segundos: number | null;
  questao: {
    enunciado: string;
    tema: string;
    resposta_correta: string;
    disciplina?: {
      nome: string;
    };
  };
  simulado?: {
    titulo: string;
  };
}

export function QuestoesRespondidas() {
  const { user } = useAuth();
  const [questoes, setQuestoes] = useState<QuestaoRespondida[]>([]);
  const [filteredQuestoes, setFilteredQuestoes] = useState<QuestaoRespondida[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [disciplinas, setDisciplinas] = useState<string[]>([]);
  const [selectedDisciplina, setSelectedDisciplina] = useState<string>('todas');
  const [selectedStatus, setSelectedStatus] = useState<string>('todas');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestoes = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('respostas')
          .select(`
            id,
            questao_id,
            esta_correta,
            resposta_usuario,
            created_at,
            tempo_resposta_segundos,
            questoes (
              enunciado,
              tema,
              resposta_correta,
              disciplinas (
                nome
              )
            ),
            simulados (
              titulo
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        const formattedData = data?.map((r: any) => ({
          id: r.id,
          questao_id: r.questao_id,
          esta_correta: r.esta_correta,
          resposta_usuario: r.resposta_usuario,
          created_at: r.created_at,
          tempo_resposta_segundos: r.tempo_resposta_segundos,
          questao: {
            enunciado: r.questoes?.enunciado || 'Questão não disponível',
            tema: r.questoes?.tema || 'Sem tema',
            resposta_correta: r.questoes?.resposta_correta || '-',
            disciplina: r.questoes?.disciplinas,
          },
          simulado: r.simulados,
        })) || [];

        setQuestoes(formattedData);
        setFilteredQuestoes(formattedData);

        // Extrair disciplinas únicas
        const uniqueDisciplinas = [...new Set(
          formattedData
            .map(q => q.questao.disciplina?.nome)
            .filter(Boolean)
        )] as string[];
        setDisciplinas(uniqueDisciplinas);

      } catch (error) {
        console.error('Error fetching questoes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestoes();
  }, [user]);

  useEffect(() => {
    let filtered = questoes;

    if (selectedDisciplina !== 'todas') {
      filtered = filtered.filter(q => q.questao.disciplina?.nome === selectedDisciplina);
    }

    if (selectedStatus === 'corretas') {
      filtered = filtered.filter(q => q.esta_correta);
    } else if (selectedStatus === 'incorretas') {
      filtered = filtered.filter(q => !q.esta_correta);
    }

    setFilteredQuestoes(filtered);
  }, [selectedDisciplina, selectedStatus, questoes]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (isLoading) {
    return (
      <Card className="glass-card border-primary/10 animate-fade-in">
        <CardContent className="flex items-center justify-center h-80">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
            </div>
            <span className="text-sm text-muted-foreground">Carregando questões...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-primary/10 overflow-hidden animate-fade-in">
      {/* Decorative glow */}
      <div className="absolute top-0 left-0 w-48 h-48 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      
      <CardHeader className="relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 flex items-center justify-center shadow-[0_0_15px_hsl(142_71%_45%/0.15)]">
              <BookOpen className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle>Questões Respondidas</CardTitle>
              <CardDescription>{filteredQuestoes.length} questões encontradas</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={selectedDisciplina} onValueChange={setSelectedDisciplina}>
              <SelectTrigger className="w-40 h-9 glass-card border-primary/20 hover:border-primary/40 transition-colors">
                <Filter className="h-4 w-4 mr-2 text-primary" />
                <SelectValue placeholder="Disciplina" />
              </SelectTrigger>
              <SelectContent className="glass-card">
                <SelectItem value="todas">Todas</SelectItem>
                {disciplinas.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-32 h-9 glass-card border-primary/20 hover:border-primary/40 transition-colors">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="glass-card">
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="corretas">Corretas</SelectItem>
                <SelectItem value="incorretas">Incorretas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        {filteredQuestoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="relative mb-4">
              <BookOpen className="h-16 w-16 opacity-20" />
              <div className="absolute inset-0 blur-2xl bg-primary/10" />
            </div>
            <p className="font-medium">Nenhuma questão respondida ainda.</p>
          </div>
        ) : (
          <ScrollArea className="h-96 pr-4">
            <div className="space-y-3">
              {filteredQuestoes.map((q, index) => (
                <div
                  key={q.id}
                  className="group p-4 rounded-xl bg-gradient-to-r from-muted/40 to-muted/20 border border-border/50 hover:border-primary/30 hover:shadow-[0_0_20px_hsl(var(--primary)/0.1)] transition-all duration-300 cursor-pointer animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                  onClick={() => toggleExpand(q.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 p-1.5 rounded-lg transition-all duration-300 ${
                      q.esta_correta 
                        ? 'bg-emerald-500/10 shadow-[0_0_10px_hsl(142_71%_45%/0.2)]' 
                        : 'bg-destructive/10 shadow-[0_0_10px_hsl(var(--destructive)/0.2)]'
                    }`}>
                      {q.esta_correta ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                          {q.questao.disciplina?.nome || 'Sem disciplina'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(q.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                        {q.tempo_resposta_segundos && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {Math.floor(q.tempo_resposta_segundos / 60)}min
                          </span>
                        )}
                      </div>
                      <p className={`text-sm text-foreground ${expandedId === q.id ? '' : 'line-clamp-2'}`}>
                        {q.questao.enunciado}
                      </p>
                      
                      {expandedId === q.id && (
                        <div className="mt-3 pt-3 border-t border-border/50 space-y-2 animate-fade-in">
                          <p className="text-sm">
                            <span className="font-medium">Sua resposta:</span>{' '}
                            <span className={q.esta_correta ? 'text-emerald-600 font-medium' : 'text-destructive font-medium'}>
                              {q.resposta_usuario || '-'}
                            </span>
                          </p>
                          {!q.esta_correta && (
                            <p className="text-sm">
                              <span className="font-medium">Resposta correta:</span>{' '}
                              <span className="text-emerald-600 font-medium">{q.questao.resposta_correta}</span>
                            </p>
                          )}
                          {q.simulado && (
                            <p className="text-xs text-muted-foreground">
                              Simulado: {q.simulado.titulo}
                            </p>
                          )}
                        </div>
                      )}
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
