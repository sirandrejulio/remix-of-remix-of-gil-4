-- Create study plans table
CREATE TABLE public.planos_estudo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Availability (Disponibilidade)
  disponibilidade JSONB NOT NULL DEFAULT '{}',
  horas_semanais_total INTEGER NOT NULL DEFAULT 0,
  
  -- Competition (Concurso)
  concurso TEXT NOT NULL,
  concurso_outro TEXT,
  
  -- Position level (Cargo)
  nivel_cargo TEXT NOT NULL,
  
  -- AI Generated Plan
  plano_gerado JSONB,
  plano_status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'gerando', 'ativo', 'concluido'
  
  -- Tracking
  data_prova DATE,
  meta_taxa_acerto INTEGER DEFAULT 70,
  alertas JSONB DEFAULT '[]',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one active plan per user
  CONSTRAINT unique_active_plan_per_user UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.planos_estudo ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own study plans"
ON public.planos_estudo FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own study plan"
ON public.planos_estudo FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study plan"
ON public.planos_estudo FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study plan"
ON public.planos_estudo FOR DELETE
USING (auth.uid() = user_id);

-- Add plano_criado column to profiles to track first login
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plano_criado BOOLEAN NOT NULL DEFAULT false;

-- Trigger for updated_at
CREATE TRIGGER update_planos_estudo_updated_at
BEFORE UPDATE ON public.planos_estudo
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.planos_estudo;