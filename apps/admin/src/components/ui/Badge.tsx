import React from "react";
import { cn } from "../../lib/utils.js";

export type BadgeVariant =
  | "available"
  | "limited"
  | "sold_out"
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "neutral"
  | "indigo"
  | "terracotta"
  | "saffron"
  | "mint"
  | "destructive"
  | "outline"
  | "warning"
  | "success"
  | "secondary";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "neutral",
  dot = true,
  children,
  ...props
}) => {
  const variants: Record<BadgeVariant, string> = {
    available: "bg-emerald-50 text-emerald-800 border-emerald-200",
    limited: "bg-amber-50 text-amber-800 border-amber-200",
    sold_out: "bg-red-50 text-red-800 border-red-200",
    pending: "bg-amber-50 text-amber-800 border-amber-200",
    confirmed: "bg-indigo-50 text-indigo-900 border-indigo-200",
    cancelled: "bg-slate-100 text-slate-700 border-slate-200",
    completed: "bg-blue-50 text-blue-800 border-blue-200",
    neutral: "bg-sand-100 text-sand-500 border-sand-200",
    indigo: "bg-indigo-50 text-indigo-950 border-indigo-200",
    terracotta: "bg-terracotta-50 text-terracotta-800 border-terracotta-200",
    saffron: "bg-amber-50 text-amber-800 border-amber-200",
    mint: "bg-emerald-50 text-emerald-800 border-emerald-200",
    destructive: "bg-red-50 text-red-800 border-red-200",
    outline: "bg-transparent text-indigo-950 border-sand-300",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    secondary: "bg-sand-100 text-sand-700 border-sand-200",
  };

  const dotColors: Record<BadgeVariant, string> = {
    available: "bg-emerald-500",
    limited: "bg-amber-500",
    sold_out: "bg-red-500",
    pending: "bg-amber-500",
    confirmed: "bg-indigo-600",
    cancelled: "bg-slate-400",
    completed: "bg-blue-500",
    neutral: "bg-sand-400",
    indigo: "bg-indigo-600",
    terracotta: "bg-terracotta-600",
    saffron: "bg-amber-500",
    mint: "bg-emerald-500",
    destructive: "bg-red-500",
    outline: "bg-sand-400",
    warning: "bg-amber-500",
    success: "bg-emerald-500",
    secondary: "bg-sand-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors",
        variants[variant],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full", dotColors[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};
