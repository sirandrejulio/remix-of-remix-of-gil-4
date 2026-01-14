import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Download, BookOpen, ListChecks, Brain, StickyNote } from 'lucide-react';

interface Document {
  id: string;
  titulo: string;
  tipo: string;
  conteudo: string;
  created_at: string;
}

interface DocumentsListProps {
  documents: Document[];
  onDownload: (doc: Document) => void;
}

export const DocumentsList = ({ documents, onDownload }: DocumentsListProps) => {
  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'resumo':
        return <FileText className="w-4 h-4" />;
      case 'plano_estudo':
        return <BookOpen className="w-4 h-4" />;
      case 'lista_exercicios':
        return <ListChecks className="w-4 h-4" />;
      case 'mapa_mental':
        return <Brain className="w-4 h-4" />;
      case 'anotacoes':
        return <StickyNote className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    });
  };

  const downloadDocument = (doc: Document) => {
    const blob = new Blob([doc.conteudo], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.titulo}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Documentos Gerados
        </h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum documento gerado ainda
            </p>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  {getIcon(doc.tipo)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(doc.created_at)}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0"
                  onClick={() => downloadDocument(doc)}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
