"use client";

import { cn } from "@/lib/utils";
import React from "react";

type TColorProp = string | string[];

interface ShineBorderProps {
  borderRadius?: number;
  borderWidth?: number;
  duration?: number;
  color?: TColorProp;
  className?: string;
  children: React.ReactNode;
}

/**
 * Shine Border - Animated background border effect component
 */
function ShineBorder({
  borderRadius = 16,
  borderWidth = 1,
  duration = 14,
  color = ["hsl(263 70% 50%)", "hsl(290 70% 50%)", "hsl(263 70% 30%)"],
  className,
  children,
}: ShineBorderProps) {
  return (
    <div
      style={{
        "--border-radius": `${borderRadius}px`,
      } as React.CSSProperties}
      className={cn(
        "relative grid place-items-center rounded-[--border-radius] bg-zinc-950 text-foreground",
        className
      )}
    >
      <div
        style={{
          "--border-width": `${borderWidth}px`,
          "--border-radius": `${borderRadius}px`,
          "--duration": `${duration}s`,
          "--mask-linear-gradient": `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          "--background-radial-gradient": `radial-gradient(transparent,transparent, ${Array.isArray(color) ? color.join(",") : color},transparent,transparent)`,
        } as React.CSSProperties}
        className="pointer-events-none before:bg-shine-size before:absolute before:inset-0 before:size-full before:rounded-[--border-radius] before:p-[--border-width] before:will-change-[background-position] before:content-[''] before:![-webkit-mask-composite:xor] before:![mask-composite:exclude] before:[background-image:--background-radial-gradient] before:[background-size:300%_300%] before:[mask:--mask-linear-gradient] motion-safe:before:animate-shine-pulse"
      />
      {children}
    </div>
  );
}

export { ShineBorder };
