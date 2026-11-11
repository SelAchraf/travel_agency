import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, id, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5 text-start">
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold text-indigo-950">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={twMerge(
            clsx(
              "w-full px-3.5 py-2.5 rounded-xl border bg-white text-indigo-950 text-sm transition-colors",
              "placeholder:text-sand-400 focus:outline-none focus:ring-2 focus:ring-offset-1",
              error
                ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                : "border-sand-300 focus:border-indigo-900 focus:ring-indigo-100",
              className
            )
          )}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

