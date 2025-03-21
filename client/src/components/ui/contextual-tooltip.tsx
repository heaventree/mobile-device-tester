import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ContextualTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
}

export function ContextualTooltip({
  children,
  content,
  side = "top",
  align = "center",
  className,
}: ContextualTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span className="cursor-help">{children}</span>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className={`bg-slate-900 text-slate-100 border-slate-800 px-3 py-1.5 text-sm ${className}`}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
