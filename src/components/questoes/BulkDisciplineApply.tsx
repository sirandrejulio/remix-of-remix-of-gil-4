import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Square, Layers, Filter, AlertCircle } from 'lucide-react';

interface Disciplina {
  id: string;
  nome: string;
}

type FilterType = 'all' | 'without-discipline';

interface BulkDisciplineApplyProps {
  disciplinas: Disciplina[];
  questionsCount: number;
  questionsWithoutDiscipline: number;
  selectedIndices: number[];
  filterType: FilterType;
  onFilterChange: (filter: FilterType) => void;
  onToggleSelect: (index: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onApplyDiscipline: (disciplinaId: string, indices: number[]) => void;
}

export function BulkDisciplineApply({
  disciplinas,
  questionsCount,
  questionsWithoutDiscipline,
  selectedIndices,
  filterType,
  onFilterChange,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onApplyDiscipline,
}: BulkDisciplineApplyProps) {
  const [bulkDisciplinaId, setBulkDisciplinaId] = useState('');

  const handleApply = () => {
    if (!bulkDisciplinaId) return;
    onApplyDiscipline(bulkDisciplinaId, selectedIndices);
    setBulkDisciplinaId('');
  };

  const allSelected = selectedIndices.length === questionsCount && questionsCount > 0;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="py-3 px-4 space-y-3">
        {/* Filter row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filtrar:</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFilterChange('all')}
              className="h-7 text-xs"
            >
              Todas ({questionsCount})
            </Button>
            <Button
              type="button"
              variant={filterType === 'without-discipline' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFilterChange('without-discipline')}
              className="h-7 text-xs gap-1"
            >
              <AlertCircle className="h-3 w-3" />
              Sem Disciplina ({questionsWithoutDiscipline})
            </Button>
          </div>
        </div>

        {/* Bulk actions row */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Aplicar em Massa:</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={allSelected ? onDeselectAll : onSelectAll}
              className="gap-1.5 h-8"
            >
              {allSelected ? (
                <>
                  <Square className="h-3.5 w-3.5" />
                  Desmarcar Todas
                </>
              ) : (
                <>
                  <CheckSquare className="h-3.5 w-3.5" />
                  Selecionar Todas
                </>
              )}
            </Button>
            
            {selectedIndices.length > 0 && (
              <Badge variant="secondary" className="h-6">
                {selectedIndices.length} selecionada{selectedIndices.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <Select value={bulkDisciplinaId} onValueChange={setBulkDisciplinaId}>
              <SelectTrigger className="w-[200px] h-8 bg-background">
                <SelectValue placeholder="Escolha a disciplina" />
              </SelectTrigger>
              <SelectContent>
                {disciplinas.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              disabled={!bulkDisciplinaId || selectedIndices.length === 0}
              className="h-8 gap-1.5"
            >
              Aplicar
              {selectedIndices.length > 0 && ` (${selectedIndices.length})`}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface BulkSelectCheckboxProps {
  index: number;
  isSelected: boolean;
  onToggle: (index: number) => void;
}

export function BulkSelectCheckbox({ index, isSelected, onToggle }: BulkSelectCheckboxProps) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={`select-${index}`}
        checked={isSelected}
        onCheckedChange={() => onToggle(index)}
        className="border-primary/50 data-[state=checked]:bg-primary"
      />
      <Label htmlFor={`select-${index}`} className="text-xs text-muted-foreground cursor-pointer">
        Selecionar
      </Label>
    </div>
  );
}

export type { FilterType };
