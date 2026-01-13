import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-gradient-to-r from-primary to-fuchsia-400 text-white shadow-sm",
        secondary: "border-zinc-700 bg-zinc-800 text-foreground",
        destructive: "border-transparent bg-gradient-to-r from-destructive to-rose-400 text-white",
        outline: "border-zinc-700 text-foreground bg-transparent",
        success: "border-transparent bg-gradient-to-r from-emerald-500 to-green-400 text-white",
        warning: "border-transparent bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-900",
        info: "border-transparent bg-gradient-to-r from-blue-500 to-cyan-400 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
