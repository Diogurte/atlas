import type { ReactNode } from "react";
import { Button } from "./Button";

type ModalProps = {
  title: string;
  description?: string;
  isOpen: boolean;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
};

export function Modal({
  title,
  description,
  isOpen,
  children,
  onClose,
  footer,
}: ModalProps) {
  if (!isOpen) return null;

  const hasCustomFooter = footer !== undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-6 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 p-6">
          <div>
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            {description && (
              <p className="mt-2 text-sm text-slate-400">{description}</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-slate-400 transition hover:bg-slate-900 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">{children}</div>

        {hasCustomFooter ? (
          footer
        ) : (
          <div className="flex justify-end gap-3 border-t border-slate-800 p-6">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button>Guardar</Button>
          </div>
        )}
      </div>
    </div>
  );
}