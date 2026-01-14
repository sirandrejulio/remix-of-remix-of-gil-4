import { cn } from '@/lib/utils';
import { Bot, User, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export const ChatMessage = ({ role, content, timestamp }: ChatMessageProps) => {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'group flex gap-3 p-4 rounded-2xl transition-all duration-200',
        isUser 
          ? 'bg-gradient-to-br from-primary/15 to-primary/5 ml-4 sm:ml-12 border border-primary/20' 
          : 'bg-gradient-to-br from-muted/80 to-muted/40 mr-4 sm:mr-12 border border-border/50 backdrop-blur-sm'
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-105',
          isUser 
            ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-primary/20' 
            : 'bg-gradient-to-br from-violet-500/20 to-primary/20 text-primary shadow-violet-500/10'
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-semibold text-sm",
              isUser ? "text-primary" : "text-foreground"
            )}>
              {isUser ? 'Você' : '🎓 Especialista'}
            </span>
            {timestamp && (
              <span className="text-xs text-muted-foreground/60">
                {new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          
          {!isUser && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {copied ? 'Copiado!' : 'Copiar resposta'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="mb-0.5">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
              code: ({ children }) => (
                <code className="bg-muted/80 px-1.5 py-0.5 rounded-md text-sm font-mono border border-border/50">{children}</code>
              ),
              pre: ({ children }) => (
                <pre className="bg-muted/80 p-4 rounded-xl overflow-x-auto my-3 border border-border/50 text-sm">{children}</pre>
              ),
              h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2 text-foreground">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2 text-foreground">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1 text-foreground">{children}</h3>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary/50 pl-4 italic text-muted-foreground my-2">{children}</blockquote>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};