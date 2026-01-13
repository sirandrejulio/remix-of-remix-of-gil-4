CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user'
);


--
-- Name: grupo_prioridade; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.grupo_prioridade AS ENUM (
    'grupo1',
    'grupo2'
);


--
-- Name: nivel_dificuldade; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.nivel_dificuldade AS ENUM (
    'facil',
    'medio',
    'dificil'
);


--
-- Name: questao_origem; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.questao_origem AS ENUM (
    'MANUAL',
    'PDF_IMPORTADO',
    'API'
);


--
-- Name: simulado_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.simulado_status AS ENUM (
    'em_andamento',
    'concluido',
    'cancelado',
    'finalizado'
);


--
-- Name: cleanup_ai_cache(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_ai_cache() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Authorization check: Only admins or service role can execute this
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can execute this function';
  END IF;
  
  DELETE FROM public.ai_response_cache
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  invite_role app_role;
  user_name text;
  invite_id uuid;
BEGIN
  -- Get user name from metadata
  user_name := COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1));
  
  -- Create profile
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, user_name, NEW.email);
  
  -- Try to get role from invite and mark it as used
  SELECT id, role INTO invite_id, invite_role
  FROM public.invites
  WHERE LOWER(email) = LOWER(NEW.email)
    AND used_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Mark invite as used if found
  IF invite_id IS NOT NULL THEN
    UPDATE public.invites 
    SET used_at = now() 
    WHERE id = invite_id;
  END IF;
  
  -- If no invite found, check metadata (backup)
  IF invite_role IS NULL THEN
    invite_role := COALESCE(
      (NEW.raw_user_meta_data->>'invite_role')::app_role,
      'user'::app_role
    );
  END IF;
  
  -- Create user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, invite_role);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    -- Ensure at least basic profile and role exist
    INSERT INTO public.profiles (id, nome, email)
    VALUES (NEW.id, user_name, NEW.email)
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role)
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: log_admin_profile_access(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_admin_profile_access() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    -- Só registra se o admin está acessando perfil de outro usuário
    IF auth.uid() IS NOT NULL 
       AND has_role(auth.uid(), 'admin'::app_role) 
       AND NEW.id != auth.uid() THEN
        INSERT INTO public.admin_data_access_audit (
            admin_user_id,
            accessed_table,
            accessed_user_id,
            action
        ) VALUES (
            auth.uid(),
            'profiles',
            NEW.id,
            'SELECT'
        );
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: update_ai_engine_metrics(text, boolean, integer, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_ai_engine_metrics(p_engine_name text, p_success boolean, p_response_time_ms integer DEFAULT NULL::integer, p_tokens integer DEFAULT NULL::integer, p_error text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Authorization check: Only authenticated users or service role can update metrics
  -- This prevents anonymous manipulation while allowing edge functions to update
  IF auth.uid() IS NULL THEN
    -- When called from edge functions with service role, auth.uid() is null
    -- We allow this since edge functions are trusted
    NULL;
  END IF;

  -- Validate inputs
  IF p_engine_name IS NULL OR length(p_engine_name) = 0 THEN
    RAISE EXCEPTION 'Invalid engine name';
  END IF;
  
  IF length(p_engine_name) > 100 THEN
    RAISE EXCEPTION 'Engine name too long';
  END IF;

  INSERT INTO public.ai_engine_metrics (engine_name, request_count, success_count, failure_count, total_tokens, avg_response_time_ms, last_used_at, last_error, is_healthy)
  VALUES (
    p_engine_name,
    1,
    CASE WHEN p_success THEN 1 ELSE 0 END,
    CASE WHEN p_success THEN 0 ELSE 1 END,
    COALESCE(p_tokens, 0),
    COALESCE(p_response_time_ms, 0),
    now(),
    CASE WHEN p_error IS NOT NULL THEN left(p_error, 500) ELSE NULL END,
    p_success
  )
  ON CONFLICT (engine_name) DO UPDATE SET
    request_count = ai_engine_metrics.request_count + 1,
    success_count = ai_engine_metrics.success_count + CASE WHEN p_success THEN 1 ELSE 0 END,
    failure_count = ai_engine_metrics.failure_count + CASE WHEN p_success THEN 0 ELSE 1 END,
    total_tokens = ai_engine_metrics.total_tokens + COALESCE(p_tokens, 0),
    avg_response_time_ms = CASE 
      WHEN p_response_time_ms IS NOT NULL THEN 
        ((ai_engine_metrics.avg_response_time_ms * ai_engine_metrics.request_count) + p_response_time_ms) / (ai_engine_metrics.request_count + 1)
      ELSE ai_engine_metrics.avg_response_time_ms
    END,
    last_used_at = now(),
    last_error = CASE WHEN p_success THEN ai_engine_metrics.last_error ELSE CASE WHEN p_error IS NOT NULL THEN left(p_error, 500) ELSE NULL END END,
    is_healthy = CASE 
      WHEN p_success THEN true
      WHEN ai_engine_metrics.failure_count + 1 >= 5 THEN false
      ELSE ai_engine_metrics.is_healthy
    END,
    updated_at = now();
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: validate_invite_token(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_invite_token(p_token text, p_email text) RETURNS TABLE(id uuid, email text, role public.app_role, is_valid boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.email,
    i.role,
    TRUE as is_valid
  FROM public.invites i
  WHERE i.token = p_token
    AND LOWER(i.email) = LOWER(p_email)
    AND i.used_at IS NULL
    AND i.expires_at > now()
  LIMIT 1;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: admin_data_access_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_data_access_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_user_id uuid NOT NULL,
    accessed_table text NOT NULL,
    accessed_user_id uuid,
    action text NOT NULL,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text,
    details jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT check_ip_format CHECK (((ip_address IS NULL) OR (ip_address ~ '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$'::text) OR (ip_address ~ '^[0-9a-fA-F:]+$'::text)))
);


--
-- Name: admin_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    severity text DEFAULT 'info'::text,
    read boolean DEFAULT false,
    action_url text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: agent_admin_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_admin_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tipo text NOT NULL,
    descricao text NOT NULL,
    detalhes jsonb,
    admin_id uuid,
    admin_nome text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: agent_data_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_data_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    tipo text NOT NULL,
    descricao text,
    ativo boolean DEFAULT true,
    total_documentos integer DEFAULT 0,
    ultima_atualizacao timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: agent_knowledge_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_knowledge_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titulo text NOT NULL,
    nome_arquivo text NOT NULL,
    tipo_arquivo text NOT NULL,
    tamanho_bytes bigint,
    storage_path text,
    conteudo_extraido text,
    status text DEFAULT 'processando'::text,
    ativo boolean DEFAULT true,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: agent_prompt_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_prompt_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prompt_atual text NOT NULL,
    prompt_anterior text,
    versao integer DEFAULT 1,
    atualizado_por uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_agent_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_agent_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id uuid,
    titulo text NOT NULL,
    tipo text NOT NULL,
    conteudo text NOT NULL,
    formato text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_agent_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_agent_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id uuid,
    nome_arquivo text NOT NULL,
    tipo_arquivo text NOT NULL,
    storage_path text,
    texto_extraido text,
    tamanho_bytes integer,
    processado boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_agent_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_agent_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_agent_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_agent_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    titulo text DEFAULT 'Nova Sessão'::text,
    ativa boolean DEFAULT true,
    ultima_interacao timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    fixada boolean DEFAULT false,
    titulo_customizado text
);


--
-- Name: ai_agent_simulations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_agent_simulations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id uuid,
    simulado_id uuid,
    config jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    titulo text DEFAULT 'Simulado IA'::text,
    status text DEFAULT 'pendente'::text,
    pontuacao integer DEFAULT 0,
    total_questoes integer DEFAULT 0,
    questoes jsonb DEFAULT '[]'::jsonb,
    respostas_usuario jsonb DEFAULT '{}'::jsonb,
    data_fim timestamp with time zone
);


--
-- Name: ai_engine_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_engine_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    engine_used text NOT NULL,
    action text NOT NULL,
    prompt_hash text,
    cache_hit boolean DEFAULT false NOT NULL,
    fallback_used boolean DEFAULT false NOT NULL,
    fallback_reason text,
    response_time_ms integer,
    tokens_used integer,
    success boolean NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_engine_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_engine_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    engine_name text NOT NULL,
    request_count integer DEFAULT 0 NOT NULL,
    success_count integer DEFAULT 0 NOT NULL,
    failure_count integer DEFAULT 0 NOT NULL,
    total_tokens integer DEFAULT 0 NOT NULL,
    avg_response_time_ms integer DEFAULT 0,
    last_used_at timestamp with time zone,
    last_error text,
    is_healthy boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_response_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_response_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prompt_hash text NOT NULL,
    prompt_preview text NOT NULL,
    action text NOT NULL,
    engine_used text NOT NULL,
    response_data jsonb NOT NULL,
    tokens_used integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    hit_count integer DEFAULT 0 NOT NULL,
    is_sensitive boolean DEFAULT false,
    user_id uuid
);


--
-- Name: disciplinas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disciplinas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    grupo_prioridade public.grupo_prioridade DEFAULT 'grupo2'::public.grupo_prioridade,
    peso_estatistico numeric DEFAULT 1,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: erros_analise; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.erros_analise (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    questao_id uuid,
    simulado_id uuid,
    disciplina_id uuid,
    tema text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    token text DEFAULT (gen_random_uuid())::text NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role,
    invited_by uuid,
    used_at timestamp with time zone,
    expires_at timestamp with time zone DEFAULT (now() + '1 day'::interval),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notificacoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificacoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tipo text NOT NULL,
    titulo text NOT NULL,
    mensagem text NOT NULL,
    severidade text DEFAULT 'info'::text,
    lida boolean DEFAULT false,
    action_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: performance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.performance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    disciplina_id uuid,
    taxa_acerto numeric DEFAULT 0,
    total_acertos integer DEFAULT 0,
    total_questoes integer DEFAULT 0,
    temas_fortes text[],
    temas_fracos text[],
    ultima_atividade timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    nome text NOT NULL,
    email text NOT NULL,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'ativo'::text NOT NULL
);


--
-- Name: questoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enunciado text NOT NULL,
    alternativa_a text NOT NULL,
    alternativa_b text NOT NULL,
    alternativa_c text NOT NULL,
    alternativa_d text NOT NULL,
    alternativa_e text NOT NULL,
    resposta_correta text NOT NULL,
    disciplina_id uuid,
    tema text DEFAULT 'Geral'::text NOT NULL,
    subtema text,
    nivel public.nivel_dificuldade DEFAULT 'medio'::public.nivel_dificuldade,
    banca text DEFAULT 'CESGRANRIO'::text,
    subpadrao_banca text,
    origem public.questao_origem DEFAULT 'MANUAL'::public.questao_origem,
    status_validacao text DEFAULT 'pendente'::text,
    motivo_validacao text,
    score_qualidade integer,
    nivel_confianca text,
    documento_origem text,
    ano_referencia integer,
    explicacao text,
    imagem_url text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    texto_base_id uuid
);


--
-- Name: respostas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.respostas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    questao_id uuid,
    simulado_id uuid,
    resposta_selecionada text NOT NULL,
    esta_correta boolean NOT NULL,
    tempo_resposta integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tempo_resposta_segundos integer,
    resposta_usuario text
);


--
-- Name: simulado_questoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.simulado_questoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    simulado_id uuid NOT NULL,
    questao_id uuid NOT NULL,
    ordem integer NOT NULL,
    respondida boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: simulados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.simulados (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    titulo text DEFAULT 'Simulado'::text NOT NULL,
    status public.simulado_status DEFAULT 'em_andamento'::public.simulado_status,
    total_questoes integer DEFAULT 0,
    acertos integer DEFAULT 0,
    nota numeric,
    tempo_gasto integer,
    data_inicio timestamp with time zone DEFAULT now(),
    data_fim timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tipo text DEFAULT 'pratica'::text,
    disciplina_filtro uuid,
    pontuacao integer,
    erros integer
);


--
-- Name: system_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chave text NOT NULL,
    valor text NOT NULL,
    descricao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: textos_base; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.textos_base (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titulo text,
    conteudo text NOT NULL,
    fonte text,
    autor text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL
);


--
-- Name: admin_data_access_audit admin_data_access_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_data_access_audit
    ADD CONSTRAINT admin_data_access_audit_pkey PRIMARY KEY (id);


--
-- Name: admin_logs admin_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_pkey PRIMARY KEY (id);


--
-- Name: admin_notifications admin_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_notifications
    ADD CONSTRAINT admin_notifications_pkey PRIMARY KEY (id);


--
-- Name: agent_admin_logs agent_admin_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_admin_logs
    ADD CONSTRAINT agent_admin_logs_pkey PRIMARY KEY (id);


--
-- Name: agent_data_sources agent_data_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_data_sources
    ADD CONSTRAINT agent_data_sources_pkey PRIMARY KEY (id);


--
-- Name: agent_knowledge_documents agent_knowledge_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_knowledge_documents
    ADD CONSTRAINT agent_knowledge_documents_pkey PRIMARY KEY (id);


--
-- Name: agent_prompt_config agent_prompt_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_prompt_config
    ADD CONSTRAINT agent_prompt_config_pkey PRIMARY KEY (id);


--
-- Name: ai_agent_documents ai_agent_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_documents
    ADD CONSTRAINT ai_agent_documents_pkey PRIMARY KEY (id);


--
-- Name: ai_agent_files ai_agent_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_files
    ADD CONSTRAINT ai_agent_files_pkey PRIMARY KEY (id);


--
-- Name: ai_agent_messages ai_agent_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_messages
    ADD CONSTRAINT ai_agent_messages_pkey PRIMARY KEY (id);


--
-- Name: ai_agent_sessions ai_agent_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_sessions
    ADD CONSTRAINT ai_agent_sessions_pkey PRIMARY KEY (id);


--
-- Name: ai_agent_simulations ai_agent_simulations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_simulations
    ADD CONSTRAINT ai_agent_simulations_pkey PRIMARY KEY (id);


--
-- Name: ai_engine_logs ai_engine_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_engine_logs
    ADD CONSTRAINT ai_engine_logs_pkey PRIMARY KEY (id);


--
-- Name: ai_engine_metrics ai_engine_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_engine_metrics
    ADD CONSTRAINT ai_engine_metrics_pkey PRIMARY KEY (id);


--
-- Name: ai_response_cache ai_response_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_response_cache
    ADD CONSTRAINT ai_response_cache_pkey PRIMARY KEY (id);


--
-- Name: disciplinas disciplinas_nome_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplinas
    ADD CONSTRAINT disciplinas_nome_key UNIQUE (nome);


--
-- Name: disciplinas disciplinas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplinas
    ADD CONSTRAINT disciplinas_pkey PRIMARY KEY (id);


--
-- Name: erros_analise erros_analise_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erros_analise
    ADD CONSTRAINT erros_analise_pkey PRIMARY KEY (id);


--
-- Name: invites invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_pkey PRIMARY KEY (id);


--
-- Name: invites invites_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_token_key UNIQUE (token);


--
-- Name: notificacoes notificacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacoes
    ADD CONSTRAINT notificacoes_pkey PRIMARY KEY (id);


--
-- Name: performance performance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance
    ADD CONSTRAINT performance_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: questoes questoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questoes
    ADD CONSTRAINT questoes_pkey PRIMARY KEY (id);


--
-- Name: respostas respostas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respostas
    ADD CONSTRAINT respostas_pkey PRIMARY KEY (id);


--
-- Name: simulado_questoes simulado_questoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulado_questoes
    ADD CONSTRAINT simulado_questoes_pkey PRIMARY KEY (id);


--
-- Name: simulado_questoes simulado_questoes_simulado_id_questao_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulado_questoes
    ADD CONSTRAINT simulado_questoes_simulado_id_questao_id_key UNIQUE (simulado_id, questao_id);


--
-- Name: simulados simulados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulados
    ADD CONSTRAINT simulados_pkey PRIMARY KEY (id);


--
-- Name: system_config system_config_chave_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_chave_key UNIQUE (chave);


--
-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (id);


--
-- Name: textos_base textos_base_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.textos_base
    ADD CONSTRAINT textos_base_pkey PRIMARY KEY (id);


--
-- Name: ai_engine_metrics unique_engine_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_engine_metrics
    ADD CONSTRAINT unique_engine_name UNIQUE (engine_name);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_ai_agent_sessions_fixada; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_agent_sessions_fixada ON public.ai_agent_sessions USING btree (user_id, fixada DESC, ultima_interacao DESC);


--
-- Name: idx_ai_engine_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_engine_logs_created ON public.ai_engine_logs USING btree (created_at DESC);


--
-- Name: idx_ai_engine_logs_engine; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_engine_logs_engine ON public.ai_engine_logs USING btree (engine_used);


--
-- Name: idx_ai_engine_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_engine_logs_user ON public.ai_engine_logs USING btree (user_id);


--
-- Name: idx_ai_response_cache_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_response_cache_action ON public.ai_response_cache USING btree (action);


--
-- Name: idx_ai_response_cache_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_response_cache_expires ON public.ai_response_cache USING btree (expires_at);


--
-- Name: idx_ai_response_cache_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_response_cache_hash ON public.ai_response_cache USING btree (prompt_hash);


--
-- Name: idx_profiles_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_status ON public.profiles USING btree (status);


--
-- Name: idx_questoes_texto_base_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questoes_texto_base_id ON public.questoes USING btree (texto_base_id);


--
-- Name: invites_email_pending_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX invites_email_pending_unique ON public.invites USING btree (lower(email)) WHERE (used_at IS NULL);


--
-- Name: agent_data_sources update_agent_data_sources_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_data_sources_updated_at BEFORE UPDATE ON public.agent_data_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_knowledge_documents update_agent_knowledge_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_knowledge_documents_updated_at BEFORE UPDATE ON public.agent_knowledge_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_prompt_config update_agent_prompt_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_prompt_config_updated_at BEFORE UPDATE ON public.agent_prompt_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: textos_base update_textos_base_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_textos_base_updated_at BEFORE UPDATE ON public.textos_base FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_admin_logs agent_admin_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_admin_logs
    ADD CONSTRAINT agent_admin_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: agent_knowledge_documents agent_knowledge_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_knowledge_documents
    ADD CONSTRAINT agent_knowledge_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: agent_prompt_config agent_prompt_config_atualizado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_prompt_config
    ADD CONSTRAINT agent_prompt_config_atualizado_por_fkey FOREIGN KEY (atualizado_por) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: ai_agent_documents ai_agent_documents_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_documents
    ADD CONSTRAINT ai_agent_documents_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.ai_agent_sessions(id) ON DELETE CASCADE;


--
-- Name: ai_agent_files ai_agent_files_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_files
    ADD CONSTRAINT ai_agent_files_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.ai_agent_sessions(id) ON DELETE CASCADE;


--
-- Name: ai_agent_messages ai_agent_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_messages
    ADD CONSTRAINT ai_agent_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.ai_agent_sessions(id) ON DELETE CASCADE;


--
-- Name: ai_agent_simulations ai_agent_simulations_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_simulations
    ADD CONSTRAINT ai_agent_simulations_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.ai_agent_sessions(id) ON DELETE CASCADE;


--
-- Name: ai_agent_simulations ai_agent_simulations_simulado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_simulations
    ADD CONSTRAINT ai_agent_simulations_simulado_id_fkey FOREIGN KEY (simulado_id) REFERENCES public.simulados(id) ON DELETE CASCADE;


--
-- Name: ai_engine_logs ai_engine_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_engine_logs
    ADD CONSTRAINT ai_engine_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: ai_response_cache ai_response_cache_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_response_cache
    ADD CONSTRAINT ai_response_cache_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: erros_analise erros_analise_disciplina_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erros_analise
    ADD CONSTRAINT erros_analise_disciplina_id_fkey FOREIGN KEY (disciplina_id) REFERENCES public.disciplinas(id);


--
-- Name: erros_analise erros_analise_questao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erros_analise
    ADD CONSTRAINT erros_analise_questao_id_fkey FOREIGN KEY (questao_id) REFERENCES public.questoes(id) ON DELETE CASCADE;


--
-- Name: erros_analise erros_analise_simulado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erros_analise
    ADD CONSTRAINT erros_analise_simulado_id_fkey FOREIGN KEY (simulado_id) REFERENCES public.simulados(id) ON DELETE CASCADE;


--
-- Name: performance performance_disciplina_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance
    ADD CONSTRAINT performance_disciplina_id_fkey FOREIGN KEY (disciplina_id) REFERENCES public.disciplinas(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: questoes questoes_disciplina_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questoes
    ADD CONSTRAINT questoes_disciplina_id_fkey FOREIGN KEY (disciplina_id) REFERENCES public.disciplinas(id);


--
-- Name: questoes questoes_texto_base_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questoes
    ADD CONSTRAINT questoes_texto_base_id_fkey FOREIGN KEY (texto_base_id) REFERENCES public.textos_base(id);


--
-- Name: respostas respostas_questao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respostas
    ADD CONSTRAINT respostas_questao_id_fkey FOREIGN KEY (questao_id) REFERENCES public.questoes(id) ON DELETE CASCADE;


--
-- Name: respostas respostas_simulado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respostas
    ADD CONSTRAINT respostas_simulado_id_fkey FOREIGN KEY (simulado_id) REFERENCES public.simulados(id) ON DELETE CASCADE;


--
-- Name: simulado_questoes simulado_questoes_questao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulado_questoes
    ADD CONSTRAINT simulado_questoes_questao_id_fkey FOREIGN KEY (questao_id) REFERENCES public.questoes(id) ON DELETE CASCADE;


--
-- Name: simulado_questoes simulado_questoes_simulado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulado_questoes
    ADD CONSTRAINT simulado_questoes_simulado_id_fkey FOREIGN KEY (simulado_id) REFERENCES public.simulados(id) ON DELETE CASCADE;


--
-- Name: simulados simulados_disciplina_filtro_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulados
    ADD CONSTRAINT simulados_disciplina_filtro_fkey FOREIGN KEY (disciplina_filtro) REFERENCES public.disciplinas(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: admin_notifications Admins can delete admin_notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete admin_notifications" ON public.admin_notifications FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: questoes Admins can delete questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete questions" ON public.questoes FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: textos_base Admins can delete textos_base; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete textos_base" ON public.textos_base FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_logs Admins can insert admin_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert admin_logs" ON public.admin_logs FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: admin_notifications Admins can insert admin_notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert admin_notifications" ON public.admin_notifications FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_config Admins can manage config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage config" ON public.system_config USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: disciplinas Admins can manage disciplinas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage disciplinas" ON public.disciplinas USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: invites Admins can manage invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage invites" ON public.invites USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_notifications Admins can update admin_notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update admin_notifications" ON public.admin_notifications FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: questoes Admins can update questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update questions" ON public.questoes FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: textos_base Admins can update textos_base; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update textos_base" ON public.textos_base FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_notifications Admins can view admin_notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view admin_notifications" ON public.admin_notifications FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_response_cache Admins can view all cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all cache" ON public.ai_response_cache FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: system_config Admins can view all config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all config" ON public.system_config FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: performance Admins can view all performance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all performance" ON public.performance FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (((id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: questoes Admins can view all questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all questions" ON public.questoes FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_data_access_audit Admins can view audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view audit logs" ON public.admin_data_access_audit FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_logs Admins can view recent admin_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view recent admin_logs" ON public.admin_logs FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'admin'::public.app_role) AND (created_at > (now() - '90 days'::interval))));


--
-- Name: agent_prompt_config Admins podem atualizar config do prompt; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem atualizar config do prompt" ON public.agent_prompt_config FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agent_knowledge_documents Admins podem atualizar documentos do agente; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem atualizar documentos do agente" ON public.agent_knowledge_documents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agent_data_sources Admins podem atualizar fontes de dados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem atualizar fontes de dados" ON public.agent_data_sources FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agent_prompt_config Admins podem criar config do prompt; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem criar config do prompt" ON public.agent_prompt_config FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agent_knowledge_documents Admins podem criar documentos do agente; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem criar documentos do agente" ON public.agent_knowledge_documents FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agent_data_sources Admins podem criar fontes de dados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem criar fontes de dados" ON public.agent_data_sources FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agent_admin_logs Admins podem criar logs do agente; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem criar logs do agente" ON public.agent_admin_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agent_knowledge_documents Admins podem deletar documentos do agente; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem deletar documentos do agente" ON public.agent_knowledge_documents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agent_data_sources Admins podem deletar fontes de dados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem deletar fontes de dados" ON public.agent_data_sources FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agent_prompt_config Admins podem ver config do prompt; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver config do prompt" ON public.agent_prompt_config FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agent_knowledge_documents Admins podem ver documentos do agente; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver documentos do agente" ON public.agent_knowledge_documents FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agent_data_sources Admins podem ver fontes de dados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver fontes de dados" ON public.agent_data_sources FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agent_admin_logs Admins podem ver logs do agente; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver logs do agente" ON public.agent_admin_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_response_cache Authenticated users can read their own or non-sensitive cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read their own or non-sensitive cache" ON public.ai_response_cache FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR ((user_id IS NULL) AND ((is_sensitive IS NULL) OR (is_sensitive = false)))));


--
-- Name: disciplinas Authenticated users can view disciplinas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view disciplinas" ON public.disciplinas FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: system_config Authenticated users can view safe config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view safe config" ON public.system_config FOR SELECT TO authenticated USING ((chave = ANY (ARRAY['app_name'::text, 'app_version'::text, 'maintenance_mode'::text, 'feature_flags'::text, 'public_announcement'::text])));


--
-- Name: textos_base Authenticated users can view textos_base; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view textos_base" ON public.textos_base FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: questoes Authenticated users can view valid questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view valid questions" ON public.questoes FOR SELECT USING (((auth.uid() IS NOT NULL) AND (status_validacao = 'valida'::text)));


--
-- Name: admin_data_access_audit No one can delete audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No one can delete audit logs" ON public.admin_data_access_audit FOR DELETE TO authenticated USING (false);


--
-- Name: invites Only admins can access invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can access invites" ON public.invites USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_engine_metrics Only admins can view metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view metrics" ON public.ai_engine_metrics FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_agent_documents Users can delete own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own documents" ON public.ai_agent_documents FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: erros_analise Users can delete own erros; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own erros" ON public.erros_analise FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: ai_agent_files Users can delete own files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own files" ON public.ai_agent_files FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: ai_agent_messages Users can delete own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own messages" ON public.ai_agent_messages FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.ai_agent_sessions
  WHERE ((ai_agent_sessions.id = ai_agent_messages.session_id) AND (ai_agent_sessions.user_id = auth.uid())))));


--
-- Name: notificacoes Users can delete own notificacoes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own notificacoes" ON public.notificacoes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: performance Users can delete own performance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own performance" ON public.performance FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can delete own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE USING ((auth.uid() = id));


--
-- Name: respostas Users can delete own respostas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own respostas" ON public.respostas FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: ai_agent_sessions Users can delete own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own sessions" ON public.ai_agent_sessions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: simulado_questoes Users can delete own simulado_questoes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own simulado_questoes" ON public.simulado_questoes FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.simulados
  WHERE ((simulados.id = simulado_questoes.simulado_id) AND (simulados.user_id = auth.uid())))));


--
-- Name: simulados Users can delete own simulados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own simulados" ON public.simulados FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: ai_agent_simulations Users can delete own simulations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own simulations" ON public.ai_agent_simulations FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: ai_agent_documents Users can insert own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own documents" ON public.ai_agent_documents FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: erros_analise Users can insert own erros; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own erros" ON public.erros_analise FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_agent_files Users can insert own files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own files" ON public.ai_agent_files FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_agent_messages Users can insert own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own messages" ON public.ai_agent_messages FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.ai_agent_sessions
  WHERE ((ai_agent_sessions.id = ai_agent_messages.session_id) AND (ai_agent_sessions.user_id = auth.uid())))));


--
-- Name: notificacoes Users can insert own notificacoes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own notificacoes" ON public.notificacoes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: performance Users can insert own performance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own performance" ON public.performance FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: respostas Users can insert own respostas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own respostas" ON public.respostas FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_agent_sessions Users can insert own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own sessions" ON public.ai_agent_sessions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: simulado_questoes Users can insert own simulado_questoes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own simulado_questoes" ON public.simulado_questoes FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.simulados
  WHERE ((simulados.id = simulado_questoes.simulado_id) AND (simulados.user_id = auth.uid())))));


--
-- Name: simulados Users can insert own simulados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own simulados" ON public.simulados FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_agent_simulations Users can insert own simulations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own simulations" ON public.ai_agent_simulations FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: questoes Users can insert questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert questions" ON public.questoes FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: textos_base Users can insert textos_base; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert textos_base" ON public.textos_base FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: ai_agent_documents Users can update own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own documents" ON public.ai_agent_documents FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: erros_analise Users can update own erros; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own erros" ON public.erros_analise FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: ai_agent_files Users can update own files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own files" ON public.ai_agent_files FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: ai_agent_messages Users can update own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own messages" ON public.ai_agent_messages FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.ai_agent_sessions
  WHERE ((ai_agent_sessions.id = ai_agent_messages.session_id) AND (ai_agent_sessions.user_id = auth.uid())))));


--
-- Name: notificacoes Users can update own notificacoes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notificacoes" ON public.notificacoes FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: performance Users can update own performance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own performance" ON public.performance FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: respostas Users can update own respostas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own respostas" ON public.respostas FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: ai_agent_sessions Users can update own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own sessions" ON public.ai_agent_sessions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: simulado_questoes Users can update own simulado_questoes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own simulado_questoes" ON public.simulado_questoes FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.simulados
  WHERE ((simulados.id = simulado_questoes.simulado_id) AND (simulados.user_id = auth.uid())))));


--
-- Name: simulados Users can update own simulados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own simulados" ON public.simulados FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: ai_agent_simulations Users can update own simulations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own simulations" ON public.ai_agent_simulations FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: ai_agent_documents Users can view own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own documents" ON public.ai_agent_documents FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: erros_analise Users can view own erros; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own erros" ON public.erros_analise FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_agent_files Users can view own files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own files" ON public.ai_agent_files FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_engine_logs Users can view own logs or admins all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own logs or admins all" ON public.ai_engine_logs FOR SELECT USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: ai_agent_messages Users can view own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own messages" ON public.ai_agent_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.ai_agent_sessions
  WHERE ((ai_agent_sessions.id = ai_agent_messages.session_id) AND (ai_agent_sessions.user_id = auth.uid())))));


--
-- Name: notificacoes Users can view own notificacoes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notificacoes" ON public.notificacoes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: performance Users can view own performance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own performance" ON public.performance FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (((auth.uid() IS NOT NULL) AND (auth.uid() = id)));


--
-- Name: questoes Users can view own questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own questions" ON public.questoes FOR SELECT USING ((auth.uid() = created_by));


--
-- Name: respostas Users can view own respostas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own respostas" ON public.respostas FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_agent_sessions Users can view own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own sessions" ON public.ai_agent_sessions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: simulado_questoes Users can view own simulado_questoes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own simulado_questoes" ON public.simulado_questoes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.simulados
  WHERE ((simulados.id = simulado_questoes.simulado_id) AND (simulados.user_id = auth.uid())))));


--
-- Name: simulados Users can view own simulados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own simulados" ON public.simulados FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_agent_simulations Users can view own simulations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own simulations" ON public.ai_agent_simulations FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: admin_data_access_audit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_data_access_audit ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_admin_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_admin_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_data_sources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_data_sources ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_knowledge_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_knowledge_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_prompt_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_prompt_config ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_agent_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_agent_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_agent_files; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_agent_files ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_agent_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_agent_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_agent_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_agent_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_agent_simulations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_agent_simulations ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_engine_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_engine_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_engine_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_engine_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_response_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: disciplinas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;

--
-- Name: erros_analise; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.erros_analise ENABLE ROW LEVEL SECURITY;

--
-- Name: invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

--
-- Name: notificacoes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

--
-- Name: performance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.performance ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: questoes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.questoes ENABLE ROW LEVEL SECURITY;

--
-- Name: respostas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.respostas ENABLE ROW LEVEL SECURITY;

--
-- Name: simulado_questoes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.simulado_questoes ENABLE ROW LEVEL SECURITY;

--
-- Name: simulados; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.simulados ENABLE ROW LEVEL SECURITY;

--
-- Name: system_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

--
-- Name: textos_base; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.textos_base ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;