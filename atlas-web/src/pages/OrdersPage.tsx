import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { AppLayout } from "../layouts/AppLayout";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import {
  deleteSupplierOrder,
  getSupplierModuleErrorMessage,
  getSupplierWorkspace,
  parseRequisitionLines,
  updateSupplierOrder,
  type Supplier,
  type SupplierOrder,
  type SupplierWorkspace,
} from "../services/suppliers.service";
import { printSupplierRequisition } from "../services/supplierRequisitionPdf.service";

type OrderRow = SupplierOrder & {
  supplier: Supplier;
};

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [suppliers, setSuppliers] = useState<SupplierWorkspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [orderToView, setOrderToView] = useState<OrderRow | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<OrderRow | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<OrderRow | null>(null);
  const [orderEditText, setOrderEditText] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const selectedSupplierId = searchParams.get("supplierId") ?? "all";

  async function loadOrders() {
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

  useEffect(() => {
    loadOrders();
  }, []);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  const orders = useMemo<OrderRow[]>(() => {
    return suppliers
      .flatMap((supplier) =>
        supplier.sentOrders.map((order) => ({
          ...order,
          supplier,
        }))
      )
      .sort((a, b) => b.rawCreatedAt.localeCompare(a.rawCreatedAt));
  }, [suppliers]);

  const filteredOrders = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSupplier =
        selectedSupplierId === "all" || order.supplierId === selectedSupplierId;

      const haystack = [
        order.orderNumber,
        order.supplier.name,
        order.supplier.nif,
        order.emailTo,
        order.createdBy,
        order.createdAt,
        order.items.map((item) => item.description).join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return matchesSupplier && (!normalized || haystack.includes(normalized));
    });
  }, [orders, search, selectedSupplierId]);

  const pendingLines = suppliers.reduce(
    (sum, supplier) => sum + supplier.pendingItems.length,
    0
  );

  const todaysOrders = orders.filter((order) => {
    const today = new Date().toLocaleDateString("pt-PT");
    return order.createdAt.startsWith(today);
  }).length;

  function selectSupplier(supplierId: string) {
    if (supplierId === "all") {
      setSearchParams({});
      return;
    }

    setSearchParams({ supplierId });
  }

  function handlePrintOrder(order: OrderRow) {
    printSupplierRequisition({
      supplier: order.supplier,
      orderNumber: order.orderNumber,
      lines: order.items.map((item) => item.description),
    });
  }

  function openEditOrder(order: OrderRow) {
    setOrderToEdit(order);
    setOrderEditText(order.items.map((item) => item.description).join("\n"));
  }

  async function handleSaveOrderEdit() {
    if (!orderToEdit) return;

    const lines = parseRequisitionLines(orderEditText);

    if (lines.length === 0) {
      showToast("O registo tem de ter pelo menos uma linha.");
      return;
    }

    await updateSupplierOrder({
      orderId: orderToEdit.id,
      supplierId: orderToEdit.supplierId,
      requestText: orderEditText,
    });

    setOrderToEdit(null);
    setOrderEditText("");
    showToast(`✔ ${orderToEdit.orderNumber} atualizado`);
    await loadOrders();
  }

  async function handleDeleteOrder() {
    if (!orderToDelete) return;
    if (deleteConfirmation.trim().toUpperCase() !== "ELIMINAR") return;

    await deleteSupplierOrder(orderToDelete.id);
    setOrderToDelete(null);
    setDeleteConfirmation("");
    showToast("✔ Requisição eliminada");
    await loadOrders();
  }

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
            Pedidos
          </p>

          <h1 className="mt-3 text-4xl font-bold text-white">
            Centro de Compras
          </h1>

          <p className="mt-3 max-w-3xl text-slate-400">
            Consulta todas as requisições enviadas aos fornecedores, com data, hora, utilizador e material pedido.
          </p>
        </div>

        <Link
          to="/suppliers"
          className="inline-flex rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Novo pedido por fornecedor
        </Link>
      </section>

      {errorMessage && (
        <Card className="mb-6 border-amber-400/30 bg-amber-400/5">
          <h2 className="text-xl font-semibold text-amber-200">Configuração necessária</h2>
          <p className="mt-3 text-sm leading-6 text-amber-100/80">{errorMessage}</p>
        </Card>
      )}

      <section className="mb-8 grid gap-5 md:grid-cols-4">
        <Metric label="Requisições" value={isLoading ? "—" : String(orders.length)} />
        <Metric label="Fornecedores" value={isLoading ? "—" : String(suppliers.length)} />
        <Metric label="Linhas pendentes" value={isLoading ? "—" : String(pendingLines)} />
        <Metric label="Pedidos hoje" value={isLoading ? "—" : String(todaysOrders)} />
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-[1fr_280px]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
          placeholder="Pesquisar por fornecedor, nº requisição, utilizador ou material..."
        />

        <select
          value={selectedSupplierId}
          onChange={(event) => selectSupplier(event.target.value)}
          className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white outline-none focus:border-cyan-400"
        >
          <option value="all">Todos os fornecedores</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </section>

      <section className="grid gap-5">
        {filteredOrders.map((order) => (
          <Card key={order.id} className="transition hover:border-cyan-400/40">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
                    {order.orderNumber}
                  </p>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
                    {order.itemCount} linha(s)
                  </span>
                </div>

                <h2 className="mt-3 text-2xl font-bold text-white">
                  {order.supplier.name}
                </h2>

                <div className="mt-3 grid gap-2 text-sm text-slate-400 md:grid-cols-3">
                  <p>
                    👤 <span className="text-slate-300">{order.createdBy}</span>
                  </p>
                  <p>
                    📅 <span className="text-slate-300">{order.createdAt}</span>
                  </p>
                  <p>
                    ✉️ <span className="text-slate-300">{order.emailTo || order.supplier.email || "—"}</span>
                  </p>
                </div>

                <ol className="mt-5 list-decimal space-y-1 pl-5 text-sm text-slate-400">
                  {order.items.slice(0, 3).map((item) => (
                    <li key={item.id}>{item.description}</li>
                  ))}
                </ol>

                {order.items.length > 3 && (
                  <p className="mt-2 text-sm text-slate-500">
                    + {order.items.length - 3} linha(s) no registo completo
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 xl:justify-end">
                <Button variant="ghost" onClick={() => setOrderToView(order)}>
                  Ver
                </Button>
                <Button variant="ghost" onClick={() => handlePrintOrder(order)}>
                  PDF
                </Button>
                <Button variant="secondary" onClick={() => openEditOrder(order)}>
                  Editar
                </Button>
                <Button variant="ghost" onClick={() => setOrderToDelete(order)}>
                  Eliminar
                </Button>
                <Link
                  to={`/suppliers/${order.supplierId}`}
                  className="inline-flex rounded-2xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Fornecedor
                </Link>
              </div>
            </div>
          </Card>
        ))}

        {!isLoading && filteredOrders.length === 0 && (
          <Card>
            <h2 className="text-2xl font-semibold text-white">Sem pedidos encontrados</h2>
            <p className="mt-3 text-slate-400">
              Cria uma requisição dentro da ficha de um fornecedor. Depois ela aparece aqui para consulta.
            </p>
          </Card>
        )}
      </section>

      <Modal
        title="Ver requisição"
        description="Consulta o pedido arquivado no Centro de Compras."
        isOpen={Boolean(orderToView)}
        onClose={() => setOrderToView(null)}
        footer={null}
      >
        {orderToView && (
          <OrderView
            order={orderToView}
            onPrint={() => handlePrintOrder(orderToView)}
          />
        )}
      </Modal>

      <Modal
        title="Editar requisição"
        description="Atualiza as linhas guardadas neste registo."
        isOpen={Boolean(orderToEdit)}
        onClose={() => setOrderToEdit(null)}
        footer={null}
      >
        <div className="space-y-5">
          <textarea
            value={orderEditText}
            onChange={(event) => setOrderEditText(event.target.value)}
            rows={12}
            className="w-full rounded-3xl border border-slate-800 bg-slate-950 px-5 py-4 text-white outline-none transition focus:border-cyan-400"
          />

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setOrderToEdit(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveOrderEdit}>Guardar alterações</Button>
          </div>
        </div>
      </Modal>

      <Modal
        title="Eliminar requisição"
        description="Remove este pedido do registo de compras."
        isOpen={Boolean(orderToDelete)}
        onClose={() => setOrderToDelete(null)}
        footer={null}
      >
        <div className="space-y-5">
          <p className="text-sm leading-6 text-slate-400">
            Esta ação elimina o registo <strong className="text-white">{orderToDelete?.orderNumber}</strong> e as respetivas linhas.
            Para confirmar, escreve <strong className="text-white">ELIMINAR</strong>.
          </p>

          <input
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white outline-none focus:border-red-400"
            placeholder="ELIMINAR"
          />

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setOrderToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="secondary"
              disabled={deleteConfirmation.trim().toUpperCase() !== "ELIMINAR"}
              onClick={handleDeleteOrder}
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

function OrderView({ order, onPrint }: { order: OrderRow; onPrint: () => void }) {
  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
              Requisição
            </p>
            <h3 className="mt-2 text-2xl font-bold text-white">{order.orderNumber}</h3>
            <p className="mt-2 text-sm text-slate-400">
              {order.supplier.name} · Criado por {order.createdBy} · {order.createdAt}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Enviado para {order.emailTo || order.supplier.email || "—"}
            </p>
          </div>
          <Button onClick={onPrint}>Gerar PDF</Button>
        </div>
      </Card>

      <Card>
        <h4 className="text-xl font-semibold text-white">Material pedido</h4>
        <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm text-slate-300">
          {order.items.map((item) => (
            <li key={item.id}>{item.description}</li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
