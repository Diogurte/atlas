import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { AppLayout } from "../layouts/AppLayout";
import { RepairActions } from "../modules/repairs/components/RepairActions";
import { RepairForm, type RepairFormData } from "../modules/repairs/components/RepairForm";
import { RepairInfo } from "../modules/repairs/components/RepairInfo";
import { RepairNextAction } from "../modules/repairs/components/RepairNextAction";
import { RepairNoteModal } from "../modules/repairs/components/RepairNoteModal";
import { RepairReevaluateModal } from "../modules/repairs/components/RepairReevaluateModal";
import { RepairSummary } from "../modules/repairs/components/RepairSummary";
import { RepairTimeline } from "../modules/repairs/components/RepairTimeline";
import {
  addRepairNote,
  getRepairById,
  getRepairEvents,
  updateRepairDetails,
  type RepairDetail,
  type RepairEvent,
} from "../services/repairs.service";
import { printRepairReceipt } from "../services/repairPdf.service";
import { executeWorkflowAction } from "../services/repairWorkflow.service";

export function RepairDetailPage() {
  const { repairId } = useParams();
  const navigate = useNavigate();
  const diaryRef = useRef<HTMLDivElement | null>(null);

  const [repair, setRepair] = useState<RepairDetail | null>(null);
  const [events, setEvents] = useState<RepairEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("✔ Etapa atualizada");
  const [isReevaluateOpen, setIsReevaluateOpen] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  function notify(message: string) {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  }

  async function loadRepair() {
    if (!repairId) return;

    setIsLoading(true);

    const repairData = await getRepairById(repairId);
    setRepair(repairData);

    if (repairData) {
      const eventData = await getRepairEvents(repairData.id);
      setEvents(eventData);
    }

    setIsLoading(false);
  }

  async function handleWorkflowAction(
    nextStatus: string,
    eventDescription: string
  ) {
    if (!repair) return;

    await executeWorkflowAction(repair.id, nextStatus, eventDescription);
    await loadRepair();

    notify("✔ Etapa atualizada");
  }

  async function handleReevaluate(nextStatus: string, reason: string) {
    if (!repair) return;

    await executeWorkflowAction(
      repair.id,
      nextStatus,
      `Reparação reavaliada. Novo destino: ${nextStatus}. Motivo: ${reason}.`
    );

    setIsReevaluateOpen(false);
    await loadRepair();

    notify("✔ Reparação reavaliada");
  }

  async function handleAddNote(note: string) {
    if (!repair) return;

    await addRepairNote(
      repair.id,
      note,
      repair.status === "Entregue" ? "Nota pós-entrega" : "Nota"
    );

    setIsNoteOpen(false);
    await loadRepair();

    notify("✔ Nota adicionada ao Diário");
  }

  async function handleEditRepair(data: RepairFormData) {
    if (!repair) return;

    await updateRepairDetails(repair, data);

    setIsEditOpen(false);
    await loadRepair();

    notify("✔ Dados atualizados");
  }

  async function handleReopenRepair() {
    if (!repair) return;

    const confirmed = window.confirm(
      "Tens a certeza que queres reabrir esta reparação? Esta ação ficará registada no Diário."
    );

    if (!confirmed) return;

    await executeWorkflowAction(
      repair.id,
      "A aguardar diagnóstico",
      "Reparação reaberta após entrega ao cliente."
    );

    await loadRepair();
    notify("✔ Reparação reaberta");
  }

  function handlePrintReceipt() {
    if (!repair) return;
    printRepairReceipt(repair, events);
  }

  function handleViewDiary() {
    diaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleCreateRepairForCustomer() {
    if (!repair) return;

    const params = new URLSearchParams({
      customer: repair.customer,
      phone: repair.phone,
      taxNumber: repair.taxNumber,
      email: repair.email,
    });

    navigate(`/repairs?${params.toString()}`);
  }

  useEffect(() => {
    loadRepair();
  }, [repairId]);

  if (isLoading) {
    return (
      <AppLayout>
        <p className="text-slate-400">A carregar reparação...</p>
      </AppLayout>
    );
  }

  if (!repair) {
    return (
      <AppLayout>
        <h1 className="text-3xl font-bold text-white">
          Reparação não encontrada
        </h1>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {showToast && (
        <div className="fixed right-8 top-8 z-50 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 text-emerald-300">
          {toastMessage}
        </div>
      )}

      <Link to="/repairs" className="text-sm text-cyan-400 hover:text-cyan-300">
        ← Voltar às reparações
      </Link>

      <div className="mt-6 flex items-start justify-between gap-6">
        <div>
          <p className="text-sm text-slate-500">{repair.repair_number}</p>

          <h1 className="mt-2 text-4xl font-bold text-white">
            {repair.customer}
          </h1>

          <p className="mt-2 text-slate-400">{repair.phone}</p>
        </div>

        <span className="rounded-full bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-300">
          {repair.status}
        </span>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <h2 className="text-2xl font-semibold text-white">Cliente</h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <RepairInfo label="Nome" value={repair.customer} />
              <RepairInfo label="Telemóvel" value={repair.phone} />
              <RepairInfo label="NIF" value={repair.taxNumber || "—"} />
              <RepairInfo label="Email" value={repair.email || "—"} />
            </div>
          </Card>

          <Card>
            <h2 className="text-2xl font-semibold text-white">Máquina</h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <RepairInfo label="Marca" value={repair.brand} />
              <RepairInfo label="Modelo" value={repair.model} />
              <RepairInfo
                label="Número de série"
                value={repair.serialNumber || "—"}
              />
              <RepairInfo label="Garantia" value={repair.warranty} />
              <RepairInfo
                label="Problema indicado"
                value={repair.problem}
                className="md:col-span-2"
              />
              <RepairInfo
                label="Acessórios"
                value={repair.accessories}
                className="md:col-span-2"
              />
              <RepairInfo
                label="Observações internas"
                value={repair.internalNotes || "—"}
                className="md:col-span-2"
              />
            </div>
          </Card>

          <div ref={diaryRef}>
            <Card>
              <h2 className="text-2xl font-semibold text-white">
                Diário da Reparação
              </h2>

              <RepairTimeline events={events} fallbackDate={repair.date} />
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <RepairSummary
            customer={repair.customer}
            machine={repair.machine}
            status={repair.status}
            warranty={repair.warranty}
            date={repair.date}
          />

          <RepairNextAction
            status={repair.status}
            onAction={handleWorkflowAction}
            onReevaluate={() => setIsReevaluateOpen(true)}
          />

          <RepairActions
            status={repair.status}
            onPrint={handlePrintReceipt}
            onEdit={() => setIsEditOpen(true)}
            onAddNote={() => setIsNoteOpen(true)}
            onViewDiary={handleViewDiary}
            onCreateRepairForCustomer={handleCreateRepairForCustomer}
            onReopen={handleReopenRepair}
          />
        </div>
      </div>

      <Modal
        title="Reavaliar Reparação"
        description="Usa esta opção quando a decisão técnica mudou."
        isOpen={isReevaluateOpen}
        onClose={() => setIsReevaluateOpen(false)}
        footer={null}
      >
        <RepairReevaluateModal
          onCancel={() => setIsReevaluateOpen(false)}
          onConfirm={handleReevaluate}
        />
      </Modal>

      <Modal
        title={repair.status === "Entregue" ? "Nota pós-entrega" : "Adicionar nota"}
        description="A nota fica registada no Diário da Reparação."
        isOpen={isNoteOpen}
        onClose={() => setIsNoteOpen(false)}
        footer={null}
      >
        <RepairNoteModal
          title={repair.status === "Entregue" ? "📝 Nota pós-entrega" : "📝 Adicionar nota"}
          submitLabel="Guardar nota"
          onCancel={() => setIsNoteOpen(false)}
          onConfirm={handleAddNote}
        />
      </Modal>

      <Modal
        title="Editar Reparação"
        description="Edita apenas dados administrativos. O workflow continua a ser gerido pelo Atlas."
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        footer={null}
      >
        <RepairForm
          mode="edit"
          initialData={{
            customer: repair.customer,
            phone: repair.phone,
            taxNumber: repair.taxNumber,
            email: repair.email,
            brand: repair.brand,
            model: repair.model,
            serialNumber: repair.serialNumber,
            problem: repair.problem,
            internalNotes: repair.internalNotes,
            accessories: repair.accessories,
            warranty: repair.warranty,
          }}
          onCancel={() => setIsEditOpen(false)}
          onSave={handleEditRepair}
        />
      </Modal>
    </AppLayout>
  );
}
