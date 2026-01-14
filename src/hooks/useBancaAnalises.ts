import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface BancaAnalise {
  id: string;
  user_id: string;
  titulo: string;
  banca: string;
  conteudo: string;
  resumo: string | null;
  recomendacoes: Record<string, unknown> | null;
  fixada: boolean;
  created_at: string;
  updated_at: string;
}

export function useBancaAnalises() {
  const { user } = useAuth();
  const [analises, setAnalises] = useState<BancaAnalise[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fetchAnalises = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('analises_banca')
        .select('*')
        .eq('user_id', user.id)
        .order('fixada', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnalises((data as BancaAnalise[]) || []);
    } catch (error) {
      console.error('Erro ao buscar análises:', error);
      toast.error('Erro ao carregar análises');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAnalises();
  }, [fetchAnalises]);

  const createAnalise = async (banca: string): Promise<BancaAnalise | null> => {
    if (!user) return null;
    
    setIsGenerating(true);
    try {
      // Chamar o agente AI para gerar a análise
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('ai-agent-chat', {
        body: {
          message: `Realize uma análise completa e detalhada do perfil da banca ${banca} para concursos bancários. Inclua:

1. **Histórico e Características da Banca**
   - Principais concursos realizados
   - Padrão de questões e nível de dificuldade
   
2. **Perfil das Questões**
   - Disciplinas mais cobradas (aplicar Lei de Pareto 80/20)
   - Temas recorrentes dentro de cada disciplina
   - Estilo de questões (literais, interpretativas, cálculo)
   
3. **Estratégias de Estudo Específicas**
   - Priorização de conteúdo baseada na frequência
   - Técnicas de resolução para o padrão da banca
   - Armadilhas comuns e como evitá-las
   
4. **Recomendações Personalizadas**
   - Cronograma sugerido de estudos
   - Materiais e recursos recomendados
   - Simulados e questões para praticar

5. **Análise de Tendências**
   - Mudanças recentes no padrão de prova
   - Previsões para próximos concursos

Formate o relatório de forma clara e objetiva, com foco em ações práticas que o aluno pode implementar imediatamente.`,
          action: 'analise_banca',
          context: { banca }
        },
        headers: {
          Authorization: `Bearer ${sessionData?.session?.access_token}`
        }
      });

      if (response.error) throw response.error;

      const conteudo = response.data?.response || response.data?.message || 'Análise gerada com sucesso.';
      
      // Extrair resumo (primeiras 200 palavras)
      const palavras = conteudo.split(' ');
      const resumo = palavras.slice(0, 50).join(' ') + (palavras.length > 50 ? '...' : '');

      // Salvar no banco
      const { data, error } = await supabase
        .from('analises_banca')
        .insert({
          user_id: user.id,
          titulo: `Análise ${banca} - ${new Date().toLocaleDateString('pt-BR')}`,
          banca,
          conteudo,
          resumo,
          recomendacoes: null,
          fixada: false
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Análise gerada com sucesso!');
      await fetchAnalises();
      return data as BancaAnalise;
    } catch (error) {
      console.error('Erro ao criar análise:', error);
      toast.error('Erro ao gerar análise. Tente novamente.');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const createAnaliseFromDocument = async (banca: string, documentText: string, fileName: string): Promise<BancaAnalise | null> => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return null;
    }
    
    if (!documentText || documentText.trim().length < 50) {
      toast.error('Documento muito curto ou sem conteúdo legível');
      return null;
    }
    
    setIsGenerating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData?.session?.access_token) {
        throw new Error('Sessão não encontrada');
      }
      
      const truncatedText = documentText.substring(0, 15000);
      const isTruncated = documentText.length > 15000;
      
      const response = await supabase.functions.invoke('ai-agent-chat', {
        body: {
          message: `Analise o documento "${fileName}" enviado pelo aluno e gere uma análise completa para concursos bancários.

CONTEÚDO DO DOCUMENTO:
${truncatedText}
${isTruncated ? '\n\n[... documento truncado por tamanho - continuando análise com o conteúdo disponível ...]' : ''}

Com base no documento acima, realize uma análise completa incluindo:

1. **Síntese do Documento**
   - Principais pontos identificados no material
   - Questões ou temas abordados
   
2. **Análise de Conteúdo**
   - Padrões identificados no documento
   - Disciplinas abordadas (aplicar Lei de Pareto 80/20)
   - Estilo de questões observado (se houver)
   
3. **Pontos de Atenção**
   - Temas críticos encontrados
   - Áreas que precisam de mais estudo
   - Conceitos-chave identificados
   
4. **Estratégias de Estudo**
   - Priorização baseada no documento
   - Técnicas específicas para os temas abordados
   - Recomendações práticas
   
5. **Recomendações Finais**
   - Próximos passos sugeridos
   - Materiais complementares
   - Plano de ação imediato

Formate o relatório de forma clara e objetiva, focando em ações práticas para aprovação em concursos bancários.`,
          action: 'analise_documento',
          context: { fileName, hasDocument: true, documentLength: documentText.length }
        },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`
        }
      });

      if (response.error) {
        console.error('Erro na resposta da função:', response.error);
        throw new Error(response.error.message || 'Erro ao gerar análise');
      }

      const conteudo = response.data?.response || response.data?.message;
      
      if (!conteudo || conteudo.length < 100) {
        throw new Error('Resposta da IA foi muito curta ou vazia');
      }
      
      const palavras = conteudo.split(' ');
      const resumo = `📄 ${fileName} - ${palavras.slice(0, 40).join(' ')}${palavras.length > 40 ? '...' : ''}`;

      const { data, error } = await supabase
        .from('analises_banca')
        .insert({
          user_id: user.id,
          titulo: `Análise - ${fileName}`,
          banca: banca || 'Documento',
          conteudo,
          resumo,
          recomendacoes: null,
          fixada: false
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao salvar análise:', error);
        throw error;
      }
      
      toast.success('Análise do documento gerada com sucesso!');
      await fetchAnalises();
      return data as BancaAnalise;
    } catch (error) {
      console.error('Erro ao criar análise do documento:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao gerar análise: ${errorMessage}`);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const parseDocument = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        throw new Error('Sessão não encontrada');
      }

      // Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await supabase.functions.invoke('parse-document', {
        body: {
          fileData: base64Data,
          fileName: file.name,
          fileType: file.type
        },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`
        }
      });

      if (response.error) throw response.error;
      
      if (!response.data?.success || !response.data?.text) {
        throw new Error(response.data?.error || 'Falha ao extrair texto do documento');
      }

      return response.data.text;
    } catch (error) {
      console.error('Erro ao processar documento:', error);
      toast.error('Erro ao processar documento. Verifique o formato do arquivo.');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteAnalise = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('analises_banca')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Análise excluída');
      await fetchAnalises();
      return true;
    } catch (error) {
      console.error('Erro ao excluir análise:', error);
      toast.error('Erro ao excluir análise');
      return false;
    }
  };

  const pinAnalise = async (id: string, pinned: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('analises_banca')
        .update({ fixada: pinned })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(pinned ? 'Análise fixada' : 'Análise desafixada');
      await fetchAnalises();
      return true;
    } catch (error) {
      console.error('Erro ao fixar análise:', error);
      toast.error('Erro ao atualizar análise');
      return false;
    }
  };

  return {
    analises,
    isLoading,
    isGenerating,
    isUploading,
    fetchAnalises,
    createAnalise,
    createAnaliseFromDocument,
    parseDocument,
    deleteAnalise,
    pinAnalise
  };
}
