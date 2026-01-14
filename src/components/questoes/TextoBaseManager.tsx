import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AutoTextarea } from '@/components/ui/auto-textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  FileText, Plus, Search, Loader2, ChevronRight, Check, BookOpen, X, Trash2, Link2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface TextoBase {
  id: string;
  titulo: string | null;
  conteudo: string;
  fonte: string | null;
  autor: string | null;
  created_at: string;
}

interface TextoBaseManagerProps {
  onSelect?: (texto: TextoBase | null) => void;
  selectedId?: string | null;
  mode?: 'select' | 'manage';
  selectedQuestionIds?: string[];
  onAssignToQuestions?: (textoBaseId: string, questionIds: string[]) => void;
}

export function TextoBaseManager({ 
  onSelect, 
  selectedId, 
  mode = 'select',
  selectedQuestionIds = [],
  onAssignToQuestions
}: TextoBaseManagerProps) {
  const [textos, setTextos] = useState<TextoBase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [textoToDelete, setTextoToDelete] = useState<TextoBase | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  
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
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (searchQuery.trim()) {
        query = query.or(`titulo.ilike.%${searchQuery}%,conteudo.ilike.%${searchQuery}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setTextos(data || []);
    } catch (error) {
      console.error('Error fetching textos:', error);
      toast.error('Erro ao buscar textos base');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchTextos();
  }, [fetchTextos]);

  const handleCreateTexto = async () => {
    if (!newTexto.conteudo.trim()) {
      toast.error('O conteúdo do texto é obrigatório');
      return;
    }

    setIsCreating(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('textos_base')
        .insert({
          titulo: newTexto.titulo || `Texto ${new Date().toLocaleDateString('pt-BR')}`,
          conteudo: newTexto.conteudo,
          fonte: newTexto.fonte || null,
          autor: newTexto.autor || null,
          created_by: userData.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Texto base criado com sucesso!');
      setNewTexto({ titulo: '', conteudo: '', fonte: '', autor: '' });
      setDialogOpen(false);
      fetchTextos();

      if (onSelect && data) {
        onSelect(data);
      }
    } catch (error) {
      console.error('Error creating texto:', error);
      toast.error('Erro ao criar texto base');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTexto = async () => {
    if (!textoToDelete) return;

    setIsDeleting(true);
    try {
      // First, unlink any questions that use this texto_base
      const { error: unlinkError } = await supabase
        .from('questoes')
        .update({ texto_base_id: null })
        .eq('texto_base_id', textoToDelete.id);

      if (unlinkError) throw unlinkError;

      // Then delete the texto_base
      const { error } = await supabase
        .from('textos_base')
        .delete()
        .eq('id', textoToDelete.id);

      if (error) throw error;

      toast.success('Texto base excluído com sucesso!');
      setDeleteDialogOpen(false);
      setTextoToDelete(null);
      fetchTextos();

      // Clear selection if the deleted texto was selected
      if (selectedId === textoToDelete.id && onSelect) {
        onSelect(null);
      }
    } catch (error) {
      console.error('Error deleting texto:', error);
      toast.error('Erro ao excluir texto base');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAssignToQuestions = async (textoId: string) => {
    if (selectedQuestionIds.length === 0) {
      toast.error('Selecione pelo menos uma questão');
      return;
    }

    if (onAssignToQuestions) {
      onAssignToQuestions(textoId, selectedQuestionIds);
      return;
    }

    setIsAssigning(true);
    try {
      const { error } = await supabase
        .from('questoes')
        .update({ texto_base_id: textoId })
        .in('id', selectedQuestionIds);

      if (error) throw error;

      toast.success(`Texto base atribuído a ${selectedQuestionIds.length} questão(ões)!`);
    } catch (error) {
      console.error('Error assigning texto to questions:', error);
      toast.error('Erro ao atribuir texto base às questões');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSelectTexto = (texto: TextoBase) => {
    if (onSelect) {
      onSelect(texto);
    }
  };

  const clearSelection = () => {
    if (onSelect) {
      onSelect(null);
    }
  };

  const openDeleteDialog = (e: React.MouseEvent, texto: TextoBase) => {
    e.stopPropagation();
    setTextoToDelete(texto);
    setDeleteDialogOpen(true);
  };

  const selectedTexto = textos.find(t => t.id === selectedId);

  return (
    <>
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <BookOpen className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-base">Texto Base</CardTitle>
                <CardDescription className="text-xs">
                  Compartilhe um texto entre várias questões
                </CardDescription>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="h-3 w-3" />
                  Novo Texto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Criar Texto Base</DialogTitle>
                  <DialogDescription>
                    Este texto poderá ser vinculado a múltiplas questões.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Título (opcional)</Label>
                      <Input
                        value={newTexto.titulo}
                        onChange={(e) => setNewTexto(prev => ({ ...prev, titulo: e.target.value }))}
                        placeholder="Ex: Texto sobre Modernismo"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Autor (opcional)</Label>
                      <Input
                        value={newTexto.autor}
                        onChange={(e) => setNewTexto(prev => ({ ...prev, autor: e.target.value }))}
                        placeholder="Ex: Machado de Assis"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Fonte (opcional)</Label>
                    <Input
                      value={newTexto.fonte}
                      onChange={(e) => setNewTexto(prev => ({ ...prev, fonte: e.target.value }))}
                      placeholder="Ex: Folha de São Paulo, 2023"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Conteúdo do Texto *</Label>
                    <AutoTextarea
                      value={newTexto.conteudo}
                      onChange={(e) => setNewTexto(prev => ({ ...prev, conteudo: e.target.value }))}
                      placeholder="Cole ou digite o texto base aqui..."
                      minRows={6}
                      maxRows={15}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateTexto} disabled={isCreating}>
                      {isCreating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Criar Texto Base
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Selected text preview */}
          {selectedTexto && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/30 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">
                    {selectedTexto.titulo || 'Texto selecionado'}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={clearSelection} className="h-6 w-6 p-0">
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {selectedTexto.conteudo}
              </p>
              {(selectedTexto.autor || selectedTexto.fonte) && (
                <div className="flex gap-2 text-[10px] text-muted-foreground">
                  {selectedTexto.autor && <span>Por: {selectedTexto.autor}</span>}
                  {selectedTexto.fonte && <span>• {selectedTexto.fonte}</span>}
                </div>
              )}
            </div>
          )}

          {/* Assign to selected questions */}
          {selectedQuestionIds.length > 0 && selectedId && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    <strong>{selectedQuestionIds.length}</strong> questão(ões) selecionada(s)
                  </span>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => handleAssignToQuestions(selectedId)}
                  disabled={isAssigning}
                  className="gap-1.5"
                >
                  {isAssigning ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5" />
                  )}
                  Atribuir Texto
                </Button>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar textos existentes..."
              className="pl-9"
            />
          </div>

          {/* Textos list */}
          <ScrollArea className="h-[200px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : textos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <FileText className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Nenhum texto base cadastrado</p>
                <p className="text-xs">Clique em "Novo Texto" para criar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {textos.map((texto) => (
                  <div
                    key={texto.id}
                    onClick={() => handleSelectTexto(texto)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all group ${
                      selectedId === texto.id
                        ? 'bg-primary/5 border-primary/30'
                        : 'bg-muted/20 border-border/50 hover:border-primary/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">
                            {texto.titulo || 'Sem título'}
                          </span>
                          {texto.autor && (
                            <Badge variant="secondary" className="text-[10px]">
                              {texto.autor}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {texto.conteudo}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => openDeleteDialog(e, texto)}
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        {selectedQuestionIds.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssignToQuestions(texto.id);
                            }}
                            disabled={isAssigning}
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-green-600 hover:text-green-600 hover:bg-green-500/10"
                            title="Atribuir às questões selecionadas"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Texto Base</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o texto "{textoToDelete?.titulo || 'Sem título'}"?
              <br /><br />
              <strong className="text-destructive">Atenção:</strong> Todas as questões vinculadas a este texto serão desvinculadas automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTexto}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
