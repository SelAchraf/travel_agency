import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../../lib/utils.js";

export const ModalTrigger = DialogPrimitive.Trigger;

export const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-indigo-950/40 backdrop-blur-sm animate-in fade-in-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed start-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-6 shadow-xl border border-sand-200 duration-200",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute end-4 top-4 rounded-md p-1 text-sand-400 hover:text-indigo-950 hover:bg-sand-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-900">
        <X className="h-5 w-5" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));

ModalContent.displayName = "ModalContent";

export const ModalHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <div className={cn("flex flex-col space-y-1.5 text-start pb-4", className)} {...props} />;

export const ModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-bold text-indigo-950 leading-none tracking-tight", className)}
    {...props}
  />
));

ModalTitle.displayName = "ModalTitle";

export const ModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-sand-500", className)}
    {...props}
  />
));

ModalDescription.displayName = "ModalDescription";

export const ModalFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t border-sand-200",
      className,
    )}
    {...props}
  />
);

export interface ModalProps extends DialogPrimitive.DialogProps {
  title?: string;
  description?: string;
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  title,
  description,
  children,
  isOpen,
  onClose,
  open,
  onOpenChange,
  className,
  ...props
}) => {
  const isControlledOpen = isOpen !== undefined ? isOpen : open;
  const handleOpenChange =
    onOpenChange ||
    (onClose
      ? (o: boolean) => {
          if (!o) onClose();
        }
      : undefined);

  if (title) {
    return (
      <DialogPrimitive.Root open={isControlledOpen} onOpenChange={handleOpenChange} {...props}>
        <ModalContent className={className}>
          <ModalHeader>
            <ModalTitle>{title}</ModalTitle>
            {description && <ModalDescription>{description}</ModalDescription>}
          </ModalHeader>
          {children}
        </ModalContent>
      </DialogPrimitive.Root>
    );
  }

  return (
    <DialogPrimitive.Root open={isControlledOpen} onOpenChange={handleOpenChange} {...props}>
      {children}
    </DialogPrimitive.Root>
  );
};
