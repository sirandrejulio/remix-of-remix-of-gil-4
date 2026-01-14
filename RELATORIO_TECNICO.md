# 📋 RELATÓRIO TÉCNICO COMPLETO - BANCÁRIO ÁGIL

**Sistema de Preparação para Concursos Bancários**  
**Data de Geração:** 2026-01-06  
**Versão:** 1.0

---

## 📑 ÍNDICE

1. [Estrutura de Páginas e Rotas](#1-estrutura-de-páginas-e-rotas)
2. [Componentes e Funcionalidades](#2-componentes-e-funcionalidades)
3. [Elementos Interativos](#3-elementos-interativos)
4. [Banco de Dados](#4-banco-de-dados)
5. [Integrações e APIs](#5-integrações-e-apis)
6. [Gerenciamento de Estado](#6-gerenciamento-de-estado)
7. [Autenticação e Autorização](#7-autenticação-e-autorização)
8. [Configurações e Variáveis de Ambiente](#8-configurações-e-variáveis-de-ambiente)
9. [Fluxos de Dados](#9-fluxos-de-dados)
10. [Estrutura de Arquivos](#10-estrutura-de-arquivos)
11. [Análise e Recomendações](#11-análise-e-recomendações)

---

## 1. ESTRUTURA DE PÁGINAS E ROTAS

### 1.1 Rotas Públicas

| Rota | Componente | Propósito | Autenticação |
|------|------------|-----------|--------------|
| `/` | `Index` | Landing page com apresentação do sistema | Nenhuma |
| `/auth` | `Auth` | Login e cadastro de usuários | Nenhuma |
| `/*` | `NotFound` | Página 404 para rotas inexistentes | Nenhuma |

### 1.2 Rotas Protegidas (Alunos)

| Rota | Componente | Propósito | Autenticação |
|------|------------|-----------|--------------|
| `/dashboard` | `Dashboard` | Painel principal do aluno com métricas | Usuário logado |
| `/simulados` | `Simulados` | Lista e criação de simulados | Usuário logado |
| `/simulado/realizar` | `RealizarSimulado` | Execução do simulado com timer | Usuário logado |
| `/simulado/resultado` | `ResultadoSimulado` | Resultado após finalizar simulado | Usuário logado |
| `/questoes` | `Questoes` | Banco de questões disponíveis | Usuário logado |
| `/questoes/nova` | `NovaQuestao` | Cadastro/upload de novas questões | Usuário logado |
| `/especialista-de-estudos` | `EspecialistaDeEstudos` | Chat IA para orientação de estudos | Usuário logado |

### 1.3 Rotas Administrativas (Admin)

| Rota | Componente | Propósito | Autenticação |
|------|------------|-----------|--------------|
| `/admin` | `AdminLayout` → `AdminDashboard` | Dashboard administrativo | Admin |
| `/admin/modulos` | `AdminModulos` | Gestão de módulos do sistema | Admin |
| `/admin/usuarios` | `AdminUsers` | Gestão de usuários e convites | Admin |
| `/admin/upload` | `AdminUpload` | Upload em massa de questões | Admin |
| `/admin/questoes` | `AdminQuestoes` | Gestão e validação de questões | Admin |
| `/admin/questoes/nova` | `AdminNovaQuestao` | Cadastro direto de questões (auto-validadas) | Admin |
| `/admin/logs` | `AdminLogs` | Visualização de logs do sistema | Admin |
| `/admin/estatisticas` | `AdminEstatisticas` | Estatísticas gerais do sistema | Admin |
| `/admin/configuracoes` | `AdminConfiguracoes` | Configurações do sistema | Admin |

---

## 2. COMPONENTES E FUNCIONALIDADES

### 2.1 Componentes de Layout

| Componente | Localização | Funcionalidade |
|------------|-------------|----------------|
| `Header` | `src/components/layout/Header.tsx` | Navegação principal, logo, notificações |
| `Footer` | `src/components/layout/Footer.tsx` | Rodapé com links e informações |
| `AdminLayout` | `src/pages/admin/AdminLayout.tsx` | Layout wrapper para área admin com sidebar |
| `NavLink` | `src/components/NavLink.tsx` | Links de navegação estilizados |

### 2.2 Componentes da Home

| Componente | Localização | Funcionalidade |
|------------|-------------|----------------|
| `HeroSection` | `src/components/home/HeroSection.tsx` | Banner principal da landing page |
| `FeaturesSection` | `src/components/home/FeaturesSection.tsx` | Seção de funcionalidades |
| `DisciplinesSection` | `src/components/home/DisciplinesSection.tsx` | Lista de disciplinas cobertas |
| `CTASection` | `src/components/home/CTASection.tsx` | Call-to-action para cadastro |

### 2.3 Componentes do Dashboard

| Componente | Localização | Funcionalidade |
|------------|-------------|----------------|
| `PerformanceChart` | `src/components/dashboard/PerformanceChart.tsx` | Gráfico de desempenho por disciplina |
| `HistoricoSimulados` | `src/components/dashboard/HistoricoSimulados.tsx` | Histórico de simulados realizados |
| `QuestoesRespondidas` | `src/components/dashboard/QuestoesRespondidas.tsx` | Estatísticas de questões |
| `MetasGamificacao` | `src/components/dashboard/MetasGamificacao.tsx` | Sistema de XP, níveis e conquistas |
| `ChoqueParetoAlert` | `src/components/dashboard/ChoqueParetoAlert.tsx` | Alerta quando não segue Pareto |
| `ProgressoPareto` | `src/components/dashboard/ProgressoPareto.tsx` | Progresso nas disciplinas prioritárias |
| `EvolucaoParetoChart` | `src/components/dashboard/EvolucaoParetoChart.tsx` | Evolução temporal do Pareto |
| `RecomendacoesIA` | `src/components/dashboard/RecomendacoesIA.tsx` | Recomendações da IA |

### 2.4 Componentes de Questões

| Componente | Localização | Funcionalidade |
|------------|-------------|----------------|
| `MultipleQuestionUpload` | `src/components/questoes/MultipleQuestionUpload.tsx` | Upload de múltiplas questões via arquivo |
| `ImageUpload` | `src/components/questoes/ImageUpload.tsx` | Upload de imagens para questões |
| `QuestionUploadFill` | `src/components/questoes/QuestionUploadFill.tsx` | Formulário de preenchimento de questões |
| `UploadQuestoes` | `src/components/questoes/UploadQuestoes.tsx` | Interface de upload de arquivos |

### 2.5 Componentes de Simulado

| Componente | Localização | Funcionalidade |
|------------|-------------|----------------|
| `SimuladoTimer` | `src/components/simulado/SimuladoTimer.tsx` | Cronômetro do simulado |

### 2.6 Componentes do Especialista (Chat IA)

| Componente | Localização | Funcionalidade |
|------------|-------------|----------------|
| `ChatMessage` | `src/components/especialista/ChatMessage.tsx` | Mensagem individual do chat |
| `ChatInput` | `src/components/especialista/ChatInput.tsx` | Campo de entrada de mensagens |
| `SessionsList` | `src/components/especialista/SessionsList.tsx` | Lista de sessões de chat |
| `DocumentsList` | `src/components/especialista/DocumentsList.tsx` | Documentos gerados pela IA |

### 2.7 Componentes de Notificações

| Componente | Localização | Funcionalidade |
|------------|-------------|----------------|
| `NotificationsPopover` | `src/components/notifications/NotificationsPopover.tsx` | Popover de notificações para alunos |
| `AdminNotifications` | `src/components/admin/AdminNotifications.tsx` | Popover de notificações para admins |

### 2.8 Componentes Admin

| Componente | Localização | Funcionalidade |
|------------|-------------|----------------|
| `AdminPerformanceChart` | `src/components/admin/AdminPerformanceChart.tsx` | Gráficos de performance global |
| `AdminHistoricoSimulados` | `src/components/admin/AdminHistoricoSimulados.tsx` | Histórico de todos os simulados |
| `AdminQuestoesRespondidas` | `src/components/admin/AdminQuestoesRespondidas.tsx` | Estatísticas globais de questões |
| `AdminUploadQuestoes` | `src/components/admin/AdminUploadQuestoes.tsx` | Upload administrativo |
| `UsersTable` | `src/components/admin/users/UsersTable.tsx` | Tabela de usuários |
| `InviteManagement` | `src/components/admin/users/InviteManagement.tsx` | Gestão de convites |

---

## 3. ELEMENTOS INTERATIVOS (BOTÕES E AÇÕES)

### 3.1 Autenticação (`/auth`)

| Elemento | Ação | Validações | API Chamada |
|----------|------|------------|-------------|
| Botão "Entrar" | Login do usuário | Email válido, senha ≥6 chars | `supabase.auth.signInWithPassword()` |
| Botão "Criar Conta" | Cadastro com convite | Token válido, email correspondente | `supabase.rpc('validate_invite_token')` + `supabase.auth.signUp()` |

### 3.2 Dashboard (`/dashboard`)

| Elemento | Ação | API Chamada |
|----------|------|-------------|
| Cards de estatísticas | Navegação para seções | Redirecionamento local |
| Botão "Novo Simulado" | Criar simulado | Navega para `/simulados` |
| Conquistas | Notificação ao desbloquear | `NotificationService.conquistaDesbloqueada()` |

### 3.3 Simulados (`/simulados`)

| Elemento | Ação | Validações | API Chamada |
|----------|------|------------|-------------|
| Botão "Iniciar Simulado" | Gerar simulado | Seleção de parâmetros | `supabase.functions.invoke('generate-simulation')` |
| Seletor de Disciplina | Filtrar por disciplina | - | Estado local |
| Seletor de Quantidade | Definir nº questões | 1-60 questões | Estado local |

### 3.4 Realizar Simulado (`/simulado/realizar`)

| Elemento | Ação | API Chamada |
|----------|------|-------------|
| Alternativas A-E | Selecionar resposta | `supabase.functions.invoke('record-answer')` |
| Botão "Próxima" | Avançar questão | Estado local |
| Botão "Finalizar" | Encerrar simulado | `supabase.functions.invoke('finish-simulation')` |
| Timer | Contagem regressiva | Alerta ao expirar |

### 3.5 Questões (`/questoes`)

| Elemento | Ação | API Chamada |
|----------|------|-------------|
| Botão "Nova Questão" | Navegar para cadastro | - |
| Filtros de disciplina/tema | Filtrar listagem | Query Supabase |
| Cards de questões | Visualizar detalhes | - |

### 3.6 Nova Questão (`/questoes/nova`)

| Elemento | Ação | Validações | API Chamada |
|----------|------|------------|-------------|
| Upload de arquivo | Extrair questões | TXT, DOC, DOCX ≤50 questões | `supabase.functions.invoke('extract-questions')` |
| Formulário manual | Cadastrar questão | Campos obrigatórios | `supabase.from('questoes').insert()` |
| Botão "Salvar" | Persistir questões | status_validacao: 'pendente' | Insert batch |

### 3.7 Admin - Usuários (`/admin/usuarios`)

| Elemento | Ação | API Chamada |
|----------|------|-------------|
| Botão "Novo Convite" | Gerar convite | `supabase.from('invites').insert()` |
| Botão "Bloquear" | Alterar status | `supabase.from('profiles').update()` |
| Tabela de usuários | Listagem paginada | `supabase.from('profiles').select()` |

### 3.8 Admin - Questões (`/admin/questoes`)

| Elemento | Ação | API Chamada |
|----------|------|-------------|
| Botão "Validar" | Aprovar questão | `supabase.from('questoes').update({ status_validacao: 'valida' })` |
| Botão "Rejeitar" | Rejeitar questão | `supabase.from('questoes').update({ status_validacao: 'invalida' })` |
| Botão "Editar" | Abrir modal edição | - |
| Botão "Excluir" | Remover questão | `supabase.from('questoes').delete()` |

---

## 4. BANCO DE DADOS

### 4.1 Diagrama de Relacionamentos

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   auth.users    │────▶│    profiles     │     │   user_roles    │
│  (Supabase)     │     │                 │◀────│                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    simulados    │────▶│simulado_questoes│◀────│     questoes    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                               │
        │                                               │
        ▼                                               ▼
┌─────────────────┐                           ┌─────────────────┐
│    respostas    │                           │   disciplinas   │
│                 │                           │                 │
└─────────────────┘                           └─────────────────┘
```

### 4.2 Tabelas Principais

#### **profiles**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | UUID | Sim (PK) | ID do usuário (referência auth.users) |
| nome | TEXT | Sim | Nome completo |
| email | TEXT | Sim | Email do usuário |
| avatar_url | TEXT | Não | URL do avatar |
| status | TEXT | Sim | 'ativo' ou 'bloqueado' |
| created_at | TIMESTAMPTZ | Sim | Data de criação |
| updated_at | TIMESTAMPTZ | Sim | Última atualização |

**RLS Policies:**
- Usuários podem ver/editar apenas seu próprio perfil
- Admins podem ver todos os perfis

#### **user_roles**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | UUID | Sim (PK) | ID do registro |
| user_id | UUID | Sim | ID do usuário |
| role | app_role | Sim | 'admin' ou 'user' |

**RLS Policies:**
- Usuários podem ver suas próprias roles
- Admins podem gerenciar todas as roles

#### **disciplinas**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | UUID | Sim (PK) | ID da disciplina |
| nome | TEXT | Sim | Nome da disciplina |
| grupo_prioridade | ENUM | Não | 'grupo1' ou 'grupo2' |
| peso_estatistico | NUMERIC | Não | Peso para cálculos |
| created_at | TIMESTAMPTZ | Sim | Data de criação |

**RLS Policies:**
- Usuários autenticados podem visualizar
- Admins podem gerenciar

#### **questoes**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | UUID | Sim (PK) | ID da questão |
| disciplina_id | UUID | Não (FK) | Referência à disciplina |
| enunciado | TEXT | Sim | Texto da questão |
| alternativa_a | TEXT | Sim | Alternativa A |
| alternativa_b | TEXT | Sim | Alternativa B |
| alternativa_c | TEXT | Sim | Alternativa C |
| alternativa_d | TEXT | Sim | Alternativa D |
| alternativa_e | TEXT | Sim | Alternativa E |
| resposta_correta | TEXT | Sim | A, B, C, D ou E |
| nivel | ENUM | Não | 'facil', 'medio', 'dificil' |
| tema | TEXT | Sim | Tema principal |
| subtema | TEXT | Não | Subtema |
| banca | TEXT | Não | Banca examinadora |
| explicacao | TEXT | Não | Explicação da resposta |
| status_validacao | TEXT | Não | 'pendente', 'valida', 'invalida' |
| score_qualidade | INTEGER | Não | Score 0-100 |
| origem | ENUM | Não | 'MANUAL', 'PDF_IMPORTADO', etc. |
| created_by | UUID | Não | Quem criou a questão |
| created_at | TIMESTAMPTZ | Sim | Data de criação |

**RLS Policies:**
- Usuários veem apenas questões válidas ou suas próprias
- Admins podem ver e gerenciar todas

#### **simulados**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | UUID | Sim (PK) | ID do simulado |
| user_id | UUID | Sim | ID do usuário |
| titulo | TEXT | Sim | Título do simulado |
| tipo | TEXT | Não | 'pratica', 'tematico', 'completo' |
| status | ENUM | Não | 'em_andamento', 'finalizado' |
| total_questoes | INTEGER | Não | Total de questões |
| acertos | INTEGER | Não | Quantidade de acertos |
| pontuacao | INTEGER | Não | Pontuação final |
| data_inicio | TIMESTAMPTZ | Não | Início do simulado |
| data_fim | TIMESTAMPTZ | Não | Fim do simulado |
| tempo_gasto | INTEGER | Não | Tempo em segundos |

**RLS Policies:**
- Usuários podem ver/gerenciar apenas seus simulados

#### **simulado_questoes**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | UUID | Sim (PK) | ID do registro |
| simulado_id | UUID | Sim (FK) | Referência ao simulado |
| questao_id | UUID | Sim (FK) | Referência à questão |
| ordem | INTEGER | Sim | Ordem da questão |
| respondida | BOOLEAN | Não | Se foi respondida |

#### **respostas**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | UUID | Sim (PK) | ID da resposta |
| user_id | UUID | Sim | ID do usuário |
| simulado_id | UUID | Não (FK) | Referência ao simulado |
| questao_id | UUID | Não (FK) | Referência à questão |
| resposta_usuario | TEXT | Não | Resposta selecionada |
| esta_correta | BOOLEAN | Sim | Se acertou |
| tempo_resposta | INTEGER | Não | Tempo para responder |
| created_at | TIMESTAMPTZ | Sim | Data da resposta |

#### **invites**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | UUID | Sim (PK) | ID do convite |
| email | TEXT | Sim | Email do convidado |
| token | TEXT | Sim | Token único |
| role | app_role | Não | Role a atribuir |
| invited_by | UUID | Não | Quem convidou |
| expires_at | TIMESTAMPTZ | Não | Expiração (24h) |
| used_at | TIMESTAMPTZ | Não | Quando foi usado |
| created_at | TIMESTAMPTZ | Sim | Data de criação |

**RLS Policies:**
- Apenas admins podem gerenciar convites

#### **admin_notifications**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | UUID | Sim (PK) | ID da notificação |
| user_id | UUID | Não | Destinatário (null = admin) |
| type | TEXT | Sim | Tipo da notificação |
| title | TEXT | Sim | Título |
| message | TEXT | Sim | Mensagem |
| severity | TEXT | Não | 'info', 'success', 'warning', 'error' |
| read | BOOLEAN | Não | Se foi lida |
| action_url | TEXT | Não | URL de ação |
| created_at | TIMESTAMPTZ | Sim | Data de criação |

#### **performance**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | UUID | Sim (PK) | ID do registro |
| user_id | UUID | Sim | ID do usuário |
| disciplina_id | UUID | Não (FK) | Referência à disciplina |
| total_questoes | INTEGER | Não | Total respondidas |
| total_acertos | INTEGER | Não | Total de acertos |
| taxa_acerto | NUMERIC | Não | Percentual de acerto |
| temas_fortes | ARRAY | Não | Lista de temas fortes |
| temas_fracos | ARRAY | Não | Lista de temas fracos |
| ultima_atividade | TIMESTAMPTZ | Não | Última atividade |

### 4.3 Tabelas de IA

#### **ai_agent_sessions**
Sessões de chat com o Especialista de Estudos

#### **ai_agent_messages**
Mensagens das sessões de chat

#### **ai_agent_documents**
Documentos gerados pela IA

#### **ai_response_cache**
Cache de respostas da IA (TTL: 7 dias)

#### **ai_engine_logs**
Logs de uso dos motores de IA

#### **ai_engine_metrics**
Métricas de performance dos motores

### 4.4 Outras Tabelas

| Tabela | Propósito |
|--------|-----------|
| `erros_analise` | Registro de erros para análise de pontos fracos |
| `system_config` | Configurações do sistema |
| `admin_logs` | Logs de ações administrativas |
| `arquivos_importados` | Arquivos enviados para extração |
| `notificacoes` | Tabela legada (não utilizada) |

---

## 5. INTEGRAÇÕES E APIs

### 5.1 Edge Functions (Supabase)

| Função | Endpoint | Método | Propósito |
|--------|----------|--------|-----------|
| `unified-ai-engine` | `/functions/v1/unified-ai-engine` | POST | Motor unificado de IA |
| `generate-simulation` | `/functions/v1/generate-simulation` | POST | Gerar simulado |
| `record-answer` | `/functions/v1/record-answer` | POST | Registrar resposta |
| `finish-simulation` | `/functions/v1/finish-simulation` | POST | Finalizar simulado |
| `extract-questions` | `/functions/v1/extract-questions` | POST | Extrair questões de texto |
| `process-upload` | `/functions/v1/process-upload` | POST | Processar arquivo uploadado |
| `parse-document` | `/functions/v1/parse-document` | POST | Parsear documento |
| `ai-agent-chat` | `/functions/v1/ai-agent-chat` | POST | Chat com especialista |
| `generate-gemini` | `/functions/v1/generate-gemini` | POST | Geração via Gemini |

### 5.2 Motores de IA

#### **Lovable AI Gateway**
```
URL: https://ai.gateway.lovable.dev/v1/chat/completions
Model: google/gemini-2.5-flash
Auth: Bearer LOVABLE_API_KEY
Max Tokens: 8192
```

#### **Google Gemini**
```
URL: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
Model: gemini-2.0-flash
Auth: API Key (GOOGLE_GEMINI_API_KEY)
Max Tokens: 8192
```

### 5.3 Sistema de Fallback

1. Tenta motor preferido (configurável no `system_config`)
2. Se falhar, usa fallback automático
3. Resultados são cacheados por 7 dias
4. Métricas são registradas em `ai_engine_metrics`

---

## 6. GERENCIAMENTO DE ESTADO

### 6.1 Context APIs

| Context | Arquivo | Dados Gerenciados |
|---------|---------|-------------------|
| `AuthContext` | `src/hooks/useAuth.tsx` | user, session, profile, role, isAdmin |

### 6.2 Custom Hooks

| Hook | Arquivo | Propósito |
|------|---------|-----------|
| `useAuth` | `src/hooks/useAuth.tsx` | Autenticação e dados do usuário |
| `useNotifications` | `src/hooks/useNotifications.ts` | Notificações em tempo real |
| `useAIAgent` | `src/hooks/useAIAgent.ts` | Interação com IA |
| `useMobile` | `src/hooks/use-mobile.tsx` | Detecção de dispositivo móvel |
| `useToast` | `src/hooks/use-toast.ts` | Sistema de toasts |

### 6.3 Estado Local

- **React Query**: Cache e sincronização de dados server-side
- **useState**: Estados de formulários e UI
- **useRef**: Valores persistentes sem re-render (ex: deduplicação de notificações)

### 6.4 Persistência

| Tipo | Uso |
|------|-----|
| Supabase Auth | Sessão do usuário (tokens JWT) |
| LocalStorage | Tema (dark/light mode) via next-themes |

---

## 7. AUTENTICAÇÃO E AUTORIZAÇÃO

### 7.1 Sistema de Autenticação

- **Provider**: Supabase Auth
- **Método**: Email + Senha
- **Confirmação**: Auto-confirm habilitado (desenvolvimento)
- **Requisito**: Token de convite para cadastro

### 7.2 Tipos de Usuários (Roles)

| Role | Enum | Permissões |
|------|------|------------|
| `user` | `app_role` | Acesso a simulados, questões, dashboard |
| `admin` | `app_role` | Tudo + gestão de usuários, questões, sistema |

### 7.3 Fluxo de Login

```
1. Usuário acessa /auth
2. Preenche email e senha
3. supabase.auth.signInWithPassword()
4. onAuthStateChange dispara
5. fetchUserData() busca profile e role
6. Redirecionamento para /dashboard
```

### 7.4 Fluxo de Cadastro

```
1. Admin gera convite em /admin/usuarios
2. Convite tem token, email e role
3. Usuário acessa /auth com token
4. Valida token via RPC validate_invite_token()
5. supabase.auth.signUp() com metadata
6. Trigger handle_new_user():
   - Cria profile
   - Atribui role do convite
   - Marca convite como usado
```

### 7.5 Proteção de Rotas

```tsx
<ProtectedRoute requireAdmin={false}>
  // Rota para usuários logados
</ProtectedRoute>

<ProtectedRoute requireAdmin={true}>
  // Rota apenas para admins
</ProtectedRoute>
```

---

## 8. CONFIGURAÇÕES E VARIÁVEIS DE AMBIENTE

### 8.1 Variáveis de Ambiente (.env)

| Variável | Descrição | Gerada por |
|----------|-----------|------------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase | Automático |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública (anon) | Automático |
| `VITE_SUPABASE_PROJECT_ID` | ID do projeto | Automático |

### 8.2 Secrets (Edge Functions)

| Secret | Descrição |
|--------|-----------|
| `SUPABASE_URL` | URL interna do Supabase |
| `SUPABASE_ANON_KEY` | Chave anônima |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (admin) |
| `SUPABASE_DB_URL` | URL do banco de dados |
| `LOVABLE_API_KEY` | API Key do Lovable AI Gateway |
| `GOOGLE_GEMINI_API_KEY` | API Key do Google Gemini |

### 8.3 Configurações do Sistema (system_config)

| Chave | Descrição |
|-------|-----------|
| `ai_motor_preferido` | Motor de IA preferido |
| `tempo_padrao_simulado` | Tempo padrão em minutos |
| `max_questoes_simulado` | Máximo de questões |

### 8.4 Dependências Principais

```json
{
  "@supabase/supabase-js": "^2.89.0",
  "@tanstack/react-query": "^5.83.0",
  "react": "^18.3.1",
  "react-router-dom": "^6.30.1",
  "recharts": "^2.15.4",
  "zod": "^3.25.76",
  "sonner": "^1.7.4",
  "lucide-react": "^0.462.0",
  "react-markdown": "^10.1.0"
}
```

---

## 9. FLUXOS DE DADOS

### 9.1 Fluxo: Criar Simulado

```
┌─────────────────┐
│    Usuário      │
│ seleciona tipo  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ generate-       │
│ simulation      │
│ (Edge Function) │
└────────┬────────┘
         │
         ├───────────────────────────────┐
         │                               │
         ▼                               ▼
┌─────────────────┐             ┌─────────────────┐
│    questoes     │             │ unified-ai-     │
│    (SELECT)     │             │ engine (se <n)  │
└────────┬────────┘             └────────┬────────┘
         │                               │
         └───────────────┬───────────────┘
                         │
                         ▼
                ┌─────────────────┐
                │   simulados     │
                │   (INSERT)      │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │simulado_questoes│
                │   (INSERT)      │
                └─────────────────┘
```

### 9.2 Fluxo: Responder Questão

```
┌─────────────────┐
│ Usuário clica   │
│ alternativa     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ record-answer   │
│ (Edge Function) │
└────────┬────────┘
         │
         ├──────────────────────────────────┐
         │                                  │
         ▼                                  ▼
┌─────────────────┐                ┌─────────────────┐
│   respostas     │                │  erros_analise  │
│ (INSERT/UPDATE) │                │ (INSERT se err) │
└────────┬────────┘                └─────────────────┘
         │
         ▼
┌─────────────────┐
│   Retorna:      │
│ esta_correta,   │
│ resposta_correta│
└─────────────────┘
```

### 9.3 Fluxo: Finalizar Simulado

```
┌─────────────────┐
│  finish-        │
│  simulation     │
└────────┬────────┘
         │
         ├──────────────────────────────────┐
         │                                  │
         ▼                                  ▼
┌─────────────────┐                ┌─────────────────┐
│   simulados     │                │   performance   │
│   (UPDATE)      │                │   (UPSERT)      │
└────────┬────────┘                └─────────────────┘
         │
         ▼
┌─────────────────┐
│admin_notifications│
│   (INSERT)        │
└───────────────────┘
```

---

## 10. ESTRUTURA DE ARQUIVOS

```
bancario-agil/
├── public/
│   ├── images/
│   │   └── background.jpg
│   ├── favicon.ico
│   ├── placeholder.svg
│   └── robots.txt
│
├── src/
│   ├── assets/
│   │   └── hero-bg.jpg
│   │
│   ├── components/
│   │   ├── admin/
│   │   │   ├── users/
│   │   │   │   ├── InviteManagement.tsx
│   │   │   │   └── UsersTable.tsx
│   │   │   ├── AdminHistoricoSimulados.tsx
│   │   │   ├── AdminNotifications.tsx
│   │   │   ├── AdminPerformanceChart.tsx
│   │   │   ├── AdminQuestoesRespondidas.tsx
│   │   │   └── AdminUploadQuestoes.tsx
│   │   │
│   │   ├── auth/
│   │   │   └── ProtectedRoute.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── ChoqueParetoAlert.tsx
│   │   │   ├── EvolucaoParetoChart.tsx
│   │   │   ├── HistoricoSimulados.tsx
│   │   │   ├── MetasGamificacao.tsx
│   │   │   ├── PerformanceChart.tsx
│   │   │   ├── ProgressoPareto.tsx
│   │   │   ├── QuestoesRespondidas.tsx
│   │   │   └── RecomendacoesIA.tsx
│   │   │
│   │   ├── especialista/
│   │   │   ├── ChatInput.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── DocumentsList.tsx
│   │   │   └── SessionsList.tsx
│   │   │
│   │   ├── home/
│   │   │   ├── CTASection.tsx
│   │   │   ├── DisciplinesSection.tsx
│   │   │   ├── FeaturesSection.tsx
│   │   │   └── HeroSection.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── Footer.tsx
│   │   │   └── Header.tsx
│   │   │
│   │   ├── notifications/
│   │   │   └── NotificationsPopover.tsx
│   │   │
│   │   ├── questoes/
│   │   │   ├── ImageUpload.tsx
│   │   │   ├── MultipleQuestionUpload.tsx
│   │   │   ├── QuestionUploadFill.tsx
│   │   │   └── UploadQuestoes.tsx
│   │   │
│   │   ├── simulado/
│   │   │   └── SimuladoTimer.tsx
│   │   │
│   │   ├── ui/
│   │   │   └── [45+ componentes shadcn/ui]
│   │   │
│   │   └── NavLink.tsx
│   │
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   ├── use-toast.ts
│   │   ├── useAIAgent.ts
│   │   ├── useAuth.tsx
│   │   └── useNotifications.ts
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts (auto-gerado)
│   │       └── types.ts (auto-gerado)
│   │
│   ├── lib/
│   │   └── utils.ts
│   │
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── AdminConfiguracoes.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AdminEstatisticas.tsx
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── AdminLogs.tsx
│   │   │   ├── AdminModulos.tsx
│   │   │   ├── AdminNovaQuestao.tsx
│   │   │   ├── AdminQuestoes.tsx
│   │   │   ├── AdminUpload.tsx
│   │   │   └── AdminUsers.tsx
│   │   │
│   │   ├── Auth.tsx
│   │   ├── Dashboard.tsx
│   │   ├── EspecialistaDeEstudos.tsx
│   │   ├── Index.tsx
│   │   ├── NotFound.tsx
│   │   ├── NovaQuestao.tsx
│   │   ├── Questoes.tsx
│   │   ├── RealizarSimulado.tsx
│   │   ├── ResultadoSimulado.tsx
│   │   └── Simulados.tsx
│   │
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
│
├── supabase/
│   ├── functions/
│   │   ├── ai-agent-chat/
│   │   │   └── index.ts
│   │   ├── extract-questions/
│   │   │   └── index.ts
│   │   ├── finish-simulation/
│   │   │   └── index.ts
│   │   ├── generate-gemini/
│   │   │   └── index.ts
│   │   ├── generate-simulation/
│   │   │   └── index.ts
│   │   ├── parse-document/
│   │   │   └── index.ts
│   │   ├── process-upload/
│   │   │   └── index.ts
│   │   ├── record-answer/
│   │   │   └── index.ts
│   │   └── unified-ai-engine/
│   │       └── index.ts
│   │
│   ├── migrations/
│   │   └── [migrations SQL]
│   │
│   └── config.toml
│
├── .env
├── eslint.config.js
├── index.html
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

---

## 11. ANÁLISE E RECOMENDAÇÕES

### 11.1 ✅ Pontos Positivos

1. **Arquitetura bem organizada** - Separação clara de componentes, hooks e páginas
2. **RLS bem implementado** - Políticas de segurança em todas as tabelas
3. **Sistema de IA resiliente** - Fallback automático entre motores
4. **Cache de IA** - Reduz custos e latência
5. **Sistema de notificações** - Com deduplicação e tempo real
6. **Validação de inputs** - Zod em todos os edge functions

### 11.2 ⚠️ Pontos de Atenção

#### Segurança
1. **[BAIXO]** Tabela `notificacoes` está sem uso - pode ser removida
2. **[OK]** RLS está corretamente configurado em todas as tabelas

#### Performance
1. **[MÉDIO]** `MetasGamificacao.tsx` faz múltiplas queries sequenciais
   - **Recomendação**: Consolidar em uma única query ou RPC
2. **[BAIXO]** Componentes de gráficos podem ser lazy-loaded

#### Código
1. **[RESOLVIDO]** Sistema de notificações tinha duplicação - corrigido
2. **[OK]** Sem dependências não utilizadas significativas

### 11.3 🔧 Melhorias Sugeridas

1. **Notificações para Admin**
   - Implementar notificação quando novo usuário se cadastrar
   - Notificar quando questões pendentes aguardam validação

2. **Limpeza de Dados**
   - Criar job para limpar cache de IA expirado
   - Limpar notificações antigas (>30 dias)

3. **Monitoramento**
   - Dashboard de saúde dos motores de IA
   - Alertas quando motor estiver com muitas falhas

4. **UX**
   - Implementar skeleton loading em mais componentes
   - Adicionar feedback visual ao marcar notificação como lida

---

## 📊 RESUMO EXECUTIVO

| Métrica | Valor |
|---------|-------|
| Total de Páginas | 17 |
| Rotas Públicas | 2 |
| Rotas Protegidas (Aluno) | 7 |
| Rotas Admin | 9 |
| Componentes Customizados | 45+ |
| Componentes UI (shadcn) | 45+ |
| Edge Functions | 9 |
| Tabelas no Banco | 18 |
| Hooks Customizados | 5 |
| Políticas RLS | 50+ |

---

*Relatório gerado automaticamente pelo sistema Lovable*
