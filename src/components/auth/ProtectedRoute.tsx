import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isAdmin, isLoading, isRoleLoading } = useAuth();
  const location = useLocation();
  const [checkingPlan, setCheckingPlan] = useState(true);
  const [hasPlan, setHasPlan] = useState(true);

  useEffect(() => {
    const checkStudyPlan = async () => {
      if (!user || requireAdmin || location.pathname === '/plano-de-estudo') {
        setCheckingPlan(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('profiles')
          .select('plano_criado')
          .eq('id', user.id)
          .single();

        setHasPlan(data?.plano_criado ?? false);
      } catch {
        setHasPlan(true);
      } finally {
        setCheckingPlan(false);
      }
    };

    if (user && !isRoleLoading) {
      checkStudyPlan();
    } else if (!user && !isLoading) {
      setCheckingPlan(false);
    }
  }, [user, isRoleLoading, isLoading, requireAdmin, location.pathname]);

  if (isLoading || (user && isRoleLoading) || (user && checkingPlan)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Redirect to study plan creation if user hasn't created one
  if (!hasPlan && !requireAdmin && location.pathname !== '/plano-de-estudo') {
    return <Navigate to="/plano-de-estudo" replace />;
  }

  return <>{children}</>;
}
