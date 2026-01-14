import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Settings, Cpu, Clock, Shield, Zap, Sparkles, Bell, Upload, Database, Activity, RefreshCw, ChartBar } from 'lucide-react';
import { toast } from 'sonner';

interface SystemConfig {
  id: string;
  chave: string;
  valor: string;
  descricao: string | null;
}

export default function AdminConfiguracoes() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalConfigs, setOriginalConfigs] = useState<SystemConfig[]>([]);

  const fetchConfigs = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .order('chave');
      
      if (error) throw error;
      
      setConfigs(data || []);
      setOriginalConfigs(data || []);
      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching configs:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const getConfigValue = (chave: string): string => {
    const config = configs.find((c) => c.chave === chave);
    return config?.valor || '';
  };

  const getConfigBool = (chave: string): boolean => {
    const value = getConfigValue(chave);
    return value === 'true';
  };

  const updateConfig = (chave: string, valor: string) => {
    setConfigs((prev) =>
      prev.map((c) => (c.chave === chave ? { ...c, valor } : c))
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const promises = configs.map((config) =>
        supabase
          .from('system_config')
          .update({ valor: config.valor })
          .eq('id', config.id)
      );

      const results = await Promise.all(promises);
      const hasError = results.some((r) => r.error);

      if (hasError) {
        throw new Error('Erro ao salvar algumas configurações');
      }

      setOriginalConfigs([...configs]);
      setHasChanges(false);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving configs:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setConfigs([...originalConfigs]);
    setHasChanges(false);
    toast.info('Alterações descartadas');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
          <Loader2 className="h-8 w-8 animate-spin text-primary relative z-10" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-violet-500/10 to-cyan-500/20 rounded-2xl blur-xl opacity-60" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-xl bg-card/40 backdrop-blur-xl border border-border/30">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-violet-500/50 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative p-4 rounded-2xl bg-gradient-to-br from-primary to-violet-500 shadow-2xl shadow-primary/25">
                <Settings className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
                Configurações do Sistema
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Gerencie todas as configurações da plataforma
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 animate-pulse">
                Alterações não salvas
              </Badge>
            )}
            <Button 
              variant="outline"
              onClick={handleReset}
              disabled={!hasChanges || isSaving}
              className="border-border/50 hover:bg-muted/50"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Resetar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || !hasChanges}
              className="relative group overflow-hidden bg-primary hover:bg-primary/90 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary-foreground/0 via-primary-foreground/10 to-primary-foreground/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card/60 border border-border/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{configs.length}</p>
              <p className="text-sm text-muted-foreground">Configurações</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-card/60 border border-border/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Activity className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {configs.filter(c => c.valor === 'true').length}
              </p>
              <p className="text-sm text-muted-foreground">Recursos Ativos</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-card/60 border border-border/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <Cpu className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {getConfigBool('ai_principal_enabled') && getConfigBool('ai_gemini_enabled') ? '2' : 
                 getConfigBool('ai_principal_enabled') || getConfigBool('ai_gemini_enabled') ? '1' : '0'}
              </p>
              <p className="text-sm text-muted-foreground">Motores IA</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-card/60 border border-border/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getConfigBool('manutencao_ativa') ? 'bg-orange-500/10' : 'bg-emerald-500/10'}`}>
              <Shield className={`h-5 w-5 ${getConfigBool('manutencao_ativa') ? 'text-orange-500' : 'text-emerald-500'}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {getConfigBool('manutencao_ativa') ? 'Ativo' : 'Inativo'}
              </p>
              <p className="text-sm text-muted-foreground">Modo Manutenção</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* AI Settings */}
        <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full opacity-50" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 group-hover:scale-110 transition-transform duration-300">
                <Cpu className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Motores de IA</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Geração automática de questões
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 relative">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-all duration-300 group/item">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 group-hover/item:bg-primary/20 transition-colors duration-300">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <Label className="text-base font-medium">IA Principal (Lovable)</Label>
                  <p className="text-sm text-muted-foreground">
                    Motor principal para geração de questões
                  </p>
                </div>
              </div>
              <Switch
                checked={getConfigBool('ai_principal_enabled')}
                onCheckedChange={(checked) => updateConfig('ai_principal_enabled', String(checked))}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-all duration-300 group/item">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10 group-hover/item:bg-violet-500/20 transition-colors duration-300">
                  <Zap className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <Label className="text-base font-medium">Google Gemini</Label>
                  <p className="text-sm text-muted-foreground">
                    Motor secundário via API do Google
                  </p>
                </div>
              </div>
              <Switch
                checked={getConfigBool('ai_gemini_enabled')}
                onCheckedChange={(checked) => updateConfig('ai_gemini_enabled', String(checked))}
                className="data-[state=checked]:bg-violet-500"
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-all duration-300 group/item">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 group-hover/item:bg-cyan-500/20 transition-colors duration-300">
                  <Activity className="h-4 w-4 text-cyan-500" />
                </div>
                <div>
                  <Label className="text-base font-medium">Auto-validação de Questões</Label>
                  <p className="text-sm text-muted-foreground">
                    Valida questões automaticamente via IA
                  </p>
                </div>
              </div>
              <Switch
                checked={getConfigBool('auto_validacao_questoes')}
                onCheckedChange={(checked) => updateConfig('auto_validacao_questoes', String(checked))}
                className="data-[state=checked]:bg-cyan-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Simulation Settings */}
        <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full opacity-50" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
                <Clock className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <CardTitle>Simulados</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Configurações padrão para simulados
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-emerald-500/30 transition-all duration-300 group/item">
                <Label className="text-sm text-muted-foreground mb-2 block flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Tempo (min)
                </Label>
                <Input
                  type="number"
                  value={getConfigValue('simulado_tempo_padrao')}
                  onChange={(e) => updateConfig('simulado_tempo_padrao', e.target.value)}
                  className="bg-background/50 border-border/50 focus:border-emerald-500/50 transition-all duration-300 text-lg font-semibold"
                />
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-emerald-500/30 transition-all duration-300 group/item">
                <Label className="text-sm text-muted-foreground mb-2 block flex items-center gap-2">
                  <Database className="h-3 w-3" />
                  Questões
                </Label>
                <Input
                  type="number"
                  value={getConfigValue('simulado_questoes_padrao')}
                  onChange={(e) => updateConfig('simulado_questoes_padrao', e.target.value)}
                  className="bg-background/50 border-border/50 focus:border-emerald-500/50 transition-all duration-300 text-lg font-semibold"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Settings */}
        <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-500/10 to-transparent rounded-bl-full opacity-50" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20 group-hover:scale-110 transition-transform duration-300">
                <Upload className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <CardTitle>Upload de Questões</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <span className="inline-flex h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                  Limites e configurações de upload
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 relative">
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-violet-500/30 transition-all duration-300 group/item">
              <Label className="text-sm text-muted-foreground mb-2 block flex items-center gap-2">
                <Upload className="h-3 w-3" />
                Máximo de questões por upload em lote
              </Label>
              <Input
                type="number"
                value={getConfigValue('max_questoes_por_upload')}
                onChange={(e) => updateConfig('max_questoes_por_upload', e.target.value)}
                className="bg-background/50 border-border/50 focus:border-violet-500/50 transition-all duration-300 text-lg font-semibold"
              />
            </div>
          </CardContent>
        </Card>

        {/* Pareto Settings */}
        <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-bl-full opacity-50" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 group-hover:scale-110 transition-transform duration-300">
                <ChartBar className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <CardTitle>Método Pareto</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <span className="inline-flex h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
                  Configurações do algoritmo de estudo
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 relative">
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-cyan-500/30 transition-all duration-300 group/item">
              <Label className="text-sm text-muted-foreground mb-2 block flex items-center gap-2">
                <ChartBar className="h-3 w-3" />
                Threshold Pareto (%)
              </Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={getConfigValue('pareto_threshold')}
                onChange={(e) => updateConfig('pareto_threshold', e.target.value)}
                className="bg-background/50 border-border/50 focus:border-cyan-500/50 transition-all duration-300 text-lg font-semibold"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Percentual mínimo para aplicar o método Pareto nas recomendações
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full opacity-50" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 group-hover:scale-110 transition-transform duration-300">
                <Bell className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <CardTitle>Notificações</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <span className="inline-flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  Configurações de alertas e emails
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 relative">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-amber-500/30 transition-all duration-300 group/item">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 group-hover/item:bg-amber-500/20 transition-colors duration-300">
                  <Bell className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <Label className="text-base font-medium">Notificações por Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar alertas por email
                  </p>
                </div>
              </div>
              <Switch
                checked={getConfigBool('notificacoes_email_ativas')}
                onCheckedChange={(checked) => updateConfig('notificacoes_email_ativas', String(checked))}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-bl-full opacity-50" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 group-hover:scale-110 transition-transform duration-300">
                <Shield className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <CardTitle>Sistema</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <span className="inline-flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                  Configurações gerais e manutenção
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 relative">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-orange-500/30 transition-all duration-300 group/item">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 group-hover/item:bg-orange-500/20 transition-colors duration-300">
                  <Shield className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <Label className="text-base font-medium">Modo Manutenção</Label>
                  <p className="text-sm text-muted-foreground">
                    Bloqueia acesso de alunos
                  </p>
                </div>
              </div>
              <Switch
                checked={getConfigBool('manutencao_ativa')}
                onCheckedChange={(checked) => updateConfig('manutencao_ativa', String(checked))}
                className="data-[state=checked]:bg-orange-500"
              />
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-orange-500/30 transition-all duration-300 group/item">
              <Label className="text-sm text-muted-foreground mb-2 block flex items-center gap-2">
                <Database className="h-3 w-3" />
                Retenção de Logs (dias)
              </Label>
              <Input
                type="number"
                value={getConfigValue('dias_retencao_logs')}
                onChange={(e) => updateConfig('dias_retencao_logs', e.target.value)}
                className="bg-background/50 border-border/50 focus:border-orange-500/50 transition-all duration-300 text-lg font-semibold"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
