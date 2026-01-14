import { forwardRef } from "react";
import { GraduationCap } from "lucide-react";

export const Footer = forwardRef<HTMLElement, object>(function Footer(_, ref) {
  return (
    <footer ref={ref} className="border-t border-white/10 bg-white/[0.02] backdrop-blur-xl">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-fuchsia-400 shadow-lg shadow-primary/25">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold leading-tight text-foreground tracking-tight">BANCÁRIO</span>
                <span className="text-xs font-semibold leading-tight bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-transparent">ÁGIL</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sistema inteligente de preparação para concursos bancários.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm">Plataforma</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="hover:text-foreground transition-colors cursor-pointer">Simulados</li>
              <li className="hover:text-foreground transition-colors cursor-pointer">Questões</li>
              <li className="hover:text-foreground transition-colors cursor-pointer">Dashboard</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm">Disciplinas</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="hover:text-foreground transition-colors cursor-pointer">Conhecimentos Bancários</li>
              <li className="hover:text-foreground transition-colors cursor-pointer">Matemática Financeira</li>
              <li className="hover:text-foreground transition-colors cursor-pointer">Língua Portuguesa</li>
              <li className="hover:text-foreground transition-colors cursor-pointer">Informática</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm">Suporte</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="hover:text-foreground transition-colors cursor-pointer">Central de Ajuda</li>
              <li className="hover:text-foreground transition-colors cursor-pointer">Contato</li>
              <li className="hover:text-foreground transition-colors cursor-pointer">Termos de Uso</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-8 text-center text-sm text-muted-foreground">
          <p>© 2025 Bancário Ágil. Todos os direitos reservados.</p>
          <p className="mt-1.5">Preparação completa para BB, Caixa, BNB, Banrisul e outros concursos bancários.</p>
          <p className="mt-1.5">Criado por André Júlio.</p>
        </div>
      </div>
    </footer>
  );
});
