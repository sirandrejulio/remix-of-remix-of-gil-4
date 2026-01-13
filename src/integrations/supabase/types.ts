export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_data_access_audit: {
        Row: {
          accessed_table: string
          accessed_user_id: string | null
          action: string
          admin_user_id: string
          created_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          accessed_table: string
          accessed_user_id?: string | null
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          accessed_table?: string
          accessed_user_id?: string | null
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean | null
          severity: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean | null
          severity?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean | null
          severity?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      agent_admin_logs: {
        Row: {
          admin_id: string | null
          admin_nome: string | null
          created_at: string
          descricao: string
          detalhes: Json | null
          id: string
          tipo: string
        }
        Insert: {
          admin_id?: string | null
          admin_nome?: string | null
          created_at?: string
          descricao: string
          detalhes?: Json | null
          id?: string
          tipo: string
        }
        Update: {
          admin_id?: string | null
          admin_nome?: string | null
          created_at?: string
          descricao?: string
          detalhes?: Json | null
          id?: string
          tipo?: string
        }
        Relationships: []
      }
      agent_data_sources: {
        Row: {
          ativo: boolean | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          tipo: string
          total_documentos: number | null
          ultima_atualizacao: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          tipo: string
          total_documentos?: number | null
          ultima_atualizacao?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          tipo?: string
          total_documentos?: number | null
          ultima_atualizacao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      agent_knowledge_documents: {
        Row: {
          ativo: boolean | null
          conteudo_extraido: string | null
          created_at: string
          id: string
          nome_arquivo: string
          status: string | null
          storage_path: string | null
          tamanho_bytes: number | null
          tipo_arquivo: string
          titulo: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          ativo?: boolean | null
          conteudo_extraido?: string | null
          created_at?: string
          id?: string
          nome_arquivo: string
          status?: string | null
          storage_path?: string | null
          tamanho_bytes?: number | null
          tipo_arquivo: string
          titulo: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          ativo?: boolean | null
          conteudo_extraido?: string | null
          created_at?: string
          id?: string
          nome_arquivo?: string
          status?: string | null
          storage_path?: string | null
          tamanho_bytes?: number | null
          tipo_arquivo?: string
          titulo?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      agent_prompt_config: {
        Row: {
          atualizado_por: string | null
          created_at: string
          id: string
          prompt_anterior: string | null
          prompt_atual: string
          updated_at: string
          versao: number | null
        }
        Insert: {
          atualizado_por?: string | null
          created_at?: string
          id?: string
          prompt_anterior?: string | null
          prompt_atual: string
          updated_at?: string
          versao?: number | null
        }
        Update: {
          atualizado_por?: string | null
          created_at?: string
          id?: string
          prompt_anterior?: string | null
          prompt_atual?: string
          updated_at?: string
          versao?: number | null
        }
        Relationships: []
      }
      ai_agent_documents: {
        Row: {
          conteudo: string
          created_at: string
          formato: string | null
          id: string
          session_id: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          formato?: string | null
          id?: string
          session_id?: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          formato?: string | null
          id?: string
          session_id?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_documents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_files: {
        Row: {
          created_at: string
          id: string
          nome_arquivo: string
          processado: boolean | null
          session_id: string | null
          storage_path: string | null
          tamanho_bytes: number | null
          texto_extraido: string | null
          tipo_arquivo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome_arquivo: string
          processado?: boolean | null
          session_id?: string | null
          storage_path?: string | null
          tamanho_bytes?: number | null
          texto_extraido?: string | null
          tipo_arquivo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome_arquivo?: string
          processado?: boolean | null
          session_id?: string | null
          storage_path?: string | null
          tamanho_bytes?: number | null
          texto_extraido?: string | null
          tipo_arquivo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_files_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_sessions: {
        Row: {
          ativa: boolean | null
          created_at: string
          fixada: boolean | null
          id: string
          titulo: string | null
          titulo_customizado: string | null
          ultima_interacao: string | null
          user_id: string
        }
        Insert: {
          ativa?: boolean | null
          created_at?: string
          fixada?: boolean | null
          id?: string
          titulo?: string | null
          titulo_customizado?: string | null
          ultima_interacao?: string | null
          user_id: string
        }
        Update: {
          ativa?: boolean | null
          created_at?: string
          fixada?: boolean | null
          id?: string
          titulo?: string | null
          titulo_customizado?: string | null
          ultima_interacao?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_agent_simulations: {
        Row: {
          config: Json | null
          created_at: string
          data_fim: string | null
          id: string
          pontuacao: number | null
          questoes: Json | null
          respostas_usuario: Json | null
          session_id: string | null
          simulado_id: string | null
          status: string | null
          titulo: string | null
          total_questoes: number | null
          user_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          data_fim?: string | null
          id?: string
          pontuacao?: number | null
          questoes?: Json | null
          respostas_usuario?: Json | null
          session_id?: string | null
          simulado_id?: string | null
          status?: string | null
          titulo?: string | null
          total_questoes?: number | null
          user_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          data_fim?: string | null
          id?: string
          pontuacao?: number | null
          questoes?: Json | null
          respostas_usuario?: Json | null
          session_id?: string | null
          simulado_id?: string | null
          status?: string | null
          titulo?: string | null
          total_questoes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_simulations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_simulations_simulado_id_fkey"
            columns: ["simulado_id"]
            isOneToOne: false
            referencedRelation: "simulados"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_engine_logs: {
        Row: {
          action: string
          cache_hit: boolean
          created_at: string
          engine_used: string
          error_message: string | null
          fallback_reason: string | null
          fallback_used: boolean
          id: string
          prompt_hash: string | null
          response_time_ms: number | null
          success: boolean
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          action: string
          cache_hit?: boolean
          created_at?: string
          engine_used: string
          error_message?: string | null
          fallback_reason?: string | null
          fallback_used?: boolean
          id?: string
          prompt_hash?: string | null
          response_time_ms?: number | null
          success: boolean
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          action?: string
          cache_hit?: boolean
          created_at?: string
          engine_used?: string
          error_message?: string | null
          fallback_reason?: string | null
          fallback_used?: boolean
          id?: string
          prompt_hash?: string | null
          response_time_ms?: number | null
          success?: boolean
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_engine_metrics: {
        Row: {
          avg_response_time_ms: number | null
          created_at: string
          engine_name: string
          failure_count: number
          id: string
          is_healthy: boolean
          last_error: string | null
          last_used_at: string | null
          request_count: number
          success_count: number
          total_tokens: number
          updated_at: string
        }
        Insert: {
          avg_response_time_ms?: number | null
          created_at?: string
          engine_name: string
          failure_count?: number
          id?: string
          is_healthy?: boolean
          last_error?: string | null
          last_used_at?: string | null
          request_count?: number
          success_count?: number
          total_tokens?: number
          updated_at?: string
        }
        Update: {
          avg_response_time_ms?: number | null
          created_at?: string
          engine_name?: string
          failure_count?: number
          id?: string
          is_healthy?: boolean
          last_error?: string | null
          last_used_at?: string | null
          request_count?: number
          success_count?: number
          total_tokens?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_response_cache: {
        Row: {
          action: string
          created_at: string
          engine_used: string
          expires_at: string
          hit_count: number
          id: string
          is_sensitive: boolean | null
          prompt_hash: string
          prompt_preview: string
          response_data: Json
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          engine_used: string
          expires_at?: string
          hit_count?: number
          id?: string
          is_sensitive?: boolean | null
          prompt_hash: string
          prompt_preview: string
          response_data: Json
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          engine_used?: string
          expires_at?: string
          hit_count?: number
          id?: string
          is_sensitive?: boolean | null
          prompt_hash?: string
          prompt_preview?: string
          response_data?: Json
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      disciplinas: {
        Row: {
          created_at: string
          grupo_prioridade:
            | Database["public"]["Enums"]["grupo_prioridade"]
            | null
          id: string
          nome: string
          peso_estatistico: number | null
        }
        Insert: {
          created_at?: string
          grupo_prioridade?:
            | Database["public"]["Enums"]["grupo_prioridade"]
            | null
          id?: string
          nome: string
          peso_estatistico?: number | null
        }
        Update: {
          created_at?: string
          grupo_prioridade?:
            | Database["public"]["Enums"]["grupo_prioridade"]
            | null
          id?: string
          nome?: string
          peso_estatistico?: number | null
        }
        Relationships: []
      }
      erros_analise: {
        Row: {
          created_at: string
          disciplina_id: string | null
          id: string
          questao_id: string | null
          simulado_id: string | null
          tema: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          disciplina_id?: string | null
          id?: string
          questao_id?: string | null
          simulado_id?: string | null
          tema?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          disciplina_id?: string | null
          id?: string
          questao_id?: string | null
          simulado_id?: string | null
          tema?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "erros_analise_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erros_analise_questao_id_fkey"
            columns: ["questao_id"]
            isOneToOne: false
            referencedRelation: "questoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erros_analise_simulado_id_fkey"
            columns: ["simulado_id"]
            isOneToOne: false
            referencedRelation: "simulados"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          lida: boolean | null
          mensagem: string
          severidade: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          lida?: boolean | null
          mensagem: string
          severidade?: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          lida?: boolean | null
          mensagem?: string
          severidade?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      performance: {
        Row: {
          created_at: string
          disciplina_id: string | null
          id: string
          taxa_acerto: number | null
          temas_fortes: string[] | null
          temas_fracos: string[] | null
          total_acertos: number | null
          total_questoes: number | null
          ultima_atividade: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          disciplina_id?: string | null
          id?: string
          taxa_acerto?: number | null
          temas_fortes?: string[] | null
          temas_fracos?: string[] | null
          total_acertos?: number | null
          total_questoes?: number | null
          ultima_atividade?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          disciplina_id?: string | null
          id?: string
          taxa_acerto?: number | null
          temas_fortes?: string[] | null
          temas_fracos?: string[] | null
          total_acertos?: number | null
          total_questoes?: number | null
          ultima_atividade?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          nome: string
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          nome: string
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      questoes: {
        Row: {
          alternativa_a: string
          alternativa_b: string
          alternativa_c: string
          alternativa_d: string
          alternativa_e: string
          ano_referencia: number | null
          banca: string | null
          created_at: string
          created_by: string | null
          disciplina_id: string | null
          documento_origem: string | null
          enunciado: string
          explicacao: string | null
          id: string
          imagem_url: string | null
          motivo_validacao: string | null
          nivel: Database["public"]["Enums"]["nivel_dificuldade"] | null
          nivel_confianca: string | null
          origem: Database["public"]["Enums"]["questao_origem"] | null
          resposta_correta: string
          score_qualidade: number | null
          status_validacao: string | null
          subpadrao_banca: string | null
          subtema: string | null
          tema: string
          texto_base_id: string | null
          updated_at: string
        }
        Insert: {
          alternativa_a: string
          alternativa_b: string
          alternativa_c: string
          alternativa_d: string
          alternativa_e: string
          ano_referencia?: number | null
          banca?: string | null
          created_at?: string
          created_by?: string | null
          disciplina_id?: string | null
          documento_origem?: string | null
          enunciado: string
          explicacao?: string | null
          id?: string
          imagem_url?: string | null
          motivo_validacao?: string | null
          nivel?: Database["public"]["Enums"]["nivel_dificuldade"] | null
          nivel_confianca?: string | null
          origem?: Database["public"]["Enums"]["questao_origem"] | null
          resposta_correta: string
          score_qualidade?: number | null
          status_validacao?: string | null
          subpadrao_banca?: string | null
          subtema?: string | null
          tema?: string
          texto_base_id?: string | null
          updated_at?: string
        }
        Update: {
          alternativa_a?: string
          alternativa_b?: string
          alternativa_c?: string
          alternativa_d?: string
          alternativa_e?: string
          ano_referencia?: number | null
          banca?: string | null
          created_at?: string
          created_by?: string | null
          disciplina_id?: string | null
          documento_origem?: string | null
          enunciado?: string
          explicacao?: string | null
          id?: string
          imagem_url?: string | null
          motivo_validacao?: string | null
          nivel?: Database["public"]["Enums"]["nivel_dificuldade"] | null
          nivel_confianca?: string | null
          origem?: Database["public"]["Enums"]["questao_origem"] | null
          resposta_correta?: string
          score_qualidade?: number | null
          status_validacao?: string | null
          subpadrao_banca?: string | null
          subtema?: string | null
          tema?: string
          texto_base_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questoes_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questoes_texto_base_id_fkey"
            columns: ["texto_base_id"]
            isOneToOne: false
            referencedRelation: "textos_base"
            referencedColumns: ["id"]
          },
        ]
      }
      respostas: {
        Row: {
          created_at: string
          esta_correta: boolean
          id: string
          questao_id: string | null
          resposta_selecionada: string
          resposta_usuario: string | null
          simulado_id: string | null
          tempo_resposta: number | null
          tempo_resposta_segundos: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          esta_correta: boolean
          id?: string
          questao_id?: string | null
          resposta_selecionada: string
          resposta_usuario?: string | null
          simulado_id?: string | null
          tempo_resposta?: number | null
          tempo_resposta_segundos?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          esta_correta?: boolean
          id?: string
          questao_id?: string | null
          resposta_selecionada?: string
          resposta_usuario?: string | null
          simulado_id?: string | null
          tempo_resposta?: number | null
          tempo_resposta_segundos?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "respostas_questao_id_fkey"
            columns: ["questao_id"]
            isOneToOne: false
            referencedRelation: "questoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_simulado_id_fkey"
            columns: ["simulado_id"]
            isOneToOne: false
            referencedRelation: "simulados"
            referencedColumns: ["id"]
          },
        ]
      }
      simulado_questoes: {
        Row: {
          created_at: string
          id: string
          ordem: number
          questao_id: string
          respondida: boolean | null
          simulado_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ordem: number
          questao_id: string
          respondida?: boolean | null
          simulado_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ordem?: number
          questao_id?: string
          respondida?: boolean | null
          simulado_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulado_questoes_questao_id_fkey"
            columns: ["questao_id"]
            isOneToOne: false
            referencedRelation: "questoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulado_questoes_simulado_id_fkey"
            columns: ["simulado_id"]
            isOneToOne: false
            referencedRelation: "simulados"
            referencedColumns: ["id"]
          },
        ]
      }
      simulados: {
        Row: {
          acertos: number | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          disciplina_filtro: string | null
          erros: number | null
          id: string
          nota: number | null
          pontuacao: number | null
          status: Database["public"]["Enums"]["simulado_status"] | null
          tempo_gasto: number | null
          tipo: string | null
          titulo: string
          total_questoes: number | null
          user_id: string
        }
        Insert: {
          acertos?: number | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          disciplina_filtro?: string | null
          erros?: number | null
          id?: string
          nota?: number | null
          pontuacao?: number | null
          status?: Database["public"]["Enums"]["simulado_status"] | null
          tempo_gasto?: number | null
          tipo?: string | null
          titulo?: string
          total_questoes?: number | null
          user_id: string
        }
        Update: {
          acertos?: number | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          disciplina_filtro?: string | null
          erros?: number | null
          id?: string
          nota?: number | null
          pontuacao?: number | null
          status?: Database["public"]["Enums"]["simulado_status"] | null
          tempo_gasto?: number | null
          tipo?: string | null
          titulo?: string
          total_questoes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulados_disciplina_filtro_fkey"
            columns: ["disciplina_filtro"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          chave: string
          created_at: string
          descricao: string | null
          id: string
          valor: string
        }
        Insert: {
          chave: string
          created_at?: string
          descricao?: string | null
          id?: string
          valor: string
        }
        Update: {
          chave?: string
          created_at?: string
          descricao?: string | null
          id?: string
          valor?: string
        }
        Relationships: []
      }
      textos_base: {
        Row: {
          autor: string | null
          conteudo: string
          created_at: string
          created_by: string | null
          fonte: string | null
          id: string
          titulo: string | null
          updated_at: string
        }
        Insert: {
          autor?: string | null
          conteudo: string
          created_at?: string
          created_by?: string | null
          fonte?: string | null
          id?: string
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          autor?: string | null
          conteudo?: string
          created_at?: string
          created_by?: string | null
          fonte?: string | null
          id?: string
          titulo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_ai_cache: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_ai_engine_metrics: {
        Args: {
          p_engine_name: string
          p_error?: string
          p_response_time_ms?: number
          p_success: boolean
          p_tokens?: number
        }
        Returns: undefined
      }
      validate_invite_token: {
        Args: { p_email: string; p_token: string }
        Returns: {
          email: string
          id: string
          is_valid: boolean
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      grupo_prioridade: "grupo1" | "grupo2"
      nivel_dificuldade: "facil" | "medio" | "dificil"
      questao_origem: "MANUAL" | "PDF_IMPORTADO" | "API"
      simulado_status: "em_andamento" | "concluido" | "cancelado" | "finalizado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      grupo_prioridade: ["grupo1", "grupo2"],
      nivel_dificuldade: ["facil", "medio", "dificil"],
      questao_origem: ["MANUAL", "PDF_IMPORTADO", "API"],
      simulado_status: ["em_andamento", "concluido", "cancelado", "finalizado"],
    },
  },
} as const
