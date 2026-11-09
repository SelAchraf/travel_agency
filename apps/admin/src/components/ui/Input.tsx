import React from "react";
import { cn } from "../../lib/utils.js";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, startIcon, endIcon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-sand-500"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {startIcon && (
            <div className="absolute start-3 flex items-center pointer-events-none text-sand-400">
              {startIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              "w-full h-10 rounded-lg border border-sand-300 bg-white px-3.5 py-2 text-sm text-indigo-950 placeholder:text-sand-400 transition-colors",
              "focus:border-indigo-900 focus:outline-none focus:ring-1 focus:ring-indigo-900",
              "disabled:cursor-not-allowed disabled:bg-sand-100 disabled:opacity-75",
              startIcon && "ps-9",
              endIcon && "pe-9",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500",
              className,
            )}
            {...props}
          />
          {endIcon && (
            <div className="absolute end-3 flex items-center pointer-events-none text-sand-400">
              {endIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-sand-400">{helperText}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
