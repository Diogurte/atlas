import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { AppLayout } from "../layouts/AppLayout";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import {
  createSupplier,
  getSupplierModuleErrorMessage,
  getSupplierWorkspace,
  type SupplierFormData,
  type SupplierWorkspace,
} from "../services/suppliers.service";

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierWorkspace[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadSuppliers() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await getSupplierWorkspace();
      setSuppliers(data);
    } catch (error: any) {
      setErrorMessage(getSupplierModuleErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateSupplier(data: SupplierFormData) {
    const supplierId = await createSupplier(data);
    setIsCreateOpen(false);
    setToast("✔ Fornecedor criado");
    await loadSuppliers();
    setTimeout(() => setToast(null), 2500);

    window.location.href = `/suppliers/${supplierId}`;
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  const filteredSuppliers = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return suppliers;

    return suppliers.filter((supplier) =>
      [supplier.name, supplier.nif, supplier.email, supplier.notes]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [search, suppliers]);

  const totalPending = suppliers.reduce((sum, supplier) => sum + supplier.pendingItems.length, 0);
  const totalOrders = suppliers.reduce((sum, supplier) => sum + supplier.sentOrders.length, 0);

  return (
    <AppLayout>
      {toast && (
        <div className="fixed right-8 top-8 z-50 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 text-emerald-300">
          {toast}
        </div>
      )}

      <section className="mb-8 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">
            Fornecedores
          </p>

          <h1 className="mt-3 text-4xl font-bold text-white">
            Gestão de Fornecedores
          </h1>

          <p className="mt-3 max-w-3xl text-slate-400">
            Cada fornecedor tem a sua ficha, pedido atual e histórico de requisições.
          </p>
        </div>

        <Button onClick={() => setIsCreateOpen(true)}>+ Novo fornecedor</Button>
      </section>

      {errorMessage && (
        <Card className="mb-6 border-amber-400/30 bg-amber-400/5">
          <h2 className="text-xl font-semibold text-amber-200">Configuração necessária</h2>
          <p className="mt-3 text-sm leading-6 text-amber-100/80">{errorMessage}</p>
        </Card>
      )}

      <section className="mb-8 grid gap-5 md:grid-cols-3">
        <Metric label="Fornecedores" value={isLoading ? "—" : String(suppliers.length)} />
        <Metric label="Linhas pendentes" value={isLoading ? "—" : String(totalPending)} />
        <Metric label="Requisições enviadas" value={isLoading ? "—" : String(totalOrders)} />
      </section>

      <section className="mb-6">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
          placeholder="Pesquisar fornecedor, NIF ou email..."
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {filteredSuppliers.map((supplier) => (
          <Link
            key={supplier.id}
            to={`/suppliers/${supplier.id}`}
            className="rounded-3xl border border-slate-800 bg-slate-900 p-6 transition hover:-translate-y-1 hover:border-cyan-400/40"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">Fornecedor</p>
                <h2 className="mt-3 text-2xl font-bold text-white">{supplier.name}</h2>
                <p className="mt-2 text-slate-400">{supplier.email || "Sem email configurado"}</p>
                <p className="mt-1 text-sm text-slate-500">NIF: {supplier.nif || "—"}</p>
              </div>

              <div className="text-right">
                <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                  Abrir ficha
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <MiniMetric label="Linhas pendentes" value={String(supplier.pendingItems.length)} />
              <MiniMetric label="Requisições" value={String(supplier.sentOrders.length)} />
            </div>
          </Link>
        ))}

        {!isLoading && filteredSuppliers.length === 0 && (
          <Card>
            <h2 className="text-2xl font-semibold text-white">Ainda não existem fornecedores</h2>
            <p className="mt-3 text-slate-400">Cria o primeiro fornecedor para começar a fazer requisições.</p>
          </Card>
        )}
      </section>

      <Modal
        title="Novo fornecedor"
        description="Regista o fornecedor e o email usado para envio de pedidos."
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        footer={null}
      >
        <SupplierForm onCancel={() => setIsCreateOpen(false)} onSave={handleCreateSupplier} />
      </Modal>
    </AppLayout>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-4xl font-bold text-white">{value}</p>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function SupplierForm({
  initialData,
  onCancel,
  onSave,
}: {
  initialData?: SupplierFormData;
  onCancel: () => void;
  onSave: (data: SupplierFormData) => void | Promise<void>;
}) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    onSave({
      name: String(formData.get("name") ?? ""),
      nif: String(formData.get("nif") ?? ""),
      email: String(formData.get("email") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <label className="mb-2 block text-sm text-slate-400">Nome *</label>
        <input
          name="name"
          required
          defaultValue={initialData?.name ?? ""}
          className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white outline-none focus:border-cyan-400"
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-slate-400">NIF</label>
          <input
            name="nif"
            defaultValue={initialData?.nif ?? ""}
            className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white outline-none focus:border-cyan-400"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-400">Email para envios *</label>
          <input
            name="email"
            type="email"
            required
            defaultValue={initialData?.email ?? ""}
            className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-400">Observações</label>
        <textarea
          name="notes"
          rows={4}
          defaultValue={initialData?.notes ?? ""}
          className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white outline-none focus:border-cyan-400"
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar fornecedor</Button>
      </div>
    </form>
  );
}
