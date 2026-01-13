import * as React from "react";
import { cn } from "@/lib/utils";

export interface AutoTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  maxRows?: number;
  resizable?: boolean;
}

const AutoTextarea = React.forwardRef<HTMLTextAreaElement, AutoTextareaProps>(
  ({ className, minRows = 2, maxRows = 20, resizable = true, value, onChange, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const [textareaHeight, setTextareaHeight] = React.useState<string>("auto");

    const combinedRef = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    const adjustHeight = React.useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = "auto";
      
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
      const paddingTop = parseInt(getComputedStyle(textarea).paddingTop) || 8;
      const paddingBottom = parseInt(getComputedStyle(textarea).paddingBottom) || 8;
      const borderTop = parseInt(getComputedStyle(textarea).borderTopWidth) || 1;
      const borderBottom = parseInt(getComputedStyle(textarea).borderBottomWidth) || 1;

      const minHeight = minRows * lineHeight + paddingTop + paddingBottom + borderTop + borderBottom;
      const maxHeight = maxRows * lineHeight + paddingTop + paddingBottom + borderTop + borderBottom;

      const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
      setTextareaHeight(`${newHeight}px`);
    }, [minRows, maxRows]);

    React.useEffect(() => {
      adjustHeight();
    }, [value, adjustHeight]);

    React.useEffect(() => {
      // Initial adjustment
      const timer = setTimeout(adjustHeight, 0);
      return () => clearTimeout(timer);
    }, [adjustHeight]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e);
      adjustHeight();
    };

    return (
      <textarea
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-200 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent",
          resizable ? "resize-y" : "resize-none",
          className
        )}
        ref={combinedRef}
        value={value}
        onChange={handleChange}
        style={{ height: textareaHeight, minHeight: resizable ? "80px" : undefined }}
        {...props}
      />
    );
  }
);

AutoTextarea.displayName = "AutoTextarea";

export { AutoTextarea };
