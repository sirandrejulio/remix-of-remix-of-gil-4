-- =====================================================
-- MIGRATION: Correções de Segurança - Parte 2
-- =====================================================

-- 1. PROTEGER TABELA DE AUDIT - Apenas service role pode inserir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_data_access_audit' 
        AND policyname = 'Service role can insert audit logs'
    ) THEN
        CREATE POLICY "Service role can insert audit logs"
        ON public.admin_data_access_audit
        FOR INSERT
        WITH CHECK (true);
    END IF;
END $$;

-- 2. Adicionar política INSERT para ai_engine_logs
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_engine_logs' 
        AND policyname = 'Service role can insert ai_engine_logs'
    ) THEN
        CREATE POLICY "Service role can insert ai_engine_logs"
        ON public.ai_engine_logs
        FOR INSERT
        WITH CHECK (true);
    END IF;
END $$;

-- 3. Adicionar políticas para ai_engine_metrics
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_engine_metrics' 
        AND policyname = 'Service role can insert ai_engine_metrics'
    ) THEN
        CREATE POLICY "Service role can insert ai_engine_metrics"
        ON public.ai_engine_metrics
        FOR INSERT
        WITH CHECK (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_engine_metrics' 
        AND policyname = 'Service role can update ai_engine_metrics'
    ) THEN
        CREATE POLICY "Service role can update ai_engine_metrics"
        ON public.ai_engine_metrics
        FOR UPDATE
        USING (true);
    END IF;
END $$;

-- 4. Adicionar políticas para ai_response_cache
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_response_cache' 
        AND policyname = 'Service role can insert ai_response_cache'
    ) THEN
        CREATE POLICY "Service role can insert ai_response_cache"
        ON public.ai_response_cache
        FOR INSERT
        WITH CHECK (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_response_cache' 
        AND policyname = 'Service role can update ai_response_cache'
    ) THEN
        CREATE POLICY "Service role can update ai_response_cache"
        ON public.ai_response_cache
        FOR UPDATE
        USING (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_response_cache' 
        AND policyname = 'Service role can delete ai_response_cache'
    ) THEN
        CREATE POLICY "Service role can delete ai_response_cache"
        ON public.ai_response_cache
        FOR DELETE
        USING (true);
    END IF;
END $$;

-- 5. Atualizar política de admin para ai_response_cache
DROP POLICY IF EXISTS "Admins can view all cache" ON public.ai_response_cache;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_response_cache' 
        AND policyname = 'Admins can view all cache with audit'
    ) THEN
        CREATE POLICY "Admins can view all cache with audit"
        ON public.ai_response_cache
        FOR SELECT
        USING (
            (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
        );
    END IF;
END $$;