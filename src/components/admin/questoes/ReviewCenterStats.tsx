import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ClipboardCheck, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Sparkles, 
  RefreshCw,
  Loader2,
  Brain,
  Zap,
  Target,
  Clock
} from 'lucide-react';

interface ReviewCenterStatsProps {
  pendentes: number;
  validas: number;
  invalidas: number;
  duplicateGroupsCount: number;
  onValidateWithAI?: () => Promise<void>;
  onAutoApprove?: () => Promise<void>;
  avgScore?: number;
  highQualityCount?: number;
  lowQualityCount?: number;
  recentApprovals?: number;
}

export function ReviewCenterStats({ 
  pendentes, 
  validas, 
  invalidas, 
  duplicateGroupsCount,
  onValidateWithAI,
  onAutoApprove,
  avgScore = 0,
  highQualityCount = 0,
  lowQualityCount = 0,
  recentApprovals = 0
}: ReviewCenterStatsProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [isAutoApproving, setIsAutoApproving] = useState(false);

  const total = pendentes + validas + invalidas;
  const approvalRate = total > 0 ? Math.round((validas / total) * 100) : 0;
  const pendingRate = total > 0 ? Math.round((pendentes / total) * 100) : 0;

  const handleValidateWithAI = async () => {
    if (!onValidateWithAI) return;
    setIsValidating(true);
    try {
      await onValidateWithAI();
    } finally {
      setIsValidating(false);
    }
  };

  const handleAutoApprove = async () => {
    if (!onAutoApprove) return;
    setIsAutoApproving(true);
    try {
      await onAutoApprove();
    } finally {
      setIsAutoApproving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Stats Card */}
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-xl shadow-amber-500/30">
                <ClipboardCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="block">Central de Revisão</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Analise e aprove questões pendentes
                </span>
              </div>
            </CardTitle>
            <div className="flex gap-2">
              {onValidateWithAI && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleValidateWithAI}
                  disabled={isValidating || pendentes === 0}
                  className="border-purple-500/50 hover:bg-purple-500/10 hover:text-purple-400"
                >
                  {isValidating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4 mr-2" />
                  )}
                  Validar com IA
                </Button>
              )}
              {onAutoApprove && highQualityCount > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAutoApprove}
                  disabled={isAutoApproving}
                  className="border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400"
                >
                  {isAutoApproving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Auto-aprovar ({highQualityCount})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-amber-400">{pendentes}</div>
                  <div className="text-xs text-muted-foreground">Aguardando</div>
                </div>
                <Clock className="h-5 w-5 text-amber-400/50" />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-emerald-400">{validas}</div>
                  <div className="text-xs text-muted-foreground">Aprovadas</div>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-400/50" />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-400">{invalidas}</div>
                  <div className="text-xs text-muted-foreground">Rejeitadas</div>
                </div>
                <XCircle className="h-5 w-5 text-red-400/50" />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-400">{duplicateGroupsCount}</div>
                  <div className="text-xs text-muted-foreground">Duplicatas</div>
                </div>
                <Copy className="h-5 w-5 text-blue-400/50" />
              </div>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Taxa de Aprovação</span>
                <span className="font-medium text-emerald-400">{approvalRate}%</span>
              </div>
              <Progress value={approvalRate} className="h-2 bg-muted/30" />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Pendentes de Revisão</span>
                <span className="font-medium text-amber-400">{pendingRate}%</span>
              </div>
              <Progress value={pendingRate} className="h-2 bg-muted/30 [&>div]:bg-amber-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quality Insights */}
      {(avgScore > 0 || highQualityCount > 0 || lowQualityCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Score Médio</p>
                  <p className="text-xl font-bold text-primary">{avgScore}%</p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Alta Qualidade (≥80%)</p>
                  <p className="text-xl font-bold text-emerald-400">{highQualityCount}</p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Sparkles className="h-5 w-5 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-500/30 bg-orange-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Baixa Qualidade (&lt;50%)</p>
                  <p className="text-xl font-bold text-orange-400">{lowQualityCount}</p>
                </div>
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <AlertTriangle className="h-5 w-5 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
