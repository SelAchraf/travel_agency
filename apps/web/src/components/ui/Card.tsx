import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ className, hover = false, children, ...props }) => {
  return (
    <div
      className={twMerge(
        clsx(
          "bg-white rounded-2xl border border-sand-200/80 shadow-sm overflow-hidden",
          hover && "transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-sand-300",
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};

