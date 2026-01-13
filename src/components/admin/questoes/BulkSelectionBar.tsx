import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, CheckCircle2, XCircle, Trash2, Loader2 } from 'lucide-react';

interface BulkSelectionBarProps {
  totalCount: number;
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkApprove?: () => void;
  onBulkReject?: () => void;
  onBulkDelete?: () => void;
  isDeleting?: boolean;
  variant?: 'primary' | 'amber';
  selectAllLabel?: string;
}

export function BulkSelectionBar({
  totalCount,
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onBulkApprove,
  onBulkReject,
  onBulkDelete,
  isDeleting = false,
  variant = 'primary',
  selectAllLabel
}: BulkSelectionBarProps) {
  const colorClass = variant === 'amber' 
    ? 'border-amber-500/30 bg-amber-500/5' 
    : 'border-primary/30 bg-primary/5';
  
  const iconColorClass = variant === 'amber' ? 'text-amber-400' : 'text-primary';
  const buttonColorClass = variant === 'amber' 
    ? 'border-amber-500/50 hover:bg-amber-500/10' 
    : 'border-primary/50 hover:bg-primary/10';

  return (
    <Card className={`${colorClass} backdrop-blur-sm`}>
      <CardContent className="py-3 px-4">
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
      </CardContent>
    </Card>
  );
}
