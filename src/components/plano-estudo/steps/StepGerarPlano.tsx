import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Target, 
  Building2, 
  GraduationCap, 
  Sparkles,
  CheckCircle2,
  Zap,
  BookOpen
} from "lucide-react";
import { PlanoFormData } from "../PlanoEstudoWizard";

interface StepGerarPlanoProps {
  formData: PlanoFormData;
  isGenerating: boolean;
}

const getConcursoNome = (id: string, outro?: string) => {
  const map: Record<string, string> = {
    banco_brasil: "Banco do Brasil",
    caixa: "Caixa Econômica Federal",
    bnb: "Banco do Nordeste",
    banrisul: "Banrisul",
    outro: outro || "Outro",
  };
  return map[id] || id;
};

export function StepGerarPlano({ formData, isGenerating }: StepGerarPlanoProps) {
  const diasComHorarios = Object.entries(formData.disponibilidade).filter(
    ([_, horarios]) => horarios.length > 0
  ).length;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {isGenerating ? "Gerando seu plano personalizado..." : "Revise suas escolhas"}
        </h2>
        <p className="text-muted-foreground">
          {isGenerating 
            ? "Aplicando Lei de Pareto e metodologias de estudo eficiente"
            : "Confirme os dados e clique em gerar para criar seu plano"}
        </p>
      </div>

      {/* Resumo das escolhas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-xl border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-violet-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horas semanais</p>
                <p className="text-xl font-bold text-foreground">{formData.horasSemanaisTotal}h</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Distribuídas em {diasComHorarios} dias da semana
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-violet-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Concurso</p>
                <p className="text-lg font-bold text-foreground">
                  {getConcursoNome(formData.concurso, formData.concursoOutro)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-violet-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nível do cargo</p>
                <p className="text-lg font-bold text-foreground">
                  {formData.nivelCargo === "medio" ? "Nível Médio" : "Nível Superior"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-violet-500/20 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Target className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Meta de acerto</p>
                <p className="text-lg font-bold text-foreground">70%+</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* O que será aplicado */}
      <Card className="rounded-xl border-violet-500/20 bg-white/[0.02]">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-violet-500" />
            <h3 className="font-semibold text-foreground">Metodologias aplicadas</h3>
          </div>

          <div className="space-y-3">
            {[
              {
                icon: Zap,
                title: "Lei de Pareto 80/20",
                description: "Priorização do Grupo 1 (75% da nota) sobre o Grupo 2",
              },
              {
                icon: Target,
                title: "Engenharia Reversa",
                description: "Análise dos editais e bancas para focar no que mais cai",
              },
              {
                icon: BookOpen,
                title: "Estudo Atômico",
                description: "Divisão do conteúdo em microunidades para melhor absorção",
              },
              {
                icon: CheckCircle2,
                title: "Acompanhamento Progressivo",
                description: "Metas semanais e alertas de desempenho",
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                >
                  <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-violet-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Animation quando gerando */}
      {isGenerating && (
        <div className="flex justify-center">
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm text-violet-500 font-medium">IA trabalhando...</span>
          </div>
        </div>
      )}
    </div>
  );
}
