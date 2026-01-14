import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  AlertCircle, 
  Eye, 
  Edit, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Search, 
  Filter,
  ArrowUpDown,
  Sparkles,
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { QuestionsPagination } from './QuestionsPagination';

interface TextoBase {
  id: string;
  titulo: string | null;
  conteudo: string;
  fonte: string | null;
  autor: string | null;
}

interface Questao {
  id: string;
  tema: string;
  subtema: string | null;
  enunciado: string;
  disciplina_id: string | null;
  score_qualidade: number | null;
  origem: string;
  status_validacao: string;
  nivel_confianca: string | null;
  created_at: string;
  textos_base?: TextoBase | null;
}

interface PendingReviewListProps {
  questoes: Questao[];
  selectedIds: Set<string>;
  onSelectOne: (id: string, checked: boolean) => void;
  onView: (questao: Questao) => void;
  onEdit: (questao: Questao) => void;
  onApprove: (questao: Questao) => void;
  onReject: (questao: Questao) => void;
  onDelete: (id: string) => void;
  getDisciplinaNome: (id: string | null) => string;
  origemLabels: Record<string, string>;
}

const ITEMS_PER_PAGE = 10;

export function PendingReviewList({
  questoes,
  selectedIds,
  onSelectOne,
  onView,
  onEdit,
  onApprove,
  onReject,
  onDelete,
  getDisciplinaNome,
  origemLabels
}: PendingReviewListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'score_asc' | 'score_desc'>('recent');
  const [filterScore, setFilterScore] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  
  const pendingQuestoes = useMemo(() => {
    let filtered = questoes.filter(q => q.status_validacao === 'pendente');
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(q => 
        q.enunciado.toLowerCase().includes(term) ||
        q.tema.toLowerCase().includes(term) ||
        (q.subtema && q.subtema.toLowerCase().includes(term))
      );
    }
    
    // Apply score filter
    if (filterScore !== 'all') {
      filtered = filtered.filter(q => {
        const score = q.score_qualidade || 0;
        switch (filterScore) {
          case 'high': return score >= 80;
          case 'medium': return score >= 50 && score < 80;
          case 'low': return score < 50;
          default: return true;
        }
      });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'score_asc':
          return (a.score_qualidade || 0) - (b.score_qualidade || 0);
        case 'score_desc':
          return (b.score_qualidade || 0) - (a.score_qualidade || 0);
        case 'recent':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    
    return filtered;
  }, [questoes, searchTerm, sortBy, filterScore]);

  const totalPages = Math.ceil(pendingQuestoes.length / ITEMS_PER_PAGE);
  const paginatedQuestoes = pendingQuestoes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 80) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreBackground = (score: number | null) => {
    if (score === null) return 'bg-muted/30 border-border/50';
    if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/30';
    if (score >= 50) return 'bg-amber-500/10 border-amber-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  const getConfidenceBadge = (confianca: string | null) => {
    if (!confianca) return null;
    const colors: Record<string, string> = {
      'alto': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      'medio': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      'baixo': 'bg-red-500/10 text-red-400 border-red-500/30'
    };
    const labels: Record<string, string> = {
      'alto': 'Alta',
      'medio': 'Média',
      'baixo': 'Baixa'
    };
    return (
      <Badge variant="outline" className={`text-xs ${colors[confianca] || ''}`}>
        {labels[confianca] || confianca}
      </Badge>
    );
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-400" />
              Questões Pendentes de Revisão
            </CardTitle>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
              {pendingQuestoes.length} pendente(s)
            </Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-9 h-9 w-40 bg-background/50 border-border/50"
              />
            </div>
            <Select value={filterScore} onValueChange={(v) => { setFilterScore(v as any); setCurrentPage(1); }}>
              <SelectTrigger className="h-9 w-32 bg-background/50 border-border/50">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Score" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="high">≥80% (Alto)</SelectItem>
                <SelectItem value="medium">50-79%</SelectItem>
                <SelectItem value="low">&lt;50% (Baixo)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="h-9 w-36 bg-background/50 border-border/50">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="score_desc">Maior score</SelectItem>
                <SelectItem value="score_asc">Menor score</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <CardDescription>
          Revise cada questão e aprove ou rejeite conforme a qualidade
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {pendingQuestoes.length > 0 ? (
          <>
            <ScrollArea className="h-[500px]">
              <div className="divide-y divide-border/30">
                {paginatedQuestoes.map((q) => (
                  <div
                    key={q.id}
                    className={`p-4 hover:bg-primary/5 transition-all duration-300 ${selectedIds.has(q.id) ? 'bg-primary/10' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedIds.has(q.id)}
                        onCheckedChange={(checked) => onSelectOne(q.id, checked as boolean)}
                        className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <div className="flex-1 space-y-2 min-w-0">
                        <p className="font-medium line-clamp-2 text-sm">{q.enunciado}</p>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="text-xs bg-muted/30">
                            {q.tema}
                          </Badge>
                          {q.subtema && (
                            <Badge variant="outline" className="text-xs bg-muted/30">
                              {q.subtema}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs bg-muted/30">
                            {getDisciplinaNome(q.disciplina_id)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {origemLabels[q.origem] || q.origem}
                          </Badge>
                          {getConfidenceBadge(q.nivel_confianca)}
                        </div>
                      </div>
                      
                      {/* Score indicator */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={`flex flex-col items-center p-2 rounded-lg border min-w-[60px] ${getScoreBackground(q.score_qualidade)}`}>
                              <span className={`text-lg font-bold ${getScoreColor(q.score_qualidade)}`}>
                                {q.score_qualidade || 0}%
                              </span>
                              <span className="text-xs text-muted-foreground">Score</span>
                              <Progress 
                                value={q.score_qualidade || 0} 
                                className="h-1 w-12 mt-1 bg-muted/30"
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Score de qualidade baseado em análise automática</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onView(q as any)}
                                className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Visualizar</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEdit(q as any)}
                                className="h-8 w-8 p-0 hover:bg-blue-500/10 hover:text-blue-400"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onApprove(q as any)}
                                className="h-8 w-8 p-0 hover:bg-emerald-500/10 text-emerald-400"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Aprovar</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onReject(q as any)}
                                className="h-8 w-8 p-0 hover:bg-red-500/10 text-red-400"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Rejeitar</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete(q.id)}
                                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <QuestionsPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={pendingQuestoes.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </>
        ) : (
          <div className="p-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-400 mb-4" />
            <h3 className="text-lg font-semibold text-foreground">
              {searchTerm || filterScore !== 'all' ? 'Nenhuma questão encontrada' : 'Nenhuma questão pendente!'}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm || filterScore !== 'all' 
                ? 'Tente ajustar os filtros de busca' 
                : 'Todas as questões foram revisadas.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
