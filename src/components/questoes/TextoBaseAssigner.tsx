import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
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

interface TextoBase {
  id: string;
  titulo: string | null;
  conteudo: string;
  fonte: string | null;
  autor: string | null;
}

interface QuestionPreview {
  index: number;
  enunciado: string;
  tema: string;
  texto_base_id?: string | null;
}

interface TextoBaseAssignerProps {
  questions: QuestionPreview[];
  onAssign: (textoBaseId: string | null, questionIndices: number[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function TextoBaseAssigner({ 
  questions, 
  onAssign,
  isOpen,
  onClose
}: TextoBaseAssignerProps) {
  const { user } = useAuth();
  const [textos, setTextos] = useState<TextoBase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTexto, setSearchTexto] = useState('');
  const [searchQuestion, setSearchQuestion] = useState('');
  const [selectedTextoId, setSelectedTextoId] = useState<string | null>(null);
  const [selectedQuestionIndices, setSelectedQuestionIndices] = useState<number[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'without-texto'>('all');
  
  // Create new texto state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTexto, setNewTexto] = useState({
    titulo: '',
    conteudo: '',
    fonte: '',
    autor: ''
  });

  const fetchTextos = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('textos_base')
        .select('id, titulo, conteudo, fonte, autor')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (searchTexto.trim()) {
        query = query.or(`titulo.ilike.%${searchTexto}%,conteudo.ilike.%${searchTexto}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setTextos(data || []);
    } catch (error) {
      console.error('Error fetching textos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchTexto]);

  useEffect(() => {
    if (isOpen) {
      fetchTextos();
    }
  }, [isOpen, fetchTextos]);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTextoId(null);
      setSelectedQuestionIndices([]);
      setFilterMode('all');
      setSearchQuestion('');
      setShowCreateForm(false);
      setNewTexto({ titulo: '', conteudo: '', fonte: '', autor: '' });
    }
  }, [isOpen]);

  // Handle create new texto
  const handleCreateTexto = async () => {
    if (!newTexto.conteudo.trim()) {
      toast.error('O conteúdo do texto é obrigatório');
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
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Texto base criado com sucesso!');
      setTextos(prev => [data, ...prev]);
      setSelectedTextoId(data.id);
      setShowCreateForm(false);
      setNewTexto({ titulo: '', conteudo: '', fonte: '', autor: '' });
    } catch (error) {
      console.error('Error creating texto:', error);
      toast.error('Erro ao criar texto base');
    } finally {
      setIsCreating(false);
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

  const handleAssign = () => {
    if (selectedQuestionIndices.length === 0) {
      toast.error('Selecione pelo menos uma questão');
      return;
    }

    onAssign(selectedTextoId, selectedQuestionIndices);
    
    const textoNome = selectedTextoId 
      ? textos.find(t => t.id === selectedTextoId)?.titulo || 'Texto base' 
      : 'Texto removido';
    
    toast.success(
      selectedTextoId 
        ? `"${textoNome}" atribuído a ${selectedQuestionIndices.length} questão(ões)`
        : `Texto removido de ${selectedQuestionIndices.length} questão(ões)`
    );
    
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

  const selectedTexto = textos.find(t => t.id === selectedTextoId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-500" />
            Atribuir Texto Base às Questões
          </DialogTitle>
          <DialogDescription>
            Selecione um texto base existente ou crie um novo, depois selecione as questões.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
          {/* Left: Textos Base */}
          <div className="flex flex-col space-y-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <FileText className="h-4 w-4 text-blue-500" />
                </div>
                <span className="font-medium text-sm">Textos Base</span>
              </div>
              <Button
                variant={showCreateForm ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="h-7 gap-1 text-xs"
              >
                <Plus className="h-3 w-3" />
                {showCreateForm ? 'Cancelar' : 'Criar Novo'}
              </Button>
            </div>

            {/* Create new texto form */}
            {showCreateForm && (
              <ScrollArea className="flex-1 min-h-0">
              <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 shadow-lg shadow-emerald-500/5 mr-2">
                <CardHeader className="pb-3 pt-4 px-4">
                  <CardTitle className="flex items-center gap-2 text-base text-emerald-600">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                      <Plus className="h-4 w-4" />
                    </div>
                    Criar e Atribuir Texto Base às Questões
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Preencha os campos abaixo para criar um novo texto base
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-4 pb-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Título (opcional)</Label>
                    <Input
                      value={newTexto.titulo}
                      onChange={(e) => setNewTexto(prev => ({ ...prev, titulo: e.target.value }))}
                      placeholder="Ex: Texto sobre economia..."
                      className="h-9 bg-background/50 border-border/50 focus:border-emerald-500/50"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      Conteúdo <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      value={newTexto.conteudo}
                      onChange={(e) => setNewTexto(prev => ({ ...prev, conteudo: e.target.value }))}
                      placeholder="Cole ou digite o texto base aqui..."
                      rows={5}
                      className="bg-background/50 border-border/50 focus:border-emerald-500/50 resize-none"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Autor (opcional)</Label>
                      <Input
                        value={newTexto.autor}
                        onChange={(e) => setNewTexto(prev => ({ ...prev, autor: e.target.value }))}
                        placeholder="Nome do autor"
                        className="h-9 bg-background/50 border-border/50 focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Fonte (opcional)</Label>
                      <Input
                        value={newTexto.fonte}
                        onChange={(e) => setNewTexto(prev => ({ ...prev, fonte: e.target.value }))}
                        placeholder="Fonte do texto"
                        className="h-9 bg-background/50 border-border/50 focus:border-emerald-500/50"
                      />
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleCreateTexto}
                    disabled={isCreating || !newTexto.conteudo.trim()}
                    className="w-full gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-md shadow-emerald-500/20 transition-all duration-200"
                  >
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Criar e Selecionar Texto
                  </Button>
                </CardContent>
              </Card>
              </ScrollArea>
            )}
            
            {/* Search textos */}
            {!showCreateForm && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTexto}
                  onChange={(e) => setSearchTexto(e.target.value)}
                  placeholder="Buscar textos..."
                  className="pl-9 h-9"
                />
              </div>
            )}

            {/* Selected texto preview */}
            {selectedTexto && !showCreateForm && (
              <div className="p-2 rounded-lg bg-primary/5 border border-primary/30 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium text-xs">
                      {selectedTexto.titulo || 'Texto selecionado'}
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedTextoId(null)} 
                    className="h-5 w-5 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-2">
                  {selectedTexto.conteudo}
                </p>
              </div>
            )}

            {/* Textos list */}
            {!showCreateForm && (
              <ScrollArea className="flex-1 min-h-0">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : textos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <FileText className="h-6 w-6 mb-2 opacity-50" />
                    <p className="text-xs">Nenhum texto encontrado</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setShowCreateForm(true)}
                      className="text-xs mt-1"
                    >
                      Criar novo texto
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1.5 pr-2">
                    {textos.map((texto) => (
                      <div
                        key={texto.id}
                        onClick={() => setSelectedTextoId(texto.id)}
                        className={`p-2 rounded-lg border cursor-pointer transition-all ${
                          selectedTextoId === texto.id
                            ? 'bg-primary/10 border-primary/40'
                            : 'bg-muted/20 border-border/50 hover:border-primary/20'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                            selectedTextoId === texto.id 
                              ? 'border-primary bg-primary' 
                              : 'border-muted-foreground/30'
                          }`}>
                            {selectedTextoId === texto.id && (
                              <Check className="h-2 w-2 text-primary-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-xs truncate block">
                              {texto.titulo || 'Sem título'}
                            </span>
                            <p className="text-[10px] text-muted-foreground line-clamp-1">
                              {texto.conteudo}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
              disabled={!selectedTextoId || selectedQuestionIndices.length === 0}
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