/**
 * Versão SEGURA do TextoBaseAssigner para alunos.
 * - NÃO lista textos existentes do banco (segurança)
 * - Apenas permite CRIAR um novo texto base e atribuí-lo às questões
 * - Alunos só podem criar, não podem ver textos de outros usuários
 */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  FileText, Search, Loader2, Check, BookOpen, X, Link2, CheckSquare, Square, Filter, Plus
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface QuestionPreview {
  index: number;
  enunciado: string;
  tema: string;
  texto_base_id?: string | null;
}

interface CreatedTextoBase {
  id: string;
  titulo: string;
  conteudo: string;
}

interface StudentTextoBaseAssignerProps {
  questions: QuestionPreview[];
  onAssign: (textoBaseId: string | null, questionIndices: number[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function StudentTextoBaseAssigner({ 
  questions, 
  onAssign,
  isOpen,
  onClose
}: StudentTextoBaseAssignerProps) {
  const { user } = useAuth();
  const [searchQuestion, setSearchQuestion] = useState('');
  const [selectedQuestionIndices, setSelectedQuestionIndices] = useState<number[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'without-texto'>('all');
  
  // Texto criado pelo aluno nesta sessão
  const [createdTexto, setCreatedTexto] = useState<CreatedTextoBase | null>(null);
  
  // Form para criar novo texto
  const [isCreating, setIsCreating] = useState(false);
  const [newTexto, setNewTexto] = useState({
    titulo: '',
    conteudo: '',
    fonte: '',
    autor: ''
  });

  // Reset state when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
    if (open) {
      setSelectedQuestionIndices([]);
      setFilterMode('all');
      setSearchQuestion('');
      setCreatedTexto(null);
      setNewTexto({ titulo: '', conteudo: '', fonte: '', autor: '' });
    }
  };

  // Filter questions
  const filteredQuestions = questions.filter(q => {
    const matchesSearch = !searchQuestion.trim() || 
      q.enunciado.toLowerCase().includes(searchQuestion.toLowerCase()) ||
      q.tema.toLowerCase().includes(searchQuestion.toLowerCase());
    
    const matchesFilter = filterMode === 'all' || !q.texto_base_id;
    
    return matchesSearch && matchesFilter;
  });

  const questionsWithoutTexto = questions.filter(q => !q.texto_base_id).length;

  // Selection handlers
  const toggleQuestionSelect = (index: number) => {
    setSelectedQuestionIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const selectAllFiltered = () => {
    setSelectedQuestionIndices(filteredQuestions.map(q => q.index));
  };

  const deselectAll = () => {
    setSelectedQuestionIndices([]);
  };

  // Criar novo texto base
  const handleCreateTexto = async () => {
    if (!newTexto.conteudo.trim()) {
      toast.error('O conteúdo do texto é obrigatório');
      return;
    }

    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('textos_base')
        .insert({
          titulo: newTexto.titulo.trim() || null,
          conteudo: newTexto.conteudo.trim(),
          fonte: newTexto.fonte.trim() || null,
          autor: newTexto.autor.trim() || null,
          created_by: user.id,
        })
        .select('id, titulo, conteudo')
        .single();

      if (error) throw error;

      setCreatedTexto({
        id: data.id,
        titulo: data.titulo || 'Texto criado',
        conteudo: data.conteudo
      });
      
      toast.success('Texto base criado! Agora selecione as questões para atribuí-lo.');
      setNewTexto({ titulo: '', conteudo: '', fonte: '', autor: '' });
    } catch (error) {
      console.error('Error creating texto:', error);
      toast.error('Erro ao criar texto base');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAssign = () => {
    if (!createdTexto) {
      toast.error('Primeiro crie um texto base');
      return;
    }
    if (selectedQuestionIndices.length === 0) {
      toast.error('Selecione pelo menos uma questão');
      return;
    }

    onAssign(createdTexto.id, selectedQuestionIndices);
    toast.success(`"${createdTexto.titulo}" atribuído a ${selectedQuestionIndices.length} questão(ões)`);
    setSelectedQuestionIndices([]);
  };

  const handleRemoveTexto = () => {
    if (selectedQuestionIndices.length === 0) {
      toast.error('Selecione pelo menos uma questão');
      return;
    }
    
    onAssign(null, selectedQuestionIndices);
    toast.success(`Texto removido de ${selectedQuestionIndices.length} questão(ões)`);
    setSelectedQuestionIndices([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-500" />
            Criar e Atribuir Texto Base
          </DialogTitle>
          <DialogDescription>
            Crie um novo texto base e atribua às questões selecionadas.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
          {/* Left: Criar Texto Base */}
          <div className="flex flex-col space-y-3 overflow-hidden">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Plus className="h-4 w-4 text-blue-500" />
              </div>
              <span className="font-medium text-sm">Criar Texto Base</span>
            </div>

            {createdTexto ? (
              /* Texto criado - exibir preview */
              <div className="flex-1 space-y-3">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Texto Criado</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setCreatedTexto(null)} 
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="font-medium text-sm">{createdTexto.titulo}</p>
                  <ScrollArea className="h-32">
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {createdTexto.conteudo}
                    </p>
                  </ScrollArea>
                </div>

                <p className="text-xs text-muted-foreground">
                  Agora selecione as questões à direita e clique em "Atribuir Texto" para vincular este texto a elas.
                </p>

                <Button
                  variant="outline"
                  onClick={() => setCreatedTexto(null)}
                  className="w-full gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Criar Outro Texto
                </Button>
              </div>
            ) : (
              /* Formulário para criar novo texto */
              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-3 pr-2">
                  <div>
                    <Label className="text-xs">Título (opcional)</Label>
                    <Input
                      value={newTexto.titulo}
                      onChange={(e) => setNewTexto(prev => ({ ...prev, titulo: e.target.value }))}
                      placeholder="Ex: Texto sobre sustentabilidade"
                      className="h-9 text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs">Conteúdo do Texto *</Label>
                    <Textarea
                      value={newTexto.conteudo}
                      onChange={(e) => setNewTexto(prev => ({ ...prev, conteudo: e.target.value }))}
                      placeholder="Cole ou digite aqui o texto base que será compartilhado entre as questões..."
                      className="min-h-[120px] text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Fonte (opcional)</Label>
                      <Input
                        value={newTexto.fonte}
                        onChange={(e) => setNewTexto(prev => ({ ...prev, fonte: e.target.value }))}
                        placeholder="Ex: ENEM 2023"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Autor (opcional)</Label>
                      <Input
                        value={newTexto.autor}
                        onChange={(e) => setNewTexto(prev => ({ ...prev, autor: e.target.value }))}
                        placeholder="Ex: Machado de Assis"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleCreateTexto}
                    disabled={!newTexto.conteudo.trim() || isCreating}
                    className="w-full gap-2"
                  >
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Criar Texto Base
                  </Button>
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Right: Questões */}
          <div className="flex flex-col space-y-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckSquare className="h-4 w-4 text-emerald-500" />
                </div>
                <span className="font-medium text-sm">Questões</span>
                {selectedQuestionIndices.length > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-[10px]">
                    {selectedQuestionIndices.length} selecionada(s)
                  </Badge>
                )}
              </div>
            </div>

            {/* Search and filter questions */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuestion}
                  onChange={(e) => setSearchQuestion(e.target.value)}
                  placeholder="Buscar questões..."
                  className="pl-9 h-9"
                />
              </div>
              <Button
                variant={filterMode === 'without-texto' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterMode(prev => prev === 'all' ? 'without-texto' : 'all')}
                className="h-9 gap-1 text-xs whitespace-nowrap"
              >
                <Filter className="h-3 w-3" />
                Sem Texto ({questionsWithoutTexto})
              </Button>
            </div>

            {/* Bulk selection */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllFiltered}
                className="h-7 text-xs gap-1"
              >
                <CheckSquare className="h-3 w-3" />
                Selecionar Todas ({filteredQuestions.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deselectAll}
                disabled={selectedQuestionIndices.length === 0}
                className="h-7 text-xs gap-1"
              >
                <Square className="h-3 w-3" />
                Desmarcar
              </Button>
            </div>

            {/* Questions list */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-1.5 pr-2">
                {filteredQuestions.map((question) => {
                  const hasTexto = !!question.texto_base_id;
                  const isSelected = selectedQuestionIndices.includes(question.index);
                  
                  return (
                    <div
                      key={question.index}
                      onClick={() => toggleQuestionSelect(question.index)}
                      className={`p-2 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-primary/10 border-primary/40'
                          : 'bg-muted/20 border-border/50 hover:border-primary/20'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleQuestionSelect(question.index)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Badge variant="secondary" className="text-[10px]">
                              Q{question.index + 1}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{question.tema}</span>
                            {hasTexto && (
                              <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-500">
                                <Link2 className="h-2.5 w-2.5 mr-0.5" />
                                Com texto
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {question.enunciado}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="text-xs text-muted-foreground">
            {selectedQuestionIndices.length > 0 
              ? `${selectedQuestionIndices.length} questão(ões) selecionada(s)`
              : 'Selecione questões para atribuir texto'}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            <Button
              variant="outline"
              onClick={handleRemoveTexto}
              disabled={selectedQuestionIndices.length === 0}
              className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <X className="h-4 w-4" />
              Remover Texto
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!createdTexto || selectedQuestionIndices.length === 0}
              className="gap-1.5"
            >
              <Link2 className="h-4 w-4" />
              Atribuir Texto
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
