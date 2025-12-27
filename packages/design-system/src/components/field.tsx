import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "../utils";

export function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-sm font-semibold uppercase tracking-[0.18em] text-muted"
    >
      {children}
    </label>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement>;

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const baseFieldStyles =
  "mt-2 w-full rounded-2xl border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink shadow-[0_12px_30px_rgba(15,23,42,0.08)] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

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
  return <p className="mt-1 text-xs text-muted">{children}</p>;
}
