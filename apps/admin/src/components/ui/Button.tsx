import React from "react";
import { cn } from "../../lib/utils.js";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "terracotta" | "saffron" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none";

    const variants = {
      primary:
        "bg-indigo-900 text-white hover:bg-indigo-950 focus-visible:ring-indigo-900 shadow-sm",
      terracotta:
        "bg-terracotta-500 text-white hover:bg-terracotta-600 focus-visible:ring-terracotta-500 shadow-sm",
      saffron:
        "bg-saffron-500 text-indigo-950 font-semibold hover:bg-saffron-600 focus-visible:ring-saffron-500 shadow-sm",
      outline:
        "border border-sand-300 bg-transparent text-indigo-900 hover:bg-sand-100 focus-visible:ring-indigo-900",
      ghost: "bg-transparent text-indigo-900 hover:bg-sand-100 focus-visible:ring-indigo-900",
      destructive: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600 shadow-sm",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-10 px-4 text-sm gap-2",
      lg: "h-12 px-6 text-base gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
