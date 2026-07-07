import { AppLayout } from "../layouts/AppLayout";

export function KnowledgePage() {
  return (
    <AppLayout>
      <h1 className="text-4xl font-bold text-white">📚 Knowledge Base</h1>

      <p className="mt-3 text-slate-400">
        Toda a informação da empresa estará organizada aqui.
      </p>
    </AppLayout>
  );
}