import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-lg ${className}`}
    >
      {children}
    </div>
  );
}