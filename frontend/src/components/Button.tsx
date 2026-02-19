import { useState, type ButtonHTMLAttributes } from "react";
import { COLORS } from "../styles/tokens";
import { useAccessibility } from "../hooks/useAccessibility";

type ButtonVariant = "primary" | "ghost" | "danger" | "success";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export default function Button({
  children,
  variant = "ghost",
  disabled,
  style = {},
  ...rest
}: ButtonProps) {
  const [hov, setHov] = useState(false);
  const { minTarget } = useAccessibility();

  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: hov ? "#d4b87a" : COLORS.accent,
      color: "#0f0f0f",
      border: "none",
      fontWeight: 600,
    },
    ghost: {
      background: hov ? COLORS.surfaceHigh : "transparent",
      color: hov ? COLORS.text : COLORS.textMuted,
      border: `1px solid ${hov ? COLORS.borderHot : COLORS.border}`,
    },
    danger: {
      background: hov ? COLORS.redDim : "transparent",
      color: COLORS.red,
      border: `1px solid ${hov ? COLORS.red : "rgba(224,90,78,0.3)"}`,
    },
    success: {
      background: hov ? COLORS.green : COLORS.greenDim,
      color: hov ? "#0f0f0f" : COLORS.green,
      border: `1px solid ${COLORS.green}`,
    },
  };

  return (
    <button
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onFocus={() => setHov(true)}
      onBlur={() => setHov(false)}
      style={{
        ...variants[variant],
        padding: minTarget ? "7px 16px" : "4px 10px",
        borderRadius: 4,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        fontSize: minTarget ? 12 : 11,
        fontFamily: "inherit",
        transition: "all 0.15s",
        letterSpacing: "0.04em",
        minHeight: minTarget || undefined,
        minWidth: minTarget || undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
