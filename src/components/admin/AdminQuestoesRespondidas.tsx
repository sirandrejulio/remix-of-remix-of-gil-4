import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, 
  BookOpen,
  CheckCircle2,
  XCircle,
  Filter
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface QuestaoAgregada {
  id: string;
  enunciado: string;
  tema: string;
  disciplina: string;
  totalRespostas: number;
  acertos: number;
  taxa: number;
}

export function AdminQuestoesRespondidas() {
  const [questoes, setQuestoes] = useState<QuestaoAgregada[]>([]);
  const [filteredQuestoes, setFilteredQuestoes] = useState<QuestaoAgregada[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [disciplinas, setDisciplinas] = useState<string[]>([]);
  const [selectedDisciplina, setSelectedDisciplina] = useState<string>('todas');
  const [sortBy, setSortBy] = useState<string>('mais_respondidas');

  useEffect(() => {
    const fetchQuestoes = async () => {
      try {
        const { data, error } = await supabase
          .from('respostas')
          .select(`
            questao_id,
            esta_correta,
            questoes (
              id,
              enunciado,
              tema,
              disciplinas (
                nome
              )
            )
          `);

        if (error) throw error;

        // Agregar por questão
        const questaoMap = new Map<string, QuestaoAgregada>();

        data?.forEach((r: any) => {
          const questaoId = r.questao_id;
          const current = questaoMap.get(questaoId) || {
            id: questaoId,
            enunciado: r.questoes?.enunciado || 'Questão não disponível',
            tema: r.questoes?.tema || 'Sem tema',
            disciplina: r.questoes?.disciplinas?.nome || 'Sem disciplina',
            totalRespostas: 0,
            acertos: 0,
            taxa: 0,
          };

          current.totalRespostas++;
          if (r.esta_correta) current.acertos++;
          current.taxa = Math.round((current.acertos / current.totalRespostas) * 100);

          questaoMap.set(questaoId, current);
        });

        const questoesArray = Array.from(questaoMap.values());
        setQuestoes(questoesArray);
        setFilteredQuestoes(questoesArray);

        const uniqueDisciplinas = [...new Set(questoesArray.map(q => q.disciplina))];
        setDisciplinas(uniqueDisciplinas);
      } catch (error) {
        console.error('Error fetching questoes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestoes();
  }, []);

  useEffect(() => {
    let filtered = questoes;

    if (selectedDisciplina !== 'todas') {
      filtered = filtered.filter(q => q.disciplina === selectedDisciplina);
    }

    // Ordenar
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'mais_respondidas':
          return b.totalRespostas - a.totalRespostas;
        case 'menos_respondidas':
          return a.totalRespostas - b.totalRespostas;
        case 'maior_acerto':
          return b.taxa - a.taxa;
        case 'menor_acerto':
          return a.taxa - b.taxa;
        default:
          return 0;
      }
    });

    setFilteredQuestoes(filtered.slice(0, 50));
  }, [selectedDisciplina, sortBy, questoes]);

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Questões Respondidas (Agregado)
            </CardTitle>
            <CardDescription>Visão geral das questões mais respondidas</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={selectedDisciplina} onValueChange={setSelectedDisciplina}>
              <SelectTrigger className="w-40 h-9">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Disciplina" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {disciplinas.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mais_respondidas">Mais respondidas</SelectItem>
                <SelectItem value="menos_respondidas">Menos respondidas</SelectItem>
                <SelectItem value="maior_acerto">Maior acerto</SelectItem>
                <SelectItem value="menor_acerto">Menor acerto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredQuestoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <BookOpen className="h-16 w-16 mb-4 opacity-30" />
            <p>Nenhuma questão respondida ainda.</p>
          </div>
        ) : (
          <ScrollArea className="h-96 pr-4">
            <div className="space-y-3">
              {filteredQuestoes.map((q, index) => (
                <div
                  key={q.id}
                  className="p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {q.disciplina}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {q.tema}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">{q.enunciado}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 justify-end">
                        {q.taxa >= 70 ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-amber-500" />
                        )}
                        <span className={`font-bold ${q.taxa >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                          {q.taxa}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {q.acertos}/{q.totalRespostas} acertos
                      </p>
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
