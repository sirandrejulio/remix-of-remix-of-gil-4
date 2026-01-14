import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { DottedSurface } from "@/components/ui/dotted-surface";
import { PlanoEstudoWizard } from "@/components/plano-estudo/PlanoEstudoWizard";
import { PlanoEstudoDashboard } from "@/components/plano-estudo/PlanoEstudoDashboard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PlanoEstudo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasPlano, setHasPlano] = useState(false);
  const [planoData, setPlanoData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  const fetchPlano = async () => {
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
        setIsEditing(false);
      } else {
        setHasPlano(false);
        setPlanoData(null);
      }
    } catch (error) {
      console.error('Error checking plano:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlano();
  }, [user]);

  const handlePlanCreated = async (data: any) => {
    setPlanoData(data);
    setHasPlano(true);
    setIsEditing(false);
    // Navigate to dashboard after creating plan for the first time
    navigate('/dashboard');
  };

  const handleDeletePlan = async () => {
    if (!user || !planoData) return;

    try {
      const { error } = await supabase
        .from('planos_estudo')
        .delete()
        .eq('id', planoData.id);

      if (error) throw error;

      // Update profile
      await supabase
        .from('profiles')
        .update({ plano_criado: false })
        .eq('id', user.id);

      toast.success('Plano excluído com sucesso!');
      setHasPlano(false);
      setPlanoData(null);
      setIsEditing(false);
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Erro ao excluir o plano.');
    }
  };

  const handleStartNewPlan = () => {
    setIsEditing(true);
    setHasPlano(false);
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleCancelEdit = () => {
    if (planoData) {
      setHasPlano(true);
      setIsEditing(false);
    } else {
      navigate('/dashboard');
    }
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
          {hasPlano && !isEditing ? (
            <PlanoEstudoDashboard 
              planoData={planoData} 
              onEdit={() => setIsEditing(true)}
              onDelete={handleDeletePlan}
              onNewPlan={handleStartNewPlan}
              onBack={handleBackToDashboard}
            />
          ) : (
            <PlanoEstudoWizard 
              onComplete={handlePlanCreated} 
              onCancel={handleCancelEdit}
              existingPlan={planoData}
            />
          )}
        </main>
      </div>
    </>
  );
}
