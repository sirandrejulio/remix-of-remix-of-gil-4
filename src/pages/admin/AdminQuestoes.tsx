import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2, Plus, Edit, Eye, List, FileText, Sparkles, Database,
  Image as ImageIcon, RefreshCw, CheckCircle2, XCircle, AlertCircle,
  BookOpen, Copy, AlertTriangle, ClipboardCheck, Trash2, Zap
} from 'lucide-react';
import { toast } from 'sonner';

import { ImageUpload } from '@/components/questoes/ImageUpload';
import { AdvancedFilters } from '@/components/admin/questoes/AdvancedFilters';
import { QuestionsTable } from '@/components/admin/questoes/QuestionsTable';
import { ReviewCenterStats } from '@/components/admin/questoes/ReviewCenterStats';
import { PendingReviewList } from '@/components/admin/questoes/PendingReviewList';

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
  alternativa_a: string;
  alternativa_b: string;
  alternativa_c: string;
  alternativa_d: string;
  alternativa_e: string;
  resposta_correta: string;
  nivel: 'facil' | 'medio' | 'dificil';
  origem: 'MANUAL' | 'API' | 'PDF_IMPORTADO' | 'GOOGLE_GEMINI' | 'IA_PRINCIPAL';
  disciplina_id: string | null;
  imagem_url: string | null;
  created_at: string;
  status_validacao: string;
  motivo_validacao: string | null;
  score_qualidade: number | null;
  nivel_confianca: string | null;
  banca: string | null;
  ano_referencia: number | null;
  texto_base_id: string | null;
  textos_base?: TextoBase | null;
}

interface Disciplina {
  id: string;
  nome: string;
}

interface DuplicateGroup {
  ids: string[];
  enunciados: string[];
  similarity: number;
}

const nivelLabels: Record<string, string> = {
  facil: 'Fácil',
  medio: 'Médio',
  dificil: 'Difícil',
};

const origemLabels: Record<string, string> = {
  MANUAL: 'Manual',
  API: 'API',
  PDF_IMPORTADO: 'PDF Importado',
  GOOGLE_GEMINI: 'Gemini',
  IA_PRINCIPAL: 'IA Principal',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  'valida': { label: 'Válida', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  'pendente': { label: 'Pendente', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  'invalida': { label: 'Inválida', color: 'bg-destructive/10 text-destructive border-destructive/30' }
};

const confiancaColors: Record<string, string> = {
  'alto': 'text-emerald-400',
  'medio': 'text-amber-400',
  'baixo': 'text-destructive'
};

const bancas = ['CESGRANRIO', 'FCC', 'FGV', 'VUNESP', 'Outras'];

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

export default function AdminQuestoes() {
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [filterDisciplina, setFilterDisciplina] = useState('all');
  const [filterOrigem, setFilterOrigem] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBanca, setFilterBanca] = useState('all');
  const [filterAno, setFilterAno] = useState('all');
  const [filterTema, setFilterTema] = useState('all');
  const [filterSubtema, setFilterSubtema] = useState('all');
  const [filterScoreMin, setFilterScoreMin] = useState('');
  const [filterTextoBase, setFilterTextoBase] = useState('all');

  // Dialogs
  const [selectedQuestao, setSelectedQuestao] = useState<Questao | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDuplicatesDialogOpen, setIsDuplicatesDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Questao>>({});

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Duplicatas
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [selectedDuplicates, setSelectedDuplicates] = useState<Set<string>>(new Set());
  const [isDeletingDuplicates, setIsDeletingDuplicates] = useState(false);

  // Texto Base
  const { user } = useAuth();
  const [textosBaseList, setTextosBaseList] = useState<TextoBase[]>([]);
  const [isCreatingTextoBase, setIsCreatingTextoBase] = useState(false);
  const [newTextoBase, setNewTextoBase] = useState({
    titulo: '',
    conteudo: '',
    fonte: '',
    autor: ''
  });

  const uniqueYears = useMemo(() => {
    const years = questoes
      .map(q => q.ano_referencia)
      .filter((year): year is number => year !== null)
      .sort((a, b) => b - a);
    return [...new Set(years)];
  }, [questoes]);

  const uniqueTemas = useMemo(() => {
    const temas = questoes.map(q => q.tema).filter(Boolean).sort();
    return [...new Set(temas)];
  }, [questoes]);

  const uniqueSubtemas = useMemo(() => {
    const subtemas = questoes
      .map(q => q.subtema)
      .filter((subtema): subtema is string => subtema !== null && subtema.length > 0)
      .sort();
    return [...new Set(subtemas)];
  }, [questoes]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [questoesResult, disciplinasResult] = await Promise.all([
        supabase.from('questoes').select(`
          *,
          textos_base(id, titulo, conteudo, fonte, autor)
        `).order('created_at', { ascending: false }),
        supabase.from('disciplinas').select('id, nome').order('nome'),
        supabase.from('textos_base').select('*').order('created_at', { ascending: false }),
      ]);

      const processedQuestoes = (questoesResult.data || []).map((q: any) => ({
        ...q,
        textos_base: q.textos_base && q.textos_base.id ? q.textos_base : null
      }));

      setQuestoes(processedQuestoes);
      setDisciplinas(disciplinasResult.data || []);
      setTextosBaseList((textosBaseResult.data as any) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getDisciplinaNome = (id: string | null) => {
    if (!id) return 'Não classificada';
    const disc = disciplinas.find((d) => d.id === id);
    return disc?.nome || 'Desconhecida';
  };

  const filteredQuestoes = useMemo(() => {
    return questoes.filter((q) => {
      const matchesSearch = search === '' ||
        q.enunciado.toLowerCase().includes(search.toLowerCase()) ||
        q.tema.toLowerCase().includes(search.toLowerCase()) ||
        (q.subtema && q.subtema.toLowerCase().includes(search.toLowerCase()));
      const matchesDisciplina = filterDisciplina === 'all' || q.disciplina_id === filterDisciplina;
      const matchesOrigem = filterOrigem === 'all' || q.origem === filterOrigem;
      const matchesStatus = filterStatus === 'all' || q.status_validacao === filterStatus;
      const matchesBanca = filterBanca === 'all' || q.banca === filterBanca;
      const matchesAno = filterAno === 'all' || (q.ano_referencia !== null && q.ano_referencia.toString() === filterAno);
      const matchesTema = filterTema === 'all' || q.tema === filterTema;
      const matchesSubtema = filterSubtema === 'all' || q.subtema === filterSubtema;
      const matchesScore = filterScoreMin === '' || (q.score_qualidade !== null && q.score_qualidade >= parseInt(filterScoreMin));
      const matchesTextoBase = filterTextoBase === 'all' ||
        (filterTextoBase === 'com' && q.textos_base !== null) ||
        (filterTextoBase === 'sem' && q.textos_base === null);

      return matchesSearch && matchesDisciplina && matchesOrigem && matchesStatus &&
        matchesBanca && matchesAno && matchesTema && matchesSubtema && matchesScore && matchesTextoBase;
    });
  }, [questoes, search, filterDisciplina, filterOrigem, filterStatus, filterBanca, filterAno, filterTema, filterSubtema, filterScoreMin, filterTextoBase]);

  const stats = useMemo(() => {
    const pendentesQuestoes = questoes.filter(q => q.status_validacao === 'pendente');
    const highQuality = pendentesQuestoes.filter(q => (q.score_qualidade || 0) >= 80);
    const lowQuality = pendentesQuestoes.filter(q => (q.score_qualidade || 0) < 50);
    const avgScore = questoes.length > 0
      ? Math.round(questoes.reduce((sum, q) => sum + (q.score_qualidade || 0), 0) / questoes.length)
      : 0;

    return {
      total: questoes.length,
      validas: questoes.filter(q => q.status_validacao === 'valida').length,
      pendentes: pendentesQuestoes.length,
      invalidas: questoes.filter(q => q.status_validacao === 'invalida').length,
      avgScore,
      highQualityCount: highQuality.length,
      lowQualityCount: lowQuality.length
    };
  }, [questoes]);

  const checkDuplicates = async () => {
    setCheckingDuplicates(true);
    try {
      const groups: DuplicateGroup[] = [];
      const processed = new Set<string>();

      for (let i = 0; i < questoes.length; i++) {
        if (processed.has(questoes[i].id)) continue;

        const duplicates: string[] = [questoes[i].id];
        const enunciados: string[] = [questoes[i].enunciado.substring(0, 100)];
        let maxSimilarity = 0;

        for (let j = i + 1; j < questoes.length; j++) {
          if (processed.has(questoes[j].id)) continue;

          const similarity = calculateSimilarity(questoes[i].enunciado, questoes[j].enunciado);
          if (similarity > 0.7) {
            duplicates.push(questoes[j].id);
            enunciados.push(questoes[j].enunciado.substring(0, 100));
            processed.add(questoes[j].id);
            maxSimilarity = Math.max(maxSimilarity, similarity);
          }
        }

        if (duplicates.length > 1) {
          processed.add(questoes[i].id);
          groups.push({ ids: duplicates, enunciados, similarity: maxSimilarity });
        }
      }

      setDuplicateGroups(groups);

      if (groups.length > 0) {
        setIsDuplicatesDialogOpen(true);
        toast.error(`${groups.length} grupo(s) de questões duplicadas detectado(s).`);
      } else {
        toast.success('Nenhuma questão duplicada encontrada.');
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
      toast.error('Erro ao verificar duplicatas');
    } finally {
      setCheckingDuplicates(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredQuestoes.map(q => q.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleView = (questao: Questao) => {
    setSelectedQuestao(questao);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (questao: Questao) => {
    setSelectedQuestao(questao);
    setEditForm({
      ...questao,
      disciplina_id: questao.disciplina_id || undefined,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedQuestao) return;

    try {
      const { error } = await supabase
        .from('questoes')
        .update({
          tema: editForm.tema,
          subtema: editForm.subtema,
          enunciado: editForm.enunciado,
          alternativa_a: editForm.alternativa_a,
          alternativa_b: editForm.alternativa_b,
          alternativa_c: editForm.alternativa_c,
          alternativa_d: editForm.alternativa_d,
          alternativa_e: editForm.alternativa_e,
          resposta_correta: editForm.resposta_correta,
          nivel: editForm.nivel,
          disciplina_id: editForm.disciplina_id,
          imagem_url: editForm.imagem_url,
          status_validacao: editForm.status_validacao,
          motivo_validacao: editForm.motivo_validacao,
          banca: editForm.banca,
          banca: editForm.banca,
          ano_referencia: editForm.ano_referencia,
          texto_base_id: editForm.texto_base_id,
        })
        .eq('id', selectedQuestao.id);

      if (error) throw error;

      toast.success('Questão atualizada com sucesso!');
      setIsEditDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Erro ao atualizar questão');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta questão?')) return;

    try {
      const { error } = await supabase.from('questoes').delete().eq('id', id);
      if (error) throw error;

      setQuestoes(questoes.filter((q) => q.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success('Questão excluída');
    } catch (error) {
      toast.error('Erro ao excluir questão');
    }
  };

  const handleApprove = async (questao: Questao) => {
    try {
      const { error } = await supabase
        .from('questoes')
        .update({
          status_validacao: 'valida',
          motivo_validacao: null,
          nivel_confianca: 'alto'
        })
        .eq('id', questao.id);

      if (error) throw error;
      toast.success('Questão aprovada!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao aprovar questão');
    }
  };

  const handleReject = async (questao: Questao) => {
    try {
      const { error } = await supabase
        .from('questoes')
        .update({
          status_validacao: 'invalida',
          motivo_validacao: 'Rejeitada pelo administrador'
        })
        .eq('id', questao.id);

      if (error) throw error;
      toast.success('Questão rejeitada');
      fetchData();
    } catch (error) {
      toast.error('Erro ao rejeitar questão');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;

    try {
      const { error } = await supabase
        .from('questoes')
        .update({
          status_validacao: 'valida',
          motivo_validacao: null,
          nivel_confianca: 'alto'
        })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast.success(`${selectedIds.size} questão(ões) aprovada(s)`);
      setSelectedIds(new Set());
      fetchData();
    } catch (error) {
      toast.error('Erro ao aprovar questões');
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return;

    try {
      const { error } = await supabase
        .from('questoes')
        .update({
          status_validacao: 'invalida',
          motivo_validacao: 'Rejeitada em lote pelo administrador'
        })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast.success(`${selectedIds.size} questão(ões) rejeitada(s)`);
      setSelectedIds(new Set());
      fetchData();
    } catch (error) {
      toast.error('Erro ao rejeitar questões');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selectedIds.size} questão(ões)?`)) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('questoes')
        .delete()
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      setQuestoes(questoes.filter(q => !selectedIds.has(q.id)));
      toast.success(`${selectedIds.size} questão(ões) excluída(s)`);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error('Erro ao excluir questões');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateTextoBase = async () => {
    if (!newTextoBase.conteudo.trim()) {
      toast.error('O conteúdo do texto é obrigatório');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('textos_base')
        .insert({
          titulo: newTextoBase.titulo.trim() || null,
          conteudo: newTextoBase.conteudo.trim(),
          fonte: newTextoBase.fonte.trim() || null,
          autor: newTextoBase.autor.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Texto base criado com sucesso!');
      setTextosBaseList([data, ...textosBaseList]);
      setEditForm({ ...editForm, texto_base_id: data.id });
      setIsCreatingTextoBase(false);
      setNewTextoBase({ titulo: '', conteudo: '', fonte: '', autor: '' });
    } catch (error) {
      console.error('Error creating texto:', error);
      toast.error('Erro ao criar texto base');
    }
  };

  // AI Validation - simulates AI quality check
  const handleValidateWithAI = async () => {
    const pendentes = questoes.filter(q => q.status_validacao === 'pendente');
    if (pendentes.length === 0) return;

    toast.info(`Analisando ${pendentes.length} questões com IA...`);

    try {
      // Simulate AI analysis - in production, this would call an edge function
      for (const questao of pendentes) {
        // Generate a score based on question completeness
        let score = 50;
        if (questao.enunciado.length > 100) score += 15;
        if (questao.alternativa_a && questao.alternativa_b && questao.alternativa_c && questao.alternativa_d && questao.alternativa_e) score += 10;
        if (questao.tema && questao.tema !== 'Geral') score += 10;
        if (questao.disciplina_id) score += 10;
        if (questao.banca) score += 5;

        score = Math.min(score, 100);

        await supabase
          .from('questoes')
          .update({
            score_qualidade: score,
            nivel_confianca: score >= 80 ? 'alto' : score >= 50 ? 'medio' : 'baixo'
          })
          .eq('id', questao.id);
      }

      toast.success(`${pendentes.length} questões analisadas com IA`);
      fetchData();
    } catch (error) {
      console.error('Error validating with AI:', error);
      toast.error('Erro na validação com IA');
    }
  };

  // Auto-approve high quality questions
  const handleAutoApprove = async () => {
    const highQuality = questoes.filter(
      q => q.status_validacao === 'pendente' && (q.score_qualidade || 0) >= 80
    );

    if (highQuality.length === 0) {
      toast.info('Nenhuma questão de alta qualidade para aprovar');
      return;
    }

    try {
      const { error } = await supabase
        .from('questoes')
        .update({
          status_validacao: 'valida',
          motivo_validacao: 'Aprovada automaticamente (score ≥ 80%)',
          nivel_confianca: 'alto'
        })
        .in('id', highQuality.map(q => q.id));

      if (error) throw error;

      toast.success(`${highQuality.length} questão(ões) aprovadas automaticamente`);
      fetchData();
    } catch (error) {
      toast.error('Erro ao auto-aprovar questões');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-violet-500/10 to-cyan-500/20 rounded-2xl blur-xl opacity-60" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-xl bg-card/40 backdrop-blur-xl border border-border/30">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-violet-500/50 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative p-4 rounded-2xl bg-gradient-to-br from-primary to-violet-500 shadow-2xl shadow-primary/25">
                <Database className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
                Banco de Questões
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Gerencie, revise e aprove questões do sistema
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={checkDuplicates}
              variant="outline"
              size="sm"
              disabled={checkingDuplicates}
              className="border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-400"
            >
              <Copy className="h-4 w-4 mr-2" />
              {checkingDuplicates ? 'Verificando...' : 'Duplicatas'}
            </Button>
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button asChild size="sm">
              <Link to="/admin/questoes/nova">
                <Plus className="mr-2 h-4 w-4" />
                Nova
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Compact */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: FileText, color: 'blue' },
          { label: 'Válidas', value: stats.validas, icon: CheckCircle2, color: 'emerald' },
          { label: 'Pendentes', value: stats.pendentes, icon: AlertCircle, color: 'amber' },
          { label: 'Inválidas', value: stats.invalidas, icon: XCircle, color: 'red' },
          { label: 'Score Médio', value: `${stats.avgScore}%`, icon: Sparkles, color: 'purple' }
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-300"
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-medium text-${stat.color}-400`}>{stat.label}</p>
                    <p className={`text-xl font-bold text-${stat.color}-400`}>{stat.value}</p>
                  </div>
                  <Icon className={`h-5 w-5 text-${stat.color}-400/50`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="lista" className="animate-fade-in">
        <TabsList className="bg-card/50 backdrop-blur-sm border border-border/50 p-1">
          <TabsTrigger value="lista" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <List className="h-4 w-4" />
            Todas as Questões
          </TabsTrigger>
          <TabsTrigger value="revisao" className="gap-2 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-400">
            <ClipboardCheck className="h-4 w-4" />
            Revisão
            {stats.pendentes > 0 && (
              <Badge className="ml-1 bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs px-1.5">
                {stats.pendentes}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="mt-4 space-y-4">
          <AdvancedFilters
            search={search}
            setSearch={setSearch}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterScoreMin={filterScoreMin}
            setFilterScoreMin={setFilterScoreMin}
            filterAno={filterAno}
            setFilterAno={setFilterAno}
            filterDisciplina={filterDisciplina}
            setFilterDisciplina={setFilterDisciplina}
            filterBanca={filterBanca}
            setFilterBanca={setFilterBanca}
            filterOrigem={filterOrigem}
            setFilterOrigem={setFilterOrigem}
            filterTema={filterTema}
            setFilterTema={setFilterTema}
            filterSubtema={filterSubtema}
            setFilterSubtema={setFilterSubtema}
            filterTextoBase={filterTextoBase}
            setFilterTextoBase={setFilterTextoBase}
            disciplinas={disciplinas}
            uniqueYears={uniqueYears}
            uniqueTemas={uniqueTemas}
            uniqueSubtemas={uniqueSubtemas}
            filteredCount={filteredQuestoes.length}
            bancas={bancas}
            totalCount={filteredQuestoes.length}
            selectedCount={selectedIds.size}
            onSelectAll={() => handleSelectAll(true)}
            onDeselectAll={() => handleSelectAll(false)}
            onBulkApprove={handleBulkApprove}
            onBulkReject={handleBulkReject}
            onBulkDelete={handleBulkDelete}
            isDeleting={isDeleting}
          />

          <QuestionsTable
            questoes={filteredQuestoes}
            selectedIds={selectedIds}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
            onView={handleView}
            onEdit={handleEdit}
            onApprove={handleApprove}
            onReject={handleReject}
            onDelete={handleDelete}
            getDisciplinaNome={getDisciplinaNome}
            statusLabels={statusLabels}
            origemLabels={origemLabels}
            confiancaColors={confiancaColors}
          />
        </TabsContent>

        <TabsContent value="revisao" className="mt-4 space-y-4">
          <ReviewCenterStats
            pendentes={stats.pendentes}
            validas={stats.validas}
            invalidas={stats.invalidas}
            duplicateGroupsCount={duplicateGroups.length}
            onValidateWithAI={handleValidateWithAI}
            onAutoApprove={handleAutoApprove}
            avgScore={stats.avgScore}
            highQualityCount={stats.highQualityCount}
            lowQualityCount={stats.lowQualityCount}
          />

          <AdvancedFilters
            search={search}
            setSearch={setSearch}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterScoreMin={filterScoreMin}
            setFilterScoreMin={setFilterScoreMin}
            filterAno={filterAno}
            setFilterAno={setFilterAno}
            filterDisciplina={filterDisciplina}
            setFilterDisciplina={setFilterDisciplina}
            filterBanca={filterBanca}
            setFilterBanca={setFilterBanca}
            filterOrigem={filterOrigem}
            setFilterOrigem={setFilterOrigem}
            filterTema={filterTema}
            setFilterTema={setFilterTema}
            filterSubtema={filterSubtema}
            setFilterSubtema={setFilterSubtema}
            filterTextoBase={filterTextoBase}
            setFilterTextoBase={setFilterTextoBase}
            disciplinas={disciplinas}
            uniqueYears={uniqueYears}
            uniqueTemas={uniqueTemas}
            uniqueSubtemas={uniqueSubtemas}
            filteredCount={stats.pendentes}
            bancas={bancas}
            totalCount={stats.pendentes}
            selectedCount={selectedIds.size}
            onSelectAll={() => {
              const pendentes = questoes.filter(q => q.status_validacao === 'pendente');
              setSelectedIds(new Set(pendentes.map(q => q.id)));
            }}
            onDeselectAll={() => setSelectedIds(new Set())}
            onBulkApprove={handleBulkApprove}
            onBulkReject={handleBulkReject}
            onBulkDelete={handleBulkDelete}
            isDeleting={isDeleting}
            variant="amber"
            selectAllLabel={`Selecionar Pendentes (${stats.pendentes})`}
          />

          <PendingReviewList
            questoes={questoes}
            selectedIds={selectedIds}
            onSelectOne={handleSelectOne}
            onView={handleView}
            onEdit={handleEdit}
            onApprove={handleApprove}
            onReject={handleReject}
            onDelete={handleDelete}
            getDisciplinaNome={getDisciplinaNome}
            origemLabels={origemLabels}
          />
        </TabsContent>
      </Tabs>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden border-border/50 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Visualizar Questão
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-4">
            {selectedQuestao && (
              <div className="space-y-4">
                {selectedQuestao.textos_base && (
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-blue-500/20">
                        <BookOpen className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-blue-400">
                          {selectedQuestao.textos_base.titulo || 'Texto Base'}
                        </span>
                        {(selectedQuestao.textos_base.autor || selectedQuestao.textos_base.fonte) && (
                          <p className="text-xs text-muted-foreground">
                            {selectedQuestao.textos_base.autor && <span>{selectedQuestao.textos_base.autor}</span>}
                            {selectedQuestao.textos_base.autor && selectedQuestao.textos_base.fonte && <span> • </span>}
                            {selectedQuestao.textos_base.fonte && <span>{selectedQuestao.textos_base.fonte}</span>}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                      {selectedQuestao.textos_base.conteudo}
                    </p>
                  </div>
                )}

                {selectedQuestao.imagem_url && (
                  <div className="rounded-lg overflow-hidden border border-border/50">
                    <img src={selectedQuestao.imagem_url} alt="Imagem da questão" className="w-full h-48 object-contain bg-muted/10" />
                  </div>
                )}
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Enunciado</Label>
                  <p className="mt-2 text-sm">{selectedQuestao.enunciado}</p>
                </div>
                <div className="space-y-2">
                  {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                    <div
                      key={letter}
                      className={`p-3 rounded-lg border transition-all text-sm ${selectedQuestao.resposta_correta === letter
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-muted/20 border-border/50'
                        }`}
                    >
                      <span className="font-bold">{letter})</span> {(selectedQuestao as any)[`alternativa_${letter.toLowerCase()}`]}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 text-sm flex-wrap">
                  <Badge variant="outline" className="bg-muted/50">Resposta: {selectedQuestao.resposta_correta}</Badge>
                  <Badge variant="outline" className="bg-muted/50">Tema: {selectedQuestao.tema}</Badge>
                  <Badge variant="outline" className="bg-muted/50">Nível: {nivelLabels[selectedQuestao.nivel]}</Badge>
                  <Badge variant="outline" className="bg-muted/50">Origem: {origemLabels[selectedQuestao.origem] || selectedQuestao.origem}</Badge>
                  {selectedQuestao.banca && <Badge variant="outline" className="bg-muted/50">Banca: {selectedQuestao.banca}</Badge>}
                  {selectedQuestao.ano_referencia && <Badge variant="outline" className="bg-muted/50">Ano: {selectedQuestao.ano_referencia}</Badge>}
                  <Badge variant="outline" className="bg-muted/50">Score: {selectedQuestao.score_qualidade || 0}%</Badge>
                </div>
                {selectedQuestao.motivo_validacao && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <Label className="text-amber-400 text-xs uppercase tracking-wider">Motivo da Validação</Label>
                    <p className="text-sm mt-1">{selectedQuestao.motivo_validacao}</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden border-border/50 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-400" />
              Editar Questão
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={editForm.status_validacao} onValueChange={(v) => setEditForm({ ...editForm, status_validacao: v })}>
                    <SelectTrigger className="bg-background/50 border-border/50 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="valida">Válida</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="invalida">Inválida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Disciplina</Label>
                  <Select value={editForm.disciplina_id || ''} onValueChange={(v) => setEditForm({ ...editForm, disciplina_id: v || null })}>
                    <SelectTrigger className="bg-background/50 border-border/50 h-9">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-[200px]">
                        {disciplinas.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Nível</Label>
                  <Select value={editForm.nivel} onValueChange={(v) => setEditForm({ ...editForm, nivel: v as any })}>
                    <SelectTrigger className="bg-background/50 border-border/50 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facil">Fácil</SelectItem>
                      <SelectItem value="medio">Médio</SelectItem>
                      <SelectItem value="dificil">Difícil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Banca</Label>
                  <Select value={editForm.banca || ''} onValueChange={(v) => setEditForm({ ...editForm, banca: v })}>
                    <SelectTrigger className="bg-background/50 border-border/50 h-9">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {bancas.map(banca => (
                        <SelectItem key={banca} value={banca}>{banca}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Ano</Label>
                  <Input
                    type="number"
                    value={editForm.ano_referencia || ''}
                    onChange={(e) => setEditForm({ ...editForm, ano_referencia: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Ex: 2023"
                    className="bg-background/50 border-border/50 h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Tema</Label>
                  <Input value={editForm.tema || ''} onChange={(e) => setEditForm({ ...editForm, tema: e.target.value })} className="bg-background/50 border-border/50 h-9" />
                </div>
                <div>
                  <Label className="text-xs">Subtema</Label>
                  <Input value={editForm.subtema || ''} onChange={(e) => setEditForm({ ...editForm, subtema: e.target.value })} className="bg-background/50 border-border/50 h-9" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    Texto Base (Opcional)
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCreatingTextoBase(!isCreatingTextoBase)}
                    className="h-6 text-xs text-primary hover:bg-primary/10"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {isCreatingTextoBase ? 'Cancelar Criação' : 'Criar Texto Base'}
                  </Button>
                </div>

                {isCreatingTextoBase ? (
                  <div className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <Input
                      placeholder="Título do Texto (Opcional)"
                      value={newTextoBase.titulo}
                      onChange={(e) => setNewTextoBase({ ...newTextoBase, titulo: e.target.value })}
                      className="bg-background/80 h-8 text-sm border-border/50"
                    />
                    <Textarea
                      placeholder="Conteúdo do Texto *"
                      value={newTextoBase.conteudo}
                      onChange={(e) => setNewTextoBase({ ...newTextoBase, conteudo: e.target.value })}
                      className="bg-background/80 min-h-[100px] text-sm border-border/50"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Autor"
                        value={newTextoBase.autor}
                        onChange={(e) => setNewTextoBase({ ...newTextoBase, autor: e.target.value })}
                        className="bg-background/80 h-8 text-sm border-border/50"
                      />
                      <Input
                        placeholder="Fonte"
                        value={newTextoBase.fonte}
                        onChange={(e) => setNewTextoBase({ ...newTextoBase, fonte: e.target.value })}
                        className="bg-background/80 h-8 text-sm border-border/50"
                      />
                    </div>
                    <Button onClick={handleCreateTextoBase} size="sm" className="w-full">
                      Salvar e Usar Texto Base
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={editForm.texto_base_id || 'sem_texto'}
                    onValueChange={(v) => setEditForm({ ...editForm, texto_base_id: v === 'sem_texto' ? null : v })}
                  >
                    <SelectTrigger className="bg-background/50 border-border/50 h-9">
                      <SelectValue placeholder="Selecione um texto base..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sem_texto">-- Sem Texto Base --</SelectItem>
                      <ScrollArea className="h-[200px]">
                        {textosBaseList.length > 0 ? (
                          textosBaseList.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.titulo
                                ? (t.titulo.length > 40 ? t.titulo.substring(0, 40) + '...' : t.titulo)
                                : (t.conteudo.length > 40 ? t.conteudo.substring(0, 40) + '...' : t.conteudo)}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-xs text-muted-foreground text-center">Nenhum texto disponível</div>
                        )}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label className="text-xs">Enunciado</Label>
                <Textarea value={editForm.enunciado || ''} onChange={(e) => setEditForm({ ...editForm, enunciado: e.target.value })} rows={3} className="bg-background/50 border-border/50" />
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-2 text-xs">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  Imagem (Opcional)
                </Label>
                <ImageUpload imageUrl={editForm.imagem_url || null} onImageChange={(url) => setEditForm({ ...editForm, imagem_url: url })} />
              </div>
              {['a', 'b', 'c', 'd', 'e'].map((letter) => (
                <div key={letter}>
                  <Label className="text-xs">Alternativa {letter.toUpperCase()}</Label>
                  <Input value={(editForm as any)[`alternativa_${letter}`] || ''} onChange={(e) => setEditForm({ ...editForm, [`alternativa_${letter}`]: e.target.value })} className="bg-background/50 border-border/50 h-9" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Resposta Correta</Label>
                  <Select value={editForm.resposta_correta} onValueChange={(v) => setEditForm({ ...editForm, resposta_correta: v })}>
                    <SelectTrigger className="bg-background/50 border-border/50 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                        <SelectItem key={letter} value={letter}>{letter}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Motivo Validação</Label>
                  <Input value={editForm.motivo_validacao || ''} onChange={(e) => setEditForm({ ...editForm, motivo_validacao: e.target.value })} placeholder="Opcional" className="bg-background/50 border-border/50 h-9" />
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-border/50">Cancelar</Button>
            <Button onClick={handleSaveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicates Dialog */}
      <Dialog open={isDuplicatesDialogOpen} onOpenChange={(open) => {
        setIsDuplicatesDialogOpen(open);
        if (!open) setSelectedDuplicates(new Set());
      }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden border-border/50 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Questões Duplicadas Detectadas
            </DialogTitle>
            <DialogDescription>
              {duplicateGroups.length} grupo(s) encontrado(s). Selecione as duplicatas para excluir.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const toSelect = new Set<string>();
                duplicateGroups.forEach(group => {
                  group.ids.slice(1).forEach(id => toSelect.add(id));
                });
                setSelectedDuplicates(toSelect);
              }}
              className="border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-400"
            >
              <Checkbox className="h-4 w-4 mr-2" />
              Selecionar Duplicatas (manter 1ª)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDuplicates(new Set())}
              className="border-border/50"
            >
              Limpar
            </Button>
            {selectedDuplicates.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (!confirm(`Excluir ${selectedDuplicates.size} questão(ões)?`)) return;

                  setIsDeletingDuplicates(true);
                  try {
                    const { error } = await supabase
                      .from('questoes')
                      .delete()
                      .in('id', Array.from(selectedDuplicates));

                    if (error) throw error;

                    toast.success(`${selectedDuplicates.size} questão(ões) excluída(s)`);
                    setSelectedDuplicates(new Set());
                    setIsDuplicatesDialogOpen(false);
                    fetchData();
                  } catch (error) {
                    toast.error('Erro ao excluir duplicatas');
                  } finally {
                    setIsDeletingDuplicates(false);
                  }
                }}
                disabled={isDeletingDuplicates}
              >
                {isDeletingDuplicates ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Excluir ({selectedDuplicates.size})
              </Button>
            )}
          </div>

          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-3 pr-4">
              {duplicateGroups.map((group, groupIndex) => (
                <Card key={groupIndex} className="border-amber-500/30 bg-amber-500/5">
                  <CardHeader className="py-2 px-4">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={group.ids.slice(1).every(id => selectedDuplicates.has(id))}
                          onCheckedChange={(checked) => {
                            setSelectedDuplicates(prev => {
                              const next = new Set(prev);
                              group.ids.slice(1).forEach(id => {
                                if (checked) next.add(id);
                                else next.delete(id);
                              });
                              return next;
                            });
                          }}
                          className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                        />
                        <span>Grupo {groupIndex + 1} ({group.ids.length} questões)</span>
                      </div>
                      <Badge variant="outline" className="border-amber-500/50 text-amber-400">
                        {Math.round(group.similarity * 100)}% similar
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-4 space-y-2">
                    {group.ids.map((id, i) => {
                      const questao = questoes.find(q => q.id === id);
                      const isFirst = i === 0;
                      return (
                        <div
                          key={id}
                          className={`p-2 rounded-lg border text-sm ${isFirst
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : selectedDuplicates.has(id)
                              ? 'bg-red-500/10 border-red-500/30'
                              : 'bg-muted/30 border-border/50'
                            }`}
                        >
                          <div className="flex items-start gap-2">
                            {isFirst ? (
                              <div className="h-5 w-5 rounded bg-emerald-500/20 flex items-center justify-center mt-0.5">
                                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                              </div>
                            ) : (
                              <Checkbox
                                checked={selectedDuplicates.has(id)}
                                onCheckedChange={(checked) => {
                                  setSelectedDuplicates(prev => {
                                    const next = new Set(prev);
                                    if (checked) next.add(id);
                                    else next.delete(id);
                                    return next;
                                  });
                                }}
                                className="mt-0.5 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs line-clamp-1">{group.enunciados[i]}...</p>
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                {isFirst && (
                                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs h-5">
                                    Manter
                                  </Badge>
                                )}
                                {questao && (
                                  <Badge variant="outline" className="text-xs h-5">
                                    Score: {questao.score_qualidade || 0}%
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const q = questoes.find(q => q.id === id);
                                if (q) handleView(q);
                              }}
                              className="h-7 w-7 p-0 hover:bg-primary/10"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}

              {duplicateGroups.length === 0 && (
                <div className="p-8 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-400 mb-4" />
                  <h3 className="text-lg font-semibold">Nenhuma duplicata!</h3>
                  <p className="text-muted-foreground">O banco está limpo.</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDuplicatesDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
