import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Public pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Student pages
import Dashboard from "./pages/Dashboard";
import Simulados from "./pages/Simulados";
import RealizarSimulado from "./pages/RealizarSimulado";
import ResultadoSimulado from "./pages/ResultadoSimulado";
import Questoes from "./pages/Questoes";
import NovaQuestao from "./pages/NovaQuestao";
import EspecialistaDeEstudos from "./pages/EspecialistaDeEstudos";
import PlanoEstudo from "./pages/PlanoEstudo";

// Admin pages
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminQuestoes from "./pages/admin/AdminQuestoes";
import AdminNovaQuestao from "./pages/admin/AdminNovaQuestao";
import AdminEstatisticas from "./pages/admin/AdminEstatisticas";
import AdminConfiguracoes from "./pages/admin/AdminConfiguracoes";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminModulos from "./pages/admin/AdminModulos";
import AdminEspecialista from "./pages/admin/AdminEspecialista";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />

            {/* Protected student routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/simulados" element={
              <ProtectedRoute>
                <Simulados />
              </ProtectedRoute>
            } />
            <Route path="/simulado/realizar" element={
              <ProtectedRoute>
                <RealizarSimulado />
              </ProtectedRoute>
            } />
            <Route path="/simulado/resultado" element={
              <ProtectedRoute>
                <ResultadoSimulado />
              </ProtectedRoute>
            } />
            <Route path="/questoes" element={
              <ProtectedRoute>
                <Questoes />
              </ProtectedRoute>
            } />
            <Route path="/questoes/nova" element={
              <ProtectedRoute>
                <NovaQuestao />
              </ProtectedRoute>
            } />
            <Route path="/especialista-de-estudos" element={
              <ProtectedRoute>
                <EspecialistaDeEstudos />
              </ProtectedRoute>
            } />
            <Route path="/plano-de-estudo" element={
              <ProtectedRoute>
                <PlanoEstudo />
              </ProtectedRoute>
            } />

            {/* Admin routes */}
            <Route path="/admin" element={
              <ProtectedRoute requireAdmin>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="modulos" element={<AdminModulos />} />
              <Route path="usuarios" element={<AdminUsers />} />
              <Route path="questoes" element={<AdminQuestoes />} />
              <Route path="questoes/nova" element={<AdminNovaQuestao />} />
              <Route path="logs" element={<AdminLogs />} />
              <Route path="estatisticas" element={<AdminEstatisticas />} />
              <Route path="configuracoes" element={<AdminConfiguracoes />} />
              <Route path="especialista" element={<AdminEspecialista />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;