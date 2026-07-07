import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";

type Props = {
  title?: string;
  description?: string;
  submitLabel?: string;
  onCancel: () => void;
  onConfirm: (note: string) => void;
};

export function RepairNoteModal({
  title = "Adicionar nota",
  description = "Esta nota fica registada no Diário da Reparação.",
  submitLabel = "Guardar nota",
  onCancel,
  onConfirm,
}: Props) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const note = String(formData.get("note") ?? "").trim();

    if (!note) return;

    onConfirm(note);
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <Card>
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm text-slate-400">{description}</p>

        <div className="mt-6">
          <label className="mb-2 block text-sm text-slate-400">Nota</label>
          <textarea
            name="note"
            rows={5}
            autoFocus
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
            placeholder="Escreve aqui a nota..."
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
