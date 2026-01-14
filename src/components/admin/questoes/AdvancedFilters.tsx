import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Filter, Search, Calendar, BookOpen, Tag, FileText, ChevronDown, X,
  CheckSquare, CheckCircle2, XCircle, Trash2, Loader2
} from 'lucide-react';
import { useState } from 'react';

interface Disciplina {
  id: string;
  nome: string;
}

interface AdvancedFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  filterStatus: string;
  setFilterStatus: (value: string) => void;
  filterScoreMin: string;
  setFilterScoreMin: (value: string) => void;
  filterAno: string;
  setFilterAno: (value: string) => void;
  filterDisciplina: string;
  setFilterDisciplina: (value: string) => void;
  filterBanca: string;
  setFilterBanca: (value: string) => void;
  filterOrigem: string;
  setFilterOrigem: (value: string) => void;
  filterTema: string;
  setFilterTema: (value: string) => void;
  filterSubtema: string;
  setFilterSubtema: (value: string) => void;
  filterTextoBase: string;
  setFilterTextoBase: (value: string) => void;
  disciplinas: Disciplina[];
  uniqueYears: number[];
  uniqueTemas: string[];
  uniqueSubtemas: string[];
  filteredCount: number;
  bancas: string[];
  // Bulk selection props
  totalCount?: number;
  selectedCount?: number;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onBulkApprove?: () => void;
  onBulkReject?: () => void;
  onBulkDelete?: () => void;
  isDeleting?: boolean;
  variant?: 'primary' | 'amber';
  selectAllLabel?: string;
}

export function AdvancedFilters({
  search, setSearch,
  filterStatus, setFilterStatus,
  filterScoreMin, setFilterScoreMin,
  filterAno, setFilterAno,
  filterDisciplina, setFilterDisciplina,
  filterBanca, setFilterBanca,
  filterOrigem, setFilterOrigem,
  filterTema, setFilterTema,
  filterSubtema, setFilterSubtema,
  filterTextoBase, setFilterTextoBase,
  disciplinas,
  uniqueYears,
  uniqueTemas,
  uniqueSubtemas,
  filteredCount,
  bancas,
  // Bulk selection props
  totalCount,
  selectedCount = 0,
  onSelectAll,
  onDeselectAll,
  onBulkApprove,
  onBulkReject,
  onBulkDelete,
  isDeleting = false,
  variant = 'primary',
  selectAllLabel
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(true);

  const hasActiveFilters = filterStatus !== 'all' || filterAno !== 'all' || 
    filterDisciplina !== 'all' || filterBanca !== 'all' || filterOrigem !== 'all' ||
    filterTema !== 'all' || filterSubtema !== 'all' || filterTextoBase !== 'all' ||
    filterScoreMin !== '' || search !== '';

  const clearFilters = () => {
    setSearch('');
    setFilterStatus('all');
    setFilterScoreMin('');
    setFilterAno('all');
    setFilterDisciplina('all');
    setFilterBanca('all');
    setFilterOrigem('all');
    setFilterTema('all');
    setFilterSubtema('all');
    setFilterTextoBase('all');
  };

  const hasBulkSelection = onSelectAll && onDeselectAll && totalCount !== undefined;
  
  const colorClass = variant === 'amber' 
    ? 'border-amber-500/30' 
    : 'border-primary/30';
  
  const iconColorClass = variant === 'amber' ? 'text-amber-400' : 'text-primary';
  const buttonColorClass = variant === 'amber' 
    ? 'border-amber-500/50 hover:bg-amber-500/10' 
    : 'border-primary/50 hover:bg-primary/10';

  return (
    <Card className={`border-border/50 bg-card/50 backdrop-blur-sm ${hasBulkSelection ? colorClass : ''}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="p-0 hover:bg-transparent gap-2 h-auto">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-5 w-5 text-primary" />
                  Filtros Avançados
                </CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <div className="flex items-center gap-3">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                  Limpar filtros
                </Button>
              )}
              <span className="text-sm text-muted-foreground font-medium">
                {filteredCount} questões
              </span>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-2 space-y-4">
            {/* Seleção em Massa */}
            {hasBulkSelection && (
              <>
                <div className={`p-3 rounded-lg border ${variant === 'amber' ? 'border-amber-500/30 bg-amber-500/5' : 'border-primary/30 bg-primary/5'}`}>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <CheckSquare className={`h-5 w-5 ${iconColorClass}`} />
                      <span className="font-medium text-foreground">Seleção em Massa:</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onSelectAll}
                        className={`gap-1.5 ${buttonColorClass}`}
                      >
                        <CheckSquare className="h-4 w-4" />
                        {selectAllLabel || `Selecionar Todas (${totalCount})`}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onDeselectAll}
                        disabled={selectedCount === 0}
                        className="gap-1.5"
                      >
                        Desmarcar Todas
                      </Button>
                      {selectedCount > 0 && (
                        <Badge className={variant === 'amber' ? 'bg-amber-500 text-white' : 'bg-primary text-primary-foreground'}>
                          {selectedCount} selecionada(s)
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Ações quando há seleção */}
                  {selectedCount > 0 && (onBulkApprove || onBulkReject || onBulkDelete) && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                      <span className="text-sm text-muted-foreground mr-2">Ações:</span>
                      {onBulkApprove && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onBulkApprove}
                          className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                      )}
                      {onBulkReject && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onBulkReject}
                          className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                      )}
                      {onBulkDelete && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={onBulkDelete}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-1" />
                          )}
                          Excluir
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <Separator className="bg-border/30" />
              </>
            )}

            <ScrollArea className="max-h-[280px]">
              <div className="space-y-4 pr-4">
                {/* Linha 1: Busca e Status */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por enunciado, tema ou subtema..."
                      className="pl-10 bg-background/50 border-border/50 h-9"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="bg-background/50 border-border/50 h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="valida">Válidas</SelectItem>
                      <SelectItem value="pendente">Pendentes</SelectItem>
                      <SelectItem value="invalida">Inválidas</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Score mínimo"
                    value={filterScoreMin}
                    onChange={(e) => setFilterScoreMin(e.target.value)}
                    min="0"
                    max="100"
                    className="bg-background/50 border-border/50 h-9"
                  />
                </div>

                {/* Linha 2: Ano, Disciplina, Banca, Origem */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Select value={filterAno} onValueChange={setFilterAno}>
                    <SelectTrigger className="bg-background/50 border-border/50 h-9">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-[200px]">
                        <SelectItem value="all">Todos os anos</SelectItem>
                        {uniqueYears.map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                  <Select value={filterDisciplina} onValueChange={setFilterDisciplina}>
                    <SelectTrigger className="bg-background/50 border-border/50 h-9">
                      <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Disciplina" />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-[200px]">
                        <SelectItem value="all">Todas disciplinas</SelectItem>
                        {disciplinas.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                  <Select value={filterBanca} onValueChange={setFilterBanca}>
                    <SelectTrigger className="bg-background/50 border-border/50 h-9">
                      <SelectValue placeholder="Banca" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as bancas</SelectItem>
                      {bancas.map(banca => (
                        <SelectItem key={banca} value={banca}>{banca}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterOrigem} onValueChange={setFilterOrigem}>
                    <SelectTrigger className="bg-background/50 border-border/50 h-9">
                      <SelectValue placeholder="Origem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas origens</SelectItem>
                      <SelectItem value="MANUAL">Manual</SelectItem>
                      <SelectItem value="GOOGLE_GEMINI">Gemini</SelectItem>
                      <SelectItem value="IA_PRINCIPAL">IA Principal</SelectItem>
                      <SelectItem value="PDF_IMPORTADO">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Linha 3: Tema, Subtema, Texto Base */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Select value={filterTema} onValueChange={setFilterTema}>
                    <SelectTrigger className="bg-background/50 border-border/50 h-9">
                      <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Tema" />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-[200px]">
                        <SelectItem value="all">Todos os temas</SelectItem>
                        {uniqueTemas.map(tema => (
                          <SelectItem key={tema} value={tema}>{tema}</SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                  <Select value={filterSubtema} onValueChange={setFilterSubtema}>
                    <SelectTrigger className="bg-background/50 border-border/50 h-9">
                      <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Subtema" />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-[200px]">
                        <SelectItem value="all">Todos subtemas</SelectItem>
                        {uniqueSubtemas.map(subtema => (
                          <SelectItem key={subtema} value={subtema}>{subtema}</SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                  <Select value={filterTextoBase} onValueChange={setFilterTextoBase}>
                    <SelectTrigger className="bg-background/50 border-border/50 h-9">
                      <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Texto Base" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="com">Com Texto Base</SelectItem>
                      <SelectItem value="sem">Sem Texto Base</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
