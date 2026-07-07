import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { AppLayout } from "../layouts/AppLayout";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";

import { getPriorityClasses, getRepairMission } from "../core/atlas.engine";
import { getNextActions } from "../modules/repairs/repair.workflow";
import { RepairForm, type RepairFormData } from "../modules/repairs/components/RepairForm";
import { createRepair, deleteRepair, getRepairs, type RepairListItem } from "../services/repairs.service";
import { executeWorkflowAction } from "../services/repairWorkflow.service";

function getSelectedStatuses(searchParams: URLSearchParams) {
  const statusParam = searchParams.get("status");

  if (!statusParam) return [];

  return statusParam
    .split(",")
    .map((status) => status.trim())
    .filter(Boolean);
}

export function RepairsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedStatuses = useMemo(
    () => getSelectedStatuses(searchParams),
    [searchParams]
  );

  const prefilledRepairData = useMemo<Partial<RepairFormData>>(() => ({
    customer: searchParams.get("customer") ?? "",
    phone: searchParams.get("phone") ?? "",
    taxNumber: searchParams.get("taxNumber") ?? "",
    email: searchParams.get("email") ?? "",
  }), [searchParams]);

  const shouldOpenPrefilledRepair = Boolean(
    prefilledRepairData.customer || prefilledRepairData.phone
  );

  const [isOpen, setIsOpen] = useState(false);
  const [repairs, setRepairs] = useState<RepairListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [repairToDelete, setRepairToDelete] = useState<RepairListItem | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  async function loadRepairs() {
    setIsLoading(true);
    const data = await getRepairs();
    setRepairs(data);
    setIsLoading(false);
  }

  async function handleCreateRepair(data: RepairFormData) {
    await createRepair(data);
    setIsOpen(false);

    if (shouldOpenPrefilledRepair) {
      setSearchParams({});
    }

    await loadRepairs();
  }

  async function handleQuickAction(
    repairId: string,
    nextStatus: string,
    eventDescription: string
  ) {
    await executeWorkflowAction(repairId, nextStatus, eventDescription);
    await loadRepairs();
  }

  async function handleDeleteRepair() {
    if (!repairToDelete || !deleteReason.trim()) return;

    setIsDeleting(true);

    try {
      await deleteRepair(repairToDelete.id);
      setRepairToDelete(null);
      setDeleteReason("");
      await loadRepairs();
    } finally {
      setIsDeleting(false);
    }
  }

  useEffect(() => {
    loadRepairs();
  }, []);

  useEffect(() => {
    if (shouldOpenPrefilledRepair) {
      setIsOpen(true);
    }
  }, [shouldOpenPrefilledRepair]);

  const filteredRepairs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return repairs.filter((repair) => {
      const matchesStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(repair.status);

      const matchesSearch =
        !normalizedSearch ||
        repair.customer.toLowerCase().includes(normalizedSearch) ||
        repair.phone.toLowerCase().includes(normalizedSearch) ||
        repair.machine.toLowerCase().includes(normalizedSearch) ||
        repair.repair_number.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [repairs, search, selectedStatuses]);

  const hasActiveFilter = selectedStatuses.length > 0;
  const pageTitle = hasActiveFilter ? "Caixa de Trabalho" : "Gestão de Reparações";
  const pageDescription = hasActiveFilter
    ? `A mostrar apenas: ${selectedStatuses.join(" + ")}`
    : `${repairs.length} reparações ativas.`;

  return (
    <AppLayout>
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">
            Reparações
          </p>

          <h1 className="mt-3 text-4xl font-bold text-white">{pageTitle}</h1>

          <p className="mt-3 text-slate-400">
            {isLoading ? "A carregar..." : pageDescription}
          </p>
        </div>

        <Button onClick={() => setIsOpen(true)}>+ Nova Reparação</Button>
      </div>

      {hasActiveFilter && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-cyan-100">
            O Atlas abriu esta caixa de trabalho a partir do Centro de Operações.
          </p>

          <button
            onClick={() => setSearchParams({})}
            className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            Ver todas as reparações
          </button>
        </div>
      )}

      <div className="mb-6">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
          placeholder="Pesquisar cliente, telefone, máquina ou nº de reparação..."
        />
      </div>

      <section className="grid gap-5">
        {filteredRepairs.map((repair) => (
          <RepairListCard
            key={repair.id}
            repair={repair}
            onQuickAction={handleQuickAction}
            onDeleteRequest={setRepairToDelete}
          />
        ))}

        {!isLoading && filteredRepairs.length === 0 && (
          <Card>
            <p className="text-lg font-semibold text-white">
              Nenhuma reparação encontrada.
            </p>
            <p className="mt-2 text-slate-400">
              Experimenta limpar o filtro ou pesquisar por outro cliente/máquina.
            </p>
          </Card>
        )}
      </section>

      <Modal
        title="Nova Reparação"
        description="1 máquina = 1 reparação. O Atlas gera automaticamente o número, data, estado e utilizador."
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          if (shouldOpenPrefilledRepair) setSearchParams({});
        }}
        footer={null}
      >
        <RepairForm
          mode="create"
          initialData={prefilledRepairData}
          onCancel={() => {
            setIsOpen(false);
            if (shouldOpenPrefilledRepair) setSearchParams({});
          }}
          onSave={handleCreateRepair}
        />
      </Modal>

      <Modal
        title="Eliminar reparação"
        description="Esta ação remove definitivamente a reparação e o respetivo diário da base de dados."
        isOpen={Boolean(repairToDelete)}
        onClose={() => {
          setRepairToDelete(null);
          setDeleteReason("");
        }}
        footer={null}
      >
        <div className="space-y-6">
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-5">
            <p className="text-sm font-semibold text-red-300">
              Atenção: esta ação é definitiva.
            </p>

            {repairToDelete && (
              <div className="mt-4 text-sm text-slate-300">
                <p>
                  <span className="text-slate-500">Reparação:</span>{" "}
                  {repairToDelete.repair_number}
                </p>
                <p>
                  <span className="text-slate-500">Cliente:</span>{" "}
                  {repairToDelete.customer}
                </p>
                <p>
                  <span className="text-slate-500">Máquina:</span>{" "}
                  {repairToDelete.machine}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Motivo da eliminação *
            </label>
            <textarea
              rows={4}
              value={deleteReason}
              onChange={(event) => setDeleteReason(event.target.value)}
              placeholder="Ex.: Registo criado por engano, cliente desistiu antes de deixar a máquina..."
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setRepairToDelete(null);
                setDeleteReason("");
              }}
            >
              Cancelar
            </Button>

            <Button
              type="button"
              disabled={!deleteReason.trim() || isDeleting}
              onClick={handleDeleteRepair}
              className="bg-red-500 text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? "A eliminar..." : "Eliminar definitivamente"}
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}

function RepairListCard({
  repair,
  onQuickAction,
  onDeleteRequest,
}: {
  repair: RepairListItem;
  onQuickAction: (
    repairId: string,
    nextStatus: string,
    eventDescription: string
  ) => Promise<void>;
  onDeleteRequest: (repair: RepairListItem) => void;
}) {
  const mission = getRepairMission(repair.status);
  const primaryAction = getNextActions(repair.status)[0];
  const [isExecuting, setIsExecuting] = useState(false);

  async function handlePrimaryAction() {
    if (!primaryAction) return;

    setIsExecuting(true);
    await onQuickAction(repair.id, primaryAction.nextStatus, primaryAction.event);
    setIsExecuting(false);
  }

  return (
    <Card className={`transition hover:-translate-y-1 ${getPriorityClasses(mission.priority)}`}>
      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-500">{repair.repair_number}</p>

          <h2 className="mt-2 text-2xl font-semibold text-white">
            {repair.customer}
          </h2>

          <p className="mt-1 text-slate-400">{repair.phone}</p>

          <p className="mt-4 text-lg text-slate-200">{repair.machine}</p>
        </div>

        <div className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 xl:max-w-md">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
              {mission.badge}
            </span>

            <span className="text-xs text-slate-500">{repair.date}</span>
          </div>

          <h3 className="mt-4 font-semibold text-white">{mission.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {mission.description}
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {primaryAction && (
              <button
                type="button"
                onClick={handlePrimaryAction}
                disabled={isExecuting}
                className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isExecuting ? "A atualizar..." : primaryAction.label}
              </button>
            )}

            <Link
              to={`/repairs/${repair.id}`}
              className="rounded-2xl border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-slate-200 transition hover:border-cyan-400/50 hover:bg-slate-800 hover:text-white"
            >
              Abrir ficha
            </Link>

            <button
              type="button"
              onClick={() => onDeleteRequest(repair)}
              className="rounded-2xl border border-red-400/30 px-4 py-3 text-center text-sm font-semibold text-red-300 transition hover:border-red-300 hover:bg-red-400/10 hover:text-red-200"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
