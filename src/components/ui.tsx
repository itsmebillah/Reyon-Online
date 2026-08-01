import Link from "next/link";
import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from "react";

export function Container({
  children,
  className = "",
}: PropsWithChildren<{ className?: string }>) {
  return <div className={`container ${className}`}>{children}</div>;
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button className={`button button--${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  href,
  variant = "primary",
}: {
  children: ReactNode;
  href: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link className={`button button--${variant}`} href={href}>
      {children}
    </Link>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="section-heading">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2>{title}</h2>
      {body && <p>{body}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span aria-hidden="true">◇</span>
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </div>
  );
}
