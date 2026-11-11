import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "terracotta" | "saffron";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none";

    const variants = {
      primary:
        "bg-indigo-900 text-sand-50 hover:bg-indigo-950 focus:ring-indigo-900 shadow-md hover:shadow-lg active:scale-[0.98]",
      secondary:
        "bg-sand-200 text-indigo-950 hover:bg-sand-300 focus:ring-sand-400 active:scale-[0.98]",
      outline:
        "border-2 border-sand-300 text-indigo-950 hover:bg-sand-100 hover:border-sand-400 focus:ring-indigo-900 active:scale-[0.98]",
      ghost:
        "text-indigo-950 hover:bg-sand-100/80 focus:ring-sand-300",
      terracotta:
        "bg-terracotta-500 text-white hover:bg-terracotta-600 focus:ring-terracotta-500 shadow-md hover:shadow-lg active:scale-[0.98]",
      saffron:
        "bg-saffron-500 text-indigo-950 hover:bg-amber-500 focus:ring-saffron-500 shadow-md hover:shadow-lg active:scale-[0.98]",
    };

    const sizes = {
      sm: "text-xs px-3 py-1.5 gap-1.5",
      md: "text-sm px-4 py-2.5 gap-2",
      lg: "text-base px-6 py-3.5 gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={twMerge(clsx(base, variants[variant], sizes[size], className))}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

