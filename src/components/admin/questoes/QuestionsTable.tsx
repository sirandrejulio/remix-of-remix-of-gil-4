import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, Edit, CheckCircle2, XCircle, Trash2, FileText, BookOpen } from 'lucide-react';
import { QuestionsPagination } from './QuestionsPagination';
import { useState } from 'react';

interface TextoBase {
  id: string;
  titulo: string | null;
}

interface Questao {
  id: string;
  tema: string;
  subtema: string | null;
  enunciado: string;
  disciplina_id: string | null;
  status_validacao: string;
  score_qualidade: number | null;
  nivel_confianca: string | null;
  origem: string;
  textos_base?: TextoBase | null;
}

interface QuestionsTableProps {
  questoes: Questao[];
  selectedIds: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onView: (questao: Questao) => void;
  onEdit: (questao: Questao) => void;
  onApprove: (questao: Questao) => void;
  onReject: (questao: Questao) => void;
  onDelete: (id: string) => void;
  getDisciplinaNome: (id: string | null) => string;
  statusLabels: Record<string, { label: string; color: string }>;
  origemLabels: Record<string, string>;
  confiancaColors: Record<string, string>;
}

const ITEMS_PER_PAGE = 15;

export function QuestionsTable({
  questoes,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onView,
  onEdit,
  onApprove,
  onReject,
  onDelete,
  getDisciplinaNome,
  statusLabels,
  origemLabels,
  confiancaColors
}: QuestionsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(questoes.length / ITEMS_PER_PAGE);
  const paginatedQuestoes = questoes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  const isAllSelected = paginatedQuestoes.length > 0 && paginatedQuestoes.every(q => selectedIds.has(q.id));

  const handleSelectAllPage = (checked: boolean) => {
    if (checked) {
      const newSelected = new Set(selectedIds);
      paginatedQuestoes.forEach(q => newSelected.add(q.id));
      onSelectAll(true);
    } else {
      onSelectAll(false);
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-0">
        <ScrollArea className="h-[550px]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
              <TableRow className="bg-muted/30 hover:bg-muted/40 border-border/50">
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAllPage}
                    aria-label="Selecionar todas da página"
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </TableHead>
                <TableHead className="w-[35%] text-foreground font-semibold">Enunciado</TableHead>
                <TableHead className="text-foreground font-semibold">Disciplina</TableHead>
                <TableHead className="text-foreground font-semibold">Status</TableHead>
                <TableHead className="text-foreground font-semibold">Score</TableHead>
                <TableHead className="text-foreground font-semibold">Origem</TableHead>
                <TableHead className="text-right text-foreground font-semibold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedQuestoes.map((q) => (
                <TableRow 
                  key={q.id}
                  className={`hover:bg-primary/5 border-border/30 transition-all duration-200 ${selectedIds.has(q.id) ? 'bg-primary/5' : ''}`}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(q.id)}
                      onCheckedChange={(checked) => onSelectOne(q.id, checked as boolean)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="font-medium truncate text-sm">{q.enunciado}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs bg-muted/30">{q.tema}</Badge>
                      {q.subtema && <Badge variant="outline" className="text-xs bg-muted/30">{q.subtema}</Badge>}
                      {q.textos_base && (
                        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                          <BookOpen className="h-3 w-3 mr-1" />
                          {q.textos_base.titulo || 'Texto Base'}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{getDisciplinaNome(q.disciplina_id)}</TableCell>
                  <TableCell>
                    <Badge className={statusLabels[q.status_validacao]?.color || 'bg-muted'} variant="outline">
                      {statusLabels[q.status_validacao]?.label || q.status_validacao}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{q.score_qualidade || 0}%</span>
                      {q.nivel_confianca && (
                        <span className={`text-xs ${confiancaColors[q.nivel_confianca] || ''}`}>
                          {q.nivel_confianca}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-muted/50 border-border/50 text-xs">
                      {origemLabels[q.origem] || q.origem}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button variant="ghost" size="sm" onClick={() => onView(q as any)} className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onEdit(q as any)} className="h-8 w-8 p-0 hover:bg-blue-500/10 hover:text-blue-400">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {q.status_validacao !== 'valida' && (
                        <Button variant="ghost" size="sm" onClick={() => onApprove(q as any)} className="h-8 w-8 p-0 hover:bg-emerald-500/10 text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      {q.status_validacao !== 'invalida' && (
                        <Button variant="ghost" size="sm" onClick={() => onReject(q as any)} className="h-8 w-8 p-0 hover:bg-red-500/10 text-red-400">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => onDelete(q.id)} className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {questoes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-muted-foreground/50" />
                      <span>Nenhuma questão encontrada</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
        <QuestionsPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={questoes.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </CardContent>
    </Card>
  );
}
