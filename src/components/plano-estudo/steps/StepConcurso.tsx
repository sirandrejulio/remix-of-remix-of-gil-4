import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Building2, Landmark, MapPin, CreditCard, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlanoFormData } from "../PlanoEstudoWizard";

interface StepConcursoProps {
  formData: PlanoFormData;
  updateFormData: (data: Partial<PlanoFormData>) => void;
}

const CONCURSOS = [
  {
    id: "banco_brasil",
    nome: "Banco do Brasil",
    descricao: "Maior banco público da América Latina",
    icon: Building2,
    cor: "from-yellow-500/20 to-yellow-500/5",
    borderCor: "border-yellow-500/30",
  },
  {
    id: "caixa",
    nome: "Caixa Econômica Federal",
    descricao: "Principal agente de políticas públicas",
    icon: Landmark,
    cor: "from-blue-500/20 to-blue-500/5",
    borderCor: "border-blue-500/30",
  },
  {
    id: "bnb",
    nome: "Banco do Nordeste",
    descricao: "Maior banco de desenvolvimento regional",
    icon: MapPin,
    cor: "from-red-500/20 to-red-500/5",
    borderCor: "border-red-500/30",
  },
  {
    id: "banrisul",
    nome: "Banrisul",
    descricao: "Banco do estado do Rio Grande do Sul",
    icon: CreditCard,
    cor: "from-green-500/20 to-green-500/5",
    borderCor: "border-green-500/30",
  },
  {
    id: "outro",
    nome: "Outro",
    descricao: "Concurso não listado",
    icon: HelpCircle,
    cor: "from-purple-500/20 to-purple-500/5",
    borderCor: "border-purple-500/30",
  },
];

export function StepConcurso({ formData, updateFormData }: StepConcursoProps) {
  const handleSelect = (concursoId: string) => {
    updateFormData({ concurso: concursoId });
    if (concursoId !== "outro") {
      updateFormData({ concursoOutro: undefined });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">Qual concurso você está mirando?</h2>
        <p className="text-muted-foreground">Selecione o concurso para personalizarmos seu plano</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CONCURSOS.map(concurso => {
          const Icon = concurso.icon;
          const isSelected = formData.concurso === concurso.id;

          return (
            <Card
              key={concurso.id}
              onClick={() => handleSelect(concurso.id)}
              className={cn(
                "cursor-pointer transition-all duration-300 rounded-xl overflow-hidden",
                isSelected
                  ? "ring-2 ring-violet-500 border-violet-500"
                  : "border-border hover:border-violet-500/50",
                "bg-gradient-to-br",
                concurso.cor
              )}
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div className={cn(
                  "h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0",
                  isSelected ? "bg-violet-500" : "bg-muted"
                )}>
                  <Icon className={cn("h-6 w-6", isSelected ? "text-white" : "text-foreground")} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{concurso.nome}</h3>
                  <p className="text-sm text-muted-foreground">{concurso.descricao}</p>
                </div>
                <div className={cn(
                  "h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                  isSelected ? "border-violet-500 bg-violet-500" : "border-muted-foreground/30"
                )}>
                  {isSelected && (
                    <div className="h-2 w-2 rounded-full bg-white" />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Campo para "Outro" */}
      {formData.concurso === "outro" && (
        <div className="animate-fade-in">
          <label className="block text-sm font-medium text-foreground mb-2">
            Qual concurso você está estudando?
          </label>
          <Input
            placeholder="Digite o nome do concurso..."
            value={formData.concursoOutro || ""}
            onChange={(e) => updateFormData({ concursoOutro: e.target.value })}
            className="bg-muted/50"
          />
        </div>
      )}

      {/* Dica */}
      <p className="text-sm text-muted-foreground text-center">
        💡 O plano será personalizado com base no edital e perfil do concurso selecionado
      </p>
    </div>
  );
}
