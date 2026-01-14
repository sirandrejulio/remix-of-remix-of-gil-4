import { useState, useRef, KeyboardEvent, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Paperclip, Sparkles, X, FileText, Image, Check, Command } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface UploadedFile {
  file: File;
  preview?: string;
  uploading?: boolean;
  uploaded?: boolean;
}

interface ChatInputProps {
  onSend: (message: string, attachedFiles?: string[]) => void;
  onCommand?: (command: string) => void;
  onFileUpload?: (files: File[]) => Promise<string[]>;
  isLoading?: boolean;
  disabled?: boolean;
}

export const ChatInput = ({ onSend, onCommand, onFileUpload, isLoading, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSend = async () => {
    if ((!message.trim() && files.length === 0) || isLoading || disabled) return;

    const currentMessage = message.trim();
    const currentFiles = [...files];

    // Clear state immediately for better UX
    setMessage('');
    setFiles([]);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    let uploadedFileNames: string[] = [];

    // Upload files first if any
    if (currentFiles.length > 0 && onFileUpload) {
      setIsUploading(true);
      try {
        uploadedFileNames = await onFileUpload(currentFiles.map(f => f.file));
      } catch (error) {
        toast({
          title: "Erro no upload",
          description: "Não foi possível enviar os arquivos",
          variant: "destructive"
        });
        // Restore files on error
        setFiles(currentFiles);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    // Check for commands
    if (currentMessage.startsWith('/')) {
      onCommand?.(currentMessage);
    }

    // Send message with attached file names
    const messageToSend = currentMessage || 'Analise os arquivos anexados';
    onSend(messageToSend, uploadedFileNames.length > 0 ? uploadedFileNames : undefined);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    const newFiles: UploadedFile[] = [];

    Array.from(selectedFiles).forEach(file => {
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Tipo de arquivo não suportado",
          description: `${file.name} não é um tipo suportado (PDF, imagens ou texto)`,
          variant: "destructive"
        });
        return;
      }

      if (file.size > maxSize) {
        toast({
          title: "Arquivo muito grande",
          description: `${file.name} excede o limite de 10MB`,
          variant: "destructive"
        });
        return;
      }

      const uploadedFile: UploadedFile = { file };

      if (file.type.startsWith('image/')) {
        uploadedFile.preview = URL.createObjectURL(file);
      }

      newFiles.push(uploadedFile);
    });

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
      toast({
        title: "Arquivo adicionado",
        description: `${newFiles.length} arquivo(s) pronto(s) para envio`
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const quickCommands = [
    { label: '📚 Plano de Estudos', command: '/plano' },
    { label: '📝 Resumo', command: '/resumo' },
    { label: '❓ Resolver Questão', command: '/questao' },
    { label: '🧠 Mapa Mental', command: '/mapa' },
    { label: '💡 Dicas de Estudo', command: '/dica' },
  ];

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-3 h-3" />;
    return <FileText className="w-3 h-3" />;
  };

  return (
    <div className="border-t border-border/50 bg-background/90 backdrop-blur-xl p-3 sm:p-4">
      {/* File previews */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 animate-fade-in">
          {files.map((f, idx) => (
            <div
              key={idx}
              className={cn(
                "relative group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all",
                "bg-gradient-to-r from-muted/80 to-muted/50 border border-border/50",
                "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
                f.uploading && "animate-pulse"
              )}
            >
              {f.preview ? (
                <img src={f.preview} alt="" className="w-5 h-5 rounded object-cover" />
              ) : (
                <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
                  {getFileIcon(f.file)}
                </div>
              )}
              <span className="max-w-[100px] truncate font-medium">{f.file.name}</span>
              {f.uploaded && <Check className="w-3 h-3 text-emerald-500" />}
              <button
                onClick={() => removeFile(idx)}
                className="ml-1 p-0.5 rounded-full hover:bg-destructive/20 transition-colors"
              >
                <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <DropdownMenu>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "flex-shrink-0 h-9 w-9 rounded-xl",
                      "bg-gradient-to-br from-primary/10 to-violet-500/10",
                      "hover:from-primary/20 hover:to-violet-500/20",
                      "border border-primary/20 hover:border-primary/30",
                      "transition-all duration-200"
                    )}
                    disabled={disabled}
                  >
                    <Command className="w-4 h-4 text-primary" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Comandos rápidos
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenuContent align="start" className="w-48">
            {quickCommands.map((cmd) => (
              <DropdownMenuItem
                key={cmd.command}
                onClick={() => setMessage(cmd.command + ' ')}
                className="text-sm cursor-pointer gap-2"
              >
                {cmd.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "flex-shrink-0 h-9 w-9 rounded-xl",
                  "hover:bg-muted border border-border/50 hover:border-border",
                  "transition-all duration-200"
                )}
                disabled={disabled || isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : (
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Anexar arquivo
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte qualquer coisa..."
            className={cn(
              "min-h-[44px] max-h-[200px] resize-none text-sm py-3 pr-4",
              "rounded-xl border-border/50 bg-muted/30",
              "focus:border-primary/50 focus:ring-primary/20",
              "placeholder:text-muted-foreground/50",
              "transition-all duration-200"
            )}
            disabled={disabled || isLoading}
            rows={1}
          />
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleSend}
                disabled={(!message.trim() && files.length === 0) || isLoading || disabled}
                size="icon"
                className={cn(
                  "flex-shrink-0 h-9 w-9 rounded-xl",
                  "bg-gradient-to-br from-primary to-primary/80",
                  "hover:from-primary/90 hover:to-primary/70",
                  "shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30",
                  "transition-all duration-200 hover:scale-105 active:scale-95",
                  "disabled:opacity-50 disabled:shadow-none disabled:scale-100"
                )}
              >
                {isLoading || isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Enviar (Enter)
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <p className="text-[10px] text-muted-foreground/50 mt-2 text-center">
        Enter enviar • Shift+Enter nova linha
      </p>
    </div>
  );
};