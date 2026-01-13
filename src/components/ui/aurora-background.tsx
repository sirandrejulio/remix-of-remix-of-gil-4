"use client";
import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <div
      className={cn(
        "relative flex flex-col text-foreground overflow-hidden",
        className
      )}
      {...props}
    >
      {/* Content layer - no background, fully transparent */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
};
