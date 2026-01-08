import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "../utils";

export function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-xs font-semibold uppercase tracking-wide text-slate-700"
    >
      {children}
    </label>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement>;

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const baseFieldStyles =
  "mt-1 w-full rounded-2xl border border-slate-400 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-none focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500";

export const TextInput = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input ref={ref} type={type} className={cn(baseFieldStyles, className)} {...props} />
  ),
);

TextInput.displayName = "TextInput";

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, rows = 4, ...props }, ref) => (
    <textarea ref={ref} rows={rows} className={cn(baseFieldStyles, "resize-none", className)} {...props} />
  ),
);

TextArea.displayName = "TextArea";

export function HelperText({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-slate-600">{children}</p>;
}
