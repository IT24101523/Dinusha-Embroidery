import React, { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={id} className="block text-xs font-bold text-slate-700">
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={cn(
            "w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-colors focus:border-persian-500 focus:ring-1 focus:ring-persian-500 disabled:bg-slate-100 disabled:cursor-not-allowed",
            error && "border-rose-400 focus:border-rose-500 focus:ring-rose-500",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
