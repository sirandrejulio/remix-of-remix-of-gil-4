import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Loader2, BookOpen, X, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export interface StudentTextoBase {
  id: string;
  titulo: string | null;
  conteudo: string;
  fonte: string | null;
  autor: string | null;
}

interface StudentTextoBaseCreatorProps {
  onTextoCreated?: (texto: StudentTextoBase) => void;
  selectedTexto?: StudentTextoBase | null;
  onClearSelection?: () => void;
}

/**
 * Componente simplificado para alunos criarem NOVOS textos base.
 * - NÃO lista textos existentes (segurança)
 * - NÃO permite apagar textos (segurança)
 * - Apenas permite criar um novo texto para vincular às questões
 */
export function StudentTextoBaseCreator({ 
  onTextoCreated, 
  selectedTexto,
  onClearSelection
}: StudentTextoBaseCreatorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [newTexto, setNewTexto] = useState({
    titulo: '',
    conteudo: '',
    fonte: '',
    autor: ''
  });

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

      if (onTextoCreated && data) {
        onTextoCreated(data);
      }
    } catch (error) {
      console.error('Error creating texto:', error);
      toast.error('Erro ao criar texto base');
    } finally {
      setIsCreating(false);
    }
  };

  return (
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
                Crie um texto para compartilhar entre questões
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
                  Este texto poderá ser vinculado às suas questões.
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
                <div className="flex flex-col">
                  <Label>Conteúdo do Texto *</Label>
                  <Textarea
                    value={newTexto.conteudo}
                    onChange={(e) => setNewTexto(prev => ({ ...prev, conteudo: e.target.value }))}
                    placeholder="Cole ou digite o texto base aqui..."
                    className="mt-1 min-h-[200px] max-h-[400px] resize-y overflow-y-auto"
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
        {selectedTexto ? (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/30 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">
                  {selectedTexto.titulo || 'Texto selecionado'}
                </span>
              </div>
              {onClearSelection && (
                <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-6 w-6 p-0">
                  <X className="h-3 w-3" />
                </Button>
              )}
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
        ) : (
          <div className="p-3 rounded-lg bg-muted/20 border border-border/50 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum texto base selecionado
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Clique em "Novo Texto" para criar um
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
