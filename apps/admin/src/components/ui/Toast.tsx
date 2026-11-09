import React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "../../lib/utils.js";

export const ToastProvider = ToastPrimitive.Provider;

export interface ToastProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  variant?: "success" | "error" | "info";
}

export const Toast: React.FC<ToastProps> = ({
  open,
  onOpenChange,
  title,
  description,
  variant = "success",
}) => {
  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />,
    error: <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />,
    info: <CheckCircle2 className="h-5 w-5 text-indigo-600 shrink-0" />,
  };

  return (
    <ToastPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      className={cn(
        "fixed bottom-4 end-4 z-50 flex items-start gap-3 w-full max-w-md rounded-xl bg-white p-4 shadow-xl border border-sand-200 transition-all",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-5",
      )}
    >
      {icons[variant]}
      <div className="flex-1 space-y-1 text-start">
        <ToastPrimitive.Title className="text-sm font-semibold text-indigo-950">
          {title}
        </ToastPrimitive.Title>
        {description && (
          <ToastPrimitive.Description className="text-xs text-sand-500">
            {description}
          </ToastPrimitive.Description>
        )}
      </div>
      <ToastPrimitive.Close className="rounded-md p-1 text-sand-400 hover:text-indigo-950 transition-colors">
        <X className="h-4 w-4" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
};

export const ToastViewport = () => (
  <ToastPrimitive.Viewport className="fixed bottom-0 end-0 z-50 flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:end-0 sm:top-auto sm:flex-col md:max-w-[420px]" />
);
