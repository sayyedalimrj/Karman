/**
 * Button primitive — token-driven (see globals.css `.btn*` classes). No raw hex.
 *
 * Renders a real <button> by default. `variant` selects the token-mapped style;
 * `block` makes it full-width (used by the login form).
 *
 * Requirements: 10.1, 10.2
 */
import * as React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  block?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", block = false, className, type, children, ...rest },
  ref,
) {
  const classes = [
    "btn",
    `btn--${variant}`,
    block ? "btn--block" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button ref={ref} type={type ?? "button"} className={classes} {...rest}>
      {children}
    </button>
  );
});
