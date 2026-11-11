import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "available" | "limited" | "soldOut" | "requestOnly" | "terracotta" | "indigo" | "neutral" | "saffron";
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "neutral",
  dot = true,
  children,
  ...props
}) => {
  const variants = {
    available: "bg-emerald-50 text-emerald-800 border-emerald-200",
    limited: "bg-amber-50 text-amber-800 border-amber-200",
    soldOut: "bg-red-50 text-red-800 border-red-200",
    requestOnly: "bg-blue-50 text-blue-800 border-blue-200",
    terracotta: "bg-terracotta-500/10 text-terracotta-600 border-terracotta-500/20",
    indigo: "bg-indigo-900/10 text-indigo-950 border-indigo-900/20",
    saffron: "bg-saffron-500/10 text-amber-800 border-saffron-500/20",
    neutral: "bg-sand-100 text-sand-500 border-sand-200",
  };

  const dots = {
    available: "bg-emerald-500",
    limited: "bg-amber-500",
    soldOut: "bg-red-500",
    requestOnly: "bg-blue-500",
    terracotta: "bg-terracotta-500",
    indigo: "bg-indigo-900",
    saffron: "bg-saffron-500",
    neutral: "bg-sand-400",
  };

  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border select-none",
          variants[variant],
          className
        )
      )}
      {...props}
    >
      {dot && <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", dots[variant])} />}
      {children}
    </span>
  );
};

