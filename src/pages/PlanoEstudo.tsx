import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { DottedSurface } from "@/components/ui/dotted-surface";
import { PlanoEstudoWizard } from "@/components/plano-estudo/PlanoEstudoWizard";
import { PlanoEstudoDashboard } from "@/components/plano-estudo/PlanoEstudoDashboard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function PlanoEstudo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasPlano, setHasPlano] = useState(false);
  const [planoData, setPlanoData] = useState<any>(null);

  useEffect(() => {
    const checkPlano = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('planos_estudo')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data && data.plano_status !== 'pendente') {
          setHasPlano(true);
          setPlanoData(data);
        }
      } catch (error) {
        console.error('Error checking plano:', error);
      } finally {
        setLoading(false);
      }
    };

    checkPlano();
  }, [user]);

  const handlePlanCreated = (data: any) => {
    setPlanoData(data);
    setHasPlano(true);
  };

  if (loading) {
    return (
      <>
        <DottedSurface />
        <div className="min-h-screen flex flex-col w-full relative">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Carregando seu plano de estudos...</p>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <DottedSurface />
      <div className="min-h-screen flex flex-col w-full relative">
        <Header />
        <main className="flex-1 container py-6 lg:py-8">
          {hasPlano ? (
            <PlanoEstudoDashboard planoData={planoData} onEdit={() => setHasPlano(false)} />
          ) : (
            <PlanoEstudoWizard onComplete={handlePlanCreated} />
          )}
        </main>
      </div>
    </>
  );
}
