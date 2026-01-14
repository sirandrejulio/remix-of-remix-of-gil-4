import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sun, Sunset, Moon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlanoFormData } from "../PlanoEstudoWizard";

interface StepDisponibilidadeProps {
  formData: PlanoFormData;
  updateFormData: (data: Partial<PlanoFormData>) => void;
}

const DIAS_SEMANA = [
  { id: "seg", label: "Seg" },
  { id: "ter", label: "Ter" },
  { id: "qua", label: "Qua" },
  { id: "qui", label: "Qui" },
  { id: "sex", label: "Sex" },
  { id: "sab", label: "Sáb" },
  { id: "dom", label: "Dom" },
];

const PERIODOS = [
  { id: "manha", label: "Manhã", icon: Sun, horarios: ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00"], cor: "text-amber-500" },
  { id: "tarde", label: "Tarde", icon: Sunset, horarios: ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00"], cor: "text-orange-500" },
  { id: "noite", label: "Noite", icon: Moon, horarios: ["18:00", "19:00", "20:00", "21:00", "22:00", "23:00"], cor: "text-indigo-400" },
];

export function StepDisponibilidade({ formData, updateFormData }: StepDisponibilidadeProps) {
  const [selectedDay, setSelectedDay] = useState("dom");
  const [disponibilidade, setDisponibilidade] = useState<{ [dia: string]: string[] }>(
    formData.disponibilidade || {}
  );

  const toggleHorario = (dia: string, horario: string) => {
    setDisponibilidade(prev => {
      const diaHorarios = prev[dia] || [];
      const newHorarios = diaHorarios.includes(horario)
        ? diaHorarios.filter(h => h !== horario)
        : [...diaHorarios, horario];

      const newDisponibilidade = {
        ...prev,
        [dia]: newHorarios,
      };

      return newDisponibilidade;
    });
  };

  // Calculate total hours and update parent
  useEffect(() => {
    const totalHoras = Object.values(disponibilidade).reduce(
      (acc, horarios) => acc + horarios.length,
      0
    );

    updateFormData({
      disponibilidade,
      horasSemanaisTotal: totalHoras,
    });
  }, [disponibilidade]);

  const totalHoras = formData.horasSemanaisTotal || 0;
  const horasHoje = (disponibilidade[selectedDay] || []).length;

  const getDayHours = (dia: string) => (disponibilidade[dia] || []).length;

  return (
    <div className="space-y-6">
      {/* Header com total */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-violet-500" />
          <div>
            <p className="text-sm text-muted-foreground">Total semanal</p>
            <p className="text-2xl font-bold text-foreground">
              <span className="text-violet-500">{totalHoras}</span>h <span className="text-lg">0</span>m
            </p>
          </div>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          Brasília (GMT-3)
        </Badge>
      </div>

      {/* Dias da semana */}
      <div className="flex flex-wrap gap-2 justify-center">
        {DIAS_SEMANA.map(dia => {
          const horas = getDayHours(dia.id);
          const isSelected = selectedDay === dia.id;

          return (
            <button
              key={dia.id}
              onClick={() => setSelectedDay(dia.id)}
              className={cn(
                "px-4 py-3 rounded-xl border transition-all duration-200 min-w-[60px]",
                isSelected
                  ? "bg-violet-500 text-white border-violet-500"
                  : horas > 0
                  ? "bg-violet-500/10 border-violet-500/30 text-foreground"
                  : "bg-muted/50 border-border text-muted-foreground hover:border-violet-500/50"
              )}
            >
              <span className="block font-medium">{dia.label}</span>
              {horas > 0 && (
                <span className={cn("text-xs", isSelected ? "text-white/80" : "text-violet-500")}>
                  {horas}h
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Seleção de horários */}
      <Card className="rounded-xl border-violet-500/20 bg-white/[0.02]">
        <CardContent className="p-4 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg capitalize">
              {DIAS_SEMANA.find(d => d.id === selectedDay)?.label === "Seg" ? "Segunda-feira" :
               DIAS_SEMANA.find(d => d.id === selectedDay)?.label === "Ter" ? "Terça-feira" :
               DIAS_SEMANA.find(d => d.id === selectedDay)?.label === "Qua" ? "Quarta-feira" :
               DIAS_SEMANA.find(d => d.id === selectedDay)?.label === "Qui" ? "Quinta-feira" :
               DIAS_SEMANA.find(d => d.id === selectedDay)?.label === "Sex" ? "Sexta-feira" :
               DIAS_SEMANA.find(d => d.id === selectedDay)?.label === "Sáb" ? "Sábado" : "Domingo"}
            </h3>
            <span className="text-sm text-muted-foreground">{horasHoje}h selecionadas</span>
          </div>

          {PERIODOS.map(periodo => {
            const Icon = periodo.icon;
            return (
              <div key={periodo.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={cn("h-8 w-8 rounded-lg bg-muted flex items-center justify-center", periodo.cor)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-medium">{periodo.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {periodo.horarios[0]} às {periodo.horarios[periodo.horarios.length - 1]}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {periodo.horarios.map(horario => {
                    const isSelected = (disponibilidade[selectedDay] || []).includes(horario);

                    return (
                      <button
                        key={horario}
                        onClick={() => toggleHorario(selectedDay, horario)}
                        className={cn(
                          "px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200",
                          isSelected
                            ? "bg-violet-500 text-white border-violet-500"
                            : "bg-muted/30 border-border text-foreground hover:border-violet-500/50"
                        )}
                      >
                        {horario}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Dica */}
      <p className="text-sm text-muted-foreground text-center">
        💡 Selecione os horários em que você pode estudar durante a semana
      </p>
    </div>
  );
}
