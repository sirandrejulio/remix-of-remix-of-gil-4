-- =====================================================
-- MIGRATION: Otimização de Performance e Segurança
-- =====================================================

-- 1. ÍNDICES DE PERFORMANCE
-- Índice para filtro de status de questões (muito usado)
CREATE INDEX IF NOT EXISTS idx_questoes_status_validacao ON public.questoes(status_validacao);

-- Índice para filtro de disciplina em questões
CREATE INDEX IF NOT EXISTS idx_questoes_disciplina_id ON public.questoes(disciplina_id);

-- Índice composto para busca de questões válidas por disciplina
CREATE INDEX IF NOT EXISTS idx_questoes_valida_disciplina ON public.questoes(status_validacao, disciplina_id) WHERE status_validacao = 'valida';

-- Índice para respostas por simulado (usado em todas as consultas de resultado)
CREATE INDEX IF NOT EXISTS idx_respostas_simulado_id ON public.respostas(simulado_id);

-- Índice para respostas por usuário
CREATE INDEX IF NOT EXISTS idx_respostas_user_id ON public.respostas(user_id);

-- Índice composto para busca de respostas de um usuário em um simulado
CREATE INDEX IF NOT EXISTS idx_respostas_simulado_user ON public.respostas(simulado_id, user_id);

-- Índice para simulados por usuário
CREATE INDEX IF NOT EXISTS idx_simulados_user_id ON public.simulados(user_id);

-- Índice para simulados por status
CREATE INDEX IF NOT EXISTS idx_simulados_status ON public.simulados(status);

-- Índice composto para simulados de um usuário por status
CREATE INDEX IF NOT EXISTS idx_simulados_user_status ON public.simulados(user_id, status);

-- Índice para erros_analise por usuário
CREATE INDEX IF NOT EXISTS idx_erros_analise_user_id ON public.erros_analise(user_id);

-- Índice para erros_analise por disciplina
CREATE INDEX IF NOT EXISTS idx_erros_analise_disciplina_id ON public.erros_analise(disciplina_id);

-- Índice para questões por tema
CREATE INDEX IF NOT EXISTS idx_questoes_tema ON public.questoes(tema);

-- Índice para questões por banca
CREATE INDEX IF NOT EXISTS idx_questoes_banca ON public.questoes(banca);

-- Índice para ai_agent_sessions por usuário
CREATE INDEX IF NOT EXISTS idx_ai_agent_sessions_user_id ON public.ai_agent_sessions(user_id);

-- Índice para ai_agent_messages por sessão
CREATE INDEX IF NOT EXISTS idx_ai_agent_messages_session_id ON public.ai_agent_messages(session_id);

-- Índice para notificações por usuário
CREATE INDEX IF NOT EXISTS idx_notificacoes_user_id ON public.notificacoes(user_id);

-- Índice para performance por usuário
CREATE INDEX IF NOT EXISTS idx_performance_user_id ON public.performance(user_id);

-- 2. REMOVER COLUNA REDUNDANTE DA TABELA RESPOSTAS
-- Primeiro, migrar dados se houver resposta_usuario preenchido mas resposta_selecionada vazio
UPDATE public.respostas 
SET resposta_selecionada = resposta_usuario 
WHERE resposta_selecionada = '' AND resposta_usuario IS NOT NULL AND resposta_usuario != '';

-- Remover a coluna redundante
ALTER TABLE public.respostas DROP COLUMN IF EXISTS resposta_usuario;

-- 3. MELHORAR SEGURANÇA - Restringir cache de IA apenas ao próprio usuário
DROP POLICY IF EXISTS "Authenticated users can read their own or non-sensitive cache" ON public.ai_response_cache;

CREATE POLICY "Users can only read their own cache"
ON public.ai_response_cache
FOR SELECT
USING (user_id = auth.uid());

-- 4. Adicionar auditoria em acesso admin a dados de performance
CREATE OR REPLACE FUNCTION public.log_admin_performance_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF auth.uid() IS NOT NULL 
       AND has_role(auth.uid(), 'admin'::app_role) 
       AND NEW.user_id != auth.uid() THEN
        INSERT INTO public.admin_data_access_audit (
            admin_user_id,
            accessed_table,
            accessed_user_id,
            action
        ) VALUES (
            auth.uid(),
            'performance',
            NEW.user_id,
            'SELECT'
        );
    END IF;
    RETURN NEW;
END;
$function$;

-- 5. Criar índice para busca de logs recentes (melhorar performance de admin_logs)
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_logs(created_at DESC);

-- 6. Índice para admin_notifications por admin
CREATE INDEX IF NOT EXISTS idx_admin_notifications_user_id ON public.admin_notifications(user_id);

-- 7. Índice para invites por email (para validação rápida)
CREATE INDEX IF NOT EXISTS idx_invites_email ON public.invites(email);

-- 8. Índice para invites por token (para lookup rápido)
CREATE INDEX IF NOT EXISTS idx_invites_token ON public.invites(token);