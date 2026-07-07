import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { AppLayout } from "../layouts/AppLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import {
  createCustomer,
  deleteCustomerAndHistory,
  getCustomers,
  updateCustomer,
  type CustomerFormData,
  type CustomerListItem,
} from "../services/customers.service";

function buildNewRepairUrl(customer: CustomerListItem) {
  const params = new URLSearchParams();

  params.set("customer", customer.name);
  params.set("phone", customer.phone);

  if (customer.nif) params.set("taxNumber", customer.nif);
  if (customer.email) params.set("email", customer.email);

  return `/repairs?${params.toString()}`;
}

export function ClientsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCustomerId = searchParams.get("customerId");
  const requestedSearch = searchParams.get("search") ?? "";

  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerListItem | null>(null);
  const [customerToEdit, setCustomerToEdit] = useState<CustomerListItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [search, setSearch] = useState(requestedSearch);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  async function loadCustomers(preferredCustomerId?: string) {
    setIsLoading(true);
    const data = await getCustomers();
    setCustomers(data);
    setSelectedCustomerId((current) => {
      if (preferredCustomerId && data.some((customer) => customer.id === preferredCustomerId)) {
        return preferredCustomerId;
      }

      if (current && data.some((customer) => customer.id === current)) {
        return current;
      }

      return data[0]?.id ?? null;
    });
    setIsLoading(false);
  }

  async function handleCreateCustomer(data: CustomerFormData) {
    const customerId = await createCustomer(data);

    setIsCreateOpen(false);
    setShowToast("✔ Cliente criado");

    await loadCustomers(customerId);

    setTimeout(() => setShowToast(null), 2500);
  }

  async function handleUpdateCustomer(data: CustomerFormData) {
    if (!customerToEdit) return;

    await updateCustomer(customerToEdit.id, data);

    setCustomerToEdit(null);
    setShowToast("✔ Cliente atualizado");

    await loadCustomers(customerToEdit.id);

    setTimeout(() => setShowToast(null), 2500);
  }

  async function handleDeleteCustomer() {
    if (!customerToDelete) return;
    if (deleteConfirmation.trim().toUpperCase() !== "ELIMINAR") return;

    setIsDeleting(true);

    await deleteCustomerAndHistory(customerToDelete);

    setCustomerToDelete(null);
    setDeleteConfirmation("");
    setIsDeleting(false);
    setShowToast("✔ Cliente eliminado");

    await loadCustomers();

    setTimeout(() => setShowToast(null), 2500);
  }

  useEffect(() => {
    if (requestedSearch) {
      setSearch(requestedSearch);
    }

    loadCustomers(requestedCustomerId ?? undefined);
  }, [requestedCustomerId, requestedSearch]);

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return customers;

    return customers.filter((customer) => {
      const searchPool = [
        customer.name,
        customer.phone,
        customer.nif,
        customer.email,
        customer.notes,
        ...customer.machines,
      ]
        .join(" ")
        .toLowerCase();

      return searchPool.includes(normalizedSearch);
    });
  }, [customers, search]);

  const selectedCustomer =
    filteredCustomers.find((customer) => customer.id === selectedCustomerId) ??
    filteredCustomers[0] ??
    null;

  return (
    <AppLayout>
      {showToast && (
        <div className="fixed right-8 top-8 z-50 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 text-emerald-300">
          {showToast}
        </div>
      )}

      <section className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">
            Clientes
          </p>

          <h1 className="mt-3 text-4xl font-bold text-white">
            Gestão de Clientes
          </h1>

          <p className="mt-3 text-slate-400">
            {isLoading
              ? "A carregar clientes..."
              : `${customers.length} cliente(s) registado(s) no Atlas.`}
          </p>
        </div>

        <Button onClick={() => setIsCreateOpen(true)}>+ Novo cliente</Button>
      </section>

      <div className="mb-6">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
          placeholder="Pesquisar por nome, telefone, NIF, email, notas ou máquina..."
        />
      </div>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
                Diretório
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                Clientes
              </h2>
            </div>

            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-400">
              {isLoading ? "—" : filteredCustomers.length}
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {filteredCustomers.map((customer) => {
              const isSelected = selectedCustomer?.id === customer.id;

              return (
                <button
                  key={customer.id}
                  onClick={() => {
                    setSelectedCustomerId(customer.id);
                    setSearchParams({ customerId: customer.id });
                  }}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? "border-cyan-400/50 bg-cyan-400/10"
                      : "border-slate-800 bg-slate-950 hover:border-cyan-400/30 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {customer.name}
                      </h3>

                      <p className="mt-1 text-sm text-slate-400">
                        {customer.phone || "Sem telefone"}
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-400">
                      {customer.totalRepairs} rep.
                    </span>
                  </div>

                  <p className="mt-4 text-sm text-slate-500">
                    Última visita: {customer.lastVisit}
                  </p>
                </button>
              );
            })}

            {!isLoading && filteredCustomers.length === 0 && (
              <p className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                Não foram encontrados clientes.
              </p>
            )}
          </div>
        </Card>

        {selectedCustomer ? (
          <CustomerDetail
            customer={selectedCustomer}
            onEdit={() => setCustomerToEdit(selectedCustomer)}
            onDelete={() => {
              setCustomerToDelete(selectedCustomer);
              setDeleteConfirmation("");
            }}
          />
        ) : (
          <Card>
            <h2 className="text-2xl font-semibold text-white">
              Nenhum cliente selecionado
            </h2>

            <p className="mt-3 text-slate-400">
              Quando existirem clientes, o Atlas mostra aqui o histórico e as
              máquinas associadas.
            </p>
          </Card>
        )}
      </section>

      <Modal
        title="Novo Cliente"
        description="Cria o cliente uma vez. Depois podes reutilizá-lo em todas as reparações."
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        footer={null}
      >
        <CustomerForm
          onCancel={() => setIsCreateOpen(false)}
          onSave={handleCreateCustomer}
        />
      </Modal>

      <Modal
        title="Editar Cliente"
        description="Ao atualizar estes dados, as reparações associadas passam a mostrar a informação mais recente do cliente."
        isOpen={Boolean(customerToEdit)}
        onClose={() => setCustomerToEdit(null)}
        footer={null}
      >
        {customerToEdit && (
          <CustomerForm
            initialData={customerToEdit}
            submitLabel="Guardar alterações"
            onCancel={() => setCustomerToEdit(null)}
            onSave={handleUpdateCustomer}
          />
        )}
      </Modal>

      <Modal
        title="Eliminar Cliente"
        description="Esta ação elimina definitivamente o cliente, as reparações associadas e o respetivo Diário. Usa apenas quando tens a certeza."
        isOpen={Boolean(customerToDelete)}
        onClose={() => {
          if (isDeleting) return;
          setCustomerToDelete(null);
          setDeleteConfirmation("");
        }}
        footer={null}
      >
        {customerToDelete && (
          <div className="space-y-6">
            <Card className="border-red-400/30 bg-red-400/5">
              <p className="text-sm uppercase tracking-[0.25em] text-red-300">
                Ação irreversível
              </p>

              <h3 className="mt-3 text-2xl font-semibold text-white">
                {customerToDelete.name}
              </h3>

              <p className="mt-3 text-slate-400">
                Serão eliminadas também{" "}
                <span className="font-semibold text-white">
                  {customerToDelete.totalRepairs}
                </span>{" "}
                reparação(ões) associada(s) e todos os eventos do Diário.
              </p>

              <p className="mt-4 text-sm text-red-200">
                Para confirmar, escreve <strong>ELIMINAR</strong>.
              </p>

              <input
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                className="mt-4 w-full rounded-xl border border-red-400/30 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-red-300"
                placeholder="ELIMINAR"
              />
            </Card>

            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setCustomerToDelete(null);
                  setDeleteConfirmation("");
                }}
              >
                Voltar
              </Button>

              <Button
                type="button"
                disabled={
                  isDeleting ||
                  deleteConfirmation.trim().toUpperCase() !== "ELIMINAR"
                }
                className="bg-red-500 text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleDeleteCustomer}
              >
                {isDeleting ? "A eliminar..." : "Eliminar definitivamente"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}

function CustomerDetail({
  customer,
  onEdit,
  onDelete,
}: {
  customer: CustomerListItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-6">
      <Card className="border-cyan-400/20 bg-cyan-400/5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
              Ficha do Cliente
            </p>

            <h2 className="mt-3 text-4xl font-bold text-white">
              {customer.name}
            </h2>

            <div className="mt-5 grid gap-4 text-sm text-slate-300 md:grid-cols-2">
              <Info label="Telemóvel" value={customer.phone || "—"} />
              <Info label="NIF" value={customer.nif || "—"} />
              <Info label="Email" value={customer.email || "—"} />
              <Info label="Cliente desde" value={customer.createdAt} />
            </div>

            {customer.notes && (
              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Notas
                </p>
                <p className="mt-2 text-sm text-slate-300">{customer.notes}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Link
              to={buildNewRepairUrl(customer)}
              className="rounded-2xl bg-cyan-400 px-5 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              + Nova reparação para este cliente
            </Link>

            <Button variant="secondary" type="button" onClick={onEdit}>
              ✏️ Editar cliente
            </Button>

            <button
              type="button"
              onClick={onDelete}
              className="rounded-2xl border border-red-400/30 px-5 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-400/10"
            >
              🗑 Eliminar cliente
            </button>
          </div>
        </div>
      </Card>

      <section className="grid gap-5 md:grid-cols-3">
        <Metric label="Reparações" value={String(customer.totalRepairs)} />
        <Metric label="Máquinas diferentes" value={String(customer.machines.length)} />
        <Metric label="Última visita" value={customer.lastVisit} />
      </section>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
              Máquinas
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-white">
              Histórico de equipamentos
            </h3>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {customer.machines.length > 0 ? (
            customer.machines.map((machine) => (
              <span
                key={machine}
                className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-300"
              >
                {machine}
              </span>
            ))
          ) : (
            <p className="text-sm text-slate-400">
              Este cliente ainda não tem máquinas registadas.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
            Timeline do Cliente
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-white">
            Reparações associadas
          </h3>
        </div>

        <div className="mt-6 space-y-3">
          {customer.repairs.map((repair) => (
            <Link
              key={repair.id}
              to={`/repairs/${repair.id}`}
              className="block rounded-2xl border border-slate-800 bg-slate-950 p-4 transition hover:border-cyan-400/40 hover:bg-slate-900"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-slate-500">{repair.repair_number}</p>
                  <h4 className="mt-1 font-semibold text-white">{repair.machine}</h4>
                  <p className="mt-1 text-sm text-slate-400">{repair.date}</p>
                </div>

                <span className="w-fit rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                  {repair.status}
                </span>
              </div>
            </Link>
          ))}

          {customer.repairs.length === 0 && (
            <p className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
              Ainda não existem reparações para este cliente.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

function CustomerForm({
  initialData,
  submitLabel = "Guardar cliente",
  onCancel,
  onSave,
}: {
  initialData?: Partial<CustomerFormData>;
  submitLabel?: string;
  onCancel: () => void;
  onSave: (data: CustomerFormData) => void;
}) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const data = {
      name: String(formData.get("name") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      nif: String(formData.get("nif") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      notes: String(formData.get("notes") ?? "").trim(),
    };

    if (!data.name || !data.phone) return;

    onSave(data);
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <Card>
        <h3 className="text-xl font-semibold text-white">👤 Dados do Cliente</h3>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Input name="name" label="Nome *" defaultValue={initialData?.name} />
          <Input name="phone" label="Telemóvel *" defaultValue={initialData?.phone} />
          <Input name="nif" label="NIF" defaultValue={initialData?.nif} />
          <Input name="email" label="Email" defaultValue={initialData?.email} />
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm text-slate-400">Notas</label>
          <textarea
            name="notes"
            rows={4}
            defaultValue={initialData?.notes ?? ""}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
            placeholder="Notas internas sobre este cliente..."
          />
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancelar
        </Button>

        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

function Input({
  name,
  label,
  defaultValue = "",
}: {
  name: string;
  label: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-slate-400">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </Card>
  );
}
