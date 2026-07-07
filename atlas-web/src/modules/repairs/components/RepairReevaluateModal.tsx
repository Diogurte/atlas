import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";

type Props = {
  onCancel: () => void;
  onConfirm: (nextStatus: string, reason: string) => void;
};

export function RepairReevaluateModal({ onCancel, onConfirm }: Props) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const reason = String(formData.get("reason") ?? "");
    const nextStatus = String(formData.get("nextStatus") ?? "");

    if (!reason || !nextStatus) return;

    onConfirm(nextStatus, reason);
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <Card>
        <h3 className="text-xl font-semibold text-white">
          🔀 Reavaliar Reparação
        </h3>

        <p className="mt-2 text-sm text-slate-400">
          Usa isto quando a decisão inicial mudou. O Atlas vai registar a
          alteração na timeline.
        </p>

        <div className="mt-6">
          <label className="mb-2 block text-sm text-slate-400">Motivo</label>

          <select
            name="reason"
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
            defaultValue=""
          >
            <option value="" disabled>
              Escolher motivo
            </option>
            <option>Diagnóstico alterado</option>
            <option>Necessita de equipamento do fabricante</option>
            <option>Falta de peças</option>
            <option>Fornecedor recusou</option>
            <option>Pedido do cliente</option>
            <option>Outro</option>
          </select>
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm text-slate-400">
            Nova decisão
          </label>

          <select
            name="nextStatus"
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
            defaultValue=""
          >
            <option value="" disabled>
              Escolher nova decisão
            </option>
            <option value="A reparar">🔧 Reparar em loja</option>
            <option value="No fornecedor">🚚 Enviar fornecedor</option>
            <option value="Sem reparação">❌ Sem reparação</option>
            <option value="Em diagnóstico">🔍 Retomar diagnóstico</option>
          </select>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancelar
        </Button>

        <Button type="submit">Guardar reavaliação</Button>
      </div>
    </form>
  );
}