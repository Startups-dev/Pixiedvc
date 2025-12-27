import { ButtonHTMLAttributes, ReactElement, ReactNode, cloneElement, forwardRef } from "react";

import { cn } from "../utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";

const baseStyles = "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-[#2b3a70] via-[#384b94] to-[#9aa7ff] text-white shadow-[0_16px_48px_rgba(43,58,112,0.38)] hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(43,58,112,0.45)]",
  secondary:
    "bg-gradient-to-r from-brand to-gold text-white shadow-[0_18px_45px_rgba(247,184,75,0.35)] hover:-translate-y-0.5",
  ghost:
    "bg-white/70 text-ink border border-ink/10 hover:border-brand hover:text-brand",
  outline:
    "border border-brand/50 text-brand hover:bg-brand/10",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  asChild?: boolean;
  children: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className, fullWidth, type = "button", asChild = false, children, ...rest }, ref) => {
    const classes = cn(
      baseStyles,
      variantStyles[variant],
      fullWidth ? "w-full" : "px-6 py-3",
      fullWidth ? "py-3" : undefined,
      className,
    );

    if (asChild && children && typeof children === "object" && "props" in (children as ReactElement)) {
      const element = children as ReactElement;
      return cloneElement(element, {
        className: cn(element.props.className, classes),
        ...rest,
      });
    }

    return (
      <button ref={ref} type={type} className={classes} {...rest}>
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
