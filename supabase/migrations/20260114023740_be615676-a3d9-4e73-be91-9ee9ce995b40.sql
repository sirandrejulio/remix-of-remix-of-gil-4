-- Criar tabela para armazenar análises de banca dos usuários
CREATE TABLE public.analises_banca (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  banca TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  resumo TEXT,
  recomendacoes JSONB,
  fixada BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.analises_banca ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para que cada usuário veja apenas suas próprias análises
CREATE POLICY "Usuários podem ver suas próprias análises"
ON public.analises_banca
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias análises"
ON public.analises_banca
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias análises"
ON public.analises_banca
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias análises"
ON public.analises_banca
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_analises_banca_updated_at
BEFORE UPDATE ON public.analises_banca
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();