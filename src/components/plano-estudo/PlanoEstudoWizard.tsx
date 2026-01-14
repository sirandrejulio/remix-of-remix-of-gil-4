import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { StepDisponibilidade } from "./steps/StepDisponibilidade";
import { StepConcurso } from "./steps/StepConcurso";
import { StepCargo } from "./steps/StepCargo";
import { StepGerarPlano } from "./steps/StepGerarPlano";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface PlanoEstudoWizardProps {
  onComplete: (data: any) => void;
  onCancel?: () => void;
  existingPlan?: any;
}

export interface PlanoFormData {
  disponibilidade: {
    [dia: string]: string[];
  };
  horasSemanaisTotal: number;
  concurso: string;
  concursoOutro?: string;
  nivelCargo: string;
}

const STEPS = [
  { id: 1, title: "Disponibilidade", description: "Configure seus horários de estudo" },
  { id: 2, title: "Concurso", description: "Selecione seu objetivo" },
  { id: 3, title: "Cargo", description: "Escolha o nível do cargo" },
  { id: 4, title: "Gerar Plano", description: "Plano personalizado com IA" },
];

export function PlanoEstudoWizard({ onComplete, onCancel, existingPlan }: PlanoEstudoWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState<PlanoFormData>({
    disponibilidade: {},
    horasSemanaisTotal: 0,
    concurso: "",
    nivelCargo: "",
  });

  const updateFormData = (data: Partial<PlanoFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.horasSemanaisTotal > 0;
      case 2:
        return formData.concurso !== "" && (formData.concurso !== "outro" || formData.concursoOutro);
      case 3:
        return formData.nivelCargo !== "";
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleGeneratePlan = async () => {
    if (!user) return;

    setIsGenerating(true);
    try {
      // Save plan data to database
      const { data: savedPlan, error: saveError } = await supabase
        .from('planos_estudo')
        .upsert({
          user_id: user.id,
          disponibilidade: formData.disponibilidade,
          horas_semanais_total: formData.horasSemanaisTotal,
          concurso: formData.concurso === "outro" ? formData.concursoOutro || "Outro" : formData.concurso,
          concurso_outro: formData.concurso === "outro" ? formData.concursoOutro : null,
          nivel_cargo: formData.nivelCargo,
          plano_status: 'gerando',
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (saveError) throw saveError;

      // Call AI to generate the plan
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('ai-agent-chat', {
        body: {
          message: `Gere um plano de estudos personalizado para o concurso ${formData.concurso === "outro" ? formData.concursoOutro : formData.concurso} no nível ${formData.nivelCargo}. O aluno tem ${formData.horasSemanaisTotal} horas semanais disponíveis para estudar, distribuídas da seguinte forma: ${JSON.stringify(formData.disponibilidade)}. Aplique rigorosamente a Lei de Pareto 80/20, priorizando as disciplinas do Grupo 1 (Informática, Vendas e Negociação, Língua Portuguesa, Conhecimentos Bancários) que representam 75% da nota. Crie um cronograma semanal detalhado com: 1) Distribuição de horas por disciplina, 2) Ordem de prioridade, 3) Metas semanais, 4) Técnicas de estudo recomendadas. Retorne o plano em formato estruturado JSON.`,
          action: 'generate_study_plan',
          context: { 
            concurso: formData.concurso,
            nivelCargo: formData.nivelCargo,
            horasSemanais: formData.horasSemanaisTotal,
            disponibilidade: formData.disponibilidade
          }
        }
      });

      if (aiError) throw aiError;

      // Parse AI response and update plan
      let planoGerado = null;
      try {
        // Try to extract JSON from the response
        const content = aiResponse?.content || aiResponse?.response || '';
        const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          planoGerado = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          planoGerado = { texto: content };
        }
      } catch {
        planoGerado = { texto: aiResponse?.content || aiResponse?.response || 'Plano gerado com sucesso' };
      }

      // Update plan with AI response
      const { data: updatedPlan, error: updateError } = await supabase
        .from('planos_estudo')
        .update({
          plano_gerado: planoGerado,
          plano_status: 'ativo',
        })
        .eq('id', savedPlan.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update profile to mark plan as created
      await supabase
        .from('profiles')
        .update({ plano_criado: true })
        .eq('id', user.id);

      toast.success('Plano de estudos criado com sucesso!');
      onComplete(updatedPlan);

    } catch (error) {
      console.error('Error generating plan:', error);
      toast.error('Erro ao gerar o plano. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg shadow-primary/25">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
              Criar Plano de Estudos
            </h1>
            <p className="text-muted-foreground">
              Configure seu plano personalizado com IA
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            Etapa {currentStep} de {STEPS.length}
          </span>
          <span className="text-sm font-medium text-foreground">
            {STEPS[currentStep - 1].title}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`flex-1 text-center text-xs ${
                step.id === currentStep
                  ? "text-primary font-medium"
                  : step.id < currentStep
                  ? "text-muted-foreground"
                  : "text-muted-foreground/50"
              }`}
            >
              <div
                className={`w-8 h-8 mx-auto mb-1 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.id === currentStep
                    ? "bg-primary text-primary-foreground"
                    : step.id < currentStep
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step.id}
              </div>
              <span className="hidden sm:block">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-violet-500/20 overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">{STEPS[currentStep - 1].title}</CardTitle>
          <p className="text-sm text-muted-foreground">{STEPS[currentStep - 1].description}</p>
        </CardHeader>
        <CardContent className="pb-8">
          {currentStep === 1 && (
            <StepDisponibilidade formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 2 && (
            <StepConcurso formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 3 && (
            <StepCargo formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 4 && (
            <StepGerarPlano formData={formData} isGenerating={isGenerating} />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? onCancel : handleBack}
          disabled={isGenerating}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {currentStep === 1 ? 'Voltar' : 'Anterior'}
        </Button>

        {currentStep < STEPS.length ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="gap-2 bg-violet-500 hover:bg-violet-600"
          >
            Continuar
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleGeneratePlan}
            disabled={isGenerating}
            className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando Plano...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Gerar Plano com IA
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
