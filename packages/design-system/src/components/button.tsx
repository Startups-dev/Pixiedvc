import { ButtonHTMLAttributes, ReactElement, ReactNode, cloneElement, forwardRef } from "react";

import { cn } from "../utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";

const baseStyles = "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[linear-gradient(to_bottom,rgba(255,255,255,0.16),rgba(255,255,255,0.03)_46%,rgba(255,255,255,0)_52%),linear-gradient(to_right,#19284d,#4f72ff)] text-white shadow-[0_10px_22px_rgba(30,47,92,0.34)] transition-[transform,box-shadow,filter] duration-300 hover:-translate-y-[1px] hover:brightness-105 hover:shadow-[0_14px_28px_rgba(30,47,92,0.4)] active:translate-y-0 active:brightness-100 active:shadow-[0_7px_14px_rgba(30,47,92,0.28)]",
  secondary:
    "bg-gradient-to-r from-brand to-gold text-white shadow-[0_18px_45px_rgba(247,184,75,0.35)] hover:-translate-y-0.5",
  ghost:
    "border border-[#2c3f72]/35 bg-white/45 text-[#24345f] transition-[transform,box-shadow,background-color,color,border-color] duration-300 hover:-translate-y-[1px] hover:border-[#2c3f72]/45 hover:bg-[#eef3ff] hover:text-[#1f2e57] hover:shadow-[0_6px_14px_rgba(30,47,92,0.14)] active:translate-y-0 active:shadow-[0_3px_8px_rgba(30,47,92,0.1)]",
  outline:
    "border border-[#2c3f72]/45 bg-transparent text-[#24345f] transition-[transform,box-shadow,background-color,color,border-color] duration-300 hover:-translate-y-[1px] hover:border-[#2c3f72]/55 hover:bg-[#eef3ff] hover:text-[#1f2e57] hover:shadow-[0_6px_14px_rgba(30,47,92,0.12)] active:translate-y-0 active:shadow-[0_3px_8px_rgba(30,47,92,0.1)]",
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
        "data-variant": variant,
        "data-slot": "pixie-button",
        className: cn(element.props.className, classes),
        ...rest,
      });
    }

    return (
      <button ref={ref} type={type} data-variant={variant} data-slot="pixie-button" className={classes} {...rest}>
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
