import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlanoFormData } from "../PlanoEstudoWizard";

interface StepCargoProps {
  formData: PlanoFormData;
  updateFormData: (data: Partial<PlanoFormData>) => void;
}

const NIVEIS = [
  {
    id: "medio",
    nome: "Nível Médio",
    descricao: "Cargos que exigem ensino médio completo",
    icon: BookOpen,
    exemplos: ["Escriturário", "Técnico Bancário", "Agente de Atendimento"],
    cor: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    id: "superior",
    nome: "Nível Superior",
    descricao: "Cargos que exigem graduação",
    icon: GraduationCap,
    exemplos: ["Analista", "Advogado", "Engenheiro", "Economista"],
    cor: "from-violet-500/20 to-violet-500/5",
  },
];

export function StepCargo({ formData, updateFormData }: StepCargoProps) {
  const handleSelect = (nivelId: string) => {
    updateFormData({ nivelCargo: nivelId });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">Qual cargo você pretende?</h2>
        <p className="text-muted-foreground">Selecione o nível de escolaridade do cargo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {NIVEIS.map(nivel => {
          const Icon = nivel.icon;
          const isSelected = formData.nivelCargo === nivel.id;

          return (
            <Card
              key={nivel.id}
              onClick={() => handleSelect(nivel.id)}
              className={cn(
                "cursor-pointer transition-all duration-300 rounded-xl overflow-hidden",
                isSelected
                  ? "ring-2 ring-violet-500 border-violet-500"
                  : "border-border hover:border-violet-500/50",
                "bg-gradient-to-br",
                nivel.cor
              )}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className={cn(
                    "h-14 w-14 rounded-xl flex items-center justify-center flex-shrink-0",
                    isSelected ? "bg-violet-500" : "bg-muted"
                  )}>
                    <Icon className={cn("h-7 w-7", isSelected ? "text-white" : "text-foreground")} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg text-foreground">{nivel.nome}</h3>
                      <div className={cn(
                        "h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                        isSelected ? "border-violet-500 bg-violet-500" : "border-muted-foreground/30"
                      )}>
                        {isSelected && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{nivel.descricao}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Exemplos de cargos:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {nivel.exemplos.map(exemplo => (
                      <span
                        key={exemplo}
                        className={cn(
                          "px-2 py-1 rounded-md text-xs",
                          isSelected
                            ? "bg-violet-500/20 text-violet-200"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {exemplo}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dica */}
      <p className="text-sm text-muted-foreground text-center">
        💡 O conteúdo programático será adaptado ao nível do cargo selecionado
      </p>
    </div>
  );
}
