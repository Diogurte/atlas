import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { AppLayout } from "../layouts/AppLayout";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import {
  createSupplierCommercialCondition,
  deleteSupplierAndHistory,
  deleteSupplierCommercialCondition,
  getSupplierModuleErrorMessage,
  getSupplierCommercialConditions,
  getSupplierWorkspace,
  parseRequisitionLines,
  sendSupplierTextRequisition,
  updateSupplier,
  updateSupplierCommercialCondition,
  type SupplierCommercialCondition,
  type SupplierCommercialConditionFormData,
  type SupplierFormData,
  type SupplierWorkspace,
} from "../services/suppliers.service";
import { printSupplierRequisition } from "../services/supplierRequisitionPdf.service";

export function SupplierDetailPage() {
  const { supplierId } = useParams();
  const navigate = useNavigate();

  const [supplier, setSupplier] = useState<SupplierWorkspace | null>(null);
  const [conditions, setConditions] = useState<SupplierCommercialCondition[]>([]);
  const [requestText, setRequestText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isConditionOpen, setIsConditionOpen] = useState(false);
  const [conditionToEdit, setConditionToEdit] = useState<SupplierCommercialCondition | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  async function loadSupplier() {
    if (!supplierId) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const workspace = await getSupplierWorkspace();
      const current = workspace.find((item) => item.id === supplierId) ?? null;
      const commercialConditions = supplierId
        ? await getSupplierCommercialConditions(supplierId)
        : [];

      setSupplier(current);
      setConditions(commercialConditions);
    } catch (error: any) {
      setErrorMessage(getSupplierModuleErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSupplier();
  }, [supplierId]);

  const requestLines = useMemo(() => parseRequisitionLines(requestText), [requestText]);
  const lastOrder = supplier?.sentOrders[0] ?? null;

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  function handleGeneratePdf() {
    if (!supplier) return;

    const lines = parseRequisitionLines(requestText);

    if (lines.length === 0) {
      showToast("Cola primeiro o material na caixa de texto.");
      return;
    }

    const temporaryOrderNumber = `RASCUNHO-${new Date()
      .toLocaleDateString("pt-PT")
      .replaceAll("/", "")}`;

    printSupplierRequisition({
      supplier,
      orderNumber: temporaryOrderNumber,
      lines,
    });
  }

  async function handleSendEmail() {
    if (!supplier) return;

    const lines = parseRequisitionLines(requestText);

    if (lines.length === 0) {
      showToast("Cola primeiro o material na caixa de texto.");
      return;
    }

    if (!supplier.email) {
      showToast("Este fornecedor não tem email configurado.");
      return;
    }

    const result = await sendSupplierTextRequisition({
      supplier,
      requestText,
      createdBy: "Diogo Pinto",
    });

    printSupplierRequisition({
      supplier,
      orderNumber: result.orderNumber,
      lines: result.lines,
    });

    window.location.href = result.mailto;

    setRequestText("");
    showToast(`✔ Requisição ${result.orderNumber} enviada e arquivada`);
    await loadSupplier();
  }

  async function handleUpdateSupplier(data: SupplierFormData) {
    if (!supplier) return;

    await updateSupplier(supplier.id, data);
    setIsEditOpen(false);
    showToast("✔ Fornecedor atualizado");
    await loadSupplier();
  }

  async function handleDeleteSupplier() {
    if (!supplier) return;
    if (deleteConfirmation.trim().toUpperCase() !== "ELIMINAR") return;

    await deleteSupplierAndHistory(supplier.id);
    setIsDeleteOpen(false);
    setDeleteConfirmation("");
    navigate("/suppliers");
  }

  async function handleSaveCondition(data: SupplierCommercialConditionFormData) {
    if (!supplier) return;

    if (conditionToEdit) {
      await updateSupplierCommercialCondition(conditionToEdit.id, data);
      showToast("✔ Condição comercial atualizada");
    } else {
      await createSupplierCommercialCondition(supplier.id, data);
      showToast("✔ Condição comercial criada");
    }

    setIsConditionOpen(false);
    setConditionToEdit(null);
    await loadSupplier();
  }

  async function handleDeleteCondition(conditionId: string) {
    if (!confirm("Eliminar esta condição comercial?")) return;

    await deleteSupplierCommercialCondition(conditionId);
    showToast("✔ Condição comercial eliminada");
    await loadSupplier();
  }

  function openNewCondition() {
    setConditionToEdit(null);
    setIsConditionOpen(true);
  }

  function openEditCondition(condition: SupplierCommercialCondition) {
    setConditionToEdit(condition);
    setIsConditionOpen(true);
  }

  if (isLoading) {
    return (
      <AppLayout>
        <p className="text-slate-400">A carregar fornecedor...</p>
      </AppLayout>
    );
  }

  if (errorMessage) {
    return (
      <AppLayout>
        <Card className="border-amber-400/30 bg-amber-400/5">
          <h1 className="text-xl font-semibold text-amber-200">Configuração necessária</h1>
          <p className="mt-3 text-slate-300">{errorMessage}</p>
        </Card>
      </AppLayout>
    );
  }

  if (!supplier) {
    return (
      <AppLayout>
        <Link to="/suppliers" className="text-sm text-cyan-400 hover:text-cyan-300">
          ← Voltar aos fornecedores
        </Link>
        <h1 className="mt-6 text-3xl font-bold text-white">Fornecedor não encontrado</h1>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {toast && (
        <div className="fixed right-8 top-8 z-50 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 text-emerald-300">
          {toast}
        </div>
      )}

      <Link to="/suppliers" className="text-sm text-cyan-400 hover:text-cyan-300">
        ← Voltar aos fornecedores
      </Link>

      <section className="mt-6 mb-8 flex flex-col gap-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">Fornecedor</p>
          <h1 className="mt-3 text-4xl font-bold text-white">{supplier.name}</h1>
          <p className="mt-3 text-slate-400">Email para pedidos: {supplier.email || "—"}</p>
          <p className="mt-1 text-sm text-slate-500">NIF: {supplier.nif || "—"}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setIsEditOpen(true)}>
            Editar fornecedor
          </Button>
          <Link
            to={`/orders?supplierId=${supplier.id}`}
            className="inline-flex rounded-2xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Ver pedidos
          </Link>
          <Button variant="ghost" onClick={() => setIsDeleteOpen(true)}>
            Eliminar
          </Button>
        </div>
      </section>

      <section className="mb-8 grid gap-5 md:grid-cols-3">
        <Metric label="Linhas no pedido atual" value={String(requestLines.length)} />
        <Metric label="Pedidos enviados" value={String(supplier.sentOrders.length)} />
        <Metric label="Último pedido" value={lastOrder ? lastOrder.createdAt : "—"} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6">
          <Card>
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">Pedido atual</p>
                <h2 className="mt-3 text-3xl font-bold text-white">Requisição para {supplier.name}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                  Cola aqui o material copiado do sistema de faturação. Ao enviar, o pedido fica guardado no Centro de Compras.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={handleGeneratePdf}>
                  Gerar PDF
                </Button>
                <Button onClick={handleSendEmail}>Enviar por email</Button>
              </div>
            </div>

            <textarea
              value={requestText}
              onChange={(event) => setRequestText(event.target.value)}
              rows={16}
              placeholder={`Exemplo:
Ref. 12345 - Escovas Bosch - Qtd 2
Ref. 98765 - Rotor GBH - Qtd 1
Disco corte inox 125mm - Qtd 10`}
              className="mt-6 w-full rounded-3xl border border-slate-800 bg-slate-950 px-5 py-4 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
            />
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold text-white">Pré-visualização do pedido</h3>
                <p className="mt-2 text-sm text-slate-400">Confirma rapidamente as linhas antes de gerar PDF ou enviar por email.</p>
              </div>
              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                {requestLines.length} linha(s)
              </span>
            </div>

            {requestLines.length > 0 ? (
              <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-slate-300">
                {requestLines.map((line, index) => (
                  <li key={`${line}-${index}`}>{line}</li>
                ))}
              </ol>
            ) : (
              <p className="mt-5 text-sm text-slate-500">Ainda não há material no pedido atual.</p>
            )}
          </Card>
        </section>

        <aside className="space-y-6">
          <Card>
            <h3 className="text-2xl font-semibold text-white">Dados do fornecedor</h3>
            <div className="mt-5 space-y-4">
              <Info label="Nome" value={supplier.name} />
              <Info label="NIF" value={supplier.nif || "—"} />
              <Info label="Email para pedidos" value={supplier.email || "—"} />
              <Info label="Observações" value={supplier.notes || "—"} />
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">Price Engine</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Condições comerciais</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Define o desconto por marca. O Price Engine usa estes valores automaticamente.
                </p>
              </div>

              <Button variant="secondary" onClick={openNewCondition}>
                + Marca
              </Button>
            </div>

            {conditions.length > 0 ? (
              <div className="mt-5 space-y-3">
                {conditions.map((condition) => (
                  <div
                    key={condition.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{condition.brand}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {condition.category || "Todas"} · Desconto {condition.discount}%
                        </p>
                      </div>

                      <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                        Loja {condition.storeMargin}%
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-slate-400 md:grid-cols-3">
                      <span>Revenda: {condition.resellerMargin}%</span>
                      <span>Online: {condition.onlineMargin}%</span>
                      <span>Notas: {condition.notes || "—"}</span>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => openEditCondition(condition)}>
                        Editar
                      </Button>
                      <Button variant="ghost" onClick={() => handleDeleteCondition(condition.id)}>
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-500">
                Ainda não existem condições comerciais para este fornecedor.
              </p>
            )}
          </Card>

          <Card>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">Centro de Compras</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Pedidos deste fornecedor</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              O registo completo de pedidos fica agora centralizado na aba Pedidos, para ser mais rápido pesquisar por fornecedor, data, hora ou utilizador.
            </p>

            {lastOrder ? (
              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-500">Último pedido</p>
                <p className="mt-2 font-semibold text-white">{lastOrder.orderNumber}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {lastOrder.createdAt} · {lastOrder.createdBy}
                </p>
              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-500">Ainda não existem pedidos enviados para este fornecedor.</p>
            )}

            <Link
              to={`/orders?supplierId=${supplier.id}`}
              className="mt-5 inline-flex w-full justify-center rounded-2xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Ver todos os pedidos
            </Link>
          </Card>
        </aside>
      </div>

      <Modal
        title="Editar fornecedor"
        description="Atualiza os dados usados nos pedidos e requisições."
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        footer={null}
      >
        <SupplierForm
          initialData={supplier}
          onCancel={() => setIsEditOpen(false)}
          onSave={handleUpdateSupplier}
        />
      </Modal>

      <Modal
        title={conditionToEdit ? "Editar condição comercial" : "Nova condição comercial"}
        description="Define a marca, desconto do fornecedor e margens usadas no Price Engine."
        isOpen={isConditionOpen}
        onClose={() => {
          setIsConditionOpen(false);
          setConditionToEdit(null);
        }}
        footer={null}
      >
        <CommercialConditionForm
          initialData={conditionToEdit ?? undefined}
          onCancel={() => {
            setIsConditionOpen(false);
            setConditionToEdit(null);
          }}
          onSave={handleSaveCondition}
        />
      </Modal>

      <Modal
        title="Eliminar fornecedor"
        description="Esta ação elimina o fornecedor, pendentes e histórico de pedidos."
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        footer={null}
      >
        <div className="space-y-5">
          <p className="text-sm leading-6 text-slate-400">
            Para confirmar, escreve <strong className="text-white">ELIMINAR</strong>.
          </p>

          <input
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white outline-none focus:border-red-400"
            placeholder="ELIMINAR"
          />

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="secondary"
              disabled={deleteConfirmation.trim().toUpperCase() !== "ELIMINAR"}
              onClick={handleDeleteSupplier}
            >
              Eliminar definitivamente
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-white">{value}</p>
    </div>
  );
}

function CommercialConditionForm({
  initialData,
  onCancel,
  onSave,
}: {
  initialData?: Partial<SupplierCommercialConditionFormData>;
  onCancel: () => void;
  onSave: (data: SupplierCommercialConditionFormData) => void | Promise<void>;
}) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    onSave({
      brand: String(formData.get("brand") ?? ""),
      category: String(formData.get("category") ?? "Todas"),
      discount: Number(formData.get("discount") ?? 0),
      storeMargin: Number(formData.get("storeMargin") ?? 40),
      resellerMargin: Number(formData.get("resellerMargin") ?? 20),
      onlineMargin: Number(formData.get("onlineMargin") ?? 15),
      notes: String(formData.get("notes") ?? ""),
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-slate-400">Marca *</label>
          <input
            name="brand"
            required
            defaultValue={initialData?.brand ?? ""}
            placeholder="Bosch, Makita, Metabo..."
            className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white outline-none focus:border-cyan-400"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-400">Categoria</label>
          <input
            name="category"
            defaultValue={initialData?.category ?? "Todas"}
            placeholder="Todas, Ferramentas, Consumíveis..."
            className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <PercentInput label="Desconto fornecedor" name="discount" defaultValue={initialData?.discount ?? 0} />
        <PercentInput label="Margem Loja" name="storeMargin" defaultValue={initialData?.storeMargin ?? 40} />
        <PercentInput label="Margem Revenda" name="resellerMargin" defaultValue={initialData?.resellerMargin ?? 20} />
        <PercentInput label="Margem Online" name="onlineMargin" defaultValue={initialData?.onlineMargin ?? 15} />
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-400">Observações</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={initialData?.notes ?? ""}
          className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white outline-none focus:border-cyan-400"
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar condição</Button>
      </div>
    </form>
  );
}

function PercentInput({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: number;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm text-slate-400">{label}</span>
      <div className="flex items-center rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white focus-within:border-cyan-400">
        <input
          name={name}
          type="number"
          min="0"
          max="99"
          step="0.01"
          defaultValue={defaultValue}
          className="w-full bg-transparent outline-none"
        />
        <span className="text-slate-500">%</span>
      </div>
    </label>
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
